<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Playwright MCP output files

The `playwright` MCP server is configured with `--output-dir` pointing at `.playwright-mcp/` (see this project's MCP config), and default-named artifacts (page snapshots, console logs) respect it correctly. However, when a tool call passes an explicit `filename` (e.g. `browser_take_screenshot`, PDF export), the server resolves it relative to its process cwd (the repo root), **not** `--output-dir` — so an explicit filename lands in the repo root instead of `.playwright-mcp/`.

Rule: whenever passing an explicit `filename` to a Playwright MCP tool, prefix it with `.playwright-mcp/` (e.g. `.playwright-mcp/homepage.png`) so it lands in the right place without a manual move afterward.
