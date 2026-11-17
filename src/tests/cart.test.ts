import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEED,
  generateSyntheticDataset,
  profilesToCsv,
  summarizeDataset,
  validateProfileFeatures,
} from '../data/syntheticGenerator';
import {
  DEFAULT_TRAIN_CONFIG,
  computeFeatureImportances,
  entropyImpurity,
  evaluateMetrics,
  findBestSplitCandidates,
  giniImpurity,
  predictWithTree,
  trainDecisionTree,
} from '../algorithms/cart';
import {
  DEFAULT_COST_CONFIG,
  DEFAULT_POLICY_RULES,
  computeErrorCosts,
  evaluateCreditPolicy,
} from '../algorithms/policy';
import { SyntheticProfile, TreeNode } from '../types/credit';

describe('Generador sintético y partición estratificada', () => {
  it('genera exactamente 240 perfiles reproducibles dentro de rangos válidos sin atributos sensibles ni faltantes', () => {
    const dataA = generateSyntheticDataset(DEFAULT_SEED, 240);
    const dataB = generateSyntheticDataset(DEFAULT_SEED, 240);
    expect(dataA).toHaveLength(240);
    expect(dataA).toEqual(dataB);

    for (const p of dataA) {
      const check = validateProfileFeatures(p);
      expect(check.valid).toBe(true);
      expect([0, 1]).toContain(p.incumplimiento12m);
      expect(Number.isFinite(p.probabilidadLatenteSimulada)).toBe(true);
    }
  });

  it('divide de forma estratificada ~70% entrenamiento y ~30% prueba conservando prevalencia cercana', () => {
    const data = generateSyntheticDataset(DEFAULT_SEED, 240);
    const summary = summarizeDataset(data);

    expect(summary.total).toBe(240);
    expect(summary.trainCount + summary.testCount).toBe(240);
    expect(Math.abs(summary.trainCount - 168)).toBeLessThanOrEqual(2);
    expect(Math.abs(summary.testCount - 72)).toBeLessThanOrEqual(2);
    expect(Math.abs(summary.trainPrevalence - summary.testPrevalence)).toBeLessThan(0.03);
  });

  it('exporta CSV con encabezados y todas las filas esperadas', () => {
    const data = generateSyntheticDataset(DEFAULT_SEED, 240);
    const csv = profilesToCsv(data);
    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(241);
    expect(lines[0]).toContain('incumplimiento_12m');
    expect(lines[0]).toContain('particion');
  });
});

describe('Impureza de Gini y Entropía', () => {
  it('maneja N=0 y nodos puros sin NaN y respeta 0*log2(0)=0', () => {
    expect(giniImpurity(0, 0)).toBe(0);
    expect(entropyImpurity(0, 0)).toBe(0);
    expect(giniImpurity(0, 20)).toBe(0);
    expect(giniImpurity(20, 20)).toBe(0);
    expect(entropyImpurity(0, 20)).toBe(0);
    expect(entropyImpurity(20, 20)).toBe(0);
    expect(giniImpurity(5, 10)).toBeCloseTo(0.5, 10);
    expect(entropyImpurity(5, 10)).toBeCloseTo(1.0, 10);
  });
});

describe('Algoritmo CART y propiedades estructurales', () => {
  it('maneja entrenamiento vacío y clases ausentes sin fallar', () => {
    const emptyTree = trainDecisionTree([], DEFAULT_TRAIN_CONFIG);
    expect(emptyTree.root.isLeaf).toBe(true);
    expect(emptyTree.root.n).toBe(0);
    expect(emptyTree.root.pIncumplimiento).toBe(0);
    expect(Object.values(emptyTree.featureImportances).every((v) => v === 0)).toBe(true);

    const allZero: SyntheticProfile[] = Array.from({ length: 20 }, (_, i) => ({
      id: `Z-${i}`,
      ingresoMensualCOP: 3_000_000 + i * 100_000,
      cargaFinancieraPct: 20 + i,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 36,
      utilizacionCuposPct: 30,
      incumplimiento12m: 0,
      probabilidadLatenteSimulada: 0.1,
      split: 'train',
    }));
    const pureTree = trainDecisionTree(allZero, DEFAULT_TRAIN_CONFIG);
    expect(pureTree.root.isLeaf).toBe(true);
    expect(pureTree.root.impurity).toBe(0);
    expect(pureTree.root.pIncumplimiento).toBe(0);
  });

  it('entrena únicamente con el conjunto train, conserva suma de conteos en hijas y normaliza importancias', () => {
    const data = generateSyntheticDataset(DEFAULT_SEED, 240);
    const train = data.filter((d) => d.split === 'train');
    const trained = trainDecisionTree(train, {
      criterion: 'gini',
      maxDepth: 4,
      minSamplesLeaf: 8,
      minGain: 0.001,
    });

    function verifyNode(node: TreeNode) {
      expect(node.positivos + node.negativos).toBe(node.n);
      if (!node.isLeaf && node.left && node.right) {
        expect(node.left.n + node.right.n).toBe(node.n);
        expect(node.left.positivos + node.right.positivos).toBe(node.positivos);
        expect(node.left.n).toBeGreaterThanOrEqual(8);
        expect(node.right.n).toBeGreaterThanOrEqual(8);
        verifyNode(node.left);
        verifyNode(node.right);
      }
    }
    verifyNode(trained.root);

    const impSum = Object.values(trained.featureImportances).reduce((a, b) => a + b, 0);
    if (trained.root.isLeaf) {
      expect(impSum).toBe(0);
    } else {
      expect(impSum).toBeCloseTo(1, 8);
    }

    // Si minSamplesLeaf es demasiado alto para dividir, resulta un árbol sin divisiones
    const noSplit = trainDecisionTree(train, {
      criterion: 'entropy',
      maxDepth: 5,
      minSamplesLeaf: 120,
      minGain: 0,
    });
    expect(noSplit.root.isLeaf).toBe(true);
    expect(computeFeatureImportances(noSplit.root, train.length).cargaFinancieraPct).toBe(0);
  });

  it('aplica desempate determinista entre candidatos con igual ganancia', () => {
    const rows: SyntheticProfile[] = [
      { id: '1', ingresoMensualCOP: 2_000_000, cargaFinancieraPct: 20, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 24, utilizacionCuposPct: 20, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.1, split: 'train' },
      { id: '2', ingresoMensualCOP: 2_000_000, cargaFinancieraPct: 25, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 24, utilizacionCuposPct: 20, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.1, split: 'train' },
      { id: '3', ingresoMensualCOP: 5_000_000, cargaFinancieraPct: 50, maxDiasMoraPrevios: 30, antiguedadHistorialMeses: 12, utilizacionCuposPct: 80, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.9, split: 'train' },
      { id: '4', ingresoMensualCOP: 5_000_000, cargaFinancieraPct: 55, maxDiasMoraPrevios: 35, antiguedadHistorialMeses: 12, utilizacionCuposPct: 80, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.9, split: 'train' },
    ];
    const search1 = findBestSplitCandidates(rows, 'gini', 2, 0);
    const search2 = findBestSplitCandidates(rows, 'gini', 2, 0);
    expect(search1.best).not.toBeNull();
    expect(search1.best).toEqual(search2.best);
    // cargaFinancieraPct está primera en FEATURE_ORDER cuando empata con mora/utilización/ingreso
    expect(search1.best?.feature).toBe('cargaFinancieraPct');
    expect(search1.best?.gain).toBeCloseTo(0.5, 10);
  });

  it('clasifica pHoja === umbral como alerta positiva (1) y registra ruta exacta', () => {
    const leafNode: TreeNode = {
      id: 'N0',
      depth: 0,
      isLeaf: true,
      n: 20,
      positivos: 6,
      negativos: 14,
      pIncumplimiento: 0.3,
      claseMayoria: 0,
      impurity: giniImpurity(6, 20),
    };
    const resEqual = predictWithTree(
      leafNode,
      {
        ingresoMensualCOP: 4_000_000,
        cargaFinancieraPct: 30,
        maxDiasMoraPrevios: 0,
        antiguedadHistorialMeses: 36,
        utilizacionCuposPct: 40,
      },
      0.3,
    );
    expect(resEqual.claseAlerta).toBe(1);

    const resAbove = predictWithTree(
      leafNode,
      {
        ingresoMensualCOP: 4_000_000,
        cargaFinancieraPct: 30,
        maxDiasMoraPrevios: 0,
        antiguedadHistorialMeses: 36,
        utilizacionCuposPct: 40,
      },
      0.31,
    );
    expect(resAbove.claseAlerta).toBe(0);
  });
});

describe('Métricas de confusión, política ilustrativa y costos', () => {
  it('calcula F1=0 cuando TP=0 y FP+FN>0, y retorna null solo con denominador cero exacto', () => {
    const makeProfile = (id: string, actual: 0 | 1, carga: number): SyntheticProfile => ({
      id,
      ingresoMensualCOP: 3_000_000,
      cargaFinancieraPct: carga,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 24,
      utilizacionCuposPct: 20,
      incumplimiento12m: actual,
      probabilidadLatenteSimulada: 0.1,
      split: 'test',
    });

    const alwaysZeroLeaf: TreeNode = {
      id: 'N0',
      depth: 0,
      isLeaf: true,
      n: 10,
      positivos: 1,
      negativos: 9,
      pIncumplimiento: 0.1,
      claseMayoria: 0,
      impurity: giniImpurity(1, 10),
    };

    const alwaysOneLeaf: TreeNode = {
      id: 'N0',
      depth: 0,
      isLeaf: true,
      n: 10,
      positivos: 9,
      negativos: 1,
      pIncumplimiento: 0.9,
      claseMayoria: 1,
      impurity: giniImpurity(9, 10),
    };

    // 1. Sin alertas: TP=0, FN=10, FP=0, TN=90 -> F1=0 y Precision No definido
    const rowsNoAlerts: SyntheticProfile[] = [
      ...Array.from({ length: 10 }, (_, i) => makeProfile(`FN-${i}`, 1, 20)),
      ...Array.from({ length: 90 }, (_, i) => makeProfile(`TN-${i}`, 0, 20)),
    ];
    const mNoAlerts = evaluateMetrics(rowsNoAlerts, alwaysZeroLeaf, 0.5);
    expect([mNoAlerts.tp, mNoAlerts.fn, mNoAlerts.fp, mNoAlerts.tn]).toEqual([0, 10, 0, 90]);
    expect(mNoAlerts.precision).toBeNull();
    expect(mNoAlerts.precisionReason).toContain('denominador cero');
    expect(mNoAlerts.recall).toBe(0);
    expect(mNoAlerts.fnr).toBe(1);
    expect(mNoAlerts.f1).toBe(0);

    // 2. Solo falsos positivos: TP=0, FN=0, FP=5, TN=95 -> F1=0 (aunque Recall sea No definido)
    const splitRoot: TreeNode = {
      id: 'N0',
      depth: 0,
      isLeaf: false,
      n: 100,
      positivos: 10,
      negativos: 90,
      pIncumplimiento: 0.1,
      claseMayoria: 0,
      impurity: giniImpurity(10, 100),
      feature: 'cargaFinancieraPct',
      threshold: 40,
      left: alwaysZeroLeaf,
      right: alwaysOneLeaf,
    };
    const rowsOnlyFP: SyntheticProfile[] = [
      ...Array.from({ length: 5 }, (_, i) => makeProfile(`FP-${i}`, 0, 50)),
      ...Array.from({ length: 95 }, (_, i) => makeProfile(`TN-${i}`, 0, 20)),
    ];
    const mOnlyFP = evaluateMetrics(rowsOnlyFP, splitRoot, 0.5);
    expect([mOnlyFP.tp, mOnlyFP.fn, mOnlyFP.fp, mOnlyFP.tn]).toEqual([0, 0, 5, 95]);
    expect(mOnlyFP.precision).toBe(0);
    expect(mOnlyFP.recall).toBeNull();
    expect(mOnlyFP.fnr).toBeNull();
    expect(mOnlyFP.f1).toBe(0);

    // 3. Solo TN: TP=0, FN=0, FP=0, TN=100 -> F1 No definido (2*TP+FP+FN = 0)
    const rowsOnlyTN: SyntheticProfile[] = Array.from({ length: 100 }, (_, i) =>
      makeProfile(`TN-${i}`, 0, 20),
    );
    const mOnlyTN = evaluateMetrics(rowsOnlyTN, alwaysZeroLeaf, 0.5);
    expect([mOnlyTN.tp, mOnlyTN.fn, mOnlyTN.fp, mOnlyTN.tn]).toEqual([0, 0, 0, 100]);
    expect(mOnlyTN.accuracy).toBe(1);
    expect(mOnlyTN.precision).toBeNull();
    expect(mOnlyTN.recall).toBeNull();
    expect(mOnlyTN.fnr).toBeNull();
    expect(mOnlyTN.f1).toBeNull();
    expect(mOnlyTN.f1Reason).toContain('2·TP + FP + FN = 0');

    // 4. Conjunto vacío -> todas las métricas No definido
    const mEmpty = evaluateMetrics([], alwaysZeroLeaf, 0.5);
    expect(mEmpty.total).toBe(0);
    expect(mEmpty.accuracy).toBeNull();
    expect(mEmpty.precision).toBeNull();
    expect(mEmpty.recall).toBeNull();
    expect(mEmpty.fnr).toBeNull();
    expect(mEmpty.f1).toBeNull();
  });

  it('evalúa reglas de política ilustrativa, tope por producto y redondeo a 100.000 COP sin cupos negativos', () => {
    // Caso 1: Alerta de riesgo bloquea oferta
    const risk = evaluateCreditPolicy(
      {
        ingresoMensualCOP: 12_000_000,
        cargaFinancieraPct: 15,
        maxDiasMoraPrevios: 45,
        antiguedadHistorialMeses: 80,
        utilizacionCuposPct: 50,
      },
      0.35,
      0.3,
      DEFAULT_POLICY_RULES,
    );
    expect(risk.estado).toBe('revision_riesgo');
    expect(risk.cupoIlustrativoCOP).toBe(0);

    // Caso 2: Carga > 40% pero pHoja < umbral -> revisión capacidad
    const cap = evaluateCreditPolicy(
      {
        ingresoMensualCOP: 9_000_000,
        cargaFinancieraPct: 45,
        maxDiasMoraPrevios: 0,
        antiguedadHistorialMeses: 60,
        utilizacionCuposPct: 30,
      },
      0.1,
      0.3,
      DEFAULT_POLICY_RULES,
    );
    expect(cap.estado).toBe('revision_capacidad');
    expect(cap.cupoIlustrativoCOP).toBe(0);

    // Caso 3: Carga exactamente 40% da capacidad (0.4 - 0.4) = 0 -> revisar capacidad sin oferta
    const zeroCap = evaluateCreditPolicy(
      {
        ingresoMensualCOP: 6_000_000,
        cargaFinancieraPct: 40,
        maxDiasMoraPrevios: 0,
        antiguedadHistorialMeses: 36,
        utilizacionCuposPct: 20,
      },
      0.08,
      0.3,
      DEFAULT_POLICY_RULES,
    );
    expect(zeroCap.estado).toBe('revision_capacidad');
    expect(zeroCap.cupoIlustrativoCOP).toBe(0);

    // Caso 4: Elegible Platinum
    // ingreso = 10M, carga = 20% -> 10M * (0.4 - 0.2) * 3 = 6M -> tope 15M -> 6.000.000
    const plat = evaluateCreditPolicy(
      {
        ingresoMensualCOP: 10_000_000,
        cargaFinancieraPct: 20,
        maxDiasMoraPrevios: 0,
        antiguedadHistorialMeses: 48,
        utilizacionCuposPct: 20,
      },
      0.05,
      0.3,
      DEFAULT_POLICY_RULES,
    );
    expect(plat.estado).toBe('oferta_ilustrativa');
    expect(plat.productoPropuesto).toBe('Platinum');
    expect(plat.cupoIlustrativoCOP).toBe(6_000_000);
  });

  it('calcula correctamente los costos hipotéticos FP*cFP + FN*cFN', () => {
    const cost = computeErrorCosts(
      {
        tp: 12,
        fn: 4,
        fp: 10,
        tn: 46,
        total: 72,
        accuracy: 58 / 72,
        precision: 12 / 22,
        recall: 12 / 16,
        f1: null,
        fnr: 4 / 16,
      },
      DEFAULT_COST_CONFIG,
    );
    expect(cost.fpCostTotal).toBe(3_000_000);
    expect(cost.fnCostTotal).toBe(32_000_000);
    expect(cost.totalCost).toBe(35_000_000);
  });
});
