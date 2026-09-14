# 01 — MVP: pantallas visuales de Arcade Vault

**Estado:** Implemented
**Depende de:** —
**Fecha:** 2026-09-13

**Objetivo:** Portar a Next.js App Router las 5 pantallas del prototipo estático en `references/templates/` (Biblioteca, Detalle, Reproductor, Salón de la Fama, Auth) como maquetación visual navegable, sin lógica de juego real ni backend.

## Alcance

**Incluye:**

- Rutas reales de App Router (no hash-routing):
  - `/` — Biblioteca (catálogo, búsqueda, filtro por categoría)
  - `/game/[id]` — Detalle de juego (ficha + leaderboard del juego)
  - `/game/[id]/play` — Reproductor (placeholder visual, sin gameplay)
  - `/leaderboard` — Salón de la Fama (podio + tabla, con tabs por juego)
  - `/auth` — Inicio de sesión / crear cuenta / invitado
- Componente `Nav` (barra superior + panel móvil deslizante) presente en todas las rutas vía `layout.tsx`.
- Sesión de usuario (`{ name }`) persistida en `localStorage` bajo la misma clave que el prototipo (`av_user`), gestionada por un hook/Context cliente (`useAuth` o similar) consumido por `Nav` y por `/auth`.
- Catálogo de juegos, lista de jugadores y generador `seededScores` portados a TypeScript tipado en `lib/data.ts` (mismos 8 juegos, mismos datos, misma lógica de semilla que `data.jsx`).
- Covers de juego como clases CSS puras (`.cover-bricks`, `.cover-tetro`, etc.), reutilizando los patrones ya definidos en `app/globals.css`/`styles.css` — sin assets de imagen.
- Formularios de Auth sin validación real: el submit construye `{ name }` a partir del input y navega a `/`, igual que `auth.jsx`. Sin llamadas a backend, sin verificación de email/password.
- Botones sociales (Google/GitHub) y "jugar como invitado" son visuales/decorativos — no integran OAuth real.
- Responsive y temas visuales: se reutiliza el CSS neón ya existente en `app/globals.css` (portado en un commit previo), sin reescribirlo.

**No incluye (fuera de alcance de este spec):**

- Ningún juego jugable real. El Reproductor (`/game/[id]/play`) es un placeholder estático: reproduce el layout (HUD, marco CRT, pie de estado) pero el área de "arena" muestra un estado fijo/decorativo sin `setInterval`, sin incremento de puntuación, sin vidas/niveles/pausa funcionales, y sin modal de fin de juego con guardado de score.
- Persistencia de puntuaciones jugadas (`av_scores` en localStorage) — no aplica porque no hay juego real que genere scores nuevos.
- Autenticación real, backend, base de datos o API routes.
- Internacionalización (la UI queda fija en español, como el prototipo).
- Accesibilidad avanzada más allá de lo que ya trae el prototipo (atributos `aria-label` existentes se conservan, no se auditan nuevos).
- Tests automatizados.

## Modelo de datos

Sin persistencia en servidor. Estructuras en memoria/localStorage, en TypeScript:

```ts
// lib/data.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS, ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;    // ej. "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY"
}

export const GAMES: Game[];
export const CATS: readonly ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
export function seededScores(seed: number, count?: number): ScoreRow[];
```

```ts
// lib/auth.ts (o context/auth-context.tsx)
export interface AuthUser {
  name: string;
}
// localStorage key: "av_user"
```

No se introduce modelo para `av_scores` (fuera de alcance, ver sección anterior).

## Plan de implementación

1. **`lib/data.ts`** — portar `data.jsx` (GAMES, CATS, PLAYERS, `seededScores`) a TypeScript tipado, sin exponer nada a `window`.
2. **Contexto de sesión** — crear `context/auth-context.tsx` (o hook `useAuth`) con `user`, `login(user)`, `logout()`, leyendo/escribiendo `localStorage["av_user"]`; envolver el árbol en `app/layout.tsx`.
3. **`components/nav.tsx`** — portar `nav.jsx`: logo, links Biblioteca/Salón de la Fama, contador de créditos estático, botón de auth (login/nombre de usuario), panel móvil. Usar `next/link` y `usePathname` para el estado activo en vez de comparar `route.name`.
4. **Layout raíz** — montar `Nav` + `<footer>` (copy igual al de `app.jsx`) en `app/layout.tsx`, envolviendo `{children}` dentro del `AuthProvider`.
5. **`/` (Biblioteca)** — `app/page.tsx` + `components/game-card.tsx`: hero, buscador, chips de categoría, grid de `GameCard` con tilt al mouse, estado "NO HAY RESULTADOS". Navegación por `next/link` a `/game/[id]`.
6. **`/game/[id]` (Detalle)** — `app/game/[id]/page.tsx`: cover, tags, descripción larga, stat-strip, leaderboard lateral (`seededScores`), botones "JUGAR AHORA" → `/game/[id]/play` y "VOLVER AL VAULT" → `/`. 404/`notFound()` si el id no existe en `GAMES`.
7. **`/game/[id]/play` (Reproductor placeholder)** — `app/game/[id]/play/page.tsx`: HUD estático (jugador = usuario actual o "INVITADO", puntuación/vidas/nivel en valores fijos de ejemplo), marco CRT con arena decorativa fija (sin animación de juego), botones "PAUSA"/"FIN"/"SALIR" visibles pero sin lógica de temporizador real (pueden navegar o no hacer nada, ver criterios de aceptación). Sin modal de fin de juego con guardado de score.
8. **`/leaderboard` (Salón de la Fama)** — `app/leaderboard/page.tsx`: tabs por juego (client component para el estado de tab activo), podio top 3, tabla completa, fila "tu mejor marca" si hay usuario logueado.
9. **`/auth` (Auth)** — `app/auth/page.tsx`: tabs "Iniciar sesión"/"Crear cuenta", formulario sin validación, botón "jugar como invitado", botones sociales decorativos. Submit llama a `login({ name })` del contexto y redirige a `/` con `useRouter`.
10. **Repaso visual final** — recorrer las 5 rutas en el navegador (desktop y mobile) comparando contra `Arcade Vault.html` para verificar paridad visual y de copy.

## Criterios de aceptación

- [ ] `/` muestra el catálogo completo de 8 juegos, con buscador por texto y filtro por categoría funcionando en cliente.
- [ ] Clic en una `GameCard` o su botón "JUGAR" navega a `/game/<id>`.
- [ ] `/game/<id>` muestra ficha del juego y un leaderboard de 10 filas generado por `seededScores`.
- [ ] "JUGAR AHORA" en `/game/<id>` navega a `/game/<id>/play`; "VOLVER AL VAULT" navega a `/`.
- [ ] `/game/<id>/play` renderiza el HUD, el marco CRT y el pie de estado sin ningún valor que cambie solo por el paso del tiempo (no hay `setInterval` incrementando score).
- [ ] `/leaderboard` permite cambiar de tab entre los 8 juegos y actualiza podio + tabla acorde al juego seleccionado.
- [ ] `/auth`: enviar el formulario de "Iniciar sesión" con cualquier texto en Usuario guarda `av_user` en localStorage, actualiza el botón de `Nav` con el nombre, y redirige a `/`.
- [ ] "Jugar como invitado" en `/auth` limpia/deja sin usuario y redirige a `/`.
- [ ] Cerrar sesión desde `Nav` borra `av_user` de localStorage y el botón vuelve a "Iniciar Sesión".
- [ ] Recargar la página (`F5`) en cualquier ruta mantiene la sesión de usuario (persistencia via localStorage).
- [ ] El panel de navegación móvil (hamburguesa) abre/cierra y permite navegar a las mismas 3 rutas que el nav de escritorio.
- [ ] Ninguna ruta referencia o importa código de juego real (no hay motor de juego, no hay canvas con lógica, no hay websockets).
- [ ] Las 5 pantallas son responsive en viewport móvil (sin overflow horizontal).

## Decisiones tomadas y descartadas

- **Rutas en inglés** (`/game/[id]`, `/leaderboard`) en vez de español, por convención técnica estándar de Next.js — la UI visible sigue en español.
- **Reproductor como placeholder estático**, no réplica de la simulación falsa del prototipo — el encargo excluye explícitamente "implementar ningún juego", y el `setInterval` que sube el score solo es percibido como juego simulado.
- **Covers con clases CSS**, no imágenes — se mantiene fiel al prototipo y evita depender de assets que no existen.
- **CSS neón reutilizado sin reescribir** — ya existe en `app/globals.css` desde un commit previo (`27ab492 Add Arcade Vault neon theme as global styles`), confirmado con 952 líneas equivalentes a `styles.css` del template.
- **Datos mock en TypeScript (`lib/data.ts`)**, no JSON aparte — se integran con tipado fuerte directamente en el código, ya que no hay necesidad de editarlos sin tocar código en este MVP.
- **Sin validación en formularios de Auth** — fiel al comportamiento del prototipo, ya que no hay backend real detrás.
- **Estructura `app/` por ruta + `components/` compartidos** — sigue la convención estándar de App Router en vez de replicar la organización "screens" del prototipo estático.

## Riesgos identificados

- El HUD del Reproductor placeholder podría percibirse como "a medio hacer" si los botones PAUSA/FIN no responden visualmente; se resuelve dándoles un estado visual (ej. togglear una clase) sin lógica de temporización real, para que la interacción no se sienta rota sin cruzar a "implementar el juego".
- Los leaderboards usan `seededScores(seed, count)` con una semilla derivada del `id`/`tab` — si se cambia el algoritmo de semilla entre Detalle y Salón de la Fama respecto al original, los números mostrados dejarán de coincidir con el prototipo; mitigado portando la función tal cual, sin modificarla.
