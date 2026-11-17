import { useMemo, useState } from 'react';
import { CheckCircle2, HelpCircle, RotateCcw, XCircle } from 'lucide-react';
import { buildPracticeQuestions, PracticeQuestion } from '../data/educationalContent';
import { TreeNode } from '../types/credit';

export interface QuizAnswerState {
  selectedOptionId?: string;
  numericInput?: string;
  checked: boolean;
  isCorrect: boolean;
  showHint?: boolean;
}

interface Module8PracticaProps {
  currentRoot: TreeNode;
  alertThreshold: number;
  answers: Record<string, QuizAnswerState>;
  onChangeAnswers: (next: Record<string, QuizAnswerState>) => void;
}

export function Module8Practica({
  currentRoot,
  alertThreshold,
  answers,
  onChangeAnswers,
}: Module8PracticaProps) {
  const questions = useMemo(
    () => buildPracticeQuestions(currentRoot, alertThreshold),
    [currentRoot, alertThreshold],
  );

  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'incorrect'>('all');

  const stats = useMemo(() => {
    let answered = 0;
    let correct = 0;
    for (const q of questions) {
      const a = answers[q.id];
      if (a?.checked) {
        answered += 1;
        if (a.isCorrect) correct += 1;
      }
    }
    return { answered, correct, total: questions.length };
  }, [questions, answers]);

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      const a = answers[q.id];
      if (filterMode === 'pending') return !a?.checked;
      if (filterMode === 'incorrect') return a?.checked && !a.isCorrect;
      return true;
    });
  }, [questions, answers, filterMode]);

  const handleSelectOption = (qId: string, optId: string) => {
    const existing = answers[qId];
    if (existing?.checked) return;
    onChangeAnswers({
      ...answers,
      [qId]: {
        ...(existing ?? { checked: false, isCorrect: false }),
        selectedOptionId: optId,
      },
    });
  };

  const handleNumericChange = (qId: string, val: string) => {
    const existing = answers[qId];
    if (existing?.checked) return;
    onChangeAnswers({
      ...answers,
      [qId]: {
        ...(existing ?? { checked: false, isCorrect: false }),
        numericInput: val,
      },
    });
  };

  const handleCheck = (q: PracticeQuestion) => {
    const cur = answers[q.id];
    if (!cur || cur.checked) return;

    let isCorrect = false;
    if (q.type === 'choice') {
      if (!cur.selectedOptionId) return;
      isCorrect = cur.selectedOptionId === q.correctOptionId;
    } else {
      const raw = (cur.numericInput ?? '').replace(',', '.').trim();
      const parsed = Number(raw);
      if (!raw || !Number.isFinite(parsed) || typeof q.correctNumber !== 'number') return;
      const tol = q.tolerance ?? 0.5;
      isCorrect = Math.abs(parsed - q.correctNumber) <= tol;
    }

    onChangeAnswers({
      ...answers,
      [q.id]: {
        ...cur,
        checked: true,
        isCorrect,
      },
    });
  };

  const handleToggleHint = (qId: string) => {
    const cur = answers[qId] ?? { checked: false, isCorrect: false };
    onChangeAnswers({
      ...answers,
      [qId]: {
        ...cur,
        showHint: !cur.showHint,
      },
    });
  };

  const handleReset = () => {
    onChangeAnswers({});
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <p className="text-xs font-medium text-[#25E5F2]">
            Módulo 08 · Evaluación formativa con retroalimentación inmediata
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F0F7FF] text-balance">
            Practica: 12 retos sobre árboles, umbral, política y costos
          </h2>
          <p className="text-sm sm:text-base text-[#CBD5E1] leading-relaxed">
            Ninguna respuesta viene preseleccionada. Cada pregunta indica si corresponde a un
            ejemplo fijo o si se calcula sobre el árbol actual de BancoLab. El puntaje no se
            duplica al comprobar.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-[#25E5F2]/30 bg-[#101A32] text-[#F0F7FF] hover:border-[#25E5F2] whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
          <span>Reiniciar práctica</span>
        </button>
      </header>

      {/* Marcador y filtros */}
      <section className="lab-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs text-[#94A3B8]">Aciertos comprobados</p>
            <p className="font-mono-num text-2xl font-bold text-[#25E5F2]">
              {stats.correct} / {stats.total}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Respondidas</p>
            <p className="font-mono-num text-2xl font-bold text-[#F0F7FF]">
              {stats.answered} / {stats.total}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#080F22] border border-[#25E5F2]/20 rounded-lg">
          {[
            { id: 'all', label: 'Todas (12)' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'incorrect', label: 'Por repasar' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id as 'all' | 'pending' | 'incorrect')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterMode === tab.id
                  ? 'bg-gradient-to-r from-[#25E5F2]/25 to-[#9C6BFF]/25 text-[#F0F7FF] border border-[#25E5F2]/50'
                  : 'text-[#94A3B8] hover:text-[#F0F7FF]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* Lista de preguntas */}
      <section className="space-y-5">
        {visibleQuestions.length === 0 ? (
          <div className="lab-panel rounded-xl p-8 text-center text-sm text-[#94A3B8]">
            No hay preguntas en esta vista de filtro.
          </div>
        ) : (
          visibleQuestions.map((q) => {
            const state = answers[q.id];
            const isChecked = state?.checked ?? false;
            const canCheck =
              !isChecked &&
              (q.type === 'choice'
                ? Boolean(state?.selectedOptionId)
                : Boolean(state?.numericInput && state.numericInput.trim().length > 0));

            return (
              <article
                key={q.id}
                className="lab-panel rounded-xl p-6 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#94A3B8]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-bold text-[#F0F7FF]">
                      Pregunta {String(q.number).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        q.sourceLabel === 'Derivada del árbol actual'
                          ? 'font-semibold text-[#25E5F2]'
                          : 'text-[#C4B5FD]'
                      }
                    >
                      {q.sourceLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleHint(q.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#25E5F2] hover:underline whitespace-nowrap shrink-0"
                  >
                    <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{state?.showHint ? 'Ocultar ayuda' : 'Ver ayuda contextual'}</span>
                  </button>
                </div>

                <h3 className="text-base font-semibold text-[#F0F7FF] leading-snug">
                  {q.prompt}
                </h3>

                {state?.showHint && (
                  <p className="rounded-lg border border-[#9C6BFF]/35 bg-[#080F22] px-3.5 py-2.5 text-xs text-[#CBD5E1]">
                    <strong className="text-[#C4B5FD]">Pista:</strong> {q.hint}
                  </p>
                )}

                {q.type === 'choice' && q.options ? (
                  <div className="space-y-2" role="radiogroup" aria-label={`Opciones pregunta ${q.number}`}>
                    {q.options.map((opt) => {
                      const isSelected = state?.selectedOptionId === opt.id;
                      const isCorrectOption = opt.id === q.correctOptionId;
                      let optionStyle =
                        'border-[#25E5F2]/20 bg-[#080F22] text-[#F0F7FF] hover:border-[#25E5F2]/60 hover:bg-[#101A32]';
                      if (isChecked) {
                        if (isCorrectOption) {
                          optionStyle = 'border-[#25E5F2] bg-[#0C2535] text-[#F0F7FF]';
                        } else if (isSelected && !isCorrectOption) {
                          optionStyle = 'border-[#FB7185] bg-[#2A1019] text-[#F0F7FF]';
                        }
                      } else if (isSelected) {
                        optionStyle = 'border-[#25E5F2] bg-[#122244] text-[#F0F7FF]';
                      }

                      return (
                        <label
                          key={opt.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors ${optionStyle}`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={opt.id}
                            checked={isSelected}
                            disabled={isChecked}
                            onChange={() => handleSelectOption(q.id, opt.id)}
                            className="mt-0.5 accent-[#25E5F2]"
                          />
                          <span className="leading-snug">{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor={`num-${q.id}`} className="text-xs font-medium text-[#CBD5E1]">
                      Tu respuesta ({q.unit}):
                    </label>
                    <input
                      id={`num-${q.id}`}
                      type="text"
                      inputMode="decimal"
                      disabled={isChecked}
                      value={state?.numericInput ?? ''}
                      onChange={(e) => handleNumericChange(q.id, e.target.value)}
                      placeholder="Ingresa un número"
                      className="w-40 px-3 py-2 text-sm font-mono-num rounded-lg border border-[#25E5F2]/30 bg-[#080F22] text-[#F0F7FF] placeholder:text-[#64748B]"
                    />
                    <span className="text-xs text-[#94A3B8]">
                      Tolerancia explícita: ±{q.tolerance} {q.unit}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    disabled={!canCheck}
                    onClick={() => handleCheck(q)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-[#25E5F2] to-[#0EA5E9] text-[#050A18] disabled:opacity-40 hover:brightness-110 whitespace-nowrap shrink-0"
                  >
                    {isChecked ? 'Respuesta comprobada' : 'Comprobar'}
                  </button>
                </div>

                {isChecked && (
                  <div
                    className={`rounded-lg border p-4 text-xs space-y-1 ${
                      state?.isCorrect
                        ? 'border-[#25E5F2]/60 bg-[#0C2535] text-[#F0F7FF]'
                        : 'border-[#FB7185]/60 bg-[#2A1019] text-[#F0F7FF]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      {state?.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#25E5F2]" aria-hidden="true" />
                          <span className="text-[#25E5F2]">Correcto</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-[#FB7185]" aria-hidden="true" />
                          <span className="text-[#FDA4AF]">
                            Incorrecto
                            {q.type === 'numeric' && typeof q.correctNumber === 'number'
                              ? ` · Valor esperado: ${q.correctNumber} ${q.unit} (±${q.tolerance})`
                              : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[#CBD5E1] leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
