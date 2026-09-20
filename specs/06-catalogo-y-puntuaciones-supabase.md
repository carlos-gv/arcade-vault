# 06 — Catálogo de juegos y puntuaciones reales en Supabase

**Estado:** Implemented
**Depende de:** SPEC 01, SPEC 04, SPEC 05
**Fecha:** 2026-09-20

**Objetivo:** Reemplazar el catálogo mock (`GAMES`) y el generador de puntuaciones falso (`seededScores`) por dos tablas reales en Supabase (`games` y `scores`), con lectura pública desde todas las pantallas que hoy usan el mock y guardado real de puntuación desde Asteroides (el único juego jugable), protegido con guardrails contra escritura maliciosa.

## Alcance

**Incluye:**

- Tabla `games` en Supabase que reemplaza el arreglo `GAMES` de `lib/data.ts`, sembrada con las 9 entradas actuales (incluida `asteroides`) tal cual existen hoy (mismos `id`/`title`/`short`/`long`/`cat`/`cover`/`color`).
- Tabla `scores` en Supabase que reemplaza `seededScores()`, con una fila por partida guardada (`game_id`, `player_name`, `score`, `created_at`).
- `best` (mejor puntuación) y `plays` (número de partidas) dejan de ser campos fijos del catálogo: se calculan en vivo agregando `scores` por `game_id` (`MAX(score)` y `COUNT(*)`). `plays` pasa de ser un string abreviado ("12.4K") a un número entero real; `best` se muestra como "—" para un juego sin filas en `scores`.
- Para que ningún juego se vea vacío mientras solo Asteroides tiene partidas reales, la migración siembra `scores` con 12 filas creíbles por cada uno de los 9 juegos (mismo algoritmo `seededScores` ya existente, usado una sola vez para generar los datos de siembra, con fechas repartidas en los últimos ~60 días). Cuando en el futuro se reemplace otro juego decorativo por uno jugable de verdad, esas filas sembradas para ese `game_id` se podrán borrar manualmente antes de lanzarlo — queda fuera del alcance de este spec automatizar esa limpieza.
- Guardado real de puntuación **solo para Asteroides**: al terminar la partida (overlay "FIN DEL JUEGO" en `components/game-player.tsx`), se agrega un campo de texto para el nombre del jugador (vacío por defecto, se guarda como "INVITADO" si no se escribe nada) y un botón explícito **"GUARDAR PUNTUACIÓN"** — el guardado nunca es automático.
- Nuevo Route Handler `app/api/scores/route.ts` (`POST`) que valida e inserta la puntuación usando un cliente Supabase con la **service role key** (bypassea RLS), con estos guardrails:
  - `game_id` debe existir en `games` (constraint `FOREIGN KEY` + verificación explícita antes de insertar → 404 si no existe).
  - `score` debe ser un entero mayor a 0 y menor o igual a 999999 → 400 si no cumple.
  - `player_name` se recorta a 12 caracteres, se limpia de HTML/caracteres de control (solo se permiten letras, números, espacios, `_` y `-`), y si queda vacío se usa "INVITADO".
  - Límite de frecuencia: máximo un guardado exitoso cada 5 segundos por IP (`Map` en memoria del proceso) → 429 si se excede.
- RLS habilitado en ambas tablas: **solo lectura pública** (`SELECT` para `anon`/`authenticated`). Ninguna política de `INSERT`/`UPDATE`/`DELETE` para esos roles — un intento de escritura directa contra la API pública de Supabase (REST/JS SDK con la publishable key) queda rechazado por RLS; la única vía de escritura es el Route Handler server-side con la service role key, que nunca se expone al navegador.
- Nuevo `lib/supabase/admin.ts`: cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY`, documentado como uso exclusivo de código server-side (Route Handlers), nunca importado desde un componente `"use client"`.
- Nuevo `lib/queries.ts`: `getGamesWithStats()`, `getGameById(id)`, `getTopScores(gameId, limit)` — funciones server-only sobre `lib/supabase/server.ts` que reemplazan los usos de `GAMES`/`seededScores` en las páginas.
- `lib/data.ts` conserva los tipos (`Game`, `ScoreRow`, `GameCategory`, `CATS`) y pierde `GAMES`, `PLAYERS` y `seededScores` (ya no se usan en runtime; `CATS` sigue fijo en código porque es el enum de categorías, no dato de tabla).
- Migración de páginas de cliente a Server Components que leen de Supabase una sola vez por carga (sin refetch al cambiar de tab/filtro, como se acordó):
  - `app/games/page.tsx` pasa a ser `async` (Server Component), llama `getGamesWithStats()` y delega la búsqueda/filtro/grid a un nuevo `components/games-browser.tsx` (`"use client"`, misma lógica que hoy vive en la página).
  - `app/leaderboard/page.tsx` pasa a ser `async`, obtiene `getGamesWithStats()` + `getTopScores(id, 12)` de los 9 juegos de una vez, y delega tabs/podio/tabla a un nuevo `components/leaderboard-board.tsx` (`"use client"`).
  - `app/game/[id]/page.tsx`: reemplaza `GAMES.find` + `seededScores` por `getGameById(id)` + `getTopScores(id, 10)`.
  - `app/game/[id]/play/page.tsx`: reemplaza `GAMES.find` por `getGameById(id)`.
  - `app/page.tsx` (home): pasa a ser `async` (Server Component) y usa `getGamesWithStats()` para la sección "JUEGOS DISPONIBLES AHORA" (`slice(0, 6)`). El hook `useReveal()` (IntersectionObserver) se extrae a un nuevo `components/reveal-observer.tsx` (`"use client"`, sin props, se monta una vez). `MiniCard` deja de usar `useRouter` y navega con `<Link>`, para poder vivir en un árbol server-rendered.
  - `RECENT_SCORES` y `TOP_PLAYERS` de la sección "ACTIVIDAD EN VIVO" del home **no cambian** — siguen siendo datos decorativos estáticos, fuera del alcance de este spec.
- Repaso visual manual en navegador: jugar Asteroides, guardar una puntuación y verificar que aparece en `/leaderboard`, en el aside de `/game/asteroides` y que el "mejor" en la card de `/games` se actualiza; confirmar que los otros 8 juegos siguen mostrando sus filas sembradas y no muestran el campo/botón de guardado; probar los guardrails (nombre vacío → INVITADO, intento de score fuera de rango, doble clic rápido en "GUARDAR PUNTUACIÓN" → rate limit).

**No incluye (fuera de alcance de este spec):**

- Autenticación real de Supabase — sigue mock vía `localStorage` (pendiente ya registrado en spec 04). El guardado de puntuación no requiere estar logueado; el nombre del jugador es un campo de texto libre en el momento de guardar, no el usuario mock de `auth-context`.
- Guardado real de puntuación para los otros 8 juegos del catálogo — siguen siendo reproductores decorativos (`DEMO_SCORE`, etc., sin cambios); solo Asteroides tiene botón de guardado real porque es el único juego jugable de verdad hoy.
- Automatizar la limpieza de las filas sembradas de `scores` cuando un juego decorativo se reemplace por uno jugable — se hará manualmente en el spec que implemente ese juego.
- Rate limiting distribuido/persistente — el límite de 5 segundos por IP vive en memoria del proceso del servidor; se acepta como suficiente para el tamaño actual del proyecto (ver Riesgos).
- Editar o borrar puntuaciones ya guardadas (no hay UI ni endpoint para `UPDATE`/`DELETE`).
- Paginación del leaderboard — se mantiene el límite fijo de 10-12 filas por juego, igual que hoy.
- Tests automatizados.

## Modelo de datos

### Tablas Supabase (Postgres)

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover text not null,
  color text not null check (color in ('cyan','magenta','yellow','green'))
);

create table scores (
  id bigint generated always as identity primary key,
  game_id text not null references games(id) on delete cascade,
  player_name text not null,
  score integer not null check (score > 0 and score <= 999999),
  created_at timestamptz not null default now()
);

alter table games enable row level security;
alter table scores enable row level security;

create policy "Lectura pública de games" on games for select using (true);
create policy "Lectura pública de scores" on scores for select using (true);
-- Sin políticas de insert/update/delete: anon y authenticated no pueden escribir.
-- Solo la service role (bypassea RLS) escribe, desde app/api/scores/route.ts.
```

### Tipos TypeScript (`lib/data.ts`, ajustados)

```ts
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number; // MAX(scores.score) para este game_id, o 0 si no hay filas
  plays: number; // COUNT(scores.*) para este game_id — antes era string abreviado
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string; // formateada es-ES a partir de scores.created_at
}
```

## Plan de implementación

1. **Migración Supabase** — crear `games`/`scores` con las políticas RLS de arriba (vía `mcp__supabase__apply_migration`), sembrar `games` con las 9 entradas actuales de `lib/data.ts` y `scores` con 12 filas creíbles por juego (generadas una vez con el algoritmo `seededScores` existente, fechas repartidas en los últimos ~60 días).
2. **Cliente admin** — crear `lib/supabase/admin.ts` con la service role key, documentado como server-only.
3. **Capa de datos** — crear `lib/queries.ts` (`getGamesWithStats`, `getGameById`, `getTopScores`); actualizar `lib/data.ts` quitando `GAMES`/`PLAYERS`/`seededScores` y ajustando `Game`/`ScoreRow` según el modelo de arriba.
4. **Endpoint de guardado** — crear `app/api/scores/route.ts` (`POST`) con las validaciones y el rate limit descritos en el alcance, insertando vía `lib/supabase/admin.ts`.
5. **Refactor de páginas a Server Components** — `app/games/page.tsx` + `components/games-browser.tsx`; `app/leaderboard/page.tsx` + `components/leaderboard-board.tsx`; `app/game/[id]/page.tsx`; `app/game/[id]/play/page.tsx`; `app/page.tsx` + `components/reveal-observer.tsx` + `MiniCard` con `Link`. En cada caso, la lógica visual/interactiva existente se conserva igual, solo cambia de dónde vienen los datos.
6. **Guardado desde el reproductor** — modificar `components/game-player.tsx`: agregar input de nombre + botón "GUARDAR PUNTUACIÓN" en el overlay de fin de partida cuando `game.id === "asteroides"`, con estados `idle`/`guardando`/`guardado`/`error` y llamada `POST /api/scores`.
7. **Repaso visual manual** — recorrer `/`, `/games`, `/game/asteroides`, `/game/asteroides/play` y `/leaderboard`: jugar Asteroides, guardar una puntuación con nombre y sin nombre, verificar que se refleja en las tres pantallas; confirmar que el resto del catálogo sigue mostrando datos sembrados sin botón de guardado; probar los guardrails (score inválido vía llamada directa al endpoint, doble guardado rápido → 429).

## Criterios de aceptación

- [ ] Las tablas `games` y `scores` existen en el proyecto Supabase vinculado, con RLS habilitado y solo políticas de `SELECT` público (sin `INSERT`/`UPDATE`/`DELETE` para `anon`/`authenticated`).
- [ ] `games` tiene 9 filas idénticas en contenido a las 9 entradas actuales de `lib/data.ts` (incluida `asteroides`).
- [ ] `scores` tiene 12 filas sembradas por cada uno de los 9 `game_id`.
- [ ] `/games`, `/game/[id]`, `/game/[id]/play`, `/leaderboard` y la sección "JUEGOS DISPONIBLES AHORA" del home ya no importan `GAMES` ni `seededScores` de `lib/data.ts` — leen de Supabase vía `lib/queries.ts`.
- [ ] La card de cada juego y el detalle muestran `best`/`plays` calculados desde `scores` (no un valor fijo).
- [ ] En `/game/asteroides/play`, terminar una partida muestra un campo de nombre y un botón "GUARDAR PUNTUACIÓN"; los demás 8 juegos no muestran ese campo/botón.
- [ ] Guardar una puntuación real en Asteroides hace que aparezca, sin recargar manualmente el build (con un refresh de la página sí basta, dado que no hay refetch en vivo), en `/leaderboard` (tab Asteroides), en el aside de `/game/asteroides` y actualiza `best`/`plays` en la card de `/games`.
- [ ] Guardar con el nombre vacío registra la fila como "INVITADO".
- [ ] `POST /api/scores` responde 400 si `score` es 0, negativo, no entero, o mayor a 999999.
- [ ] `POST /api/scores` responde 404 si `gameId` no existe en `games`.
- [ ] `POST /api/scores` responde 429 si se llama dos veces en menos de 5 segundos desde la misma IP.
- [ ] Un `INSERT` directo contra `scores`/`games` con la publishable key (sin pasar por el endpoint) es rechazado por RLS.
- [ ] `npm run build` compila sin errores de TypeScript.

## Decisiones tomadas y descartadas

- **Dos tablas nuevas (`games` y `scores`) en vez de solo `scores`:** decisión explícita del usuario — el catálogo completo se migra a Supabase, no solo el leaderboard.
- **`best`/`plays` calculados en vivo desde `scores` en vez de columnas fijas en `games`:** decisión explícita del usuario (aceptó la recomendación). Consecuencia aceptada: `plays` pasa de string abreviado ("12.4K") a número entero real, que por ahora será bajo para casi todos los juegos (datos sembrados) — se acepta el cambio de formato.
- **Siembra de `scores` con datos creíbles para todos los juegos, no solo Asteroides:** decisión explícita del usuario ("cuando reemplace un juego decorativo, puedo limpiar la base de datos antes") — evita que el catálogo se vea vacío mientras el resto de los juegos siguen siendo decorativos, y deja la limpieza por juego como tarea manual futura, no automatizada aquí.
- **Guardado real solo para Asteroides:** es el único juego con lógica jugable real; los demás no generan un score real que valga la pena persistir todavía.
- **Botón explícito "GUARDAR PUNTUACIÓN" en vez de guardado automático al terminar la partida:** decisión explícita del usuario — evita registrar partidas de prueba o accidentales, y sigue el patrón clásico de arcade de ingresar el nombre al final.
- **Sin exigir login (mock) para guardar, nombre de texto libre:** decisión explícita del usuario — se guarda como invitado, con la posibilidad de escribir un nombre a mano; no se conecta con `auth-context` en esta spec.
- **Escritura solo vía Route Handler con service role key, RLS sin políticas de insert para `anon`/`authenticated`:** decisión explícita del usuario ("valida la seguridad total... guardrails para prohibir insert malicioso") — un `INSERT` directo contra la API pública de Supabase queda bloqueado a nivel de base de datos, no solo por convención de la app.
- **Guardrails concretos en el endpoint (validación de `game_id`, rango de `score`, saneado de `player_name`, rate limit de 5s por IP):** decisión explícita del usuario ("agrega todos los guardrails que mencionaste").
- **Server Components que leen una sola vez por carga (sin refetch al cambiar de tab/filtro):** decisión explícita del usuario (aceptó la recomendación) — mantiene la UX instantánea actual de cambiar de tab en el Salón de la Fama, a costa de no reflejar en vivo puntuaciones guardadas por otra persona mientras la pestaña sigue abierta (aceptable para el tamaño del proyecto).
- **`lib/queries.ts` nuevo en vez de agregar las consultas a `lib/data.ts`:** separa datos estáticos/tipos (`lib/data.ts`) de acceso a Supabase server-only (`lib/queries.ts`), seguido del mismo criterio que ya separa `lib/supabase/client.ts`/`server.ts`.
- **`MiniCard` del home pasa de `useRouter` a `Link`:** necesario para que el home pueda ser Server Component (solo `useReveal` requiere quedar en un client component aparte, `components/reveal-observer.tsx`); no cambia el comportamiento visible para el usuario.
- **`RECENT_SCORES`/`TOP_PLAYERS` del home quedan fuera de alcance:** son contenido decorativo de la sección "actividad en vivo", no forman parte de "leaderboard" ni "tabla de juegos" tal como se definieron en esta spec; conectarlos a datos reales de `scores` puede ser un spec futuro si se decide.

## Riesgos identificados

- El rate limit de 5 segundos vive en un `Map` en memoria del proceso: se reinicia en cada redeploy y no se comparte entre instancias si el hosting llegara a escalar horizontalmente. Se acepta como suficiente para el tráfico actual del proyecto; si el sitio crece, habrá que moverlo a un almacén compartido (ej. una tabla o Redis).
- Antes de esta spec, `/leaderboard` y el aside de `/game/[id]` usaban semillas distintas (`tab.length*23+7` vs `id.length*17+3`) y podían mostrar top-scores distintos para el mismo juego. Con una sola tabla `scores` como fuente de verdad, ambas pantallas mostrarán exactamente los mismos datos — es una corrección de inconsistencia, no una regresión, pero es un cambio de comportamiento visible.
- Si en el futuro se agrega Supabase Auth real, habrá que decidir si el guardado de puntuación pasa a asociarse al usuario autenticado en vez de aceptar cualquier nombre de texto libre — decisión explícitamente diferida, no resuelta aquí.
