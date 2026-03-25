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
  scrollToTopOnFocus?: boolean
  onChange: (value: string) => void
  onSelect: (entity: AutocompleteEntity) => void
  onClearSelection: () => void
}

const MOBILE_INPUT_SCROLL_QUERY = '(max-width: 47.99rem)'

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
  scrollToTopOnFocus = false,
  onChange,
  onSelect,
  onClearSelection,
}: SearchAutocompleteFieldProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const liveRegionId = useId()
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

  const scrollFieldToTop = useCallback((inputElement: HTMLInputElement) => {
    if (!scrollToTopOnFocus || typeof window === 'undefined') {
      return
    }

    const isMobileViewport = window.matchMedia(MOBILE_INPUT_SCROLL_QUERY).matches
    const isNativeApp = document.documentElement.classList.contains('native-app')

    if (!isMobileViewport && !isNativeApp) {
      return
    }

    window.setTimeout(() => {
      const fieldElement = inputElement.closest('.search-field')

      if (!(fieldElement instanceof HTMLElement)) {
        return
      }

      const top = Math.max(window.scrollY + fieldElement.getBoundingClientRect().top - 12, 0)
      window.scrollTo({ top, behavior: 'smooth' })
    }, 260)
  }, [scrollToTopOnFocus])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!shouldShowDropdown) {
        return
      }

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setActiveOptionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setActiveOptionIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        }
        case 'Enter': {
          event.preventDefault()
          if (activeOptionIndex >= 0 && activeOptionIndex < suggestions.length) {
            blurActiveInput()
            onSelect(suggestions[activeOptionIndex])
            setIsFocused(false)
            setActiveOptionIndex(-1)
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          setIsFocused(false)
          setActiveOptionIndex(-1)
          break
        }
        default:
          break
      }
    },
    [shouldShowDropdown, suggestions, activeOptionIndex, blurActiveInput, onSelect],
  )

  const handleInputBlur = useCallback(() => {
    window.setTimeout(() => {
      setIsFocused(false)
      setActiveOptionIndex(-1)
    }, 100)
  }, [])

  const dropdownContent = useMemo(() => {
    if (isLoading) {
      return <div className="search-dropdown-state" role="status" aria-live="polite">Searching TMDB…</div>
    }

    if (!suggestions.length) {
      return (
        <div className="search-dropdown-state" role="status" aria-live="polite">
          No results found for &quot;{trimmedValue}&quot;
        </div>
      )
    }

    return (
      <ul className="search-dropdown-list" role="listbox" id={listboxId}>
        {suggestions.map((entity, index) => {
          const imageUrl = getImageUrl(getEntityImagePath(entity))
          const isActive = index === activeOptionIndex
          return (
            <li key={`${inputKind}-${entity.id}`} role="option" aria-selected={isActive}>
              <button
                type="button"
                 aria-label="Select Dropdown"
                className={`search-dropdown-option${isActive ? ' active' : ''}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveOptionIndex(index)}
                onClick={() => {
                  blurActiveInput()
                  onSelect(entity)
                  setIsFocused(false)
                  setActiveOptionIndex(-1)
                }}
              >
                <span className="search-dropdown-avatar" aria-hidden="true" tabIndex={-1}>
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
  }, [blurActiveInput, inputKind, isLoading, listboxId, onSelect, suggestions, trimmedValue, activeOptionIndex])

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
          <span className="search-selected-avatar" aria-hidden="true" tabIndex={-1}>
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
            <svg viewBox="0 0 24 24" fill="none" tabIndex={-1}>
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
            onFocus={(event) => {
              setIsFocused(true)
              setActiveOptionIndex(-1)
              scrollFieldToTop(event.currentTarget)
            }}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
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
            aria-controls={shouldShowDropdown ? listboxId : undefined}
            aria-activedescendant={
              shouldShowDropdown && activeOptionIndex >= 0
                ? `${inputKind}-${suggestions[activeOptionIndex].id}`
                : undefined
            }
          />
          <span className="search-input-trailing">
            {trailingAction ? <span className="search-input-action-slot">{trailingAction}</span> : null}
            {isLoading ? <span className="search-input-spinner" aria-hidden="true" /> : null}
          </span>
          <span id={liveRegionId} role="status" aria-live="polite" className="sr-only">
            {isLoading && shouldShowDropdown ? 'Searching for results' : null}
            {!isLoading && suggestions.length > 0 && shouldShowDropdown
              ? `${suggestions.length} result${suggestions.length === 1 ? '' : 's'} available`
              : null}
            {!isLoading && suggestions.length === 0 && hasSearched && shouldShowDropdown
              ? 'No results found'
              : null}
          </span>
        </div>
      )}

      {shouldShowDropdown ? <div className="search-dropdown">{dropdownContent}</div> : null}
    </div>
  )
}
