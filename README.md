# automationintesting.online

Un proyecto colaborativo para practicar QA con AI, Playwright y TypeScript sobre [automationintesting.online](https://automationintesting.online), la demo de Bed & Breakfast de Restful Booker Platform.

Si sos QA manual y querés empezar a automatizar, estás aprendiendo TypeScript o ya tenés experiencia y querés compartirla, este repo tiene lugar para tu aporte. Podés empezar mejorando una instrucción, proponiendo un caso o revisando una aserción. La idea es aprender con cambios pequeños que otras personas puedan entender, ejecutar y discutir.

AI puede ayudar a explorar riesgos, explicar el código y proponer pruebas. Cada contribución necesita criterio QA y evidencia: qué comportamiento verifica, por qué importa y qué pasó al ejecutarla. Podés usar el asistente que prefieras; también podés contribuir sin AI.

## Tu primera contribución

1. Seguí la instalación y ejecutá los tests unitarios de abajo.
2. Elegí un caso de [TEST_CASES.md](TEST_CASES.md) y buscá su implementación en `tests/`.
3. Leé [CONTRIBUTING.md](CONTRIBUTING.md) para preparar tu cambio y abrir un pull request.
4. Si querés practicar con un asistente, usá los ejemplos de [AI_WORKFLOW.md](docs/AI_WORKFLOW.md).

Las preguntas también ayudan: si un paso no se entiende, [abrí un issue](https://github.com/Monkno/automationintesting.online/issues/new/choose) y contá dónde te trabaste. Aceptamos issues y pull requests en español o inglés.

### Agents de QA Automation recomendados

También podés practicar con los agents de QA Automation de [Monkno](https://github.com/Monkno). Si querés utilizarlos, [consultá cómo acceder y configurarlos](https://github.com/Monkno/automationintesting.online/issues/new/choose). Compartí con el agent el caso que estás trabajando y las instrucciones de este repo, y verificá personalmente su propuesta. Su uso es opcional; podés colaborar con otro asistente o sin AI.

## Instalar y ejecutar

Necesitás Git, Node.js y npm. El `package-lock.json` actual exige como mínimo Node.js 20 y npm 9. Para una instalación nueva, usá una versión de Node compatible con los [requisitos vigentes de Playwright](https://playwright.dev/docs/intro#system-requirements).

### Bash (Linux, macOS o Git Bash)

```bash
git clone https://github.com/Monkno/automationintesting.online.git
cd automationintesting.online
npm ci
npx playwright install --with-deps chromium
cp .env.example .env
npm run typecheck
npx playwright test --grep @unit
```

### Windows PowerShell

```powershell
git clone https://github.com/Monkno/automationintesting.online.git
Set-Location automationintesting.online
npm ci
npx playwright install chromium
Copy-Item .env.example .env
npm run typecheck
npx playwright test --grep '@unit'
```

Si vas a colaborar, hacé primero un fork y reemplazá la URL del clon por la de tu fork. Los tests `@unit` verifican los parsers de precios sin abrir un navegador ni acceder al sitio; son una primera comprobación local. Instalar Chromium deja preparado el entorno para los E2E.

Para una primera ejecución E2E acotada:

```bash
npx playwright test tests/public/catalog.spec.ts --workers=1 --retries=0
```

Para ejecutar toda la suite:

```bash
npm test
```

La suite completa crea reservas, mensajes y habitaciones en una demo compartida. Leé las reglas de aislamiento de abajo antes de ejecutarla o ampliar la cobertura.

### Configuración

Copiar `.env.example` alcanza para usar las credenciales públicas de la demo. Las fixtures que necesitan una sesión de admin fallan si faltan `ADMIN_USER` o `ADMIN_PASS`. `.env` está ignorado por Git.

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `BASE_URL` | `https://automationintesting.online` | Sitio bajo prueba |
| `ADMIN_USER` | Requerida para fixtures de admin | Usuario del panel |
| `ADMIN_PASS` | Requerida para fixtures de admin | Contraseña del panel |
| `WORKERS` | `4` | Paralelismo de la suite |

En Bash:

```bash
WORKERS=1 npx playwright test --retries=0
BASE_URL=http://localhost:8080 npm test
```

En PowerShell:

```powershell
$env:WORKERS = '1'
npx playwright test --retries=0
Remove-Item Env:WORKERS

$env:BASE_URL = 'http://localhost:8080'
npm test
Remove-Item Env:BASE_URL
```

`BASE_URL` permite apuntar a un despliegue propio que ya esté funcionando; este repo contiene la suite, no levanta la aplicación. Las variables exportadas prevalecen sobre `.env`.

### Comandos útiles

| Comando | Qué ejecuta |
| --- | --- |
| `npm test` | Toda la suite |
| `npm run test:public` | Catálogo y navegación pública |
| `npm run test:booking` | Disponibilidad, precios y reservas |
| `npm run test:contact` | Formulario de contacto |
| `npm run test:admin` | Panel de administración |
| `npx playwright test --grep @unit` | Parsers de precios, sin navegador |
| `npx playwright test --list` | Lista de tests, sin ejecutarlos |
| `npm run test:headed` | Ejecución con navegador visible |
| `npx playwright test --ui` | Modo interactivo de Playwright |
| `npm run report` | Reporte HTML de la última ejecución |
| `npm run typecheck` | Validación de tipos con `tsc --noEmit` |

La configuración actual usa Chromium, 4 workers y 1 retry local (2 cuando `CI` está definido). Para investigar una falla, ejecutá el archivo afectado con `--workers=1 --retries=0 --trace=on`. Una ejecución verde con retries puede incluir un test flaky: revisá el reporte.

## Cómo está organizado

```text
src/
  core/         BasePage y BaseComponent
  components/   Navegación, tarjetas y resumen de precios reutilizables
  pages/        Controles y verificaciones de cada página
  flows/        Secuencias de reserva, contacto y sesión de admin
  fixtures/     Fixtures de test, sesiones y limpieza con janitor
  data/         Tipos y factories de datos con Faker
  support/      Cliente API, fechas, catálogo y parsers de precios
tests/
  public/       Catálogo y navegación
  booking/      Precios y reservas
  contact/      Mensajes desde el sitio público
  admin/        Autenticación, habitaciones y bandeja de mensajes
  unit/         Parsers de precios
```

La base documenta 28 casos y contiene 37 tests ejecutables. La correspondencia detallada está en [TEST_CASES.md](TEST_CASES.md); `npx playwright test --list` muestra el inventario ejecutable actual.

| Casos | Implementación |
| --- | --- |
| TC01 a TC05 | `tests/public/catalog.spec.ts` |
| TC06 a TC08 | `tests/booking/pricing.spec.ts` |
| TC09 a TC14 | `tests/booking/reserve.spec.ts` |
| TC15 a TC18 | `tests/contact/contact.spec.ts` |
| TC19 a TC22 | `tests/admin/auth.spec.ts` |
| TC23 a TC26 | `tests/admin/rooms.spec.ts` |
| TC27 y TC28 | `tests/admin/inbox.spec.ts` |
| Parsers de precios | `tests/unit/money.spec.ts` |

TC09/TC14 y TC15/TC18 comparten un test por pareja para verificar UI y API sobre los mismos datos. [STRATEGY.md](STRATEGY.md) explica esa decisión, las capas, la concurrencia y los defectos observados. Sus mediciones corresponden al 3 de septiembre de 2026; sirven como referencia histórica, no como garantía de una ejecución actual.

## Cuidar la demo compartida

- Modificá o eliminá únicamente datos creados por tu test. Conservá las habitaciones semilla 101, 102 y 103 y los datos de otras personas.
- Reutilizá las factories y los identificadores propios de la suite. Registrá cada entidad creada en `janitor`; una reserva también puede generar una notificación en la bandeja de admin.
- Para reservar, usá `workerRoom` y `bookableStay` en lugar de fechas fijas que podrían estar ocupadas.
- Verificá resultados sobre tus propios datos. Los contadores globales pueden cambiar mientras otra persona usa el sitio.

La limpieza es best-effort y la demo puede reiniciarse durante una ejecución. Un timeout o un 409 necesita investigación antes de atribuirlo a un defecto del test. Para explorar concurrencia, seguridad o cambios de branding global, proponé primero el alcance en un issue y usá un despliegue propio.

## Por dónde puede crecer

Estas son propuestas para discutir, basadas en las brechas de [STRATEGY.md](STRATEGY.md), no funcionalidades ya implementadas:

- Documentar una experiencia de instalación o aclarar un caso existente.
- Proponer casos de borde para nombres, teléfonos, mensajes y rangos de fechas.
- Explorar teclado, labels y navegación móvil con pasos reproducibles.
- Analizar una falla intermitente con trazas y evidencia de aislamiento.
- Proponer cobertura en Firefox y WebKit, o una ejecución en CI, explicando su costo sobre la demo.
- Compartir un ejemplo de uso de AI: el contexto que le diste, qué sugirió y qué corregiste al verificarlo.

Elegí una mejora en [CONTRIBUTING.md](CONTRIBUTING.md) o [proponé la tuya](https://github.com/Monkno/automationintesting.online/issues/new/choose). Un pull request pequeño con una explicación clara es una buena forma de empezar.
