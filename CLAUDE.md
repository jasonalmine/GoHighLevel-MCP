# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Model Context Protocol (MCP) server exposing the GoHighLevel (GHL) sub-account API as 268 tools across 23 categories. It connects Claude Desktop, ChatGPT, and other MCP clients to a single GHL sub-account using a Private Integrations API key.

## Commands

```bash
npm run build         # tsc -> dist/
npm run lint          # tsc --noEmit (type-check only; there is no ESLint)
npm run dev           # nodemon + ts-node on src/http-server.ts (local HTTP dev)
npm start             # node dist/http-server.js (HTTP server; default prod entry)
npm run start:stdio   # node dist/server.js (stdio server for Claude Desktop)
npm test              # jest
npm run test:watch
npm run test:coverage # enforces 70% global threshold (branches/functions/lines/statements)
```

Run a single test file or test:
```bash
npx jest tests/tools/contact-tools.test.ts
npx jest -t "creates a contact"
```

Tests live in `tests/` (excluded from `tsconfig`), use `ts-jest`, and mock the API client via `tests/mocks/ghl-api-client.mock.ts`. `src/server.ts` is excluded from coverage.

## Environment

Required env vars (see `.env.example`), loaded via `dotenv`. The server throws on startup if either of the first two is missing:
- `GHL_API_KEY` — must be a **Private Integrations** API key, not a standard API key. Scopes on that key determine which tools actually work.
- `GHL_LOCATION_ID` — the sub-account to operate on.
- `GHL_BASE_URL` — defaults to `https://services.leadconnectorhq.com`.
- `PORT` / `MCP_SERVER_PORT` — HTTP port, defaults to `8000`.

GHL API version is pinned to `2021-07-28` in code (`initializeGHLClient`).

## Architecture

Three independent entry points, one shared tool layer (except the Vercel one):

- `src/server.ts` — **stdio** MCP server for Claude Desktop. `GHLMCPServer` class.
- `src/http-server.ts` — **HTTP/SSE** MCP server (Express) for hosted/web clients. Endpoints: `/health`, `/capabilities`, `/tools`, `/sse` (GET+POST), `POST /` for `tools/call`. This is the default `npm start` target.
- `api/index.js` — **standalone** serverless function for Vercel/ChatGPT. Hand-rolled MCP `2024-11-05` protocol, **not** built from `src/`. Exposes only `search` and `retrieve` tools because ChatGPT restricts tool names. Edit this file directly; it does not import the TypeScript tool layer.

Layering for the two TypeScript servers:
```
entry (server.ts / http-server.ts)
  -> 23 *Tools classes in src/tools/
       -> GHLApiClient (src/clients/ghl-api-client.ts, axios)
            -> GoHighLevel REST API
  types: src/types/ghl-types.ts
```

### Tool class pattern

Each file in `src/tools/` exports one class (e.g. `ContactTools`, `InvoicesTools`) constructed with the shared `GHLApiClient`. Every class exposes:
- a **definitions** method returning the MCP `Tool[]` schemas, and
- an **executor** method that switches on the tool name and calls a private `async` method per tool.

Naming is **inconsistent across classes** and you must match each class's actual method names:
- Definitions: most use `getToolDefinitions()`, but several use `getTools()` (social-media, association, custom-field-v2, workflow, survey, store, products, payments, invoices).
- Executors: `executeTool()` for the older classes; newer ones use `executeAssociationTool()`, `executeCustomFieldV2Tool()`, `executeWorkflowTool()`, `executeSurveyTool()`, `executeStoreTool()`, `executeProductsTool()`, or `handleToolCall()` (payments, invoices).

### Tool dispatch (the part that bites)

Both `server.ts` and `http-server.ts` route an incoming tool call to the right class via a chain of `is<Category>Tool(name)` guards, where each guard checks the name against a **hardcoded allowlist of tool-name strings**. A tool that isn't in its allowlist is unreachable even if its schema is registered.

When adding or renaming a tool you must update, in BOTH `server.ts` and `http-server.ts`:
1. The class's definitions method (schema).
2. The class's executor switch.
3. The corresponding `is<Category>Tool()` allowlist array.
4. Keep the two entry points in sync. They duplicate the tool wiring, the dispatch chain, and the per-category counts. Drift between them is the most common bug here.

### API client

`GHLApiClient` wraps a single axios instance with request/response interceptors (auth header, version header, error normalization). API methods are strongly typed against `src/types/ghl-types.ts`. Add new endpoints as methods here rather than calling axios from tool classes.

`src/types/ghl-types.ts` (~6.7k lines) holds both GHL response types and the `MCP*Params` input types for every tool. It is the single source of truth for shapes; extend it when adding tools.

## Deployment

- **Claude Desktop**: point its MCP config at `dist/server.js` (stdio) after `npm run build`. See `CLAUDE-DESKTOP-DEPLOYMENT-PLAN.md`.
- **HTTP / cloud** (Railway, Docker, generic): `npm start` runs `dist/http-server.js`. `Dockerfile`, `Procfile`, `railway.json` all target this. See `CLOUD-DEPLOYMENT.md`.
- **Vercel / ChatGPT**: `vercel.json` routes everything to `api/index.js`. `vercel-build` just runs `npm run build`, but the function itself is plain JS and self-contained.

## Conventions

- Module system is `NodeNext` ESM. Intra-`src` imports of compiled siblings use `.js` extensions (e.g. `./tools/contact-tools.js`) even though the source is `.ts`. Jest maps these back via `moduleNameMapper`.
- The stdio server logs to `process.stderr` only (stdout is the MCP channel). Never `console.log` to stdout in `server.ts`.
- `strict` TypeScript is on. `npm run lint` is the type gate.
