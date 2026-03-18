interface AppNavProps {
  onAboutOpen: () => void
  onHowItWorksOpen: () => void
}

export const AppNav = ({ onAboutOpen, onHowItWorksOpen }: AppNavProps) => {
  return (
    <nav className="app-nav" aria-label="Site navigation">
      <button type="button" className="app-nav-link" onClick={onAboutOpen}>
        About
      </button>
      <button type="button" className="app-nav-link" onClick={onHowItWorksOpen}>
        How it Works
      </button>
      <a className="app-nav-link" href="/privacy.html">
        Privacy
      </a>
    </nav>
  )
}
