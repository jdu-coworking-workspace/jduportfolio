import React, { useEffect, useState, useContext, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import axios from '../../../utils/axiosUtils'
import { useAlert } from '../../../contexts/AlertContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { useAtom } from 'jotai'
import { editModeAtom, saveStatusAtom, editDataAtom } from '../../../atoms/profileEditAtoms'
import { Box, Typography, Chip, Avatar, Grid, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert, LinearProgress, Switch, Tabs, Tab } from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import RestoreIcon from '@mui/icons-material/Restore'
// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination } from 'swiper/modules'
// Swiper CSS
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
// Icon imports from assets folder
import BusinessIcon from '../../../assets/icons/buildingLine.svg'
import WorkIcon from '../../../assets/icons/briefcase-3-line.svg'
import PersonIcon from '../../../assets/icons/group-line.svg'
import InfoIcon from '../../../assets/icons/file-text-line.svg'
import EditIcon from '../../../assets/icons/edit.svg'
import CheckboxBlankIcon from '../../../assets/icons/checkbox-blank.svg'
import CheckboxBlankIcon2 from '../../../assets/icons/checkbox-blank2.svg'
import DeleteIcon from '../../../assets/icons/delete-bin-3-line.svg'

import styles from './CompanyProfile.module.css'
import translations from '../../../locales/translations'
import { UserContext } from '../../../contexts/UserContext'
import RecruiterFiles from '../../../components/RecruiterFiles'

// Helper functions moved outside component
const safeArrayRender = array => {
	if (!Array.isArray(array)) return []
	return array
}

const safeStringValue = value => {
	if (value === null || value === undefined) return ''
	if (typeof value === 'object') return ''
	return String(value)
}

const safeParse = data => {
	if (!data) return []
	if (Array.isArray(data)) return data
	if (typeof data === 'string') {
		// Try JSON parse first
		try {
			const parsed = JSON.parse(data)
			return Array.isArray(parsed) ? parsed : []
		} catch {
			// If JSON parse fails, split by newlines or commas (preserve user formatting as lines)
			return String(data)
				.replace(/\r/g, '')
				.split(/[\n,]+/)
				.map(item => item.trim())
				.filter(item => item)
		}
	}
	return []
}

// Determine if a value has meaningful content for view mode
const hasContent = value => {
	if (value === null || value === undefined) return false
	if (typeof value === 'string') return value.trim().length > 0
	if (Array.isArray(value)) return value.length > 0
	if (typeof value === 'object') return Object.keys(value).length > 0
	if (typeof value === 'number' || typeof value === 'boolean') return true
	return !!value
}

// Helper function to extract YouTube video ID from URL
const extractYouTubeId = url => {
	if (!url) return null
	try {
		const u = new URL(url)
		// Standard watch URL
		const v = u.searchParams.get('v')
		if (v) return v
		// Short links youtu.be/<id>
		if (u.hostname.includes('youtu.be')) {
			return u.pathname.split('/').filter(Boolean)[0] || null
		}
		// Embed URL
		if (u.pathname.startsWith('/embed/')) {
			return u.pathname.split('/')[2] || null
		}
		// Shorts URL
		if (u.pathname.startsWith('/shorts/')) {
			return u.pathname.split('/')[2] || u.pathname.split('/')[1] || null
		}
		// Live URL (sometimes /live/<id>)
		if (u.pathname.startsWith('/live/')) {
			return u.pathname.split('/')[2] || null
		}
	} catch {
		// Fallback to regex if URL constructor fails
		const regexPatterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/, /youtube\.com\/watch\?.*v=([^&\n?#]+)/, /youtube\.com\/shorts\/([^&\n?#/]+)/, /youtube\.com\/live\/([^&\n?#/]+)/]
		for (const pattern of regexPatterns) {
			const match = String(url).match(pattern)
			if (match) return match[1]
		}
	}
	return null
}

// Lightweight thumbnail component with graceful fallbacks
const ThumbImage = ({ videoId, alt = 'Video thumbnail' }) => {
	const [idx, setIdx] = useState(0)
	const candidates = [`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`, `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, `https://i.ytimg.com/vi/${videoId}/0.jpg`, `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`]
	const src = candidates[Math.min(idx, candidates.length - 1)]
	return <img src={src} alt={alt} className={styles.thumbImg} loading='lazy' onError={() => setIdx(i => (i < candidates.length - 1 ? i + 1 : i))} />
}

// Box style component for regular content
const ContentBox = ({ children }) => <Box className={styles.contentBox}>{children}</Box>

ContentBox.propTypes = {
	children: PropTypes.node.isRequired,
}

// Box style component for header without padding
const HeaderContentBox = ({ children }) => <Box className={styles.headerContentBox}>{children}</Box>

HeaderContentBox.propTypes = {
	children: PropTypes.node.isRequired,
}

// MOVED OUTSIDE: Custom text field component with focus handling
const CustomTextField = React.memo(({ value = '', onChange, multiline = false, placeholder = '', minRows = 1, fieldKey = '', onFocus = null, onBlur = null, inputRef = null, maxLength }) => {
	const handleChange = useCallback(
		e => {
			if (onChange) {
				onChange(e)
			}
		},
		[onChange]
	)

	const handleFocus = useCallback(
		e => {
			if (onFocus) {
				onFocus(e)
			}
		},
		[onFocus]
	)

	const handleBlur = useCallback(
		e => {
			if (onBlur) {
				onBlur(e)
			}
		},
		[onBlur]
	)

	// Live limit indicators
	const currentLength = String(value || '').length
	const isNearLimit = maxLength && currentLength >= Math.floor(maxLength * 0.9)
	const isOverLimit = maxLength && currentLength > maxLength

	return (
		<TextField
			ref={inputRef}
			fullWidth
			variant='outlined'
			size='small'
			value={safeStringValue(value)}
			onChange={handleChange}
			onFocus={handleFocus}
			onBlur={handleBlur}
			multiline={multiline}
			minRows={multiline ? minRows : 1}
			placeholder={placeholder}
			className={styles.customTextField}
			error={isOverLimit}
			sx={{
				'& .MuiOutlinedInput-root': {
					position: 'relative',
					zIndex: 1000,
					'& fieldset': {
						borderColor: isOverLimit ? '#f44336' : isNearLimit ? '#ff9800' : undefined,
					},
					'&:hover fieldset': {
						borderColor: isOverLimit ? '#f44336' : isNearLimit ? '#ff9800' : undefined,
					},
					'&.Mui-focused fieldset': {
						borderColor: isOverLimit ? '#f44336' : isNearLimit ? '#ff9800' : undefined,
					},
				},
				'& .MuiInputBase-input': {
					zIndex: 1000,
				},
			}}
			autoComplete='off'
			spellCheck='false'
			inputProps={maxLength ? { maxLength } : undefined}
		/>
	)
})

CustomTextField.displayName = 'CustomTextField'

CustomTextField.propTypes = {
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	onChange: PropTypes.func.isRequired,
	multiline: PropTypes.bool,
	placeholder: PropTypes.string,
	minRows: PropTypes.number,
	fieldKey: PropTypes.string,
	onFocus: PropTypes.func,
	onBlur: PropTypes.func,
	inputRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
}

// Display text component
const DisplayText = ({ children }) => (
	<Box className={styles.displayText}>
		<Typography variant='body1' className={styles.displayTextContent}>
			{safeStringValue(children)}
		</Typography>
	</Box>
)

DisplayText.propTypes = {
	children: PropTypes.node.isRequired,
}

// Section header component
const SectionHeader = ({ icon, title }) => (
	<Box className={styles.sectionHeader}>
		<img src={icon} alt={title} className={styles.sectionIcon} />
		{title ? (
			<Typography variant='h6' className={styles.sectionTitle} sx={{ fontWeight: 600 }}>
				{title}
			</Typography>
		) : null}
	</Box>
)

SectionHeader.propTypes = {
	icon: PropTypes.string.isRequired,
	title: PropTypes.string,
}

const CompanyProfile = ({ userId = 0 }) => {
	const role = sessionStorage.getItem('role')
	const navigate = useNavigate()
	const location = useLocation()
	const { recruiterId } = location.state || {}
	const { id: routeId } = useParams()
	const { language } = useContext(UserContext)
	const { language: langContext, changeLanguage } = useLanguage()
	const showAlert = useAlert()
	const currentLanguage = language || langContext || 'en'
	const t = translations[currentLanguage] || translations.en

	const id = userId !== 0 ? userId : recruiterId || routeId

	const [company, setCompany] = useState(null)
	const [loading, setLoading] = useState(false)
	const [editMode, setEditMode] = useAtom(editModeAtom)
	const [activeTab, setActiveTab] = useState('company')
	const [saveStatus, setSaveStatus] = useAtom(saveStatusAtom)

	// Initial editData state
	const initialEditData = {
		newRequiredSkill: '',
		newWelcomeSkill: '',
		business_overview: '',
		target_audience: [],
		required_skills: [],
		welcome_skills: [],
		company_description: '',
		company_Address: '',
		established_Date: '',
		employee_Count: '',
		work_location: '',
		work_hours: '',
		salary: '',
		benefits: '',
		selection_process: '',
		company_video_url: [],
		newVideoUrl: '',
		first_name: '',
		last_name: '',
		company_name: '',
		photo: '',
		// New fields
		tagline: '',
		company_website: '',
		company_capital: '',
		company_revenue: '',
		company_representative: '',
		job_title: '',
		job_description: '',
		number_of_openings: '',
		employment_type: '',
		probation_period: '',
		employment_period: '',
		recommended_skills: [],
		recommended_licenses: [],
		recommended_other: [],
		newRecommendedSkill: '',
		newRecommendedLicense: '',
		newRecommendedOther: '',
		salary_increase: '',
		bonus: '',
		allowances: '',
		holidays_vacation: '',
		other_notes: '',
		interview_method: '',
		// New fields
		japanese_level: '',
		application_requirements_other: '',
		retirement_benefit: '',
		telework_availability: '',
		housing_availability: '',
		relocation_support: '',
		airport_pickup: '',
		intro_page_thumbnail: '',
		// New multi links
		intro_page_links: [],
		newIntroLinkTitle: '',
		newIntroLinkUrl: '',
	}

	const [editData, setEditData] = useAtom(editDataAtom)

	// Navigation and persistence state
	const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
	const [pendingNavigation, setPendingNavigation] = useState(null)
	const [showRecoveryDialog, setShowRecoveryDialog] = useState(false)
	const [persistedData, setPersistedData] = useState({
		exists: false,
		data: null,
		timestamp: null,
	})

	// Simple form state for unsaved changes tracking
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
	const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
	const [pendingLanguageChange, setPendingLanguageChange] = useState(null)

	// Video carousel states
	const [videoSwiper, setVideoSwiper] = useState(null)
	const [activeVideoIdx, setActiveVideoIdx] = useState(0)

	// React Hook Form setup
	const {
		control,
		handleSubmit,
		formState: { isDirty },
		reset,
		getValues,
		setValue,
	} = useForm({
		defaultValues: company || {},
		mode: 'onChange',
	})

	// Watch for form changes
	useEffect(() => {
		setHasUnsavedChanges(isDirty)
	}, [isDirty])

	// Language change handling
	const handleLanguageChange = newLanguage => {
		if (editMode && hasUnsavedChanges) {
			setPendingLanguageChange(newLanguage)
			setShowUnsavedDialog(true)
		} else {
			changeLanguage(newLanguage)
		}
	}

	// Simple update function
	const handleUpdate = async data => {
		// Process the data correctly
		// Helpers to normalize list arrays
		const normalizeArray = arr => {
			const list = Array.isArray(arr) ? arr : []
			const trimmed = list.map(x => String(x || '').trim()).filter(Boolean)
			const uniq = Array.from(new Set(trimmed))
			return uniq
		}

		// Clamp helper to ensure server-side max length compliance
		const clamp = (val, max) => (max ? String(val || '').slice(0, max) : String(val || ''))

		// Tokenize, filter and validate YouTube URLs (supports arrays, comma/newline separated inputs)
		const normalizeYouTubeUrls = input => {
			const tokens = []
			const pushTokens = val => {
				const str = String(val || '').trim()
				if (!str) return
				// split by commas or any whitespace/newline
				str.split(/[\s,]+/).forEach(t => {
					const tok = String(t || '').trim()
					if (tok) tokens.push(tok)
				})
			}

			if (Array.isArray(input)) {
				input.forEach(v => pushTokens(v))
			} else {
				pushTokens(input)
			}

			const valid = tokens.filter(u => !!extractYouTubeId(u))
			return Array.from(new Set(valid))
		}

		// Normalize intro links to objects { title, url } and include new pair if provided
		const normalizeIntroLinks = (links, newTitle, newUrl) => {
			const out = []
			const pushObj = (t, u) => {
				const url = String(u || '').trim()
				const title = String(t || '').trim()
				if (!url) return
				out.push({ title, url })
			}
			;(Array.isArray(links) ? links : []).forEach(item => {
				if (typeof item === 'string') {
					pushObj('', item)
				} else if (item && typeof item === 'object') {
					pushObj(item.title, item.url)
				}
			})
			pushObj(newTitle, newUrl)
			// Deduplicate by url keeping first title
			const seen = new Set()
			const deduped = []
			for (const it of out) {
				const key = it.url.toLowerCase()
				if (seen.has(key)) continue
				seen.add(key)
				deduped.push(it)
			}
			return deduped.slice(0, 4)
		}

		const mergedIntroLinks = normalizeIntroLinks(data.intro_page_links, data.newIntroLinkTitle, data.newIntroLinkUrl)

		// Merge existing array + new input (allow users to paste multiple links at once)
		const mergedVideoList = normalizeYouTubeUrls([...(Array.isArray(data.company_video_url) ? data.company_video_url : []), data.newVideoUrl || '']).slice(0, 3)

		const processedData = {
			...data,
			// Convert null to empty strings for text fields
			company_Address: clamp(data.company_Address, 1000),
			established_Date: data.established_Date || '',
			employee_Count: clamp(data.employee_Count, 500),
			work_location: clamp(data.work_location, 1000),
			work_hours: clamp(data.work_hours, 500),
			salary: clamp(data.salary, 500),
			benefits: clamp(data.benefits, 500),
			selection_process: clamp(data.selection_process, 500),

			// New optional strings
			japanese_level: clamp(data.japanese_level, 100),
			application_requirements_other: clamp(data.application_requirements_other, 500),
			retirement_benefit: clamp(data.retirement_benefit, 500),
			telework_availability: clamp(data.telework_availability, 200),
			housing_availability: clamp(data.housing_availability, 200),
			relocation_support: data.relocation_support || '',
			airport_pickup: clamp(data.airport_pickup, 200),
			intro_page_thumbnail: clamp(data.intro_page_thumbnail, 500),

			// Recruitment text fields with explicit caps
			job_title: clamp(data.job_title, 200),
			job_description: clamp(data.job_description, 1000),
			number_of_openings: clamp(data.number_of_openings, 500),
			employment_type: clamp(data.employment_type, 100),
			probation_period: clamp(data.probation_period, 500),
			employment_period: clamp(data.employment_period, 500),

			// Enforce one-line PR (tagline) length <= 50
			tagline: (data.tagline || '').slice(0, 50),

			// These should be strings (TEXT in database)
			business_overview: clamp(data.business_overview, 5000),
			target_audience: Array.isArray(data.target_audience) ? data.target_audience.join('\n') : clamp(data.target_audience, 1000),
			required_skills: Array.isArray(data.required_skills) ? data.required_skills.join('\n') : clamp(data.required_skills, 500),
			welcome_skills: Array.isArray(data.welcome_skills) ? data.welcome_skills.join('\n') : clamp(data.welcome_skills, 500),
			// New arrays-as-text — preserve as newline-separated to keep user formatting
			recommended_skills: clamp(normalizeArray(data.recommended_skills).join('\n'), 500),
			recommended_licenses: clamp(normalizeArray(data.recommended_licenses).join('\n'), 500),
			recommended_other: clamp(normalizeArray(data.recommended_other).join('\n'), 500),

			// These should remain as arrays (JSONB in database)
			gallery: Array.isArray(data.gallery) ? data.gallery : [],
			company_video_url: mergedVideoList,
			intro_page_links: mergedIntroLinks,
		}

		// Remove any temporary fields that shouldn't be sent to backend
		delete processedData.newRequiredSkill
		delete processedData.newWelcomeSkill
		delete processedData.newVideoUrl
		delete processedData.newRecommendedSkill
		delete processedData.newRecommendedLicense
		delete processedData.newRecommendedOther

		// Simple implementation - just make API call
		// If some video URLs were removed due to invalid format, inform user
		if (Array.isArray(data.company_video_url) && processedData.company_video_url.length < data.company_video_url.length) {
			showAlert(t.invalid_video_urls_removed, 'warning')
		}

		await axios.put(`/api/recruiters/${id}`, processedData)
	}

	// Simple save function
	const handleSave = async () => {
		try {
			// Use editData instead of getValues() since this component uses state, not React Hook Form
			const formData = editData

			await handleUpdate(formData)

			// Refresh data from backend to ensure consistency
			await fetchCompany()

			// Exit edit mode
			setEditMode(false)

			// Clear unsaved changes flag
			setHasUnsavedChanges(false)

			// Clear any saved drafts
			clearStorage()

			// Show success message
			showAlert(t.changes_saved, 'success')
		} catch (error) {
			showAlert(t.errorSavingChanges, 'error')
		}
	}

	// Simple cancel function
	const handleCancel = () => {
		setEditMode(false)
		reset(company)
		setHasUnsavedChanges(false)
	}

	// localStorage functions
	const loadFromStorage = () => {
		try {
			const storageKey = `company_profile_edit_${id}_${role}`
			const savedData = localStorage.getItem(storageKey)
			return savedData ? JSON.parse(savedData) : null
		} catch (error) {
			return null
		}
	}

	const saveToStorage = data => {
		try {
			const storageKey = `company_profile_edit_${id}_${role}`
			localStorage.setItem(storageKey, JSON.stringify(data))
		} catch (error) {}
	}

	const clearStorage = () => {
		try {
			const storageKey = `company_profile_edit_${id}_${role}`
			localStorage.removeItem(storageKey)
		} catch (error) {}
	}

	const updateOriginalData = data => {
		// Simple implementation - just reset form with new data
		reset(data)
	}

	const confirmLanguageChange = () => {
		// Simple implementation - no complex language change handling
	}

	const cancelLanguageChange = () => {
		// Simple implementation - no complex language change handling
	}

	const saveToStorageIfChanged = data => {
		// Auto-save drafts when editing
		if (editMode && data) {
			saveToStorage(data)
			return true
		}
		return false
	}

	const immediateSaveIfChanged = data => {
		// Simple implementation - just save if has changes
		if (hasUnsavedChanges) {
			handleSave()
			return true
		}
		return false
	}

	const hasChangesFromOriginal = data => {
		// Simple check - just use isDirty from React Hook Form
		return hasUnsavedChanges
	}

	// Additional simple replacements for removed functions

	const handleConfirmCancel = () => {
		// Simple implementation - just cancel
		handleCancel()
	}

	const handleSaveAndNavigate = () => {
		// Simple implementation - just save and handle navigation
		handleSave()
	}

	const handleRecoverData = () => {
		// Simple implementation - no complex recovery
		setShowRecoveryDialog(false)
	}

	const handleDiscardRecovery = () => {
		// Simple implementation - no complex recovery
		setShowRecoveryDialog(false)
	}

	// Refs for maintaining focus
	const inputRefs = useRef({})
	const scrollPositionRef = useRef(0)

	// Warn before leaving page with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = e => {
			if (editMode && role === 'Recruiter') {
				e.preventDefault()
				e.returnValue = ''
			}
		}

		window.addEventListener('beforeunload', handleBeforeUnload)
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload)
		}
	}, [editMode, role])

	// Track navigation attempts when in edit mode
	useEffect(() => {
		if (!editMode || role !== 'Recruiter') return

		let isNavigating = false
		let navigationBlocked = false

		// Override history methods to intercept navigation
		const originalPushState = window.history.pushState
		const originalReplaceState = window.history.replaceState

		const handleNavigation = url => {
			// Skip if we're already handling navigation or if edit mode is false
			if (isNavigating || navigationBlocked || !editMode) return true

			if (url && url !== window.location.pathname) {
				isNavigating = true
				navigationBlocked = true
				setPendingNavigation({ pathname: url })
				setShowUnsavedWarning(true)
				// Prevent the navigation by staying on current page
				setTimeout(() => {
					window.history.pushState(null, '', location.pathname)
					isNavigating = false
				}, 0)
				return false
			}
			return true
		}

		window.history.pushState = function (state, title, url) {
			if (handleNavigation(url)) {
				originalPushState.apply(window.history, arguments)
			}
		}

		window.history.replaceState = function (state, title, url) {
			if (handleNavigation(url)) {
				originalReplaceState.apply(window.history, arguments)
			}
		}

		const handlePopState = e => {
			if (editMode && !navigationBlocked) {
				e.preventDefault()
				navigationBlocked = true
				window.history.pushState(null, '', location.pathname)
				setShowUnsavedWarning(true)
			}
		}

		window.addEventListener('popstate', handlePopState)

		return () => {
			window.history.pushState = originalPushState
			window.history.replaceState = originalReplaceState
			window.removeEventListener('popstate', handlePopState)
		}
	}, [editMode, role, location.pathname])

	// Handle language change with unsaved changes check
	useEffect(() => {
		const handleCheckUnsavedChanges = e => {
			if (editMode && role === 'Recruiter') {
				// Always show warning in edit mode for Recruiters
				e.preventDefault()
				setShowUnsavedWarning(true)
				return false
			}
		}

		window.addEventListener('checkUnsavedChanges', handleCheckUnsavedChanges)
		return () => {
			window.removeEventListener('checkUnsavedChanges', handleCheckUnsavedChanges)
		}
	}, [editMode, role])

	// Auto-save effect with change detection
	useEffect(() => {
		if (editMode && role === 'Recruiter' && editData && company) {
			const hasChanges = hasChangesFromOriginal(editData)

			if (hasChanges) {
				saveToStorageIfChanged(editData)
				setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }))
			} else {
				setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: false }))
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editData, editMode, role, company])

	// Clear navigation flags on unmount
	useEffect(() => {
		return () => {
			// Clean up flags when component unmounts
			localStorage.removeItem('isNavigatingAfterSave')
		}
	}, [])

	// Clear any stale localStorage on component mount
	useEffect(() => {
		if (role === 'Recruiter' && id) {
			try {
				// Clear all possible localStorage keys that might exist
				const keys = Object.keys(localStorage)
				const keysToRemove = keys.filter(key => key.includes('profileEditDraft') && key.includes('company_profile_edit') && key.includes(String(id)))
				keysToRemove.forEach(key => {
					localStorage.removeItem(key)
				})
			} catch (error) {}
		}
	}, [role, id])

	// Fetch company data function
	const fetchCompany = async () => {
		if (!id) return

		try {
			const response = await axios.get(`/api/recruiters/${id}`)
			const companyData = response.data

			const processedData = {
				...companyData,
				business_overview: Array.isArray(companyData.business_overview) ? companyData.business_overview.join('\n') : companyData.business_overview || '',
				target_audience: Array.isArray(companyData.target_audience) ? companyData.target_audience.join('、') : companyData.target_audience || '',
				required_skills: safeParse(companyData.required_skills),
				welcome_skills: safeParse(companyData.welcome_skills),
				company_video_url: Array.isArray(companyData.company_video_url) ? companyData.company_video_url : [],
				// New arrays-as-text: parse to arrays for UI
				recommended_skills: safeParse(companyData.recommended_skills),
				recommended_licenses: safeParse(companyData.recommended_licenses),
				recommended_other: safeParse(companyData.recommended_other),
				// Ensure optional string fields are non-null for UI
				japanese_level: companyData.japanese_level || '',
				application_requirements_other: companyData.application_requirements_other || '',
				retirement_benefit: companyData.retirement_benefit || '',
				telework_availability: companyData.telework_availability || '',
				housing_availability: companyData.housing_availability || '',
				relocation_support: companyData.relocation_support || '',
				airport_pickup: companyData.airport_pickup || '',
				intro_page_thumbnail: companyData.intro_page_thumbnail || '',
				intro_page_links: Array.isArray(companyData.intro_page_links) ? companyData.intro_page_links : companyData.intro_page_thumbnail ? [companyData.intro_page_thumbnail] : [],
			}

			setCompany(processedData)
			const editDataWithNew = {
				...processedData,
				newRequiredSkill: '',
				newWelcomeSkill: '',
				newVideoUrl: '',
				newRecommendedSkill: '',
				newRecommendedLicense: '',
				newRecommendedOther: '',
			}
			setEditData(editDataWithNew)

			// Update the original data reference for change detection
			updateOriginalData(editDataWithNew)

			// Clear any stale localStorage data that might exist
			clearStorage()

			// Additional manual cleanup for any persisted data
			try {
				const storageKey = `profileEditDraft_company_profile_edit_${id || 'unknown'}_${role}`
				localStorage.removeItem(storageKey)
			} catch (error) {}
		} catch (error) {
			setCompany(null)
		}
	}

	// Fetch company data with proper error handling
	useEffect(() => {
		fetchCompany()
	}, [id])

	// Check for persisted data when entering edit mode
	useEffect(() => {
		// Add a small delay to ensure original data reference is updated
		const checkRecovery = () => {
			if (role === 'Recruiter' && editMode && company) {
				// Check if we just switched languages or navigated back
				const isLanguageSwitching = localStorage.getItem('isLanguageSwitching')
				const isNavigatingAfterSave = localStorage.getItem('isNavigatingAfterSave')

				if (isLanguageSwitching === 'true') {
					localStorage.removeItem('isLanguageSwitching')
					// Force load the saved data
					const persistedEditData = loadFromStorage()
					if (persistedEditData && Object.keys(persistedEditData).length > 0) {
						setPersistedData({
							exists: true,
							data: persistedEditData,
							timestamp: new Date().toISOString(),
						})
						setShowRecoveryDialog(true)
					}
				} else if (isNavigatingAfterSave === 'true') {
					localStorage.removeItem('isNavigatingAfterSave')
					// Check if there's saved data to restore
					const persistedEditData = loadFromStorage()
					if (persistedEditData && Object.keys(persistedEditData).length > 0) {
						setPersistedData({
							exists: true,
							data: persistedEditData,
							timestamp: new Date().toISOString(),
						})
						setShowRecoveryDialog(true)
					}
				} else {
					// For normal edit mode entry, don't show recovery dialog
					// Only show recovery for specific cases (language switch or navigation return)

					// Clear any existing localStorage to prevent future false positives
					clearStorage()
				}
			}
		}

		// Small delay to ensure original data reference is properly updated
		const timeoutId = setTimeout(checkRecovery, 100)

		return () => {
			clearTimeout(timeoutId)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [role, editMode, company])

	// Prevent scroll on edit mode
	useEffect(() => {
		if (editMode) {
			const originalBodyScrollBehavior = document.body.style.scrollBehavior
			const originalHtmlScrollBehavior = document.documentElement.style.scrollBehavior

			document.body.style.scrollBehavior = 'auto'
			document.documentElement.style.scrollBehavior = 'auto'

			const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop

			return () => {
				document.body.style.scrollBehavior = originalBodyScrollBehavior
				document.documentElement.style.scrollBehavior = originalHtmlScrollBehavior

				const newScrollPosition = window.pageYOffset || document.documentElement.scrollTop
				if (Math.abs(newScrollPosition - currentScrollPosition) > 10) {
					window.scrollTo(0, currentScrollPosition)
				}
			}
		}
	}, [editMode])

	// Optimized state update to prevent unnecessary re-renders
	const handleUpdateEditData = useCallback((key, value) => {
		if (key === 'company_video_url') {
		}
		setEditData(prevData => {
			if (prevData[key] === value) {
				return prevData
			}
			const newData = {
				...prevData,
				[key]: value,
			}
			if (key === 'company_video_url') {
			}
			return newData
		})
	}, [])

	const handleArrayChange = useCallback((arrayKey, index, value) => {
		setEditData(prevData => {
			const currentArray = safeArrayRender(prevData[arrayKey])
			if (currentArray[index] === value) {
				return prevData
			}
			const newArray = [...currentArray]
			newArray[index] = value
			return {
				...prevData,
				[arrayKey]: newArray,
			}
		})
	}, [])

	// Create ref callback for input refs
	const createInputRef = useCallback(fieldKey => {
		return el => {
			if (el && fieldKey) {
				inputRefs.current[fieldKey] = el
			}
		}
	}, [])

	// Business overview now a single multiline field (matches Company Description behavior)

	if (!company) {
		return (
			<Box className={styles.loadingContainer}>
				<Typography>{t.loading}</Typography>
			</Box>
		)
	}

	return (
		<Box className={styles.pageContainer}>
			{/* Header Section */}
			<HeaderContentBox>
				<Box className={styles.headerContainer}>
					<Box className={styles.avatarContainer} style={{ display: 'none' }}>
						<Avatar src={company.photo} alt={`${safeStringValue(company.first_name)} ${safeStringValue(company.last_name)}`} className={styles.avatar} />
					</Box>
					<Box className={styles.infoContainer}>
						<Box className={styles.nameEmailContainer}>
							<Typography variant='h2' component='div' className={styles.mainTitle}>
								{safeStringValue(company.company_name)}
							</Typography>
						</Box>
						<Box className={styles.chipContainer}>
							{editMode && role === 'Recruiter' ? (
								<Box className={styles.taglineRow}>
									<Typography variant='subtitle1' className={styles.headerInlineLabel}>
										{t.tagline}
									</Typography>
									<Box className={styles.taglineInputWrap}>
										<CustomTextField value={safeStringValue(editData.tagline)} onChange={e => handleUpdateEditData('tagline', e.target.value)} placeholder={t.tagline} fieldKey='tagline_header' inputRef={createInputRef('tagline_header')} maxLength={50} />
									</Box>
								</Box>
							) : (
								(role === 'Recruiter' || hasContent(company.tagline)) && (
									<Typography variant='subtitle1' className={styles.nameText}>
										{safeStringValue(company.tagline)}
									</Typography>
								)
							)}
						</Box>
					</Box>
					{role === 'Recruiter' && (
						<Box className={styles.topControlButtons}>
							<Box className={styles.buttonsContainer}>
								{editMode ? (
									<>
										<Button onClick={handleCancel} variant='outlined' color='error' size='small' disabled={loading}>
											{t.cancel}
										</Button>
										<Button onClick={handleSave} variant='contained' color='primary' size='small' disabled={loading}>
											{loading ? t.saving : t.save}
										</Button>
									</>
								) : (
									<Button
										onClick={() => {
											// Clear any stale localStorage before entering edit mode
											clearStorage()
											setEditMode(true)
										}}
										variant='contained'
										color='primary'
										size='small'
										startIcon={<img src={EditIcon} alt='edit' className={styles.editIcon} />}
										className={styles.editButton}
									>
										{t.edit}
									</Button>
								)}
							</Box>
						</Box>
					)}
				</Box>
			</HeaderContentBox>

			{/* Tabs: 会社情報 / 募集概要 */}
			<Box sx={{ mt: 2, mb: 2 }}>
				<Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor='primary' indicatorColor='primary'>
					<Tab label={t.company_information} value='company' sx={{ fontWeight: '600' }} />
					<Tab label={t.job_details} value='recruitment' sx={{ fontWeight: '600' }} />
				</Tabs>
			</Box>

			{activeTab === 'company' && (
				<>
					{/* Company Information (会社情報) */}
					<SectionHeader
						icon={BusinessIcon}
						// title={t.company_information || 'Company Information'}
					/>
					<Box className={`${styles.companyInfoContainer} ${editMode ? styles.companyInfoContainerEdit : ''}`}>
						{/* company_name */}
						{(role === 'Recruiter' || editMode || hasContent(company.company_name)) && (
							<Box className={`${styles.infoRow} ${styles.infoRowOdd}`}>
								<Typography variant='subtitle1' className={styles.label}>
									{t.company_name}
								</Typography>
								<Box className={`${styles.value} ${styles.valueColumn}`}>{editMode && role === 'Recruiter' ? <CustomTextField value={safeStringValue(editData.company_name)} onChange={e => handleUpdateEditData('company_name', e.target.value)} placeholder={t.company_name} fieldKey='company_name' inputRef={createInputRef('company_name')} multiline={true} minRows={1} maxLength={100} /> : <DisplayText>{safeStringValue(company.company_name)}</DisplayText>}</Box>
							</Box>
						)}
						{(role === 'Recruiter' || editMode || hasContent(company.company_Address)) && (
							<Box className={`${styles.infoRow} ${styles.infoRowOdd}`}>
								<Typography variant='subtitle1' className={styles.label}>
									{t.company_Address}
								</Typography>
								<Box className={styles.value}>{editMode ? <CustomTextField value={safeStringValue(editData.company_Address)} onChange={e => handleUpdateEditData('company_Address', e.target.value)} placeholder={t.location_placeholder} fieldKey='company_Address' inputRef={createInputRef('company_Address')} multiline={true} minRows={3} maxLength={1000} /> : <DisplayText>{safeStringValue(company.company_Address)}</DisplayText>}</Box>
							</Box>
						)}

						{/* Company Website (moved up to follow the desired order) */}
						{(role === 'Recruiter' || editMode || hasContent(company.company_website)) && (
							<Box className={`${styles.infoRow} ${styles.infoRowEven}`}>
								<Typography variant='subtitle1' className={styles.label}>
									{t.company_website}
								</Typography>

								<Box className={styles.value}>
									{editMode ? (
										<CustomTextField value={safeStringValue(editData.company_website)} onChange={e => handleUpdateEditData('company_website', e.target.value)} placeholder={t.url_placeholder || 'https://example.com'} fieldKey='company_website' inputRef={createInputRef('company_website')} />
									) : (
										(() => {
											const url = safeStringValue(company.company_website)
											return url ? (
												<a
													href={url.startsWith('http') ? url : `https://${url}`}
													target='_blank'
													rel='noopener noreferrer'
													style={{
														color: '#1976d2',
														textDecoration: 'underline',
													}}
												>
													{url}
												</a>
											) : (
												<Typography variant='body1'></Typography>
											)
										})()
									)}
								</Box>
							</Box>
						)}

						{/* Removed Established Date per request */}

						{/* Tagline row removed to avoid duplication; Tagline stays under company name in header */}

						{/* Removed Intro Page Thumbnail row as requested */}

						{/* Company Description */}
						<Box className={`${styles.infoRow} ${styles.infoRowEven}`}>
							<Typography variant='subtitle1' className={styles.label}>
								{t.company_description}
							</Typography>
							<Box className={styles.value}>{editMode && role === 'Recruiter' ? <CustomTextField value={safeStringValue(editData.company_description)} onChange={e => handleUpdateEditData('company_description', e.target.value)} multiline minRows={4} placeholder={t.company_description} fieldKey='company_description' inputRef={createInputRef('company_description')} /> : <DisplayText>{safeStringValue(company.company_description)}</DisplayText>}</Box>
						</Box>

						{/* Business Overview (single field) */}
						<Box className={`${styles.infoRow} ${styles.infoRowOdd}`}>
							<Typography variant='subtitle1' className={styles.label}>
								{t.business_overview}
							</Typography>
							<Box className={styles.value}>{editMode && role === 'Recruiter' ? <CustomTextField value={safeStringValue(editData.business_overview)} onChange={e => handleUpdateEditData('business_overview', e.target.value)} multiline minRows={4} placeholder={t.business_content_placeholder} fieldKey='business_overview' inputRef={createInputRef('business_overview')} maxLength={5000} /> : <DisplayText>{safeStringValue(company.business_overview)}</DisplayText>}</Box>
						</Box>

						{/* Employee Count (moved to follow after Business Overview) */}
						{(role === 'Recruiter' || editMode || hasContent(company.employee_Count)) && (
							<Box className={`${styles.infoRow} ${styles.infoRowEven}`}>
								<Typography variant='subtitle1' className={styles.label}>
									{t.employee_Count}
								</Typography>
								<Box className={styles.value}>{editMode ? <CustomTextField value={safeStringValue(editData.employee_Count)} onChange={e => handleUpdateEditData('employee_Count', e.target.value)} placeholder={t.employee_count_placeholder} fieldKey='employee_Count' inputRef={createInputRef('employee_Count')} multiline minRows={2} maxLength={500} /> : <DisplayText>{safeStringValue(company.employee_Count)}</DisplayText>}</Box>
							</Box>
						)}

						{/* Removed Capital, Revenue, Representative per request */}
					</Box>
					{/* Company Introduction Video */}
					{(company?.company_video_url?.length > 0 || role === 'Recruiter' || editMode) && (
						<ContentBox>
							<Box className={styles.sectionHeader} style={{ justifyContent: 'center', textAlign: 'center' }}>
								<Typography variant='h6' className={styles.sectionTitle} sx={{ fontWeight: 600 }}>
									{t.company_introduction_video}
								</Typography>
							</Box>
							{editMode ? (
								<Box>
									{/* Existing videos */}
									{Array.isArray(editData.company_video_url) &&
										editData.company_video_url.map((videoUrl, index) => (
											<Box key={`video-${index}`} className={styles.videoEditItem}>
												<Box className={styles.videoEditContent}>
													<CustomTextField
														value={safeStringValue(videoUrl)}
														onChange={e => {
															const newArray = [...editData.company_video_url]
															newArray[index] = e.target.value
															handleUpdateEditData('company_video_url', newArray)
														}}
														placeholder={t.company_video_url_placeholder}
														fieldKey={`company_video_url_${index}`}
														inputRef={createInputRef(`company_video_url_${index}`)}
													/>
													<button
														type='button'
														className={styles.videoDeleteButton}
														onClick={e => {
															e.preventDefault()

															const currentArray = Array.isArray(editData.company_video_url) ? editData.company_video_url : []
															const newArray = currentArray.filter((_, i) => i !== index)

															handleUpdateEditData('company_video_url', newArray)
														}}
													>
														<img src={DeleteIcon} alt='delete' className={styles.deleteIcon} />
													</button>
												</Box>
											</Box>
										))}

									{/* New video input */}
									<Box className={styles.videoInputContainer}>
										<CustomTextField value={safeStringValue(editData.newVideoUrl)} onChange={e => handleUpdateEditData('newVideoUrl', e.target.value)} placeholder={t.company_video_url_placeholder} fieldKey='newVideoUrl' inputRef={createInputRef('newVideoUrl')} />
										<button
											type='button'
											className={styles.videoSaveButton}
											onClick={e => {
												e.preventDefault()
												const newUrl = safeStringValue(editData.newVideoUrl)
												if (newUrl.trim()) {
													const currentArray = Array.isArray(editData.company_video_url) ? editData.company_video_url : []
													if (currentArray.length >= 3) {
														showAlert(t.max_three_videos, 'warning')
														return
													}
													handleUpdateEditData('company_video_url', [...currentArray, newUrl.trim()])
													handleUpdateEditData('newVideoUrl', '')
												}
											}}
										>
											{t.save_button}
										</button>
									</Box>
								</Box>
							) : (
								<Box>
									{Array.isArray(company?.company_video_url) && company.company_video_url.length > 0 ? (
										<Box>
											{/* Removed descriptive text under video as requested */}
											{company.company_video_url.length === 1 ? (
												(() => {
													const videoId = extractYouTubeId(company.company_video_url[0])
													return videoId ? (
														<Box className={styles.videoContainer}>
															<iframe src={`https://www.youtube.com/embed/${videoId}?enablejsapi=0&rel=0&modestbranding=1&controls=1&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0`} title='Company Introduction Video' className={styles.videoIframe} allowFullScreen loading='lazy' referrerPolicy='no-referrer-when-downgrade' />
														</Box>
													) : null
												})()
											) : (
												<Box className={styles.videoCarouselContainer}>
													<Swiper modules={[Navigation, Pagination]} navigation={true} pagination={{ type: 'fraction' }} loop={false} spaceBetween={12} centeredSlides={false} slidesPerView={1} allowTouchMove={true} className={styles.videoSwiper} watchSlidesProgress={false} onSwiper={sw => setVideoSwiper(sw)} onSlideChange={sw => setActiveVideoIdx(sw.activeIndex || 0)}>
														{company.company_video_url.slice(0, 3).map((videoUrl, index) => {
															const videoId = extractYouTubeId(videoUrl)
															return videoId ? (
																<SwiperSlide key={`video-slide-${index}`}>
																	<Box className={styles.videoContainer}>
																		<iframe src={`https://www.youtube.com/embed/${videoId}?enablejsapi=0&rel=0&modestbranding=1&controls=1&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0`} title={`Company Introduction Video ${index + 1}`} className={styles.videoIframe} allowFullScreen loading='lazy' referrerPolicy='no-referrer-when-downgrade' />
																	</Box>
																</SwiperSlide>
															) : null
														})}
													</Swiper>
													{/* Thumbnails */}
													<Box className={styles.videoThumbs} role='tablist' aria-label='Video thumbnails'>
														{company.company_video_url.slice(0, 3).map((videoUrl, idx) => {
															const vid = extractYouTubeId(videoUrl)
															if (!vid) return null
															const isActive = idx === activeVideoIdx
															return (
																<button
																	key={`thumb-${idx}`}
																	type='button'
																	className={`${styles.thumbBtn} ${isActive ? styles.thumbActive : ''}`}
																	aria-selected={isActive}
																	role='tab'
																	onClick={() => {
																		if (videoSwiper?.slideTo) videoSwiper.slideTo(idx)
																	}}
																	aria-label={`Video ${idx + 1}`}
																>
																	<ThumbImage videoId={vid} />
																</button>
															)
														})}
													</Box>
												</Box>
											)}
										</Box>
									) : (
										<Box className={styles.videoPlaceholder} style={{ textAlign: 'center' }}>
											{t.no_video_set}
										</Box>
									)}
								</Box>
							)}
						</ContentBox>
					)}

					{/* Intro Page Links (up to 4, blue links, new tab) */}
					{(editMode || role === 'Recruiter' || (Array.isArray(company.intro_page_links) && company.intro_page_links.length > 0)) && (
						<ContentBox>
							<SectionHeader icon={BusinessIcon} title={t.intro_page_thumbnail || '紹介ページ'} />
							{editMode ? (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
									{(Array.isArray(editData.intro_page_links) ? editData.intro_page_links : []).map((link, idx) => {
										const item = typeof link === 'string' ? { title: '', url: link } : link || { title: '', url: '' }
										return (
											<Box key={`intro-link-${idx}`} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
												<CustomTextField
													value={safeStringValue(item.title)}
													onChange={e => {
														const arr = Array.isArray(editData.intro_page_links) ? [...editData.intro_page_links] : []
														const next = {
															...(typeof arr[idx] === 'object' ? arr[idx] : { url: arr[idx] || '' }),
															title: e.target.value,
														}
														arr[idx] = next
														handleUpdateEditData('intro_page_links', arr)
													}}
													placeholder={t.intro_link_title || 'タイトル'}
													fieldKey={`intro_page_links_title_${idx}`}
													inputRef={createInputRef(`intro_page_links_title_${idx}`)}
												/>
												<CustomTextField
													value={safeStringValue(item.url)}
													onChange={e => {
														const arr = Array.isArray(editData.intro_page_links) ? [...editData.intro_page_links] : []
														const next = {
															...(typeof arr[idx] === 'object' ? arr[idx] : { title: '' }),
															url: e.target.value,
														}
														arr[idx] = next
														handleUpdateEditData('intro_page_links', arr)
													}}
													placeholder={t.url_placeholder_page}
													fieldKey={`intro_page_links_url_${idx}`}
													inputRef={createInputRef(`intro_page_links_url_${idx}`)}
												/>
												<button
													type='button'
													className={styles.videoDeleteButton}
													onClick={e => {
														e.preventDefault()
														const arr = Array.isArray(editData.intro_page_links) ? [...editData.intro_page_links] : []
														handleUpdateEditData(
															'intro_page_links',
															arr.filter((_, i) => i !== idx)
														)
													}}
												>
													<img src={DeleteIcon} alt='delete' className={styles.deleteIcon} />
												</button>
											</Box>
										)
									})}
									<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
										<CustomTextField value={safeStringValue(editData.newIntroLinkTitle)} onChange={e => handleUpdateEditData('newIntroLinkTitle', e.target.value)} placeholder={t.intro_link_title} fieldKey='newIntroLinkTitle' inputRef={createInputRef('newIntroLinkTitle')} />
										<CustomTextField value={safeStringValue(editData.newIntroLinkUrl)} onChange={e => handleUpdateEditData('newIntroLinkUrl', e.target.value)} placeholder={t.url_placeholder_page} fieldKey='newIntroLinkUrl' inputRef={createInputRef('newIntroLinkUrl')} />
										<button
											type='button'
											className={styles.videoSaveButton}
											onClick={e => {
												e.preventDefault()
												const url = safeStringValue(editData.newIntroLinkUrl).trim()
												const title = safeStringValue(editData.newIntroLinkTitle).trim()
												if (!url) return
												const arr = Array.isArray(editData.intro_page_links) ? [...editData.intro_page_links] : []
												if (arr.length >= 4) {
													showAlert(t.max_four_links || '最大4件まで追加できます', 'warning')
													return
												}
												arr.push({ title, url })
												handleUpdateEditData('intro_page_links', arr)
												handleUpdateEditData('newIntroLinkTitle', '')
												handleUpdateEditData('newIntroLinkUrl', '')
											}}
										>
											{t.save_button}
										</button>
									</Box>
								</Box>
							) : (
								<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
									{(() => {
										const links = Array.isArray(company.intro_page_links) ? company.intro_page_links : []
										const filteredLinks = links
											.filter(entry => {
												const obj = typeof entry === 'string' ? { title: '', url: entry } : entry || { title: '', url: '' }
												return obj.url && obj.url.trim().length > 0
											})
											.slice(0, 4)

										if (filteredLinks.length === 0) {
											return (
												<Box sx={{ textAlign: 'center', py: 3 }}>
													<Typography color='text.secondary'>{t.no_intro_pages_set}</Typography>
												</Box>
											)
										}

										return filteredLinks.map((entry, i) => {
											const obj = typeof entry === 'string' ? { title: '', url: entry } : entry || { title: '', url: '' }
											const u = obj.url
											const title = obj.title || u
											return (
												<Box
													key={`intro-a-${i}`}
													className={styles.introLinkItem}
													sx={{
														display: 'flex',
														flexDirection: 'column',
														gap: 0.5,
													}}
												>
													{title && title.trim().length > 0 && (
														<Typography variant='body1' color='text.primary' className={styles.introLinkTitle} sx={{ fontWeight: 600 }}>
															{title}
														</Typography>
													)}
													<a
														href={u && u.startsWith('http') ? u : `https://${u}`}
														target='_blank'
														rel='noopener noreferrer'
														style={{
															color: '#1976d2',
															textDecoration: 'underline',
															wordBreak: 'break-all',
														}}
													>
														{u}
													</a>
												</Box>
											)
										})
									})()}
								</Box>
							)}
						</ContentBox>
					)}

					{/* Company Documents (資料) — moved after Intro Page Links */}
					{(role === 'Recruiter' || role === 'Admin' || role === 'Staff' || role === 'Student') && <RecruiterFiles editMode={editMode} recruiterId={id} currentRole={role} />}
				</>
			)}

			{activeTab === 'recruitment' && (
				<>
					<ContentBox>
						<SectionHeader
							icon={WorkIcon}
							// title={t.work_information || 'Work Information'}
						/>
						<Box className={`${styles.companyInfoContainer} ${editMode ? styles.companyInfoContainerEdit : ''}`} sx={{ p: 0, m: 0 }}>
							{[
								// 1-2 基本
								{
									key: 'job_title',
									label: t.job_title,
									multiline: true,
									maxLength: 200,
								},
								{
									key: 'job_description',
									label: t.job_description,
									multiline: true,
									maxLength: 1000,
								},
								// 3 対象
								{
									key: 'target_audience',
									label: t.target_audience || '対象',
									multiline: true,
									maxLength: 1000,
									type: 'target',
								},
								// 4-5 応募要件
								{
									key: 'japanese_level',
									label: t.japanese_level,
									multiline: true,
									maxLength: 100,
								},
								{
									key: 'application_requirements_other',
									label: t.application_requirements_other,
									multiline: true,
									maxLength: 500,
								},
								// 6-8 推奨
								{
									key: 'recommended_skills',
									label: t.recommended_skills || '推奨：経験やスキル',
									type: 'array',
									maxLength: 500,
								},
								{
									key: 'recommended_licenses',
									label: t.recommended_licenses || '推奨：資格や免許',
									type: 'array',
									maxLength: 500,
								},
								{
									key: 'recommended_other',
									label: t.recommended_other || '推奨：その他',
									type: 'array',
									maxLength: 500,
								},
								// 9-13 募集詳細
								{
									key: 'number_of_openings',
									label: t.number_of_openings,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'employment_type',
									label: t.employment_type,
									multiline: true,
									maxLength: 100,
								},
								{
									key: 'probation_period',
									label: t.probation_period,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'employment_period',
									label: t.employment_period,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'work_location',
									label: t.work_location,
									multiline: true,
									maxLength: 1000,
								},
								// 14-25 給与・待遇
								{
									key: 'salary',
									label: t.salary,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'salary_increase',
									label: t.salary_increase || '昇給',
									multiline: true,
									maxLength: 1000,
								},
								{
									key: 'bonus',
									label: t.bonus || '賞与',
									multiline: true,
									maxLength: 1000,
								},
								{
									key: 'work_hours',
									label: t.work_hours,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'holidays_vacation',
									label: t.holidays_vacation || '休日・休暇',
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'benefits',
									label: t.benefits || '社会保険',
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'allowances',
									label: <span style={{ whiteSpace: 'pre-line' }}>{t.allowances || 'その他手当\n福利厚生'}</span>,
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'retirement_benefit',
									label: t.retirement_benefit || '退職金',
									multiline: true,
									maxLength: 500,
								},
								{
									key: 'telework_availability',
									label: t.telework_availability || 'テレワークの有無',
									multiline: true,
									maxLength: 200,
								},
								{
									key: 'housing_availability',
									label: t.housing_availability || '寮、社宅等の有無',
									multiline: true,
									maxLength: 200,
								},
								{
									key: 'relocation_support',
									label: t.relocation_support || '航空券代・赴任費用の負担',
									multiline: true,
								},
								{
									key: 'airport_pickup',
									label: t.airport_pickup || '来日時の送迎',
									multiline: true,
									maxLength: 200,
								},
								// 26-27 フロー・その他
								{
									key: 'selection_process',
									label: t.selection_process || '採用までの流れ',
									multiline: true,
								},
								{
									key: 'other_notes',
									label: t.other_notes || 'その他',
									multiline: true,
								},
							]
								.filter(({ key }) => {
									// Fields that should be hidden when empty for non-Recruiters
									const hideWhenEmpty = [
										'company_video_url', // 紹介動画
										'intro_page_links', // 紹介ページ
										'files', // 資料
										'application_requirements_other', // 応募要件：その他
										'recommended_skills', // 推奨：経験やスキル
										'recommended_licenses', // 推奨：資格や免許
										'recommended_other', // 推奨：その他
										'number_of_openings', // 募集人数
										'allowances', // その他手当 福利厚生
										'retirement_benefit', // 退職金
										'other_notes', // その他
									]

									// Always show for Recruiters or in edit mode
									if (role === 'Recruiter' || editMode) {
										return true
									}

									// For other roles, hide only specified fields when empty
									if (hideWhenEmpty.includes(key)) {
										return hasContent(company[key])
									}

									// Show all other fields regardless of content
									return true
								})
								.map((f, idx) => (
									<Box key={f.key} className={`${styles.infoRow} ${idx % 2 === 0 ? styles.infoRowOdd : styles.infoRowEven}`} sx={{ m: 0, p: 0 }}>
										<Typography variant='subtitle1' className={styles.label}>
											{f.label}
										</Typography>
										<Box className={styles.value}>
											{/* Array-style fields */}
											{f.type === 'array' ? (
												editMode && role === 'Recruiter' ? (
													<CustomTextField
														value={safeArrayRender(editData[f.key]).join('\n')}
														multiline
														minRows={3}
														onChange={e => {
															const arr = String(e.target.value || '')
																.split(/[\n,]+/)
																.map(s => s.trim())
																.filter(Boolean)
															handleUpdateEditData(f.key, arr)
														}}
														placeholder={t[`${f.key}_placeholder`] || (typeof f.label === 'string' ? f.label : '')}
														fieldKey={f.key}
														inputRef={createInputRef(f.key)}
														maxLength={f.maxLength}
													/>
												) : (
													<DisplayText>{safeArrayRender(company[f.key]).join('\n')}</DisplayText>
												)
											) : f.type === 'target' ? (
												/* Special render for 対象: accept comma-separated string, display gracefully */
												editMode && role === 'Recruiter' ? (
													<CustomTextField value={safeStringValue(editData[f.key])} onChange={e => handleUpdateEditData(f.key, e.target.value)} placeholder={t[`${f.key}_placeholder`] || (typeof f.label === 'string' ? f.label : '')} fieldKey={f.key} inputRef={createInputRef(f.key)} maxLength={f.maxLength} multiline minRows={3} />
												) : (
													<DisplayText>{Array.isArray(company[f.key]) ? company[f.key].join('、') : safeStringValue(company[f.key])}</DisplayText>
												)
											) : /* Default text fields */
											editMode && role === 'Recruiter' ? (
												<CustomTextField value={safeStringValue(editData[f.key])} onChange={e => handleUpdateEditData(f.key, e.target.value)} multiline={!!f.multiline} minRows={f.multiline ? 3 : 1} placeholder={t[`${f.key}_placeholder`] || (typeof f.label === 'string' ? f.label : '')} fieldKey={f.key} inputRef={createInputRef(f.key)} maxLength={f.maxLength} />
											) : (
												<DisplayText>{safeStringValue(company[f.key])}</DisplayText>
											)}
										</Box>
									</Box>
								))}
						</Box>
					</ContentBox>
				</>
			)}

			{/* Auto-save indicator */}
			{editMode && role === 'Recruiter' && (
				<Snackbar open={saveStatus.isSaving || !!saveStatus.lastSaved} autoHideDuration={saveStatus.isSaving ? null : 2000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} onClose={() => setSaveStatus(prev => ({ ...prev, lastSaved: null }))}>
					<Alert severity='info' icon={saveStatus.isSaving ? <SaveIcon /> : <SaveIcon />} sx={{ alignItems: 'center' }}>
						{saveStatus.isSaving ? t.savingChanges || 'Saving...' : t.changesSaved || 'Changes saved'}
						{saveStatus.isSaving && <LinearProgress color='inherit' sx={{ ml: 2, width: 100 }} />}
					</Alert>
				</Snackbar>
			)}

			{/* Recovery dialog */}
			<Dialog open={showRecoveryDialog} onClose={() => setShowRecoveryDialog(false)}>
				<DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<RestoreIcon color='info' />
					{t.recoverUnsavedChanges || 'Recover Unsaved Changes?'}
				</DialogTitle>
				<DialogContent>
					<Typography>{t.unsavedChangesFound || 'We found unsaved changes from your previous editing session. Would you like to restore them?'}</Typography>
					{persistedData.timestamp && (
						<Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
							{t.lastModified || 'Last modified'}: {new Date(persistedData.timestamp).toLocaleString()}
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleDiscardRecovery} color='error'>
						{t.discard || 'Discard'}
					</Button>
					<Button onClick={handleRecoverData} variant='contained' startIcon={<RestoreIcon />}>
						{t.restore || 'Restore'}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Simple Unsaved Changes Dialog */}
			<Dialog open={showUnsavedDialog} onClose={() => setShowUnsavedDialog(false)}>
				<DialogTitle>{t.unsaved_changes_title || 'Unsaved Changes'}</DialogTitle>
				<DialogContent>
					<Typography>{t.language_change_unsaved_message || 'You have unsaved changes. Would you like to save them before changing the language?'}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowUnsavedDialog(false)}>{t.cancel || 'Cancel'}</Button>
					<Button
						onClick={() => {
							handleCancel()
							setShowUnsavedDialog(false)
							changeLanguage(pendingLanguageChange)
						}}
						color='warning'
					>
						{t.discard_changes || 'Discard Changes'}
					</Button>
					<Button
						onClick={async () => {
							await handleSave()
							setShowUnsavedDialog(false)
							changeLanguage(pendingLanguageChange)
						}}
						variant='contained'
						color='primary'
					>
						{t.save_and_continue || 'Save and Continue'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

// Main component PropTypes
CompanyProfile.propTypes = {
	userId: PropTypes.number,
}

export default CompanyProfile
