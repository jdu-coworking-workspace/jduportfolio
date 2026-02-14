import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import WindowIcon from '@mui/icons-material/Window'
import { Button } from '@mui/material'
import { debounce } from 'lodash'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import SearchIcon from '../../assets/icons/search-line.svg'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import style from './Filter.module.css'
import { FilteredItems } from './FilteredItems'

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {'checkbox' | 'radio' | 'select' | 'text'} FieldType
 */

/**
 * @typedef {Object} FilterField
 * @property {string} key - Unique identifier for the field
 * @property {string} label - Display label for the field
 * @property {FieldType} type - Type of filter input
 * @property {string[]} [options] - Available options for checkbox/radio/select
 * @property {string} [matchModeKey] - Key for match mode (any/all) storage
 * @property {(value: string) => string} [displayFormat] - Custom display formatter
 */

/**
 * @typedef {Object} FilterStateValue
 * @property {string | string[]} value - The filter value
 */

/**
 * @typedef {Record<string, string | string[]>} FilterState
 */

/**
 * @typedef {Object} Suggestion
 * @property {string} label - Display label
 * @property {string} field - Associated field key
 * @property {string} type - Suggestion type
 * @property {string} [value] - Optional value override
 */

/**
 * @typedef {'grid' | 'table' | 'list'} ViewMode
 */

/**
 * @typedef {Object} FilterProps
 * @property {FilterField[]} fields - Filter field configurations
 * @property {FilterState} filterState - Initial filter state
 * @property {(state: FilterState) => void} onFilterChange - Callback when filters change
 * @property {() => void} [onGridViewClick] - Legacy grid view callback
 * @property {ViewMode} [viewMode] - Current view mode
 * @property {(mode: ViewMode) => void} [onViewModeChange] - View mode change callback
 * @property {string} [persistKey] - LocalStorage key for persistence
 * @property {boolean} [disableStudentIdSearch] - Disable student ID API search
 * @property {boolean} [showFilteredItems] - Show filtered items display
 * @property {boolean} [showCardFormatButton] - Show view mode toggle button
 */

// ============================================================================
// ACTION TYPES
// ============================================================================

/** @enum {string} */
const ActionType = Object.freeze({
	SET_FILTER_VALUE: 'SET_FILTER_VALUE',
	SET_FILTER_STATE: 'SET_FILTER_STATE',
	SET_INPUT_VALUE: 'SET_INPUT_VALUE',
	SET_SUGGESTIONS: 'SET_SUGGESTIONS',
	SET_SHOW_SUGGESTIONS: 'SET_SHOW_SUGGESTIONS',
	SET_SELECTED_SUGGESTION_INDEX: 'SET_SELECTED_SUGGESTION_INDEX',
	SET_SHOW_FILTER_MODAL: 'SET_SHOW_FILTER_MODAL',
	SET_TEMP_FILTER_STATE: 'SET_TEMP_FILTER_STATE',
	SET_TEMP_FILTER_VALUE: 'SET_TEMP_FILTER_VALUE',
	SET_CHECKBOX_SEARCH: 'SET_CHECKBOX_SEARCH',
	CLEAR_ALL_FILTERS: 'CLEAR_ALL_FILTERS',
	APPLY_TEMP_FILTERS: 'APPLY_TEMP_FILTERS',
	OPEN_FILTER_MODAL: 'OPEN_FILTER_MODAL',
	CLOSE_FILTER_MODAL: 'CLOSE_FILTER_MODAL',
})

// ============================================================================
// ACTION CREATORS
// ============================================================================

/**
 * @typedef {Object} SetFilterValueAction
 * @property {typeof ActionType.SET_FILTER_VALUE} type
 * @property {{ key: string, value: string | string[] }} payload
 */

/**
 * @typedef {Object} SetFilterStateAction
 * @property {typeof ActionType.SET_FILTER_STATE} type
 * @property {FilterState} payload
 */

/**
 * @typedef {Object} SetInputValueAction
 * @property {typeof ActionType.SET_INPUT_VALUE} type
 * @property {string} payload
 */

/**
 * @typedef {Object} SetSuggestionsAction
 * @property {typeof ActionType.SET_SUGGESTIONS} type
 * @property {Suggestion[]} payload
 */

/**
 * @typedef {Object} SetShowSuggestionsAction
 * @property {typeof ActionType.SET_SHOW_SUGGESTIONS} type
 * @property {boolean} payload
 */

/**
 * @typedef {Object} SetSelectedSuggestionIndexAction
 * @property {typeof ActionType.SET_SELECTED_SUGGESTION_INDEX} type
 * @property {number} payload
 */

/**
 * @typedef {Object} SetShowFilterModalAction
 * @property {typeof ActionType.SET_SHOW_FILTER_MODAL} type
 * @property {boolean} payload
 */

/**
 * @typedef {Object} SetTempFilterStateAction
 * @property {typeof ActionType.SET_TEMP_FILTER_STATE} type
 * @property {FilterState} payload
 */

/**
 * @typedef {Object} SetTempFilterValueAction
 * @property {typeof ActionType.SET_TEMP_FILTER_VALUE} type
 * @property {{ key: string, value: string | string[] }} payload
 */

/**
 * @typedef {Object} SetCheckboxSearchAction
 * @property {typeof ActionType.SET_CHECKBOX_SEARCH} type
 * @property {{ key: string, value: string }} payload
 */

/**
 * @typedef {Object} ClearAllFiltersAction
 * @property {typeof ActionType.CLEAR_ALL_FILTERS} type
 * @property {{ clearedState: FilterState }} payload
 */

/**
 * @typedef {Object} ApplyTempFiltersAction
 * @property {typeof ActionType.APPLY_TEMP_FILTERS} type
 */

/**
 * @typedef {Object} OpenFilterModalAction
 * @property {typeof ActionType.OPEN_FILTER_MODAL} type
 */

/**
 * @typedef {Object} CloseFilterModalAction
 * @property {typeof ActionType.CLOSE_FILTER_MODAL} type
 */

/**
 * @typedef {SetFilterValueAction | SetFilterStateAction | SetInputValueAction | SetSuggestionsAction | SetShowSuggestionsAction | SetSelectedSuggestionIndexAction | SetShowFilterModalAction | SetTempFilterStateAction | SetTempFilterValueAction | SetCheckboxSearchAction | ClearAllFiltersAction | ApplyTempFiltersAction | OpenFilterModalAction | CloseFilterModalAction} FilterAction
 */

// ============================================================================
// STATE INTERFACE
// ============================================================================

/**
 * @typedef {Object} FilterReducerState
 * @property {FilterState} filterState - Current active filter state
 * @property {string} inputValue - Search input value
 * @property {Suggestion[]} suggestions - Current suggestions list
 * @property {boolean} showSuggestions - Whether to show suggestions dropdown
 * @property {number} selectedSuggestionIndex - Currently selected suggestion index
 * @property {boolean} showFilterModal - Whether filter modal is open
 * @property {FilterState} tempFilterState - Temporary filter state for modal
 * @property {Map<string, string>} checkboxSearchMap - Search terms for checkbox lists
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Creates a Set from an array for O(1) lookups
 * @template T
 * @param {T[]} arr - Array to convert
 * @returns {Set<T>} Set of values
 */
const createLookupSet = arr => new Set(arr)

/**
 * Checks if a value is empty (null, undefined, empty string, or empty array)
 * @param {unknown} value - Value to check
 * @returns {boolean} True if value is empty
 */
const isEmpty = value => {
	if (value === null || value === undefined || value === '') return true
	if (Array.isArray(value)) return value.length === 0
	return false
}

/**
 * Checks if filter state has any non-empty values
 * @param {FilterState} state - Filter state to check
 * @returns {boolean} True if state has any values
 */
const hasAnyFilterValue = state => {
	return Object.values(state).some(value => !isEmpty(value))
}

/**
 * Filters and validates saved state against current fields
 * @param {FilterState} savedState - State from localStorage
 * @param {FilterState} defaultState - Default filter state
 * @param {Set<string>} allowedKeys - Set of valid keys
 * @returns {FilterState} Validated filter state
 */
const validateSavedState = (savedState, defaultState, allowedKeys) => {
	/** @type {FilterState} */
	const validatedState = { ...defaultState }

	for (const key of Object.keys(savedState)) {
		if (allowedKeys.has(key) && savedState[key] !== undefined) {
			validatedState[key] = savedState[key]
		}
	}

	return validatedState
}

/**
 * Loads and validates filter state from localStorage
 * @param {string} persistKey - Storage key
 * @param {FilterState} defaultState - Default filter state
 * @param {FilterField[]} fields - Field configurations
 * @returns {FilterState} Loaded or default state
 */
const loadPersistedState = (persistKey, defaultState, fields) => {
	try {
		const saved = localStorage.getItem(persistKey)
		if (!saved) {
			return defaultState
		}

		const parsedState = JSON.parse(saved)

		const allowedKeys = createLookupSet(['search', ...fields.flatMap(f => [f.key, f.matchModeKey].filter(Boolean))])

		const validatedState = validateSavedState(parsedState, defaultState, allowedKeys)
		return validatedState
	} catch (error) {
		console.warn('[Filter] ❌ Error loading filter state from localStorage:', error)
		localStorage.removeItem(persistKey)
		return defaultState
	}
}

/**
 * Saves filter state to localStorage (only non-empty values)
 * @param {string} persistKey - Storage key
 * @param {FilterState} state - State to save
 * @returns {void}
 */
const saveToStorage = (persistKey, state) => {
	try {
		/** @type {FilterState} */
		const stateToSave = {}

		for (const [key, value] of Object.entries(state)) {
			if (!isEmpty(value)) {
				stateToSave[key] = value
			}
		}

		if (Object.keys(stateToSave).length > 0) {
			localStorage.setItem(persistKey, JSON.stringify(stateToSave))
		} else {
			localStorage.removeItem(persistKey)
		}
	} catch (error) {
		console.warn('[Filter] ❌ Error saving filter state to localStorage:', error)
	}
}

/**
 * Creates cleared filter state based on field configurations
 * @param {FilterField[]} fields - Field configurations
 * @returns {FilterState} Cleared state
 */
const createClearedState = fields => {
	/** @type {FilterState} */
	const clearedState = { search: '' }

	for (const field of fields) {
		clearedState[field.key] = field.type === 'checkbox' ? [] : ''
		if (field.matchModeKey) {
			clearedState[field.matchModeKey] = null
		}
	}

	return clearedState
}

/**
 * Filters and sorts checkbox options with selected-first ordering
 * @param {string[]} options - All options
 * @param {Set<string>} selectedSet - Set of selected values
 * @param {string} searchTerm - Search filter term
 * @returns {string[]} Filtered and sorted options
 */
const filterAndSortCheckboxOptions = (options, selectedSet, searchTerm) => {
	const normalizedSearch = searchTerm.toLowerCase()

	// Filter first if search term exists
	const filtered = searchTerm ? options.filter(o => String(o).toLowerCase().includes(normalizedSearch)) : options

	// Sort: selected first, then alphabetically
	return [...filtered].sort((a, b) => {
		const aSelected = selectedSet.has(a)
		const bSelected = selectedSet.has(b)

		if (aSelected !== bSelected) {
			return aSelected ? -1 : 1
		}
		return String(a).localeCompare(String(b))
	})
}

// ============================================================================
// REDUCER
// ============================================================================

/**
 * Filter component reducer
 * @param {FilterReducerState} state - Current state
 * @param {FilterAction} action - Action to process
 * @returns {FilterReducerState} New state
 */
const filterReducer = (state, action) => {
	switch (action.type) {
		case ActionType.SET_FILTER_VALUE: {
			const nextState = {
				...state,
				filterState: {
					...state.filterState,
					[action.payload.key]: action.payload.value,
				},
			}

			return nextState
		}

		case ActionType.SET_FILTER_STATE:
			return {
				...state,
				filterState: action.payload,
			}

		case ActionType.SET_INPUT_VALUE:
			return {
				...state,
				inputValue: action.payload,
			}

		case ActionType.SET_SUGGESTIONS:
			return {
				...state,
				suggestions: action.payload,
			}

		case ActionType.SET_SHOW_SUGGESTIONS:
			return {
				...state,
				showSuggestions: action.payload,
			}

		case ActionType.SET_SELECTED_SUGGESTION_INDEX:
			return {
				...state,
				selectedSuggestionIndex: action.payload,
			}

		case ActionType.SET_SHOW_FILTER_MODAL:
			return {
				...state,
				showFilterModal: action.payload,
			}

		case ActionType.SET_TEMP_FILTER_STATE:
			return {
				...state,
				tempFilterState: action.payload,
			}

		case ActionType.SET_TEMP_FILTER_VALUE: {
			const nextState = {
				...state,
				tempFilterState: {
					...state.tempFilterState,
					[action.payload.key]: action.payload.value,
				},
			}

			return nextState
		}

		case ActionType.SET_CHECKBOX_SEARCH: {
			const newMap = new Map(state.checkboxSearchMap)
			newMap.set(action.payload.key, action.payload.value)

			return {
				...state,
				checkboxSearchMap: newMap,
			}
		}

		case ActionType.CLEAR_ALL_FILTERS:
			return {
				...state,
				filterState: action.payload.clearedState,
				tempFilterState: action.payload.clearedState,
				inputValue: '',
				checkboxSearchMap: new Map(),
			}

		case ActionType.APPLY_TEMP_FILTERS:
			return {
				...state,
				filterState: state.tempFilterState,
				showFilterModal: false,
			}

		case ActionType.OPEN_FILTER_MODAL:
			return {
				...state,
				showFilterModal: true,
				tempFilterState: state.filterState,
			}

		case ActionType.CLOSE_FILTER_MODAL:
			return {
				...state,
				showFilterModal: false,
			}

		default:
			console.warn('[Filter] ⚠️ Unknown action type:', action.type)
			return state
	}
}

/**
 * Creates initial reducer state
 * @param {Object} params - Initialization parameters
 * @param {FilterState} params.filterState - Initial filter state
 * @param {string} params.persistKey - Storage key
 * @param {FilterField[]} params.fields - Field configurations
 * @returns {FilterReducerState} Initial state
 */
const createInitialState = ({ filterState, persistKey, fields }) => {
	const loadedState = loadPersistedState(persistKey, filterState, fields)

	const initialState = {
		filterState: loadedState,
		inputValue: loadedState.search || '',
		suggestions: [],
		showSuggestions: false,
		selectedSuggestionIndex: -1,
		showFilterModal: false,
		tempFilterState: loadedState,
		checkboxSearchMap: new Map(),
	}

	return initialState
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

/**
 * Hook for debounced storage persistence
 * @param {FilterState} filterState - State to persist
 * @param {string} persistKey - Storage key
 * @param {React.MutableRefObject<boolean>} isInitialMount - Initial mount ref
 * @returns {void}
 */
const useStoragePersistence = (filterState, persistKey, isInitialMount) => {
	const debouncedSave = useMemo(() => debounce(state => saveToStorage(persistKey, state), 500), [persistKey])

	useEffect(() => {
		if (!isInitialMount.current) {
			debouncedSave(filterState)
		}
		return () => debouncedSave.cancel()
	}, [filterState, debouncedSave, isInitialMount])
}

/**
 * Hook for debounced filter change callback
 * @param {(state: FilterState) => void} onFilterChange - Change callback
 * @param {FilterState} filterState - Current filter state
 * @param {React.MutableRefObject<boolean>} isInitialMount - Initial mount ref
 * @param {React.MutableRefObject<boolean>} userChangedFilter - User change flag
 * @returns {{ triggerChange: () => void, cancelPending: () => void }}
 */
const useDebouncedFilterChange = (onFilterChange, filterState, isInitialMount, userChangedFilter) => {
	const debouncedChange = useMemo(
		() =>
			debounce(state => {
				onFilterChange(state)
				userChangedFilter.current = false
			}, 300),
		[onFilterChange, userChangedFilter]
	)

	useEffect(() => {
		if (!isInitialMount.current && userChangedFilter.current) {
			debouncedChange.cancel()
			debouncedChange({ ...filterState })
		}
	}, [filterState, debouncedChange, isInitialMount, userChangedFilter])

	useEffect(() => {
		return () => debouncedChange.cancel()
	}, [debouncedChange])

	return {
		triggerChange: () => debouncedChange({ ...filterState }),
		cancelPending: () => debouncedChange.cancel(),
	}
}

/**
 * Hook for building filter options lookup
 * @param {FilterField[]} fields - Field configurations
 * @returns {{ optionsMap: Map<string, Set<string>>, allOptions: Suggestion[] }}
 */
const useFilterOptionsLookup = fields => {
	return useMemo(() => {
		/** @type {Map<string, Set<string>>} */
		const optionsMap = new Map()
		/** @type {Suggestion[]} */
		const allOptions = []

		for (const field of fields) {
			if (field.options && Array.isArray(field.options)) {
				const optionSet = createLookupSet(field.options)
				optionsMap.set(field.key, optionSet)

				for (const option of field.options) {
					allOptions.push({
						label: option,
						field: field.key,
						type: field.type,
					})
				}
			}
		}

		return { optionsMap, allOptions }
	}, [fields])
}

/**
 * Hook for suggestion fetching and filtering
 * @param {string} inputValue - Current input value
 * @param {Suggestion[]} allOptions - All static options
 * @param {boolean} disableStudentIdSearch - Disable API search
 * @param {(action: FilterAction) => void} dispatch - Dispatch function
 * @returns {void}
 */
const useSuggestionFetching = (inputValue, allOptions, disableStudentIdSearch, dispatch) => {
	const abortControllerRef = useRef(/** @type {AbortController | null} */ (null))

	const fetchStudentIdSuggestions = useCallback(
		async (/** @type {string} */ searchTerm) => {
			if (!searchTerm.trim() || disableStudentIdSearch) return []

			// Cancel previous request
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
			abortControllerRef.current = new AbortController()

			try {
				const response = await axios.get(`/api/students/ids?search=${encodeURIComponent(searchTerm)}`, { signal: abortControllerRef.current.signal })

				return response.data.map((/** @type {{ display: string, student_id: string }} */ student) => ({
					label: student.display,
					field: 'search',
					type: 'student_id',
					value: student.student_id,
				}))
			} catch (error) {
				if (error.name !== 'CanceledError') {
					console.error('Error fetching student ID suggestions:', error)
				}
				return []
			}
		},
		[disableStudentIdSearch]
	)

	useEffect(() => {
		if (!inputValue.trim()) {
			dispatch({ type: ActionType.SET_SUGGESTIONS, payload: [] })
			dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
			return
		}

		const normalizedInput = inputValue.toLowerCase()

		const getSuggestions = async () => {
			// Filter static suggestions using optimized string matching
			const staticSuggestions = allOptions.filter(option => option.label.toLowerCase().includes(normalizedInput))

			// Fetch dynamic student ID suggestions
			const studentIdSuggestions = await fetchStudentIdSuggestions(inputValue)

			// Combine and dispatch
			const combinedSuggestions = [...staticSuggestions, ...studentIdSuggestions]
			dispatch({ type: ActionType.SET_SUGGESTIONS, payload: combinedSuggestions })
			dispatch({
				type: ActionType.SET_SHOW_SUGGESTIONS,
				payload: combinedSuggestions.length > 0,
			})
		}

		getSuggestions()

		// Cleanup
		return () => {
			if (abortControllerRef.current) {
				abortControllerRef.current.abort()
			}
		}
	}, [inputValue, allOptions, fetchStudentIdSuggestions, dispatch])
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Virtualized checkbox list row renderer
 * @param {Object} props - Row props
 * @param {number} props.index - Row index
 * @param {React.CSSProperties} props.style - Row style
 * @param {Object} props.data - Row data
 * @param {string[]} props.data.options - Options list
 * @param {Set<string>} props.data.selectedSet - Selected values set
 * @param {FilterField} props.data.field - Field configuration
 * @param {(key: string, value: string[]) => void} props.data.onToggle - Toggle callback
 * @returns {JSX.Element}
 */
const VirtualizedCheckboxRow = ({ index, style: rowStyle, data }) => {
	const { options, selectedSet, field, onToggle } = data
	const option = options[index]
	const isSelected = selectedSet.has(option)
	const displayValue = field.displayFormat ? field.displayFormat(option) : option

	const handleChange = useCallback(
		(/** @type {React.ChangeEvent<HTMLInputElement>} */ e) => {
			const newValue = e.target.checked ? [...selectedSet, option] : [...selectedSet].filter(v => v !== option)
			onToggle(field.key, newValue)
		},
		[selectedSet, option, field.key, onToggle]
	)

	return (
		<div style={{ ...rowStyle, display: 'flex', alignItems: 'center' }}>
			<label className={style.checkboxLabel} style={{ width: '100%', margin: 0 }}>
				<input type='checkbox' checked={isSelected} onChange={handleChange} className={style.checkbox} />
				<span>{displayValue}</span>
			</label>
		</div>
	)
}

VirtualizedCheckboxRow.propTypes = {
	index: PropTypes.number.isRequired,
	style: PropTypes.object.isRequired,
	data: PropTypes.shape({
		options: PropTypes.array.isRequired,
		selectedSet: PropTypes.instanceOf(Set).isRequired,
		field: PropTypes.object.isRequired,
		onToggle: PropTypes.func.isRequired,
	}).isRequired,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Advanced filter component with search, suggestions, and modal filtering
 * @param {FilterProps} props - Component props
 * @returns {JSX.Element}
 */
const Filter = ({ fields, filterState: initialFilterState, onFilterChange, onGridViewClick, viewMode = 'grid', onViewModeChange, persistKey = 'filter-state', disableStudentIdSearch = false, showFilteredItems = true, showCardFormatButton = true }) => {
	const { language } = useLanguage()

	/**
	 * Translation helper with fallback
	 * @param {string} key - Translation key
	 * @returns {string} Translated string
	 */
	const t = useCallback((/** @type {string} */ key) => translations[language]?.[key] ?? key, [language])

	// ========================================================================
	// STATE MANAGEMENT
	// ========================================================================

	const [state, dispatch] = useReducer(filterReducer, { filterState: initialFilterState, persistKey, fields }, createInitialState)

	const { filterState, inputValue, suggestions, showSuggestions, selectedSuggestionIndex, showFilterModal, tempFilterState, checkboxSearchMap } = state

	// ========================================================================
	// REFS
	// ========================================================================

	/** @type {React.MutableRefObject<boolean>} */
	const isInitialMount = useRef(true)
	/** @type {React.MutableRefObject<boolean>} */
	const userChangedFilter = useRef(false)
	/** @type {React.MutableRefObject<Map<string, HTMLDivElement | null>>} */
	const filterGroupRefs = useRef(new Map())

	// ========================================================================
	// CUSTOM HOOKS
	// ========================================================================

	const { allOptions } = useFilterOptionsLookup(fields)

	useStoragePersistence(filterState, persistKey, isInitialMount)

	useDebouncedFilterChange(onFilterChange, filterState, isInitialMount, userChangedFilter)

	useSuggestionFetching(inputValue, allOptions, disableStudentIdSearch, dispatch)

	// ========================================================================
	// EFFECTS
	// ========================================================================

	useEffect(() => {
		if (persistKey) {
			const saved = localStorage.getItem(persistKey)
			if (saved) {
				try {
					const parsedState = JSON.parse(saved)
					if (Object.keys(parsedState).length > 0) {
						onFilterChange(parsedState)
					}
				} catch (e) {
					console.error('Error parsing persisted state', e)
				}
			}
		}
	}, [])
	// Mark initial mount as complete
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false
		}
	}, [])

	// Scroll to first active filter when modal opens
	useEffect(() => {
		if (showFilterModal) {
			// Find first active filter field
			const activeField = fields.find(field => {
				if (field.key === 'search') return false
				const value = tempFilterState[field.key]
				if (Array.isArray(value)) return value.length > 0
				return value && value !== ''
			})

			if (activeField) {
				// Use requestAnimationFrame to scroll immediately after DOM paint
				requestAnimationFrame(() => {
					const element = filterGroupRefs.current.get(activeField.key)
					if (element) {
						element.scrollIntoView({ behavior: 'instant', block: 'start' })
					}
				})
			}
		}
	}, [showFilterModal, tempFilterState, fields])

	// ========================================================================
	// MEMOIZED VALUES
	// ========================================================================

	/**
	 * Set of allowed field keys for validation
	 */
	const allowedFieldKeys = useMemo(() => createLookupSet(['search', ...fields.flatMap(f => [f.key, f.matchModeKey].filter(Boolean))]), [fields])

	/**
	 * Whether current filter state has any values
	 */
	const hasActiveFilters = useMemo(() => hasAnyFilterValue(filterState), [filterState])

	// ========================================================================
	// EVENT HANDLERS
	// ========================================================================

	/**
	 * Handles filter value changes
	 */
	const handleFilterChange = useCallback((/** @type {string} */ key, /** @type {string | string[]} */ value) => {
		if (!isInitialMount.current) {
			userChangedFilter.current = true
		}
		dispatch({ type: ActionType.SET_FILTER_VALUE, payload: { key, value } })
	}, [])

	/**
	 * Handles search input changes
	 */
	const handleInputChange = useCallback(
		(/** @type {React.ChangeEvent<HTMLInputElement>} */ e) => {
			const value = e.target.value
			handleFilterChange('search', value)
			dispatch({ type: ActionType.SET_INPUT_VALUE, payload: value })
			dispatch({ type: ActionType.SET_SELECTED_SUGGESTION_INDEX, payload: -1 })
		},
		[handleFilterChange]
	)

	/**
	 * Handles suggestion selection
	 */
	const handleSuggestionClick = useCallback(
		(/** @type {Suggestion} */ suggestion) => {
			if (suggestion.type === 'student_id') {
				const value = suggestion.value ?? suggestion.label
				handleFilterChange('search', value)
				dispatch({ type: ActionType.SET_INPUT_VALUE, payload: value })
			} else if (suggestion.type === 'checkbox') {
				const current = Array.isArray(filterState[suggestion.field]) ? /** @type {string[]} */ (filterState[suggestion.field]) : []
				const currentSet = createLookupSet(current)
				const exists = currentSet.has(suggestion.label)
				const next = exists ? current.filter(v => v !== suggestion.label) : [...current, suggestion.label]
				handleFilterChange(suggestion.field, next)
				dispatch({ type: ActionType.SET_INPUT_VALUE, payload: '' })
			} else {
				handleFilterChange(suggestion.field, suggestion.label)
				dispatch({ type: ActionType.SET_INPUT_VALUE, payload: suggestion.label })
			}
			dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
		},
		[filterState, handleFilterChange]
	)

	/**
	 * Handles keyboard navigation in suggestions
	 */
	const handleInputKeyDown = useCallback(
		(/** @type {React.KeyboardEvent<HTMLInputElement>} */ e) => {
			if (!showSuggestions || suggestions.length === 0) return

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					dispatch({
						type: ActionType.SET_SELECTED_SUGGESTION_INDEX,
						payload: selectedSuggestionIndex < suggestions.length - 1 ? selectedSuggestionIndex + 1 : 0,
					})
					break

				case 'ArrowUp':
					e.preventDefault()
					dispatch({
						type: ActionType.SET_SELECTED_SUGGESTION_INDEX,
						payload: selectedSuggestionIndex > 0 ? selectedSuggestionIndex - 1 : suggestions.length - 1,
					})
					break

				case 'Enter':
					e.preventDefault()
					if (selectedSuggestionIndex >= 0) {
						handleSuggestionClick(suggestions[selectedSuggestionIndex])
					} else {
						userChangedFilter.current = true
						onFilterChange(filterState)
						dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
					}
					break

				case 'Escape':
					dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
					dispatch({ type: ActionType.SET_SELECTED_SUGGESTION_INDEX, payload: -1 })
					break
			}
		},
		[showSuggestions, suggestions, selectedSuggestionIndex, handleSuggestionClick, onFilterChange, filterState]
	)

	/**
	 * Handles form submission
	 */
	const handleSubmit = useCallback(
		(/** @type {React.FormEvent<HTMLFormElement>} */ e) => {
			e.preventDefault()
			userChangedFilter.current = true
			onFilterChange(filterState)
			dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
		},
		[filterState, onFilterChange]
	)

	/**
	 * Toggles view mode between grid and table
	 */
	const handleViewModeToggle = useCallback(() => {
		/** @type {ViewMode} */
		const newMode = viewMode === 'table' || viewMode === 'list' ? 'grid' : 'table'
		onViewModeChange?.(newMode)
	}, [viewMode, onViewModeChange])

	/**
	 * Handles input focus
	 */
	const handleInputFocus = useCallback(() => {
		if (suggestions.length > 0) {
			dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: true })
		}
	}, [suggestions.length])

	/**
	 * Handles input blur with delay for click handling
	 */
	const handleInputBlur = useCallback(() => {
		setTimeout(() => {
			dispatch({ type: ActionType.SET_SHOW_SUGGESTIONS, payload: false })
			dispatch({ type: ActionType.SET_SELECTED_SUGGESTION_INDEX, payload: -1 })
		}, 150)
	}, [])

	// ========================================================================
	// MODAL HANDLERS
	// ========================================================================

	/**
	 * Opens filter modal
	 */
	const handleFilterClick = useCallback(() => {
		dispatch({ type: ActionType.OPEN_FILTER_MODAL })
	}, [])

	/**
	 * Closes filter modal
	 */
	const handleFilterModalClose = useCallback(() => {
		dispatch({ type: ActionType.CLOSE_FILTER_MODAL })
	}, [])

	/**
	 * Handles temporary filter value changes in modal
	 */
	const handleTempFilterChange = useCallback((/** @type {string} */ key, /** @type {string | string[]} */ value) => {
		dispatch({ type: ActionType.SET_TEMP_FILTER_VALUE, payload: { key, value } })
	}, [])

	/**
	 * Applies temporary filters from modal
	 */
	const handleFilterApply = useCallback(() => {
		userChangedFilter.current = true
		dispatch({ type: ActionType.APPLY_TEMP_FILTERS })
	}, [])

	/**
	 * Clears all filters
	 */
	const handleFilterClear = useCallback(() => {
		const clearedState = createClearedState(fields)
		userChangedFilter.current = true
		dispatch({ type: ActionType.CLEAR_ALL_FILTERS, payload: { clearedState } })

		try {
			localStorage.removeItem(persistKey)
		} catch (error) {
			console.warn('Error clearing filter state from localStorage:', error)
		}
	}, [fields, persistKey])

	// ========================================================================
	// FILTER FIELD RENDERER
	// ========================================================================

	/**
	 * Renders a filter field based on its type
	 * @param {FilterField} field - Field configuration
	 * @returns {JSX.Element | null}
	 */
	const renderFilterField = useCallback(
		(/** @type {FilterField} */ field) => {
			const value = tempFilterState[field.key] ?? (field.type === 'checkbox' ? [] : '')

			switch (field.type) {
				case 'checkbox': {
					const searchTerm = checkboxSearchMap.get(field.key) ?? ''
					const optionsArray = Array.isArray(field.options) ? field.options : []
					const selectedArray = Array.isArray(value) ? value : []
					const selectedSet = createLookupSet(selectedArray)

					// Optimized filtering and sorting
					const filteredOptions = filterAndSortCheckboxOptions(optionsArray, selectedSet, searchTerm)

					/**
					 * Handles checkbox search input
					 */
					const onSearchChange = (/** @type {React.ChangeEvent<HTMLInputElement>} */ e) => {
						dispatch({
							type: ActionType.SET_CHECKBOX_SEARCH,
							payload: { key: field.key, value: e.target.value },
						})
					}

					/**
					 * Selects all filtered options
					 */
					const selectAllFiltered = () => {
						const merged = Array.from(new Set([...selectedArray, ...filteredOptions]))
						handleTempFilterChange(field.key, merged)
					}

					/**
					 * Clears all filtered options
					 */
					const clearFiltered = () => {
						const filteredSet = createLookupSet(filteredOptions)
						const remaining = selectedArray.filter(v => !filteredSet.has(v))
						handleTempFilterChange(field.key, remaining)
					}

					/**
					 * Handles individual checkbox toggle
					 */
					const handleCheckboxToggle = (/** @type {string} */ key, /** @type {string[]} */ newValue) => {
						handleTempFilterChange(key, newValue)
					}

					// Virtualization data for large lists
					const itemData = {
						options: filteredOptions,
						selectedSet,
						field,
						onToggle: handleCheckboxToggle,
					}

					return (
						<div key={field.key} className={style.filterGroup} ref={el => filterGroupRefs.current.set(field.key, el)}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>

							{/* Match mode toggle for multi-select */}
							{field.matchModeKey && (
								<div className={style.radioGroup} style={{ marginBottom: 8 }}>
									<label className={style.radioLabel}>
										<input type='radio' name={field.matchModeKey} value='any' checked={tempFilterState[field.matchModeKey] === 'any'} onChange={() => handleTempFilterChange(field.matchModeKey, 'any')} className={style.radio} />
										<span>{t('any')}</span>
									</label>
									<label className={style.radioLabel}>
										<input type='radio' name={field.matchModeKey} value='all' checked={tempFilterState[field.matchModeKey] === 'all'} onChange={() => handleTempFilterChange(field.matchModeKey, 'all')} className={style.radio} />
										<span>{t('all')}</span>
									</label>
								</div>
							)}

							{/* Search for large option lists */}
							{optionsArray.length > 10 && <input type='text' className={style.checkboxSearch} placeholder={t('search_items') || 'Search...'} value={searchTerm} onChange={onSearchChange} />}

							{/* Bulk actions for large lists */}
							{optionsArray.length > 10 && (
								<div className={style.checkboxActions}>
									<button type='button' onClick={selectAllFiltered}>
										{t('select_all_filtered') || 'Select All (filtered)'}
									</button>
									<button type='button' onClick={clearFiltered}>
										{t('clear_filtered') || 'Clear (filtered)'}
									</button>
								</div>
							)}

							{/* Selected items chips */}
							{selectedArray.length > 0 && (
								<div className={style.selectedChipsRow}>
									<span className={style.selectedChipsTitle}>
										{t('selected') || 'Selected'} ({selectedArray.length})
									</span>
									<div className={style.selectedChips}>
										{selectedArray.map(sel => {
											const displayValue = field.displayFormat ? field.displayFormat(sel) : sel
											return (
												<span
													key={sel}
													className={style.chip}
													onClick={() =>
														handleTempFilterChange(
															field.key,
															selectedArray.filter(v => v !== sel)
														)
													}
													title={displayValue}
												>
													{displayValue}
													<span className={style.chipClose}>×</span>
												</span>
											)
										})}
									</div>
								</div>
							)}

							{/* Virtualized list for very large option sets */}
							{filteredOptions.length > 120 ? (
								<div style={{ height: 320 }}>
									<List height={320} itemCount={filteredOptions.length} itemSize={32} width='100%' itemData={itemData}>
										{VirtualizedCheckboxRow}
									</List>
								</div>
							) : (
								<div className={style.checkboxGroupGrid}>
									{filteredOptions.map(option => {
										const displayValue = field.displayFormat ? field.displayFormat(option) : option
										const isSelected = selectedSet.has(option)

										return (
											<label key={option} className={style.checkboxLabel}>
												<input
													type='checkbox'
													checked={isSelected}
													onChange={e => {
														const newValue = e.target.checked ? [...selectedArray, option] : selectedArray.filter(v => v !== option)
														handleTempFilterChange(field.key, newValue)
													}}
													className={style.checkbox}
												/>
												<span>{displayValue}</span>
											</label>
										)
									})}
								</div>
							)}
						</div>
					)
				}

				case 'radio':
					return (
						<div key={field.key} className={style.filterGroup} ref={el => filterGroupRefs.current.set(field.key, el)}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>
							<div className={style.radioGroup}>
								{field.options?.map(option => (
									<label key={option} className={style.radioLabel}>
										<input type='radio' name={field.key} value={option} checked={value === option} onChange={e => handleTempFilterChange(field.key, e.target.value)} className={style.radio} />
										<span>{option}</span>
									</label>
								))}
							</div>
						</div>
					)

				case 'select':
					return (
						<div key={field.key} className={style.filterGroup} ref={el => filterGroupRefs.current.set(field.key, el)}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>
							<select value={typeof value === 'string' ? value : ''} onChange={e => handleTempFilterChange(field.key, e.target.value)} className={style.select}>
								<option value=''>{t('all') || '全て'}</option>
								{field.options?.map(option => (
									<option key={option} value={option}>
										{option}
									</option>
								))}
							</select>
						</div>
					)

				default:
					return null
			}
		},
		[tempFilterState, handleTempFilterChange, t, checkboxSearchMap]
	)

	// ========================================================================
	// RENDER
	// ========================================================================

	return (
		<>
			<form onSubmit={handleSubmit} className={style.modernFilterContainer}>
				<div className={style.autocompleteField}>
					<div className={style.inputWrapper}>
						<div className={style.searchInputContainer}>
							<img src={SearchIcon} alt='Search' className={style.inputSearchIcon} />
							<input type='text' value={filterState.search || ''} onChange={handleInputChange} onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder={t('search_placeholder') || '名前、ID、大学で学生を検索します...'} className={style.modernSearchInput} aria-label={t('search_filters')} autoComplete='off' />
						</div>
					</div>
				</div>

				<button type='submit' className={style.modernSearchButton}>
					{t('search')}
				</button>

				<div className={style.iconButtonsGroup}>
					{showCardFormatButton && (
						<Button type='button' onClick={handleViewModeToggle} variant={viewMode === 'grid' ? 'outlined' : 'contained'} aria-label={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'} sx={{ minWidth: '45px', padding: '8px', height: '43px' }}>
							{viewMode === 'grid' ? <FormatListBulletedIcon /> : <WindowIcon />}
						</Button>
					)}
					<Button type='button' variant={hasActiveFilters ? 'contained' : 'outlined'} onClick={handleFilterClick} sx={{ minWidth: '45px', padding: '8px', height: '43px' }}>
						<FilterAltOutlinedIcon />
					</Button>
				</div>
			</form>

			{/* Filtered Items Display */}
			{showFilteredItems && (
				<FilteredItems
					tempFilterState={filterState}
					setTempFilterState={newState => {
						userChangedFilter.current = true
						dispatch({ type: ActionType.SET_FILTER_STATE, payload: newState })
					}}
					onFilterChange={newState => {
						userChangedFilter.current = true
						onFilterChange(newState)
					}}
				/>
			)}

			{/* Filter Modal */}
			{showFilterModal && (
				<div className={style.filterModalOverlay} onMouseDown={handleFilterModalClose}>
					<div className={style.filterModal} onMouseDown={e => e.stopPropagation()} role='dialog' aria-modal='true' aria-labelledby='filter-modal-title'>
						<div className={style.filterModalHeader}>
							<h3 id='filter-modal-title' className={style.filterModalTitle}>
								{t('filter')}
							</h3>
							<button onClick={handleFilterModalClose} className={style.filterModalCloseButton} aria-label='Close filter modal'>
								×
							</button>
						</div>

						<div className={style.filterModalContent}>{fields.filter(field => field.key !== 'search').map(renderFilterField)}</div>

						<div className={style.filterModalFooter}>
							<button onClick={handleFilterClear} className={style.filterClearButton}>
								{t('clear')}
							</button>
							<button onClick={handleFilterApply} className={style.filterApplyButton}>
								{t('apply')}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	)
}

// ============================================================================
// PROP TYPES
// ============================================================================

Filter.propTypes = {
	fields: PropTypes.arrayOf(
		PropTypes.shape({
			key: PropTypes.string.isRequired,
			label: PropTypes.string.isRequired,
			type: PropTypes.oneOf(['checkbox', 'radio', 'select', 'text']).isRequired,
			options: PropTypes.arrayOf(PropTypes.string),
			matchModeKey: PropTypes.string,
			displayFormat: PropTypes.func,
		})
	).isRequired,
	filterState: PropTypes.object.isRequired,
	onFilterChange: PropTypes.func.isRequired,
	onGridViewClick: PropTypes.func,
	viewMode: PropTypes.oneOf(['grid', 'table', 'list']),
	onViewModeChange: PropTypes.func,
	persistKey: PropTypes.string,
	disableStudentIdSearch: PropTypes.bool,
	showFilteredItems: PropTypes.bool,
	showCardFormatButton: PropTypes.bool,
}

export default Filter
