import { GitBranch, HelpCircle, Menu, Sparkles } from 'lucide-react';
import { ModuleId } from '../types/credit';

interface LabHeroHeaderProps {
  activeModuleNumber: string;
  activeModuleLabel: string;
  onGoToModule: (id: ModuleId) => void;
  onOpenHelp: () => void;
  onOpenMobileMenu: () => void;
}

export function LabHeroHeader({
  activeModuleNumber,
  activeModuleLabel,
  onGoToModule,
  onOpenHelp,
  onOpenMobileMenu,
}: LabHeroHeaderProps) {
  return (
    <header className="relative overflow-hidden border-b border-[#25E5F2]/20 bg-[#070E22]/90 backdrop-blur-md">
      {/* Textura sutil de circuito y halos decorativos */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 lab-grid-overlay opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-12 w-80 h-80 rounded-full bg-[#9C6BFF]/16 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-[#25E5F2]/12 blur-3xl"
      />

      {/* Barra superior compacta de contexto */}
      <div className="relative z-10 flex items-center justify-between gap-4 px-4 sm:px-8 py-2.5 border-b border-[#25E5F2]/12">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg border border-[#25E5F2]/25 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2]/60"
            aria-label="Abrir menú de módulos"
          >
            <Menu className="w-4 h-4" aria-hidden="true" />
          </button>
          <p className="text-xs text-[#B8C7E0] truncate">
            <span className="font-semibold text-[#25E5F2]">BancoLab</span>
            <span aria-hidden="true"> · </span>
            <span>
              {activeModuleNumber}. {activeModuleLabel}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <p className="hidden md:block text-xs text-[#94A3B8] whitespace-nowrap">
            Uso educativo · Perfiles sintéticos · No constituye una decisión crediticia real
          </p>
          <button
            type="button"
            onClick={onOpenHelp}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#25E5F2]/30 bg-[#101A32]/90 text-[#F0F7FF] hover:border-[#25E5F2] hover:bg-[#162544] transition-colors whitespace-nowrap shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#25E5F2]" aria-hidden="true" />
            <span>Fuentes y JSON</span>
          </button>
        </div>
      </div>

      {/* Hero compacto compartido (220-260px en desktop) */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-5 lg:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-3">
          <p className="text-xs font-medium tracking-wide text-[#25E5F2]">
            Laboratorio interactivo de inteligencia crediticia · Árboles CART y política de tarjetas
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-[2.15rem] font-bold tracking-tight leading-[1.15] text-[#F0F7FF] text-balance">
            Inteligencia que se convierte en decisiones
          </h1>
          <p className="text-sm text-[#CBD5E1] max-w-2xl leading-relaxed">
            Comprende cómo un árbol de decisión transforma señales previas a la solicitud en
            estimaciones transparentes de riesgo, alertas por umbral y propuestas ilustrativas de
            tarjetas de crédito bajo reglas humanas verificables.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onGoToModule('construye')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] hover:brightness-110 transition-all shadow-[0_0_20px_-4px_rgba(37,229,242,0.5)] whitespace-nowrap shrink-0"
            >
              <GitBranch className="w-4 h-4" aria-hidden="true" />
              <span>Explorar árbol</span>
            </button>
            <button
              type="button"
              onClick={() => onGoToModule('simula')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border border-[#9C6BFF]/50 bg-[#101A32]/85 text-[#F0F7FF] hover:border-[#25E5F2] hover:bg-[#162544] transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-4 h-4 text-[#9C6BFF]" aria-hidden="true" />
              <span>Simular tarjeta</span>
            </button>
          </div>
        </div>

        {/* Ilustración SVG holográfica decorativa: cerebro abstracto + nodos luminosos + tarjeta abstracta */}
        <div
          aria-hidden="true"
          className="hidden lg:flex lg:col-span-5 flex-col items-end justify-center pointer-events-none select-none"
        >
          <svg
            viewBox="0 0 420 185"
            className="w-full max-w-[400px] h-[175px]"
            fill="none"
          >
            <defs>
              <linearGradient id="heroCyanViolet" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#25E5F2" />
                <stop offset="100%" stopColor="#9C6BFF" />
              </linearGradient>
              <linearGradient id="heroCardGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#122146" />
                <stop offset="55%" stopColor="#21164B" />
                <stop offset="100%" stopColor="#0C2E42" />
              </linearGradient>
            </defs>

            {/* Circuitos de fondo */}
            <path
              d="M20 92 H78 L98 62 H150 M32 130 H88 L110 148 H165 M55 44 H110 L130 28 H175"
              stroke="#25E5F2"
              strokeOpacity="0.24"
              strokeWidth="1.2"
            />

            {/* Núcleo / cerebro holográfico abstracto */}
            <circle cx="102" cy="92" r="46" stroke="#25E5F2" strokeOpacity="0.28" strokeDasharray="4 4" />
            <circle cx="102" cy="92" r="34" fill="#101A32" fillOpacity="0.85" stroke="url(#heroCyanViolet)" strokeWidth="1.6" />
            {/* Hemisferios y sinapsis */}
            <path
              d="M102 64 C84 64, 74 78, 76 92 C74 106, 84 120, 102 120 M102 64 C120 64, 130 78, 128 92 C130 106, 120 120, 102 120"
              stroke="#25E5F2"
              strokeWidth="1.4"
              strokeOpacity="0.85"
            />
            <path
              d="M84 82 Q96 76 102 88 Q112 76 120 84 M82 100 Q94 108 102 96 Q112 108 122 98"
              stroke="#9C6BFF"
              strokeWidth="1.3"
            />
            <circle cx="86" cy="82" r="2.6" fill="#25E5F2" />
            <circle cx="118" cy="84" r="2.6" fill="#25E5F2" />
            <circle cx="102" cy="92" r="3.2" fill="#9C6BFF" />
            <circle cx="88" cy="103" r="2.4" fill="#9C6BFF" />
            <circle cx="116" cy="102" r="2.4" fill="#25E5F2" />

            {/* Conexión hacia nodos de árbol simbólico */}
            <path
              d="M136 92 C164 92, 168 56, 196 56 M136 92 C164 92, 168 128, 196 128"
              stroke="url(#heroCyanViolet)"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />
            <rect x="196" y="42" width="52" height="28" rx="6" fill="#101A32" stroke="#25E5F2" strokeOpacity="0.6" />
            <line x1="206" y1="53" x2="238" y2="53" stroke="#25E5F2" strokeWidth="2" strokeLinecap="round" />
            <line x1="206" y1="60" x2="228" y2="60" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

            <rect x="196" y="114" width="52" height="28" rx="6" fill="#101A32" stroke="#9C6BFF" strokeOpacity="0.6" />
            <line x1="206" y1="125" x2="236" y2="125" stroke="#9C6BFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="206" y1="132" x2="226" y2="132" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" />

            {/* Conexión a tarjeta abstracta */}
            <path
              d="M248 56 C272 56, 272 92, 294 92 M248 128 C272 128, 272 92, 294 92"
              stroke="#25E5F2"
              strokeOpacity="0.45"
              strokeWidth="1.3"
            />

            {/* Tarjeta abstracta sin números reales ni marcas */}
            <rect
              x="294"
              y="52"
              width="114"
              height="74"
              rx="10"
              fill="url(#heroCardGrad)"
              stroke="url(#heroCyanViolet)"
              strokeWidth="1.5"
            />
            <rect x="306" y="66" width="18" height="13" rx="3" fill="#25E5F2" fillOpacity="0.3" stroke="#25E5F2" strokeWidth="1" />
            <line x1="306" y1="95" x2="364" y2="95" stroke="#F0F7FF" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
            <line x1="306" y1="106" x2="342" y2="106" stroke="#9C6BFF" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
            <circle cx="388" cy="70" r="6" fill="#25E5F2" fillOpacity="0.35" />
            <circle cx="395" cy="70" r="6" fill="#9C6BFF" fillOpacity="0.35" />
          </svg>
          <span className="text-[11px] text-[#8FA3C7] pr-1">
            Visual de IA decorativa · El motor analítico usa árboles CART simbólicos
          </span>
        </div>
      </div>

      {/* Aviso móvil persistente compacto */}
      <div className="md:hidden relative z-10 px-4 py-2 bg-[#0B1328] border-t border-[#25E5F2]/15 text-[11px] text-[#B8C7E0]">
        Uso educativo · Perfiles sintéticos · No constituye una decisión crediticia real
      </div>
    </header>
  );
}
