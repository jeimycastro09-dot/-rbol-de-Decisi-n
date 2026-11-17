import { useMemo, useState } from 'react';
import { ArrowRightLeft, Copy, ShieldAlert } from 'lucide-react';
import { CreditCardVisual } from '../components/CreditCardVisual';
import { predictWithTree } from '../algorithms/cart';
import { evaluateCreditPolicy } from '../algorithms/policy';
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

interface Module5ComparaProps {
  trainedTree: TrainedTreeResult;
  alertThreshold: number;
  policyRules: PolicyRulesConfig;
  initialProfileA: ApplicantFeatures;
}

export function Module5Compara({
  trainedTree,
  alertThreshold,
  policyRules,
  initialProfileA,
}: Module5ComparaProps) {
  const [profileA, setProfileA] = useState<ApplicantFeatures>(initialProfileA);
  const [profileB, setProfileB] = useState<ApplicantFeatures>({
    ...initialProfileA,
    ingresoMensualCOP: Math.min(15_000_000, initialProfileA.ingresoMensualCOP + 3_000_000),
    cargaFinancieraPct: Math.max(5, initialProfileA.cargaFinancieraPct - 12),
  });

  const predA = useMemo(
    () => predictWithTree(trainedTree.root, profileA, alertThreshold),
    [trainedTree.root, profileA, alertThreshold],
  );
  const predB = useMemo(
    () => predictWithTree(trainedTree.root, profileB, alertThreshold),
    [trainedTree.root, profileB, alertThreshold],
  );

  const policyA = useMemo(
    () => evaluateCreditPolicy(profileA, predA.pHoja, alertThreshold, policyRules),
    [profileA, predA.pHoja, alertThreshold, policyRules],
  );
  const policyB = useMemo(
    () => evaluateCreditPolicy(profileB, predB.pHoja, alertThreshold, policyRules),
    [profileB, predB.pHoja, alertThreshold, policyRules],
  );

  const sameLeaf = predA.leafNodeId === predB.leafNodeId;

  const updateProfile = (
    which: 'A' | 'B',
    key: FeatureKey,
    val: number,
  ) => {
    if (which === 'A') {
      setProfileA((prev) => ({ ...prev, [key]: val }));
    } else {
      setProfileB((prev) => ({ ...prev, [key]: val }));
    }
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 05 · Comparación controlada bajo el mismo modelo y la misma política
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          Compara escenarios: antes vs después o dos perfiles lado a lado
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Evalúa dos perfiles ficticios con el mismo árbol CART entrenado, el mismo umbral (
          {formatPct(alertThreshold)}) y las mismas reglas de política. Copia el escenario A en B y
          cambia una sola variable para observar cuándo cambia la hoja y cuándo permanece idéntica.
        </p>
      </header>

      {/* Advertencia causal y ética */}
      <section className="lab-panel-alt rounded-xl p-5 flex items-start gap-3 text-sm text-[#CBD5E1]">
        <ShieldAlert className="w-5 h-5 text-[#FBBF24] shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="font-semibold text-[#F0F7FF]">
            Asociación estadística no es causalidad ni receta de aprobación
          </p>
          <p className="text-xs leading-relaxed">
            Subir el ingreso mensual no garantiza aprobación ni cambia necesariamente de hoja si las
            divisiones del árbol dependen de la carga financiera o la mora previa. Esta herramienta
            es para analizar sensibilidad legítima del modelo; nunca debe usarse para sugerir cómo
            falsear datos o evadir controles de riesgo.
          </p>
        </div>
      </section>

      {/* Editores lado a lado */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(['A', 'B'] as const).map((side) => {
          const prof = side === 'A' ? profileA : profileB;
          const pred = side === 'A' ? predA : predB;
          const pol = side === 'A' ? policyA : policyB;
          return (
            <div
              key={side}
              className="lab-panel rounded-xl p-5 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#25E5F2]/15">
                <div>
                  <h3 className="text-base font-semibold text-[#F0F7FF]">
                    Escenario {side} {side === 'A' ? '(Base / Antes)' : '(Comparado / Después)'}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    Hoja {pred.leafNodeId} · p_hoja{' '}
                    <span className="font-mono-num text-[#25E5F2]">{formatPct(pred.pHoja)}</span> ·{' '}
                    <span className={pred.claseAlerta === 1 ? 'text-[#FBBF24]' : 'text-[#34D399]'}>
                      {pred.claseAlerta === 1 ? 'Alerta (1)' : 'Sin alerta (0)'}
                    </span>
                  </p>
                </div>
                {side === 'B' ? (
                  <button
                    type="button"
                    onClick={() => setProfileB({ ...profileA })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/30 bg-[#0B1328] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#25E5F2]" aria-hidden="true" />
                    <span>Copiar A en B</span>
                  </button>
                ) : (
                  <select
                    aria-label="Cargar preset en Escenario A"
                    defaultValue=""
                    onChange={(e) => {
                      const found = APPLICANT_PRESETS.find((p) => p.id === e.target.value);
                      if (found) setProfileA(found.features);
                    }}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF]"
                  >
                    <option value="" disabled>
                      Cargar preset...
                    </option>
                    {APPLICANT_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-3">
                {FEATURE_ORDER.map((key) => {
                  const meta = FEATURE_META[key];
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <label
                          htmlFor={`comp-${side}-${key}`}
                          className="font-medium text-[#CBD5E1]"
                        >
                          {meta.shortLabel}
                        </label>
                        <span className="font-mono-num font-semibold text-[#25E5F2]">
                          {formatFeatureValue(key, prof[key])}
                        </span>
                      </div>
                      <input
                        id={`comp-${side}-${key}`}
                        type="range"
                        min={meta.min}
                        max={meta.max}
                        step={meta.step}
                        value={prof[key]}
                        onChange={(e) => updateProfile(side, key, Number(e.target.value))}
                        className="w-full accent-[#25E5F2]"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Ruta resumida */}
              <div className="rounded-lg border border-[#25E5F2]/20 bg-[#080F22] p-3.5 space-y-2 text-xs">
                <p className="font-semibold text-[#F0F7FF]">
                  Ruta seguida en el árbol ({pred.route.length} pasos)
                </p>
                {pred.route.length === 0 ? (
                  <p className="text-[#94A3B8]">Hoja única raíz ({pred.leafNodeId}).</p>
                ) : (
                  <ul className="space-y-1 text-[#CBD5E1]">
                    {pred.route.map((step) => (
                      <li key={step.nodeId} className="flex items-center justify-between gap-2">
                        <span>
                          {step.nodeId}: {step.conditionText}
                        </span>
                        <span
                          className={`font-semibold whitespace-nowrap ${
                            step.direction === 'left' ? 'text-[#25E5F2]' : 'text-[#FBBF24]'
                          }`}
                        >
                          {step.direction === 'left' ? 'Sí (<=)' : 'No (>)'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <CreditCardVisual decision={pol} compact />
            </div>
          );
        })}
      </section>

      {/* Tabla de diferencias y efecto */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-[#F0F7FF]">
              Tabla comparativa de diferencias y efecto observado
            </h3>
          </div>
          <span className="text-xs font-medium text-[#25E5F2]">
            {sameLeaf
              ? `Ambos perfiles caen en la misma hoja (${predA.leafNodeId}) -> p_hoja idéntica`
              : `Hojas distintas (${predA.leafNodeId} vs ${predB.leafNodeId}) -> cambia p_hoja`}
          </span>
        </div>

        <div className="overflow-x-auto border border-[#25E5F2]/15 rounded-lg bg-[#080F22]">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#121F3A] border-b border-[#25E5F2]/20 text-[#CBD5E1]">
                <th className="py-2.5 px-3 font-semibold">Dimensión</th>
                <th className="py-2.5 px-3 font-semibold text-right">Escenario A</th>
                <th className="py-2.5 px-3 font-semibold text-right">Escenario B</th>
                <th className="py-2.5 px-3 font-semibold text-right">Diferencia / Efecto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25E5F2]/10">
              {FEATURE_ORDER.map((key) => {
                const diff = profileB[key] - profileA[key];
                const diffStr =
                  diff === 0
                    ? 'Sin cambio'
                    : key === 'ingresoMensualCOP'
                      ? `${diff > 0 ? '+' : ''}${formatCOP(diff)}`
                      : `${diff > 0 ? '+' : ''}${diff} ${FEATURE_META[key].unit}`;
                return (
                  <tr key={key}>
                    <td className="py-2.5 px-3 font-medium text-[#F0F7FF]">
                      {FEATURE_META[key].label}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {formatFeatureValue(key, profileA[key])}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                      {formatFeatureValue(key, profileB[key])}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono-num text-right font-semibold ${
                        diff === 0 ? 'text-[#8FA3C7]' : 'text-[#25E5F2]'
                      }`}
                    >
                      {diffStr}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-[#101A32] font-medium">
                <td className="py-2.5 px-3 text-[#F0F7FF]">Hoja alcanzada y p_hoja</td>
                <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                  {predA.leafNodeId} ({formatPct(predA.pHoja)})
                </td>
                <td className="py-2.5 px-3 font-mono-num text-right text-[#CBD5E1]">
                  {predB.leafNodeId} ({formatPct(predB.pHoja)})
                </td>
                <td className="py-2.5 px-3 font-mono-num text-right text-[#F0F7FF]">
                  {predB.pHoja - predA.pHoja === 0
                    ? '0,0 pp (misma hoja)'
                    : `${predB.pHoja - predA.pHoja > 0 ? '+' : ''}${formatPct(
                        predB.pHoja - predA.pHoja,
                      )}`}
                </td>
              </tr>
              <tr className="bg-[#101A32] font-medium">
                <td className="py-2.5 px-3 text-[#F0F7FF]">
                  Alerta modelo (umbral {formatPct(alertThreshold)})
                </td>
                <td className="py-2.5 px-3 text-right text-[#CBD5E1]">
                  {predA.claseAlerta === 1 ? 'Alerta (1)' : 'Sin alerta (0)'}
                </td>
                <td className="py-2.5 px-3 text-right text-[#CBD5E1]">
                  {predB.claseAlerta === 1 ? 'Alerta (1)' : 'Sin alerta (0)'}
                </td>
                <td className="py-2.5 px-3 text-right text-[#F0F7FF]">
                  {predA.claseAlerta === predB.claseAlerta
                    ? 'Mismo estado de alerta'
                    : 'Cambió la clasificación'}
                </td>
              </tr>
              <tr className="bg-[#101A32] font-medium">
                <td className="py-2.5 px-3 text-[#F0F7FF]">
                  Política ilustrativa (producto / cupo)
                </td>
                <td className="py-2.5 px-3 text-right text-[#CBD5E1]">
                  {policyA.productoPropuesto ?? 'Revisión'} · {formatCOP(policyA.cupoIlustrativoCOP)}
                </td>
                <td className="py-2.5 px-3 text-right text-[#CBD5E1]">
                  {policyB.productoPropuesto ?? 'Revisión'} · {formatCOP(policyB.cupoIlustrativoCOP)}
                </td>
                <td className="py-2.5 px-3 font-mono-num text-right text-[#25E5F2]">
                  {formatCOP(policyB.cupoIlustrativoCOP - policyA.cupoIlustrativoCOP)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
