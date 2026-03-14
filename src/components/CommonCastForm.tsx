interface CommonCastFormProps {
  leftTitle: string
  rightTitle: string
  isLoading: boolean
  leftLabel: string
  rightLabel?: string
  leftPlaceholder: string
  rightPlaceholder?: string
  submitLabel: string
  submitLoadingLabel: string
  onLeftTitleChange: (value: string) => void
  onRightTitleChange?: (value: string) => void
  onSubmit: () => void
  showRightInput?: boolean
}

export const CommonCastForm = ({
  leftTitle,
  rightTitle,
  isLoading,
  leftLabel,
  rightLabel,
  leftPlaceholder,
  rightPlaceholder,
  submitLabel,
  submitLoadingLabel,
  onLeftTitleChange,
  onRightTitleChange,
  onSubmit,
  showRightInput = true,
}: CommonCastFormProps) => {
  const canSubmit = leftTitle.trim().length > 0 && (!showRightInput || rightTitle.trim().length > 0) && !isLoading

  return (
    <form
      className={`compare-form${showRightInput ? '' : ' compare-form-single'}`}
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) {
          onSubmit()
        }
      }}
    >
      <label className="input-group">
        <span className="input-label">{leftLabel}</span>
        <input
          value={leftTitle}
          onChange={(event) => onLeftTitleChange(event.target.value)}
          placeholder={leftPlaceholder}
          autoComplete="off"
          required
        />
      </label>

      {showRightInput ? (
        <label className="input-group">
          <span className="input-label">{rightLabel}</span>
          <input
            value={rightTitle}
            onChange={(event) => onRightTitleChange?.(event.target.value)}
            placeholder={rightPlaceholder}
            autoComplete="off"
            required
          />
        </label>
      ) : null}

      <button className="submit-button" type="submit" disabled={!canSubmit}>
        {isLoading ? submitLoadingLabel : submitLabel}
      </button>
    </form>
  )
}
