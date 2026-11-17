import { useMemo, useState } from 'react';
import { Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { PlotlyChart } from '../components/PlotlyChart';
import {
  DEFAULT_SEED,
  profilesToCsv,
  summarizeDataset,
} from '../data/syntheticGenerator';
import { FeatureKey, SyntheticProfile } from '../types/credit';
import {
  FEATURE_META,
  FEATURE_ORDER,
  formatCOP,
  formatInt,
  formatPct,
} from '../utils/format';

interface Module2DatosProps {
  dataset: SyntheticProfile[];
  seed: number;
  onChangeSeed: (newSeed: number) => void;
}

const PRESET_SEEDS = [202611, 104729, 88421];

export function Module2Datos({
  dataset,
  seed,
  onChangeSeed,
}: Module2DatosProps) {
  const [splitFilter, setSplitFilter] = useState<'all' | 'train' | 'test'>('all');
  const [labelFilter, setLabelFilter] = useState<'all' | '1' | '0'>('all');
  const [searchId, setSearchId] = useState('');
  const [chartFeature, setChartFeature] = useState<FeatureKey>('cargaFinancieraPct');

  const summary = useMemo(() => summarizeDataset(dataset), [dataset]);

  const filteredRows = useMemo(() => {
    const q = searchId.trim().toLowerCase();
    return dataset.filter((row) => {
      if (splitFilter !== 'all' && row.split !== splitFilter) return false;
      if (labelFilter === '1' && row.incumplimiento12m !== 1) return false;
      if (labelFilter === '0' && row.incumplimiento12m !== 0) return false;
      if (q && !row.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dataset, splitFilter, labelFilter, searchId]);

  const handleDownloadCsv = () => {
    const csv = profilesToCsv(dataset);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bancolab_perfiles_sinteticos_seed_${seed}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const prevalenceChartData = useMemo(() => {
    const trainNeg = summary.trainCount - summary.trainPos;
    const testNeg = summary.testCount - summary.testPos;
    return [
      {
        type: 'bar',
        name: 'Cumple (0)',
        x: ['Entrenamiento (~70%)', 'Prueba (~30%)'],
        y: [trainNeg, testNeg],
        marker: { color: '#25E5F2' },
        textfont: { color: '#050A18', family: 'IBM Plex Mono, monospace' },
        text: [
          `${trainNeg} (${formatPct(1 - summary.trainPrevalence)})`,
          `${testNeg} (${formatPct(1 - summary.testPrevalence)})`,
        ],
        textposition: 'inside',
      },
      {
        type: 'bar',
        name: 'Incumple a 12m (1)',
        x: ['Entrenamiento (~70%)', 'Prueba (~30%)'],
        y: [summary.trainPos, summary.testPos],
        marker: { color: '#F59E0B' },
        textfont: { color: '#050A18', family: 'IBM Plex Mono, monospace' },
        text: [
          `${summary.trainPos} (${formatPct(summary.trainPrevalence)})`,
          `${summary.testPos} (${formatPct(summary.testPrevalence)})`,
        ],
        textposition: 'inside',
      },
    ];
  }, [summary]);

  const featureDistData = useMemo(() => {
    const cumpleVals = dataset
      .filter((d) => d.incumplimiento12m === 0)
      .map((d) =>
        chartFeature === 'ingresoMensualCOP'
          ? d[chartFeature] / 1_000_000
          : d[chartFeature],
      );
    const incumpleVals = dataset
      .filter((d) => d.incumplimiento12m === 1)
      .map((d) =>
        chartFeature === 'ingresoMensualCOP'
          ? d[chartFeature] / 1_000_000
          : d[chartFeature],
      );
    return [
      {
        type: 'histogram',
        name: 'Cumple (0)',
        x: cumpleVals,
        opacity: 0.72,
        marker: { color: '#25E5F2' },
      },
      {
        type: 'histogram',
        name: 'Incumple (1)',
        x: incumpleVals,
        opacity: 0.75,
        marker: { color: '#9C6BFF' },
      },
    ];
  }, [dataset, chartFeature]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <p className="text-xs font-medium text-[#25E5F2]">
            Módulo 02 · Datos sintéticos previos a la solicitud y partición estratificada
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
            Datos bancarios sintéticos y prevención de fugas del futuro
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Generamos 240 perfiles ficticios reproducibles con un PRNG determinista (semilla{' '}
            <span className="font-mono-num font-semibold text-[#25E5F2]">{seed}</span>). Todas las
            variables existen antes de evaluar la solicitud; no hay datos personales reales,
            atributos sensibles ni valores faltantes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {PRESET_SEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSeed(s)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                seed === s
                  ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border-[#25E5F2]'
                  : 'bg-[#101A32] text-[#CBD5E1] border-[#25E5F2]/20 hover:border-[#25E5F2]/60'
              }`}
            >
              Semilla {s === DEFAULT_SEED ? `${s} (Base)` : s}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] hover:brightness-110 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Exportar CSV sintético</span>
          </button>
        </div>
      </header>

      {/* Tarjetas KPI de partición estratificada */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lab-panel rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#94A3B8]">Total perfiles sintéticos</p>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded border border-[#25E5F2]/30 bg-[#25E5F2]/10 text-[#25E5F2]">
              100% válido
            </span>
          </div>
          <p className="font-mono-num text-3xl font-bold text-[#F0F7FF] mt-2">
            {formatInt(summary.total)}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Prevalencia global: {formatPct(summary.overallPrevalence)} ({summary.overallPos} inc.)
          </p>
        </div>

        <div className="lab-panel rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#94A3B8]">Entrenamiento (~70%)</p>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded border border-[#25E5F2]/30 bg-[#25E5F2]/10 text-[#25E5F2]">
              TRAIN
            </span>
          </div>
          <p className="font-mono-num text-3xl font-bold text-[#25E5F2] mt-2">
            {formatInt(summary.trainCount)}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Incumplimiento: {summary.trainPos} ({formatPct(summary.trainPrevalence)})
          </p>
        </div>

        <div className="lab-panel rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#94A3B8]">Prueba reservada (~30%)</p>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded border border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#FBBF24]">
              TEST
            </span>
          </div>
          <p className="font-mono-num text-3xl font-bold text-[#FBBF24] mt-2">
            {formatInt(summary.testCount)}
          </p>
          <p className="text-xs text-[#94A3B8] mt-1">
            Incumplimiento: {summary.testPos} ({formatPct(summary.testPrevalence)})
          </p>
        </div>

        <div className="lab-panel-alt rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#C4B5FD]">
            <ShieldCheck className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
            <span>Partición estratificada fija</span>
          </div>
          <p className="text-xs text-[#CBD5E1] leading-relaxed mt-2">
            Se redondea el 70% dentro de cada clase (~70/30 aproximado), manteniendo prevalencia
            comparable y misma partición al comparar modelos.
          </p>
        </div>
      </section>

      {/* Fórmula generadora didáctica */}
      <section className="lab-panel rounded-xl p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold text-[#F0F7FF]">
            Cómo se simula la etiqueta observada (sin fuga ni determinismo perfecto)
          </h3>
          <button
            type="button"
            onClick={() => onChangeSeed(DEFAULT_SEED)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#25E5F2] hover:underline whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restaurar semilla base ({DEFAULT_SEED})</span>
          </button>
        </div>
        <p className="text-sm text-[#CBD5E1] leading-relaxed">
          La variable objetivo es <code className="font-mono-num text-[#25E5F2]">incumplimiento_12m</code>{' '}
          (resultado sintético observado, distinto a las predicciones del árbol y distinto a
          &quot;aprobado históricamente&quot;). Su generación combina variables previas mediante un
          supuesto didáctico logístico más un sorteo aleatorio Bernoulli, de modo que dos
          solicitantes similares puedan tener desenlaces distintos:
        </p>
        <div className="rounded-lg border border-[#25E5F2]/25 bg-[#080F22] p-4 font-mono-num text-xs text-[#25E5F2] overflow-x-auto">
          z = -1,95 + 0,048·(carga - 34) + 0,036·mora + 0,023·(utilización - 45) - 0,013·(historial - 48) - 0,13·(ingreso_M - 5,2) + 0,62·I(mora &gt;= 30) + 0,55·I(carga &gt; 45 &amp; util &gt; 70)
          <br />
          p_sim = 1 / (1 + exp(-z)) &nbsp;·&nbsp; incumplimiento_12m ~ Bernoulli(p_sim)
        </div>
        <p className="text-xs text-[#94A3B8]">
          Aviso metodológico: esta fórmula es un supuesto didáctico para generar datos de práctica,
          NO un modelo crediticio validado. Los registros no incluyen atributos sensibles (sexo,
          etnia, salud) ni información posterior a la solicitud.
        </p>
      </section>

      {/* Gráficos Plotly */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lab-panel rounded-xl p-5 space-y-2">
          <h3 className="text-base font-semibold text-[#F0F7FF]">
            Balance estratificado: entrenamiento vs prueba
          </h3>
          <p className="text-xs text-[#94A3B8]">
            Comprueba que ambas particiones conservan proporciones similares de cumplimiento e
            incumplimiento.
          </p>
          <PlotlyChart
            data={prevalenceChartData}
            layout={{
              barmode: 'stack',
              yaxis: { title: { text: 'Número de perfiles' } },
              legend: { orientation: 'h', y: 1.15 },
            }}
            ariaLabel="Gráfico de barras apiladas mostrando el conteo estratificado entre entrenamiento y prueba"
          />
        </div>

        <div className="lab-panel rounded-xl p-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#F0F7FF]">
                Distribución por variable y etiqueta real
              </h3>
              <p className="text-xs text-[#94A3B8]">
                Solapamiento entre clases: muestra por qué ninguna variable sola basta.
              </p>
            </div>
            <select
              aria-label="Seleccionar variable para histograma"
              value={chartFeature}
              onChange={(e) => setChartFeature(e.target.value as FeatureKey)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/30 bg-[#0B1328] text-[#F0F7FF]"
            >
              {FEATURE_ORDER.map((k) => (
                <option key={k} value={k}>
                  {FEATURE_META[k].shortLabel}
                </option>
              ))}
            </select>
          </div>
          <PlotlyChart
            data={featureDistData}
            layout={{
              barmode: 'overlay',
              xaxis: {
                title: {
                  text:
                    chartFeature === 'ingresoMensualCOP'
                      ? 'Ingreso mensual (Millones COP)'
                      : FEATURE_META[chartFeature].label,
                },
              },
              yaxis: { title: { text: 'Frecuencia' } },
              legend: { orientation: 'h', y: 1.15 },
            }}
            ariaLabel={`Histograma de ${FEATURE_META[chartFeature].label} separado por cumplimiento e incumplimiento`}
          />
        </div>
      </section>

      {/* Diccionario de variables */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#F0F7FF]">
          Diccionario de variables (disponibles antes de la solicitud)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#25E5F2]/20 text-xs text-[#94A3B8]">
                <th className="py-2.5 pr-4 font-semibold">Variable</th>
                <th className="py-2.5 pr-4 font-semibold">Rango válido</th>
                <th className="py-2.5 pr-4 font-semibold">Disponibilidad</th>
                <th className="py-2.5 font-semibold">Sentido analítico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25E5F2]/12">
              {FEATURE_ORDER.map((key) => {
                const m = FEATURE_META[key];
                const rangeStr =
                  key === 'ingresoMensualCOP'
                    ? `${formatCOP(m.min)} – ${formatCOP(m.max)}`
                    : `${formatInt(m.min)} – ${formatInt(m.max)} ${m.unit}`;
                return (
                  <tr key={key}>
                    <td className="py-3 pr-4 font-medium text-[#F0F7FF]">{m.label}</td>
                    <td className="py-3 pr-4 font-mono-num text-xs text-[#CBD5E1] whitespace-nowrap">
                      {rangeStr}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#25E5F2] font-medium">
                      Previa a la solicitud
                    </td>
                    <td className="py-3 text-xs text-[#CBD5E1]">
                      {m.description} {m.rationale}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-3 pr-4 font-medium text-[#F0F7FF]">
                  incumplimiento_12m (Etiqueta objetivo)
                </td>
                <td className="py-3 pr-4 font-mono-num text-xs text-[#CBD5E1]">0 o 1</td>
                <td className="py-3 pr-4 text-xs text-[#FBBF24] font-medium">
                  Resultado observado 12m
                </td>
                <td className="py-3 text-xs text-[#CBD5E1]">
                  1 = incumplimiento sintético observado (clase positiva); 0 = cumplimiento. No es
                  una predicción ni una decisión de aprobación.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Tabla filtrable de registros */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#F0F7FF]">
              Explorador de perfiles sintéticos
            </h3>
            <p className="text-xs text-[#94A3B8]">
              Mostrando {filteredRows.length} de {dataset.length} registros. Etiqueta real separada
              de cualquier predicción del modelo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-[#8FA3C7] absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Buscar ID (ej. SYN-014)"
                aria-label="Buscar perfil por ID"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF] placeholder:text-[#64748B]"
              />
            </div>
            <select
              aria-label="Filtrar por partición"
              value={splitFilter}
              onChange={(e) => setSplitFilter(e.target.value as 'all' | 'train' | 'test')}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF]"
            >
              <option value="all">Todas las particiones</option>
              <option value="train">Entrenamiento</option>
              <option value="test">Prueba</option>
            </select>
            <select
              aria-label="Filtrar por etiqueta observada"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value as 'all' | '1' | '0')}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF]"
            >
              <option value="all">Todas las etiquetas</option>
              <option value="1">Incumple (1)</option>
              <option value="0">Cumple (0)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-[#25E5F2]/20 rounded-lg bg-[#080F22]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
              <tr>
                <th className="py-2.5 px-3 font-semibold">ID</th>
                <th className="py-2.5 px-3 font-semibold">Partición</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ingreso (COP)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Carga (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Mora (días)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Historial (m)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Utilización (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Etiqueta real (12m)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25E5F2]/10">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#94A3B8]">
                    Ningún perfil sintético coincide con los filtros actuales.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#162544]/70">
                    <td className="py-2 px-3 font-mono-num font-medium text-[#25E5F2]">
                      {row.id}
                    </td>
                    <td className="py-2 px-3 text-[#CBD5E1]">
                      {row.split === 'train' ? 'Entrenamiento' : 'Prueba'}
                    </td>
                    <td className="py-2 px-3 font-mono-num text-right text-[#F0F7FF]">
                      {formatCOP(row.ingresoMensualCOP)}
                    </td>
                    <td className="py-2 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {row.cargaFinancieraPct}%
                    </td>
                    <td className="py-2 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {row.maxDiasMoraPrevios}
                    </td>
                    <td className="py-2 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {row.antiguedadHistorialMeses}
                    </td>
                    <td className="py-2 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {row.utilizacionCuposPct}%
                    </td>
                    <td
                      className={`py-2 px-3 font-mono-num text-right font-semibold ${
                        row.incumplimiento12m === 1 ? 'text-[#FBBF24]' : 'text-[#34D399]'
                      }`}
                    >
                      {row.incumplimiento12m === 1 ? '1 · Incumple' : '0 · Cumple'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
