import { createPortal } from 'react-dom'
import { useEffect, useId, useRef, useState } from 'react'

interface AppNavProps {
  onAboutOpen: () => void
  onHowItWorksOpen: () => void
}

const MOBILE_QUERY = '(max-width: 47.99rem)'
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getIsMobileViewport = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia(MOBILE_QUERY).matches
}

export const AppNav = ({ onAboutOpen, onHowItWorksOpen }: AppNavProps) => {
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const drawerId = useId()
  const drawerTitleId = useId()

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY)
    const handleChange = () => {
      setIsMobileViewport(mediaQuery.matches)

      if (!mediaQuery.matches) {
        setIsDrawerOpen(false)
      }
    }

    handleChange()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined
    }

    lastFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    const frame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus()
    })

    const focusableElements = (): HTMLElement[] => {
      const drawerElement = drawerRef.current
      if (!drawerElement) {
        return []
      }

      return Array.from(drawerElement.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex !== -1,
      )
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsDrawerOpen(false)
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = focusableElements()
      if (!focusable.length) {
        event.preventDefault()
        return
      }

      const firstFocusable = focusable[0]
      const lastFocusable = focusable[focusable.length - 1]
      const activeElement = document.activeElement

      if (event.shiftKey) {
        if (activeElement === firstFocusable || !drawerRef.current?.contains(activeElement)) {
          event.preventDefault()
          lastFocusable.focus()
        }
        return
      }

      if (activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      } else if (!drawerRef.current?.contains(activeElement)) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      lastFocusedElementRef.current?.focus()
    }
  }, [isDrawerOpen])

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const openDialogAfterClosing = (openDialog: () => void) => {
    setIsDrawerOpen(false)
    window.setTimeout(openDialog, 0)
  }

  const navContent = isMobileViewport ? (
    <>
      <div className="app-nav-brand" aria-hidden="true">
        <span className="brand-wordmark app-nav-brand-wordmark" translate="no">
          Cast<span className="brand-wordmark-link">Link</span>
        </span>
      </div>

      <button
        ref={triggerRef}
        type="button"
        className="app-nav-toggle"
        onClick={() => setIsDrawerOpen((current) => !current)}
        aria-expanded={isDrawerOpen}
        aria-controls={drawerId}
        aria-label={isDrawerOpen ? 'Close site navigation' : 'Open site navigation'}
        aria-haspopup="dialog"
      >
        <span className="app-nav-toggle-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isDrawerOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="app-nav-drawer-backdrop" role="presentation" onClick={closeDrawer}>
              <aside
                ref={drawerRef}
                id={drawerId}
                className="app-nav-drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby={drawerTitleId}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="app-nav-drawer-header">
                  <h2 id={drawerTitleId} className="app-nav-drawer-title">
                    Menu
                  </h2>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="app-nav-drawer-close"
                    onClick={closeDrawer}
                    aria-label="Close navigation menu"
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>

                <nav className="app-nav-drawer-links" aria-label="Site navigation">
                  <button
                    type="button"
                    className="app-nav-drawer-link"
                    onClick={() => openDialogAfterClosing(onAboutOpen)}
                  >
                    About
                  </button>
                  <button
                    type="button"
                    className="app-nav-drawer-link"
                    onClick={() => openDialogAfterClosing(onHowItWorksOpen)}
                  >
                    How it Works
                  </button>
                  <a className="app-nav-drawer-link" href="/privacy.html" onClick={closeDrawer}>
                    Privacy
                  </a>
                </nav>
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  ) : (
    <>
      <button type="button" className="app-nav-link" onClick={onAboutOpen}>
        About
      </button>
      <button type="button" className="app-nav-link" onClick={onHowItWorksOpen}>
        How it Works
      </button>
      <a className="app-nav-link" href="/privacy.html">
        Privacy
      </a>
    </>
  )

  return (
    <nav className="app-nav" aria-label="Site navigation">
      {navContent}
    </nav>
  )
}
