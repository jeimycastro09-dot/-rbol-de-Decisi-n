import { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, Play } from 'lucide-react';
import { InteractiveTreeSvg } from '../components/InteractiveTreeSvg';
import {
  PEDAGOGICAL_MINI_TREE,
  PEDAGOGICAL_NODE_NOTES,
} from '../data/educationalContent';
import { ApplicantFeatures, TreeNode } from '../types/credit';
import { predictWithTree } from '../algorithms/cart';
import { formatCOP, formatPct } from '../utils/format';

interface Module1ComprendeProps {
  onGoToModule: (id: 'datos' | 'construye' | 'simula') => void;
}

const DEMO_CASES: {
  id: string;
  label: string;
  description: string;
  features: ApplicantFeatures;
}[] = [
  {
    id: 'caso-a',
    label: 'Caso A · Carga moderada sin mora',
    description: 'Ingreso $5.500.000 COP, carga 28%, mora previa 0 días.',
    features: {
      ingresoMensualCOP: 5_500_000,
      cargaFinancieraPct: 28,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 48,
      utilizacionCuposPct: 30,
    },
  },
  {
    id: 'caso-b',
    label: 'Caso B · Carga moderada con mora previa',
    description: 'Ingreso $4.200.000 COP, carga 36%, mora previa 25 días.',
    features: {
      ingresoMensualCOP: 4_200_000,
      cargaFinancieraPct: 36,
      maxDiasMoraPrevios: 25,
      antiguedadHistorialMeses: 30,
      utilizacionCuposPct: 65,
    },
  },
  {
    id: 'caso-c',
    label: 'Caso C · Carga financiera elevada',
    description: 'Ingreso $3.800.000 COP, carga 52%, mora previa 10 días.',
    features: {
      ingresoMensualCOP: 3_800_000,
      cargaFinancieraPct: 52,
      maxDiasMoraPrevios: 10,
      antiguedadHistorialMeses: 24,
      utilizacionCuposPct: 72,
    },
  },
];

export function Module1Comprende({ onGoToModule }: Module1ComprendeProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNode>(PEDAGOGICAL_MINI_TREE);
  const [activeCaseId, setActiveCaseId] = useState<string>('caso-b');
  const [stepIndex, setStepIndex] = useState<number>(2);

  const demoCase = DEMO_CASES.find((c) => c.id === activeCaseId) ?? DEMO_CASES[0];
  const demoThreshold = 0.3;
  const prediction = predictWithTree(
    PEDAGOGICAL_MINI_TREE,
    demoCase.features,
    demoThreshold,
  );

  const maxStep = prediction.route.length;
  const clampedStep = Math.min(stepIndex, maxStep);

  const highlightedNodes = new Set<string>(['P0']);
  const highlightedEdges = new Set<string>();
  let currentId = 'P0';
  for (let i = 0; i < clampedStep; i++) {
    const step = prediction.route[i];
    const nextId = step.direction === 'left' ? `${currentId}L` : `${currentId}R`;
    highlightedNodes.add(nextId);
    highlightedEdges.add(`${currentId}->${nextId}`);
    currentId = nextId;
  }

  const nodeNote =
    PEDAGOGICAL_NODE_NOTES[selectedNode.id] ?? PEDAGOGICAL_NODE_NOTES.P0;

  return (
    <div className="space-y-8">
      <header className="space-y-2 max-w-3xl">
        <p className="text-xs font-medium text-[#25E5F2]">
          Módulo 01 · Fundamentos supervisados y anatomía visual
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
          ¿Qué es un árbol de decisión y cómo apoya la evaluación crediticia?
        </h2>
        <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
          Antes de revisar fórmulas matemáticas, piensa en un árbol de decisión como una
          secuencia ordenada de preguntas simples de sí o no. Cada pregunta divide a un
          grupo de solicitantes en subgrupos más homogéneos respecto a un resultado observado
          en el pasado: si cumplieron o incumplieron sus pagos a 12 meses.
        </p>
      </header>

      {/* Ejemplo sencillo antes de fórmulas */}
      <section className="lab-panel rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold text-[#F0F7FF]">
          Un ejemplo sencillo antes de las fórmulas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm text-[#CBD5E1]">
          <div className="space-y-1.5">
            <p className="font-semibold text-[#25E5F2]">1. La pregunta inicial (Raíz)</p>
            <p className="leading-relaxed">
              Supón que observas 100 solicitudes anteriores: 28 presentaron incumplimiento y 72
              cumplieron. El algoritmo prueba distintas preguntas y descubre que separar primero
              por <span className="font-medium text-[#F0F7FF]">carga financiera &lt;= 40%</span>{' '}
              es la mejor forma de distinguir grupos.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-[#C4B5FD]">2. El refinamiento (Ramas y nodos)</p>
            <p className="leading-relaxed">
              Quienes responden <strong className="text-[#F0F7FF]">Sí (&lt;= 40%)</strong> van por la rama izquierda; si
              tienen poca mora previa, la frecuencia de incumplimiento cae a apenas 5,8%.
              Quienes responden <strong className="text-[#F0F7FF]">No (&gt; 40%)</strong> van a la derecha, donde 55,6%
              incumplió.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="font-semibold text-[#FBBF24]">3. La proporción en hoja (Sin certezas)</p>
            <p className="leading-relaxed">
              Cuando una nueva persona llega a una hoja, no adivinamos su futuro con 100% de
              certeza: le asignamos la proporción observada en esa hoja (por ejemplo, 3 de 52 =
              5,8%) y luego aplicamos un umbral de alerta y reglas de política comercial.
            </p>
          </div>
        </div>
      </section>

      {/* Distinción explícita A / B / C */}
      <section className="lab-panel-alt rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-[#25E5F2]" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-[#F0F7FF]">
            Tres piezas distintas que nunca debemos confundir
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-[#25E5F2]/25 bg-[#0B1328]/90 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-[#25E5F2]">
              A · Árbol de clasificación aprendido
            </p>
            <p className="font-semibold text-[#F0F7FF]">Estima frecuencia de incumplimiento</p>
            <p className="text-[#CBD5E1] leading-relaxed">
              Aprende cortes numéricos usando datos sintéticos etiquetados con incumplimiento
              observado a 12 meses (positivo = incumple, negativo = cumple). Nunca se entrena
              con &quot;aprobado históricamente&quot;.
            </p>
          </div>
          <div className="rounded-lg border border-[#F59E0B]/30 bg-[#0B1328]/90 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-[#FBBF24]">
              B · Umbral de probabilidad (alerta)
            </p>
            <p className="font-semibold text-[#F0F7FF]">Convierte p_hoja en alerta binaria</p>
            <p className="text-[#CBD5E1] leading-relaxed">
              Decide desde qué porcentaje (ej. p &gt;= 30%) se levanta una alerta de riesgo.
              Mover el umbral cambia cuántas alertas se emiten, pero no altera las ramas del
              árbol.
            </p>
          </div>
          <div className="rounded-lg border border-[#9C6BFF]/30 bg-[#0B1328]/90 p-4 space-y-1.5">
            <p className="text-xs font-semibold text-[#C4B5FD]">
              C · Política comercial hipotética
            </p>
            <p className="font-semibold text-[#F0F7FF]">Propone producto, cupo o revisión</p>
            <p className="text-[#CBD5E1] leading-relaxed">
              Reglas manuales escritas por el banco (carga máxima, historial mínimo, tramos para
              Clásica/Oro/Platinum). Un árbol de riesgo por sí solo no otorga tarjetas ni aprueba
              créditos reales.
            </p>
          </div>
        </div>
      </section>

      {/* Mini árbol pedagógico interactivo + recorrido paso a paso */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#F0F7FF]">
                Mini árbol pedagógico manual y recorrido paso a paso
              </h3>
              <p className="text-sm text-[#94A3B8]">
                Ejemplo pedagógico manual con 100 casos ilustrativos (no proviene de entrenar los 240
                registros sintéticos de los módulos 02 y 03). Haz clic en cualquier nodo (o usa Tab
                + Enter) para leer su rol estadístico y bancario.
              </p>
            </div>
          </div>

          <InteractiveTreeSvg
            root={PEDAGOGICAL_MINI_TREE}
            selectedNodeId={selectedNode.id}
            onSelectNode={(node) => setSelectedNode(node)}
            highlightedNodeIds={highlightedNodes}
            highlightedEdgePairs={highlightedEdges}
            alertThreshold={demoThreshold}
            title="Ejemplo pedagógico manual (100 casos ilustrativos · umbral 30%)"
          />

          {/* Controlador de recorrido paso a paso */}
          <div className="lab-panel rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-[#F0F7FF]">
                  Recorrido paso a paso de un perfil ficticio
                </h4>
                <p className="text-xs text-[#94A3B8]">
                  {demoCase.description}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {DEMO_CASES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveCaseId(c.id);
                      setStepIndex(0);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      activeCaseId === c.id
                        ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border-[#25E5F2]'
                        : 'bg-[#0B1328] text-[#CBD5E1] border-[#25E5F2]/20 hover:border-[#25E5F2]/50'
                    }`}
                  >
                    {c.label.split(' · ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#25E5F2]/15">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
                  disabled={clampedStep === 0}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#F0F7FF] disabled:opacity-40 hover:border-[#25E5F2] whitespace-nowrap shrink-0"
                >
                  <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex((s) => Math.min(maxStep, s + 1))}
                  disabled={clampedStep >= maxStep}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] disabled:opacity-40 hover:brightness-110 whitespace-nowrap shrink-0"
                >
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Siguiente pregunta</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStepIndex(maxStep)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#9C6BFF]/40 bg-[#0B1328] text-[#CBD5E1] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
                >
                  Ir hasta la hoja
                </button>
              </div>
              <span className="font-mono-num text-xs text-[#25E5F2]">
                Paso {clampedStep} de {maxStep}
              </span>
            </div>

            <ol className="space-y-2 text-sm">
              <li className="rounded-lg border border-[#25E5F2]/20 bg-[#0B1328]/90 px-3.5 py-2.5 text-[#CBD5E1]">
                <span className="font-semibold text-[#F0F7FF]">Inicio (Raíz P0, profundidad 0):</span>{' '}
                el solicitante ingresa con ingreso {formatCOP(demoCase.features.ingresoMensualCOP)},{' '}
                carga {demoCase.features.cargaFinancieraPct}% y mora previa{' '}
                {demoCase.features.maxDiasMoraPrevios} días.
              </li>
              {prediction.route.slice(0, clampedStep).map((step, idx) => (
                <li
                  key={step.nodeId}
                  className="rounded-lg border border-[#25E5F2]/40 bg-[#0C2535]/80 px-3.5 py-2.5 text-[#F0F7FF]"
                >
                  <span className="font-semibold text-[#25E5F2]">
                    Pregunta {idx + 1} ({step.nodeId}):
                  </span>{' '}
                  ¿{step.conditionText}? Valor del perfil:{' '}
                  <span className="font-mono-num font-semibold text-[#25E5F2]">{step.formattedValue}</span>{' '}
                  <span aria-hidden="true">→</span> {step.decisionText}.
                </li>
              ))}
              {clampedStep === maxStep && (
                <li
                  className={`rounded-lg border px-3.5 py-2.5 font-medium ${
                    prediction.claseAlerta === 1
                      ? 'border-[#F59E0B]/60 bg-[#291B12] text-[#FDE68A]'
                      : 'border-[#14B8A6]/60 bg-[#0B2A2B] text-[#99F6E4]'
                  }`}
                >
                  Resultado en hoja {prediction.leafNodeId}: proporción observada{' '}
                  <span className="font-mono-num font-bold">
                    {formatPct(prediction.pHoja)}
                  </span>{' '}
                  ({prediction.leafPositivos} de {prediction.leafN} registros). Con umbral 30%:{' '}
                  {prediction.claseAlerta === 1
                    ? 'activa alerta de revisión de riesgo.'
                    : 'no activa alerta de riesgo.'}
                </li>
              )}
            </ol>
          </div>
        </div>

        {/* Panel derecho: nodo seleccionado + glosario estructural */}
        <aside className="xl:col-span-4 space-y-5">
          <div className="lab-panel rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-[#25E5F2]">
                Nodo seleccionado · {selectedNode.id}
              </p>
              <span className="font-mono-num text-xs text-[#94A3B8]">
                Profundidad {selectedNode.depth}
              </span>
            </div>
            <h4 className="text-base font-semibold text-[#F0F7FF]">{nodeNote.title}</h4>
            <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-[#25E5F2]/15 text-center">
              <div>
                <p className="text-[11px] text-[#8FA3C7]">Registros (n)</p>
                <p className="font-mono-num text-sm font-semibold text-[#F0F7FF]">
                  {selectedNode.n}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#8FA3C7]">Incumplen</p>
                <p className="font-mono-num text-sm font-semibold text-[#FBBF24]">
                  {selectedNode.positivos}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-[#8FA3C7]">Proporción</p>
                <p className="font-mono-num text-sm font-semibold text-[#25E5F2]">
                  {formatPct(selectedNode.pIncumplimiento)}
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-[#CBD5E1]">
              <p>
                <strong className="text-[#F0F7FF]">Ayuda estadística:</strong> {nodeNote.statNote}
              </p>
              <p>
                <strong className="text-[#F0F7FF]">Traducción bancaria:</strong> {nodeNote.bankNote}
              </p>
            </div>
          </div>

          <div className="lab-panel rounded-xl p-5 space-y-3 text-sm text-[#CBD5E1]">
            <h4 className="text-base font-semibold text-[#F0F7FF]">
              Conceptos clave del módulo
            </h4>
            <dl className="space-y-2.5 text-xs leading-relaxed">
              <div>
                <dt className="font-semibold text-[#25E5F2]">Aprendizaje supervisado</dt>
                <dd>
                  El algoritmo observa ejemplos pasados con su etiqueta real (incumplimiento = 1 o 0)
                  para descubrir reglas de partición.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#25E5F2]">Clasificación vs Regresión</dt>
                <dd>
                  Aquí usamos <strong className="text-[#F0F7FF]">clasificación</strong> (predecir riesgo de incumplimiento y
                  estimar frecuencia en hoja). En <strong className="text-[#F0F7FF]">regresión</strong> (solo conceptual), un
                  árbol estimaría directamente una cantidad numérica continua, como un monto de cupo
                  promedio en COP.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#25E5F2]">Raíz, rama, hoja y profundidad</dt>
                <dd>
                  La raíz tiene profundidad 0. Cada condición <code className="font-mono-num text-[#F0F7FF]">&lt;=</code>{' '}
                  abre la rama izquierda y <code className="font-mono-num text-[#F0F7FF]">&gt;</code> la derecha,
                  hasta terminar en una hoja sin más divisiones.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[#25E5F2]">Entrenamiento vs Uso (Inferencia)</dt>
                <dd>
                  Durante el entrenamiento se aprenden los cortes (ej. carga &lt;= 40%). Durante el
                  uso, el árbol está fijo y solo clasifica nuevos perfiles; el analista ajusta aparte
                  el umbral de alerta de probabilidad.
                </dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => onGoToModule('datos')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] hover:brightness-110 transition-all whitespace-nowrap shrink-0"
          >
            <span>Continuar al Módulo 02: Datos bancarios</span>
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </aside>
      </section>
    </div>
  );
}
