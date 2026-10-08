# Practicar AI + Playwright + TypeScript

Usá el asistente que tengas disponible para explicar código, explorar riesgos, proponer casos o revisar un diff. Esta guía no requiere una cuenta, modelo, extensión o integración específica, y no configura ninguna herramienta de AI en el repo.

El objetivo de la práctica es poder explicar y verificar el aporte que enviás. Guardá un resumen del uso de AI en el PR para que otra persona pueda aprender de lo que funcionó y de lo que tuviste que corregir.

## Usar los agents de QA Automation de Monkno

Como opción para esta práctica, podés utilizar los agents de QA Automation de [Monkno](https://github.com/Monkno). Para conocer el acceso y la configuración, [abrí una consulta en el repo](https://github.com/Monkno/automationintesting.online/issues/new/choose). Esta suite no los instala ni requiere que los tengas configurados.

Al trabajar con ellos, compartí `AGENTS.md`, el caso `TCxx`, el spec y los helpers relevantes. Pedí una revisión acotada que explique riesgos y comprobaciones con evidencia, y conservá la responsabilidad sobre los cambios y las ejecuciones. Los prompts de esta guía también sirven con esos agents.

## Un flujo para un cambio pequeño

1. Elegí un riesgo. Leé el caso en `TEST_CASES.md`, la decisión relevante de `STRATEGY.md` y el spec que lo cubre. Escribí qué debería pasar y qué falla detectaría una nueva prueba.
2. Compartí contexto acotado: los archivos relevantes, el objetivo, el alcance permitido y las reglas de aislamiento. Omití `.env`, tokens y datos privados.
3. Pedí una propuesta antes de implementar. Revisá duplicaciones, supuestos sobre la aplicación y datos que el test necesitaría crear.
4. Contrastá la propuesta con el DOM y la API observados. Verificá las firmas de métodos en el repo y las APIs en la documentación oficial. Si falta evidencia, registrá el supuesto pendiente.
5. Implementá un cambio pequeño y revisá el diff. Comprobá que conserva el criterio de aceptación y que limpia cada entidad creada.
6. Ejecutá typecheck, unitarios y el spec afectado según `CONTRIBUTING.md`. Ante una falla, analizá el error y la traza antes de pedir otra modificación.
7. Resumí en el PR qué aportó AI, qué corregiste y qué validaste personalmente.

## Prompts para adaptar

Estos ejemplos son puntos de partida. Ajustá el alcance a tu issue y compartí los archivos necesarios para que el asistente pueda leerlos.

### Entender un caso sin editar archivos

```text
Quiero entender TC11 de este repo. Leé TEST_CASES.md,
tests/booking/reserve.spec.ts, src/data/factories.ts y src/fixtures/test.ts.
Explicá qué límites de teléfono cubre, por qué los casos válidos necesitan
una ventana libre y cómo se limpian la reserva y su notificación.
Señalá los archivos que sustentan la explicación. No modifiques archivos.
```

### Diseñar una contribución antes de automatizar

```text
Quiero proponer un caso de borde para el formulario de contacto.
Leé TC15 a TC18 y tests/contact/contact.spec.ts.
Proponé un único caso que no duplique la cobertura actual, con precondiciones,
datos, resultado esperado y evidencia necesaria. Separá lo confirmado en el
repo de lo que debe comprobarse en la demo. Explicá su aislamiento y limpieza.
No implementes todavía ni inventes selectores.
```

### Revisar una propuesta de automatización

```text
Revisá este diff y el contexto del caso. Buscá aserciones que puedan pasar
sin probar el resultado, datos compartidos, fechas ocupadas, selectores sin
evidencia y entidades que no estén registradas en janitor.
Comprobá que reutiliza las fixtures y las capas existentes.
Para cada hallazgo, indicá archivo, riesgo y una corrección concreta.
No cambies el código ni afirmes que ejecutaste pruebas si no las ejecutaste.
```

### Investigar una falla

```text
Este es el comando ejecutado, el error y la evidencia de la traza revisada.
Leé el spec y los helpers implicados. Proponé hipótesis y una comprobación
para cada una. Considerá colisión de fechas, reinicio de la demo y cambios
de otros usuarios. No aumentes retries o timeouts ni elimines aserciones
para conseguir un resultado verde. No concluyas una causa sin evidencia.
```

## Qué revisar de la respuesta de AI

- ¿El caso comprueba un resultado que importa y detectaría un defecto concreto?
- ¿Los selectores existen en el DOM y los métodos existen con esa firma?
- ¿El resultado esperado tiene respaldo en el caso o en una regla de negocio, además del comportamiento actual?
- ¿El test usa datos propios y limpia reservas, habitaciones, mensajes y notificaciones que crea?
- ¿La solución conserva las aserciones y usa las capas que ya existen?
- ¿El resultado declarado coincide con una ejecución real? Un texto convincente del asistente no es un reporte de pruebas.

Si la propuesta reproduce un bug conocido de la demo, explicá cómo se relaciona con los identificadores `Dxx` de `STRATEGY.md` y acordá cómo representarlo en la suite. No cambies el esperado sólo para aceptar un defecto.

## Qué compartir al contribuir

En la sección de AI de la plantilla de PR podés escribir:

```text
Tarea solicitada a AI:
Contexto o archivos compartidos:
Sugerencia que aproveché:
Supuesto o error que corregí:
Validación humana (comando y resultado, o revisión de documentación):
```

Es suficiente un resumen relevante para el cambio. Compartir conversaciones completas o pagar una herramienta no es un requisito para colaborar.

## Referencias

- [Instalación y ejecución de Playwright](https://playwright.dev/docs/intro).
- [Buenas prácticas de Playwright](https://playwright.dev/docs/best-practices).
- [Documentación de TypeScript](https://www.typescriptlang.org/docs/).
- [Reglas de contribución de este repo](../CONTRIBUTING.md).
