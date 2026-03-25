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
      <div className="hero-copy">
        <p className="hero-eyebrow">Cinematic Connections</p>
        <h1 className="brand-wordmark" translate="no" aria-label="CastLink">
          Cast<span className="brand-wordmark-link">Link</span>
        </h1>
      </div>

      <div className="mode-tabs" role="tablist" aria-label="Search mode">
        {MODE_OPTIONS.map((option) => {
          const isActive = mode === option.value
          return (
            <button
              key={option.value}
              id={`tab-${option.value}`}
              role="tab"
              className={`mode-tab${isActive ? ' mode-tab-active' : ''}`}
              aria-selected={isActive}
              onClick={() => onModeChange(option.value)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
