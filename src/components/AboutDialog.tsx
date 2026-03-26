import { Dialog } from './Dialog'

interface AboutDialogProps {
  open: boolean
  onClose: () => void
}

const LINKS = [
  {
    href: 'https://viisi.app',
    title: 'Viisi Words',
    subtitle: 'A Daily Word Game',
    accentClassName: 'about-link-icon-green',
    icon: 'V',
  },
]

export const AboutDialog = ({ open, onClose }: AboutDialogProps) => {
  return (
    <Dialog
      open={open}
      title="About"
      onClose={onClose}
      actions={
        <button type="button" className="dialog-action-primary" onClick={onClose}>
          Close
        </button>
      }
      maxWidth="sm"
    >
      <div className="about-dialog-stack">
        <div className="about-intro">
          <div className="about-avatar" aria-hidden="true">
            C
          </div>
          <p>
            Hi, I&apos;m Chris, the developer for this site. If you enjoy it or have feedback, email{' '}
            <a href="mailto:Chris@Castlink.app">Chris@Castlink.app</a>.
          </p>
        </div>

        <div className="about-links">
          <p className="about-links-label">Please check out my other links:</p>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="about-link-card">
              <span className={`about-link-icon ${link.accentClassName}`} aria-hidden="true">
                {link.icon}
              </span>
              <span className="about-link-copy">
                <strong>{link.title}</strong>
                <span>{link.subtitle}</span>
              </span>
              <span className="about-link-arrow" aria-hidden="true">
                ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
