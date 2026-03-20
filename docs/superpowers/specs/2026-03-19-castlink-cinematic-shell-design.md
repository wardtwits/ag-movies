# CastLink Cinematic Shell Redesign

## Goal
Redesign `/Users/ww1999/Documents/GitHub/ag-movies` so CastLink adopts a close visual match to the provided cinematic desktop mockup while preserving the current product behavior, search flow, and field counts.

The target outcome is:
- a moody old-Hollywood shell across the whole app
- a visible mode switcher that remains part of the main hero
- a frosted, spotlight-lit search experience
- an actor-only featured result scene that turns the first shared-title results into a cinematic filmstrip composition
- no regression in autocomplete, filtering, sharing, dialogs, or Bacon path behavior

## Approved Decisions
- Apply the new theme across the whole app, not only the actor flow.
- Treat the mockup as a close visual target.
- Keep the number of input fields exactly as-is per mode.
- Keep the mode switcher visible on the page.
- Apply the special filmstrip treatment only to `Actors` mode for now.
- Use the attached conversation mockup as the visual reference for this redesign pass.

## Non-Goals
- Do not change search semantics or add new search modes.
- Do not reduce `Actors` or `Titles` mode from two fields to one field.
- Do not move the mode switcher into a hidden menu.
- Do not redesign `Titles` or `Bacon's Law` into bespoke cinematic result scenes in this pass.
- Do not rewrite the TMDB service, autocomplete hooks, or result derivation logic unless needed to support presentation.
- Do not introduce a backend, persistence layer, or account model.

## Product Scope
### 1. Global Visual System
Replace the current bright utility styling with a cinematic system:
- near-black background with subtle grain and spotlight gradients
- warm gold brand typography and headings
- cool slate-blue glass surfaces for panels and search containers
- softer contrast transitions, restrained glow, and layered shadows
- styling consistency across nav, dialogs, hero, results, and footer

The overall tone should feel like a projection room or theater lobby rather than a search dashboard.

### 2. Main Shell
Retain the current shell structure:
- top nav with `About` and `How It Works`
- centered `CastLink` brand in the hero
- visible mode switcher directly under or near the brand
- main search panel below the switcher
- TMDB attribution footer

The hierarchy changes from compact utility layout to staged composition:
- larger brand moment
- wider hero spacing on desktop
- clearer hero/result separation
- more atmospheric background treatment behind the main content

### 3. Search Surface
Per-mode field counts remain unchanged:
- `Actors`: two person fields
- `Titles`: two media fields
- `Bacon's Law`: one person field

The redesign should make the search surface feel closer to the mockup:
- use wide frosted-glass shells
- visually compose the two `Actors` fields as one connected search band on larger screens without merging them semantically
- keep current locked-selection behavior, dropdown search, clear buttons, and keyboard support
- restyle helper copy, clear buttons, loading states, and inline actions into the new theme

### 4. Actor Mode Featured Result Scene
`Actors` mode gets a new featured result block above the remaining results grid.

This scene should:
- use the selected left and right actor as visual anchors
- show a heading framing the connection between the two actors
- render a stylized filmstrip path between them
- promote a small set of shared titles into the path as poster nodes
- preserve click-through behavior to TMDB for each featured title

The featured scene is a presentation layer over existing shared-title data, not a new search result type.

Preferred title promotion strategy:
- choose up to three shared titles from the existing filtered actor result
- prioritize titles already considered strongest by the current ranking model
- preserve deterministic ordering so repeated renders do not feel random

### 5. Secondary Actor Results
After the featured scene, keep the remaining shared titles available in a secondary results section.

This section should:
- retain result count, filter state, share-link behavior, loading, and empty/error surfaces
- inherit the new cinematic styling
- continue to display the full set of shared-title cards not already promoted into the featured scene

The redesign must not hide data simply because the top scene highlights only a subset.

### 6. Titles Mode
`Titles` mode keeps its current information architecture:
- two title inputs
- shared-cast results grouped as they are now
- same filtering and share behavior

Changes in this mode are visual:
- adopt the same dark shell, gold typography, glass surfaces, and card styling
- update spacing and hierarchy so the mode feels native to the new theme
- do not add a filmstrip or actor-scene layout here in this pass

### 7. Bacon's Law
`Bacon's Law` keeps its current single-field flow and result structure.

Changes in this mode are visual:
- reskin the hero and path section into the cinematic system
- preserve `Surprise Me`, share-link behavior, loading, empty, and error handling
- do not replace the ordered Bacon path with a new scene-based layout in this pass

### 8. Dialogs And Footer
`About`, `How It Works`, and TMDB attribution should be visually integrated into the new theme:
- darker overlays and panel treatments
- readable, high-contrast type
- consistent gold/slate accent usage
- no fallback to the legacy bright Google-inspired palette

## Architecture
### Core Principle
Keep current data and coordination boundaries intact. The redesign is primarily a shell and composition change, with one actor-specific featured-results unit added above the existing grid model.

### Proposed Units
- `App.tsx`
  - continues to own search mode, query state, selected entities, filter state, loading, sharing, and result derivation
  - derives featured actor-scene data from the existing `displayedComparisonState`
- `src/components/HeroHeader.tsx`
  - keeps the visible mode switcher and brand area
  - updates markup only as needed for the new hero composition
- `src/components/SearchAutocompleteField.tsx`
  - preserves selection/dropdown behavior
  - adopts the new glass search treatment and selected-state styling
- `src/components/ResultsSection.tsx`
  - remains the wrapper for loading, error, empty, filter, share, and grid sections
  - gains support for rendering an optional actor featured-scene block before the result groups
- `src/components/ActorConnectionSpotlight.tsx`
  - new component responsible only for the actor-to-actor cinematic result scene
  - receives selected actors and featured shared-title items as props
  - does not fetch or derive business data internally
- `src/components/ResultCard.tsx`
  - remains the reusable card used for remaining actor results and all title-mode results
- `src/components/BaconPathSection.tsx`
  - visual reskin only
- dialog and footer components
  - visual reskin only

### Boundary Rules
- Search services stay in `src/features/**` and `src/api/**`.
- Ranking and filtering continue to happen in state derivation, not inside presentational components.
- The new actor spotlight component should accept plain typed props and remain independently understandable without knowledge of TMDB fetch flows.
- No component should gain mixed responsibility for both async search coordination and cinematic layout rendering.

## Data Flow
### Existing Inputs To Reuse
The actor spotlight should be built from state already available after an actor search:
- `displayedComparisonState.result.left`
- `displayedComparisonState.result.right`
- `displayedComparisonState.result.sharedTitles`

### Derived Actor Spotlight Model
Add a derived view model in `App.tsx` for actor mode only:
- `leftActor`
- `rightActor`
- `featuredTitles`
- `remainingTitles`

`featuredTitles` should be selected from the already filtered actor result so the spotlight respects the active filter state.

`remainingTitles` should feed the existing result groups after featured-title removal.

### Search And Share Behavior
No change to:
- auto-run search when valid locked selections are present
- stale request guards
- duplicate-selection validation
- filter toggling behavior
- results-link copy behavior
- hash-share restoration

The new scene must fit into the existing result lifecycle rather than introducing a separate fetch path.

## Layout Behavior
### Desktop
- Wider, more theatrical hero spacing.
- Search surface centered and visually prominent.
- Actor spotlight uses a broad horizontal composition with portraits on opposing sides.
- Remaining results sit below in a more restrained grid.

### Tablet
- Hero compresses vertically.
- Search fields remain legible and maintain the two-field model.
- Actor spotlight keeps both actors visible, but the filmstrip and title nodes may tighten or partially stack.

### Mobile
- Layout stays mobile-first.
- Two-input modes stack vertically while remaining clearly separate controls.
- Actor spotlight may collapse into a tighter vertical composition while preserving portrait-title relationship and tap targets.
- Mode switcher stays visible and touch-friendly.

## Styling Strategy
### Tokens
Replace the current bright token set with a cinematic token system in CSS:
- background layers
- glass panel surfaces
- gold text and accent colors
- muted body text
- border and highlight colors
- spotlight and shadow values

### Typography
- use a refined serif for the main brand and major cinematic headings
- pair with a readable body font for controls and supporting copy
- avoid the current multicolor Google-like brand treatment

### Motion
Use restrained motion only:
- soft fade/slide entrance for major panels
- subtle hover polish on cards and controls
- no high-frequency animation or ornamental motion that distracts from reading results

## Accessibility
Required behavior:
- preserve current keyboard access for search fields, clear controls, mode switcher, toggles, and dialogs
- maintain visible focus states against the darker background
- preserve `aria-live` behavior for result updates
- ensure decorative spotlight and filmstrip elements do not interfere with screen-reader understanding
- keep text contrast high enough for headings, body copy, and controls

## Error Handling And Empty States
- Existing readable error messages remain visible in the new theme.
- Empty states should still clearly explain what the user can try next.
- The actor spotlight must not render partial or misleading content when actor results are empty.
- If there are fewer than the desired number of shared titles, the spotlight should gracefully render fewer title nodes rather than fabricate placeholders.

## Testing And Verification
Implementation verification should include:
- `npm run build`
- `npm run lint`

Manual verification should include:
- actor-to-actor search with multiple shared titles
- actor-to-actor search with one or two shared titles
- actor-to-actor search with no matches
- title-to-title search visual regression check
- Bacon path visual regression check
- filter toggle behavior in actor mode and title mode
- share-link generation and restoration
- hash-share restoration for actor, title, and Bacon modes without visual fallback to the legacy shell
- keyboard selection and clearing in search fields
- responsive checks for mobile, tablet, and desktop widths

## Open Implementation Notes
- The current actor result ranking logic already identifies strong shared-title candidates; reuse it before inventing a separate cinematic ranking model.
- The new spotlight should be introduced as an additive component, not by overloading `ResultCard`.
- Keep the initial implementation CSS-driven unless a specific visual need requires extra SVG or lightweight structural markup.
- Unless the user later supplies exact assets, approximate the mockup's texture and typography with CSS effects and available web fonts rather than blocking on a bespoke asset pack.
