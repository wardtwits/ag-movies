import { Dialog } from './Dialog'

interface HowItWorksDialogProps {
  open: boolean
  onClose: () => void
}

const SECTIONS = [
  {
    title: 'Compare Actors',
    description:
      'Enter two actors to see the movies and TV shows they have appeared in together. Use it when you remember faces but not the title they share.',
    resultLabel: 'Returns: shared titles.',
    accentClassName: 'how-it-works-icon-blue',
    icon: '👥',
  },
  {
    title: 'Compare Titles',
    description:
      'Enter two movies or TV shows to find the cast members who appear in both. This is the fastest way to spot crossover actors between franchises or sitcom universes.',
    resultLabel: 'Returns: shared cast members.',
    accentClassName: 'how-it-works-icon-yellow',
    icon: '🎬',
  },
  {
    title: "Bacon's Law",
    description:
      'Search an actor and CastLink calculates the shortest path back to Kevin Bacon using their shared credits. The result shows both the degree count and the exact actor-title chain.',
    resultLabel: 'Returns: degree and connection path.',
    accentClassName: 'how-it-works-icon-red',
    icon: '🥓',
  },
]

export const HowItWorksDialog = ({ open, onClose }: HowItWorksDialogProps) => {
  return (
    <Dialog
      open={open}
      title="How it Works"
      onClose={onClose}
      actions={
        <button type="button" className="dialog-action-primary" onClick={onClose}>
          Got it
        </button>
      }
      maxWidth="lg"
    >
      <div className="how-it-works-list">
        {SECTIONS.map((section) => (
          <section key={section.title} className="how-it-works-section">
            <div className={`how-it-works-icon ${section.accentClassName}`} aria-hidden="true">
              {section.icon}
            </div>
            <div className="how-it-works-copy">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
              <strong>{section.resultLabel}</strong>
            </div>
          </section>
        ))}
      </div>
    </Dialog>
  )
}
