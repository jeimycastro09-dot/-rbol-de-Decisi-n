import { useMemo, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { PlotlyChart } from '../components/PlotlyChart';
import { evaluateMetrics, trainDecisionTree } from '../algorithms/cart';
import {
  ConfusionMetrics,
  SyntheticProfile,
  TrainConfig,
  TrainedTreeResult,
} from '../types/credit';
import { FEATURE_META, FEATURE_ORDER, formatPct } from '../utils/format';

interface Module6EvaluaProps {
  trainRows: SyntheticProfile[];
  testRows: SyntheticProfile[];
  trainConfig: TrainConfig;
  trainedTree: TrainedTreeResult;
  alertThreshold: number;
}

type SweepMetricKey = 'f1' | 'accuracy' | 'recall' | 'precision';

function renderMetricCell(
  value: number | null,
  reason?: string,
): { text: string; title?: string } {
  if (value === null) {
    return {
      text: 'No definido',
      title: reason ?? 'Denominador igual a cero',
    };
  }
  return { text: formatPct(value) };
}

export function Module6Evalua({
  trainRows,
  testRows,
  trainConfig,
  trainedTree,
  alertThreshold,
}: Module6EvaluaProps) {
  const [sweepMetric, setSweepMetric] = useState<SweepMetricKey>('f1');

  const trainMetrics = useMemo(
    () => evaluateMetrics(trainRows, trainedTree.root, alertThreshold),
    [trainRows, trainedTree.root, alertThreshold],
  );

  const testMetrics = useMemo(
    () => evaluateMetrics(testRows, trainedTree.root, alertThreshold),
    [testRows, trainedTree.root, alertThreshold],
  );

  const depthSweep = useMemo(() => {
    const depths = [1, 2, 3, 4, 5];
    return depths.map((d) => {
      const tree = trainDecisionTree(trainRows, {
        ...trainConfig,
        maxDepth: d,
      });
      const mTrain = evaluateMetrics(trainRows, tree.root, alertThreshold);
      const mTest = evaluateMetrics(testRows, tree.root, alertThreshold);
      return {
        depth: d,
        leafCount: tree.leafCount,
        train: mTrain,
        test: mTest,
      };
    });
  }, [trainRows, testRows, trainConfig, alertThreshold]);

  const depthChartData = useMemo(() => {
    const labelMap: Record<SweepMetricKey, string> = {
      f1: 'F1-Score',
      accuracy: 'Exactitud (Accuracy)',
      recall: 'Sensibilidad (Recall)',
      precision: 'Precisión',
    };
    const x = depthSweep.map((item) => item.depth);
    const leafCounts = depthSweep.map((item) => item.leafCount);
    const yTrain = depthSweep.map((item) => {
      const val = item.train[sweepMetric];
      return val === null ? null : +(val * 100).toFixed(2);
    });
    const yTest = depthSweep.map((item) => {
      const val = item.test[sweepMetric];
      return val === null ? null : +(val * 100).toFixed(2);
    });

    return {
      label: labelMap[sweepMetric],
      traces: [
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: `Entrenamiento (${labelMap[sweepMetric]})`,
          x,
          y: yTrain,
          customdata: leafCounts,
          hovertemplate: 'Profundidad %{x} (%{customdata} hojas)<br>%{y:.2f}%<extra>%{fullData.name}</extra>',
          line: { color: '#9C6BFF', width: 2.5 },
          marker: { size: 8, color: '#9C6BFF' },
        },
        {
          type: 'scatter',
          mode: 'lines+markers',
          name: `Prueba reservada (${labelMap[sweepMetric]})`,
          x,
          y: yTest,
          customdata: leafCounts,
          hovertemplate: 'Profundidad %{x} (%{customdata} hojas)<br>%{y:.2f}%<extra>%{fullData.name}</extra>',
          line: { color: '#25E5F2', width: 2.5 },
          marker: { size: 8, color: '#25E5F2' },
        },
      ],
    };
  }, [depthSweep, sweepMetric]);

  const importanceChartData = useMemo(() => {
    const items = FEATURE_ORDER.map((k) => ({
      key: k,
      label: FEATURE_META[k].shortLabel,
      value: +(trainedTree.featureImportances[k] * 100).toFixed(2),
    })).sort((a, b) => a.value - b.value);

    return [
      {
        type: 'bar',
        orientation: 'h',
        x: items.map((i) => i.value),
        y: items.map((i) => i.label),
        marker: {
          color: ['#9C6BFF', '#6366F1', '#0EA5E9', '#14B8A6', '#25E5F2'],
        },
        text: items.map((i) => `${i.value.toFixed(1)}%`),
        textfont: { color: '#F0F7FF', family: 'IBM Plex Mono, monospace' },
        textposition: 'outside',
      },
    ];
  }, [trainedTree.featureImportances]);

  const metricRows: {
    key: keyof Pick<ConfusionMetrics, 'accuracy' | 'precision' | 'recall' | 'f1' | 'fnr'>;
    reasonKey: keyof Pick<
      ConfusionMetrics,
      'accuracyReason' | 'precisionReason' | 'recallReason' | 'f1Reason' | 'fnrReason'
    >;
    label: string;
    formula: string;
  }[] = [
    {
      key: 'accuracy',
      reasonKey: 'accuracyReason',
      label: 'Exactitud (Accuracy)',
      formula: '(TP + TN) / Total',
    },
    {
      key: 'precision',
      reasonKey: 'precisionReason',
      label: 'Precisión (Precision)',
      formula: 'TP / (TP + FP)',
    },
    {
      key: 'recall',
      reasonKey: 'recallReason',
      label: 'Sensibilidad / Cobertura (Recall)',
      formula: 'TP / (TP + FN)',
    },
    {
      key: 'f1',
      reasonKey: 'f1Reason',
      label: 'Puntaje F1',
      formula: '2·TP / (2·TP + FP + FN)',
    },
    {
      key: 'fnr',
      reasonKey: 'fnrReason',
      label: 'Tasa de Falsos Negativos (FNR)',
      formula: 'FN / (TP + FN)',
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 06 · Evaluación fuera de muestra, generalización y sobreajuste
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          Evalúa en prueba reservada y evita el sobreajuste
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Evaluamos el árbol actual (entrenado solo con {trainRows.length} registros) sobre los{' '}
          {testRows.length} registros reservados de prueba usando el umbral actual{' '}
          <span className="font-mono-num font-semibold text-[#25E5F2]">
            {formatPct(alertThreshold)}
          </span>{' '}
          (positivo = incumplimiento).
        </p>
      </header>

      {/* Advertencia de contaminación de prueba */}
      <section className="lab-panel-alt rounded-xl p-5 flex items-start gap-3 text-xs text-[#CBD5E1]">
        <AlertTriangle className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-[#F0F7FF]">
            Cuidado metodológico: no uses el conjunto de prueba para afinar parámetros
          </p>
          <p className="leading-relaxed">
            Examinar repetidamente el conjunto de prueba para elegir profundidad, mínimo por hoja o
            umbral contamina su papel como evaluación independiente. En práctica bancaria real se
            utiliza un conjunto de validación separado (o validación cruzada k-fold) para ajustar
            hiperparámetros, reservando la prueba final para una única medición al cierre.
          </p>
        </div>
      </section>

      {/* Matriz de confusión en prueba + tabla de métricas Entrenamiento vs Prueba */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 lab-panel rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#F0F7FF]">
              Matriz de confusión en Prueba (n={testMetrics.total})
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Filas: Real (+/-) · Columnas: Predicho (+/-) con umbral {formatPct(alertThreshold)}.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th className="p-2 border border-[#25E5F2]/20 bg-[#121F3A] text-[#94A3B8]">
                    Real \ Predicho
                  </th>
                  <th className="p-2 border border-[#25E5F2]/20 bg-[#121F3A] text-[#F0F7FF]">
                    Predicho + (Alerta)
                  </th>
                  <th className="p-2 border border-[#25E5F2]/20 bg-[#121F3A] text-[#F0F7FF]">
                    Predicho - (Sin alerta)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th className="p-3 border border-[#25E5F2]/20 bg-[#121F3A] text-left text-[#F0F7FF]">
                    Real + (Incumple)
                  </th>
                  <td className="p-3 border border-[#25E5F2]/25 bg-[#0C2535]">
                    <p className="text-[11px] font-semibold text-[#25E5F2]">TP (Acierto alerta)</p>
                    <p className="font-mono-num text-xl font-bold text-[#F0F7FF]">
                      {testMetrics.tp}
                    </p>
                  </td>
                  <td className="p-3 border border-[#FB7185]/35 bg-[#2A1019]">
                    <p className="text-[11px] font-semibold text-[#FDA4AF]">FN (Riesgo omitido)</p>
                    <p className="font-mono-num text-xl font-bold text-[#FB7185]">
                      {testMetrics.fn}
                    </p>
                  </td>
                </tr>
                <tr>
                  <th className="p-3 border border-[#25E5F2]/20 bg-[#121F3A] text-left text-[#F0F7FF]">
                    Real - (Cumple)
                  </th>
                  <td className="p-3 border border-[#F59E0B]/35 bg-[#291B12]">
                    <p className="text-[11px] font-semibold text-[#FDE68A]">FP (Falsa alarma)</p>
                    <p className="font-mono-num text-xl font-bold text-[#FBBF24]">
                      {testMetrics.fp}
                    </p>
                  </td>
                  <td className="p-3 border border-[#14B8A6]/35 bg-[#0B2A2B]">
                    <p className="text-[11px] font-semibold text-[#5EEAD4]">TN (Acierto cumple)</p>
                    <p className="font-mono-num text-xl font-bold text-[#F0F7FF]">
                      {testMetrics.tn}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Matriz equivalente <span className="font-mono-num">[[TP, FN], [FP, TN]]</span> ={' '}
            <span className="font-mono-num font-semibold text-[#25E5F2]">
              [[{testMetrics.tp}, {testMetrics.fn}], [{testMetrics.fp}, {testMetrics.tn}]]
            </span>
            .
          </p>
        </div>

        <div className="xl:col-span-7 lab-panel rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#F0F7FF]">
              Comparación de métricas: Entrenamiento vs Prueba
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Si un denominador es cero, se muestra &quot;No definido&quot; con su motivo exacto.
            </p>
          </div>

          <div className="overflow-x-auto border border-[#25E5F2]/15 rounded-lg bg-[#080F22]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
                  <th className="py-2.5 px-3 font-semibold">Métrica</th>
                  <th className="py-2.5 px-3 font-semibold">Fórmula</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Entrenamiento</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Prueba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25E5F2]/10">
                {metricRows.map((row) => {
                  const tr = renderMetricCell(trainMetrics[row.key], trainMetrics[row.reasonKey]);
                  const te = renderMetricCell(testMetrics[row.key], testMetrics[row.reasonKey]);
                  const reasonText =
                    testMetrics[row.reasonKey] ?? trainMetrics[row.reasonKey];
                  return (
                    <tr key={row.key}>
                      <td className="py-2.5 px-3 font-medium text-[#F0F7FF]">
                        {row.label}
                        {reasonText && (
                          <span className="block text-[11px] font-normal text-[#FBBF24]">
                            {reasonText}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono-num text-[#94A3B8]">{row.formula}</td>
                      <td
                        className="py-2.5 px-3 font-mono-num text-right font-semibold text-[#C4B5FD]"
                        title={tr.title}
                      >
                        {tr.text}
                      </td>
                      <td
                        className="py-2.5 px-3 font-mono-num text-right font-semibold text-[#25E5F2]"
                        title={te.title}
                      >
                        {te.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Gráfico de profundidad 1..5 real + importancia */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 lab-panel rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[#F0F7FF]">
                Curva real por profundidad (1 a 5) · Entrenamiento vs Prueba
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Calculado entrenando realmente 5 árboles con criterio{' '}
                {trainConfig.criterion} y minSamplesLeaf={trainConfig.minSamplesLeaf}.
              </p>
            </div>
            <select
              aria-label="Métrica para gráfico de profundidad"
              value={sweepMetric}
              onChange={(e) => setSweepMetric(e.target.value as SweepMetricKey)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF]"
            >
              <option value="f1">Puntaje F1 (%)</option>
              <option value="accuracy">Exactitud (%)</option>
              <option value="recall">Recall (%)</option>
              <option value="precision">Precisión (%)</option>
            </select>
          </div>

          <PlotlyChart
            data={depthChartData.traces}
            layout={{
              xaxis: {
                title: { text: 'Profundidad máxima' },
                type: 'linear',
                tickmode: 'array',
                tickvals: [1, 2, 3, 4, 5],
                ticktext: ['1', '2', '3', '4', '5'],
                range: [0.75, 5.25],
              },
              yaxis: { title: { text: `${depthChartData.label} (%)` }, range: [0, 105] },
              legend: { orientation: 'h', y: 1.15 },
            }}
            ariaLabel={`Comparación real de ${depthChartData.label} en entrenamiento y prueba para profundidades 1 a 5`}
          />

          <p className="text-xs text-[#CBD5E1] leading-relaxed">
            Aumentar la profundidad no garantiza mejor generalización en datos nuevos. Observa los
            valores calculados reales: si la curva de entrenamiento sube mientras la de prueba cae o
            se estanca, hay señal de sobreajuste; si ambas se mantienen próximas, no inventamos una
            brecha artificial.
          </p>
        </div>

        {/* Importancia de variables */}
        <div className="lg:col-span-5 lab-panel rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#F0F7FF]">
              Importancia por reducción ponderada de impureza
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Normalizada para sumar 100% entre variables usadas (variables no usadas = 0%).
            </p>
          </div>

          <PlotlyChart
            data={importanceChartData}
            layout={{
              margin: { t: 16, r: 50, b: 40, l: 130 },
              xaxis: { title: { text: 'Contribución relativa (%)' }, range: [0, 110] },
            }}
            className="w-full h-64"
            ariaLabel="Gráfico horizontal de importancia de variables normalizada"
          />

          <div className="rounded-lg border border-[#25E5F2]/20 bg-[#080F22] p-3.5 text-xs text-[#CBD5E1] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#25E5F2]">
              <Info className="w-4 h-4" aria-hidden="true" />
              <span>Interpretación rigurosa (sin confundir con SHAP)</span>
            </div>
            <p className="leading-relaxed">
              Esta importancia mide cuánto redujo la impureza cada variable dentro del conjunto de
              entrenamiento. Refleja asociación en los cortes elegidos, tiende a favorecer variables
              continuas con muchos puntos de corte posibles, <strong className="text-[#F0F7FF]">no demuestra causalidad</strong>{' '}
              y <strong className="text-[#F0F7FF]">no equivale a valores SHAP</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* Pre-poda vs Poda posterior */}
      <section className="lab-panel rounded-xl p-6 space-y-3 text-sm text-[#CBD5E1]">
        <h3 className="text-base font-semibold text-[#F0F7FF]">
          Control de complejidad: pre-poda implementada vs poda posterior conceptual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs leading-relaxed">
          <div className="space-y-1">
            <p className="font-semibold text-[#25E5F2]">
              Pre-poda (implementada en BancoLab)
            </p>
            <p>
              Detiene el crecimiento del árbol antes de que aparezcan hojas demasiado específicas,
              mediante <code className="font-mono-num text-[#F0F7FF]">profundidad máxima</code>,{' '}
              <code className="font-mono-num text-[#F0F7FF]">mínimo de muestras por hoja</code> y{' '}
              <code className="font-mono-num text-[#F0F7FF]">ganancia mínima</code>.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-[#C4B5FD]">
              Poda posterior o post-pruning (solo conceptual, NO implementada)
            </p>
            <p>
              Consiste en dejar crecer un árbol profundo primero y luego recortar ramas de abajo
              hacia arriba (por ejemplo con complejidad de costo α) usando un conjunto de
              validación. BancoLab explica el concepto pero no ejecuta poda posterior.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
