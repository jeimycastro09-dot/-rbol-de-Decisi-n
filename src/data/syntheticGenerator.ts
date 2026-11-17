import {
  ApplicantFeatures,
  DatasetSummary,
  FeatureKey,
  SyntheticProfile,
} from '../types/credit';
import { FEATURE_META, FEATURE_ORDER } from '../utils/format';

export const DEFAULT_SEED = 202611;
export const DEFAULT_PROFILE_COUNT = 240;

/**
 * Generador pseudoaleatorio determinista (Mulberry32).
 * Permite reproducibilidad exacta de los perfiles sintéticos y su partición.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sigmoid(z: number): number {
  if (z > 30) return 1 / (1 + Math.exp(-30));
  if (z < -30) return 1 / (1 + Math.exp(30));
  return 1 / (1 + Math.exp(-z));
}

/**
 * Supuesto didáctico generador de la probabilidad latente de incumplimiento a 12 meses.
 * NO es un modelo bancario validado ni calibrado: combina señales previas a la solicitud
 * con componente aleatorio posterior para evitar determinismo perfecto y fuga del futuro.
 */
export function computeDidacticDefaultProbability(features: ApplicantFeatures): number {
  const ingresoMillones = features.ingresoMensualCOP / 1_000_000;
  const z =
    -1.95 +
    0.048 * (features.cargaFinancieraPct - 34) +
    0.036 * features.maxDiasMoraPrevios +
    0.023 * (features.utilizacionCuposPct - 45) -
    0.013 * (features.antiguedadHistorialMeses - 48) -
    0.13 * (ingresoMillones - 5.2) +
    (features.maxDiasMoraPrevios >= 30 ? 0.62 : 0) +
    (features.cargaFinancieraPct > 45 && features.utilizacionCuposPct > 70 ? 0.55 : 0);

  return sigmoid(z);
}

export function validateProfileFeatures(features: ApplicantFeatures): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  for (const key of FEATURE_ORDER) {
    const val = features[key];
    const meta = FEATURE_META[key];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      errors.push(`${meta.label}: valor faltante o no finito.`);
      continue;
    }
    if (val < meta.min || val > meta.max) {
      errors.push(`${meta.label}: fuera de rango [${meta.min}, ${meta.max}].`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function sanitizeFeatures(features: ApplicantFeatures): ApplicantFeatures {
  return {
    ingresoMensualCOP: clamp(
      Math.round((Number.isFinite(features.ingresoMensualCOP) ? features.ingresoMensualCOP : 4_000_000) / 100_000) *
        100_000,
      FEATURE_META.ingresoMensualCOP.min,
      FEATURE_META.ingresoMensualCOP.max,
    ),
    cargaFinancieraPct: clamp(
      Math.round(Number.isFinite(features.cargaFinancieraPct) ? features.cargaFinancieraPct : 30),
      FEATURE_META.cargaFinancieraPct.min,
      FEATURE_META.cargaFinancieraPct.max,
    ),
    maxDiasMoraPrevios: clamp(
      Math.round(Number.isFinite(features.maxDiasMoraPrevios) ? features.maxDiasMoraPrevios : 0),
      FEATURE_META.maxDiasMoraPrevios.min,
      FEATURE_META.maxDiasMoraPrevios.max,
    ),
    antiguedadHistorialMeses: clamp(
      Math.round(Number.isFinite(features.antiguedadHistorialMeses) ? features.antiguedadHistorialMeses : 36),
      FEATURE_META.antiguedadHistorialMeses.min,
      FEATURE_META.antiguedadHistorialMeses.max,
    ),
    utilizacionCuposPct: clamp(
      Math.round(Number.isFinite(features.utilizacionCuposPct) ? features.utilizacionCuposPct : 35),
      FEATURE_META.utilizacionCuposPct.min,
      FEATURE_META.utilizacionCuposPct.max,
    ),
  };
}

function shuffleWithRng<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Genera N=240 perfiles sintéticos con variables estrictamente previas a la solicitud
 * y aplica partición estratificada reproducible 70% entrenamiento / 30% prueba.
 */
export function generateSyntheticDataset(
  seed: number = DEFAULT_SEED,
  count: number = DEFAULT_PROFILE_COUNT,
): SyntheticProfile[] {
  const rng = createRng(seed);
  const rawProfiles: Omit<SyntheticProfile, 'split'>[] = [];

  for (let i = 0; i < count; i++) {
    // Distribución sesgada realista para ingreso (entre 1M y 15M COP, múltiplos de 100k)
    const uInc = rng();
    const ingresoRaw = 1_000_000 + Math.pow(uInc, 1.45) * 14_000_000;
    const ingresoMensualCOP = clamp(
      Math.round(ingresoRaw / 100_000) * 100_000,
      FEATURE_META.ingresoMensualCOP.min,
      FEATURE_META.ingresoMensualCOP.max,
    );

    // Carga financiera (5% a 75%), ligeramente correlacionada inversamente con ingreso
    const cargaBase = 12 + rng() * 52 + (ingresoMensualCOP < 3_500_000 ? 7 : -3);
    const cargaFinancieraPct = clamp(
      Math.round(cargaBase + (rng() - 0.5) * 14),
      FEATURE_META.cargaFinancieraPct.min,
      FEATURE_META.cargaFinancieraPct.max,
    );

    // Antigüedad historial (0 a 180 meses)
    const antiguedadHistorialMeses = clamp(
      Math.round(Math.pow(rng(), 0.9) * 180),
      FEATURE_META.antiguedadHistorialMeses.min,
      FEATURE_META.antiguedadHistorialMeses.max,
    );

    // Días máximos de mora previos (0 para ~58%, cola hasta 120 días)
    const moraRoll = rng();
    let maxDiasMoraPrevios = 0;
    if (moraRoll > 0.56) {
      const tail = (moraRoll - 0.56) / 0.44;
      maxDiasMoraPrevios = clamp(
        Math.round(Math.pow(tail, 1.65) * 120),
        1,
        FEATURE_META.maxDiasMoraPrevios.max,
      );
    }

    // Utilización de cupos (0% a 100%)
    const utilBase = 15 + rng() * 70 + (cargaFinancieraPct > 45 ? 12 : 0);
    const utilizacionCuposPct = clamp(
      Math.round(utilBase + (rng() - 0.5) * 20),
      FEATURE_META.utilizacionCuposPct.min,
      FEATURE_META.utilizacionCuposPct.max,
    );

    const features: ApplicantFeatures = {
      ingresoMensualCOP,
      cargaFinancieraPct,
      maxDiasMoraPrevios,
      antiguedadHistorialMeses,
      utilizacionCuposPct,
    };

    const validation = validateProfileFeatures(features);
    if (!validation.valid) {
      throw new Error(`Perfil sintético inválido: ${validation.errors.join(' ')}`);
    }

    const probabilidadLatenteSimulada = computeDidacticDefaultProbability(features);
    const incumplimiento12m: 0 | 1 = rng() < probabilidadLatenteSimulada ? 1 : 0;

    rawProfiles.push({
      id: `SYN-${String(i + 1).padStart(3, '0')}`,
      ...features,
      incumplimiento12m,
      probabilidadLatenteSimulada,
    });
  }

  // Partición estratificada reproducible 70/30 usando semilla derivada
  const splitRng = createRng((seed ^ 0x9e3779b9) >>> 0);
  const positives = shuffleWithRng(
    rawProfiles.filter((p) => p.incumplimiento12m === 1),
    splitRng,
  );
  const negatives = shuffleWithRng(
    rawProfiles.filter((p) => p.incumplimiento12m === 0),
    splitRng,
  );

  const trainPosCount = Math.round(positives.length * 0.7);
  const trainNegCount = Math.round(negatives.length * 0.7);

  const trainIds = new Set<string>();
  positives.slice(0, trainPosCount).forEach((p) => trainIds.add(p.id));
  negatives.slice(0, trainNegCount).forEach((p) => trainIds.add(p.id));

  const assigned: SyntheticProfile[] = rawProfiles.map((p) => ({
    ...p,
    split: trainIds.has(p.id) ? 'train' : 'test',
  }));

  return assigned;
}

export function summarizeDataset(profiles: SyntheticProfile[]): DatasetSummary {
  const train = profiles.filter((p) => p.split === 'train');
  const test = profiles.filter((p) => p.split === 'test');
  const trainPos = train.filter((p) => p.incumplimiento12m === 1).length;
  const testPos = test.filter((p) => p.incumplimiento12m === 1).length;
  const overallPos = trainPos + testPos;
  const total = profiles.length;

  return {
    total,
    trainCount: train.length,
    trainPos,
    trainPrevalence: train.length > 0 ? trainPos / train.length : 0,
    testCount: test.length,
    testPos,
    testPrevalence: test.length > 0 ? testPos / test.length : 0,
    overallPos,
    overallPrevalence: total > 0 ? overallPos / total : 0,
  };
}

export function profilesToCsv(profiles: SyntheticProfile[]): string {
  const headers: (keyof SyntheticProfile | FeatureKey)[] = [
    'id',
    'particion' as keyof SyntheticProfile,
    'ingresoMensualCOP',
    'cargaFinancieraPct',
    'maxDiasMoraPrevios',
    'antiguedadHistorialMeses',
    'utilizacionCuposPct',
    'incumplimiento12m',
  ];

  const headerLine = [
    'id',
    'particion',
    'ingreso_mensual_cop',
    'carga_financiera_pct',
    'max_dias_mora_previos',
    'antiguedad_historial_meses',
    'utilizacion_cupos_pct',
    'incumplimiento_12m',
  ].join(',');

  const rows = profiles.map((p) =>
    [
      p.id,
      p.split === 'train' ? 'entrenamiento' : 'prueba',
      p.ingresoMensualCOP,
      p.cargaFinancieraPct,
      p.maxDiasMoraPrevios,
      p.antiguedadHistorialMeses,
      p.utilizacionCuposPct,
      p.incumplimiento12m,
    ].join(','),
  );

  void headers;
  return [headerLine, ...rows].join('\n');
}
