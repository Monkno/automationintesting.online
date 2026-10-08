# Instrucciones para asistentes de AI

Este repositorio es un espacio de práctica colaborativa de QA con Playwright y TypeScript. Seguí el alcance solicitado por la persona que contribuye y mantené cada cambio pequeño y revisable.

## Contexto antes de editar

- Leé `README.md`, `CONTRIBUTING.md` y `docs/AI_WORKFLOW.md`.
- Para cambios de cobertura, consultá `TEST_CASES.md` y las decisiones de `STRATEGY.md`.
- Inspeccioná el spec y los helpers relevantes antes de proponer código. Identificá supuestos pendientes y distinguí evidencia histórica de observaciones actuales.
- Si la tarea es sólo de documentación, modificá únicamente documentación. No cambies código, configuración, dependencias ni lockfiles sin un pedido que lo incluya.

## Convenciones de la suite

- Los E2E usan `test` y `expect` de `src/fixtures/test.ts`. Los unitarios aislados pueden importar de `@playwright/test`.
- Reutilizá `src/pages`, `src/components`, `src/flows`, `src/data` y `src/support`; agregá una abstracción sólo si el cambio la necesita.
- Obtené selectores de evidencia del DOM. No inventes elementos, endpoints ni firmas de métodos.
- Afirmá resultados verificables con datos propios, no sólo presencia de elementos o variaciones de contadores globales.
- Conservá las aserciones relevantes. Investigá fallas antes de proponer sleeps, timeouts mayores, retries adicionales o expectativas menos estrictas.

## Aislamiento y datos

- No modifiques ni elimines datos de otras personas ni las habitaciones semilla 101, 102 y 103.
- Usá las factories existentes y registrá las entidades creadas en `janitor`.
- Para reservar, reutilizá `workerRoom` y `bookableStay`. Registrá la reserva con su huésped cuando sea necesario limpiar también la notificación de admin.
- No publiques `.env`, tokens, cookies ni credenciales privadas. Revisá y redactá evidencia sensible antes de compartir artefactos.
- Proponé las exploraciones que afecten estado global o generen carga en un issue y usá un despliegue propio para ejecutarlas.

## Validación y entrega

- Documentación: verificá enlaces, rutas, scripts y ejemplos contra los archivos reales. No ejecutes toda la suite E2E por un cambio de texto.
- TypeScript y tests: ejecutá `npm run typecheck`, `npx playwright test --grep @unit` y los specs afectados, inicialmente con `--workers=1 --retries=0`.
- Cambios compartidos: ampliá la validación a los grupos afectados según `CONTRIBUTING.md`.
- Actualizá casos y mapa de cobertura cuando cambie la suite; preservá la fecha de las mediciones históricas.
- Informá archivos modificados, motivo, comandos ejecutados y resultados reales. Si no ejecutaste algo, decilo; no inventes resultados ni evidencia.
