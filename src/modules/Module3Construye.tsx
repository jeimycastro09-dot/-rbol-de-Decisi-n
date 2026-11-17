import { useEffect, useMemo, useState } from 'react';
import { GitBranch, Play } from 'lucide-react';
import { InteractiveTreeSvg } from '../components/InteractiveTreeSvg';
import {
  computeImpurity,
  findBestSplitCandidates,
  predictWithTree,
} from '../algorithms/cart';
import { MINI_MANUAL_DATASET } from '../data/educationalContent';
import {
  SplitCriterion,
  SyntheticProfile,
  TrainConfig,
  TrainedTreeResult,
  TreeNode,
} from '../types/credit';
import {
  formatCOP,
  formatFeatureValue,
  formatImpurity,
  formatPct,
} from '../utils/format';

interface Module3ConstruyeProps {
  trainRows: SyntheticProfile[];
  trainConfig: TrainConfig;
  trainedTree: TrainedTreeResult;
  alertThreshold: number;
  onTrainTree: (nextConfig: TrainConfig) => void;
}

export function Module3Construye({
  trainRows,
  trainConfig,
  trainedTree,
  alertThreshold,
  onTrainTree,
}: Module3ConstruyeProps) {
  const [draftConfig, setDraftConfig] = useState<TrainConfig>(trainConfig);
  const [selectedNode, setSelectedNode] = useState<TreeNode>(trainedTree.root);
  const [traceRecordId, setTraceRecordId] = useState<string>(
    trainRows[0]?.id ?? '',
  );
  const [manualSplitFeature, setManualSplitFeature] = useState<
    'cargaFinancieraPct' | 'maxDiasMoraPrevios'
  >('cargaFinancieraPct');

  useEffect(() => {
    setDraftConfig(trainConfig);
  }, [trainConfig]);

  useEffect(() => {
    setSelectedNode(trainedTree.root);
  }, [trainedTree.root]);

  const hasPendingChanges =
    draftConfig.criterion !== trainConfig.criterion ||
    draftConfig.maxDepth !== trainConfig.maxDepth ||
    draftConfig.minSamplesLeaf !== trainConfig.minSamplesLeaf;

  const tracedRecord = useMemo(
    () => trainRows.find((r) => r.id === traceRecordId) ?? null,
    [trainRows, traceRecordId],
  );

  const tracedPrediction = useMemo(() => {
    if (!tracedRecord) return null;
    return predictWithTree(trainedTree.root, tracedRecord, alertThreshold);
  }, [trainedTree.root, tracedRecord, alertThreshold]);

  const highlightedNodes = useMemo(() => {
    const set = new Set<string>();
    if (!tracedPrediction) return set;
    set.add(trainedTree.root.id);
    let cur = trainedTree.root;
    for (const step of tracedPrediction.route) {
      if (step.direction === 'left' && cur.left) {
        cur = cur.left;
      } else if (step.direction === 'right' && cur.right) {
        cur = cur.right;
      }
      set.add(cur.id);
    }
    return set;
  }, [tracedPrediction, trainedTree.root]);

  const highlightedEdges = useMemo(() => {
    const set = new Set<string>();
    if (!tracedPrediction) return set;
    let cur = trainedTree.root;
    for (const step of tracedPrediction.route) {
      const next = step.direction === 'left' ? cur.left : cur.right;
      if (next) {
        set.add(`${cur.id}->${next.id}`);
        cur = next;
      }
    }
    return set;
  }, [tracedPrediction, trainedTree.root]);

  const manualBreakdown = useMemo(() => {
    const n = MINI_MANUAL_DATASET.length;
    const pos = MINI_MANUAL_DATASET.reduce((a, b) => a + b.incumplimiento12m, 0);
    const parentGini = computeImpurity(pos, n, 'gini');
    const cutoff = manualSplitFeature === 'cargaFinancieraPct' ? 35 : 7.5;
    const left = MINI_MANUAL_DATASET.filter((r) => r[manualSplitFeature] <= cutoff);
    const right = MINI_MANUAL_DATASET.filter((r) => r[manualSplitFeature] > cutoff);
    const leftPos = left.reduce((a, b) => a + b.incumplimiento12m, 0);
    const rightPos = right.reduce((a, b) => a + b.incumplimiento12m, 0);
    const gLeft = computeImpurity(leftPos, left.length, 'gini');
    const gRight = computeImpurity(rightPos, right.length, 'gini');
    const weighted = (left.length / n) * gLeft + (right.length / n) * gRight;
    const gain = parentGini - weighted;
    const bestManual = findBestSplitCandidates(MINI_MANUAL_DATASET, 'gini', 2, 0, 1).best;
    return {
      n,
      pos,
      parentGini,
      cutoff,
      leftCount: left.length,
      leftPos,
      gLeft,
      rightCount: right.length,
      rightPos,
      gRight,
      weighted,
      gain,
      bestManual,
    };
  }, [manualSplitFeature]);

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 03 · Algoritmo CART binario real en TypeScript (solo datos de entrenamiento)
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          Construye y aprende: cómo CART decide cada división
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Aquí el árbol se entrena exclusivamente con los {trainRows.length} registros de
          entrenamiento, sin tocar el conjunto de prueba. Evalúa puntos medios entre valores
          únicos observados y elige el corte que maximiza la reducción ponderada de impureza.
        </p>
      </header>

      {/* Fórmulas explicadas */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lab-panel rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#F0F7FF]">Índice de Gini</h3>
          <p className="font-mono-num text-xs bg-[#080F22] border border-[#25E5F2]/25 rounded px-3 py-2 text-[#25E5F2]">
            Gini = 1 - (p_1² + p_0²)
          </p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Vale 0 cuando el nodo es puro (todos cumplen o todos incumplen) y alcanza su máximo
            0,50 cuando hay mitad y mitad (50% / 50%).
          </p>
        </div>

        <div className="lab-panel rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#F0F7FF]">Entropía binaria</h3>
          <p className="font-mono-num text-xs bg-[#080F22] border border-[#9C6BFF]/30 rounded px-3 py-2 text-[#C4B5FD]">
            H = -(p_1·log₂(p_1) + p_0·log₂(p_0))
          </p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Se asume por convención matemática <span className="font-mono-num text-[#F0F7FF]">0·log₂(0) = 0</span>.
            Vale 0 en nodos puros y 1,0 bit cuando las clases están 50% / 50%.
          </p>
        </div>

        <div className="lab-panel rounded-xl p-5 space-y-2">
          <h3 className="text-sm font-semibold text-[#F0F7FF]">Ganancia ponderada y parada</h3>
          <p className="font-mono-num text-xs bg-[#080F22] border border-[#25E5F2]/25 rounded px-3 py-2 text-[#25E5F2]">
            Ganancia = I(padre) - (n_izq/n)·I(izq) - (n_der/n)·I(der)
          </p>
          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            El algoritmo selecciona la mayor ganancia (desempate determinista) y se detiene por
            pureza, profundidad máxima, mínimo de registros por hoja, ganancia mínima o ausencia de
            cortes válidos.
          </p>
        </div>
      </section>

      {/* Controles de entrenamiento */}
      <section className="lab-panel rounded-xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#F0F7FF]">
              Parámetros de entrenamiento CART
            </h3>
            <p className="text-xs text-[#94A3B8]">
              La proporción de cada hoja (p_hoja) es la frecuencia de incumplidores en esa hoja de
              entrenamiento; no es una PD calibrada ni una certeza.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTrainTree(draftConfig)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] hover:brightness-110 transition-all whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>
              {hasPendingChanges ? 'Entrenar árbol con nuevos parámetros' : 'Reentrenar árbol CART'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#F0F7FF]">
              Criterio de impureza
            </label>
            <div className="flex items-center gap-1 p-1 bg-[#080F22] border border-[#25E5F2]/20 rounded-lg">
              {(['gini', 'entropy'] as SplitCriterion[]).map((crit) => (
                <button
                  key={crit}
                  type="button"
                  onClick={() => setDraftConfig((prev) => ({ ...prev, criterion: crit }))}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    draftConfig.criterion === crit
                      ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border border-[#25E5F2]/50'
                      : 'text-[#94A3B8] hover:text-[#F0F7FF]'
                  }`}
                >
                  {crit === 'gini' ? 'Índice de Gini' : 'Entropía (bits)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="max-depth-range" className="font-semibold text-[#F0F7FF]">
                Profundidad máxima
              </label>
              <span className="font-mono-num font-bold text-[#25E5F2]">
                {draftConfig.maxDepth} niveles
              </span>
            </div>
            <input
              id="max-depth-range"
              type="range"
              min={1}
              max={5}
              step={1}
              value={draftConfig.maxDepth}
              onChange={(e) =>
                setDraftConfig((prev) => ({ ...prev, maxDepth: Number(e.target.value) }))
              }
              className="w-full accent-[#25E5F2]"
            />
            <div className="flex justify-between text-[11px] font-mono-num text-[#8FA3C7]">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="min-leaf-range" className="font-semibold text-[#F0F7FF]">
                Mínimo de muestras por hoja
              </label>
              <span className="font-mono-num font-bold text-[#25E5F2]">
                {draftConfig.minSamplesLeaf} registros
              </span>
            </div>
            <input
              id="min-leaf-range"
              type="range"
              min={2}
              max={30}
              step={1}
              value={draftConfig.minSamplesLeaf}
              onChange={(e) =>
                setDraftConfig((prev) => ({
                  ...prev,
                  minSamplesLeaf: Number(e.target.value),
                }))
              }
              className="w-full accent-[#25E5F2]"
            />
            <div className="flex justify-between text-[11px] font-mono-num text-[#8FA3C7]">
              <span>2</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[#25E5F2]/15 text-xs text-[#94A3B8]">
          <span>
            Modelo entrenado activo: <strong className="text-[#F0F7FF]">{trainConfig.criterion === 'gini' ? 'Gini' : 'Entropía'}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Profundidad alcanzada: <strong className="font-mono-num text-[#25E5F2]">{trainedTree.depthReached}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Hojas: <strong className="font-mono-num text-[#25E5F2]">{trainedTree.leafCount}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Nodos totales: <strong className="font-mono-num text-[#25E5F2]">{trainedTree.nodeCount}</strong>
          </span>
          {hasPendingChanges && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-semibold text-[#FBBF24]">
                Tienes cambios sin entrenar: presiona &quot;Entrenar árbol con nuevos parámetros&quot;.
              </span>
            </>
          )}
        </div>
      </section>

      {/* Árbol visual + selector de registro + inspector de nodo */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#F0F7FF]">
                Árbol CART aprendido sobre entrenamiento
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Resalta un registro de entrenamiento para seguir su camino exacto desde la raíz.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="trace-train-select" className="text-xs text-[#94A3B8]">
                Resaltar registro:
              </label>
              <select
                id="trace-train-select"
                value={traceRecordId}
                onChange={(e) => setTraceRecordId(e.target.value)}
                className="px-3 py-1.5 text-xs font-mono-num rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF]"
              >
                <option value="">Ninguno</option>
                {trainRows.slice(0, 40).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id} · Real:{r.incumplimiento12m} · Carga {r.cargaFinancieraPct}%
                  </option>
                ))}
              </select>
            </div>
          </div>

          <InteractiveTreeSvg
            root={trainedTree.root}
            selectedNodeId={selectedNode.id}
            onSelectNode={(n) => setSelectedNode(n)}
            highlightedNodeIds={highlightedNodes}
            highlightedEdgePairs={highlightedEdges}
            alertThreshold={alertThreshold}
            title={`Árbol CART (${trainConfig.criterion === 'gini' ? 'Gini' : 'Entropía'} · maxDepth=${trainConfig.maxDepth} · minLeaf=${trainConfig.minSamplesLeaf})`}
          />
        </div>

        <aside className="xl:col-span-4 space-y-4">
          <div className="lab-panel rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#25E5F2]">
                <GitBranch className="w-4 h-4" aria-hidden="true" />
                <span>Inspector de nodo · {selectedNode.id}</span>
              </div>
              <span className="font-mono-num text-xs text-[#94A3B8]">
                Prof. {selectedNode.depth}
              </span>
            </div>

            {!selectedNode.isLeaf && selectedNode.feature && typeof selectedNode.threshold === 'number' ? (
              <p className="text-sm font-semibold text-[#F0F7FF]">
                Condición: {selectedNode.featureLabel} &lt;={' '}
                {formatFeatureValue(selectedNode.feature, selectedNode.threshold)}
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#F0F7FF]">
                Hoja terminal · {selectedNode.pIncumplimiento >= alertThreshold ? 'Con alerta' : 'Sin alerta'} (umbral{' '}
                {formatPct(alertThreshold)})
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs border-y border-[#25E5F2]/15 py-3">
              <div>
                <p className="text-[#8FA3C7]">Registros en nodo (n)</p>
                <p className="font-mono-num font-bold text-sm text-[#F0F7FF]">
                  {selectedNode.n}
                </p>
              </div>
              <div>
                <p className="text-[#8FA3C7]">Incumplidores / Cumplidores</p>
                <p className="font-mono-num font-bold text-sm text-[#F0F7FF]">
                  {selectedNode.positivos} / {selectedNode.negativos}
                </p>
              </div>
              <div>
                <p className="text-[#8FA3C7]">Proporción hoja (p_hoja)</p>
                <p className="font-mono-num font-bold text-sm text-[#25E5F2]">
                  {formatPct(selectedNode.pIncumplimiento)}
                </p>
              </div>
              <div>
                <p className="text-[#8FA3C7]">Impureza ({trainConfig.criterion})</p>
                <p className="font-mono-num font-bold text-sm text-[#C4B5FD]">
                  {formatImpurity(selectedNode.impurity)}
                </p>
              </div>
            </div>

            {typeof selectedNode.gain === 'number' && (
              <p className="text-xs text-[#CBD5E1]">
                Ganancia de impureza lograda por este corte:{' '}
                <strong className="font-mono-num text-[#25E5F2]">
                  {formatImpurity(selectedNode.gain)}
                </strong>
              </p>
            )}

            {tracedRecord && tracedPrediction && (
              <div className="rounded-lg border border-[#25E5F2]/25 bg-[#080F22] p-3 text-xs space-y-1.5">
                <p className="font-semibold text-[#F0F7FF]">
                  Ruta de {tracedRecord.id} (etiqueta real: {tracedRecord.incumplimiento12m}):
                </p>
                <p className="text-[#CBD5E1]">
                  Ingreso {formatCOP(tracedRecord.ingresoMensualCOP)}, carga{' '}
                  {tracedRecord.cargaFinancieraPct}%, mora {tracedRecord.maxDiasMoraPrevios} d,{' '}
                  hist. {tracedRecord.antiguedadHistorialMeses} m, util.{' '}
                  {tracedRecord.utilizacionCuposPct}%.
                </p>
                <p className="font-medium text-[#25E5F2]">
                  Llega a hoja {tracedPrediction.leafNodeId} con p_hoja ={' '}
                  {formatPct(tracedPrediction.pHoja)}.
                </p>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* Tabla de mejores candidatos en raíz */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#F0F7FF]">
            Candidatos evaluados en la raíz (N0, n={trainRows.length})
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Primeros {trainedTree.rootCandidates.length} puntos de corte ordenados por ganancia
            calculada sobre entrenamiento. El candidato seleccionado es el de mayor ganancia real
            (si supera minGain y minSamplesLeaf).
          </p>
        </div>

        {trainedTree.rootCandidates.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">
            No hay divisiones válidas en la raíz con el parámetro actual de mínimo por hoja (
            {trainConfig.minSamplesLeaf}).
          </p>
        ) : (
          <div className="overflow-x-auto border border-[#25E5F2]/15 rounded-lg bg-[#080F22]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
                  <th className="py-2.5 px-3 font-semibold">Ranking</th>
                  <th className="py-2.5 px-3 font-semibold">Variable y corte (&lt;=)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Izq (n / p_inc)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Der (n / p_inc)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Impureza Izq</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Impureza Der</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25E5F2]/10">
                {trainedTree.rootCandidates.map((cand, idx) => {
                  const isWinner =
                    !trainedTree.root.isLeaf &&
                    trainedTree.root.feature === cand.feature &&
                    trainedTree.root.threshold === cand.threshold;
                  return (
                    <tr
                      key={`${cand.feature}-${cand.threshold}`}
                      className={isWinner ? 'bg-[#0C2535]/90 font-medium' : 'hover:bg-[#162544]/50'}
                    >
                      <td className="py-2.5 px-3 font-mono-num text-[#F0F7FF]">
                        #{idx + 1} {isWinner ? '· Seleccionado' : ''}
                      </td>
                      <td className="py-2.5 px-3 text-[#F0F7FF]">
                        {cand.featureLabel} &lt;={' '}
                        <span className="font-mono-num text-[#25E5F2]">
                          {formatFeatureValue(cand.feature, cand.threshold)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                        {cand.leftCount} ({formatPct(cand.leftPos / cand.leftCount)})
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                        {cand.rightCount} ({formatPct(cand.rightPos / cand.rightCount)})
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                        {formatImpurity(cand.leftImpurity)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                        {formatImpurity(cand.rightImpurity)}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-right font-semibold text-[#25E5F2]">
                        {formatImpurity(cand.gain)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Mini ejemplo manual independiente de 10 observaciones */}
      <section className="lab-panel-alt rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[#F0F7FF]">
              Mini ejemplo manual con 10 observaciones (cómo se pondera la ganancia)
            </h3>
            <p className="text-xs text-[#CBD5E1]">
              Ejemplo didáctico independiente para comprobar a mano el cálculo de Gini ponderado.
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#080F22] border border-[#25E5F2]/20 rounded-lg">
            <button
              type="button"
              onClick={() => setManualSplitFeature('cargaFinancieraPct')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                manualSplitFeature === 'cargaFinancieraPct'
                  ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border border-[#25E5F2]/50'
                  : 'text-[#94A3B8] hover:text-[#F0F7FF]'
              }`}
            >
              Probar corte: Carga &lt;= 35%
            </button>
            <button
              type="button"
              onClick={() => setManualSplitFeature('maxDiasMoraPrevios')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 ${
                manualSplitFeature === 'maxDiasMoraPrevios'
                  ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border border-[#25E5F2]/50'
                  : 'text-[#94A3B8] hover:text-[#F0F7FF]'
              }`}
            >
              Probar corte: Mora &lt;= 7,5 d
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 overflow-x-auto bg-[#080F22] border border-[#25E5F2]/20 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#25E5F2]/20 bg-[#121F3A] text-[#CBD5E1]">
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3 text-right">Carga (%)</th>
                  <th className="py-2 px-3 text-right">Mora (d)</th>
                  <th className="py-2 px-3 text-right">Incumple</th>
                  <th className="py-2 px-3 text-right">Rama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25E5F2]/10">
                {MINI_MANUAL_DATASET.map((r) => {
                  const isLeft = r[manualSplitFeature] <= manualBreakdown.cutoff;
                  return (
                    <tr key={r.id}>
                      <td className="py-1.5 px-3 font-mono-num text-[#25E5F2]">{r.id}</td>
                      <td className="py-1.5 px-3 font-mono-num text-right text-[#F0F7FF]">
                        {r.cargaFinancieraPct}%
                      </td>
                      <td className="py-1.5 px-3 font-mono-num text-right text-[#F0F7FF]">
                        {r.maxDiasMoraPrevios}
                      </td>
                      <td
                        className={`py-1.5 px-3 font-mono-num text-right font-semibold ${
                          r.incumplimiento12m === 1 ? 'text-[#FBBF24]' : 'text-[#34D399]'
                        }`}
                      >
                        {r.incumplimiento12m}
                      </td>
                      <td className="py-1.5 px-3 text-right font-medium text-[#CBD5E1]">
                        {isLeft ? 'Izquierda (<=)' : 'Derecha (>)'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="lg:col-span-5 rounded-lg border border-[#25E5F2]/20 bg-[#080F22] p-4 space-y-2.5 text-xs text-[#CBD5E1]">
            <p className="font-semibold text-sm text-[#F0F7FF]">Cálculo paso a paso (n=10)</p>
            <p>
              Padre: {manualBreakdown.pos} incumplidores de {manualBreakdown.n} (
              <span className="font-mono-num text-[#F0F7FF]">G_padre = {formatImpurity(manualBreakdown.parentGini)}</span>).
            </p>
            <p>
              Rama izquierda: <strong className="font-mono-num text-[#F0F7FF]">{manualBreakdown.leftCount}</strong>{' '}
              casos ({manualBreakdown.leftPos} inc.),{' '}
              <span className="font-mono-num text-[#F0F7FF]">G_izq = {formatImpurity(manualBreakdown.gLeft)}</span>.
            </p>
            <p>
              Rama derecha: <strong className="font-mono-num text-[#F0F7FF]">{manualBreakdown.rightCount}</strong>{' '}
              casos ({manualBreakdown.rightPos} inc.),{' '}
              <span className="font-mono-num text-[#F0F7FF]">G_der = {formatImpurity(manualBreakdown.gRight)}</span>.
            </p>
            <div className="rounded bg-[#101A32] border border-[#25E5F2]/25 p-2.5 font-mono-num text-[#25E5F2]">
              Impureza ponderada = ({manualBreakdown.leftCount}/10)·{formatImpurity(manualBreakdown.gLeft)} + ({manualBreakdown.rightCount}/10)·{formatImpurity(manualBreakdown.gRight)} = {formatImpurity(manualBreakdown.weighted)}
              <br />
              Ganancia = {formatImpurity(manualBreakdown.parentGini)} - {formatImpurity(manualBreakdown.weighted)} ={' '}
              <strong className="text-[#F0F7FF]">{formatImpurity(manualBreakdown.gain)}</strong>
            </div>
            {manualBreakdown.bestManual && (
              <p className="text-[#25E5F2]">
                En este mini conjunto, el mejor corte posible entre todas las variables es{' '}
                <strong className="text-[#F0F7FF]">
                  {manualBreakdown.bestManual.featureLabel} &lt;={' '}
                  {formatFeatureValue(
                    manualBreakdown.bestManual.feature,
                    manualBreakdown.bestManual.threshold,
                  )}
                </strong>{' '}
                (ganancia {formatImpurity(manualBreakdown.bestManual.gain)}).
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
