interface CommonCastFormProps {
  leftTitle: string
  rightTitle: string
  isLoading: boolean
  onLeftTitleChange: (value: string) => void
  onRightTitleChange: (value: string) => void
  onSubmit: () => void
}

export const CommonCastForm = ({
  leftTitle,
  rightTitle,
  isLoading,
  onLeftTitleChange,
  onRightTitleChange,
  onSubmit,
}: CommonCastFormProps) => {
  const canSubmit = leftTitle.trim().length > 0 && rightTitle.trim().length > 0 && !isLoading

  return (
    <form
      className="compare-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) {
          onSubmit()
        }
      }}
    >
      <label className="input-group">
        <span className="input-label">Movie / TV title 1</span>
        <input
          value={leftTitle}
          onChange={(event) => onLeftTitleChange(event.target.value)}
          placeholder="Example: The Matrix"
          autoComplete="off"
          required
        />
      </label>

      <label className="input-group">
        <span className="input-label">Movie / TV title 2</span>
        <input
          value={rightTitle}
          onChange={(event) => onRightTitleChange(event.target.value)}
          placeholder="Example: John Wick"
          autoComplete="off"
          required
        />
      </label>

      <button className="submit-button" type="submit" disabled={!canSubmit}>
        {isLoading ? 'Matching Cast...' : 'Build Common-Cast Graph'}
      </button>
    </form>
  )
}
