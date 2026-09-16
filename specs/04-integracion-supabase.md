# 04 — Integración de Supabase en la app Next.js

**Estado:** Implementado
**Depende de:** SPEC 01
**Fecha:** 2026-09-16

**Objetivo:** Instalar y configurar el SDK de Supabase (`@supabase/supabase-js` + `@supabase/ssr`) en la app Next.js — clientes de navegador y servidor, variables de entorno documentadas — sin construir todavía autenticación ni persistencia funcional, como base para specs futuros.

## Alcance

**Incluye:**

- Agregar las dependencias `@supabase/supabase-js` y `@supabase/ssr` a `package.json`.
- Documentar en `.env.example` **todas** las variables necesarias, vacías (mismo patrón que `RESEND_API_KEY` del spec 03):
  - `NEXT_PUBLIC_SUPABASE_URL=`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`
  - `SUPABASE_SERVICE_ROLE_KEY=` (placeholder para uso server-side futuro; esta spec no la consume todavía, pero se deja documentada para no tener que volver a tocar `.env.example` en el spec que la necesite).
- **No se crea ni se toca `.env.local`.** Es un archivo de solo lectura/escritura del usuario. Al terminar la implementación, se le informa qué variables agregar y de dónde sacarlas (URL y publishable key vía las herramientas MCP de Supabase; la service role key desde el dashboard de Supabase, Project Settings → API, porque las herramientas MCP de publishable keys no exponen secretos).
- Crear `lib/supabase/client.ts`: función `createClient()` que arma un cliente Supabase de navegador vía `createBrowserClient` (`@supabase/ssr`), leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Crear `lib/supabase/server.ts`: función async `createClient()` que arma un cliente Supabase de servidor vía `createServerClient` (`@supabase/ssr`), integrando la cookie store async de `cookies()` de `next/headers` (API async de Next.js 16).
- Verificar que el cliente de servidor efectivamente se conecta al proyecto real, una vez que el usuario haya completado `.env.local` (paso manual de verificación, sin dejar código de prueba commiteado).

**No incluye (fuera de alcance de este spec):**

- Autenticación funcional (sign up / sign in / sign out reales, manejo de sesión, proxy de refresco de sesión). Se deja registrado para el spec futuro que la implemente: **solo email/contraseña** (sin OAuth de Google/GitHub pese a que el mockup los muestra), y que el formulario **mantiene el campo "usuario"** del mockup actual — el username se resolverá a email internamente en vez de cambiar el copy a "correo electrónico".
- Cualquier cambio a `context/auth-context.tsx` o `app/auth/page.tsx` — siguen exactamente igual que hoy (mock con `localStorage`).
- Tabla `profiles` u otro modelo de datos de usuario.
- Tablas `scores` / `games` reales, cambios al Salón de la Fama (`app/leaderboard/page.tsx` sigue usando `seededScores`) o al HUD de `components/game-player.tsx` (sigue con `DEMO_SCORE`).
- Row Level Security (RLS) y cualquier política — no se crea ninguna tabla en esta spec.
- Un `proxy.ts` de refresco de sesión — no hay sesión real que mantener viva todavía; se agrega en el spec de auth funcional.
- Tests automatizados.

## Modelo de datos

No se introduce ningún modelo de datos ni tabla en Postgres — el proyecto Supabase vinculado no tiene tablas (`list_tables` → `[]`) y esta spec no crea ninguna. Lo único nuevo son las funciones factory de cliente:

```ts
// lib/supabase/client.ts
export function createClient(): SupabaseClient {
  /* createBrowserClient(...) */
}

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient> {
  /* createServerClient(...) usando cookies() */
}
```

## Plan de implementación

1. **Dependencias** — agregar `@supabase/supabase-js` y `@supabase/ssr` a `package.json` e instalar.
2. **Variables de entorno (solo `.env.example`)** — agregar `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` y `SUPABASE_SERVICE_ROLE_KEY=`, las tres vacías. No se toca `.env.local`.
3. **Cliente de navegador** — crear `lib/supabase/client.ts` con `createClient()` vía `createBrowserClient`.
4. **Cliente de servidor** — crear `lib/supabase/server.ts` con `createClient()` async vía `createServerClient`, usando la API async de `cookies()` de Next.js 16 para leer/escribir las cookies de sesión (aunque todavía no haya sesión real que gestionar).
5. **Aviso al usuario** — informar qué variables debe agregar a su propio `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto ya vinculado; `SUPABASE_SERVICE_ROLE_KEY` desde el dashboard de Supabase si quiere dejarla lista para uso futuro) y esperar a que él lo haga.
6. **Verificación de conectividad** — una vez que el usuario confirme que completó `.env.local`, correr un script temporal (no commiteado, por ejemplo en el scratchpad de la sesión) que importe `lib/supabase/server.ts`, cree el cliente y llame algo simple (p. ej. `auth.getSession()`) para confirmar que responde sin error contra el proyecto real; borrar el script al terminar.
7. **Verificación de build** — correr `npm run build` (o `npx tsc --noEmit`) y confirmar que compila sin errores con los nuevos archivos incluidos en el chequeo de tipos.

## Criterios de aceptación

- [x] `@supabase/supabase-js` y `@supabase/ssr` están en `package.json` (`dependencies`) e instalados en `node_modules`.
- [x] `.env.example` documenta `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `SUPABASE_SERVICE_ROLE_KEY`, las tres sin valores reales.
- [x] `.env.local` no fue creado ni modificado por la implementación — sigue siendo responsabilidad exclusiva del usuario.
- [x] `lib/supabase/client.ts` exporta `createClient()` que devuelve un cliente Supabase de navegador funcional.
- [x] `lib/supabase/server.ts` exporta una función async `createClient()` que devuelve un cliente Supabase de servidor funcional, compatible con la API async de `cookies()` de Next.js 16.
- [x] Una vez que el usuario completó `.env.local`, una verificación puntual (route handler temporal, no commiteado) confirmó que el cliente de servidor se conecta al proyecto real sin lanzar errores.
- [x] `npm run build` compila sin errores de TypeScript.
- [x] `context/auth-context.tsx`, `app/auth/page.tsx`, `app/leaderboard/page.tsx` y `components/game-player.tsx` no cambian de comportamiento respecto a hoy.

## Decisiones tomadas y descartadas

- **Solo integración técnica, sin auth funcional:** decisión explícita del usuario — esta spec deja la base lista para que un spec futuro construya sign up/in/out reales sin tener que resolver la configuración del SDK al mismo tiempo.
- **`lib/supabase/` en vez de `utils/supabase/`** (convención por defecto de la documentación de Supabase): se mantiene consistencia con `lib/data.ts`, que ya es la carpeta de módulos de datos/infraestructura de este proyecto.
- **Publishable key (`sb_publishable_...`) en vez de la legacy anon key (JWT):** es el formato que Supabase recomienda para apps nuevas (rotación independiente, mejor seguridad); la anon key legacy queda disponible si algún día se necesita compatibilidad hacia atrás.
- **Sin `proxy.ts` de refresco de sesión en esta spec:** el refresco de sesión solo tiene sentido una vez que exista una sesión real que mantener viva; agregarlo ahora sería anticiparse a un spec que todavía no está definido.
- **`.env.local` queda fuera del alcance de la implementación — decisión explícita del usuario:** solo él lee/escribe ese archivo. `.env.example` documenta las tres variables vacías (incluida `SUPABASE_SERVICE_ROLE_KEY` como placeholder) y, al terminar el código, se le avisa qué agregar y de dónde sacarlo, en vez de escribir el archivo automáticamente.
- **`SUPABASE_SERVICE_ROLE_KEY` documentada ya, aunque no se use en esta spec:** evita tener que volver a tocar `.env.example` en el primer spec futuro que necesite operaciones server-side privilegiadas (p. ej. bypass de RLS en un job administrativo).
- **Auth futuro: email/contraseña solamente, campo "usuario" se mantiene:** decisiones ya tomadas por el usuario para cuando se escriba el spec de auth funcional, registradas aquí para no tener que volver a preguntarlas.

## Riesgos identificados

- Si el usuario no completa `.env.local`, la verificación de conectividad (paso 6) y cualquier uso real del cliente quedan bloqueados hasta que lo haga — es esperado, no bloquea el resto de la implementación (dependencias, archivos de cliente, `.env.example`).
- El proyecto Supabase vinculado está vacío (sin tablas). Si alguna vez existe otro proyecto Supabase real para producción, habrá que revisar que las variables de entorno apunten al proyecto correcto antes de desplegar.
