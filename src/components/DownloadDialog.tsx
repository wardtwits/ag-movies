import { Dialog } from './Dialog'

interface DownloadDialogProps {
  open: boolean
  onClose: () => void
}

const LINKS = [
  {
    href: '#',
    title: 'Apple App Store',
    subtitle: 'Download for iOS',
    accentClassName: 'about-link-icon-green',
    icon: '',
  },
  {
    href: '#',
    title: 'Google Play',
    subtitle: 'Download for Android',
    accentClassName: 'about-link-icon-green',
    icon: '▶',
  },
]

export const DownloadDialog = ({ open, onClose }: DownloadDialogProps) => {
  return (
    <Dialog
      open={open}
      title="Download CastLink"
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
          <p>
            Get the CastLink app on your mobile device for the best experience.
          </p>
        </div>

        <div className="about-links">
          {LINKS.map((link) => (
            <a key={link.title} href={link.href} target="_blank" rel="noopener noreferrer" className="about-link-card">
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
