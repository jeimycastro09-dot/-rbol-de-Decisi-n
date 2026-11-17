export type FeatureKey =
  | 'ingresoMensualCOP'
  | 'cargaFinancieraPct'
  | 'maxDiasMoraPrevios'
  | 'antiguedadHistorialMeses'
  | 'utilizacionCuposPct';

export interface ApplicantFeatures {
  ingresoMensualCOP: number;
  cargaFinancieraPct: number;
  maxDiasMoraPrevios: number;
  antiguedadHistorialMeses: number;
  utilizacionCuposPct: number;
}

export interface SyntheticProfile extends ApplicantFeatures {
  id: string;
  incumplimiento12m: 0 | 1;
  probabilidadLatenteSimulada: number;
  split: 'train' | 'test';
}

export type SplitCriterion = 'gini' | 'entropy';

export interface TrainConfig {
  criterion: SplitCriterion;
  maxDepth: number;
  minSamplesLeaf: number;
  minGain: number;
}

export interface SplitCandidate {
  feature: FeatureKey;
  featureLabel: string;
  threshold: number;
  gain: number;
  parentImpurity: number;
  leftCount: number;
  leftPos: number;
  leftNeg: number;
  leftImpurity: number;
  rightCount: number;
  rightPos: number;
  rightNeg: number;
  rightImpurity: number;
}

export interface TreeNode {
  id: string;
  depth: number;
  isLeaf: boolean;
  n: number;
  positivos: number;
  negativos: number;
  pIncumplimiento: number;
  claseMayoria: 0 | 1;
  impurity: number;
  feature?: FeatureKey;
  featureLabel?: string;
  threshold?: number;
  gain?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface TrainedTreeResult {
  root: TreeNode;
  config: TrainConfig;
  featureImportances: Record<FeatureKey, number>;
  rootCandidates: SplitCandidate[];
  depthReached: number;
  leafCount: number;
  nodeCount: number;
}

export interface RouteStep {
  nodeId: string;
  depth: number;
  feature: FeatureKey;
  featureLabel: string;
  threshold: number;
  value: number;
  formattedValue: string;
  formattedThreshold: string;
  direction: 'left' | 'right';
  conditionText: string;
  decisionText: string;
  nNode: number;
  pNode: number;
}

export interface PredictionResult {
  pHoja: number;
  claseAlerta: 0 | 1;
  leafNodeId: string;
  leafN: number;
  leafPositivos: number;
  leafNegativos: number;
  route: RouteStep[];
}

export interface PolicyRulesConfig {
  maxCargaPct: number;
  minHistorialMeses: number;
  platinumMinIngreso: number;
  platinumMaxCarga: number;
  oroMinIngreso: number;
  oroMaxCarga: number;
  topeClasica: number;
  topeOro: number;
  topePlatinum: number;
}

export type CardTier = 'Clásica' | 'Oro' | 'Platinum';

export interface PolicyDecision {
  estado:
    | 'revision_riesgo'
    | 'revision_capacidad'
    | 'revision_historial'
    | 'oferta_ilustrativa';
  titulo: string;
  productoPropuesto: CardTier | null;
  cupoIlustrativoCOP: number;
  cupoBrutoCOP: number;
  capacidadDisponibleMensualCOP: number;
  reglaActivada: string;
  motivo: string;
}

export interface ConfusionMetrics {
  tp: number;
  fn: number;
  fp: number;
  tn: number;
  total: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  fnr: number | null;
  accuracyReason?: string;
  precisionReason?: string;
  recallReason?: string;
  f1Reason?: string;
  fnrReason?: string;
}

export interface CostConfig {
  costoFP: number;
  costoFN: number;
}

export interface CostBreakdown {
  fpCount: number;
  fnCount: number;
  fpCostTotal: number;
  fnCostTotal: number;
  totalCost: number;
}

export type ModuleId =
  | 'comprende'
  | 'datos'
  | 'construye'
  | 'simula'
  | 'compara'
  | 'evalua'
  | 'negocio'
  | 'practica';

export interface DatasetSummary {
  total: number;
  trainCount: number;
  trainPos: number;
  trainPrevalence: number;
  testCount: number;
  testPos: number;
  testPrevalence: number;
  overallPos: number;
  overallPrevalence: number;
}
