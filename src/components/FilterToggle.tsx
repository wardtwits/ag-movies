interface FilterToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export const FilterToggle = ({ checked, onChange }: FilterToggleProps) => {
  return (
    <label className="filter-toggle">
      <span className="filter-toggle-control" aria-hidden="true">
        <span className={`filter-toggle-track${checked ? ' filter-toggle-track-active' : ''}`} />
        <span className={`filter-toggle-thumb${checked ? ' filter-toggle-thumb-active' : ''}`} />
      </span>
      <input
        className="filter-toggle-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="filter-toggle-label">Filter Talk Shows / Cameos</span>
    </label>
  )
}
