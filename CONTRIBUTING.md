# Colaborar en el repo

Gracias por traer tu mirada QA. Podés contribuir con documentación, exploración manual, casos, automatización o revisión de un pull request. No necesitás dominar AI ni Playwright para aportar algo útil.

Escribí en español o inglés. Tratá las preguntas de quien empieza con paciencia y discutí las decisiones con ejemplos y evidencia. Al revisar, explicá el motivo de una sugerencia para que la otra persona pueda aprender de ella.

## Elegir un primer aporte

| Si querés practicar | Un aporte acotado | Qué entregar |
| --- | --- | --- |
| Instalación y Git | Seguir el README desde un clon limpio | Un paso corregido o un issue con el bloqueo y el entorno |
| Diseño de casos | Revisar un límite de TC11 o TC17 | Datos, precondiciones y resultado esperado antes de automatizar |
| TypeScript | Entender un parser de `src/support/money.ts` | Una explicación o un caso unitario que pruebe un riesgo nuevo |
| Playwright | Revisar una aserción de navegación en TC02 | Qué resultado prueba y qué defecto detectaría |
| Exploración manual | Probar teclado o menú móvil | Pasos reproducibles, esperado, observado y evidencia |
| AI aplicada a QA | Pedir una propuesta sobre un caso existente | Contexto, propuesta del asistente y revisión humana |

Consultá los [issues abiertos](https://github.com/Monkno/automationintesting.online/issues) antes de empezar. Si alguien ya está trabajando en el tema, coordiná ahí. Para un cambio pequeño de documentación podés abrir el PR directamente. Para nuevas dependencias, nuevas capas o cambios amplios, abrí primero una propuesta que permita acordar el alcance.

## Preparar tu rama

1. Hacé un fork en GitHub y cloná tu fork.
2. Agregá este repo como `upstream` y creá una rama desde su `main`.
3. Seguí la instalación del [README](README.md).

```bash
git clone https://github.com/TU_USUARIO/automationintesting.online.git
cd automationintesting.online
git remote add upstream https://github.com/Monkno/automationintesting.online.git
git fetch upstream
git switch -c docs/mi-primer-aporte upstream/main
```

Reemplazá `TU_USUARIO` por tu usuario real y elegí un nombre que describa tu cambio, por ejemplo `test/limites-contacto` o `docs/instalacion-powershell`.

## Preparar una contribución verificable

- Elegí un comportamiento o problema por PR y explicá por qué vale la pena cubrirlo.
- Relacioná el cambio con el caso `TCxx` correspondiente. Si agregás un caso, asignale un identificador disponible y actualizá `TEST_CASES.md` y el mapa del README cuando corresponda.
- Para E2E, importá `test` y `expect` de `src/fixtures/test.ts`, ajustando la ruta relativa. Los tests unitarios que no requieren esas fixtures pueden usar `@playwright/test`, como `tests/unit/money.spec.ts`.
- Reutilizá pages, components, flows, factories y helpers existentes. Mantené las aserciones centradas en resultados, con datos del propio test y limpieza registrada en `janitor`.
- Obtené los selectores del DOM observado. Priorizá roles, labels o test IDs cuando existan; documentá el motivo si la aplicación obliga a usar otro selector.
- Investigá una falla antes de agregar sleeps, aumentar timeouts o debilitar una aserción. La suite y la demo tienen problemas distintos: indicá cuál reproduce tu evidencia.
- Si usaste AI, describí brevemente la tarea que le diste y cómo verificaste su propuesta. [AI_WORKFLOW.md](docs/AI_WORKFLOW.md) incluye un flujo y prompts de ejemplo.

`STRATEGY.md` y `TEST_CASES.md` registran comportamientos y defectos observados en una fecha concreta. Si la aplicación cambió, adjuntá evidencia actual y explicá la diferencia entre el comportamiento observado y el esperado. Cambiar una expectativa para obtener un test verde requiere esa justificación.

## Validar antes del PR

Para cambios de documentación, revisá enlaces, rutas, nombres de comandos y ejemplos de ambas shells si los modificaste. No hace falta ejecutar toda la suite E2E por corregir texto.

Para cambios en tests o TypeScript:

```bash
npm run typecheck
npx playwright test --grep @unit
```

Ejecutá también el archivo afectado. Por ejemplo, para una contribución sobre contacto:

```bash
npx playwright test tests/contact/contact.spec.ts --workers=1 --retries=0 --trace=on
```

Si el cambio afecta fixtures, flows o helpers compartidos, ejecutá los grupos que los usan y una corrida completa cuando corresponda. Registrá comando, entorno, resultado y fallas pendientes. Si no pudiste ejecutar un chequeo, explicá el motivo; no lo marques como aprobado.

Los reportes y trazas ayudan a revisar una falla. Compartí sólo evidencia relevante y revisá su contenido antes de publicarla: puede incluir cookies, tokens o datos personales. `.env`, credenciales privadas y artefactos generados no forman parte del commit.

## Abrir y revisar el pull request

```bash
git status --short
git diff --check
git add README.md
git commit -m "docs: aclarar los primeros pasos para QA"
git push -u origin docs/mi-primer-aporte
```

El ejemplo agrega sólo `README.md`; reemplazalo por los archivos de tu aporte. Abrí un PR hacia `main` de `Monkno/automationintesting.online` y completá la plantilla. Usá un draft si todavía estás investigando o querés una revisión temprana.

Incluí el problema, el cambio propuesto y la validación realizada. Si hay un issue relacionado, enlazalo; usá `Closes #NUMERO` sólo si el PR lo resuelve por completo, reemplazando `NUMERO` por el número real. Para cambios visuales o defectos de la demo, agregá evidencia del comportamiento.

Quien revisa debería poder entender qué riesgo cubre el aporte, cómo ejecutarlo y qué datos crea o elimina. Respondé a las observaciones en el mismo PR y mantené la descripción alineada con el cambio final.
