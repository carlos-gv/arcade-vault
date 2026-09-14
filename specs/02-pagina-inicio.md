# 02 — Página de inicio (Home)

**Estado:** Approved
**Depende de:** SPEC 01
**Fecha:** 2026-09-13

**Objetivo:** Portar a Next.js la pantalla "Home" del prototipo `references/templates/home-about/home.jsx` como nueva landing en `/`, moviendo la Biblioteca actual a `/games` y dejando "Acerca de" fuera de alcance.

## Alcance

**Incluye:**

- Nueva ruta `/` con el contenido de `home.jsx`: hero con silhouettes flotantes, sección "¿Por qué Arcade Vault?" (feature grid), preview de 6 juegos del catálogo, stats, "Actividad en Vivo" (últimas puntuaciones + top jugadores de hoy), sección de precios (plan único + FAQ) y CTA final.
- Mover el contenido actual de `app/page.tsx` (Biblioteca) a `app/games/page.tsx`, sirviéndose ahora en `/games`.
- Actualizar `components/nav.tsx`:
  - El logo sigue apuntando a `/` (ahora Home en vez de Biblioteca).
  - Agregar link "Inicio" → `/` (desktop y panel móvil).
  - Cambiar el link "Biblioteca" para apuntar a `/games` en vez de `/`.
  - Agregar link "Acerca de" → `/about` (desktop y panel móvil), aunque esa ruta no exista todavía (ver "No incluye").
  - Actualizar `isActive` para que "Inicio" esté activo en `/` y "Biblioteca" esté activo en `/games`, `/game/[id]` y `/game/[id]/play`.
- Actualizar los links internos que hoy asumen que "Biblioteca" vive en `/`:
  - `app/game/[id]/page.tsx` — botón "VOLVER AL VAULT" → `/games`.
  - `app/leaderboard/page.tsx` — botón "VOLVER A LA BIBLIOTECA" → `/games`.
- Dentro del nuevo Home, los CTAs "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; los mini-cards del preview navegan a `/game/[id]` (usando los primeros 6 juegos de `GAMES`); "VER SALÓN →" navega a `/leaderboard`.
- Portar a `app/globals.css` las clases CSS necesarias del Home (`.home-*`, `.hero-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.tick-*`, `.top-*`, `.pricing-*`, `.price-*`, `.faq-*`, `.final-*`) desde `references/templates/home-about/styles.css`, igual que se hizo con el resto del CSS neón en el spec 01.
- Los iconos pixel-art inline (`FeatureIcon`) se portan como componente(s) en TypeScript, igual estilo que el resto de iconos SVG ya portados.
- La sección "Actividad en Vivo" (ticker de últimas puntuaciones y top 5 jugadores de hoy) usa los mismos datos de ejemplo hardcodeados del prototipo (jugadores NEONFOX, PX_KAI, etc., con los mismos scores y tiempos relativos), sin generarlos desde `seededScores` ni desde ninguna fuente dinámica.
- Responsive: se preserva el comportamiento del prototipo (grids que colapsan en mobile) usando el CSS portado.

**No incluye (fuera de alcance de este spec):**

- La pantalla "Acerca de" (`about.jsx`) — el link de nav a `/about` queda enlazado pero sin página propia; al hacer clic se muestra el 404 por defecto de Next.js hasta que un spec futuro la implemente.
- Cualquier dato dinámico real para "Actividad en Vivo" (no se conecta a `av_scores`, ni a un backend, ni a websockets).
- Redirects desde la antigua URL `/` (Biblioteca) — no aplica porque el proyecto no está desplegado ni tiene usuarios con enlaces guardados.
- Cambios al modelo de datos (`lib/data.ts`), autenticación o cualquier lógica ya cubierta por el spec 01.
- Tests automatizados.

## Modelo de datos

No se introduce ningún modelo de datos nuevo. El Home reutiliza `GAMES` de `lib/data.ts` (ya existente) solo para el preview de 6 juegos; el resto del contenido (features, stats, actividad, pricing, FAQ) es copy estático embebido en el componente, igual que en `home.jsx`.

## Plan de implementación

1. **Mover Biblioteca a `/games`** — crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (sin cambios de lógica); dejar `app/page.tsx` temporalmente vacío/pendiente del paso 2.
2. **Portar CSS del Home** — añadir a `app/globals.css` las reglas de `references/templates/home-about/styles.css` correspondientes a `.home-*`, `.hero-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.tick-*`, `.top-*`, `.pricing-*`, `.price-*`, `.faq-*`, `.final-*` (sin tocar reglas ya portadas ni las de `.about-*`, que quedan fuera de alcance).
3. **Componentes del Home** — crear `components/feature-icon.tsx` (los 4 iconos pixel `GAMEPAD/FREE/TROPHY/ROCKET`) y `components/floating-silhouettes.tsx` (los 8 SVG decorativos), portados 1:1 desde `home.jsx`.
4. **`app/page.tsx` (Home)** — implementar la nueva landing usando el `IntersectionObserver` de `useReveal` (como client component, ya que necesita hooks y `onClick`), consumiendo `GAMES.slice(0, 6)` para el preview y con todos los CTAs apuntando a las rutas indicadas en el alcance.
5. **Actualizar `components/nav.tsx`** — agregar "Inicio" (→ `/`) y "Acerca de" (→ `/about`) en desktop y panel móvil; cambiar "Biblioteca" a `/games`; ajustar `isActive` para las 4 secciones (`home`, `biblioteca`, `salon`, `auth`).
6. **Actualizar links rotos** — `app/game/[id]/page.tsx` ("VOLVER AL VAULT") y `app/leaderboard/page.tsx` ("VOLVER A LA BIBLIOTECA") ahora apuntan a `/games`.
7. **Repaso visual** — recorrer `/` (nuevo Home), `/games`, `/game/[id]`, `/leaderboard` y el nav (desktop + mobile) en el navegador, comparando contra `references/templates/home-about/arcade-vault-standalone.html`, verificando que ningún link quede apuntando a la Biblioteca en `/`.

## Criterios de aceptación

- [ ] `/` muestra la landing completa: hero, features, preview de 6 juegos, stats, actividad en vivo, pricing/FAQ y CTA final, con las animaciones "reveal" al hacer scroll.
- [ ] `/games` muestra el catálogo completo de 8 juegos con buscador y filtro por categoría (idéntico comportamiento al `/` anterior).
- [ ] El nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de"; "Inicio" está activo en `/` y "Biblioteca" está activo en `/games`, `/game/[id]` y `/game/[id]/play`.
- [ ] Clic en "Acerca de" navega a `/about` y muestra el 404 por defecto de Next.js (no hay página propia todavía).
- [ ] En el Home: "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/games`; "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; un mini-card del preview navega a `/game/<id>`; "VER SALÓN →" navega a `/leaderboard`.
- [ ] "VOLVER AL VAULT" en `/game/<id>` y "VOLVER A LA BIBLIOTECA" en `/leaderboard` navegan a `/games` (ya no a `/`).
- [ ] El logo del nav navega a `/` (Home) desde cualquier pantalla.

## Decisiones tomadas y descartadas

- **`/` pasa a ser Home y la Biblioteca se mueve a `/games`** (en vez de poner el Home en una ruta alterna como `/inicio`): coincide con el prototipo original, donde "Inicio" y "Biblioteca" son pantallas separadas y "Inicio" es la pantalla de entrada. Descartado dejar la Biblioteca en `/` porque hubiera generado una inconsistencia permanente con el prototipo de referencia.
- **Actividad en Vivo con datos estáticos de ejemplo**, no generados con `seededScores`: consistente con el resto del spec 01, que es maquetación visual sin backend real; `seededScores` genera filas para un juego puntual, no un ticker global ni un ranking global del día, así que adaptarlo sería inventar una lógica no pedida.
- **"Acerca de" se agrega al nav ya, apuntando a `/about`, aunque la página no exista** (se apoya en el 404 por defecto de Next.js): evita lógica de "próximamente" que habría que revertir cuando se construya la pantalla About en un spec futuro.
- **No se crean redirects desde la Biblioteca en `/`**: el proyecto es un scaffold en desarrollo sin usuarios ni enlaces externos que preservar.
