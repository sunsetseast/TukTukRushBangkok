# Tuk Tuk Rush: Bangkok

A browser-based, landscape 3D arcade driving prototype with procedural Bangkok Chinatown scenery, touch controls and passenger delivery missions.

## Run & Operate

- Managed workflow `artifacts/tuk-tuk-rush: web` — game preview at `/`
- `pnpm --filter @workspace/tuk-tuk-rush run typecheck` — game TypeScript check
- `pnpm --filter @workspace/api-server run dev` — optional preexisting API scaffold; the game does not use it
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The game needs no secrets, database, or external services.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/tuk-tuk-rush/src/game/` — world, simulation, controller, missions, traffic, renderer, procedural meshes and game interface
- `artifacts/tuk-tuk-rush/README.md` — architecture, verification report and real-device checklist

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

- Three-minute arcade shifts and Free Ride; four passenger routes, Thai-baht fares, quick-delivery/near-miss scoring, pause/restart and position recovery.
- Fullscreen WebGL 2 rendering, landscape touch steering/gas/brake, keyboard convenience controls, adaptive pixel ratio, synthesized audio.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
