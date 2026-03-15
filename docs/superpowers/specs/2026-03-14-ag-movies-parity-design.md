# AG Movies Parity Design

## Goal
Update `/Users/ww1999/Documents/GitHub/wwit` so the site matches the full interaction model of `/Users/ww1999/Documents/GitHub/ag-movies` while preserving stronger engineering practices already present in `wwit`.

The target outcome is product parity in:
- visual shell and page structure
- search flow and locked selection behavior
- mode switching
- filter toggle behavior
- results presentation
- About / How it Works surfaces
- TMDB attribution footer

The implementation must not copy the Vue/Tailwind code structure from `ag-movies`. `wwit` remains a React + TypeScript application with typed domain and API layers.

## Non-Goals
- Do not migrate `wwit` to Vue.
- Do not copy `ag-movies` source verbatim.
- Do not weaken existing TMDB typing, caching, or search coordination.
- Do not add a backend or database.
- Do not change the deployed API model away from direct TMDB browser access.

## Product Scope
### 1. Main Shell
Rebuild the `wwit` homepage to match the `ag-movies` structure:
- top navigation with `About` and `How it Works`
- centered multicolor `CastLink` wordmark
- segmented mode control for `Actors`, `Titles`, and `Bacon's Law`
- search area directly below the mode control
- TMDB attribution footer

### 2. Search Modes
Replicate the `ag-movies` interaction model:
- `Actors`: pick two actors, then show shared titles
- `Titles`: pick two titles, then show shared cast
- `Bacon's Law`: pick one actor, then show the Kevin Bacon path

### 3. Locked Selection Flow
Selections should use the same visible model as `ag-movies`, but implemented cleanly in React:
- autocomplete dropdown while typing
- selected item becomes a locked pill/card inside the search field
- clear with inline `x`
- clear with keyboard `Backspace` or `Delete`
- clicking the locked field does not unlock it
- results clear immediately if a locked selection is removed

### 4. Filter Toggle
Bring over the visible filter toggle from `ag-movies` for `Actors` and `Titles` modes:
- label: `Filter out Talk Shows & "Self" cameos`
- hidden in `Bacon's Law`
- enabled by default

Filtering rules should continue using `wwit`'s existing definitions:
- hide TV results with genre `10767`
- hide cast/credit items whose character is `Self`

### 5. Results
Replace the current result UI with the `ag-movies` model:
- loading skeletons
- result count header
- empty state
- poster/profile card grid
- clickable TMDB links for each result card

Mode-specific result mapping:
- `Actors`: cards represent shared titles
- `Titles`: cards represent shared actors
- `Bacon's Law`: degree summary plus ordered path display styled in the same design language

### 6. Informational Surfaces
Add:
- `About` dialog
- `How it Works` dialog

These should match the `ag-movies` interaction pattern but use clean React components and local data/config instead of large inline templates.

## Architecture
### Core Principle
Treat `ag-movies` as the product specification, not the implementation template.

### Proposed Component Structure
- `App.tsx`
  - owns high-level mode, selection, filter, loading, dialog, and result state
- `src/components/AppNav.tsx`
  - top navigation with About and How it Works triggers
- `src/components/HeroHeader.tsx`
  - multicolor `CastLink` wordmark and segmented control
- `src/components/FilterToggle.tsx`
  - toggle visible only for two-input modes
- `src/components/SelectionSearchArea.tsx`
  - one or two locked-search fields and optional random action
- `src/components/SearchAutocompleteField.tsx`
  - suggestion list, locked selection state, clear actions
- `src/components/ResultsSection.tsx`
  - wrapper for loading, empty, and success states
- `src/components/ResultCard.tsx`
  - reusable card for title/person result items
- `src/components/BaconPathSection.tsx`
  - Bacon-specific ordered path display
- `src/components/Dialog.tsx`
  - reusable modal shell
- `src/components/AboutDialog.tsx`
- `src/components/HowItWorksDialog.tsx`
- `src/components/TmdbFooter.tsx`

### Data / Service Boundaries
Keep business logic outside presentational components:
- `src/api/tmdbClient.ts`
  - search and fetch calls
- `src/features/autocomplete/`
  - debounced suggestion loading and cache
- `src/features/common-cast/`
  - shared cast calculations
- `src/features/common-titles/`
  - shared title calculations
- `src/features/bacon-law/`
  - Bacon path logic
- `src/domain/`
  - typed media/person models and filter helpers

Components should consume typed data and callbacks, not perform ad hoc TMDB fetch logic themselves.

## State Model
`App.tsx` should own a small explicit state model:
- `mode`
- `leftQuery`, `rightQuery`
- `leftSelection`, `rightSelection`
- `filterHiddenExtras`
- `isLoading`
- `errorMessage`
- `resultsState`
- `aboutDialogOpen`
- `howItWorksOpen`

Derived state:
- active mode configuration
- whether enough locked selections exist to auto-run search
- mapped card data for the current result mode

## Search And Auto-Run Behavior
### Suggestions
Continue using the current debounced autocomplete model:
- minimum 3 characters
- 300ms debounce
- stale request protection
- in-memory result cache by normalized query

### Auto-Search
Remove manual submit.

Auto-run when required selections are locked:
- `Titles`: both selected titles
- `Actors`: both selected actors
- `Bacon's Law`: selected actor

Use a request key guard so stale async responses cannot overwrite newer state.

### Random Match
Retain `Random Match` for the two-input modes.
The random action should:
- set locked selections
- immediately populate the corresponding results
- bypass redundant search work when the random service already has the result

## Filtering Strategy
The filter toggle should be a first-class part of the product, but implemented more robustly than `ag-movies`.

Preferred behavior:
- preserve enough raw fetched overlap input in memory to reapply filters locally when feasible
- avoid depending on browser fetch cache for correctness
- if a local refilter is not possible for a mode, refetch explicitly and predictably

## Results Mapping
### Actors Mode
Input:
- two selected actors

Output:
- shared title cards

Card fields:
- poster
- title
- subtitle: role summary if available, otherwise media type/year
- detail: secondary metadata when useful
- click target: TMDB movie or TV page

### Titles Mode
Input:
- two selected titles

Output:
- shared actor cards

Card fields:
- profile image
- actor name
- subtitle: strongest shared role summary
- detail: role category or supporting metadata
- click target: TMDB person page

### Bacon's Law
Input:
- one selected actor

Output:
- degree summary
- ordered actor/title path display to Kevin Bacon

Keep `wwit`'s stronger Bacon path logic rather than limiting the search to the shallower `ag-movies` implementation.
Only the presentation should move toward the `ag-movies` style.

## Dialog Design
### About Dialog
Replicate the presence and structure of the `ag-movies` About surface, but keep content in typed local config rather than hardcoded, template-heavy markup.

### How It Works Dialog
Replicate the three explanation sections:
- Compare Actors
- Compare Titles
- Bacon's Law

Each section should be data-driven so content can be maintained without editing large JSX blocks.

## Styling Strategy
Target the `ag-movies` visual language:
- light surface-driven shell
- Google-inspired multicolor wordmark
- pill segmented control
- rounded search surfaces
- restrained shadows
- clean card grid
- lightweight motion

But keep the CSS maintainable:
- consolidate tokens in `:root`
- keep classes purpose-specific
- avoid deeply duplicated one-off styling
- preserve responsive behavior for mobile and desktop

## Accessibility
Required behaviors:
- dialog focus management and close affordances
- keyboard access for segmented controls, toggles, and clear buttons
- accessible labels for search fields and buttons
- proper live regions for loading / result updates where needed
- clickable result cards with visible focus states

## Error Handling
- Keep typed TMDB errors surfaced as readable status text
- Empty results should render a deliberate empty state, not a blank section
- Stale requests must never overwrite current results
- Clearing a selection must clear any now-invalid results and error state

## Testing And Verification
This repo currently has build/lint validation but no established React test harness.
Implementation verification should include:
- `npm run build`
- `npm run lint`
- manual browser verification on desktop and narrow mobile widths

Manual test matrix:
- mode switching resets appropriately
- autocomplete selection locks correctly
- clear actions reset results
- auto-search fires only when selections are complete
- filter toggle updates results correctly
- random match still works
- About dialog opens/closes
- How It Works dialog opens/closes
- TMDB links open correctly
- Bacon path renders correctly

## Risks
- Recreating the `ag-movies` shell exactly while preserving current `wwit` feature differences may tempt oversized `App.tsx` growth; this should be controlled with focused presentational components.
- Filter-toggle parity may push toward duplicate data transforms; shared result mappers should be introduced instead.
- Bacon presentation parity must not accidentally weaken the stronger existing Bacon search behavior.

## Recommended Implementation Order
1. Replace the shell layout and navigation
2. Add dialogs
3. Port segmented control and filter toggle
4. Update search area to fully match the `ag-movies` interaction model
5. Replace results with card-grid presentation
6. Adapt Bacon presentation
7. Final responsive polish and verification
