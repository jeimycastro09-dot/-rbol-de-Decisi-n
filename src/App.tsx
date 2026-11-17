import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TRAIN_CONFIG,
  predictWithTree,
  trainDecisionTree,
} from './algorithms/cart';
import {
  DEFAULT_COST_CONFIG,
  DEFAULT_POLICY_RULES,
  evaluateCreditPolicy,
} from './algorithms/policy';
import { HelpModal } from './components/HelpModal';
import { LabHeroHeader } from './components/LabHeroHeader';
import { NAV_ITEMS, SidebarNav } from './components/SidebarNav';
import { APPLICANT_PRESETS } from './data/educationalContent';
import {
  DEFAULT_PROFILE_COUNT,
  DEFAULT_SEED,
  generateSyntheticDataset,
  sanitizeFeatures,
} from './data/syntheticGenerator';
import { Module1Comprende } from './modules/Module1Comprende';
import { Module2Datos } from './modules/Module2Datos';
import { Module3Construye } from './modules/Module3Construye';
import { Module4Simula } from './modules/Module4Simula';
import { Module5Compara } from './modules/Module5Compara';
import { Module6Evalua } from './modules/Module6Evalua';
import { Module7Negocio } from './modules/Module7Negocio';
import { Module8Practica, QuizAnswerState } from './modules/Module8Practica';
import {
  ApplicantFeatures,
  CostConfig,
  ModuleId,
  PolicyRulesConfig,
  TrainConfig,
} from './types/credit';

const STORAGE_KEY = 'bancolab_arboles_state_v1';

interface PersistedState {
  activeModule: ModuleId;
  seed: number;
  trainConfig: TrainConfig;
  applicant: ApplicantFeatures;
  alertThreshold: number;
  policyRules: PolicyRulesConfig;
  costs: CostConfig;
  quizAnswers: Record<string, QuizAnswerState>;
}

const DEFAULT_STATE: PersistedState = {
  activeModule: 'comprende',
  seed: DEFAULT_SEED,
  trainConfig: DEFAULT_TRAIN_CONFIG,
  applicant: APPLICANT_PRESETS[4].features,
  alertThreshold: 0.3,
  policyRules: DEFAULT_POLICY_RULES,
  costs: DEFAULT_COST_CONFIG,
  quizAnswers: {},
};

function loadInitialState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const validModules = new Set<ModuleId>(NAV_ITEMS.map((i) => i.id));
    return {
      activeModule:
        parsed.activeModule && validModules.has(parsed.activeModule)
          ? parsed.activeModule
          : DEFAULT_STATE.activeModule,
      seed:
        typeof parsed.seed === 'number' && Number.isFinite(parsed.seed)
          ? parsed.seed
          : DEFAULT_STATE.seed,
      trainConfig: parsed.trainConfig
        ? {
            criterion:
              parsed.trainConfig.criterion === 'entropy' ? 'entropy' : 'gini',
            maxDepth: Math.min(
              5,
              Math.max(1, Number(parsed.trainConfig.maxDepth) || 3),
            ),
            minSamplesLeaf: Math.min(
              30,
              Math.max(2, Number(parsed.trainConfig.minSamplesLeaf) || 10),
            ),
            minGain:
              typeof parsed.trainConfig.minGain === 'number'
                ? parsed.trainConfig.minGain
                : DEFAULT_TRAIN_CONFIG.minGain,
          }
        : DEFAULT_STATE.trainConfig,
      applicant: parsed.applicant
        ? sanitizeFeatures(parsed.applicant)
        : DEFAULT_STATE.applicant,
      alertThreshold:
        typeof parsed.alertThreshold === 'number' &&
        Number.isFinite(parsed.alertThreshold)
          ? Math.min(0.8, Math.max(0.05, parsed.alertThreshold))
          : DEFAULT_STATE.alertThreshold,
      policyRules: parsed.policyRules
        ? { ...DEFAULT_POLICY_RULES, ...parsed.policyRules }
        : DEFAULT_STATE.policyRules,
      costs: parsed.costs
        ? {
            costoFP: Math.max(0, Number(parsed.costs.costoFP) || 300_000),
            costoFN: Math.max(0, Number(parsed.costs.costoFN) || 8_000_000),
          }
        : DEFAULT_STATE.costs,
      quizAnswers: parsed.quizAnswers ?? {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export default function App() {
  const [state, setState] = useState<PersistedState>(() => loadInitialState());
  const [helpOpen, setHelpOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignorar si almacenamiento local no está disponible
    }
  }, [state]);

  const dataset = useMemo(
    () => generateSyntheticDataset(state.seed, DEFAULT_PROFILE_COUNT),
    [state.seed],
  );

  const trainRows = useMemo(
    () => dataset.filter((d) => d.split === 'train'),
    [dataset],
  );
  const testRows = useMemo(
    () => dataset.filter((d) => d.split === 'test'),
    [dataset],
  );

  const trainedTree = useMemo(
    () => trainDecisionTree(trainRows, state.trainConfig),
    [trainRows, state.trainConfig],
  );

  const quizScore = useMemo(() => {
    const entries = Object.values(state.quizAnswers);
    const answered = entries.filter((e) => e.checked).length;
    const correct = entries.filter((e) => e.checked && e.isCorrect).length;
    return { answered, correct, total: 12 };
  }, [state.quizAnswers]);

  const activeNav =
    NAV_ITEMS.find((n) => n.id === state.activeModule) ?? NAV_ITEMS[0];

  const handleExportConfigJson = () => {
    const simPrediction = predictWithTree(
      trainedTree.root,
      state.applicant,
      state.alertThreshold,
    );
    const simPolicy = evaluateCreditPolicy(
      state.applicant,
      simPrediction.pHoja,
      state.alertThreshold,
      state.policyRules,
    );
    const payload = {
      aplicacion: 'BancoLab · Árboles de decisión',
      aviso: 'Uso educativo · Perfiles sintéticos · No constituye una decisión crediticia real',
      semillaDatos: state.seed,
      configuracionArbolCART: state.trainConfig,
      umbralAlertaProbabilidad: state.alertThreshold,
      reglasPoliticaHipotetica: state.policyRules,
      costosHipoteticosCOP: state.costs,
      perfilSimuladoActual: state.applicant,
      rutaEstimacionActual: simPrediction,
      propuestaPoliticaActual: simPolicy,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bancolab_configuracion_ruta_seed_${state.seed}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetAll = () => {
    setState(DEFAULT_STATE);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin acción requerida
    }
    setHelpOpen(false);
  };

  return (
    <div className="min-h-screen flex text-[#F0F7FF]">
      <SidebarNav
        activeModule={state.activeModule}
        onSelectModule={(id) => setState((prev) => ({ ...prev, activeModule: id }))}
        onOpenHelp={() => setHelpOpen(true)}
        quizScore={quizScore}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <LabHeroHeader
          activeModuleNumber={activeNav.number}
          activeModuleLabel={activeNav.label}
          onGoToModule={(id) => setState((prev) => ({ ...prev, activeModule: id }))}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">
          {state.activeModule === 'comprende' && (
            <Module1Comprende
              onGoToModule={(id) =>
                setState((prev) => ({ ...prev, activeModule: id }))
              }
            />
          )}

          {state.activeModule === 'datos' && (
            <Module2Datos
              dataset={dataset}
              seed={state.seed}
              onChangeSeed={(newSeed) =>
                setState((prev) => ({ ...prev, seed: newSeed }))
              }
            />
          )}

          {state.activeModule === 'construye' && (
            <Module3Construye
              trainRows={trainRows}
              trainConfig={state.trainConfig}
              trainedTree={trainedTree}
              alertThreshold={state.alertThreshold}
              onTrainTree={(nextConfig) =>
                setState((prev) => ({ ...prev, trainConfig: nextConfig }))
              }
            />
          )}

          {state.activeModule === 'simula' && (
            <Module4Simula
              trainedTree={trainedTree}
              applicant={state.applicant}
              onChangeApplicant={(next) =>
                setState((prev) => ({ ...prev, applicant: next }))
              }
              alertThreshold={state.alertThreshold}
              onChangeThreshold={(next) =>
                setState((prev) => ({ ...prev, alertThreshold: next }))
              }
              policyRules={state.policyRules}
              onChangePolicyRules={(next) =>
                setState((prev) => ({ ...prev, policyRules: next }))
              }
            />
          )}

          {state.activeModule === 'compara' && (
            <Module5Compara
              trainedTree={trainedTree}
              alertThreshold={state.alertThreshold}
              policyRules={state.policyRules}
              initialProfileA={state.applicant}
            />
          )}

          {state.activeModule === 'evalua' && (
            <Module6Evalua
              trainRows={trainRows}
              testRows={testRows}
              trainConfig={state.trainConfig}
              trainedTree={trainedTree}
              alertThreshold={state.alertThreshold}
            />
          )}

          {state.activeModule === 'negocio' && (
            <Module7Negocio
              trainRows={trainRows}
              testRows={testRows}
              trainConfig={state.trainConfig}
              alertThreshold={state.alertThreshold}
              costs={state.costs}
              onChangeCosts={(next) =>
                setState((prev) => ({ ...prev, costs: next }))
              }
            />
          )}

          {state.activeModule === 'practica' && (
            <Module8Practica
              currentRoot={trainedTree.root}
              alertThreshold={state.alertThreshold}
              answers={state.quizAnswers}
              onChangeAnswers={(next) =>
                setState((prev) => ({ ...prev, quizAnswers: next }))
              }
            />
          )}
        </main>
      </div>

      <HelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onExportConfigJson={handleExportConfigJson}
        onResetAll={handleResetAll}
      />
    </div>
  );
}
