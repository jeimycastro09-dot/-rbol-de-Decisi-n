import {
  ApplicantFeatures,
  CardTier,
  ConfusionMetrics,
  CostBreakdown,
  CostConfig,
  PolicyDecision,
  PolicyRulesConfig,
} from '../types/credit';
import { formatCOP, formatPct } from '../utils/format';

export const DEFAULT_POLICY_RULES: PolicyRulesConfig = {
  maxCargaPct: 40,
  minHistorialMeses: 12,
  platinumMinIngreso: 8_000_000,
  platinumMaxCarga: 25,
  oroMinIngreso: 4_000_000,
  oroMaxCarga: 35,
  topeClasica: 3_000_000,
  topeOro: 8_000_000,
  topePlatinum: 15_000_000,
};

export const DEFAULT_COST_CONFIG: CostConfig = {
  costoFP: 300_000,
  costoFN: 8_000_000,
};

/**
 * Reglas HIPOTÉTICAS de política comercial escritas manualmente.
 * NO son divisiones aprendidas por el árbol CART ni constituyen una política bancaria real.
 *
 * Prioridad estricta:
 * 1) pHoja >= umbral -> Revisión de riesgo (sin oferta automática).
 * 2) cargaFinancieraPct > maxCargaPct -> Revisión de capacidad (sin oferta automática).
 * 3) antiguedadHistorialMeses < minHistorialMeses -> Revisión de historial (sin oferta automática).
 * 4) Clasificación ilustrativa de producto y cálculo de cupo redondeado hacia abajo a 100.000 COP.
 *    Si el cupo resulta 0 -> Revisar capacidad sin oferta automática.
 */
export function evaluateCreditPolicy(
  features: ApplicantFeatures,
  pHoja: number,
  alertThreshold: number,
  rules: PolicyRulesConfig = DEFAULT_POLICY_RULES,
): PolicyDecision {
  const capacidadDisponibleMensualCOP = Math.max(
    0,
    features.ingresoMensualCOP * (0.4 - features.cargaFinancieraPct / 100),
  );

  // 1. Alerta de riesgo derivada de la estimación de hoja + umbral
  if (pHoja >= alertThreshold) {
    return {
      estado: 'revision_riesgo',
      titulo: 'Revisión de riesgo (sin oferta automática)',
      productoPropuesto: null,
      cupoIlustrativoCOP: 0,
      cupoBrutoCOP: 0,
      capacidadDisponibleMensualCOP,
      reglaActivada: `Regla 1 · pHoja (${formatPct(pHoja)}) >= umbral (${formatPct(alertThreshold)})`,
      motivo:
        'La proporción de incumplimiento en la hoja alcanzó o superó el umbral de alerta definido. Se sugiere revisión analítica de riesgo; una alerta no equivale a un rechazo definitivo.',
    };
  }

  // 2. Regla manual de carga financiera
  if (features.cargaFinancieraPct > rules.maxCargaPct) {
    return {
      estado: 'revision_capacidad',
      titulo: 'Revisión de capacidad (sin oferta automática)',
      productoPropuesto: null,
      cupoIlustrativoCOP: 0,
      cupoBrutoCOP: 0,
      capacidadDisponibleMensualCOP,
      reglaActivada: `Regla 2 · Carga financiera (${features.cargaFinancieraPct}%) > ${rules.maxCargaPct}%`,
      motivo:
        'Aunque el árbol no activó alerta de riesgo, la carga financiera excede el límite ilustrativo de política comercial. Requiere validación de capacidad de pago.',
    };
  }

  // 3. Regla manual de antigüedad mínima del historial
  if (features.antiguedadHistorialMeses < rules.minHistorialMeses) {
    return {
      estado: 'revision_historial',
      titulo: 'Revisión de historial (sin oferta automática)',
      productoPropuesto: null,
      cupoIlustrativoCOP: 0,
      cupoBrutoCOP: 0,
      capacidadDisponibleMensualCOP,
      reglaActivada: `Regla 3 · Antigüedad (${features.antiguedadHistorialMeses} m) < ${rules.minHistorialMeses} m`,
      motivo:
        'El historial crediticio es más corto que el mínimo ilustrativo fijado en la política comercial. Se sugiere revisión complementaria antes de proponer cupo.',
    };
  }

  // 4. Selección de producto ilustrativo y cálculo de cupo
  let producto: CardTier = 'Clásica';
  let topeProducto = rules.topeClasica;
  let reglaProducto = `Regla 4c · Perfil elegible general -> Tarjeta Clásica (tope ${formatCOP(rules.topeClasica)})`;

  if (
    features.ingresoMensualCOP >= rules.platinumMinIngreso &&
    features.cargaFinancieraPct <= rules.platinumMaxCarga
  ) {
    producto = 'Platinum';
    topeProducto = rules.topePlatinum;
    reglaProducto = `Regla 4a · Ingreso >= ${formatCOP(rules.platinumMinIngreso)} y Carga <= ${rules.platinumMaxCarga}% -> Platinum`;
  } else if (
    features.ingresoMensualCOP >= rules.oroMinIngreso &&
    features.cargaFinancieraPct <= rules.oroMaxCarga
  ) {
    producto = 'Oro';
    topeProducto = rules.topeOro;
    reglaProducto = `Regla 4b · Ingreso >= ${formatCOP(rules.oroMinIngreso)} y Carga <= ${rules.oroMaxCarga}% -> Oro`;
  }

  const cupoBrutoCOP = Math.max(
    0,
    features.ingresoMensualCOP * (0.4 - features.cargaFinancieraPct / 100) * 3,
  );
  const cupoTopeado = Math.min(topeProducto, cupoBrutoCOP);
  const cupoIlustrativoCOP = Math.floor(cupoTopeado / 100_000) * 100_000;

  if (cupoIlustrativoCOP <= 0) {
    return {
      estado: 'revision_capacidad',
      titulo: 'Revisar capacidad sin oferta automática',
      productoPropuesto: null,
      cupoIlustrativoCOP: 0,
      cupoBrutoCOP,
      capacidadDisponibleMensualCOP,
      reglaActivada: `${reglaProducto} · Cupo calculado = $0`,
      motivo:
        'La capacidad disponible calculada con (0,4 - carga/100) × 3 arroja un cupo ilustrativo de $0 al redondear a $100.000. Se sugiere revisar capacidad sin oferta.',
    };
  }

  return {
    estado: 'oferta_ilustrativa',
    titulo: `Oferta ilustrativa sujeta a revisión · Tarjeta ${producto}`,
    productoPropuesto: producto,
    cupoIlustrativoCOP,
    cupoBrutoCOP,
    capacidadDisponibleMensualCOP,
    reglaActivada: reglaProducto,
    motivo: `Cumple los filtros manuales de riesgo, carga (<= ${rules.maxCargaPct}%) e historial (>= ${rules.minHistorialMeses} meses). Cupo ilustrativo sujeto a verificación documental.`,
  };
}

export function computeErrorCosts(
  metrics: ConfusionMetrics,
  costs: CostConfig = DEFAULT_COST_CONFIG,
): CostBreakdown {
  const fpCostTotal = metrics.fp * costs.costoFP;
  const fnCostTotal = metrics.fn * costs.costoFN;
  return {
    fpCount: metrics.fp,
    fnCount: metrics.fn,
    fpCostTotal,
    fnCostTotal,
    totalCost: fpCostTotal + fnCostTotal,
  };
}
