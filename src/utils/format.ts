import { FeatureKey } from '../types/credit';

export interface FeatureMeta {
  key: FeatureKey;
  label: string;
  shortLabel: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  description: string;
  rationale: string;
}

export const FEATURE_ORDER: FeatureKey[] = [
  'cargaFinancieraPct',
  'maxDiasMoraPrevios',
  'utilizacionCuposPct',
  'antiguedadHistorialMeses',
  'ingresoMensualCOP',
];

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
  ingresoMensualCOP: {
    key: 'ingresoMensualCOP',
    label: 'Ingreso mensual (COP)',
    shortLabel: 'Ingreso mensual',
    unit: 'COP',
    min: 1_000_000,
    max: 15_000_000,
    step: 100_000,
    description: 'Ingreso mensual declarado y verificable antes de la solicitud.',
    rationale: 'Refleja flujo disponible para atender obligaciones; por sí solo no garantiza cumplimiento si la carga es alta.',
  },
  cargaFinancieraPct: {
    key: 'cargaFinancieraPct',
    label: 'Carga financiera (%)',
    shortLabel: 'Carga financiera',
    unit: '%',
    min: 5,
    max: 75,
    step: 1,
    description: 'Proporción del ingreso destinada a pagos mensuales de obligaciones financieras vigentes.',
    rationale: 'Una carga elevada reduce el margen ante imprevistos y suele asociarse con mayor probabilidad de atraso.',
  },
  maxDiasMoraPrevios: {
    key: 'maxDiasMoraPrevios',
    label: 'Máximo días de mora previos',
    shortLabel: 'Mora previa (días)',
    unit: 'días',
    min: 0,
    max: 120,
    step: 1,
    description: 'Mayor atraso registrado en productos anteriores antes de la nueva solicitud.',
    rationale: 'Resume eventos históricos de incumplimiento temporal previos a la evaluación actual.',
  },
  antiguedadHistorialMeses: {
    key: 'antiguedadHistorialMeses',
    label: 'Antigüedad del historial (meses)',
    shortLabel: 'Antigüedad historial',
    unit: 'meses',
    min: 0,
    max: 180,
    step: 1,
    description: 'Meses transcurridos desde la apertura de la primera obligación reportada.',
    rationale: 'Un historial más extenso ofrece mayor evidencia de comportamiento en distintos ciclos.',
  },
  utilizacionCuposPct: {
    key: 'utilizacionCuposPct',
    label: 'Utilización de cupos (%)',
    shortLabel: 'Utilización cupos',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
    description: 'Porcentaje utilizado respecto al cupo total disponible en líneas rotativas previas.',
    rationale: 'Niveles cercanos al 100% suelen indicar presión de liquidez previa a la solicitud.',
  },
};

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const intFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
});

const decFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const fourDecFormatter = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatCOP(value: number): string {
  if (!Number.isFinite(value)) return 'No definido';
  return copFormatter.format(Math.round(value));
}

export function formatCOPCompact(value: number): string {
  if (!Number.isFinite(value)) return 'No definido';
  const millions = value / 1_000_000;
  if (Math.abs(millions) >= 1) {
    return `$${decFormatter.format(millions)} M`;
  }
  return formatCOP(value);
}

export function formatInt(value: number): string {
  if (!Number.isFinite(value)) return 'No definido';
  return intFormatter.format(Math.round(value));
}

export function formatPct(ratioOrPct: number, isRatio = true, decimals = 1): string {
  if (!Number.isFinite(ratioOrPct)) return 'No definido';
  const pct = isRatio ? ratioOrPct * 100 : ratioOrPct;
  return `${new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(pct)}%`;
}

export function formatImpurity(value: number): string {
  if (!Number.isFinite(value)) return 'No definido';
  return fourDecFormatter.format(value);
}

export function formatFeatureValue(key: FeatureKey, value: number): string {
  if (!Number.isFinite(value)) return 'No definido';
  switch (key) {
    case 'ingresoMensualCOP':
      return formatCOP(value);
    case 'cargaFinancieraPct':
    case 'utilizacionCuposPct':
      return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)}%`;
    case 'maxDiasMoraPrevios':
      return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} días`;
    case 'antiguedadHistorialMeses':
      return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(value)} meses`;
  }
}
