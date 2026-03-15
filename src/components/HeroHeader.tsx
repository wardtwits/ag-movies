export type SearchMode = 'actors' | 'titles' | 'bacon'

interface HeroHeaderProps {
  mode: SearchMode
  onModeChange: (mode: SearchMode) => void
}

const MODE_OPTIONS: Array<{ value: SearchMode; label: string }> = [
  { value: 'actors', label: 'Actors' },
  { value: 'titles', label: 'Titles' },
  { value: 'bacon', label: "Bacon's Law" },
]

export const HeroHeader = ({ mode, onModeChange }: HeroHeaderProps) => {
  return (
    <header className="hero-header">
      <h1 className="brand-wordmark" translate="no" aria-label="CastLink">
        <span className="brand-blue">C</span>
        <span className="brand-red">a</span>
        <span className="brand-yellow">s</span>
        <span className="brand-blue">t</span>
        <span className="brand-green">L</span>
        <span className="brand-red">i</span>
        <span className="brand-yellow">n</span>
        <span className="brand-blue">k</span>
      </h1>

      <div className="mode-tabs" role="radiogroup" aria-label="Search mode">
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.value
          return (
            <label key={option.value} className={`mode-tab${isActive ? ' mode-tab-active' : ''}`}>
              <input
                type="radio"
                name="search-mode"
                value={option.value}
                checked={isActive}
                onChange={() => onModeChange(option.value)}
              />
              <span>{option.value === 'bacon' ? '🥓 Bacon\'s Law' : option.label}</span>
            </label>
          )
        })}
      </div>
    </header>
  )
}
