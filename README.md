# BancoLab · Árboles de decisión

Aplicación web educativa interactiva en español diseñada para estudiantes y analistas que desean comprender desde cero cómo funciona un árbol de decisión binario (**CART**) y cómo puede apoyar —sin automatismos ciegos— la evaluación de solicitudes de riesgo y la propuesta ilustrativa de tarjetas de crédito.

> **Aviso:** Uso educativo · Perfiles sintéticos · No constituye una decisión crediticia real. No utiliza datos personales reales, atributos sensibles ni API externas.

---

## Separación explícita de tres capas

1. **A · Árbol de clasificación aprendido (CART):** Entrenado exclusivamente sobre el conjunto de entrenamiento sintético usando variables previas a la solicitud (`ingresoMensualCOP`, `cargaFinancieraPct`, `maxDiasMoraPrevios`, `antiguedadHistorialMeses`, `utilizacionCuposPct`) y la etiqueta sintética observada `incumplimiento_12m` (positivo = incumple, negativo = cumple). Nunca se entrena con etiquetas de "aprobado históricamente".
2. **B · Umbral de probabilidad (alerta):** Convierte la proporción empírica de la hoja (`p_hoja`) en alerta binaria (`p_hoja >= umbral`). Cambiar el umbral no altera la estructura del árbol ni inventa probabilidades.
3. **C · Política comercial hipotética manual:** Reglas escritas a mano (carga máxima, antigüedad mínima, tramos ilustrativos para Clásica/Oro/Platinum, topes editables y cálculo de cupo redondeado hacia abajo a $100.000 COP sin valores negativos). Un árbol de riesgo por sí solo no otorga productos ni aprueba créditos reales.

---

## Módulos incluidos

1. **01. Comprende el árbol:** Ejemplo intuitivo previo a las fórmulas, clasificación vs. regresión conceptual, anatomía (raíz = profundidad 0, ramas `<=` / `>`, hojas), mini árbol SVG interactivo y recorrido paso a paso.
2. **02. Datos bancarios:** 240 perfiles sintéticos reproducibles (Mulberry32 PRNG), fórmula generadora didáctica estocástica, partición estratificada ~70/30 entrenamiento/prueba, diccionario de variables, gráficos Plotly.js y descarga CSV.
3. **03. Construye y aprende:** Implementación pura en TypeScript de CART binario con criterio seleccionable (Gini o Entropía), tabla de mejores cortes en raíz, mini ejemplo manual de 10 observaciones, árbol SVG con pan/zoom/centrar y selector de ruta de registros.
4. **04. Simula una solicitud:** Edición de perfil ficticio con 5 presets contrastantes, separación visual entre estimación del árbol y política ilustrativa editable, umbral de alerta y tarjetas conceptuales sin marca comercial.
5. **05. Compara escenarios:** Dos perfiles lado a lado bajo el mismo modelo y política, tabla de diferencias y advertencia sobre asociación vs. causalidad.
6. **06. Evalúa y evita sobreajuste:** Matriz de confusión en prueba reservada (`[[TP, FN], [FP, TN]]`), manejo explícito de denominadores en cero, curvas reales de profundidad 1..5 (entrenamiento vs. prueba) e importancia por reducción ponderada de impureza.
7. **07. Negocio y riesgo:** Costos hipotéticos editables (`cFP`, `cFN`), comparación real entre árbol simple (prof. 2) y profundo (prof. 5), árbol de reglas manuales vs. árbol aprendido y principios de gobernanza.
8. **08. Practica:** 12 retos interactivos (selección múltiple y numéricos con tolerancia explícita), ayuda contextual y retroalimentación inmediata sin duplicación de puntaje.

---

## Estructura del proyecto

```text
src/
  algorithms/
    cart.ts              # Impureza Gini/Entropía, búsqueda determinista de splits, CART, métricas e importancia
    policy.ts            # Reglas hipotéticas de política comercial, cálculo de cupo y costos de error
  components/
    CreditCardVisual.tsx # Tarjetas conceptuales Clásica/Oro/Platinum
    HelpModal.tsx        # Guía metodológica, enlaces oficiales y exportación JSON
    InteractiveTreeSvg.tsx # Árbol SVG accesible con pan/zoom/centrar y resaltado de ruta
    PlotlyChart.tsx      # Envoltorio reactivo para plotly.js-dist-min
    SidebarNav.tsx       # Navegación lateral de los 8 módulos
  data/
    educationalContent.ts # Presets, mini conjunto manual (10 filas), árbol pedagógico y 12 preguntas
    syntheticGenerator.ts # PRNG Mulberry32, 240 perfiles, partición estratificada 70/30 y exportación CSV
  modules/               # Módulos 1 a 8
  tests/
    cart.test.ts         # Pruebas unitarias con Vitest
  types/
    credit.ts            # Definiciones TypeScript del dominio
    plotly.d.ts          # Declaraciones mínimas para plotly.js-dist-min
  utils/
    format.ts            # Formateo es-CO y metadatos de variables
```

---

## Comandos de desarrollo y verificación

```bash
npm run dev      # Inicia el servidor local en el puerto 3000
npm test         # Ejecuta las pruebas unitarias con Vitest
npm run lint     # Verifica tipos con TypeScript (tsc --noEmit)
npm run build    # Genera el paquete de producción con Vite
```

---

## Referencias técnicas y aclaración

- Documentación conceptual de árboles en scikit-learn: https://scikit-learn.org/stable/modules/tree.html
- Referencia de `DecisionTreeClassifier`: https://scikit-learn.org/stable/modules/generated/sklearn.tree.DecisionTreeClassifier.html

La implementación en BancoLab es didáctica en TypeScript/JavaScript; **no utiliza scikit-learn** ni pretende equivalencia numérica exacta con dicha biblioteca.
