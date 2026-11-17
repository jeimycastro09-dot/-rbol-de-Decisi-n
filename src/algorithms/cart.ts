import {
  ApplicantFeatures,
  ConfusionMetrics,
  FeatureKey,
  PredictionResult,
  RouteStep,
  SplitCandidate,
  SplitCriterion,
  SyntheticProfile,
  TrainConfig,
  TrainedTreeResult,
  TreeNode,
} from '../types/credit';
import {
  FEATURE_META,
  FEATURE_ORDER,
  formatFeatureValue,
} from '../utils/format';

const GAIN_EPSILON = 1e-12;

export const DEFAULT_TRAIN_CONFIG: TrainConfig = {
  criterion: 'gini',
  maxDepth: 3,
  minSamplesLeaf: 10,
  minGain: 0.002,
};

/**
 * Índice de impureza de Gini para clasificación binaria:
 * G = 1 - (p1^2 + p0^2), con G = 0 si n = 0.
 */
export function giniImpurity(positivos: number, total: number): number {
  if (total <= 0) return 0;
  const p1 = positivos / total;
  const p0 = 1 - p1;
  return 1 - (p1 * p1 + p0 * p0);
}

/**
 * Entropía binaria (bits):
 * H = -(p1 log2 p1 + p0 log2 p0), asumiendo 0 * log2(0) = 0 y H = 0 si n = 0.
 */
export function entropyImpurity(positivos: number, total: number): number {
  if (total <= 0) return 0;
  const p1 = positivos / total;
  const p0 = 1 - p1;
  let h = 0;
  if (p1 > 0) h -= p1 * Math.log2(p1);
  if (p0 > 0) h -= p0 * Math.log2(p0);
  return h;
}

export function computeImpurity(
  positivos: number,
  total: number,
  criterion: SplitCriterion,
): number {
  return criterion === 'gini'
    ? giniImpurity(positivos, total)
    : entropyImpurity(positivos, total);
}

export interface NodeSplitSearchResult {
  best: SplitCandidate | null;
  topCandidates: SplitCandidate[];
}

/**
 * Evalúa cortes binarios numéricos (x <= umbral vs x > umbral) entre puntos medios
 * de valores únicos observados en las filas del nodo actual.
 * Desempate determinista: mayor ganancia; luego orden fijo de variable; luego menor umbral.
 */
export function findBestSplitCandidates(
  rows: SyntheticProfile[],
  criterion: SplitCriterion,
  minSamplesLeaf: number,
  minGain: number,
  topLimit = 8,
): NodeSplitSearchResult {
  const n = rows.length;
  if (n === 0 || n < 2 * minSamplesLeaf) {
    return { best: null, topCandidates: [] };
  }

  const totalPos = rows.reduce((acc, r) => acc + r.incumplimiento12m, 0);
  if (totalPos === 0 || totalPos === n) {
    return { best: null, topCandidates: [] };
  }

  const parentImpurity = computeImpurity(totalPos, n, criterion);
  const candidates: SplitCandidate[] = [];

  for (const feature of FEATURE_ORDER) {
    const sorted = [...rows].sort((a, b) => a[feature] - b[feature]);

    // Acumular conteos por cada valor único observado
    let leftCount = 0;
    let leftPos = 0;

    let i = 0;
    while (i < n) {
      const currentVal = sorted[i][feature];
      while (i < n && sorted[i][feature] === currentVal) {
        leftCount += 1;
        leftPos += sorted[i].incumplimiento12m;
        i += 1;
      }

      // Si todavía quedan registros con un valor estrictamente mayor, el punto medio es candidato
      if (i < n) {
        const nextVal = sorted[i][feature];
        const rightCount = n - leftCount;

        if (leftCount >= minSamplesLeaf && rightCount >= minSamplesLeaf) {
          const rightPos = totalPos - leftPos;
          const leftImpurity = computeImpurity(leftPos, leftCount, criterion);
          const rightImpurity = computeImpurity(rightPos, rightCount, criterion);
          const weightedImpurity =
            (leftCount / n) * leftImpurity + (rightCount / n) * rightImpurity;
          const gain = parentImpurity - weightedImpurity;
          const threshold = (currentVal + nextVal) / 2;

          candidates.push({
            feature,
            featureLabel: FEATURE_META[feature].shortLabel,
            threshold,
            gain,
            parentImpurity,
            leftCount,
            leftPos,
            leftNeg: leftCount - leftPos,
            leftImpurity,
            rightCount,
            rightPos,
            rightNeg: rightCount - rightPos,
            rightImpurity,
          });
        }
      }
    }
  }

  if (candidates.length === 0) {
    return { best: null, topCandidates: [] };
  }

  // Ordenar descendente por ganancia con desempate determinista
  candidates.sort((a, b) => {
    if (Math.abs(b.gain - a.gain) > GAIN_EPSILON) {
      return b.gain - a.gain;
    }
    const orderDiff =
      FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature);
    if (orderDiff !== 0) return orderDiff;
    return a.threshold - b.threshold;
  });

  const bestCandidate =
    candidates[0].gain > minGain + GAIN_EPSILON ? candidates[0] : null;

  return {
    best: bestCandidate,
    topCandidates: candidates.slice(0, topLimit),
  };
}

function buildNodeRecursive(
  rows: SyntheticProfile[],
  depth: number,
  nodeId: string,
  config: TrainConfig,
  captureRootCandidates?: (candidates: SplitCandidate[]) => void,
): TreeNode {
  const n = rows.length;
  const positivos = rows.reduce((acc, r) => acc + r.incumplimiento12m, 0);
  const negativos = n - positivos;
  const pIncumplimiento = n > 0 ? positivos / n : 0;
  const claseMayoria: 0 | 1 = pIncumplimiento >= 0.5 ? 1 : 0;
  const impurity = computeImpurity(positivos, n, config.criterion);

  const canTrySplit =
    n > 0 &&
    positivos > 0 &&
    negativos > 0 &&
    depth < config.maxDepth &&
    n >= 2 * config.minSamplesLeaf;

  if (!canTrySplit) {
    if (depth === 0 && captureRootCandidates) {
      const search = findBestSplitCandidates(
        rows,
        config.criterion,
        config.minSamplesLeaf,
        config.minGain,
      );
      captureRootCandidates(search.topCandidates);
    }
    return {
      id: nodeId,
      depth,
      isLeaf: true,
      n,
      positivos,
      negativos,
      pIncumplimiento,
      claseMayoria,
      impurity,
    };
  }

  const { best, topCandidates } = findBestSplitCandidates(
    rows,
    config.criterion,
    config.minSamplesLeaf,
    config.minGain,
  );

  if (depth === 0 && captureRootCandidates) {
    captureRootCandidates(topCandidates);
  }

  if (!best) {
    return {
      id: nodeId,
      depth,
      isLeaf: true,
      n,
      positivos,
      negativos,
      pIncumplimiento,
      claseMayoria,
      impurity,
    };
  }

  const leftRows = rows.filter((r) => r[best.feature] <= best.threshold);
  const rightRows = rows.filter((r) => r[best.feature] > best.threshold);

  const leftNode = buildNodeRecursive(
    leftRows,
    depth + 1,
    `${nodeId}L`,
    config,
  );
  const rightNode = buildNodeRecursive(
    rightRows,
    depth + 1,
    `${nodeId}R`,
    config,
  );

  return {
    id: nodeId,
    depth,
    isLeaf: false,
    n,
    positivos,
    negativos,
    pIncumplimiento,
    claseMayoria,
    impurity,
    feature: best.feature,
    featureLabel: best.featureLabel,
    threshold: best.threshold,
    gain: best.gain,
    left: leftNode,
    right: rightNode,
  };
}

function collectTreeStats(node: TreeNode): {
  depthReached: number;
  leafCount: number;
  nodeCount: number;
} {
  if (node.isLeaf || !node.left || !node.right) {
    return { depthReached: node.depth, leafCount: 1, nodeCount: 1 };
  }
  const left = collectTreeStats(node.left);
  const right = collectTreeStats(node.right);
  return {
    depthReached: Math.max(left.depthReached, right.depthReached),
    leafCount: left.leafCount + right.leafCount,
    nodeCount: 1 + left.nodeCount + right.nodeCount,
  };
}

/**
 * Importancia por reducción ponderada de impureza normalizada (sum = 1 si hay divisiones,
 * 0 en todas si el árbol es una única hoja; variables no usadas = 0).
 * No representa causalidad ni equivalencia con SHAP.
 */
export function computeFeatureImportances(
  root: TreeNode,
  totalTrainSamples: number,
): Record<FeatureKey, number> {
  const raw: Record<FeatureKey, number> = {
    cargaFinancieraPct: 0,
    maxDiasMoraPrevios: 0,
    utilizacionCuposPct: 0,
    antiguedadHistorialMeses: 0,
    ingresoMensualCOP: 0,
  };

  if (totalTrainSamples <= 0) return raw;

  function accumulate(node: TreeNode) {
    if (node.isLeaf || !node.feature || typeof node.gain !== 'number') return;
    raw[node.feature] += (node.n / totalTrainSamples) * node.gain;
    if (node.left) accumulate(node.left);
    if (node.right) accumulate(node.right);
  }

  accumulate(root);

  const sum = Object.values(raw).reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return raw;
  }

  const normalized: Record<FeatureKey, number> = { ...raw };
  for (const key of FEATURE_ORDER) {
    normalized[key] = raw[key] / sum;
  }
  return normalized;
}

/**
 * Entrena un árbol CART binario exclusivamente sobre el conjunto de entrenamiento.
 */
export function trainDecisionTree(
  trainRows: SyntheticProfile[],
  config: TrainConfig,
): TrainedTreeResult {
  let rootCandidates: SplitCandidate[] = [];
  const root = buildNodeRecursive(trainRows, 0, 'N0', config, (cands) => {
    rootCandidates = cands;
  });

  const stats = collectTreeStats(root);
  const featureImportances = computeFeatureImportances(root, trainRows.length);

  return {
    root,
    config,
    featureImportances,
    rootCandidates,
    depthReached: stats.depthReached,
    leafCount: stats.leafCount,
    nodeCount: stats.nodeCount,
  };
}

/**
 * Evalúa un perfil a través del árbol entrenado y aplica el umbral de alerta (pHoja >= umbral).
 */
export function predictWithTree(
  root: TreeNode,
  features: ApplicantFeatures,
  alertThreshold: number,
): PredictionResult {
  const route: RouteStep[] = [];
  let current = root;

  while (!current.isLeaf && current.feature && typeof current.threshold === 'number' && current.left && current.right) {
    const val = features[current.feature];
    const threshold = current.threshold;
    const goLeft = val <= threshold;
    const formattedValue = formatFeatureValue(current.feature, val);
    const formattedThreshold = formatFeatureValue(current.feature, threshold);

    route.push({
      nodeId: current.id,
      depth: current.depth,
      feature: current.feature,
      featureLabel: FEATURE_META[current.feature].shortLabel,
      threshold,
      value: val,
      formattedValue,
      formattedThreshold,
      direction: goLeft ? 'left' : 'right',
      conditionText: `${FEATURE_META[current.feature].shortLabel} <= ${formattedThreshold}`,
      decisionText: goLeft
        ? `Sí (${formattedValue} <= ${formattedThreshold}) · Rama izquierda`
        : `No (${formattedValue} > ${formattedThreshold}) · Rama derecha`,
      nNode: current.n,
      pNode: current.pIncumplimiento,
    });

    current = goLeft ? current.left : current.right;
  }

  const pHoja = current.pIncumplimiento;
  const claseAlerta: 0 | 1 = pHoja >= alertThreshold ? 1 : 0;

  return {
    pHoja,
    claseAlerta,
    leafNodeId: current.id,
    leafN: current.n,
    leafPositivos: current.positivos,
    leafNegativos: current.negativos,
    route,
  };
}

/**
 * Evalúa métricas de clasificación sobre un conjunto (entrenamiento o prueba).
 * Positivo = incumplimiento (1), Negativo = cumplimiento (0).
 * Matriz: filas = REAL (+/-), columnas = PREDICHO (+/-) -> [[TP, FN], [FP, TN]].
 */
export function evaluateMetrics(
  rows: SyntheticProfile[],
  root: TreeNode,
  alertThreshold: number,
): ConfusionMetrics {
  let tp = 0;
  let fn = 0;
  let fp = 0;
  let tn = 0;

  for (const row of rows) {
    const pred = predictWithTree(root, row, alertThreshold).claseAlerta;
    const actual = row.incumplimiento12m;
    if (actual === 1 && pred === 1) tp += 1;
    else if (actual === 1 && pred === 0) fn += 1;
    else if (actual === 0 && pred === 1) fp += 1;
    else tn += 1;
  }

  const total = rows.length;
  const accuracy = total > 0 ? (tp + tn) / total : null;
  const accuracyReason =
    total === 0 ? 'No definido (denominador cero: conjunto vacío).' : undefined;

  const predPos = tp + fp;
  const precision = predPos > 0 ? tp / predPos : null;
  const precisionReason =
    predPos === 0
      ? 'No definido (denominador cero: TP + FP = 0, ninguna solicitud superó el umbral de alerta).'
      : undefined;

  const realPos = tp + fn;
  const recall = realPos > 0 ? tp / realPos : null;
  const recallReason =
    realPos === 0
      ? 'No definido (denominador cero: TP + FN = 0, no hay incumplidores reales en el conjunto).'
      : undefined;

  const fnr = realPos > 0 ? fn / realPos : null;
  const fnrReason =
    realPos === 0
      ? 'No definido (denominador cero: TP + FN = 0, no hay incumplidores reales en el conjunto).'
      : undefined;

  const f1Denominator = 2 * tp + fp + fn;
  const f1 = f1Denominator > 0 ? (2 * tp) / f1Denominator : null;
  const f1Reason =
    f1Denominator === 0
      ? 'No definido (denominador cero: 2·TP + FP + FN = 0).'
      : undefined;

  return {
    tp,
    fn,
    fp,
    tn,
    total,
    accuracy,
    precision,
    recall,
    f1,
    fnr,
    accuracyReason,
    precisionReason,
    recallReason,
    f1Reason,
    fnrReason,
  };
}
