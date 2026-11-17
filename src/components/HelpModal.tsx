import { BookOpen, Download, ExternalLink, RotateCcw, X } from 'lucide-react';

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
  onExportConfigJson: () => void;
  onResetAll: () => void;
}

export function HelpModal({
  open,
  onClose,
  onExportConfigJson,
  onResetAll,
}: HelpModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617]/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="lab-panel w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl p-6 text-[#F0F7FF]">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#25E5F2]/20">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#25E5F2]" aria-hidden="true" />
            <h2 id="help-modal-title" className="text-lg font-semibold text-[#F0F7FF]">
              Guía metodológica y fuentes de BancoLab
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-[#25E5F2]/25 bg-[#0B1328] text-[#CBD5E1] hover:border-[#25E5F2] hover:text-[#F0F7FF]"
            aria-label="Cerrar ventana de ayuda"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5 py-5 text-sm text-[#CBD5E1] leading-relaxed">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#F0F7FF]">
              Tres capas separadas en toda la aplicación
            </h3>
            <ul className="space-y-1.5 list-disc pl-5">
              <li>
                <strong className="text-[#25E5F2]">A. Árbol de clasificación aprendido (CART):</strong>{' '}
                aprende cortes binarios exclusivamente sobre el conjunto de entrenamiento sintético
                para estimar la frecuencia empírica de incumplimiento a 12 meses en cada hoja.
              </li>
              <li>
                <strong className="text-[#FBBF24]">B. Umbral de probabilidad (alerta):</strong>{' '}
                convierte la proporción de la hoja en alerta binaria (p_hoja &gt;= umbral). Cambiar
                el umbral no modifica el árbol ni reentrena sus divisiones.
              </li>
              <li>
                <strong className="text-[#C4B5FD]">C. Política comercial hipotética manual:</strong>{' '}
                reglas explícitas escritas a mano (carga máxima, historial mínimo, tramos para
                Clásica/Oro/Platinum y tope de cupo). Un árbol de riesgo por sí solo no define
                productos ni aprueba créditos reales.
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-[#9C6BFF]/30 bg-[#0B1328]/90 p-4 space-y-2">
            <h3 className="text-sm font-semibold text-[#F0F7FF]">
              Referencias técnicas oficiales y alcance de implementación
            </h3>
            <p className="text-xs text-[#CBD5E1]">
              La lógica de BancoLab es una implementación didáctica escrita desde cero en
              TypeScript/JavaScript para fines educativos. <strong className="text-[#F0F7FF]">No utiliza scikit-learn</strong>{' '}
              ni pretende equivalencia numérica exacta con dicha biblioteca.
            </p>
            <div className="flex flex-col gap-1.5 pt-1">
              <a
                href="https://scikit-learn.org/stable/modules/tree.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#25E5F2] hover:underline"
              >
                <span>Scikit-learn · Documentación conceptual sobre árboles de decisión</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <a
                href="https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#25E5F2] hover:underline"
              >
                <span>Scikit-learn · Referencia de DecisionTreeClassifier</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#25E5F2]/15">
            <button
              type="button"
              onClick={onExportConfigJson}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] hover:brightness-110 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Exportar configuración y reglas (JSON)</span>
            </button>
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg border border-[#FB7185]/40 bg-[#2A1019] text-[#FDA4AF] hover:bg-[#3B1522] whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Restablecer laboratorio</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
