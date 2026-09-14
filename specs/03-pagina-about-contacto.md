# 03 — Página "Acerca de" y envío de correo de contacto

**Estado:** Implementado
**Depende de:** SPEC 02
**Fecha:** 2026-09-13

**Objetivo:** Portar a Next.js la pantalla "Acerca de" del prototipo `references/templates/home-about/about.jsx` en la ruta `/about`, conectando el formulario de contacto a un envío de correo real vía Resend.

## Alcance

**Incluye:**

- Nueva ruta `/about` con el contenido de `about.jsx`:
  - Sección "Acerca de": kicker, título, texto de misión y la fila de 3 "highlights" (HECHO CON ❤️, JUEGOS EN HTML, PROYECTO EN CRECIMIENTO) con sus iconos pixel (`HighlightIcon`).
  - Divisor animado (`about-divider`) con los 24 pixeles.
  - Sección "Contacto": intro + 3 tips, y el formulario (nombre, correo, mensaje) con validación de campos vacíos (shake) igual que el prototipo.
  - Las animaciones `reveal` vía `IntersectionObserver`, igual patrón que `useReveal` ya usado en `app/page.tsx`.
- Envío real del formulario vía **Resend**:
  - Nueva ruta de API `app/api/contact/route.ts` (Route Handler, `POST`) que recibe `{ name, email, msg }`, valida en servidor (campos no vacíos, `email` con formato válido) y llama a la API de Resend para enviar el correo.
  - Remitente: `onboarding@resend.dev` (dominio de pruebas de Resend, sin necesidad de verificar dominio propio).
  - Destinatario: `cegv@hotmail.es`.
  - Asunto del correo: algo como `Nuevo mensaje de contacto — Arcade Vault (<nombre>)`; cuerpo en texto plano/HTML simple con nombre, correo del remitente (como `reply_to`) y mensaje.
  - La clave de API vive en `process.env.RESEND_API_KEY`, leída solo en el Route Handler (server-side), nunca expuesta al cliente.
  - Se agrega la dependencia `resend` (SDK oficial) a `package.json`.
  - Se crea `.env.example` en la raíz con `RESEND_API_KEY=` documentando la variable (sin valor real).
- Estados del formulario en el cliente:
  - **Vacío / inválido:** igual que el prototipo — `shake` de 400ms, sin enviar.
  - **Enviando:** botón deshabilitado con texto `ENVIANDO...` mientras se espera la respuesta del `fetch` a `/api/contact`.
  - **Éxito:** el mismo bloque `terminal-success` del prototipo (con el "log" de conexión simulado) y línea final `MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, <NOMBRE>.`; botón "ENVIAR OTRO MENSAJE" que resetea el formulario.
  - **Error:** nueva variante del bloque terminal (mismo componente visual, acentos en rojo/magenta en vez de verde) con una línea `[ERROR] No se pudo enviar el mensaje. Intenta de nuevo.` y un botón para volver a intentar (reutiliza el mismo `form` sin perder lo escrito).
- Actualizar `app/globals.css` con las clases `.about-*`, `.highlight*`, `.hl-*`, `.contact-*`, `.field`, `.terminal-success`, `.term-*` (y su variante de error) desde `references/templates/home-about/styles.css`.
- Portar `HighlightIcon` como componente TypeScript (`components/highlight-icon.tsx`), mismo patrón que `feature-icon.tsx`.
- Nav: no requiere cambios — `components/nav.tsx` ya tiene el link "Acerca de" → `/about` y su `isActive` (agregado en el spec 02); al implementarse esta spec el 404 deja de aparecer.

**No incluye (fuera de alcance de este spec):**

- Protección antispam del formulario (honeypot, rate limiting, CAPTCHA) — se deja para un spec futuro si se vuelve necesario.
- Persistencia del mensaje de contacto en cualquier almacenamiento (localStorage, base de datos, archivo) — el correo es la única salida; no se guarda copia.
- Verificación de un dominio propio en Resend — se usa el dominio de pruebas `onboarding@resend.dev` mientras no exista uno.
- Configuración de la cuenta/clave de Resend — el usuario obtiene y coloca `RESEND_API_KEY` en su propio `.env.local` (no versionado); este spec solo deja `.env.example` documentando el nombre de la variable.
- Tests automatizados.
- Cualquier cambio a otras pantallas fuera de `/about`, `app/api/contact/route.ts` y `components/nav.tsx` (que ya no requiere cambios).

## Modelo de datos

No se introduce ningún modelo de datos persistente. El único "dato" nuevo es la forma del payload que viaja entre el formulario y el Route Handler:

```ts
// Request body de POST /api/contact
type ContactPayload = {
  name: string;
  email: string;
  msg: string;
};

// Response de POST /api/contact
type ContactResponse =
  | { ok: true }
  | { ok: false; error: string };
```

No se persiste en ningún lado; vive únicamente en memoria durante el request y en el estado de React del formulario mientras el usuario lo completa.

## Plan de implementación

1. **Dependencia y configuración de Resend** — agregar `resend` a `package.json`, crear `.env.example` con `RESEND_API_KEY=` en la raíz del proyecto.
2. **Portar CSS de About/Contacto** — añadir a `app/globals.css` las reglas `.about-*`, `.highlight*`, `.hl-*`, `.about-divider`, `.div-*`, `.contact-*`, `.field`, `.terminal-success`, `.term-*` desde `references/templates/home-about/styles.css`, más una variante de color para el estado de error del bloque terminal (reutilizando rojo/magenta ya presentes en la paleta neón).
3. **Componente `HighlightIcon`** — crear `components/highlight-icon.tsx` portando los 3 iconos SVG (`HEART`, `BROWSER`, `PLANT`) 1:1 desde `about.jsx`.
4. **Route Handler `app/api/contact/route.ts`** — implementar `POST` que:
   - Valida el body (`name`, `email`, `msg` no vacíos; `email` con formato válido).
   - Si la validación falla, responde `400` con `{ ok: false, error: "..." }`.
   - Si es válida, instancia `Resend` con `process.env.RESEND_API_KEY` y envía el correo desde `onboarding@resend.dev` a `cegv@hotmail.es`, con `reply_to` = correo del formulario.
   - Si Resend responde error, responde `500` con `{ ok: false, error: "..." }`; si todo sale bien, responde `200` con `{ ok: true }`.
5. **`app/about/page.tsx`** — client component que porta la estructura de `about.jsx`: hero + highlights, divisor, y formulario de contacto con estados `idle | sending | sent | error`, haciendo `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })` en el submit y reaccionando a la respuesta.
6. **Repaso visual** — recorrer `/about` en el navegador (desktop y mobile), verificar las animaciones `reveal`, probar el envío real de un mensaje de prueba (confirmando que llega el correo a `cegv@hotmail.es`), y forzar el estado de error (por ejemplo con una `RESEND_API_KEY` inválida temporalmente) para verificar el bloque de error.

## Criterios de aceptación

- [x] `/about` muestra el hero "Acerca de" con los 3 highlights, el divisor animado y la sección de contacto con sus 3 tips, siguiendo el copy exacto del prototipo.
- [x] El link "Acerca de" del nav (desktop y mobile) navega a `/about` y ya no muestra el 404 por defecto.
- [x] Enviar el formulario con algún campo vacío dispara el `shake` sin hacer ninguna llamada de red.
- [x] Enviar el formulario completo muestra `ENVIANDO...` con el botón deshabilitado mientras se espera la respuesta.
- [x] Un envío exitoso dispara un correo real recibido en `cegv@hotmail.es` (remitente `onboarding@resend.dev`, `reply_to` con el correo ingresado en el formulario) y muestra el bloque `terminal-success` con el nombre del usuario.
- [x] "ENVIAR OTRO MENSAJE" en el estado de éxito limpia el formulario y vuelve al estado inicial.
- [x] Si la llamada a `/api/contact` falla (red o error de Resend), se muestra el bloque de error en estilo terminal con la posibilidad de reintentar sin perder lo escrito.
- [x] `RESEND_API_KEY` no aparece en ningún archivo versionado; `.env.example` documenta su nombre sin valor real.

## Decisiones tomadas y descartadas

- **Remitente `onboarding@resend.dev`** en vez de un dominio propio: el proyecto no tiene un dominio verificado en Resend todavía; usar el dominio de pruebas permite implementar y probar el envío real ahora mismo. Cambiarlo a un dominio propio queda como mejora futura cuando exista uno verificado.
- **Sin persistencia del mensaje** (ni localStorage ni backend): el correo es la única salida, consistente con que el proyecto no tiene backend de datos real todavía (spec 01/02 son maquetación visual sin persistencia real más allá de auth/scores en localStorage, que no aplica aquí).
- **Estado de error nuevo en vez de reusar `shake`:** el `shake` del prototipo comunica "faltan campos", que es un error distinto (de validación de cliente) al de "no se pudo enviar" (de red/servidor). Se diferencian para no confundir al usuario sobre qué corregir.
- **Sin protección antispam en este spec:** el proyecto no tiene tráfico real todavía; agregar honeypot/rate limiting ahora sería anticiparse a un problema que no existe aún.
- **Validación también en servidor** (no solo en cliente): el Route Handler es un endpoint público invocable sin pasar por el formulario, así que debe validar el payload por su cuenta antes de gastar una llamada a Resend.

## Riesgos identificados

- Si `RESEND_API_KEY` no está configurada localmente (el usuario aún no la generó en resend.com), cualquier envío real fallará con el estado de error hasta que se configure `.env.local` — esto es esperado y no bloquea el resto de la implementación ni la revisión visual de `/about`.
- El dominio de pruebas `onboarding@resend.dev` de Resend puede tener límites de envío o ir a spam más fácilmente que un dominio propio verificado; aceptable para esta etapa del proyecto.
