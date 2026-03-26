import { Dialog } from './Dialog'

interface DownloadDialogProps {
  open: boolean
  onClose: () => void
}

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
      <div className="about-dialog-stack" style={{ textAlign: 'center', padding: '1rem 0' }}>
        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem', color: 'var(--text-secondary)' }}>
          Get the CastLink app on your mobile device for the best experience.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
          <a href="https://apps.apple.com/us/app/castlink/id6760738115" target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
            <img src="/images/app-store-badge.svg" alt="Download on the App Store" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </a>
          <a href="#" target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
            <img src="/images/google-play-badge.svg" alt="Get it on Google Play" style={{ height: '48px', width: 'auto', display: 'block' }} />
          </a>
        </div>
      </div>
    </Dialog>
  )
}
