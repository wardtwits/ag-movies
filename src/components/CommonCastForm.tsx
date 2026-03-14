import { SearchAutocompleteField, type AutocompleteEntity } from './SearchAutocompleteField'

interface AutocompleteFieldConfig {
  suggestions: AutocompleteEntity[]
  selectedEntity: AutocompleteEntity | null
  isLoading: boolean
  minimumQueryLength: number
  hasSearched: boolean
  inputKind: 'media' | 'person'
  onSelect: (entity: AutocompleteEntity) => void
  onClearSelection: () => void
}

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
  secondaryActionLabel?: string
  leftAutocomplete: AutocompleteFieldConfig
  rightAutocomplete?: AutocompleteFieldConfig
  onLeftTitleChange: (value: string) => void
  onRightTitleChange?: (value: string) => void
  onSubmit: () => void
  onSecondaryAction?: () => void
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
  secondaryActionLabel,
  leftAutocomplete,
  rightAutocomplete,
  onLeftTitleChange,
  onRightTitleChange,
  onSubmit,
  onSecondaryAction,
  showRightInput = true,
}: CommonCastFormProps) => {
  const canSubmit = leftTitle.trim().length > 0 && (!showRightInput || rightTitle.trim().length > 0) && !isLoading
  const canUseSecondaryAction = Boolean(onSecondaryAction) && !isLoading

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
      <SearchAutocompleteField
        label={leftLabel}
        value={leftTitle}
        placeholder={leftPlaceholder}
        required
        inputKind={leftAutocomplete.inputKind}
        suggestions={leftAutocomplete.suggestions}
        selectedEntity={leftAutocomplete.selectedEntity}
        isLoading={leftAutocomplete.isLoading}
        minimumQueryLength={leftAutocomplete.minimumQueryLength}
        hasSearched={leftAutocomplete.hasSearched}
        onChange={onLeftTitleChange}
        onSelect={leftAutocomplete.onSelect}
        onClearSelection={leftAutocomplete.onClearSelection}
      />

      {showRightInput ? <div className="compare-form-divider" aria-hidden="true" /> : null}

      {showRightInput ? (
        <SearchAutocompleteField
          label={rightLabel ?? ''}
          value={rightTitle}
          placeholder={rightPlaceholder}
          required
          inputKind={rightAutocomplete?.inputKind ?? leftAutocomplete.inputKind}
          suggestions={rightAutocomplete?.suggestions ?? []}
          selectedEntity={rightAutocomplete?.selectedEntity ?? null}
          isLoading={rightAutocomplete?.isLoading ?? false}
          minimumQueryLength={rightAutocomplete?.minimumQueryLength ?? leftAutocomplete.minimumQueryLength}
          hasSearched={rightAutocomplete?.hasSearched ?? false}
          onChange={(value) => onRightTitleChange?.(value)}
          onSelect={(entity) => rightAutocomplete?.onSelect(entity)}
          onClearSelection={() => rightAutocomplete?.onClearSelection()}
        />
      ) : null}

      <div className="compare-form-actions">
        {secondaryActionLabel && onSecondaryAction ? (
          <button
            className="secondary-button"
            type="button"
            onClick={onSecondaryAction}
            disabled={!canUseSecondaryAction}
          >
            {secondaryActionLabel}
          </button>
        ) : null}
        <button className="submit-button" type="submit" disabled={!canSubmit}>
          {isLoading ? submitLoadingLabel : submitLabel}
        </button>
      </div>
    </form>
  )
}
