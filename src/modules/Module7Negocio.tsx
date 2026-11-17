import { useMemo } from 'react';
import { BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { PlotlyChart } from '../components/PlotlyChart';
import { evaluateMetrics, trainDecisionTree } from '../algorithms/cart';
import { computeErrorCosts, DEFAULT_COST_CONFIG } from '../algorithms/policy';
import { CostConfig, SyntheticProfile, TrainConfig } from '../types/credit';
import { formatCOP, formatPct } from '../utils/format';

interface Module7NegocioProps {
  trainRows: SyntheticProfile[];
  testRows: SyntheticProfile[];
  trainConfig: TrainConfig;
  alertThreshold: number;
  costs: CostConfig;
  onChangeCosts: (next: CostConfig) => void;
}

export function Module7Negocio({
  trainRows,
  testRows,
  trainConfig,
  alertThreshold,
  costs,
  onChangeCosts,
}: Module7NegocioProps) {
  const simpleTree = useMemo(
    () =>
      trainDecisionTree(trainRows, {
        ...trainConfig,
        maxDepth: 2,
      }),
    [trainRows, trainConfig],
  );

  const deepTree = useMemo(
    () =>
      trainDecisionTree(trainRows, {
        ...trainConfig,
        maxDepth: 5,
      }),
    [trainRows, trainConfig],
  );

  const simpleMetrics = useMemo(
    () => evaluateMetrics(testRows, simpleTree.root, alertThreshold),
    [testRows, simpleTree.root, alertThreshold],
  );
  const deepMetrics = useMemo(
    () => evaluateMetrics(testRows, deepTree.root, alertThreshold),
    [testRows, deepTree.root, alertThreshold],
  );

  const simpleCost = useMemo(
    () => computeErrorCosts(simpleMetrics, costs),
    [simpleMetrics, costs],
  );
  const deepCost = useMemo(
    () => computeErrorCosts(deepMetrics, costs),
    [deepMetrics, costs],
  );

  const comparisonSummary = useMemo(() => {
    if (simpleCost.totalCost < deepCost.totalCost) {
      return `Bajo estos costos hipotéticos y este umbral (${formatPct(
        alertThreshold,
      )}), el árbol simple (prof. 2) presenta menor costo total en prueba por ${formatCOP(
        deepCost.totalCost - simpleCost.totalCost,
      )}.`;
    }
    if (deepCost.totalCost < simpleCost.totalCost) {
      return `Bajo estos costos hipotéticos y este umbral (${formatPct(
        alertThreshold,
      )}), el árbol profundo (prof. 5) presenta menor costo total en prueba por ${formatCOP(
        simpleCost.totalCost - deepCost.totalCost,
      )}.`;
    }
    return `Empate exacto en costo total hipotético (${formatCOP(
      simpleCost.totalCost,
    )}) entre profundidad 2 y profundidad 5 bajo el umbral actual.`;
  }, [simpleCost.totalCost, deepCost.totalCost, alertThreshold]);

  const costChartData = useMemo(
    () => [
      {
        type: 'bar',
        name: 'Costo por Falsos Positivos (FP × cFP)',
        x: ['Árbol simple (Prof. 2)', 'Árbol profundo (Prof. 5)'],
        y: [simpleCost.fpCostTotal / 1_000_000, deepCost.fpCostTotal / 1_000_000],
        marker: { color: '#F59E0B' },
      },
      {
        type: 'bar',
        name: 'Costo por Falsos Negativos (FN × cFN)',
        x: ['Árbol simple (Prof. 2)', 'Árbol profundo (Prof. 5)'],
        y: [simpleCost.fnCostTotal / 1_000_000, deepCost.fnCostTotal / 1_000_000],
        marker: { color: '#FB7185' },
      },
    ],
    [simpleCost, deepCost],
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 07 · Trade-off económico ilustrativo y gobernanza de modelos
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          Negocio y riesgo: traducir errores en costos hipotéticos
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Comparamos un árbol simple (profundidad 2) y uno profundo (profundidad 5) manteniendo el
          mismo criterio ({trainConfig.criterion}), el mismo minSamplesLeaf (
          {trainConfig.minSamplesLeaf}), el mismo conjunto de prueba (n={testRows.length}) y el
          mismo umbral ({formatPct(alertThreshold)}).
        </p>
      </header>

      {/* Editor de costos hipotéticos */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BriefcaseBusiness className="w-5 h-5 text-[#25E5F2]" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[#F0F7FF]">
              Costos hipotéticos editables por error de clasificación (COP)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onChangeCosts(DEFAULT_COST_CONFIG)}
            className="text-xs font-medium text-[#25E5F2] hover:underline whitespace-nowrap shrink-0"
          >
            Restaurar valores base ($300.000 / $8.000.000)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block space-y-1.5 text-xs">
            <span className="font-semibold text-[#F0F7FF] block">
              Costo hipotético Falso Positivo (cFP) · Oportunidad / fricción si se alerta a un cumplidor
            </span>
            <input
              type="number"
              min={0}
              step={50000}
              value={costs.costoFP}
              onChange={(e) =>
                onChangeCosts({
                  ...costs,
                  costoFP: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#25E5F2]/25 bg-[#080F22] font-mono-num text-sm text-[#F0F7FF]"
            />
          </label>
          <label className="block space-y-1.5 text-xs">
            <span className="font-semibold text-[#F0F7FF] block">
              Costo hipotético Falso Negativo (cFN) · Pérdida neta ilustrativa si no se alerta a un incumplidor
            </span>
            <input
              type="number"
              min={0}
              step={250000}
              value={costs.costoFN}
              onChange={(e) =>
                onChangeCosts({
                  ...costs,
                  costoFN: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 rounded-lg border border-[#25E5F2]/25 bg-[#080F22] font-mono-num text-sm text-[#F0F7FF]"
            />
          </label>
        </div>

        <p className="text-xs text-[#94A3B8] leading-relaxed">
          Aclaración técnica: <span className="font-mono-num text-[#25E5F2]">Costo total = FP×cFP + FN×cFN</span>.
          Estos costos son una simplificación educativa de errores de alerta: no representan ingresos
          comerciales totales ni cálculo regulatorio de pérdida esperada (PD × LGD × EAD). Una
          alerta no obliga a negar automáticamente una solicitud.
        </p>
      </section>

      {/* Comparación Simple vs Profundo */}
      <section className="lab-panel-alt rounded-xl p-5 text-sm font-medium text-[#25E5F2]">
        {comparisonSummary}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-6 space-y-4">
          {[
            {
              title: 'Árbol simple (Profundidad máxima = 2)',
              leaves: simpleTree.leafCount,
              m: simpleMetrics,
              c: simpleCost,
            },
            {
              title: 'Árbol profundo (Profundidad máxima = 5)',
              leaves: deepTree.leafCount,
              m: deepMetrics,
              c: deepCost,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="lab-panel rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold text-[#F0F7FF]">{item.title}</h3>
                <span className="font-mono-num text-xs text-[#94A3B8]">
                  {item.leaves} hojas
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs border-y border-[#25E5F2]/15 py-2.5">
                <div>
                  <p className="text-[#8FA3C7]">TP</p>
                  <p className="font-mono-num font-bold text-[#F0F7FF]">{item.m.tp}</p>
                </div>
                <div>
                  <p className="text-[#8FA3C7]">FN</p>
                  <p className="font-mono-num font-bold text-[#FB7185]">{item.m.fn}</p>
                </div>
                <div>
                  <p className="text-[#8FA3C7]">FP</p>
                  <p className="font-mono-num font-bold text-[#FBBF24]">{item.m.fp}</p>
                </div>
                <div>
                  <p className="text-[#8FA3C7]">TN</p>
                  <p className="font-mono-num font-bold text-[#25E5F2]">{item.m.tn}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[#8FA3C7]">Recall / F1 en prueba</p>
                  <p className="font-mono-num font-semibold text-[#F0F7FF]">
                    {item.m.recall === null ? 'No def.' : formatPct(item.m.recall)} /{' '}
                    {item.m.f1 === null ? 'No def.' : formatPct(item.m.f1)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#8FA3C7]">Costo total hipotético</p>
                  <p className="font-mono-num text-sm font-bold text-[#25E5F2]">
                    {formatCOP(item.c.totalCost)}
                  </p>
                </div>
              </div>
              <p className="font-mono-num text-[11px] text-[#94A3B8]">
                Detalle: {item.c.fpCount} FP ({formatCOP(item.c.fpCostTotal)}) + {item.c.fnCount}{' '}
                FN ({formatCOP(item.c.fnCostTotal)})
              </p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-6 lab-panel rounded-xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-[#F0F7FF]">
            Desglose visual de costos en Prueba (Millones COP)
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Ninguna profundidad gana siempre por defecto: depende de los errores reales en prueba,
            el umbral elegido y la relación entre cFP y cFN.
          </p>
          <PlotlyChart
            data={costChartData}
            layout={{
              barmode: 'stack',
              yaxis: { title: { text: 'Costo total (Millones COP)' } },
              legend: { orientation: 'h', y: 1.15 },
            }}
            ariaLabel="Comparación de costos hipotéticos por Falsos Positivos y Falsos Negativos entre árbol simple y profundo"
          />
        </div>
      </section>

      {/* Reglas manuales vs Árbol aprendido */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#F0F7FF]">
          Árbol de reglas manuales vs Árbol aprendido (CART) en un banco
        </h3>
        <div className="overflow-x-auto border border-[#25E5F2]/15 rounded-lg bg-[#080F22]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
                <th className="py-2.5 px-3 font-semibold">Aspecto</th>
                <th className="py-2.5 px-3 font-semibold">Árbol de reglas manuales</th>
                <th className="py-2.5 px-3 font-semibold">Árbol de decisión aprendido (CART)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25E5F2]/10 text-[#CBD5E1]">
              <tr>
                <td className="py-3 px-3 font-semibold text-[#F0F7FF]">Quién define los cortes</td>
                <td className="py-3 px-3">
                  Comité de crédito o analista según apetito comercial (ej. &quot;si carga &gt; 40%
                  revisar capacidad&quot; o &quot;si ingreso &gt;= $8M proponer Platinum&quot;).
                </td>
                <td className="py-3 px-3">
                  El algoritmo CART evalúa los datos de entrenamiento y elige automáticamente el corte
                  con mayor ganancia de Gini o entropía.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[#F0F7FF]">Objetivo principal</td>
                <td className="py-3 px-3">
                  Implementar políticas de elegibilidad, producto, topes de cupo y escalamientos.
                </td>
                <td className="py-3 px-3">
                  Estimar la frecuencia empírica de incumplimiento en subgrupos comparables.
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-semibold text-[#F0F7FF]">Cómo se complementan</td>
                <td className="py-3 px-3" colSpan={2}>
                  El árbol aprendido entrega la señal de riesgo <code className="font-mono-num text-[#25E5F2]">p_hoja</code>;
                  el umbral la convierte en alerta; y las reglas manuales integran esa alerta con
                  capacidad de pago e historial antes de proponer producto o solicitar revisión
                  humana.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Gobernanza y uso responsable */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#25E5F2]" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-[#F0F7FF]">
            Gobernanza, alcance y revisión humana
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#CBD5E1] leading-relaxed">
          <div className="space-y-1">
            <p className="font-semibold text-[#25E5F2]">Alcance y revisión humana</p>
            <p>
              Un modelo estadístico es apoyo a la decisión, no autoridad autónoma definitiva. Las
              alertas y casos limítrofes requieren análisis humano y verificación documental.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#C4B5FD]">Calidad de datos, sesgos y explicabilidad</p>
            <p>
              Hay que auditar valores atípicos, excluir atributos sensibles para evitar discriminación
              indirecta y poder explicar qué condiciones de ruta llevaron a una estimación.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#FBBF24]">Monitoreo y deriva (drift)</p>
            <p>
              Si cambia el entorno macroeconómico o el perfil de los solicitantes, la distribución
              de variables y la tasa real de incumplimiento cambian; el árbol debe monitorearse y
              recalibrarse periódicamente.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
