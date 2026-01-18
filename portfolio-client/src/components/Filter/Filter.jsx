import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import WindowIcon from '@mui/icons-material/Window'
import { Button } from '@mui/material'
import { debounce } from 'lodash'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import SearchIcon from '../../assets/icons/search-line.svg'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import style from './Filter.module.css'
import { FilteredItems } from './FilteredItems'
const Filter = ({ fields, filterState, onFilterChange, onGridViewClick, viewMode = 'grid', onViewModeChange, persistKey = 'filter-state', disableStudentIdSearch = false, showFilteredItems = true, showCardFormatButton = true }) => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	// Load initial state ONCE with validation
	const getInitialState = useCallback(() => {
		try {
			const saved = localStorage.getItem(persistKey)
			if (saved) {
				const parsedState = JSON.parse(saved)
				// Validate saved state against current fields
				const validatedState = { ...filterState }

				// Collect allowed keys: field keys + any matchModeKey defined on fields
				// Always include 'search' as it's a special field not in the fields array
				const allowedKeys = new Set(['search', ...fields.flatMap(f => [f.key, f.matchModeKey].filter(Boolean))])

				Object.keys(parsedState).forEach(key => {
					if (allowedKeys.has(key) && parsedState[key] !== undefined) {
						validatedState[key] = parsedState[key]
					}
				})

				return validatedState
			}
		} catch (error) {
			console.warn('Error loading filter state from localStorage:', error)
			localStorage.removeItem(persistKey) // Clear corrupted data
		}
		return filterState
	}, [persistKey, filterState, fields])

	const [localFilterState, setLocalFilterState] = useState(getInitialState)
	const [inputValue, setInputValue] = useState(() => getInitialState().search || '')
	const [noMatches, setNoMatches] = useState(false)
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

	// Filter modal state
	const [showFilterModal, setShowFilterModal] = useState(false)
	const [tempFilterState, setTempFilterState] = useState(getInitialState)

	// Local search strings for big checkbox lists
	const [checkboxSearchMap, setCheckboxSearchMap] = useState({})

	// Track if this is the initial mount
	const isInitialMount = useRef(true)

	// ✅ CRITICAL FIX: Don't call onFilterChange on mount
	// Parent (Student.jsx) already has correct state from localStorage
	// Filter should only call onFilterChange when user actively changes something
	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false
			// ✅ NO onFilterChange call here! Parent already has correct state
			// This prevents unnecessary state update and duplicate API requests
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []) // Empty deps - runs only once on mount

	// Debounced save to localStorage
	const debouncedSaveToStorage = useMemo(
		() =>
			debounce(state => {
				try {
					// Only save non-empty values
					const stateToSave = Object.entries(state).reduce((acc, [key, value]) => {
						if (value && value !== '' && !(Array.isArray(value) && value.length === 0)) {
							acc[key] = value
						}
						return acc
					}, {})

					if (Object.keys(stateToSave).length > 0) {
						localStorage.setItem(persistKey, JSON.stringify(stateToSave))
					} else {
						localStorage.removeItem(persistKey)
					}
				} catch (error) {
					console.warn('Error saving filter state to localStorage:', error)
				}
			}, 500),
		[persistKey]
	)

	// Save to localStorage when state changes (but not on initial load)
	useEffect(() => {
		if (!isInitialMount.current) {
			debouncedSaveToStorage(localFilterState)
		}

		return () => {
			debouncedSaveToStorage.cancel()
		}
	}, [localFilterState, debouncedSaveToStorage])

	// Handle user-initiated changes (not initial load)
	const userChangedFilter = useRef(false)

	// ✅ CRITICAL FIX: Debounce the onFilterChange call to prevent API spam
	// Reduced debounce time to 300ms for better responsiveness
	const debouncedOnFilterChange = useMemo(
		() =>
			debounce(filterState => {
				onFilterChange(filterState)
				userChangedFilter.current = false // Reset flag after debounce completes
			}, 300),
		[onFilterChange]
	)

	useEffect(() => {
		if (!isInitialMount.current && userChangedFilter.current) {
			// ✅ Use debounced version for search field changes
			// Cancel any pending debounced calls and schedule new one with latest state
			debouncedOnFilterChange.cancel()
			// Create a fresh copy to ensure we're using the latest state
			const currentState = { ...localFilterState }
			debouncedOnFilterChange(currentState)
		}
	}, [localFilterState, debouncedOnFilterChange])

	// Memoize all potential filter options for suggestions
	const allFilterOptions = useMemo(() => {
		if (!fields || fields.length === 0) return []

		const options = []
		fields.forEach(field => {
			if (field.options) {
				field.options.forEach(option => {
					options.push({
						label: option,
						field: field.key,
						type: field.type,
					})
				})
			}
		})
		return options
	}, [fields])

	// Create suggestions based on input
	const [suggestions, setSuggestions] = useState([])

	// Function to fetch student ID suggestions
	const fetchStudentIdSuggestions = useCallback(
		async searchTerm => {
			if (!searchTerm.trim() || disableStudentIdSearch) return []

			try {
				const response = await axios.get(`/api/students/ids?search=${encodeURIComponent(searchTerm)}`)
				const data = response.data
				return data.map(student => ({
					label: student.display,
					field: 'search',
					type: 'student_id',
					value: student.student_id,
				}))
			} catch (error) {
				console.error('Error fetching student ID suggestions:', error)
				return []
			}
		},
		[disableStudentIdSearch]
	)

	useEffect(() => {
		if (!inputValue.trim()) {
			setSuggestions([])
			setShowSuggestions(false)
			return
		}

		const getSuggestions = async () => {
			// Get static filter suggestions
			const staticSuggestions = allFilterOptions.filter(option => option.label.toLowerCase().includes(inputValue.toLowerCase()))

			// Get dynamic student ID suggestions
			const studentIdSuggestions = await fetchStudentIdSuggestions(inputValue)

			// Combine both types of suggestions
			const combinedSuggestions = [...staticSuggestions, ...studentIdSuggestions]

			setSuggestions(combinedSuggestions)
			setNoMatches(inputValue.trim().length > 0 && combinedSuggestions.length === 0)
			setShowSuggestions(true)
		}

		getSuggestions()
	}, [inputValue, allFilterOptions, fetchStudentIdSuggestions])

	// Debounce input changes for performance
	const debouncedSetInputValue = useMemo(() => debounce(value => setInputValue(value), 300), [])

	const handleChange = useCallback((key, value) => {
		if (!isInitialMount.current) {
			userChangedFilter.current = true // Mark as user change
		}
		setLocalFilterState(prevState => ({
			...prevState,
			[key]: value,
		}))
	}, [])

	// Clean up debounce on unmount
	useEffect(() => {
		return () => {
			debouncedSetInputValue.cancel()
			debouncedOnFilterChange.cancel()
		}
	}, [debouncedSetInputValue, debouncedOnFilterChange])

	const handleInputChange = useCallback(
		e => {
			const value = e.target.value
			// Update local state immediately (for visual feedback)
			handleChange('search', value)
			// Update input value for suggestions
			setInputValue(value)
			debouncedSetInputValue(value)
			setSelectedSuggestionIndex(-1)
		},
		[handleChange, debouncedSetInputValue]
	)

	const handleSuggestionClick = useCallback(
		suggestion => {
			if (suggestion.type === 'student_id') {
				// For student ID suggestions, set the search field with the student ID
				handleChange('search', suggestion.value)
				setInputValue(suggestion.value)
			} else if (suggestion.type === 'checkbox') {
				// Toggle selection for checkbox-type suggestions
				const current = Array.isArray(localFilterState[suggestion.field]) ? localFilterState[suggestion.field] : []
				const exists = current.includes(suggestion.label)
				const next = exists ? current.filter(v => v !== suggestion.label) : [...current, suggestion.label]
				handleChange(suggestion.field, next)
				setInputValue('')
			} else {
				// For regular filter suggestions
				handleChange(suggestion.field, suggestion.label)
				setInputValue(suggestion.label)
			}
			setShowSuggestions(false)
		},
		[handleChange, localFilterState]
	)

	const handleInputKeyDown = useCallback(
		e => {
			if (!showSuggestions || suggestions.length === 0) return

			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					setSelectedSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
					break
				case 'ArrowUp':
					e.preventDefault()
					setSelectedSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
					break
				case 'Enter':
					e.preventDefault()
					if (selectedSuggestionIndex >= 0) {
						handleSuggestionClick(suggestions[selectedSuggestionIndex])
					} else {
						// Submit form directly instead of calling handleSubmit
						userChangedFilter.current = true
						onFilterChange(localFilterState)
						setShowSuggestions(false)
					}
					break
				case 'Escape':
					setShowSuggestions(false)
					setSelectedSuggestionIndex(-1)
					break
			}
		},
		[showSuggestions, suggestions, selectedSuggestionIndex, handleSuggestionClick, onFilterChange, localFilterState]
	)

	const handleSubmit = useCallback(
		e => {
			e.preventDefault()
			userChangedFilter.current = true
			onFilterChange(localFilterState)
			setShowSuggestions(false)
		},
		[localFilterState, onFilterChange]
	)

	const handleViewModeToggle = useCallback(() => {
		const newMode = viewMode === 'table' || viewMode === 'list' ? 'grid' : 'table'
		onViewModeChange && onViewModeChange(newMode)
	}, [viewMode, onViewModeChange])

	const handleInputFocus = useCallback(() => {
		if (suggestions.length > 0) {
			setShowSuggestions(true)
		}
	}, [suggestions.length])

	const handleInputBlur = useCallback(() => {
		setTimeout(() => {
			setShowSuggestions(false)
			setSelectedSuggestionIndex(-1)
		}, 150)
	}, [])

	// Filter modal functions
	const handleFilterClick = useCallback(() => {
		setTempFilterState(localFilterState)
		setShowFilterModal(true)
	}, [localFilterState])

	const handleFilterModalClose = useCallback(() => {
		setShowFilterModal(false)
	}, [])

	const handleTempFilterChange = useCallback((key, value) => {
		setTempFilterState(prevState => ({
			...prevState,
			[key]: value,
		}))
	}, [])

	const handleFilterApply = useCallback(() => {
		userChangedFilter.current = true
		setLocalFilterState(tempFilterState)
		setShowFilterModal(false)
	}, [tempFilterState])

	const handleFilterClear = useCallback(() => {
		const clearedState = fields.reduce(
			(acc, field) => {
				if (field.type === 'checkbox') {
					acc[field.key] = []
				} else {
					acc[field.key] = ''
				}
				return acc
			},
			{ search: '' }
		)

		// Reset match mode keys (if any) to 'any'
		fields.forEach(f => {
			if (f.matchModeKey) {
				clearedState[f.matchModeKey] = 'any'
			}
		})

		userChangedFilter.current = true
		setTempFilterState(clearedState)
		setLocalFilterState(clearedState)
		setInputValue('')

		// Clear from localStorage
		try {
			localStorage.removeItem(persistKey)
		} catch (error) {
			console.warn('Error clearing filter state from localStorage:', error)
		}
	}, [fields, persistKey])
	const hasAnyValue = obj => {
		return Object.values(obj).some(value => {
			if (Array.isArray(value)) return value.length > 0
			return value !== '' && value !== null && value !== undefined
		})
	}
	const renderFilterField = useCallback(
		field => {
			const value = tempFilterState[field.key] || (field.type === 'checkbox' ? [] : '')

			switch (field.type) {
				case 'checkbox': {
					const searchTerm = checkboxSearchMap[field.key] || ''
					const optionsArray = Array.isArray(field.options) ? field.options : []
					// Selected-first order, then alpha
					const ordered = [...optionsArray].sort((a, b) => {
						const sa = value.includes(a) ? -1 : 1
						const sb = value.includes(b) ? -1 : 1
						if (sa !== sb) return sa - sb
						return String(a).localeCompare(String(b))
					})
					const filtered = searchTerm ? ordered.filter(o => String(o).toLowerCase().includes(searchTerm.toLowerCase())) : ordered

					const onSearchChange = e =>
						setCheckboxSearchMap(prev => ({
							...prev,
							[field.key]: e.target.value,
						}))

					const selectAllFiltered = () => {
						const merged = Array.from(new Set([...(value || []), ...filtered]))
						handleTempFilterChange(field.key, merged)
					}

					const clearFiltered = () => {
						const remaining = (value || []).filter(v => !filtered.includes(v))
						handleTempFilterChange(field.key, remaining)
					}

					return (
						<div key={field.key} className={style.filterGroup}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>
							{/* Optional match mode toggle for multi-select fields */}
							{field.matchModeKey && (
								<div className={style.radioGroup} style={{ marginBottom: 8 }}>
									<label className={style.radioLabel}>
										<input type='radio' name={`${field.matchModeKey}`} value='any' checked={(tempFilterState[field.matchModeKey] || 'any') === 'any'} onChange={() => handleTempFilterChange(field.matchModeKey, 'any')} className={style.radio} />
										<span>{t('any') || 'Any'}</span>
									</label>
									<label className={style.radioLabel}>
										<input type='radio' name={`${field.matchModeKey}`} value='all' checked={(tempFilterState[field.matchModeKey] || 'any') === 'all'} onChange={() => handleTempFilterChange(field.matchModeKey, 'all')} className={style.radio} />
										<span>{t('all') || 'All'}</span>
									</label>
								</div>
							)}
							{/* Search for long lists */}
							{optionsArray.length > 10 && <input type='text' className={style.checkboxSearch} placeholder={t('search_items') || 'Search...'} value={searchTerm} onChange={onSearchChange} />}
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
							{/* Selected chips */}
							{Array.isArray(value) && value.length > 0 && (
								<div className={style.selectedChipsRow}>
									<span className={style.selectedChipsTitle}>
										{t('selected') || 'Selected'} ({value.length})
									</span>
									<div className={style.selectedChips}>
										{value.map(sel => {
											const displayValue = field.displayFormat ? field.displayFormat(sel) : sel
											return (
												<span
													key={sel}
													className={style.chip}
													onClick={() =>
														handleTempFilterChange(
															field.key,
															value.filter(v => v !== sel)
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
							{/* Virtualized list for very large sets */}
							{filtered.length > 120 ? (
								<div style={{ height: 320 }}>
									<List height={320} itemCount={filtered.length} itemSize={32} width={'100%'}>
										{({ index, style: rowStyle }) => {
											const option = filtered[index]
											const displayValue = field.displayFormat ? field.displayFormat(option) : option
											return (
												<div
													style={{
														...rowStyle,
														display: 'flex',
														alignItems: 'center',
													}}
													key={option}
												>
													<label className={style.checkboxLabel} style={{ width: '100%', margin: 0 }}>
														<input
															type='checkbox'
															checked={value.includes(option)}
															onChange={e => {
																const newValue = e.target.checked ? [...value, option] : value.filter(v => v !== option)
																handleTempFilterChange(field.key, newValue)
															}}
															className={style.checkbox}
														/>
														<span>{displayValue}</span>
													</label>
												</div>
											)
										}}
									</List>
								</div>
							) : (
								<div className={style.checkboxGroupGrid}>
									{filtered.map(option => {
										const displayValue = field.displayFormat ? field.displayFormat(option) : option
										return (
											<label key={option} className={style.checkboxLabel}>
												<input
													type='checkbox'
													checked={value.includes(option)}
													onChange={e => {
														const newValue = e.target.checked ? [...value, option] : value.filter(v => v !== option)
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
						<div key={field.key} className={style.filterGroup}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>
							<div className={style.radioGroup}>
								{field.options.map(option => (
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
						<div key={field.key} className={style.filterGroup}>
							<h4 className={style.filterGroupTitle}>{field.label}</h4>
							<select value={value} onChange={e => handleTempFilterChange(field.key, e.target.value)} className={style.select}>
								<option value=''>{t('all') || '全て'}</option>
								{field.options.map(option => (
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
		[tempFilterState, handleTempFilterChange, t, fields, checkboxSearchMap]
	)

	return (
		<>
			<form onSubmit={handleSubmit} className={style.modernFilterContainer}>
				<div className={style.autocompleteField}>
					<div className={style.inputWrapper}>
						<div className={style.searchInputContainer}>
							<img src={SearchIcon} alt='Search' className={style.inputSearchIcon} />
							<input type='text' value={localFilterState.search || ''} onChange={handleInputChange} onKeyDown={handleInputKeyDown} onFocus={handleInputFocus} onBlur={handleInputBlur} placeholder={t('search_placeholder') || '名前、ID、大学で学生を検索します...'} className={style.modernSearchInput} aria-label={t('search_filters')} autoComplete='off' />
						</div>

						{/* {showSuggestions && (
							<div className={style.suggestionsDropdown}>
								{suggestions.length > 0 ? (
									<ul className={style.suggestionsList}>
										{suggestions.map((suggestion, index) => (
											<li key={`${suggestion.field}-${suggestion.label}`} className={`${style.suggestionItem} ${index === selectedSuggestionIndex ? style.suggestionItemSelected : ''}`} onClick={() => handleSuggestionClick(suggestion)} onMouseEnter={() => setSelectedSuggestionIndex(index)}>
												<span className={style.suggestionLabel}>{suggestion.label}</span>
												<span className={style.suggestionField}>in {suggestion.field}</span>
											</li>
										))}
									</ul>
								) : noMatches ? (
									<div className={style.noOptions}>{t('no_matches_found') || 'No matches found'}</div>
								) : (
									<div className={style.noOptions}>{t('start_typing') || 'Start typing to see suggestions'}</div>
								)}
							</div>
						)} */}
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
					<Button type='button' variant={hasAnyValue(localFilterState) ? 'contained' : 'outlined'} onClick={handleFilterClick} sx={{ minWidth: '45px', padding: '8px', height: '43px' }}>
						<FilterAltOutlinedIcon />
					</Button>
				</div>
			</form>

			{/* filtered Items Display */}
			{showFilteredItems && (
				<FilteredItems
					tempFilterState={localFilterState}
					setTempFilterState={setLocalFilterState}
					onFilterChange={newState => {
						userChangedFilter.current = true
						onFilterChange(newState)
					}}
				/>
			)}

			{/* Filter Modal */}
			{showFilterModal && (
				<div className={style.filterModalOverlay} onClick={handleFilterModalClose}>
					<div className={style.filterModal} onClick={e => e.stopPropagation()}>
						<div className={style.filterModalHeader}>
							<h3 className={style.filterModalTitle}>{t('filter')}</h3>
							<button onClick={handleFilterModalClose} className={style.filterModalCloseButton}>
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

Filter.propTypes = {
	fields: PropTypes.array.isRequired,
	filterState: PropTypes.object.isRequired,
	onFilterChange: PropTypes.func.isRequired,
	onGridViewClick: PropTypes.func,
	viewMode: PropTypes.string,
	onViewModeChange: PropTypes.func,
	persistKey: PropTypes.string,
	disableStudentIdSearch: PropTypes.bool,
}

export default Filter
