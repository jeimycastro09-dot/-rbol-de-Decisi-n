import { useMemo, useState } from 'react';
import { RotateCcw, Sliders, Wrench } from 'lucide-react';
import { CreditCardVisual } from '../components/CreditCardVisual';
import { InteractiveTreeSvg } from '../components/InteractiveTreeSvg';
import { predictWithTree } from '../algorithms/cart';
import { DEFAULT_POLICY_RULES, evaluateCreditPolicy } from '../algorithms/policy';
import { APPLICANT_PRESETS } from '../data/educationalContent';
import {
  ApplicantFeatures,
  FeatureKey,
  PolicyRulesConfig,
  TrainedTreeResult,
} from '../types/credit';
import {
  FEATURE_META,
  FEATURE_ORDER,
  formatCOP,
  formatFeatureValue,
  formatPct,
} from '../utils/format';

interface Module4SimulaProps {
  trainedTree: TrainedTreeResult;
  applicant: ApplicantFeatures;
  onChangeApplicant: (next: ApplicantFeatures) => void;
  alertThreshold: number;
  onChangeThreshold: (next: number) => void;
  policyRules: PolicyRulesConfig;
  onChangePolicyRules: (next: PolicyRulesConfig) => void;
}

export function Module4Simula({
  trainedTree,
  applicant,
  onChangeApplicant,
  alertThreshold,
  onChangeThreshold,
  policyRules,
  onChangePolicyRules,
}: Module4SimulaProps) {
  const [editRulesOpen, setEditRulesOpen] = useState(false);

  const prediction = useMemo(
    () => predictWithTree(trainedTree.root, applicant, alertThreshold),
    [trainedTree.root, applicant, alertThreshold],
  );

  const policyDecision = useMemo(
    () => evaluateCreditPolicy(applicant, prediction.pHoja, alertThreshold, policyRules),
    [applicant, prediction.pHoja, alertThreshold, policyRules],
  );

  const highlightedNodes = useMemo(() => {
    const set = new Set<string>([trainedTree.root.id]);
    let cur = trainedTree.root;
    for (const step of prediction.route) {
      const next = step.direction === 'left' ? cur.left : cur.right;
      if (next) {
        set.add(next.id);
        cur = next;
      }
    }
    return set;
  }, [prediction.route, trainedTree.root]);

  const highlightedEdges = useMemo(() => {
    const set = new Set<string>();
    let cur = trainedTree.root;
    for (const step of prediction.route) {
      const next = step.direction === 'left' ? cur.left : cur.right;
      if (next) {
        set.add(`${cur.id}->${next.id}`);
        cur = next;
      }
    }
    return set;
  }, [prediction.route, trainedTree.root]);

  const updateFeature = (key: FeatureKey, value: number) => {
    onChangeApplicant({ ...applicant, [key]: value });
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 04 · Evaluación de solicitud ficticia y separación riesgo vs política
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          Simula una solicitud: del árbol aprendido a la política comercial
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Ajusta las 5 variables del perfil ficticio (sin nombre ni documento). Observa por
          separado qué estima el árbol CART (A), cómo clasifica el umbral de alerta (B) y qué
          propone la política comercial manual hipotética (C).
        </p>
      </header>

      {/* Presets contrastantes */}
      <section className="lab-panel rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-[#F0F7FF]">
          Perfiles preconfigurados contrastantes
        </p>
        <div className="flex flex-wrap gap-2">
          {APPLICANT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChangeApplicant(preset.features)}
              title={preset.summary}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF] hover:border-[#25E5F2] hover:bg-[#162544] transition-colors whitespace-nowrap shrink-0"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </section>

      {/* Sliders del perfil + Paneles separados A/B y C */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-5">
          <div className="lab-panel rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
              <h3 className="text-base font-semibold text-[#F0F7FF]">
                Perfil ficticio (variables previas)
              </h3>
            </div>

            <div className="space-y-4">
              {FEATURE_ORDER.map((key) => {
                const meta = FEATURE_META[key];
                const val = applicant[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={`sim-${key}`} className="font-medium text-[#CBD5E1]">
                        {meta.label}
                      </label>
                      <span className="font-mono-num font-semibold text-[#25E5F2]">
                        {formatFeatureValue(key, val)}
                      </span>
                    </div>
                    <input
                      id={`sim-${key}`}
                      type="range"
                      min={meta.min}
                      max={meta.max}
                      step={meta.step}
                      value={val}
                      onChange={(e) => updateFeature(key, Number(e.target.value))}
                      className="w-full accent-[#25E5F2]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Control B: Umbral de alerta */}
          <div className="lab-panel-alt rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="alert-threshold-slider" className="font-semibold text-[#F0F7FF]">
                B · Umbral de alerta de riesgo (p_hoja &gt;= umbral)
              </label>
              <span className="font-mono-num text-sm font-bold text-[#FBBF24]">
                {formatPct(alertThreshold)}
              </span>
            </div>
            <input
              id="alert-threshold-slider"
              type="range"
              min={5}
              max={80}
              step={1}
              value={Math.round(alertThreshold * 100)}
              onChange={(e) => onChangeThreshold(Number(e.target.value) / 100)}
              className="w-full accent-[#F59E0B]"
            />
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              Cambiar este umbral solo modifica si la estimación actual dispara alerta positiva. No
              cambia las divisiones del árbol ni inventa una nueva probabilidad de hoja.
            </p>
          </div>
        </div>

        {/* Columna derecha: Separación explícita "Estimación del modelo" vs "Política ilustrativa" */}
        <div className="xl:col-span-7 space-y-6">
          {/* Panel A+B: Estimación del modelo */}
          <div className="lab-panel rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-[#25E5F2]">
                  Panel A + B · Estimación del modelo CART y umbral
                </p>
                <h3 className="text-lg font-semibold text-[#F0F7FF]">
                  Proporción de la hoja y alerta estadística
                </h3>
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-lg border ${
                  prediction.claseAlerta === 1
                    ? 'border-[#F59E0B]/60 bg-[#291B12] text-[#FBBF24]'
                    : 'border-[#14B8A6]/60 bg-[#0B2A2B] text-[#25E5F2]'
                }`}
              >
                {prediction.claseAlerta === 1 ? 'Alerta positiva (1)' : 'Sin alerta (0)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-y border-[#25E5F2]/15">
              <div>
                <p className="text-xs text-[#8FA3C7]">Hoja alcanzada</p>
                <p className="font-mono-num text-lg font-bold text-[#F0F7FF]">
                  {prediction.leafNodeId}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {prediction.leafPositivos} inc. de {prediction.leafN} registros
                </p>
              </div>
              <div>
                <p className="text-xs text-[#8FA3C7]">Estimación p_hoja</p>
                <p className="font-mono-num text-lg font-bold text-[#25E5F2]">
                  {formatPct(prediction.pHoja)}
                </p>
                <p className="text-xs text-[#94A3B8]">Frecuencia muestral, no PD calibrada</p>
              </div>
              <div>
                <p className="text-xs text-[#8FA3C7]">Comparación con umbral</p>
                <p className="font-mono-num text-lg font-bold text-[#F0F7FF]">
                  {formatPct(prediction.pHoja)} {prediction.pHoja >= alertThreshold ? '>=' : '<'}{' '}
                  {formatPct(alertThreshold)}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {prediction.pHoja >= alertThreshold
                    ? 'Supera o iguala el corte'
                    : 'Por debajo del corte'}
                </p>
              </div>
            </div>

            {/* Lista accesible paso a paso */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#F0F7FF]">
                Ruta real de decisiones (condición, valor y rama)
              </h4>
              {prediction.route.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">
                  El árbol actual tiene una sola hoja raíz sin divisiones.
                </p>
              ) : (
                <div className="overflow-x-auto border border-[#25E5F2]/20 rounded-lg bg-[#080F22]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
                        <th className="py-2 px-3">Paso</th>
                        <th className="py-2 px-3">Condición del nodo</th>
                        <th className="py-2 px-3 text-right">Valor perfil</th>
                        <th className="py-2 px-3 text-right">Decisión</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#25E5F2]/10">
                      {prediction.route.map((step, i) => (
                        <tr key={step.nodeId}>
                          <td className="py-2 px-3 font-mono-num text-[#94A3B8]">
                            {i + 1} ({step.nodeId})
                          </td>
                          <td className="py-2 px-3 font-medium text-[#F0F7FF]">
                            {step.conditionText}
                          </td>
                          <td className="py-2 px-3 font-mono-num text-right text-[#F0F7FF]">
                            {step.formattedValue}
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-semibold ${
                              step.direction === 'left' ? 'text-[#25E5F2]' : 'text-[#FBBF24]'
                            }`}
                          >
                            {step.direction === 'left' ? 'Sí · Izquierda' : 'No · Derecha'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Nota de discontinuidad: mover una variable sin cruzar ningún corte mantiene al perfil
                en la misma hoja y no cambia p_hoja; cruzar por 1 unidad un umbral del árbol puede
                saltar bruscamente a otra hoja. Ningún cambio garantiza aprobación ni prueba
                causalidad.
              </p>
            </div>
          </div>

          {/* Panel C: Política ilustrativa manual */}
          <div className="lab-panel-alt rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#FBBF24]">
                  Panel C · Política ilustrativa manual (reglas hipotéticas, no splits CART)
                </p>
                <h3 className="text-lg font-semibold text-[#F0F7FF]">
                  Propuesta educativa de tarjeta y cupo ilustrativo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditRulesOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#9C6BFF]/40 bg-[#0B1328] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
              >
                <Wrench className="w-3.5 h-3.5 text-[#C4B5FD]" aria-hidden="true" />
                <span>{editRulesOpen ? 'Ocultar reglas editables' : 'Editar reglas y topes'}</span>
              </button>
            </div>

            {editRulesOpen && (
              <div className="rounded-lg border border-[#25E5F2]/25 bg-[#080F22] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[#F0F7FF]">
                    Parámetros hipotéticos editables de política comercial
                  </p>
                  <button
                    type="button"
                    onClick={() => onChangePolicyRules(DEFAULT_POLICY_RULES)}
                    className="inline-flex items-center gap-1 text-xs text-[#25E5F2] hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" aria-hidden="true" />
                    <span>Restaurar valores iniciales</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className="space-y-1">
                    <span className="text-[#94A3B8] block">Carga máxima (%)</span>
                    <input
                      type="number"
                      min={10}
                      max={70}
                      value={policyRules.maxCargaPct}
                      onChange={(e) =>
                        onChangePolicyRules({
                          ...policyRules,
                          maxCargaPct: Math.max(10, Math.min(70, Number(e.target.value) || 40)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] font-mono-num"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[#94A3B8] block">Historial mínimo (meses)</span>
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={policyRules.minHistorialMeses}
                      onChange={(e) =>
                        onChangePolicyRules({
                          ...policyRules,
                          minHistorialMeses: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] font-mono-num"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[#94A3B8] block">Tope Clásica (COP)</span>
                    <input
                      type="number"
                      step={500000}
                      min={500000}
                      max={10000000}
                      value={policyRules.topeClasica}
                      onChange={(e) =>
                        onChangePolicyRules({
                          ...policyRules,
                          topeClasica: Math.max(500000, Number(e.target.value) || 3000000),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] font-mono-num"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[#94A3B8] block">Tope Oro (COP)</span>
                    <input
                      type="number"
                      step={500000}
                      min={1000000}
                      max={20000000}
                      value={policyRules.topeOro}
                      onChange={(e) =>
                        onChangePolicyRules({
                          ...policyRules,
                          topeOro: Math.max(1000000, Number(e.target.value) || 8000000),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] font-mono-num"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[#94A3B8] block">Tope Platinum (COP)</span>
                    <input
                      type="number"
                      step={500000}
                      min={2000000}
                      max={30000000}
                      value={policyRules.topePlatinum}
                      onChange={(e) =>
                        onChangePolicyRules({
                          ...policyRules,
                          topePlatinum: Math.max(2000000, Number(e.target.value) || 15000000),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] font-mono-num"
                    />
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <CreditCardVisual decision={policyDecision} />

              <div className="space-y-3 text-xs text-[#CBD5E1]">
                <p className="font-semibold text-[#F0F7FF]">
                  Orden explícito de prioridades (reglas manuales)
                </p>
                <ol className="space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li className={policyDecision.estado === 'revision_riesgo' ? 'font-semibold text-[#FBBF24]' : ''}>
                    Si p_hoja &gt;= umbral ({formatPct(alertThreshold)}) -&gt; Revisión de riesgo (sin oferta automática).
                  </li>
                  <li className={policyDecision.estado === 'revision_capacidad' ? 'font-semibold text-[#FBBF24]' : ''}>
                    Si carga financiera &gt; {policyRules.maxCargaPct}% -&gt; Revisión de capacidad.
                  </li>
                  <li className={policyDecision.estado === 'revision_historial' ? 'font-semibold text-[#FBBF24]' : ''}>
                    Si historial &lt; {policyRules.minHistorialMeses} meses -&gt; Revisión de historial.
                  </li>
                  <li className={policyDecision.estado === 'oferta_ilustrativa' ? 'font-semibold text-[#25E5F2]' : ''}>
                    Elegibles: ingreso &gt;= {formatCOP(policyRules.platinumMinIngreso)} y carga &lt;= {policyRules.platinumMaxCarga}% -&gt; Platinum; ingreso &gt;= {formatCOP(policyRules.oroMinIngreso)} y carga &lt;= {policyRules.oroMaxCarga}% -&gt; Oro; resto -&gt; Clásica.
                  </li>
                </ol>

                <div className="rounded-lg border border-[#25E5F2]/20 bg-[#080F22] p-3 space-y-1">
                  <p className="font-semibold text-[#F0F7FF]">Cálculo de capacidad y cupo</p>
                  <p className="font-mono-num text-[11px] text-[#CBD5E1]">
                    Capacidad mensual = max(0, ingreso × (0,40 - carga/100)) ={' '}
                    <span className="text-[#25E5F2]">{formatCOP(policyDecision.capacidadDisponibleMensualCOP)}</span>
                  </p>
                  <p className="font-mono-num text-[11px] text-[#CBD5E1]">
                    Cupo = piso_100k(min(tope, capacidad × 3)) ={' '}
                    <strong className="text-[#F0F7FF]">{formatCOP(policyDecision.cupoIlustrativoCOP)}</strong>
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    Nunca hay cupos negativos; si da $0 COP se remite a revisar capacidad sin oferta.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Árbol resaltando la ruta del perfil simulado */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[#F0F7FF]">
          Ruta del solicitante sobre el árbol entrenado
        </h3>
        <InteractiveTreeSvg
          root={trainedTree.root}
          selectedNodeId={prediction.leafNodeId}
          highlightedNodeIds={highlightedNodes}
          highlightedEdgePairs={highlightedEdges}
          alertThreshold={alertThreshold}
          title="Recorrido del perfil ficticio actual"
        />
      </section>
    </div>
  );
}
