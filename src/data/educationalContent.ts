import { ApplicantFeatures, SyntheticProfile, TreeNode } from '../types/credit';
import { predictWithTree } from '../algorithms/cart';
import { formatCOP, formatPct } from '../utils/format';

export interface ProfilePreset {
  id: string;
  label: string;
  summary: string;
  features: ApplicantFeatures;
}

export const APPLICANT_PRESETS: ProfilePreset[] = [
  {
    id: 'solido',
    label: 'Historial sólido',
    summary: 'Ingreso alto, carga baja, sin mora previa y trayectoria extensa.',
    features: {
      ingresoMensualCOP: 9_600_000,
      cargaFinancieraPct: 18,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 96,
      utilizacionCuposPct: 22,
    },
  },
  {
    id: 'capacidad-ajustada',
    label: 'Capacidad ajustada',
    summary: 'Buen historial sin mora, pero compromisos mensuales altos (>40%).',
    features: {
      ingresoMensualCOP: 5_400_000,
      cargaFinancieraPct: 52,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 60,
      utilizacionCuposPct: 48,
    },
  },
  {
    id: 'mora-previa',
    label: 'Mora previa relevante',
    summary: 'Atraso previo de 45 días y alta utilización de cupos rotativos.',
    features: {
      ingresoMensualCOP: 4_200_000,
      cargaFinancieraPct: 42,
      maxDiasMoraPrevios: 45,
      antiguedadHistorialMeses: 42,
      utilizacionCuposPct: 84,
    },
  },
  {
    id: 'historial-corto',
    label: 'Historial corto',
    summary: 'Ingreso medio y carga controlada, pero menos de 12 meses de historial.',
    features: {
      ingresoMensualCOP: 4_800_000,
      cargaFinancieraPct: 24,
      maxDiasMoraPrevios: 0,
      antiguedadHistorialMeses: 7,
      utilizacionCuposPct: 28,
    },
  },
  {
    id: 'cercano-umbral',
    label: 'Cercano a umbral',
    summary: 'Zona intermedia donde pequeños cambios de variable o umbral cambian la alerta.',
    features: {
      ingresoMensualCOP: 3_600_000,
      cargaFinancieraPct: 36,
      maxDiasMoraPrevios: 12,
      antiguedadHistorialMeses: 30,
      utilizacionCuposPct: 62,
    },
  },
];

/**
 * Mini conjunto manual independiente de 10 observaciones sintéticas
 * para ilustrar paso a paso el cálculo ponderado de Gini y ganancia en el Módulo 3.
 */
export const MINI_MANUAL_DATASET: SyntheticProfile[] = [
  { id: 'M-01', ingresoMensualCOP: 7_000_000, cargaFinancieraPct: 18, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 72, utilizacionCuposPct: 20, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.08, split: 'train' },
  { id: 'M-02', ingresoMensualCOP: 5_500_000, cargaFinancieraPct: 22, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 54, utilizacionCuposPct: 25, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.10, split: 'train' },
  { id: 'M-03', ingresoMensualCOP: 4_800_000, cargaFinancieraPct: 28, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 48, utilizacionCuposPct: 35, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.14, split: 'train' },
  { id: 'M-04', ingresoMensualCOP: 6_200_000, cargaFinancieraPct: 32, maxDiasMoraPrevios: 5, antiguedadHistorialMeses: 60, utilizacionCuposPct: 40, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.19, split: 'train' },
  { id: 'M-05', ingresoMensualCOP: 3_200_000, cargaFinancieraPct: 38, maxDiasMoraPrevios: 10, antiguedadHistorialMeses: 30, utilizacionCuposPct: 55, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.42, split: 'train' },
  { id: 'M-06', ingresoMensualCOP: 3_900_000, cargaFinancieraPct: 42, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 40, utilizacionCuposPct: 60, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.31, split: 'train' },
  { id: 'M-07', ingresoMensualCOP: 2_800_000, cargaFinancieraPct: 48, maxDiasMoraPrevios: 25, antiguedadHistorialMeses: 18, utilizacionCuposPct: 78, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.65, split: 'train' },
  { id: 'M-08', ingresoMensualCOP: 2_400_000, cargaFinancieraPct: 54, maxDiasMoraPrevios: 35, antiguedadHistorialMeses: 14, utilizacionCuposPct: 82, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.78, split: 'train' },
  { id: 'M-09', ingresoMensualCOP: 4_100_000, cargaFinancieraPct: 58, maxDiasMoraPrevios: 45, antiguedadHistorialMeses: 24, utilizacionCuposPct: 88, incumplimiento12m: 1, probabilidadLatenteSimulada: 0.84, split: 'train' },
  { id: 'M-10', ingresoMensualCOP: 5_000_000, cargaFinancieraPct: 46, maxDiasMoraPrevios: 0, antiguedadHistorialMeses: 84, utilizacionCuposPct: 30, incumplimiento12m: 0, probabilidadLatenteSimulada: 0.22, split: 'train' },
];

/**
 * Mini árbol pedagógico fijo para el Módulo 1 ("Comprende el árbol").
 * Permite explicar raíz, nodos de decisión, ramas y hojas antes de introducir fórmulas.
 */
export const PEDAGOGICAL_MINI_TREE: TreeNode = {
  id: 'P0',
  depth: 0,
  isLeaf: false,
  n: 100,
  positivos: 28,
  negativos: 72,
  pIncumplimiento: 0.28,
  claseMayoria: 0,
  impurity: 0.4032,
  feature: 'cargaFinancieraPct',
  featureLabel: 'Carga financiera',
  threshold: 40,
  gain: 0.112,
  left: {
    id: 'P0L',
    depth: 1,
    isLeaf: false,
    n: 64,
    positivos: 8,
    negativos: 56,
    pIncumplimiento: 0.125,
    claseMayoria: 0,
    impurity: 0.2188,
    feature: 'maxDiasMoraPrevios',
    featureLabel: 'Mora previa (días)',
    threshold: 15,
    gain: 0.045,
    left: {
      id: 'P0LL',
      depth: 2,
      isLeaf: true,
      n: 52,
      positivos: 3,
      negativos: 49,
      pIncumplimiento: 3 / 52,
      claseMayoria: 0,
      impurity: 0.1087,
    },
    right: {
      id: 'P0LR',
      depth: 2,
      isLeaf: true,
      n: 12,
      positivos: 5,
      negativos: 7,
      pIncumplimiento: 5 / 12,
      claseMayoria: 0,
      impurity: 0.4861,
    },
  },
  right: {
    id: 'P0R',
    depth: 1,
    isLeaf: true,
    n: 36,
    positivos: 20,
    negativos: 16,
    pIncumplimiento: 20 / 36,
    claseMayoria: 1,
    impurity: 0.4938,
  },
};

export interface PedagogicalNodeNote {
  title: string;
  statNote: string;
  bankNote: string;
}

export const PEDAGOGICAL_NODE_NOTES: Record<string, PedagogicalNodeNote> = {
  P0: {
    title: 'Nodo raíz (profundidad 0)',
    statNote: 'Contiene las 100 solicitudes de ejemplo (28 incumplieron y 72 cumplieron). Aquí el algoritmo busca la pregunta binaria que más separe ambos grupos.',
    bankNote: 'Punto de partida de la evaluación estadística: todavía no hemos segmentado por carga financiera ni historial de mora.',
  },
  P0L: {
    title: 'Nodo de decisión interno (profundidad 1)',
    statNote: 'Recibe los 64 casos con carga <= 40%. La proporción de incumplimiento baja de 28% a 12,5%, pero aún se puede refinar preguntando por mora previa.',
    bankNote: 'Solicitantes con compromisos financieros moderados. El árbol verifica si hubo atrasos previos relevantes.',
  },
  P0LL: {
    title: 'Hoja terminal de bajo riesgo relativo (profundidad 2)',
    statNote: 'Agrupa 52 casos de entrenamiento con 3 incumplimientos: p_hoja = 3/52 = 5,8%. No significa 0% de riesgo, sino menor frecuencia histórica.',
    bankNote: 'Si el umbral de alerta es 30%, no activa alerta de riesgo; luego la política comercial revisará historial, producto y cupo.',
  },
  P0LR: {
    title: 'Hoja terminal intermedia (profundidad 2)',
    statNote: 'Agrupa 12 casos con carga <= 40% pero mora > 15 días: p_hoja = 5/12 = 41,7%. Con umbral 30%, supera el corte y dispara alerta.',
    bankNote: 'Muestra por qué el umbral de alerta importa: la mayoría simple (7 de 12) cumplió, pero 41,7% de frecuencia amerita revisión de riesgo.',
  },
  P0R: {
    title: 'Hoja terminal de alta frecuencia de incumplimiento (profundidad 1)',
    statNote: 'Agrupa 36 casos con carga > 40%, de los cuales 20 incumplieron: p_hoja = 20/36 = 55,6%.',
    bankNote: 'Concentra casos de alta presión sobre el ingreso. Activa revisión de riesgo cuando el umbral es inferior a 55,6%.',
  },
};

export interface PracticeQuestion {
  id: string;
  number: number;
  topic: string;
  sourceLabel: 'Ejemplo fijo' | 'Derivada del árbol actual';
  type: 'choice' | 'numeric';
  prompt: string;
  options?: { id: string; text: string }[];
  correctOptionId?: string;
  correctNumber?: number;
  tolerance?: number;
  unit?: string;
  explanation: string;
  hint: string;
}

const FIXED_TRACE_CASE: ApplicantFeatures = {
  ingresoMensualCOP: 5_200_000,
  cargaFinancieraPct: 34,
  maxDiasMoraPrevios: 22,
  antiguedadHistorialMeses: 48,
  utilizacionCuposPct: 58,
};

export function buildPracticeQuestions(
  currentRoot: TreeNode,
  currentThreshold: number,
): PracticeQuestion[] {
  const livePred = predictWithTree(currentRoot, FIXED_TRACE_CASE, currentThreshold);
  const livePct = Math.round(livePred.pHoja * 1000) / 10;

  return [
    {
      id: 'q1',
      number: 1,
      topic: 'Anatomía del árbol',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'En un árbol de decisión, la raíz tiene profundidad 0. Si un registro responde dos preguntas (raíz y un nodo hijo) antes de llegar a su hoja final, ¿qué profundidad tiene esa hoja?',
      options: [
        { id: 'a', text: 'Profundidad 1' },
        { id: 'b', text: 'Profundidad 2' },
        { id: 'c', text: 'Profundidad 3' },
        { id: 'd', text: 'Profundidad 0' },
      ],
      correctOptionId: 'b',
      explanation:
        'La raíz está en profundidad 0; cada división desciende 1 nivel. Dos preguntas conducen a un nodo en profundidad 2.',
      hint: 'Cuenta cuántas aristas (ramas) recorre el registro desde la raíz (nivel 0) hasta la hoja.',
    },
    {
      id: 'q2',
      number: 2,
      topic: 'Matriz de confusión',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'En BancoLab la clase positiva (1) representa incumplimiento a 12 meses. Si un solicitante realmente NO incumple (cumple), pero el modelo con el umbral actual activa una alerta (predice 1), ¿qué celda de la matriz es?',
      options: [
        { id: 'a', text: 'Verdadero Positivo (TP)' },
        { id: 'b', text: 'Falso Negativo (FN)' },
        { id: 'c', text: 'Falso Positivo (FP)' },
        { id: 'd', text: 'Verdadero Negativo (TN)' },
      ],
      correctOptionId: 'c',
      explanation:
        'El evento real es Negativo (cumple = 0) y el modelo predijo Positivo (alerta de incumplimiento = 1). Por lo tanto es un Falso Positivo (FP), también llamado falsa alarma.',
      hint: 'Recuerda: "Falso" significa que la predicción se equivocó; "Positivo" indica qué predijo el modelo.',
    },
    {
      id: 'q3',
      number: 3,
      topic: 'Recorrido en árbol actual',
      sourceLabel: 'Derivada del árbol actual',
      type: 'numeric',
      prompt: `Evalúa este perfil en el árbol actualmente entrenado de BancoLab: ingreso ${formatCOP(
        FIXED_TRACE_CASE.ingresoMensualCOP,
      )}, carga ${FIXED_TRACE_CASE.cargaFinancieraPct}%, mora previa ${
        FIXED_TRACE_CASE.maxDiasMoraPrevios
      } días, historial ${FIXED_TRACE_CASE.antiguedadHistorialMeses} meses y utilización ${
        FIXED_TRACE_CASE.utilizacionCuposPct
      }%. ¿Cuál es la proporción de incumplimiento (en %, de 0 a 100) de la hoja a la que llega?`,
      correctNumber: livePct,
      tolerance: 0.6,
      unit: '%',
      explanation: `Siguiendo la ruta real del árbol actual (${
        livePred.route.length > 0
          ? livePred.route.map((s) => s.decisionText).join(' -> ')
          : 'raíz sin divisiones'
      }), el perfil cae en la hoja ${livePred.leafNodeId} con ${livePred.leafPositivos} incumplidores de ${
        livePred.leafN
      } registros, es decir ${formatPct(livePred.pHoja)}.`,
      hint: 'Puedes revisar el árbol del Módulo 3 o ingresar estos 5 valores en el Módulo 4 ("Simula una solicitud") para observar la hoja exacta.',
    },
    {
      id: 'q4',
      number: 4,
      topic: 'Gini y ganancia ponderada',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'Un nodo padre con n=10 tiene 4 incumplidores y 6 cumplidores (Gini = 0,48). Se divide en izquierda (n=6, 0 incumplidores, Gini = 0) y derecha (n=4, 4 incumplidores, Gini = 0). ¿Cuál es la ganancia de Gini?',
      options: [
        { id: 'a', text: '0,48' },
        { id: 'b', text: '0,24' },
        { id: 'c', text: '0,00' },
        { id: 'd', text: '0,60' },
      ],
      correctOptionId: 'a',
      explanation:
        'Ganancia = G_padre - (6/10)*G_izq - (4/10)*G_der = 0,48 - 0,6*(0) - 0,4*(0) = 0,48. Es una separación perfecta en dos hojas puras.',
      hint: 'Calcula primero la impureza ponderada de las hojas hijas y réstasela al Gini del nodo padre.',
    },
    {
      id: 'q5',
      number: 5,
      topic: 'Probabilidad de hoja',
      sourceLabel: 'Ejemplo fijo',
      type: 'numeric',
      prompt:
        'Una hoja contiene n = 20 registros de entrenamiento, de los cuales 3 presentaron incumplimiento a 12 meses. ¿Qué proporción estimada (en %, entre 0 y 100) asignará el árbol a un nuevo solicitante que caiga en esa hoja?',
      correctNumber: 15,
      tolerance: 0.5,
      unit: '%',
      explanation:
        'La proporción empírica de la hoja es 3 / 20 = 0,15, es decir 15%. Recuerda que es una frecuencia muestral de entrenamiento, no una PD calibrada ni una certeza.',
      hint: 'Divide el número de incumplidores de la hoja entre el total n de registros en esa hoja y multiplica por 100.',
    },
    {
      id: 'q6',
      number: 6,
      topic: 'Umbral de alerta',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'Si en el Módulo 4 bajas el umbral de alerta del 40% al 20% sin volver a entrenar el modelo, ¿qué cambia exactamente?',
      options: [
        { id: 'a', text: 'Se recalculan los cortes del árbol y aparecen nuevas ramas.' },
        { id: 'b', text: 'Cambia la proporción p de cada hoja, pero no la alerta.' },
        { id: 'c', text: 'La estructura del árbol y p de cada hoja permanecen iguales; cambia qué hojas activan alerta positiva.' },
        { id: 'd', text: 'Se modifican automáticamente los topes de la tarjeta Platinum.' },
      ],
      correctOptionId: 'c',
      explanation:
        'El umbral de alerta (componente B) solo convierte la estimación continua p_hoja en alerta binaria (p_hoja >= umbral). No reentrena el árbol ni altera las proporciones de las hojas.',
      hint: 'Distingue entre el árbol aprendido (A) y la regla de decisión sobre p_hoja (B).',
    },
    {
      id: 'q7',
      number: 7,
      topic: 'Política comercial vs riesgo',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'Un solicitante cae en una hoja con p = 8% (debajo del umbral de alerta del 30%), pero tiene carga financiera de 48% y antigüedad de 24 meses. Según la política ilustrativa de BancoLab, ¿qué ocurre?',
      options: [
        { id: 'a', text: 'Recibe oferta automática de tarjeta Oro porque p < 30%.' },
        { id: 'b', text: 'Pasa a revisión de capacidad (sin oferta automática) por superar el límite manual de carga (> 40%).' },
        { id: 'c', text: 'El árbol CART cambia su corte de carga financiera al 48%.' },
        { id: 'd', text: 'Se le asigna un cupo negativo para compensar la deuda.' },
      ],
      correctOptionId: 'b',
      explanation:
        'El árbol de riesgo (A) no disparó alerta, pero la regla manual de política comercial (C) verifica carga <= 40% antes de proponer producto o cupo. Además, los cupos ilustrativos nunca son negativos.',
      hint: 'Revisa el orden de prioridad de las reglas hipotéticas en el Módulo 4.',
    },
    {
      id: 'q8',
      number: 8,
      topic: 'Sobreajuste',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        '¿Qué señal indica con mayor claridad que un árbol de profundidad alta está sufriendo sobreajuste (overfitting)?',
      options: [
        { id: 'a', text: 'Tiene un único nodo raíz sin divisiones.' },
        { id: 'b', text: 'Su desempeño mejora fuertemente en entrenamiento al crecer en profundidad, pero empeora o se estanca en el conjunto de prueba reservado.' },
        { id: 'c', text: 'Usa Gini en lugar de entropía.' },
        { id: 'd', text: 'La suma de importancias de variables da 1,0.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Al permitir muchas divisiones y hojas muy pequeñas, el árbol memoriza variaciones aleatorias del entrenamiento que no se repiten en datos nuevos de prueba.',
      hint: 'Compara las curvas de entrenamiento vs prueba en el Módulo 6.',
    },
    {
      id: 'q9',
      number: 9,
      topic: 'Fuga de información (data leakage)',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        '¿Por qué sería incorrecto entrenar el árbol usando la etiqueta "aprobado históricamente" o el "cupo otorgado después de aprobar" para predecir incumplimiento?',
      options: [
        { id: 'a', text: 'Porque TypeScript no soporta variables categóricas.' },
        { id: 'b', text: 'Porque mezcla decisiones humanas pasadas (sesgo de aprobación) o información posterior a la solicitud (fuga del futuro) con el riesgo real.' },
        { id: 'c', text: 'Porque haría que la entropía sea negativa.' },
        { id: 'd', text: 'Porque el árbol siempre tendría profundidad 1.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Un modelo de riesgo debe entrenarse solo con variables disponibles antes de la solicitud y contra un resultado observado (incumplimiento), nunca replicando ciegamente aprobaciones pasadas ni filtrando datos del futuro.',
      hint: 'Piensa en qué información existe antes de decidir y qué mide realmente el objetivo.',
    },
    {
      id: 'q10',
      number: 10,
      topic: 'Costos de FP y FN',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'Si en un portafolio hipotético un Falso Negativo (no alertar a quien incumple) cuesta $8.000.000 COP y un Falso Positivo (alertar innecesariamente a quien cumple) cuesta $300.000 COP, ¿qué tiende a ocurrir al comparar umbrales?',
      options: [
        { id: 'a', text: 'Siempre conviene subir el umbral al 80% para tener cero falsos positivos.' },
        { id: 'b', text: 'Reducir Falsos Negativos suele tener mucho peso económico, pero bajar demasiado el umbral dispara Falsos Positivos y fricción; hay que evaluar el costo total FP*cFP + FN*cFN.' },
        { id: 'c', text: 'El costo total no depende de la matriz de confusión.' },
        { id: 'd', text: 'Los Falsos Positivos cuestan más que los Falsos Negativos en este escenario.' },
      ],
      correctOptionId: 'b',
      explanation:
        'Aunque cada FN cuesta 26,7 veces más que un FP en este ejemplo hipotético, el equilibrio depende de cuántos FP y FN genere cada árbol bajo el umbral elegido.',
      hint: 'Observa el intercambio entre FP y FN y la fórmula total FP*cFP + FN*cFN.',
    },
    {
      id: 'q11',
      number: 11,
      topic: 'Cálculo de costo total',
      sourceLabel: 'Ejemplo fijo',
      type: 'numeric',
      prompt:
        'En el conjunto de prueba, un modelo produce FP = 10 y FN = 4. Si cFP = $300.000 COP y cFN = $8.000.000 COP, ¿cuál es el costo total hipotético en millones de COP (por ejemplo, escribe 35 si son $35.000.000)?',
      correctNumber: 35,
      tolerance: 0.1,
      unit: 'millones COP',
      explanation:
        'Costo total = (10 × $300.000) + (4 × $8.000.000) = $3.000.000 + $32.000.000 = $35.000.000 COP (35 millones).',
      hint: 'Multiplica FP × 0,3 millones y FN × 8 millones, luego suma ambos resultados.',
    },
    {
      id: 'q12',
      number: 12,
      topic: 'Importancia de variables',
      sourceLabel: 'Ejemplo fijo',
      type: 'choice',
      prompt:
        'La importancia de variables calculada por reducción ponderada de impureza en un árbol CART indica:',
      options: [
        { id: 'a', text: 'Cuánto cambia causalmente el riesgo si un cliente modifica esa variable.' },
        { id: 'b', text: 'El valor SHAP exacto para un cliente individual.' },
        { id: 'c', text: 'La contribución relativa de esa variable para reducir impureza en los cortes del entrenamiento (puede sesgarse hacia variables con muchos puntos de corte y no prueba causalidad).' },
        { id: 'd', text: 'La tasa de interés que debe cobrarse en la tarjeta.' },
      ],
      correctOptionId: 'c',
      explanation:
        'La reducción ponderada de impureza mide asociación dentro de los cortes elegidos en entrenamiento; favorece variables continuas con muchos cortes posibles y no equivale a causalidad ni a explicaciones locales tipo SHAP.',
      hint: 'Revisa las advertencias metodológicas del gráfico de importancia en el Módulo 6.',
    },
  ];
}
