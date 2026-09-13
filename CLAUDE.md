# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Arcade Vault ("ARCADE VAULT") — a neon/retro arcade platform where users play browser games and compete on a leaderboard for high scores. Spanish is the UI language (see `references/templates/`). Currently just a fresh `create-next-app` scaffold (App Router, TypeScript, Tailwind v4) — the actual app has not been built yet.

## Commands

```bash
npm run dev     # start dev server (Turbopack, on by default in Next 16)
npm run build   # production build (Turbopack by default; fails if a webpack config is present — see AGENTS.md note)
npm run start   # run the production build
npm run lint    # eslint via eslint-config-next (flat config, eslint.config.mjs)
```

No test runner is configured yet.

## Working in this repo — read AGENTS.md first

This project pins **Next.js 16.3.5**, which has real breaking changes vs. older Next.js knowledge (sync `params`/`searchParams`/`cookies()`/`headers()`/`draftMode()` removed — everything is async now; `middleware` renamed to `proxy`; Turbopack is the default bundler for both dev and build; `turbopack` config moved out of `experimental`). Before writing routing, data-fetching, metadata, image-generation, or config code, check the matching guide under `node_modules/next/dist/docs/01-app/` — don't rely on pretrained assumptions about Next.js APIs.

## Architecture

- App Router lives in `app/` (currently just the default `layout.tsx` / `page.tsx` from `create-next-app`, using Geist fonts and Tailwind).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Styling is Tailwind CSS v4 via `@tailwindcss/postcss` (see `app/globals.css`), not a `tailwind.config.js`.

## Design/spec reference material

`references/templates/` contains a **static HTML/React (no build step, `React` global, `window.X = X` module pattern) prototype** of the intended app — this is the design/behavior spec to port into the real Next.js app, not code to import directly:

- `app.jsx` — root component; hash-based routing via a `route` object (`{ name: "biblioteca" | "detalle" | "player" | "auth" | "salon" }`) kept in `location.hash`, plus `user` and score data persisted to `localStorage` (`av_user`, `av_scores`).
- `nav.jsx` — top nav bar (Biblioteca / Salón de la Fama / auth button) plus a mobile slide-out panel.
- `data.jsx` — mock game catalog (`GAMES`): id, title, description, category, cover, color theme, best score, play count.
- `biblioteca.jsx` — game library/browse screen.
- `detalle.jsx` — game detail screen.
- `reproductor.jsx` — the actual game player screen.
- `salon.jsx` — Salón de la Fama (hall of fame / leaderboard).
- `auth.jsx` — sign in/up screen.
- `styles.css` — the neon arcade visual language (colors, pixel type, glow effects) referenced by all screens above.
- `Arcade Vault.html` — the assembled static prototype; open it directly to see the intended UX/flow before reimplementing a screen.

When implementing a feature, check the corresponding template file for the intended UI/behavior/copy before designing your own.

## Spec-driven workflow

Per `README.md`, this project follows spec-driven development using `/spec` and `/spec-impl` conventions from https://github.com/Klerith/fernando-skills (installed via `npx skills@latest add Klerith/fernando-skills`). Look for `/spec` output (specs) before implementing a feature, and use `/spec-impl` to carry a spec into code.
