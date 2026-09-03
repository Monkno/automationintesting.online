# Test Cases — automationintesting.online (Restful Booker Platform v2.2)

A diferencia de `automationexercise.com`, este sitio **no publica una lista oficial
de casos de prueba**. Los casos de abajo se derivaron explorando la aplicación en
vivo el **2026-09-03**: navegando el sitio público, inspeccionando el DOM, disparando
las validaciones reales del backend y consultando la API pública (`/api/room`,
`/api/branding`, `/api/message/count`).

Cada caso lleva un ID `TC##` al que se mapea el test automatizado correspondiente.

**Leyenda de verificación**

- ✅ **Observado** — el comportamiento fue confirmado manualmente durante la exploración.
- 🔍 **A confirmar** — comportamiento esperado detrás del login de admin, a validar al
  automatizarlo; si la app difiere, manda la app y se ajusta el caso (y se anota en `STRATEGY.md`).
- 🔧 **Ajustado tras automatizar** — el caso estaba escrito de una manera y la aplicación
  se comporta de otra. Manda la aplicación: el texto de abajo es lo que la app hace hoy,
  y el desvío queda registrado como defecto en `STRATEGY.md` con su identificador `D##`.

**Estado tras la automatización (2026-09-03):** los 28 casos están automatizados y en verde.
Once fueron ajustados porque la aplicación se comporta distinto a lo escrito:
TC02, TC03, TC14, TC16, TC17, TC18, TC21, TC23, TC25, TC26 y TC28.
Dos pares se automatizaron como un único test porque uno es subconjunto estricto del otro
(TC09+TC14 y TC15+TC18); ver `STRATEGY.md`, sección de redundancia.

---

## A. Sitio público — catálogo y navegación

### TC01 — La home lista las habitaciones con su tipo y precio ✅

1. Abrir `https://automationintesting.online/`.
2. Ir a la sección *Our Rooms*.

**Esperado:** se listan las habitaciones publicadas. Al momento de la exploración:
Single £100/noche, Double £150/noche, Suite £225/noche. Cada tarjeta muestra tipo,
descripción, lista de amenities (TV / WiFi / Radio / Safe) y un botón *Book now*.
El set de habitaciones y sus precios deben coincidir con `GET /api/room` (la fuente
de verdad), no con constantes hardcodeadas en el test.

### TC02 — La navegación del header ancla a cada sección 🔧

1. Desde la home, usar los links *Rooms*, *Booking*, *Location*, *Contact*.

**Esperado:** cada link lleva a su sección (`#rooms`, `#booking`, `#location`,
`#contact`) y la sección queda visible en viewport (`toBeInViewport`, no
`toBeVisible`: las cinco secciones están en el DOM desde el principio, así que
"visible" no probaría que el scroll ocurrió).

**Ajuste (D2):** el link *Amenities* existe en el header y apunta a `/#amenities`,
pero **no existe ninguna sección con ese id** en la página. El caso ya no espera que
*Amenities* haga scroll a nada; en su lugar afirma explícitamente el estado actual
(el link existe, el destino no), para que arreglar el bug rompa el test y el caso
se revise.

### TC03 — El detalle de habitación muestra descripción, features y políticas 🔧

1. Desde la home, click en *Book now* de una habitación.
2. Se abre `/reservation/{roomid}?checkin=…&checkout=…`.

**Esperado:** la página muestra el tipo de habitación, badge *Accessible* si aplica,
capacidad máxima de huéspedes, descripción, *Room Features*, políticas de check-in
y check-out, reglas de la casa, y el precio por noche consistente con el de la home.
La descripción y las features se comparan contra `GET /api/room`, no contra literales.

**Ajuste (D8):** el caso decía "check-in 15:00–20:00 / check-out 11:00". La aplicación
renderiza el formato de 12 horas: `Check-in: 3:00 PM - 8:00 PM` y
`Check-out: By 11:00 AM`. Se asertan esos textos.

### TC04 — "Similar Rooms" excluye la habitación actual y ofrece las demás ✅

1. Abrir el detalle de una habitación.
2. Ir al bloque *Similar Rooms You Might Like*.

**Esperado:** se ofrecen las otras habitaciones del catálogo, nunca la que se está
viendo, cada una con su precio correcto. *View Details* navega a su detalle.

### TC05 — El footer expone los datos de contacto del negocio ✅

1. Abrir la home y bajar al footer.

**Esperado:** dirección, teléfono y email coinciden con lo que devuelve
`GET /api/branding` (dirección "Shady Meadows B&B, Shadows valley,
Newingtonfordburyshire, Dilbery, N1 1AA", teléfono `012345678901`,
email `fake@fakeemail.com`).

---

## B. Disponibilidad y reserva

### TC06 — Check Availability propaga las fechas elegidas a la reserva ✅

1. En la home, sección *Check Availability & Book Your Stay*, elegir un check-in y
   un check-out futuros.
2. Click en *Check Availability*.
3. Click en *Book now* de una habitación del resultado.

**Esperado:** las fechas elegidas viajan en la URL del detalle
(`?checkin=YYYY-MM-DD&checkout=YYYY-MM-DD`) y se reflejan en el resumen de precio.

### TC07 — El resumen de precio calcula noches, fees y total ✅

1. Abrir `/reservation/1?checkin=2026-10-05&checkout=2026-10-08` (3 noches, £100/noche).

**Esperado:** *Price Summary* muestra `£100 x 3 nights = £300`, `Cleaning fee £25`,
`Service fee £15` y **Total £340**. El total debe verificarse como aritmética
`(precio × noches) + 25 + 15`, calculada a partir del precio real de la habitación,
no como el literal `£340`.

### TC08 — El total se recalcula al cambiar la cantidad de noches ✅

1. Abrir el detalle de una habitación con un rango de N noches.
2. Repetir con un rango de M noches (M ≠ N), sobre la misma habitación.

**Esperado:** el subtotal por noches cambia proporcionalmente; los fees fijos
(£25 de limpieza y £15 de servicio) no cambian; el total refleja el nuevo cálculo.

### TC09 — Reserva exitosa con datos válidos ✅

1. Abrir el detalle de una habitación con fechas futuras.
2. Click en *Reserve Now*.
3. Completar Firstname, Lastname, Email y Phone con datos válidos
   (teléfono de 11–21 caracteres).
4. Click en *Reserve Now* (confirmar).

**Esperado:** aparece el panel **Booking Confirmed** con el mensaje
"Your booking has been confirmed for the following dates:" y el rango exacto
`YYYY-MM-DD - YYYY-MM-DD` que se reservó. Se ofrece *Return home*.

**Nota de automatización:** TC09 y TC14 se ejecutan como un único test
(`TC09 + TC14`). TC14 es TC09 más una lectura de la API sobre la misma reserva;
duplicar la reserva para separarlos escribiría el doble de datos en un sitio
compartido sin probar nada adicional.

### TC10 — Reserva con formulario vacío muestra todos los errores de validación ✅

1. Abrir el detalle de una habitación y click en *Reserve Now*.
2. Sin completar nada, click en *Reserve Now* (confirmar).

**Esperado:** se muestra el bloque de errores con, al menos:
`Firstname should not be blank`, `Lastname should not be blank`,
`size must be between 11 and 21` (teléfono), `size must be between 3 and 30`,
`size must be between 3 and 18` y `must not be empty`. No se crea la reserva.

### TC11 — Validación de longitud del teléfono ✅

1. Iniciar una reserva con nombre, apellido y email válidos.
2. Cargar un teléfono de 10 caracteres (por debajo del mínimo) y confirmar.
3. Repetir con 22 caracteres (por encima del máximo).

**Esperado:** en ambos casos aparece `size must be between 11 and 21` y la reserva
no se crea. Con 11 y con 21 caracteres, en cambio, la reserva sí se confirma
(prueba de borde).

### TC12 — Validación de formato de email 🔍

1. Iniciar una reserva con el resto de los datos válidos.
2. Cargar un email sin `@` o sin dominio y confirmar.

**Esperado:** se rechaza la reserva con un mensaje de validación de email
(`must be a well-formed email address`) y no se crea la reserva.

### TC13 — *Cancel* descarta el formulario de reserva ✅

1. Abrir el detalle de una habitación y click en *Reserve Now*.
2. Completar parcialmente el formulario.
3. Click en *Cancel*.

**Esperado:** el formulario se cierra, se vuelve al estado previo (*Reserve Now*
disponible) y no se crea ninguna reserva.

### TC14 — La reserva creada por UI es visible por API 🔧

1. Crear una reserva por UI (TC09) con un nombre único y trazable.
2. Consultar la reserva vía API de admin (`GET /api/booking?roomid=…`, autenticado).

**Esperado:** existe una reserva con ese `roomid`, nombre, apellido y fechas exactas.
Este caso cierra el ciclo UI → backend y es el que da valor real a la aserción de
TC09, que por sí sola solo verifica un cartel.

**Ajuste:** ni `GET /api/booking?roomid=N` ni `GET /api/booking/{id}` devuelven
email ni teléfono — el payload es `{bookingid, roomid, firstname, lastname,
depositpaid, bookingdates}`. El caso ya no espera verificar esos dos campos por API.
El apellido lleva un tag único por worker y milisegundo, así que identifica la reserva
sin ambigüedad.

**Ajuste (D12):** crear una reserva provoca, además, que el backend escriba un mensaje
en la bandeja de admin ("You have a new booking!") a nombre del huésped. No aparece
documentado en ninguna parte de la UI. El teardown de la suite lo borra junto con la
reserva.

---

## C. Formulario de contacto

### TC15 — Envío exitoso de un mensaje de contacto ✅

1. En la home, ir a *Send Us a Message*.
2. Completar Name, Email, Phone, Subject y Message con datos válidos.
3. Click en *Submit*.

**Esperado:** se muestra la confirmación de envío con el nombre del remitente y el
asunto. Los campos usan `data-testid`: `ContactName`, `ContactEmail`,
`ContactPhone`, `ContactSubject`, `ContactDescription`.

### TC16 — Contacto vacío muestra los errores de validación 🔧

1. Enviar el formulario de contacto sin completar ningún campo.

**Esperado:** `POST /api/message` responde 400 y se listan **exactamente** estos ocho
errores (el orden que devuelve el backend no es estable, así que se compara como
conjunto):

```
Name may not be blank
Email may not be blank
Phone may not be blank
Phone must be between 11 and 21 characters.
Subject may not be blank
Subject must be between 5 and 100 characters.
Message may not be blank
Message must be between 20 and 2000 characters.
```

**Ajuste:** el caso hablaba de "el contador de mensajes no incrementa". El contador
`/api/message/count` es global y compartido con cualquier otro visitante del demo,
así que no puede sostener una aserción exacta. Lo que sí prueba que no se envió nada
es el 400 de `POST /api/message`, que es lo que se asierta.

### TC17 — Validaciones de longitud del formulario de contacto 🔧

1. Enviar el formulario con un asunto por debajo del mínimo (< 5 caracteres).
2. Enviar con un mensaje por debajo del mínimo (< 20 caracteres).

**Esperado:** cada caso muestra **su único** mensaje de tamaño y `POST /api/message`
responde 400.

**Ajuste:** los textos reales no son los mensajes crudos de Bean Validation que suponía
el caso, sino mensajes propios del backend:

| Campo   | Esperado en el caso original         | Texto real de la aplicación                        |
| ------- | ------------------------------------ | -------------------------------------------------- |
| Subject | `size must be between 5 and 100`     | `Subject must be between 5 and 100 characters.`    |
| Message | `size must be between 20 and 2000`   | `Message must be between 20 and 2000 characters.`  |

El formulario de reserva, en cambio, sí devuelve los mensajes crudos
(`size must be between 3 and 18` y compañía): los dos formularios no comparten capa
de validación.

### TC18 — El mensaje enviado incrementa el contador de mensajes 🔧

1. Leer el valor de `GET /api/message/count`.
2. Enviar un mensaje válido por UI (TC15).
3. Volver a leer el contador.

**Esperado:** el mensaje figura como no leído en `GET /api/message`, y
`GET /api/message/count` coincide con la cantidad de mensajes no leídos que lista
`GET /api/message`. Cierra el ciclo UI → backend del TC15.

**Ajuste:** "el contador aumenta en 1" no se puede sostener en este sitio. El contador
es global, y además la propia suite lo mueve en paralelo: cada reserva creada por otro
worker escribe un mensaje (D12) y su teardown lo borra. Se midió: la aserción de delta
falló en 2 de 4 corridas completas. Lo que sí es exacto y no depende de la concurrencia
es (a) que *este* mensaje está entre los no leídos y (b) que el endpoint de conteo
concuerda con el listado.

**Nota de automatización:** TC15 y TC18 se ejecutan como un único test
(`TC15 + TC18`). TC18 es TC15 más una lectura de la API sobre el mismo mensaje.

---

## D. Panel de administración — autenticación

> Credenciales de demo públicas del proyecto restful-booker-platform.
> Se externalizan en `.env` y nunca se hardcodean en el código de los tests.

### TC19 — Login de admin con credenciales válidas ✅ (formulario) / 🔍 (destino)

1. Abrir `/admin`.
2. Completar `#username` y `#password` y click en `#doLogin`.

**Esperado:** se accede al panel de administración; el header muestra la navegación
de admin y la opción *Logout*.

### TC20 — Login de admin con credenciales inválidas 🔍

1. Abrir `/admin` e intentar entrar con una contraseña incorrecta.

**Esperado:** se muestra un error de autenticación, no se accede al panel y la URL
sigue siendo la de login.

### TC21 — Logout cierra la sesión de admin 🔧

1. Estando logueado, click en *Logout*.

**Esperado:** la sesión termina — la cookie `token` se borra del navegador — y al
navegar directamente a `/admin/rooms` se vuelve a exigir login.

**Ajuste (D4):** el caso decía "vuelve al formulario de login". La aplicación redirige
a la **home pública** (`/`), no a `/admin`. Se asierta ese destino.

**Observación (D5):** el header de admin renderiza un botón *Logout* también en la
pantalla de login, sin sesión. Por eso "hay sesión" se verifica con los links de sección
del panel (Rooms / Report / Branding / Messages) y con la cookie, nunca con la
visibilidad de *Logout*.

### TC22 — Las rutas de admin están protegidas sin sesión 🔍

1. Sin sesión, navegar directamente a una ruta interna del panel (rooms / report / messages).

**Esperado:** la app redirige al login en lugar de exponer el contenido.

---

## E. Panel de administración — habitaciones

### TC23 — Crear una habitación 🔧

1. Logueado como admin, ir a la gestión de habitaciones.
2. Crear una habitación con número, tipo, accesibilidad, precio y features.

**Esperado:** la habitación aparece en el listado de admin con exactamente los datos
cargados, en `GET /api/room` con esos mismos valores, y es alcanzable y correctamente
tarifada en su propia página pública `/reservation/{roomid}` (título, precio por noche
y aritmética del *Price Summary*).

**Ajuste (D11):** el caso decía "y también en el sitio público". La grilla *Our Rooms*
de la home **nunca muestra más de tres habitaciones**, sin importar cuántas tenga el
catálogo. Se verificó con seis habitaciones en `GET /api/room` y con el navegador
recibiendo las seis: la grilla siguió renderizando tres. *Similar Rooms* tiene el mismo
tope. La habitación creada no se anuncia en la home; el caso asierta ese hecho tal como
es hoy, y verifica la publicación por la vía que sí funciona (su URL directa).

### TC24 — Editar una habitación 🔍

1. Abrir una habitación creada por el test (nunca una de las semilla).
2. Modificar precio y features, y guardar.

**Esperado:** `PUT /api/room/{id}` responde 202; el listado y el detalle reflejan los
nuevos valores; el tipo y la accesibilidad, que nadie tocó, siguen igual (se leen antes
de editar y se comparan después); y el precio nuevo se usa en el cálculo del
*Price Summary* del sitio público.

**Observación (D13):** el formulario de edición renderiza el botón *Update* **antes** de
cargar la habitación en sus campos, y `PUT /api/room/{id}` envía todos los campos. Si se
edita el precio sobre un formulario todavía vacío, la petición viaja con `roomName` y
`type` en `null` y el backend responde 400 (`Room name must be set`, `Type must be set`).
La UI muestra "Failed to update room", pero los datos en pantalla no cambian, así que es
fácil leerlo como "no pasó nada" en vez de "falló". La suite espera a que el formulario
esté poblado antes de tocarlo, y verifica el 202 del `PUT` en vez de deducir el resultado
del valor mostrado.

### TC25 — Eliminar una habitación 🔧

1. Eliminar una habitación creada por el test.

**Esperado:** desaparece del listado de admin, desaparece de `GET /api/room`, deja de
ser recuperable por su `roomid`, y `/reservation/{roomid}` ya no renderiza el panel
*Book This Room*.

**Ajuste (D9):** "ya no es alcanzable" resultó ser más feo de lo esperado.
`GET /api/room/{id}` de una habitación borrada devuelve **500**, no 404, y
`/reservation/{id}` no muestra un 404 sino el error boundary de Next.js
("This page couldn't load"). El caso asierta "no recuperable" (`>= 400`) en vez de un
código concreto, para documentar el comportamiento sin bendecir el 500.

### TC26 — Validación al crear una habitación incompleta 🔧

1. Intentar crear una habitación sin número y/o sin precio.

**Esperado:** `POST /api/room` responde 400, se muestra el mensaje correspondiente y
no queda ninguna habitación con ese número.

**Ajuste (D10):** no hay errores de validación por campo. Hay un único mensaje, y es
inconsistente según qué falte:

| Entrada                 | Mensaje mostrado                     |
| ----------------------- | ------------------------------------ |
| Sin número y sin precio | `Failed to create room`              |
| Con número, sin precio  | `Failed to create room`              |
| Sin número, con precio  | `Room name must be set`              |
| Precio negativo         | `must be greater than or equal to 1` |

Es decir: omitir el **nombre** da un mensaje útil, pero omitir el **precio** da uno
opaco que no dice qué falta.

**Ajuste:** "el listado no cambia de tamaño" tampoco se puede afirmar con la suite en
paralelo (otro worker legítimamente crea o borra una habitación en ese instante). Se
verifica que no exista ninguna habitación con el número del intento fallido, que es la
misma afirmación acotada a los datos del propio test.

---

## F. Panel de administración — reservas y mensajes

### TC27 — Una reserva hecha por UI aparece en el panel de admin 🔍

1. Crear una reserva por el sitio público (TC09) con datos trazables.
2. Entrar al panel de admin, sección de reservas de esa habitación.

**Esperado:** la reserva figura con el nombre del huésped y las fechas exactas.

### TC28 — Un mensaje de contacto aparece en la bandeja de admin y se marca como leído 🔧

1. Enviar un mensaje de contacto con asunto único (TC15).
2. Entrar al panel de admin, sección de mensajes.
3. Abrir el mensaje.

**Esperado:** el mensaje aparece en la lista con su asunto y remitente y con estado
`read-false`; al abrirlo se ven nombre, email, teléfono, asunto y cuerpo completos; al
cerrarlo la fila pasa a `read-true` y `GET /api/message` lo reporta como leído.

**Ajuste:** "el contador de mensajes sin leer decrementa **en 1**" no se sostiene. Se
midió: bajó **2** en una corrida a 4 workers, porque el teardown de otro worker borró
una notificación de reserva (D12) en el mismo instante. La aserción sobre el badge pasó
a ser de **consistencia UI ↔ API**: el número del badge coincide con la cantidad de
mensajes no leídos que devuelve `GET /api/message`, verificado antes y después de abrir
el mensaje.

**Nota:** las filas del inbox llevan `data-testid` indexados (`message0`, `message1`,
…) que se corren en cuanto alguien más usa la bandeja compartida. La suite localiza su
fila por el asunto único, nunca por índice.

---

## Cobertura deliberadamente fuera de alcance

Anotado acá para que quede explícito que es una decisión y no un olvido; el detalle
y el orden en que se atacaría están en `STRATEGY.md`.

- **Seguridad:** fuerza bruta del login, expiración/manipulación del token, IDOR sobre
  `roomid`/`bookingid`, XSS almacenado vía formulario de contacto.
- **Reglas de negocio de disponibilidad:** doble reserva del mismo rango, solapamientos
  parciales, check-out anterior al check-in, rangos en el pasado.
- **Accesibilidad:** navegación por teclado, labels de formularios, contraste.
- **Cross-browser y responsive:** la suite corre en Chromium; el sitio tiene layout
  móvil con `navbar-toggler` sin cubrir.
- **Branding/configuración de admin:** edición de logo, descripción y datos de contacto.
