import { useId, useMemo, useRef, useState } from 'react'
import type { MediaTitle, PersonSummary } from '../domain/media'

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92'

export type AutocompleteEntity = MediaTitle | PersonSummary

interface SearchAutocompleteFieldProps {
  label: string
  value: string
  placeholder?: string
  required?: boolean
  inputKind: 'media' | 'person'
  suggestions: AutocompleteEntity[]
  selectedEntity: AutocompleteEntity | null
  isLoading: boolean
  minimumQueryLength: number
  hasSearched: boolean
  onChange: (value: string) => void
  onSelect: (entity: AutocompleteEntity) => void
  onClearSelection: () => void
}

const isMediaTitle = (entity: AutocompleteEntity): entity is MediaTitle => 'mediaType' in entity

const getEntityLabel = (entity: AutocompleteEntity): string => (isMediaTitle(entity) ? entity.title : entity.name)

const getEntityImagePath = (entity: AutocompleteEntity): string | null | undefined =>
  isMediaTitle(entity) ? entity.posterPath : entity.profilePath

const getEntityMeta = (entity: AutocompleteEntity): string => {
  if (isMediaTitle(entity)) {
    const year = entity.releaseDate?.slice(0, 4)
    const mediaLabel = entity.mediaType === 'movie' ? 'Movie' : 'TV'
    return year ? `${mediaLabel} • ${year}` : mediaLabel
  }

  return entity.knownForDepartment?.trim() || 'Person'
}

const getImageUrl = (path?: string | null): string | null => (path ? `${TMDB_IMAGE_BASE_URL}${path}` : null)

const getFallbackMonogram = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const SearchAutocompleteField = ({
  label,
  value,
  placeholder,
  required = false,
  inputKind,
  suggestions,
  selectedEntity,
  isLoading,
  minimumQueryLength,
  hasSearched,
  onChange,
  onSelect,
  onClearSelection,
}: SearchAutocompleteFieldProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const trimmedValue = value.trim()
  const selectedLabel = selectedEntity ? getEntityLabel(selectedEntity) : null
  const isLockedSelection = Boolean(selectedEntity && selectedLabel === value)
  const shouldShowDropdown =
    !isLockedSelection &&
    isFocused &&
    trimmedValue.length >= minimumQueryLength &&
    (isLoading || suggestions.length > 0 || hasSearched)

  const dropdownContent = useMemo(() => {
    if (isLoading) {
      return <div className="autocomplete-state">Searching TMDB...</div>
    }

    if (!suggestions.length) {
      return <div className="autocomplete-state">No matches found.</div>
    }

    return (
      <ul className="autocomplete-list" role="listbox" id={listboxId}>
        {suggestions.map((entity) => {
          const itemLabel = getEntityLabel(entity)
          const imageUrl = getImageUrl(getEntityImagePath(entity))
          return (
            <li key={`${inputKind}-${entity.id}`} className="autocomplete-list-item">
              <button
                type="button"
                className="autocomplete-option"
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  onSelect(entity)
                  setIsFocused(false)
                }}
              >
                {imageUrl ? (
                  <img className="autocomplete-thumb" src={imageUrl} alt="" />
                ) : (
                  <span className="autocomplete-thumb autocomplete-thumb-fallback" aria-hidden="true">
                    {getFallbackMonogram(itemLabel)}
                  </span>
                )}
                <span className="autocomplete-copy">
                  <strong>{itemLabel}</strong>
                  <span>{getEntityMeta(entity)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }, [inputKind, isLoading, listboxId, onSelect, suggestions])

  const selectedImageUrl = selectedEntity ? getImageUrl(getEntityImagePath(selectedEntity)) : null
  const selectedMeta = selectedEntity ? getEntityMeta(selectedEntity) : null

  return (
    <label className="input-group">
      <span className="input-label">{label}</span>
      <div className="autocomplete-shell">
        <div className="autocomplete-input-shell">
          <input
            ref={inputRef}
            className={isLockedSelection ? 'autocomplete-input-locked' : undefined}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={shouldShowDropdown}
            aria-controls={shouldShowDropdown ? listboxId : undefined}
            aria-readonly={isLockedSelection}
            readOnly={isLockedSelection}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 100)
            }}
            onKeyDown={(event) => {
              if (isLockedSelection && (event.key === 'Backspace' || event.key === 'Delete')) {
                event.preventDefault()
                onClearSelection()
              }
            }}
            required={required}
          />

          {isLockedSelection && selectedEntity ? (
            <div className="autocomplete-selected-card" aria-hidden="true">
              {selectedImageUrl ? (
                <img className="autocomplete-selected-thumb" src={selectedImageUrl} alt="" />
              ) : (
                <span className="autocomplete-selected-thumb autocomplete-thumb-fallback">
                  {getFallbackMonogram(getEntityLabel(selectedEntity))}
                </span>
              )}
              <span className="autocomplete-selected-copy">
                <strong>{getEntityLabel(selectedEntity)}</strong>
                <span>{selectedMeta}</span>
              </span>
            </div>
          ) : null}

          {isLockedSelection ? (
            <button
              type="button"
              className="autocomplete-clear"
              aria-label={`Clear ${label}`}
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => {
                onClearSelection()
                inputRef.current?.focus()
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          ) : null}
        </div>

        {shouldShowDropdown ? <div className="autocomplete-dropdown">{dropdownContent}</div> : null}
      </div>
    </label>
  )
}
