# 05 — Juego jugable: Asteroides

**Estado:** Implemented
**Depende de:** SPEC 01
**Fecha:** 2026-09-16

**Objetivo:** Portar el prototipo `references/started-games/02-asteroids/` a un componente React/canvas real dentro de la plataforma, como una nueva entrada del catálogo (`asteroides`), con su HUD sincronizado en ambas direcciones entre el canvas y el reproductor de Next.js.

## Alcance

**Incluye:**

- Nueva entrada en `lib/data.ts` (`GAMES`): `id: "asteroides"`, `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `color: "cyan"`, `cover: "cover-asteroides"`, con `short`/`long` redactados a partir de `references/started-games/02-asteroids/README.md` (nave en campo de asteroides toroidal; los grandes se parten en medianos, los medianos en pequeños; power-up de disparo triple) y valores mock de `best`/`plays` consistentes con el resto del catálogo (ese dato sigue viniendo de `seededScores`/mock, no cambia con este spec).
- La entrada **"rocas" existente queda intacta** — no se modifica, no se renombra, no se reutiliza para este juego. "Asteroides" es un juego nuevo y distinto en el catálogo.
- Nuevos estilos `.cover-asteroides` (y sus pseudo-elementos) en `app/globals.css`, siguiendo el patrón visual ya usado por `.cover-rocas`/`.cover-invaders` (gradientes + formas via `::before`/`::after`, sin imágenes), pero con su propia composición.
- No se crean rutas nuevas: `/game/asteroides` y `/game/asteroides/play` ya funcionan solos porque `app/game/[id]/page.tsx` y `app/game/[id]/play/page.tsx` son genéricas y resuelven cualquier `id` presente en `GAMES`.
- Nuevo componente `components/games/asteroids-game.tsx` (`"use client"`) que porta 1:1 la lógica de `game.js` (constantes `RADII/SPEEDS/POINTS`, clases `Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`, funciones `spawnAsteroids/initGame/nextLevel/explode/killShip/update/draw`, loop vía `requestAnimationFrame`) a TypeScript, dentro de un `<canvas>` de 800×600, con estas adiciones sobre el original:
  - Un flag interno de pausa que `update()` respeta (mientras está activo no avanza física ni temporizadores; `draw()` sigue pintando el último frame).
  - Un `forwardRef` + `useImperativeHandle` que expone `{ pause(), resume(), restart(), forceGameOver() }` para que el reproductor de React controle el juego desde afuera.
  - Una prop `onStateChange({ score, lives, level, state })` (`state: "playing" | "dead" | "gameover"`), invocada solo cuando alguno de esos valores cambia entre frames — no en cada `requestAnimationFrame` — para que React sincronice su propio HUD sin renders innecesarios.
  - Los listeners de teclado (`ArrowLeft`, `ArrowRight`, `ArrowUp`, `Space`) se agregan/remueven en el ciclo de vida del componente (no en el scope global del módulo, como en el original) y llaman `preventDefault()` para que no hagan scroll de la página mientras se juega.
  - El HUD interno del canvas (`drawHUD`, overlay `GAME OVER` con "ESPACIO PARA REINICIAR") se mantiene dibujado igual que en el original — blanco/negro, sin reskinear a la paleta neón — y su atajo de reinicio con ESPACIO sigue funcionando.
- Modificaciones a `components/game-player.tsx`:
  - Si `game.id === "asteroides"`, renderiza `<AsteroidsGame ref={...} onStateChange={...} />` dentro de `.crt-screen` en lugar del `.game-arena` decorativo. Para cualquier otro juego del catálogo, el reproductor decorativo actual (`DEMO_SCORE`, enemigos CSS, etc.) sigue exactamente igual que hoy.
  - Estado de React (`score`, `lives`, `level`, `over`) alimentado por `onStateChange` cuando el juego activo es "asteroides"; `over` se deriva de `state === "gameover"` (así queda sincronizado sin importar si el fin de partida ocurrió por el botón FIN, por perder las 3 vidas, o si se reinició por fuera o desde dentro del canvas).
  - El HUD externo (Puntuación/Vidas/Nivel) muestra esos mismos valores en tiempo real — **queda intencionalmente duplicado** con el HUD interno del canvas; es una decisión explícita, no un descuido.
  - El botón **PAUSA** llama a `ref.pause()`/`ref.resume()` además de alternar el overlay visual "EN PAUSA" ya existente.
  - El botón **FIN** llama a `ref.forceGameOver()` en vez de solo alternar un booleano local.
  - El overlay de fin de partida (`crt-content` con "FIN DEL JUEGO" + puntuación final) gana un botón **"JUGAR DE NUEVO"** que llama `ref.restart()`. Si el jugador reinicia presionando ESPACIO directamente en la pantalla de game over del canvas, `onStateChange` reporta `state: "playing"` de nuevo y el overlay de React desaparece solo — ambos caminos de reinicio quedan sincronizados.
- Repaso visual manual en navegador (desktop) verificando todo lo anterior antes de cerrar el spec como implementado.

**No incluye (fuera de alcance de este spec):**

- Guardar la puntuación final en ningún lado (ni `localStorage` ni Supabase) ni conectarla al Salón de la Fama (`app/leaderboard/page.tsx` sigue con `seededScores`, `game.best` en el detalle sigue siendo el mock estático). Queda explícitamente pendiente para un spec futuro, una vez exista una tabla de scores real (spec 04 ya dejó registrada esa decisión pendiente).
- Controles táctiles/móviles — el juego sigue siendo solo de teclado en esta spec, igual que el original. La etiqueta "TECLADO / TÁCTIL" que ya muestra `app/game/[id]/page.tsx` para todos los juegos no se modifica ni se le agrega soporte táctil real.
- Reskin visual del canvas a la paleta neón — se mantiene blanco/negro como el original.
- Canvas responsive de verdad (recalcular `W`/`H`) — se mantiene fijo en 800×600 y se escala por CSS dentro de `.crt-screen` (que ya tiene `aspect-ratio: 4/3`, el mismo que 800×600).
- Cualquier cambio a los otros 7 juegos del catálogo o a su reproductor decorativo actual.
- Tests automatizados.

## Modelo de datos

Se agrega una entrada al arreglo `GAMES` existente en `lib/data.ts` (mismo tipo `Game` ya definido, sin cambios de forma):

```ts
{
  id: "asteroides",
  title: "ASTEROIDES",
  short: "Sobrevive en un campo de rocas espaciales sin fin.",
  long: "Tu nave flota en un espacio toroidal —cruza un borde y reapareces por el opuesto— mientras esquivas y destruyes asteroides. Los grandes se parten en medianos, los medianos en pequeños. Recoge el power-up de disparo triple cuando aparezca para limpiar el campo más rápido.",
  cat: "SHOOTER",
  cover: "cover-asteroides",
  color: "cyan",
  best: 38200,
  plays: "8.7K",
}
```

No se introduce ningún modelo de datos persistente nuevo (sin tabla, sin `localStorage`). La única "forma" nueva es el contrato entre el canvas y React:

```ts
// components/games/asteroids-game.tsx
type AsteroidsState = {
  score: number;
  lives: number;
  level: number;
  state: "playing" | "dead" | "gameover";
};

export interface AsteroidsGameHandle {
  pause(): void;
  resume(): void;
  restart(): void;
  forceGameOver(): void;
}

// Prop del componente:
onStateChange?: (s: AsteroidsState) => void;
```

## Plan de implementación

1. **Catálogo** — agregar la entrada `asteroides` a `GAMES` en `lib/data.ts` con los campos del modelo de datos de arriba. En este punto `/games` y `/game/asteroides` ya muestran la tarjeta y el detalle (con el reproductor todavía decorativo, sin canvas real).
2. **Estilos del cover** — agregar `.cover-asteroides` (y pseudo-elementos) a `app/globals.css`, siguiendo el patrón de las coberturas existentes.
3. **Motor del juego** — crear `components/games/asteroids-game.tsx` portando `game.js` a TypeScript dentro de un componente de cliente con canvas 800×600, agregando pausa interna, `forwardRef`/`useImperativeHandle` (`pause/resume/restart/forceGameOver`), `onStateChange` con detección de cambios, y listeners de teclado con `preventDefault` ligados al ciclo de vida del componente.
4. **Integración en el reproductor** — modificar `components/game-player.tsx` para ramificar por `game.id === "asteroides"`: montar `<AsteroidsGame />`, reemplazar `DEMO_SCORE/DEMO_LIVES/DEMO_LEVEL` por el estado real vía `onStateChange`, conectar PAUSA/FIN a los métodos del `ref`, y agregar el botón "JUGAR DE NUEVO" en el overlay de fin de partida. Los demás juegos no se tocan.
5. **Repaso visual manual** — recorrer `/games` → `/game/asteroides` → `/game/asteroides/play` en el navegador: jugar con teclado, verificar sincronía de HUD, probar PAUSA/REANUDAR, FIN, perder las 3 vidas sin usar FIN, "JUGAR DE NUEVO" y el reinicio con ESPACIO desde el canvas, y confirmar que SALIR funciona y que el resto del catálogo sigue sin cambios.

## Criterios de aceptación

- [ ] `lib/data.ts` incluye una entrada `id: "asteroides"` con `title: "ASTEROIDES"`, `cat: "SHOOTER"`, `cover: "cover-asteroides"`, `color: "cyan"`; la entrada `"rocas"` no cambió.
- [ ] `/games` muestra la tarjeta ASTEROIDES junto a las demás sin romper el grid ni el filtro por categoría.
- [ ] `/game/asteroides` muestra el detalle con el nuevo cover, tags, copy corto/largo y el botón "▶ JUGAR AHORA".
- [ ] `/game/asteroides/play` renderiza el canvas real (800×600 escalado por CSS dentro de `.crt-screen`) y es jugable con ←/→ (rotar), ↑ (empuje) y espacio (disparo), sin que las teclas hagan scroll de la página.
- [ ] El HUD externo (Puntuación/Vidas/Nivel) refleja en tiempo real los mismos valores que el HUD interno dibujado en el canvas.
- [ ] El botón PAUSA congela el juego real (nave/asteroides/balas dejan de moverse) y muestra el overlay "EN PAUSA"; REANUDAR continúa exactamente donde quedó.
- [ ] El botón FIN termina la partida inmediatamente (equivalente a perder todas las vidas) y aparece el overlay "FIN DEL JUEGO" con la puntuación final real y el botón "JUGAR DE NUEVO".
- [ ] Perder las 3 vidas jugando (sin usar FIN) dispara el mismo overlay de fin de partida con la puntuación real.
- [ ] "JUGAR DE NUEVO" (botón de React) reinicia el juego real (score/vidas/nivel vuelven a 0/3/1) y oculta el overlay externo.
- [ ] Reiniciar presionando ESPACIO directamente en la pantalla "GAME OVER" del canvas también oculta el overlay externo y sincroniza el HUD de React, sin tocar el botón "JUGAR DE NUEVO".
- [ ] SALIR navega de vuelta a `/game/asteroides` sin errores ni listeners de teclado colgados.
- [ ] Los otros 7 juegos del catálogo siguen mostrando el reproductor decorativo (`DEMO_SCORE`, etc.) exactamente igual que antes de este spec.
- [ ] No se persiste ni se guarda la puntuación en ningún lado — queda fuera de alcance.

## Decisiones tomadas y descartadas

- **Juego nuevo ("asteroides") en vez de reutilizar "rocas":** decisión explícita del usuario — "rocas" ya existía como entrada mock con temática similar, pero es un juego distinto y queda intacto; "Asteroides" es la implementación real y separada.
- **Sin rutas nuevas:** `app/game/[id]/page.tsx` y `app/game/[id]/play/page.tsx` ya son genéricas y resuelven cualquier `id`; agregar una ruta dedicada hubiera sido una abstracción innecesaria.
- **HUD duplicado a propósito:** el canvas mantiene su HUD interno (score/nivel/vidas/game over) igual que el original, y el reproductor de React mantiene el suyo, sincronizados vía `onStateChange`. Decisión explícita del usuario para no tener que decidir cuál "apagar".
- **Pausa, reinicio y fin de partida controlados por React, pero con las vías del canvas siempre activas:** el botón PAUSA/FIN/"JUGAR DE NUEVO" de React llama métodos imperativos del canvas, pero el atajo interno del juego original (ESPACIO para reiniciar en game over) sigue funcionando — ambos caminos quedan sincronizados porque React deriva su estado de `onStateChange` en vez de mantener un booleano local independiente.
- **Sin guardado de puntuación en este spec:** decisión explícita del usuario — se hará en un spec futuro, una vez exista una tabla de scores real en Supabase (pendiente ya registrado en la spec 04).
- **Sin reskin visual:** se mantiene el blanco/negro del original en vez de adoptar la paleta neón del resto del sitio — decisión explícita del usuario para esta primera integración.
- **Canvas fijo 800×600 escalado por CSS:** evita reescribir la lógica de `wrap()`/velocidades/radios para un canvas verdaderamente responsive; `.crt-screen` ya tiene `aspect-ratio: 4/3`, que coincide exactamente con 800×600.
- **Nuevo `.cover-asteroides` en vez de reutilizar `.cover-rocas`:** decisión explícita del usuario — evita que dos tarjetas distintas del catálogo se vean visualmente idénticas en `/games`.

## Riesgos identificados

- Los listeners de teclado deben quedar correctamente ligados al ciclo de vida del componente (agregarse al montar `/game/asteroides/play`, removerse al desmontar/navegar a SALIR); si no se limpian bien podrían quedar activos después de salir de la pantalla del juego.
- El HUD duplicado (interno + externo) es una decisión visual explícita, pero podría sentirse redundante para el jugador; se acepta como conocido para esta primera integración.
- Al portar `game.js` a TypeScript hay que tipar las clases (`Bullet`, `Asteroid`, `Ship`, `Particle`, `PowerUp`) sin alterar su comportamiento/tuning (velocidades, radios, cooldowns); un error de porting podría cambiar la sensación de juego respecto al original.
