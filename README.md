# WWIT: Common Cast Graph

A React + TypeScript (Vite) site that compares two inputs using TMDB and renders a colorful, interactive Magnetic Overlap Layout.

This app is frontend-only and deployable to GitHub Pages (no server backend).

## Current feature

- Search mode: TV/Film vs TV/Film
- Search mode: Actor vs Actor
- Search mode: Bacon's Law (actor to Kevin Bacon)
- Random Match for TV/Film and Actor modes using curated TMDB ID pairs
- Resolve best TMDB matches
- Compute intersection (shared actors or shared titles)
- Visualize overlap in a draggable Magnetic Overlap Layout
- Trace a Kevin Bacon connection path with degree count

## Reusable architecture

- `src/domain/media.ts`: shared core media/cast types
- `src/api/tmdbClient.ts`: typed TMDB client + title resolution
- `src/features/common-cast/commonCastService.ts`: intersection logic
- `src/features/common-titles/commonTitlesService.ts`: actor-to-actor overlap logic
- `src/features/bacon-law/baconLawService.ts`: actor-to-Kevin Bacon connection search
- `src/features/random-match/randomMatchService.ts`: curated random pairs that guarantee overlap without search calls
- `src/features/common-cast/graphModel.ts`: graph data transformation
- `src/features/common-titles/graphModel.ts`: graph data transformation for shared titles
- `src/components/CommonCastForm.tsx`: reusable compare form
- `src/components/CommonCastGraph.tsx`: reusable Magnetic Overlap renderer
- `src/components/BaconPathGraph.tsx`: path renderer for Bacon's Law results

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
