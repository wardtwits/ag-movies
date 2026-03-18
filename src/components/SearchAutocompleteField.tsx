import { type ReactNode, useCallback, useId, useMemo, useRef, useState } from 'react'
import type { MediaTitle, PersonSummary } from '../domain/media'

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92'

export type AutocompleteEntity = MediaTitle | PersonSummary

interface SearchAutocompleteFieldProps {
  label: string
  value: string
  placeholder: string
  inputKind: 'media' | 'person'
  suggestions: AutocompleteEntity[]
  selectedEntity: AutocompleteEntity | null
  isLoading: boolean
  minimumQueryLength: number
  hasSearched: boolean
  trailingAction?: ReactNode
  onChange: (value: string) => void
  onSelect: (entity: AutocompleteEntity) => void
  onClearSelection: () => void
}

const isMediaTitle = (entity: AutocompleteEntity): entity is MediaTitle => 'mediaType' in entity

const getEntityLabel = (entity: AutocompleteEntity): string => (isMediaTitle(entity) ? entity.title : entity.name)

const getEntityMeta = (entity: AutocompleteEntity): string => {
  if (isMediaTitle(entity)) {
    const releaseYear = entity.releaseDate?.slice(0, 4)
    const typeLabel = entity.mediaType === 'movie' ? 'Movie' : 'TV Show'
    return releaseYear ? `${typeLabel} • ${releaseYear}` : typeLabel
  }

  return entity.knownForDepartment?.trim() || 'Acting'
}

const getEntityImagePath = (entity: AutocompleteEntity): string | null | undefined =>
  isMediaTitle(entity) ? entity.posterPath : entity.profilePath

const getImageUrl = (path?: string | null): string | null => (path ? `${TMDB_IMAGE_BASE_URL}${path}` : null)

const getFallbackGlyph = (entity: AutocompleteEntity): string => {
  const label = getEntityLabel(entity)
  return label.charAt(0).toUpperCase() || '?'
}

export const SearchAutocompleteField = ({
  label,
  value,
  placeholder,
  inputKind,
  suggestions,
  selectedEntity,
  isLoading,
  minimumQueryLength,
  hasSearched,
  trailingAction,
  onChange,
  onSelect,
  onClearSelection,
}: SearchAutocompleteFieldProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const trimmedValue = value.trim()
  const isSelected = selectedEntity !== null
  const shouldShowDropdown =
    !isSelected &&
    isFocused &&
    trimmedValue.length >= minimumQueryLength &&
    (isLoading || suggestions.length > 0 || hasSearched)

  const blurActiveInput = useCallback(() => {
    inputRef.current?.blur()

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  const dropdownContent = useMemo(() => {
    if (isLoading) {
      return <div className="search-dropdown-state">Searching TMDB…</div>
    }

    if (!suggestions.length) {
      return <div className="search-dropdown-state">No results found for &quot;{trimmedValue}&quot;</div>
    }

    return (
      <ul className="search-dropdown-list" role="listbox" id={listboxId}>
        {suggestions.map((entity) => {
          const imageUrl = getImageUrl(getEntityImagePath(entity))
          return (
            <li key={`${inputKind}-${entity.id}`}>
              <button
                type="button"
                className="search-dropdown-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  blurActiveInput()
                  onSelect(entity)
                  setIsFocused(false)
                }}
              >
                <span className="search-dropdown-avatar" aria-hidden="true">
                  {imageUrl ? <img src={imageUrl} alt="" /> : <span>{getFallbackGlyph(entity)}</span>}
                </span>
                <span className="search-dropdown-copy">
                  <strong>{getEntityLabel(entity)}</strong>
                  <span>{getEntityMeta(entity)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    )
  }, [blurActiveInput, inputKind, isLoading, listboxId, onSelect, suggestions, trimmedValue])

  const handleClear = () => {
    blurActiveInput()
    onClearSelection()
    window.setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <div className={`search-field${shouldShowDropdown ? ' search-field-open' : ''}`}>
      {selectedEntity ? (
        <div
          className="search-selected-shell"
          tabIndex={0}
          role="group"
          aria-label={`${label}: ${getEntityLabel(selectedEntity)} selected. Press Delete or Backspace to clear.`}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' || event.key === 'Delete') {
              event.preventDefault()
              handleClear()
            }
          }}
        >
          <span className="search-selected-avatar" aria-hidden="true">
            {getImageUrl(getEntityImagePath(selectedEntity)) ? (
              <img src={getImageUrl(getEntityImagePath(selectedEntity)) ?? undefined} alt="" />
            ) : (
              <span>{getFallbackGlyph(selectedEntity)}</span>
            )}
          </span>
          <span className="search-selected-label">{getEntityLabel(selectedEntity)}</span>
          <button
            type="button"
            className="search-selected-clear"
            aria-label={`Clear ${getEntityLabel(selectedEntity)}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleClear}
          >
            ×
          </button>
        </div>
      ) : (
        <div className="search-input-shell">
          <span className="search-input-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M21 21l-4.4-4.4m1.4-5.1a7 7 0 11-14 0 7 7 0 0114 0z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <input
            ref={inputRef}
            name={`${inputKind}-search`}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              window.setTimeout(() => setIsFocused(false), 100)
            }}
            placeholder={placeholder}
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="search"
            enterKeyHint="search"
            data-form-type="other"
            data-1p-ignore="true"
            data-lpignore="true"
            data-gramm="false"
            data-ms-editor="false"
            aria-label={label}
            aria-autocomplete="list"
            aria-expanded={shouldShowDropdown}
            aria-controls={shouldShowDropdown ? listboxId : undefined}
          />
          <span className="search-input-trailing">
            {trailingAction ? <span className="search-input-action-slot">{trailingAction}</span> : null}
            {isLoading ? <span className="search-input-spinner" aria-hidden="true" /> : null}
          </span>
        </div>
      )}

      {shouldShowDropdown ? <div className="search-dropdown">{dropdownContent}</div> : null}
    </div>
  )
}
