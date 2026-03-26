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
  secondaryActionLabel?: string
  leftAutocomplete: AutocompleteFieldConfig
  rightAutocomplete?: AutocompleteFieldConfig
  onLeftTitleChange: (value: string) => void
  onRightTitleChange?: (value: string) => void
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
  secondaryActionLabel,
  leftAutocomplete,
  rightAutocomplete,
  onLeftTitleChange,
  onRightTitleChange,
  onSecondaryAction,
  showRightInput = true,
}: CommonCastFormProps) => {
  const canUseSecondaryAction = Boolean(onSecondaryAction) && !isLoading

  return (
    <div
      className={`compare-form${showRightInput ? '' : ' compare-form-single'}${secondaryActionLabel && onSecondaryAction ? ' compare-form-with-actions' : ''}`}
    >
      <SearchAutocompleteField
        label={leftLabel}
        value={leftTitle}
        placeholder={leftPlaceholder}
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
          placeholder={rightPlaceholder ?? ''}
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

      {secondaryActionLabel && onSecondaryAction ? (
        <div className="compare-form-actions">
          <button className="secondary-button" type="button" onClick={onSecondaryAction} disabled={!canUseSecondaryAction}>
            {secondaryActionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
