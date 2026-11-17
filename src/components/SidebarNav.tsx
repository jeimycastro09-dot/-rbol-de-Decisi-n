import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  GitBranch,
  HelpCircle,
  Scale,
  UserCheck,
} from 'lucide-react';
import { ModuleId } from '../types/credit';

export interface NavItem {
  id: ModuleId;
  number: string;
  label: string;
  subtitle: string;
  icon: typeof BookOpen;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'comprende',
    number: '01',
    label: 'Comprende el árbol',
    subtitle: 'Conceptos y recorrido',
    icon: BookOpen,
  },
  {
    id: 'datos',
    number: '02',
    label: 'Datos bancarios',
    subtitle: '240 perfiles sintéticos',
    icon: Database,
  },
  {
    id: 'construye',
    number: '03',
    label: 'Construye y aprende',
    subtitle: 'Algoritmo CART real',
    icon: GitBranch,
  },
  {
    id: 'simula',
    number: '04',
    label: 'Simula una solicitud',
    subtitle: 'Riesgo, umbral y política',
    icon: UserCheck,
  },
  {
    id: 'compara',
    number: '05',
    label: 'Compara escenarios',
    subtitle: 'Dos perfiles lado a lado',
    icon: Scale,
  },
  {
    id: 'evalua',
    number: '06',
    label: 'Evalúa y sobreajuste',
    subtitle: 'Prueba, métricas e importancia',
    icon: BarChart3,
  },
  {
    id: 'negocio',
    number: '07',
    label: 'Negocio y riesgo',
    subtitle: 'Costos FP/FN y gobernanza',
    icon: BriefcaseBusiness,
  },
  {
    id: 'practica',
    number: '08',
    label: 'Practica',
    subtitle: '12 retos interactivos',
    icon: CheckCircle2,
  },
];

interface SidebarNavProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  onOpenHelp: () => void;
  quizScore: { answered: number; correct: number; total: number };
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarNav({
  activeModule,
  onSelectModule,
  onOpenHelp,
  quizScore,
  mobileOpen,
  onCloseMobile,
}: SidebarNavProps) {
  const navContent = (
    <div className="flex flex-col h-full bg-[#070E22]/95 backdrop-blur-md text-[#F0F7FF]">
      {/* Logo estilizado de árbol/nodos */}
      <div className="px-5 pt-6 pb-5 border-b border-[#25E5F2]/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#25E5F2]/20 to-[#9C6BFF]/30 border border-[#25E5F2]/50 flex items-center justify-center shrink-0 shadow-[0_0_16px_-4px_rgba(37,229,242,0.45)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="12" y1="6" x2="6" y2="17" stroke="#25E5F2" strokeWidth="1.8" />
              <line x1="12" y1="6" x2="18" y2="17" stroke="#9C6BFF" strokeWidth="1.8" />
              <circle cx="12" cy="5.5" r="2.6" fill="#25E5F2" />
              <circle cx="6" cy="17.5" r="2.4" fill="#25E5F2" />
              <circle cx="18" cy="17.5" r="2.4" fill="#9C6BFF" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold tracking-tight text-[#F0F7FF] truncate">
              BancoLab
            </p>
            <p className="text-xs text-[#8FA3C7] truncate">
              Árboles de decisión
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5" aria-label="Módulos de aprendizaje">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectModule(item.id);
                onCloseMobile();
              }}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border ${
                isActive
                  ? 'bg-gradient-to-r from-[#25E5F2]/18 to-[#9C6BFF]/22 border-[#25E5F2]/60 text-[#F0F7FF] shadow-[0_0_18px_-8px_rgba(37,229,242,0.75)]'
                  : 'border-transparent text-[#B8C7E0] hover:bg-[#101A32] hover:border-[#25E5F2]/20 hover:text-[#F0F7FF]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#25E5F2]' : 'text-[#8FA3C7]'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight truncate">
                  {item.number}. {item.label}
                </div>
                <div
                  className={`text-xs truncate mt-0.5 ${
                    isActive ? 'text-[#B8C7E0]' : 'text-[#7A8FB3]'
                  }`}
                >
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#25E5F2]/15 space-y-3">
        <div className="rounded-lg border border-[#25E5F2]/20 bg-[#101A32]/90 px-3 py-2.5 text-xs text-[#CBD5E1] space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Progreso en práctica</span>
            <span className="font-mono-num font-semibold text-[#25E5F2]">
              {quizScore.correct}/{quizScore.total}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#050A18] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#25E5F2] to-[#9C6BFF]"
              style={{
                width: `${(quizScore.answered / Math.max(1, quizScore.total)) * 100}%`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenHelp}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-[#25E5F2]/30 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] hover:bg-[#162544] transition-colors whitespace-nowrap shrink-0"
        >
          <HelpCircle className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
          <span>Ayuda, fuentes y JSON</span>
        </button>

        <p className="text-[11px] leading-snug text-[#8FA3C7]">
          Uso educativo · Perfiles sintéticos · No constituye una decisión crediticia real
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 border-r border-[#25E5F2]/15">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#020617]/75 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 border-r border-[#25E5F2]/25">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
