interface LinkIconProps {
  className?: string
}

export const LinkIcon = ({ className }: LinkIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <path
      d="M10.59 13.41a1 1 0 001.41 1.41l4.24-4.24a3 3 0 00-4.24-4.24L9.88 8.46"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.41 10.59A1 1 0 0012 9.17L7.76 13.4A3 3 0 1012 17.66l2.12-2.12"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
