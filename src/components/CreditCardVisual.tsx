import { CreditCard, ShieldAlert } from 'lucide-react';
import { CardTier, PolicyDecision } from '../types/credit';
import { formatCOP } from '../utils/format';

interface CreditCardVisualProps {
  decision: PolicyDecision;
  compact?: boolean;
}

const TIER_STYLES: Record<
  CardTier,
  {
    bg: string;
    border: string;
    accent: string;
    label: string;
    subtitle: string;
    sheen: string;
  }
> = {
  Clásica: {
    bg: 'bg-gradient-to-br from-[#0F3C8C] via-[#1D4ED8] to-[#081A44]',
    border: 'border-[#38BDF8]/50',
    accent: 'text-[#7DD3FC]',
    label: 'Tarjeta Conceptual Clásica',
    subtitle: 'Acabado azul eléctrico · Cupo inicial',
    sheen: 'from-[#25E5F2]/15 via-transparent to-transparent',
  },
  Oro: {
    bg: 'bg-gradient-to-br from-[#1C1609] via-[#533B0B] to-[#0A0804]',
    border: 'border-[#FBBF24]/55',
    accent: 'text-[#FDE68A]',
    label: 'Tarjeta Conceptual Oro',
    subtitle: 'Acabado negro y oro · Capacidad media',
    sheen: 'from-[#FBBF24]/15 via-transparent to-transparent',
  },
  Platinum: {
    bg: 'bg-gradient-to-br from-[#0A0F24] via-[#2B175E] to-[#083042]',
    border: 'border-[#25E5F2]/60',
    accent: 'text-[#25E5F2]',
    label: 'Tarjeta Conceptual Platinum',
    subtitle: 'Acabado holográfico violeta-cian · Capacidad amplia',
    sheen: 'from-[#25E5F2]/20 via-[#9C6BFF]/20 to-transparent',
  },
};

export function CreditCardVisual({ decision, compact = false }: CreditCardVisualProps) {
  if (!decision.productoPropuesto || decision.estado !== 'oferta_ilustrativa') {
    return (
      <div className="rounded-xl border border-[#F59E0B]/40 bg-[#1B1722]/90 p-5 flex flex-col justify-between min-h-[190px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#FBBF24]">Sin oferta automática</p>
            <h4 className="text-base font-semibold text-[#F0F7FF] mt-1">
              {decision.titulo}
            </h4>
          </div>
          <ShieldAlert className="w-5 h-5 text-[#FBBF24] shrink-0" aria-hidden="true" />
        </div>
        <p className="text-sm text-[#CBD5E1] leading-relaxed mt-3">
          {decision.motivo}
        </p>
        <div className="mt-4 pt-3 border-t border-[#F59E0B]/20 flex items-center justify-between text-xs text-[#94A3B8]">
          <span>Cupo ilustrativo propuesto</span>
          <span className="font-mono-num font-semibold text-[#F0F7FF]">$0 COP</span>
        </div>
      </div>
    );
  }

  const style = TIER_STYLES[decision.productoPropuesto];

  return (
    <div className="space-y-3">
      <div
        className={`relative overflow-hidden rounded-xl ${style.bg} text-[#F0F7FF] ${
          compact ? 'p-4' : 'p-6'
        } border ${style.border} shadow-[0_14px_34px_-12px_rgba(2,6,23,0.9)]`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-gradient-to-tr ${style.sheen}`}
        />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-medium ${style.accent}`}>
              BancoLab · Diseño conceptual sin marca comercial
            </p>
            <h4 className="text-lg font-semibold tracking-tight mt-0.5 text-[#F0F7FF]">
              {style.label}
            </h4>
          </div>
          <CreditCard className="w-6 h-6 text-[#F0F7FF]/80 shrink-0" aria-hidden="true" />
        </div>

        {/* Chip metálico estilizado en SVG */}
        <div className="relative z-10 mt-5 flex items-center justify-between gap-3">
          <svg
            width="44"
            height="32"
            viewBox="0 0 44 32"
            aria-hidden="true"
            className="opacity-95 shrink-0"
          >
            <defs>
              <linearGradient id="metalChip" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FDE68A" />
                <stop offset="50%" stopColor="#D4AF37" />
                <stop offset="100%" stopColor="#92400E" />
              </linearGradient>
            </defs>
            <rect
              x="1"
              y="1"
              width="42"
              height="30"
              rx="5"
              fill="url(#metalChip)"
              stroke="#FEF3C7"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
            <line x1="15" y1="1" x2="15" y2="31" stroke="#451A03" strokeOpacity="0.65" strokeWidth="1" />
            <line x1="29" y1="1" x2="29" y2="31" stroke="#451A03" strokeOpacity="0.65" strokeWidth="1" />
            <line x1="1" y1="16" x2="43" y2="16" stroke="#451A03" strokeOpacity="0.65" strokeWidth="1" />
          </svg>
          <div className="text-right">
            <p className="text-xs text-[#CBD5E1]">Cupo ilustrativo sujeto a revisión</p>
            <p className="font-mono-num text-xl font-bold text-[#F0F7FF] mt-0.5">
              {formatCOP(decision.cupoIlustrativoCOP)}
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs text-[#CBD5E1]">
          <span>{style.subtitle}</span>
          <span>Sin tasa de interés definida · Uso educativo</span>
        </div>
      </div>

      <p className="text-xs text-[#CBD5E1] leading-relaxed">
        <span className="font-semibold text-[#F0F7FF]">Motivo del producto:</span>{' '}
        {decision.reglaActivada}. Oferta ilustrativa sujeta a revisión documental y capacidad.
      </p>
    </div>
  );
}
