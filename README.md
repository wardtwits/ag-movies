# WWIT: Common Cast Graph

A React + TypeScript (Vite) site that compares any two movie/TV titles using TMDB and renders a colorful, interactive node-link diagram of actors shared between both.

This app is frontend-only and deployable to GitHub Pages (no server backend).

## Current feature

- Input title A and title B
- Resolve best TMDB match for each title
- Fetch each title's cast
- Compute actor intersection
- Visualize the relationship in a force-directed graph

## Reusable architecture

- `src/domain/media.ts`: shared core media/cast types
- `src/api/tmdbClient.ts`: typed TMDB client + title resolution
- `src/features/common-cast/commonCastService.ts`: intersection logic
- `src/features/common-cast/graphModel.ts`: graph data transformation
- `src/components/CommonCastForm.tsx`: reusable compare form
- `src/components/CommonCastGraph.tsx`: reusable node-link graph renderer

This split is designed so future compare modes (for example actor-to-actor, title-to-actor) can reuse API/domain layers and only add new feature modules.

## Environment setup

1. Install dependencies:

```bash
npm install
```

2. Configure token:

```bash
cp .env.example .env.local
```

Then set:

```bash
VITE_TMDB_BEARER_TOKEN=your_tmdb_v4_read_access_token
```

## Run locally

```bash
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

This project is configured for project pages under `/wwit/`.

1. Ensure the GitHub repo is `wwit` under your account.
2. Commit and push your changes.
3. Deploy:

```bash
npm run deploy
```

4. In GitHub repo settings, set Pages source to `gh-pages` branch (if not already set).

If your repo name changes, update the build base path with:

```bash
GITHUB_PAGES_BASE_PATH=<new-repo-name>
```

## Security note for frontend-only apps

Any TMDB token used in a static frontend can be viewed by users in browser network/devtools once deployed.
Use a least-privilege read token and rotate it if needed.
