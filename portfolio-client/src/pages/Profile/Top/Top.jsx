import AddIcon from '@mui/icons-material/Add'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import CloseIcon from '@mui/icons-material/Close'
import CodeIcon from '@mui/icons-material/Code'
import DownloadIcon from '@mui/icons-material/Download'
import ElectricBoltIcon from '@mui/icons-material/ElectricBolt'
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined'
import FavoriteBorderTwoToneIcon from '@mui/icons-material/FavoriteBorderTwoTone'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import RestoreIcon from '@mui/icons-material/Restore'
import SaveIcon from '@mui/icons-material/Save'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, TextField as MuiTextField, Snackbar, Tooltip, Typography } from '@mui/material'
import { useAtom } from 'jotai'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom' // ReactDOM.createPortal o'rniga
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { activeUniverAtom, deletedUrlsAtom, deliverableImagesAtom, editDataAtom, editModeAtom, hobbiesInputAtom, newImagesAtom, showHobbiesInputAtom, showSpecialSkillsInputAtom, specialSkillsInputAtom, subTabIndexAtom, updateQAAtom } from '../../../atoms/profileEditAtoms'
import Deliverables from '../../../components/Deliverables/Deliverables'
import ProfileConfirmDialog from '../../../components/Dialogs/ProfileConfirmDialog'
import LanguageSkillSelector from '../../../components/LanguageSkillSelector/LanguageSkillSelector'
import OtherSkillsSelector from '../../../components/OtherSkillsSelector/OtherSkillsSelector'
import SkillSelector from '../../../components/SkillSelector/SkillSelector'
import TextField from '../../../components/TextField/TextField'
import { useAlert } from '../../../contexts/AlertContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import { downloadCV } from '../../../lib/cv-download'
import translations from '../../../locales/translations'
import QA from '../../../pages/Profile/QA/QA'
import axios from '../../../utils/axiosUtils'
import Arubaito from '../Arubaito/Arubaito'
import { Education } from '../Education/Education'
import { Licenses } from '../Licenses/Licenses'
import WorkExperience from '../WorkExperience/WorkExperience'
import styles from './Top.module.css'
const Top = () => {
	let id
	const role = sessionStorage.getItem('role')
	const { studentId } = useParams()
	const location = useLocation()
	const { userId } = location.state || {}
	const statedata = location.state?.student
	const { language, changeLanguage } = useLanguage()

	// Early state declaration for saveStatus
	const [saveStatus, setSaveStatus] = useState({
		isSaving: false,
		lastSaved: null,
		hasUnsavedChanges: false,
	})
	// Language change handling
	const handleLanguageChange = newLanguage => {
		if (editMode && hasUnsavedChanges) {
			setPendingLanguageChange(newLanguage)
			setShowUnsavedDialog(true)
		} else {
			changeLanguage(newLanguage)
		}
	}

	// Simple functions to replace complex ones
	const handleCancel = () => {
		setEditMode(false)
		reset(student)
		setHasUnsavedChanges(false)
	}

	// Simple replacements for removed functions
	const clearStorage = () => {
		// Simple localStorage clear - no complex persistence
		localStorage.removeItem(`profile_edit_${id}_${role}`)
	}

	const updateOriginalData = data => {
		// Simple implementation - just reset form with new data
		reset(data)
	}

	const hasChangesFromOriginal = data => {
		// Simple check - just use isDirty from React Hook Form
		return hasUnsavedChanges
	}

	// Simple replacement for persistedData
	const persistedData = {
		exists: false,
		data: null,
		timestamp: null,
	}

	// Simple replacement for missing states
	const showUnsavedWarning = false
	const setShowUnsavedWarning = () => {} // No-op function
	const pendingNavigation = null
	const setPendingNavigation = () => {} // No-op function
	const setPersistedData = () => {} // No-op function

	// Simple replacements for missing handlers
	const handleConfirmCancel = () => {
		handleCancel()
	}

	const handleSaveAndNavigate = () => {
		handleSave()
	}

	// More missing states/functions
	const [portalContainer, setPortalContainer] = useState(null)
	const showRecoveryDialog = false
	const setShowRecoveryDialog = () => {}
	const handleRecoverData = () => {}
	const handleDiscardRecovery = () => {}

	// Missing function
	const immediateSaveIfChanged = data => {
		if (hasUnsavedChanges) {
			handleSave()
			return true
		}
		return false
	}
	const showAlert = useAlert()
	const navigate = useNavigate()

	const t = key => translations[language][key] || key
	// Minimal local persistence for draft edits (avoid data loss on refresh)
	const saveToStorageIfChanged = data => {
		try {
			const key = `profile_edit_${id}_${role}`
			localStorage.setItem(key, JSON.stringify(data))
		} catch (e) {
			// ignore localStorage quota or JSON errors
		}
	}

	// Load persisted edit data
	const loadFromStorage = () => {
		try {
			const key = `profile_edit_${id}_${role}`
			const raw = localStorage.getItem(key)
			return raw ? JSON.parse(raw) : null
		} catch (e) {
			return null
		}
	}

	// Immediate save shim (persist locally for now)
	const immediateSave = data => {
		saveToStorageIfChanged(data)
	}

	// Helper function to safely parse JLPT and JDU certification (JSON or plain) with null handling
	const getJLPTData = jlptString => {
		try {
			// Treat empty, 'null', or 'undefined' as not submitted
			if (jlptString === null || jlptString === undefined || (typeof jlptString === 'string' && (jlptString.trim() === '' || jlptString.trim().toLowerCase() === 'null' || jlptString.trim().toLowerCase() === 'undefined'))) {
				return { highest: '未提出', list: [] }
			}

			if (typeof jlptString === 'string') {
				// Try to parse JSON first
				try {
					const parsed = JSON.parse(jlptString)
					if (parsed === null) return { highest: '未提出', list: [] }
					if (parsed && typeof parsed === 'object' && parsed.highest) {
						return parsed
					}
					// Not expected JSON structure; treat original as plain value (e.g., 'N2')
					return { highest: jlptString }
				} catch {
					// Not JSON; treat as plain value
					return { highest: jlptString }
				}
			}

			if (typeof jlptString === 'object') {
				return jlptString && jlptString.highest ? jlptString : { highest: '未提出', list: [] }
			}

			return { highest: '未提出', list: [] }
		} catch {
			return { highest: '未提出', list: [] }
		}
	}

	// Helper function to safely parse certificate data (for japanese_speech_contest and it_contest)
	const getCertificateData = certificateString => {
		try {
			if (!certificateString || certificateString === 'null' || certificateString === 'undefined') return { highest: '未提出', list: [] }

			// If it's already a plain string (not JSON), return it as the highest value
			if (typeof certificateString === 'string') {
				// Try to parse as JSON first
				try {
					const parsed = JSON.parse(certificateString)
					// If it's a valid JSON object with highest property, return it
					if (parsed && typeof parsed === 'object' && parsed.highest) {
						return parsed
					}
					// If it's a valid JSON but not the expected structure, treat as plain string
					return { highest: certificateString, list: [] }
				} catch (jsonError) {
					// If JSON parsing fails, it's a plain string, return it as highest value
					return { highest: certificateString, list: [] }
				}
			}

			// If it's already an object, return it
			if (typeof certificateString === 'object' && certificateString !== null) {
				return certificateString.highest ? certificateString : { highest: '未提出', list: [] }
			}

			return { highest: '未提出', list: [] }
		} catch (error) {
			// If anything goes wrong, return the original string as highest if it exists
			if (certificateString && typeof certificateString === 'string') {
				return { highest: certificateString, list: [] }
			}
			return { highest: '未提出', list: [] }
		}
	}

	if (userId !== 0 && userId) {
		id = userId
	} else {
		id = studentId
	}
	const [student, setStudent] = useState(null)
	const [liveData, setLiveData] = useState(null) // Live profile data from Students table
	const [editData, setEditData] = useAtom(editDataAtom)
	const [editMode, setEditMode] = useAtom(editModeAtom)
	const [viewingLive, setViewingLive] = useState(false) // Toggle between Live and Draft view
	const [currentDraft, setCurrentDraft] = useState({})
	const [currentPending, setCurrentPending] = useState(null) // Pending draft for staff review
	const [updateQA, SetUpdateQA] = useAtom(updateQAAtom)
	const [newImages, setNewImages] = useAtom(newImagesAtom)
	const [deletedUrls, setDeletedUrls] = useAtom(deletedUrlsAtom)
	const [deliverableImages, setDeliverableImages] = useAtom(deliverableImagesAtom)
	const [subTabIndex, setSubTabIndex] = useAtom(subTabIndexAtom)
	const [hasDraft, setHasDraft] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [confirmMode, setConfirmMode] = useState(false)
	const [activeUniver, setActiveUniver] = useAtom(activeUniverAtom)
	const [resetDeliverablePreviews, setResetDeliverablePreviews] = useState(false)
	const [filteredLanguageSkills, setFilteredLanguageSkills] = useState([])
	// ✅ New state for hobbies and special skills tags
	const [hobbiesInput, setHobbiesInput] = useAtom(hobbiesInputAtom)
	const [specialSkillsInput, setSpecialSkillsInput] = useAtom(specialSkillsInputAtom)
	const [showHobbiesInput, setShowHobbiesInput] = useAtom(showHobbiesInputAtom)
	const [showSpecialSkillsInput, setShowSpecialSkillsInput] = useAtom(showSpecialSkillsInputAtom)

	// Simple form state for unsaved changes tracking
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
	const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
	const [pendingLanguageChange, setPendingLanguageChange] = useState(null)
	// Expand/collapse for long texts in view mode
	const [expandHobbies, setExpandHobbies] = useState(false)
	const [expandSpecial, setExpandSpecial] = useState(false)

	// Handle language switch confirmation/cancel
	const cancelLanguageChange = () => {
		setPendingLanguageChange(null)
	}
	const confirmLanguageChange = () => {
		if (pendingLanguageChange) {
			changeLanguage(pendingLanguageChange)
			setPendingLanguageChange(null)
		}
	}

	// React Hook Form setup
	const {
		formState: { isDirty },
		reset,
		getValues,
	} = useForm({
		defaultValues: student || {},
		mode: 'onChange',
	})

	// Watch for form changes
	useEffect(() => {
		setHasUnsavedChanges(isDirty)
	}, [isDirty])

	// ✅ Portal container check effect
	useEffect(() => {
		const checkPortalContainer = () => {
			const container = document.getElementById('saveButton')
			if (container) {
				setPortalContainer(container)
			} else {
				// Agar container topilmasa, setTimeout bilan qayta urinish
				setTimeout(checkPortalContainer, 100)
			}
		}

		checkPortalContainer()
	}, [])

	// Helper function to create time badge with colors and animations
	const getTimeBadge = updatedAt => {
		if (!updatedAt) return null

		const now = new Date()
		const updated = new Date(updatedAt)
		const diffMs = now - updated
		const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24))
		const hoursAgo = Math.floor(diffMs / (1000 * 60 * 60))
		const minutesAgo = Math.floor(diffMs / (1000 * 60))

		// Get relative time string
		let timeLabel
		if (minutesAgo < 60) {
			timeLabel = language === 'ja' ? `${minutesAgo}分前` : language === 'uz' ? `${minutesAgo} daqiqa oldin` : language === 'ru' ? `${minutesAgo} мин. назад` : `${minutesAgo}m ago`
		} else if (hoursAgo < 24) {
			timeLabel = language === 'ja' ? `${hoursAgo}時間前` : language === 'uz' ? `${hoursAgo} soat oldin` : language === 'ru' ? `${hoursAgo} ч. назад` : `${hoursAgo}h ago`
		} else if (daysAgo < 30) {
			timeLabel = language === 'ja' ? `${daysAgo}日前` : language === 'uz' ? `${daysAgo} kun oldin` : language === 'ru' ? `${daysAgo} дн. назад` : `${daysAgo}d ago`
		} else if (daysAgo < 365) {
			const weeksAgo = Math.floor(daysAgo / 7)
			timeLabel = language === 'ja' ? `${weeksAgo}週間前` : language === 'uz' ? `${weeksAgo} hafta oldin` : language === 'ru' ? `${weeksAgo} нед. назад` : `${weeksAgo}w ago`
		} else {
			const monthsAgo = Math.floor(daysAgo / 30)
			timeLabel = language === 'ja' ? `${monthsAgo}ヶ月前` : language === 'uz' ? `${monthsAgo} oy oldin` : language === 'ru' ? `${monthsAgo} мес. назад` : `${monthsAgo}mo ago`
		}

		// Get color and pulse status based on days
		let bgColor, textColor, shouldPulse
		if (daysAgo < 14) {
			bgColor = '#e8f5e9' // light green bg
			textColor = '#2e7d32' // dark green text
			shouldPulse = false
		} else if (daysAgo < 30) {
			bgColor = '#fff3e0' // light orange bg
			textColor = '#ef6c00' // orange text
			shouldPulse = false
		} else if (daysAgo < 60) {
			bgColor = '#fff3e0' // light orange bg
			textColor = '#e65100' // dark orange text
			shouldPulse = false
		} else {
			bgColor = '#ffebee' // light red bg
			textColor = '#c62828' // dark red text
			shouldPulse = true
		}

		// Format full date for tooltip
		const fullDate = updated.toLocaleString(language === 'ja' ? 'ja-JP' : language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

		// Build tooltip content
		const tooltipTitle = (
			<div style={{ textAlign: 'center', padding: '4px' }}>
				<div style={{ fontWeight: 600, marginBottom: '4px' }}>{language === 'ja' ? '最終更新' : language === 'uz' ? 'Oxirgi yangilanish' : language === 'ru' ? 'Последнее обновление' : 'Last updated'}</div>
				<div>{fullDate}</div>
			</div>
		)

		return (
			<Tooltip title={tooltipTitle} arrow placement='bottom'>
				<Chip
					size='small'
					label={timeLabel}
					className={shouldPulse ? styles.pulsingBadge : ''}
					sx={{
						backgroundColor: bgColor,
						color: textColor,
						fontWeight: 600,
						fontSize: '12px',
						height: '40px',
						border: shouldPulse ? `1px solid ${textColor}` : 'none',
						cursor: 'pointer',
						'& .MuiChip-label': {
							px: 1.5,
						},
					}}
				/>
			</Tooltip>
		)
	}

	// Handle language change event to save data before reload
	useEffect(() => {
		const handleBeforeLanguageChange = e => {
			// No need to save here as handleConfirmCancel already saves
		}

		window.addEventListener('beforeLanguageChange', handleBeforeLanguageChange)
		return () => {
			window.removeEventListener('beforeLanguageChange', handleBeforeLanguageChange)
		}
	}, [editMode, role])

	// Warn before leaving page with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = e => {
			if (editMode && role === 'Student') {
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
		if (!editMode || role !== 'Student') return

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
			if (editMode && role === 'Student') {
				// Always show warning in edit mode for Students
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

	useEffect(() => {
		fetchLanguageSkills()
		const loadData = async () => {
			setIsLoading(true)
			try {
				if (statedata) {
					await handleStateData()
				} else {
					if (role === 'Student') {
						await fetchDraftData()
					} else {
						await fetchStudentData()
					}
				}

				// Check for persisted data after loading
				if (role === 'Student' && !editMode) {
					// Check if we just switched languages or navigated back
					const isLanguageSwitching = localStorage.getItem('isLanguageSwitching')
					const isNavigatingAfterSave = localStorage.getItem('isNavigatingAfterSave')

					if (isLanguageSwitching === 'true') {
						localStorage.removeItem('isLanguageSwitching')
						// Force load the saved data
						const persistedEditData = loadFromStorage()
						if (persistedEditData && persistedEditData.draft) {
							// Automatically restore without dialog
							setEditData(persistedEditData)
							setEditMode(true)
							showAlert(t('dataRestoredAfterLanguageSwitch') || 'Your data has been restored after language switch', 'success')
							// Clear the saved data since we've restored it
							setTimeout(() => {
								immediateSave(persistedEditData)
							}, 500)
						}
					} else if (isNavigatingAfterSave === 'true') {
						localStorage.removeItem('isNavigatingAfterSave')
						// Check if there's saved data to restore
						const persistedEditData = loadFromStorage()
						if (persistedEditData && persistedEditData.draft) {
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
			} catch (error) {
				showAlert(t('error_loading_data'), 'error')
			} finally {
				setIsLoading(false)
			}
		}

		loadData()
	}, [id, role, statedata])

	const handleStateData = async () => {
		if (statedata.draft) {
			setDraft(statedata.draft)

			// Auto-update to 'checking' status when staff views submitted draft
			if (role === 'Staff' && statedata.draft.status === 'submitted') {
				const staffId = JSON.parse(sessionStorage.getItem('loginUser'))?.id
				if (staffId) {
					try {
						await axios.put(`/api/draft/status/${statedata.draft.id}`, {
							status: 'checking',
							reviewed_by: staffId,
						})
						// Update local state
						statedata.draft.status = 'checking'
						statedata.draft.reviewed_by = staffId
						setDraft({ ...statedata.draft })
					} catch (error) {
						console.error('Failed to auto-update draft status:', error)
					}
				}
			}

			if (statedata.draft.status === 'checking' || statedata.draft.status === 'approved') {
				// Status is checking or approved
			} else {
				// Status is not checking or approved
			}

			// Parse certificate fields properly
			const parsedStateData = mapData(statedata)

			const mappedData = {
				...parsedStateData,
				draft: statedata.draft.profile_data || {},
			}

			setStudent(mappedData)
			setEditData(mappedData)
			// Update the original data reference for change detection
			updateOriginalData(mappedData)

			// Clear any stale localStorage data that might exist
			clearStorage()
			setHasDraft(true)
			SetUpdateQA(!updateQA)
		}
	}

	const fetchDraftData = async () => {
		try {
			const studentIdToUse = role === 'Student' ? getStudentIdFromLoginUser() : id

			if (!studentIdToUse) {
				showAlert(t('unable_to_determine_student_id'), 'error')
				return
			}

			const response = await axios.get(`/api/draft/student/${studentIdToUse}`)

			if (response.data) {
				const studentData = { ...response.data }
				const draftData = studentData.draft
				const pendingData = studentData.pendingDraft
				delete studentData.draft
				delete studentData.pendingDraft

				// Store Live data (from Students table)
				const liveProfileData = {
					...studentData,
					draft: mapData(studentData).draft, // Parse live data for display
				}
				setLiveData(liveProfileData)

				// Handle Draft version
				if (draftData) {
					setCurrentDraft(draftData)
					setHasDraft(true)
				}

				// Handle Pending version (for staff review)
				if (pendingData) {
					setCurrentPending(pendingData)

					// Auto-update to 'checking' status and bind reviewer when staff views submitted draft
					if (role === 'Staff' && pendingData.status === 'submitted') {
						const staffId = JSON.parse(sessionStorage.getItem('loginUser'))?.id
						if (staffId) {
							try {
								await axios.put(`/api/draft/status/${pendingData.id}`, {
									status: 'checking',
									reviewed_by: staffId,
								})
								// Update local state
								pendingData.status = 'checking'
								pendingData.reviewed_by = staffId
								setCurrentPending({ ...pendingData })
							} catch (error) {
								console.error('Failed to auto-update draft status:', error)
							}
						}
					}
				}

				// Set default view data (Draft for editing, Live for viewing)
				const mappedData = {
					...studentData,
					draft: draftData ? draftData.profile_data : {},
				}

				setStudent(mappedData)
				setEditData(mappedData)
				// Update the original data reference for change detection
				updateOriginalData(mappedData)

				// Clear any stale localStorage data that might exist
				clearStorage()
				SetUpdateQA(!updateQA)
			} else {
				showAlert(t('no_data_found'), 'error')
			}
		} catch (error) {
			showAlert(t('error_fetching_draft'), 'error')
		}
	}

	const getStudentIdFromLoginUser = () => {
		try {
			const loginUserData = JSON.parse(sessionStorage.getItem('loginUser'))
			return loginUserData?.studentId
		} catch (e) {
			return null
		}
	}

	const fetchStudentData = async () => {
		try {
			const response = await axios.get(`/api/students/${id}`)
			const studentData = response.data

			// Always parse JSON fields first using mapData
			const parsedStudentData = mapData(studentData)

			// Store Live data
			setLiveData(parsedStudentData)

			// Staff/Admin view: use pending draft for review if available
			const draftData = studentData.draft
			const pendingData = studentData.pendingDraft

			// Set current pending for staff comment display
			if (pendingData) {
				setCurrentPending(pendingData)

				// Auto-update to 'checking' status and bind reviewer when staff views submitted draft
				if (role === 'Staff' && pendingData.status === 'submitted') {
					const staffId = JSON.parse(sessionStorage.getItem('loginUser'))?.id
					if (staffId) {
						try {
							await axios.put(`/api/draft/status/${pendingData.id}`, {
								status: 'checking',
								reviewed_by: staffId,
							})
							// Update local state
							pendingData.status = 'checking'
							pendingData.reviewed_by = staffId
							setCurrentPending({ ...pendingData })
						} catch (error) {
							console.error('Failed to auto-update draft status:', error)
						}
					}
				}
			}

			// Recruiters should see pending draft (submitted profile) if available, else live data
			if (role === 'Recruiter') {
				if (pendingData && pendingData.profile_data) {
					// Recruiter views the submitted/approved pending draft
					const mappedData = {
						...parsedStudentData,
						draft: pendingData.profile_data || {},
					}
					setCurrentDraft(pendingData)
					setStudent(mappedData)
					setEditData(mappedData)
					updateOriginalData(mappedData)
				} else {
					// No pending draft, show live data
					setStudent(parsedStudentData)
					setEditData(parsedStudentData)
					updateOriginalData(parsedStudentData)
				}
				clearStorage()
				setHasDraft(false)
				SetUpdateQA(!updateQA)
				return
			}

			// For staff/admin review, prioritize pending draft
			const reviewDraft = pendingData || draftData

			if (reviewDraft && reviewDraft.profile_data) {
				setCurrentDraft(reviewDraft)
				setHasDraft(true)

				// Merge parsed base data with review draft data
				const mappedData = {
					...parsedStudentData,
					draft: reviewDraft.profile_data || {},
				}

				setStudent(mappedData)
				setEditData(mappedData)
				// Update the original data reference for change detection
				updateOriginalData(mappedData)

				// Clear any stale localStorage data that might exist
				clearStorage()
			} else {
				// If no draft exists, use parsed data
				setStudent(parsedStudentData)
				setEditData(parsedStudentData)
				// Update the original data reference for change detection
				updateOriginalData(parsedStudentData)

				// Clear any stale localStorage data that might exist
				clearStorage()
				setHasDraft(false)
			}

			SetUpdateQA(!updateQA)
		} catch (error) {
			showAlert(t('errorFetchingStudent'), 'error')
		}
	}

	const fetchDraft = async (studentData = null) => {
		try {
			const studentIdToUse = studentData?.student_id || student?.student_id || id
			const response = await axios.get(`/api/draft/student/${studentIdToUse}`)

			if (response.data && response.data.draft) {
				setHasDraft(true)
				const draft = response.data.draft

				if (draft.status === 'checking' || draft.status === 'approved') {
					// Status is checking or approved
				} else {
					// Status is not checking or approved
				}

				setCurrentDraft(draft)

				setEditData(prevEditData => {
					const updatedEditData = {
						...prevEditData,
						draft: {
							...prevEditData.draft,
							...(draft.profile_data || {}),
						},
					}
					return updatedEditData
				})

				SetUpdateQA(!updateQA)
			} else {
				setHasDraft(false)
			}
		} catch (error) {
			setHasDraft(false)
		}
	}

	const mapData = data => {
		const draftKeys = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'other_information', 'it_skills', 'skills', 'address', 'address_furigana', 'postal_code', 'jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'qa', 'education', 'work_experience', 'licenses', 'arubaito']
		return {
			...data,
			draft: draftKeys.reduce((acc, key) => {
				try {
					// For certificate fields, parse JSON and extract highest value
					if (key === 'jlpt' || key === 'jdu_japanese_certification') {
						acc[key] = getJLPTData(data[key]).highest
					} else if (key === 'japanese_speech_contest' || key === 'it_contest') {
						acc[key] = getCertificateData(data[key]).highest
					} else {
						acc[key] = data[key] || ''
					}
				} catch (error) {
					acc[key] = data[key] || ''
				}
				return acc
			}, {}),
		}
	}
	const [warningModal, setWarningModal] = useState({ open: false, message: '' })

	const handleSubmitDraft = async () => {
		try {
			if (!currentDraft || !currentDraft.id) {
				showAlert(t('noDraftToSubmit'), 'error')
				return
			}

			// ✅ NEW: Validate Personal Information (required fields)
			console.log('=== TOP PAGE SUBMIT: Validating Personal Information ===')
			const profileData = currentDraft?.profile_data || editData?.draft || {}
			const missingPersonalInfo = []

			// Check required personal information fields
			if (!student?.first_name || String(student.first_name).trim() === '') {
				missingPersonalInfo.push('名（First Name）')
			}
			if (!student?.first_name_furigana || String(student.first_name_furigana).trim() === '') {
				missingPersonalInfo.push('名のフリガナ（First Name Furigana）')
			}
			if (!student?.last_name || String(student.last_name).trim() === '') {
				missingPersonalInfo.push('姓（Last Name）')
			}
			if (!student?.last_name_furigana || String(student.last_name_furigana).trim() === '') {
				missingPersonalInfo.push('姓のフリガナ（Last Name Furigana）')
			}

			if (missingPersonalInfo.length > 0) {
				setWarningModal({
					open: true,
					message: `個人情報に必要な情報を入力してください。\n未入力: ${missingPersonalInfo.join('、')}`,
				})
				setConfirmMode(false)
				return
			}

			// ✅ NEW: Validate Self Introduction (required)
			console.log('=== TOP PAGE SUBMIT: Validating Self Introduction ===')
			const selfIntroduction = profileData.self_introduction || editData?.draft?.self_introduction || ''
			console.log('Detected self_introduction:', selfIntroduction)
			if (!selfIntroduction || String(selfIntroduction).trim() === '') {
				setWarningModal({
					open: true,
					message: '自己紹介を入力してください。',
				})
				setConfirmMode(false)
				return
			}

			// ✅ NEW: Validate Origin (required)
			// Note: The field is stored as 'address' in the database/profileData
			console.log('=== TOP PAGE SUBMIT: Validating Origin ===')
			const origin = profileData.address || editData?.draft?.address || student?.address || ''
			console.log('Detected origin/address:', origin)
			if (!origin || String(origin).trim() === '') {
				setWarningModal({
					open: true,
					message: '出身情報を入力してください。',
				})
				setConfirmMode(false)
				return
			}

			// ✅ CRITICAL FIX: Validate and save Q&A data BEFORE submitting
			// This ensures backend validation sees the latest Q&A structure
			try {
				console.log('=== TOP PAGE SUBMIT: Validating Q&A ===')

				// Fetch latest Q&A settings from admin
				const questionsResponse = await axios.get('/api/settings/studentQA')
				const latestQuestions = JSON.parse(questionsResponse.data.value)
				console.log('Latest Q&A questions:', latestQuestions)

				// Get current Q&A data from draft
				const currentQA = editData?.draft?.qa || currentDraft?.profile_data?.qa || {}
				console.log('Current Q&A data:', currentQA)

				// Merge current answers with latest question structure
				const updatedQA = {}
				for (const category in latestQuestions) {
					if (category === 'idList') continue
					updatedQA[category] = {}

					for (const key in latestQuestions[category]) {
						const settingsQuestion = latestQuestions[category][key]
						const existingAnswer = currentQA[category]?.[key]

						// Preserve existing answer or create empty entry for new question
						updatedQA[category][key] = {
							answer: existingAnswer?.answer || '',
						}
					}
				}

				// Validate: check all required questions have answers
				const missing = []
				for (const category in latestQuestions) {
					if (category === 'idList') continue
					const settingsQuestions = latestQuestions[category] || {}
					const studentAnswers = updatedQA[category] || {}

					for (const key in settingsQuestions) {
						const settingsQuestion = settingsQuestions[key]
						if (settingsQuestion && settingsQuestion.required === true) {
							const answer = studentAnswers[key]?.answer || ''
							if (!answer || String(answer).trim() === '') {
								missing.push({
									category,
									key,
									question: settingsQuestion.question || key,
								})
							}
						}
					}
				}

				console.log('Missing required Q&A answers:', missing)

				if (missing.length > 0) {
					// Group missing questions by category for better error message
					const missingByCategory = {}
					missing.forEach(item => {
						if (!missingByCategory[item.category]) {
							missingByCategory[item.category] = []
						}
						missingByCategory[item.category].push(item.question)
					})

					// Build user-friendly error message showing categories
					const categoryList = Object.keys(missingByCategory)
						.map(cat => `「${cat}」`)
						.join('、')

					// Validation failed - show error with category names
					setWarningModal({
						open: true,
						message: `必須の質問に回答してください。\n未回答のカテゴリ: ${categoryList}\n（未回答: ${missing.length}件）`,
					})
					setConfirmMode(false)
					return
				}

				// Save updated Q&A structure to draft before submitting
				// ⚠️ CRITICAL: Merge QA with editData.draft to preserve all other changes
				console.log('Saving updated Q&A to draft...')
				const draftData = {
					student_id: student?.student_id || id,
					profile_data: {
						...editData.draft, // Include ALL current edits (address, hobbies, etc.)
						qa: updatedQA, // Update QA
					},
				}

				console.log('Draft data being saved:', draftData)
				const saveResponse = await axios.put(`/api/draft`, draftData)
				console.log('Draft saved successfully:', saveResponse.data)
			} catch (qaError) {
				console.error('Error validating/saving Q&A:', qaError)
				setWarningModal({
					open: true,
					message: t('errorSavingDraft') || 'Failed to validate Q&A data',
				})
				setConfirmMode(false)
				return
			}

			// Now submit the draft (validation and save complete)
			console.log('Submitting draft...')
			const response = await axios.put(`/api/draft/${currentDraft.id}/submit`, {})
			if (response.status === 200) {
				showAlert(t('draftSubmittedSuccessfully'), 'success')
				setCurrentDraft({
					...currentDraft,
					status: 'submitted',
					submit_count: (currentDraft.submit_count || 0) + 1,
				})
				if (role === 'Student') {
					fetchDraftData()
				} else {
					fetchDraft()
				}
			}
		} catch (error) {
			const status = error?.response?.status
			const serverMsg = error?.response?.data?.error
			// Always prefer server's error message as it's more specific
			if (serverMsg) {
				setWarningModal({ open: true, message: serverMsg })
			} else if (status === 400) {
				// Fallback for 400 errors without server message
				setWarningModal({
					open: true,
					message: t('pleaseAnswerRequired') || 'Required questions are missing.',
				})
			} else {
				setWarningModal({
					open: true,
					message: t('errorSubmittingDraft') || 'Error submitting draft',
				})
			}
		} finally {
			setConfirmMode(false)
		}
	}

	const setTopEditMode = val => {
		setEditMode(val)
	}

	const setDraft = draft => {
		setCurrentDraft(draft)
		setEditData(prevEditData => {
			const updatedEditData = {
				...prevEditData,
				draft: draft.profile_data,
			}
			setStudent(updatedEditData)
			return updatedEditData
		})
		SetUpdateQA(!updateQA)
	}

	// Callback function to update currentDraft from child components
	// clearChangedFields: if true, also clears the changed_fields array (used after approval/rejection)
	const updateCurrentDraft = (newStatus, clearChangedFields = false) => {
		setCurrentDraft(prevDraft => ({
			...prevDraft,
			status: newStatus,
			...(clearChangedFields ? { changed_fields: [] } : {}),
		}))
		// Also update currentPending if it exists (for staff view consistency)
		if (clearChangedFields) {
			setCurrentPending(prevPending => (prevPending ? { ...prevPending, status: newStatus, changed_fields: [] } : null))
		}
	}

	const handleUpdateEditData = (key, value) => {
		setEditData(prevEditData => {
			const updatedData = {
				...prevEditData,
				draft: {
					...prevEditData.draft,
					[key]: value,
				},
			}
			return updatedData
		})
	}
	// Auto-save effect with change detection
	useEffect(() => {
		if (editMode && role === 'Student' && editData?.draft && student) {
			const hasChanges = hasChangesFromOriginal(editData)

			if (hasChanges) {
				saveToStorageIfChanged(editData)
				setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: true }))
			} else {
				setSaveStatus(prev => ({ ...prev, hasUnsavedChanges: false }))
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editData, editMode, role, student])

	// Handle Live/Draft view switching for students
	useEffect(() => {
		if (role === 'Student' && !editMode && liveData) {
			if (viewingLive) {
				// Switch to Live view - use live data in draft property for consistent access pattern
				setStudent({
					...liveData,
					draft: liveData, // Point draft to live data so rendering code works
				})
			} else {
				// Switch to Draft view
				const mappedData = {
					...liveData,
					draft: currentDraft?.profile_data || {},
				}
				setStudent(mappedData)
			}
		}
	}, [viewingLive, role, editMode, liveData, currentDraft])

	// Clear navigation flags on unmount
	useEffect(() => {
		return () => {
			// Clean up flags when component unmounts
			localStorage.removeItem('isNavigatingAfterSave')
		}
	}, [])

	// ✅ Helper functions for description management
	const handleHobbiesDescriptionUpdate = value => {
		handleUpdateEditData('hobbies_description', value)
	}

	const handleSpecialSkillsDescriptionUpdate = value => {
		handleUpdateEditData('special_skills_description', value)
	}

	// ✅ Helper functions for tag management
	const parseTagsFromString = str => {
		if (!str) return []
		// Split by common delimiters and filter empty values
		return str
			.split(/[,、。・]/g)
			.map(tag => tag.trim())
			.filter(tag => tag.length > 0)
	}

	const handleAddHobby = () => {
		if (!hobbiesInput.trim()) return

		const currentHobbies = parseTagsFromString(editData.draft.hobbies || '')
		const newHobbies = [...currentHobbies, hobbiesInput.trim()]
		handleUpdateEditData('hobbies', newHobbies.join('、'))
		setHobbiesInput('')
		setShowHobbiesInput(false) // Hide input after saving
	}

	const handleRemoveHobby = indexToRemove => {
		const currentHobbies = parseTagsFromString(editData.draft.hobbies || '')
		const updatedHobbies = currentHobbies.filter((_, index) => index !== indexToRemove)
		handleUpdateEditData('hobbies', updatedHobbies.join('、'))
	}

	const handleAddSpecialSkill = () => {
		if (!specialSkillsInput.trim()) return

		const currentSkills = parseTagsFromString(editData.draft.other_information || '')
		const newSkills = [...currentSkills, specialSkillsInput.trim()]
		handleUpdateEditData('other_information', newSkills.join('、'))
		setSpecialSkillsInput('')
		setShowSpecialSkillsInput(false) // Hide input after saving
	}

	const handleRemoveSpecialSkill = indexToRemove => {
		const currentSkills = parseTagsFromString(editData.draft.other_information || '')
		const updatedSkills = currentSkills.filter((_, index) => index !== indexToRemove)
		handleUpdateEditData('other_information', updatedSkills.join('、'))
	}

	// New functions to show input fields
	const showAddHobbyInput = () => {
		setShowHobbiesInput(true)
		setHobbiesInput('')
	}

	const showAddSpecialSkillInput = () => {
		setShowSpecialSkillsInput(true)
		setSpecialSkillsInput('')
	}

	const cancelAddHobby = () => {
		setShowHobbiesInput(false)
		setHobbiesInput('')
	}

	const cancelAddSpecialSkill = () => {
		setShowSpecialSkillsInput(false)
		setSpecialSkillsInput('')
	}

	const handleQAUpdate = value => {
		setEditData(prevEditData => {
			const updatedEditData = {
				...prevEditData,
				draft: {
					...prevEditData.draft,
					qa: value,
				},
			}
			setStudent(updatedEditData)
			return updatedEditData
		})
	}

	const handleImageUpload = (activeDeliverable, file) => {
		setDeliverableImages(prevImages => ({
			...prevImages,
			[activeDeliverable]: file,
		}))
	}

	// Simple save function
	const handleSave = async () => {
		try {
			const formData = getValues()
			await handleDraftUpsert(formData)
			reset(formData)
			setHasUnsavedChanges(false)
			showAlert(t('changes_saved'), 'success')
		} catch (error) {
			showAlert(t('errorSavingChanges'), 'error')
		}
	}

	const handleDraftUpsert = async (formData = editData) => {
		try {
			// First, upload gallery images if any
			if (newImages.length > 0) {
				const formData = new FormData()
				newImages.forEach(file => {
					formData.append('files', file) // Use 'files' for multiple uploads
				})
				formData.append('imageType', 'Gallery')
				formData.append('id', id)
				deletedUrls.forEach((url, index) => {
					formData.append(`oldFilePath[${index}]`, url)
				})

				const fileResponse = await axios.post('/api/files/upload-multiple', formData, {
					headers: { 'Content-Type': 'multipart/form-data' },
				})

				let oldFiles = editData.draft.gallery || []
				if (Array.isArray(fileResponse.data)) {
					fileResponse.data.forEach(file => {
						oldFiles.push(file.file_url) // Updated to use file_url from new API response
					})
				}
				await handleUpdateEditData('gallery', oldFiles)
			}

			// Upload deliverable images
			const updatedDeliverables = [...(editData.draft.deliverables || [])]

			for (const [index, file] of Object.entries(deliverableImages)) {
				if (file) {
					const deliverableFormData = new FormData()
					deliverableFormData.append('role', role)
					deliverableFormData.append('file', file)
					deliverableFormData.append('imageType', 'Deliverable')
					deliverableFormData.append('id', id)

					// Get existing image URL to replace
					const existingImageUrl = updatedDeliverables[index]?.imageLink || ''
					if (existingImageUrl && !existingImageUrl.startsWith('blob:')) {
						deliverableFormData.append('oldFilePath', existingImageUrl)
					}

					try {
						const deliverableFileResponse = await axios.post('/api/files/upload', deliverableFormData, { headers: { 'Content-Type': 'multipart/form-data' } })

						if (deliverableFileResponse.data.Location) {
							// Make sure we have a deliverable at this index
							if (!updatedDeliverables[index]) {
								updatedDeliverables[index] = {
									title: '',
									description: '',
									link: '',
									role: [],
									codeLink: '',
									imageLink: '',
								}
							}
							updatedDeliverables[index].imageLink = deliverableFileResponse.data.Location
						}
					} catch (imageUploadError) {
						console.error('Error uploading image for deliverable:', imageUploadError)
					}
				}
			}

			// Update the deliverables in editData
			await handleUpdateEditData('deliverables', updatedDeliverables)

			const studentIdToUse = student.student_id || id
			console.log('tahsimlab olinayotgan editData:', editData)

			const draftData = {
				student_id: studentIdToUse,
				profile_data: {
					...editData.draft,
					deliverables: updatedDeliverables,
				},
			}

			// Always use PUT for upsert approach (backend uses PUT method)
			console.log('yuborilayotgan editdata:', draftData)

			const res = await axios.put(`/api/draft`, draftData)
			console.log(res.data)

			const savedDraft = res.data.draft || res.data
			setCurrentDraft(savedDraft)
			setHasDraft(true)

			// Update student data with new deliverables
			const updatedStudent = {
				...editData,
				draft: {
					...editData.draft,
					deliverables: updatedDeliverables,
				},
			}

			// For staff editing pending, also update currentPending
			if (role === 'Staff' || role === 'Admin') {
				setCurrentPending(savedDraft)
			}

			setStudent(updatedStudent)
			setEditData(updatedStudent)

			// Clear temporary data
			setNewImages([])
			setDeletedUrls([])
			setDeliverableImages({})
			setResetDeliverablePreviews(prev => !prev) // Trigger reset
			setEditMode(false)
			// Clear persisted data after successful save and update original data reference
			if (role === 'Student') {
				clearStorage()
				setSaveStatus({
					isSaving: false,
					lastSaved: null,
					hasUnsavedChanges: false,
				})
				// Update the original data reference to the newly saved data
				updateOriginalData(updatedStudent)
			}
			showAlert(t('changesSavedSuccessfully'), 'success')
		} catch (error) {
			showAlert(t('errorSavingChanges'), 'error')
		}
	}

	const toggleConfirmMode = () => {
		setConfirmMode(prev => !prev)
	}
	// Fetch language skills from API
	const fetchLanguageSkills = async () => {
		try {
			const response = await axios.get(`/api/skills/`)
			setFilteredLanguageSkills(response.data)
		} catch (error) {
			console.error('Error fetching language skills:', error)
		}
	}

	if (isLoading) {
		return <div>{t('loading')}</div>
	}

	if (!student) {
		return <div>{t('noDataFound')}</div>
	}

	const portalContent = (
		<Box className={styles.buttonsContainer}>
			{role === 'Student' && viewingLive && (
				<>
					<Button
						variant='contained'
						size='small'
						onClick={async () => {
							try {
								downloadCV(student)
							} catch (err) {
								console.log(err)
								// alert('Failed to fetch CV data. Check console for details.')
							}
						}}
						sx={{ display: 'flex', gap: 1, whiteSpace: 'nowrap' }}
					>
						<DownloadIcon />
						{t('download_cv')}
					</Button>
					{currentPending?.status === 'approved' && currentPending?.updated_at && getTimeBadge(currentPending.updated_at)}
				</>
			)}
			{editMode ? (
				<>
					<Button onClick={handleDraftUpsert} variant='contained' color='primary' size='small'>
						{t('updateDraft')}
					</Button>
					<Button onClick={handleCancel} variant='outlined' color='error' size='small'>
						{t('cancel')}
					</Button>
				</>
			) : (
				<>
					{!(role === 'Student' && viewingLive) && (
						<>
							<Button
								onClick={() => {
									// Clear any stale localStorage before entering edit mode
									clearStorage()
									setEditMode(true)
									// Clear any old save status when entering edit mode
									if (role === 'Student' || role === 'Recruiter') {
										setSaveStatus({
											isSaving: false,
											lastSaved: null,
											hasUnsavedChanges: false,
										})
									}
								}}
								variant='contained'
								color='primary'
								size='small'
							>
								{t('editProfile')}
							</Button>
							{/* Show time badge for Staff/Admin viewing student profile - show LIVE profile update time (when approved) */}
							{(role === 'Staff' || role === 'Admin') && currentPending?.status === 'approved' && currentPending?.updated_at && getTimeBadge(currentPending.updated_at)}
						</>
					)}

					{role === 'Student' && hasDraft && currentDraft && !viewingLive && (
						<>
							<Button onClick={toggleConfirmMode} variant='contained' color='success' size='small' sx={{ ml: 1 }}>
								{t('submitAgree')}
							</Button>
							{currentDraft?.updated_at && getTimeBadge(currentDraft.updated_at)}
						</>
					)}
				</>
			)}
		</Box>
	)

	// ✅ Safe partner university name with null check
	const partnerUniversityName = student.partner_university || 'Partner University'

	const creditMap = {
		JDU: student.japanese_employment_credits,
		'University of World Languages': student.world_language_university_credits,
		[partnerUniversityName]: student.partner_university_credits,
	}
	return (
		<Box mb={2}>
			{/* Portal edit buttons for both Students and Staff — render null when not portaling so Box never receives non-ReactNode */}
			{portalContainer && (role === 'Student' || role === 'Staff' || role === 'Admin') ? createPortal(portalContent, portalContainer) : null}

			{/* Live/Draft Toggle for Students — use ternary so Box never receives boolean false */}
			{role === 'Student' && !editMode && liveData ? (
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						borderRadius: '8px',
						padding: '8px',
						margin: '16px',
						gap: '16px',
					}}
				>
					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
						<Button
							onClick={() => setViewingLive(true)}
							variant={viewingLive ? 'contained' : 'outlined'}
							size='small'
							sx={{
								minWidth: '120px',
								backgroundColor: viewingLive ? '#5627DB' : 'transparent',
								color: viewingLive ? '#fff' : '#5627DB',
								borderColor: '#5627DB',
								'&:hover': {
									backgroundColor: viewingLive ? '#4520A6' : 'rgba(86, 39, 219, 0.1)',
								},
							}}
						>
							{t('liveProfile') || '公開版'}
						</Button>
					</Box>
					<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
						<Button
							onClick={() => setViewingLive(false)}
							variant={!viewingLive ? 'contained' : 'outlined'}
							size='small'
							sx={{
								minWidth: '120px',
								backgroundColor: !viewingLive ? '#5627DB' : 'transparent',
								color: !viewingLive ? '#fff' : '#5627DB',
								borderColor: '#5627DB',
								'&:hover': {
									backgroundColor: !viewingLive ? '#4520A6' : 'rgba(86, 39, 219, 0.1)',
								},
							}}
						>
							{t('draftProfile') || '編集版'}
						</Button>
					</Box>
				</Box>
			) : null}

			<div
				style={{
					borderTop: '1px solid #e1e1e1',
					backgroundColor: '#ffffff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'start',
					padding: '20px 16px',
					gap: 32,
					borderEndEndRadius: 10,
					borderEndStartRadius: 10,
				}}
			>
				{['selfIntroduction', 'skill', 'deliverables', 'education', 'work_experience', 'qa'].map((item, ind) => (
					<div
						key={ind}
						style={{
							fontWeight: 500,
							fontSize: 16,
							color: subTabIndex === item ? '#5627db' : '#4b4b4b',
							borderBottom: subTabIndex === item ? '2px solid #5627db' : '#4b4b4b',
							cursor: 'pointer',
						}}
						onClick={() => {
							setSubTabIndex(item)
						}}
					>
						{t(item)}
					</div>
				))}
			</div>

			{/* Staff Comment Display Section for Students - show feedback from pending draft */}
			{role === 'Student' && subTabIndex === 'selfIntroduction' && currentPending && currentPending.comments && (currentPending.status === 'resubmission_required' || currentPending.status === 'disapproved') ? (
				<Box
					sx={{
						my: 2,
						mx: 2,
						p: 2,
						backgroundColor: '#fff3e0',
						border: '1px solid #ff9800',
						borderRadius: '8px',
						borderLeft: '4px solid #ff9800',
					}}
				>
					<Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
						<span style={{ fontWeight: 'bold', color: '#e65100' }}>{t('staffFeedbackTitle') || 'スタッフからのフィードバック'}</span>
					</Box>
					<Box
						sx={{
							backgroundColor: '#ffffff',
							p: 2,
							borderRadius: '4px',
							border: '1px solid #ffcc80',
						}}
					>
						<pre
							style={{
								whiteSpace: 'pre-wrap',
								wordWrap: 'break-word',
								fontFamily: 'inherit',
								margin: 0,
								color: '#424242',
							}}
						>
							{currentPending.comments}
						</pre>
					</Box>
					<Box sx={{ mt: 1, fontSize: '0.9em', color: '#666' }}>{t('staffFeedbackHint') || 'プロフィールを修正して再度提出してください。'}</Box>
				</Box>
			) : null}

			{/* Past staff comment history block (Student sees own, Staff sees target student's) */}
			{(role === 'Student' || role === 'Staff') && subTabIndex === 'selfIntroduction' ? <HistoryComments targetStudentId={role === 'Student' ? null : studentId} /> : null}

			{/* self introduction */}
			{subTabIndex === 'selfIntroduction' ? (
				<Box my={2}>
					<TextField title={t('selfIntroduction')} data={student.draft.self_introduction} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='self_introduction' parentKey='draft' icon={BadgeOutlinedIcon} imageUrl={student.photo} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('self_introduction')} maxLength={1000} showCounter stackOnSmall />
					{/* New Design for Hobbies and Special Skills */}
					<div className={styles.twoCol} style={{ marginTop: 25, alignItems: 'flex-start' }}>
						{/* Hobbies Section */}
						<div
							className={styles.hobbiesSpaced}
							style={{
								flex: 1,
								backgroundColor: role === 'Staff' && (currentDraft?.changed_fields?.includes('hobbies') || currentDraft?.changed_fields?.includes('hobbies_description')) ? '#fff3cd' : '#ffffff',
								padding: 20,
								borderRadius: 10,
								border: role === 'Staff' && (currentDraft?.changed_fields?.includes('hobbies') || currentDraft?.changed_fields?.includes('hobbies_description')) ? '2px solid #ffc107' : '1px solid #e1e1e1',
								position: 'relative',
							}}
						>
							{role === 'Staff' && (currentDraft?.changed_fields?.includes('hobbies') || currentDraft?.changed_fields?.includes('hobbies_description')) && (
								<div
									style={{
										position: 'absolute',
										top: 8,
										right: 8,
										backgroundColor: '#ffc107',
										color: '#000',
										padding: '2px 8px',
										borderRadius: '4px',
										fontSize: '12px',
										fontWeight: 600,
									}}
								>
									{t('changed') || 'Changed'}
								</div>
							)}
							<div
								style={{
									fontSize: 20,
									fontWeight: 600,
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									marginBottom: 15,
									color: '#5627DB',
								}}
							>
								<FavoriteBorderTwoToneIcon sx={{ color: '#5627DB' }} />
								{t('hobbies')}
							</div>

							{editMode ? (
								<>
									{/* Description Input */}
									<div style={{ marginBottom: 20 }}>
										<div style={{ marginBottom: 8, color: '#666', fontSize: 14 }}>{t('hobbiesDetailDescription')}</div>
										<MuiTextField
											fullWidth
											multiline
											rows={3}
											placeholder={t('hobbiesDescriptionPlaceholder')}
											value={editData.draft.hobbies_description || ''}
											onChange={e => handleHobbiesDescriptionUpdate(e.target.value)}
											sx={{
												'& .MuiOutlinedInput-root': {
													borderRadius: 2,
												},
											}}
										/>
									</div>

									{/* Tag Creation Section */}
									<div style={{ marginBottom: 20 }}>
										<div style={{ marginBottom: 10, color: '#666', fontSize: 14 }}>{t('hobbiesTags')}</div>
										{!showHobbiesInput ? (
											<Button
												onClick={showAddHobbyInput}
												startIcon={<AddIcon />}
												sx={{
													color: '#5627DB',
													borderColor: '#5627DB',
													'&:hover': {
														backgroundColor: '#5627DB',
														color: 'white',
													},
												}}
												variant='outlined'
												size='small'
											>
												{t('addTag')}
											</Button>
										) : (
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													gap: 10,
												}}
											>
												<MuiTextField
													fullWidth
													size='small'
													placeholder={t('hobbiesTagPlaceholder')}
													value={hobbiesInput}
													onChange={e => setHobbiesInput(e.target.value)}
													onKeyPress={e => {
														if (e.key === 'Enter') {
															handleAddHobby()
														}
													}}
													sx={{
														'& .MuiOutlinedInput-root': {
															borderRadius: 2,
														},
													}}
												/>
												<div style={{ display: 'flex', gap: 10 }}>
													<Button
														onClick={handleAddHobby}
														variant='contained'
														size='small'
														sx={{
															backgroundColor: '#5627DB',
															'&:hover': {
																backgroundColor: '#4520A6',
															},
														}}
														disabled={!hobbiesInput.trim()}
													>
														{t('save')}
													</Button>
													<Button
														onClick={cancelAddHobby}
														variant='outlined'
														size='small'
														sx={{
															color: '#666',
															borderColor: '#666',
														}}
													>
														{t('cancel')}
													</Button>
												</div>
											</div>
										)}

										<div
											style={{
												marginTop: 15,
												display: 'flex',
												gap: 8,
												flexWrap: 'wrap',
											}}
										>
											{parseTagsFromString(editData.draft.hobbies || '').map((hobby, index) => (
												<Chip
													key={index}
													label={hobby}
													onDelete={() => handleRemoveHobby(index)}
													deleteIcon={<CloseIcon />}
													size='small'
													sx={{
														backgroundColor: '#5627DB',
														color: 'white',
														'& .MuiChip-deleteIcon': {
															color: 'white',
														},
													}}
												/>
											))}
										</div>
									</div>
								</>
							) : (
								<>
									<div style={{ marginBottom: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{editData.draft.hobbies_description || student.draft.hobbies || t('notEntered')}</div>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										{parseTagsFromString(student.draft.hobbies || '').map((hobby, index) => (
											<Chip
												key={index}
												label={hobby}
												size='small'
												sx={{
													backgroundColor: '#5627DB',
													color: 'white',
												}}
											/>
										))}
									</div>
								</>
							)}
						</div>

						{/* Special Skills Section */}
						<div
							className={styles.tokuchoSpaced}
							style={{
								flex: 1,
								backgroundColor: role === 'Staff' && (currentDraft?.changed_fields?.includes('special_skills') || currentDraft?.changed_fields?.includes('special_skills_description')) ? '#fff3cd' : '#ffffff',
								padding: 20,
								borderRadius: 10,
								border: role === 'Staff' && (currentDraft?.changed_fields?.includes('special_skills') || currentDraft?.changed_fields?.includes('special_skills_description')) ? '2px solid #ffc107' : '1px solid #e1e1e1',
								position: 'relative',
							}}
						>
							{role === 'Staff' && (currentDraft?.changed_fields?.includes('special_skills') || currentDraft?.changed_fields?.includes('special_skills_description')) && (
								<div
									style={{
										position: 'absolute',
										top: 8,
										right: 8,
										backgroundColor: '#ffc107',
										color: '#000',
										padding: '2px 8px',
										borderRadius: '4px',
										fontSize: '12px',
										fontWeight: 600,
									}}
								>
									{t('changed') || 'Changed'}
								</div>
							)}
							<div
								style={{
									fontSize: 20,
									fontWeight: 600,
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									marginBottom: 15,
									color: '#5627DB',
								}}
							>
								<ElectricBoltIcon sx={{ color: '#5627DB' }} />
								{t('specialSkills')}
							</div>

							{editMode ? (
								<>
									{/* Description Input */}
									<div style={{ marginBottom: 20 }}>
										<div style={{ marginBottom: 8, color: '#666', fontSize: 14 }}>{t('specialSkillsDetailDescription')}</div>
										<MuiTextField
											fullWidth
											multiline
											rows={3}
											placeholder={t('specialSkillsDescriptionPlaceholder')}
											value={editData.draft.special_skills_description || ''}
											onChange={e => handleSpecialSkillsDescriptionUpdate(e.target.value)}
											sx={{
												'& .MuiOutlinedInput-root': {
													borderRadius: 2,
												},
											}}
										/>
									</div>

									{/* Tag Creation Section */}
									<div style={{ marginBottom: 20 }}>
										<div style={{ marginBottom: 10, color: '#666', fontSize: 14 }}>{t('specialSkillsTags')}</div>
										{!showSpecialSkillsInput ? (
											<Button
												onClick={showAddSpecialSkillInput}
												startIcon={<AddIcon />}
												sx={{
													color: '#5627DB',
													borderColor: '#5627DB',
													'&:hover': {
														backgroundColor: '#5627DB',
														color: 'white',
													},
												}}
												variant='outlined'
												size='small'
											>
												{t('addTag')}
											</Button>
										) : (
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													gap: 10,
												}}
											>
												<MuiTextField
													fullWidth
													size='small'
													placeholder={t('specialSkillsTagPlaceholder')}
													value={specialSkillsInput}
													onChange={e => setSpecialSkillsInput(e.target.value)}
													onKeyPress={e => {
														if (e.key === 'Enter') {
															handleAddSpecialSkill()
														}
													}}
													sx={{
														'& .MuiOutlinedInput-root': {
															borderRadius: 2,
														},
													}}
												/>
												<div style={{ display: 'flex', gap: 10 }}>
													<Button
														onClick={handleAddSpecialSkill}
														variant='contained'
														size='small'
														sx={{
															backgroundColor: '#5627DB',
															'&:hover': {
																backgroundColor: '#4520A6',
															},
														}}
														disabled={!specialSkillsInput.trim()}
													>
														{t('save')}
													</Button>
													<Button
														onClick={cancelAddSpecialSkill}
														variant='outlined'
														size='small'
														sx={{
															color: '#666',
															borderColor: '#666',
														}}
													>
														{t('cancel')}
													</Button>
												</div>
											</div>
										)}

										<div
											style={{
												marginTop: 15,
												display: 'flex',
												gap: 8,
												flexWrap: 'wrap',
											}}
										>
											{parseTagsFromString(editData.draft.other_information || '').map((skill, index) => (
												<Chip
													key={index}
													label={skill}
													onDelete={() => handleRemoveSpecialSkill(index)}
													deleteIcon={<CloseIcon />}
													size='small'
													sx={{
														backgroundColor: '#5627DB',
														color: 'white',
														'& .MuiChip-deleteIcon': {
															color: 'white',
														},
													}}
												/>
											))}
										</div>
									</div>
								</>
							) : (
								<>
									<div style={{ marginBottom: 15, lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{editData.draft.special_skills_description || student.draft.other_information || t('notEntered')}</div>
									<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
										{parseTagsFromString(student.draft.other_information || '').map((skill, index) => (
											<Chip
												key={index}
												label={skill}
												size='small'
												sx={{
													backgroundColor: '#5627DB',
													color: 'white',
												}}
											/>
										))}
									</div>
								</>
							)}
						</div>
					</div>
					<div className={styles.twoCol} style={{ alignItems: 'flex-start' }}>
						<div style={{ flex: 1, minWidth: 280 }}>
							<TextField title={t('origin')} data={student.draft?.address} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='address' parentKey='draft' icon={LocationOnOutlinedIcon} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('address')} placeholder={t('originPlaceholder') || 'Uzbekistan'} />
						</div>
						<div style={{ flex: 1, minWidth: 280 }}>
							<TextField title={t('address_furigana')} data={student.draft?.address_furigana || student.address_furigana} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='address_furigana' parentKey='draft' icon={LocationOnOutlinedIcon} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('address_furigana')} placeholder={t('addressFuriganaPlaceholder') || 'ウズファイスト'} />
						</div>
						<div style={{ flex: 1, minWidth: 280 }}>
							<TextField title={t('major')} data={student.draft?.major} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='major' parentKey='draft' icon={SchoolOutlinedIcon} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('major')} />
						</div>
						<div style={{ flex: 1, minWidth: 280 }}>
							<TextField title={t('jobType')} data={student.draft?.job_type} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='job_type' parentKey='draft' icon={BusinessCenterOutlinedIcon} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('job_type')} />
						</div>
					</div>
				</Box>
			) : null}
			{/* skills */}
			{subTabIndex === 'skill' ? (
				<Box my={2}>
					<div className={styles.gridBox}>
						<SkillSelector
							title={t('itSkills')}
							headers={{
								上級: t('threeYearsOrMore'),
								中級: t('lessThanThreeYears'),
								初級: t('oneToOneAndHalfYears'),
							}}
							data={student.draft}
							editData={editData}
							editMode={editMode}
							updateEditData={handleUpdateEditData}
							showAutocomplete={true}
							keyName='it_skills'
							parentKey='draft'
							icon={<CodeIcon sx={{ color: '#5627DB' }} />}
							isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('it_skills')}
						/>
						<div
							style={{
								padding: '20px',
								backgroundColor: '#ffffff',
								borderRadius: '12px',
								boxShadow: '0 2px 12px rgba(0, 0, 0, 0.05)',
								// maxHeight removed to avoid forcing equal heights
							}}
						>
							<div
								style={{
									fontSize: 20,
									fontWeight: 600,
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									marginBottom: 20,
								}}
							>
								<WorkspacePremiumOutlinedIcon sx={{ color: '#5627DB' }} />
								{t('Qualifications')}
							</div>

							<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
								{/* JLPT */}
								<div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
									<span style={{ minWidth: 160, fontWeight: 500 }}>JLPT:</span>
									<span
										style={{
											padding: '6px 20px',
											fontWeight: 500,
											fontSize: 14,
											border: '1px solid #e0e0e0',
											borderRadius: 6,
											background: editMode ? '#f5f5f5' : '#fff',
											color: editMode ? '#666' : '#000',
											cursor: editMode ? 'not-allowed' : 'default',
										}}
										title={editMode ? 'この情報はKintoneから管理されています' : ''}
									>
										{(() => {
											const jlptData = editData.draft.jlpt ? getJLPTData(editData.draft.jlpt).highest : getJLPTData(student.jlpt).highest
											return jlptData || t('none')
										})()}
									</span>
								</div>

								{/* JDU Certification */}
								<div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
									<span style={{ minWidth: 160, fontWeight: 500 }}>{t('jdu_certification')}:</span>
									<span
										style={{
											padding: '6px 20px',
											fontWeight: 500,
											fontSize: 14,
											border: '1px solid #e0e0e0',
											borderRadius: 6,
											background: editMode ? '#f5f5f5' : '#fff',
											color: editMode ? '#666' : '#000',
											cursor: editMode ? 'not-allowed' : 'default',
										}}
										title={editMode ? 'この情報はKintoneから管理されています' : ''}
									>
										{(() => {
											const jduData = editData.draft.jdu_japanese_certification ? getJLPTData(editData.draft.jdu_japanese_certification).highest : getJLPTData(student.jdu_japanese_certification).highest
											return jduData || t('none')
										})()}
									</span>
								</div>

								{/* Japanese Speech Contest */}
								<div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
									<span style={{ minWidth: 160, fontWeight: 500 }}>{t('japaneseSpeechContest')}:</span>
									<span
										style={{
											padding: '6px 20px',
											fontWeight: 500,
											fontSize: 14,
											border: '1px solid #e0e0e0',
											borderRadius: 6,
											background: editMode ? '#f5f5f5' : '#fff',
											color: editMode ? '#666' : '#000',
											cursor: editMode ? 'not-allowed' : 'default',
										}}
										title={editMode ? 'この情報はKintoneから管理されています' : ''}
									>
										{(() => {
											const speechData = editData.draft.japanese_speech_contest ? getCertificateData(editData.draft.japanese_speech_contest).highest : getCertificateData(student.japanese_speech_contest).highest
											return speechData || t('none')
										})()}
									</span>
									<span style={{ marginLeft: 8 }}>{t('rank')}</span>
								</div>

								{/* IT Contest */}
								<div style={{ display: 'flex', alignItems: 'center', height: 36 }}>
									<span style={{ minWidth: 160, fontWeight: 500 }}>{t('itContest')}:</span>
									<span
										style={{
											padding: '6px 20px',
											fontWeight: 500,
											fontSize: 14,
											border: '1px solid #e0e0e0',
											borderRadius: 6,
											background: editMode ? '#f5f5f5' : '#fff',
											color: editMode ? '#666' : '#000',
											cursor: editMode ? 'not-allowed' : 'default',
										}}
										title={editMode ? 'この情報はKintoneから管理されています' : ''}
									>
										{(() => {
											const itData = editData.draft.it_contest ? getCertificateData(editData.draft.it_contest).highest : getCertificateData(student.it_contest).highest
											return itData || t('none')
										})()}
									</span>
									<span style={{ marginLeft: 8 }}>{t('rank')}</span>
								</div>
							</div>
						</div>

						<LanguageSkillSelector
							title={t('languageSkills')}
							headers={{
								上級: '3年間以上',
								中級: '1年間〜1年間半',
								初級: '基礎',
							}}
							data={student.draft}
							editMode={editMode}
							editData={editData}
							updateEditData={handleUpdateEditData}
							showAutocomplete={true}
							showHeaders={false}
							keyName='language_skills'
							parentKey='draft'
							icon={<ExtensionOutlinedIcon sx={{ color: '#5627DB' }} />}
							isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('language_skills')}
						/>

						<OtherSkillsSelector title={t('otherSkills')} data={student.draft} editData={editData} editMode={editMode} updateEditData={handleUpdateEditData} keyName='other_skills' parentKey='draft' icon={<ExtensionOutlinedIcon sx={{ color: '#5627DB' }} />} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('other_skills')} />

						<Licenses licenses={viewingLive ? liveData?.licenses || [] : editMode ? editData?.draft?.licenses || [] : currentDraft?.profile_data?.licenses || []} editMode={editMode} onUpdate={handleUpdateEditData} t={t} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('licenses')} />
					</div>
				</Box>
			) : null}
			{/* deliverables */}
			{subTabIndex === 'deliverables' ? (
				<Box my={2}>
					<Deliverables data={student?.draft?.deliverables || []} editMode={editMode} editData={editData?.draft || {}} updateEditData={handleUpdateEditData} onImageUpload={handleImageUpload} keyName='deliverables' resetPreviews={resetDeliverablePreviews} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('deliverables')} studentId={student?.student_id || id} />
				</Box>
			) : null}
			{subTabIndex === 'education' ? (
				<Box my={2}>
					<Education education={viewingLive ? liveData?.education || [] : editMode ? editData?.draft?.education || [] : currentDraft?.profile_data?.education || []} editMode={editMode} onUpdate={handleUpdateEditData} t={t} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('education')} />
				</Box>
			) : null}
			{subTabIndex === 'work_experience' ? (
				<Box my={2}>
					<WorkExperience workExperience={viewingLive ? liveData?.work_experience || [] : editMode ? editData?.draft?.work_experience || [] : currentDraft?.profile_data?.work_experience || []} editMode={editMode} onUpdate={handleUpdateEditData} t={t} editData={editData} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('work_experience')} />
					<Arubaito arubaito={viewingLive ? liveData?.arubaito || [] : editMode ? editData?.draft?.arubaito || [] : currentDraft?.profile_data?.arubaito || []} editMode={editMode} onUpdate={handleUpdateEditData} t={t} isChanged={role === 'Staff' && currentDraft?.changed_fields?.includes('arubaito')} />
				</Box>
			) : null}
			{/* Credits section is temporarily disabled */}
			{/* QA */}
			{subTabIndex === 'qa' ? (
				<Box my={2}>
					{/* Debug */}
					{/* {console.log('=== TOP.JSX QA DEBUG ===')}
					{console.log('editData:', editData)}
					{console.log('editData.draft:', editData.draft)}
					{console.log('editData.draft.qa:', editData.draft?.qa)}
					{console.log('typeof qa:', typeof editData.draft?.qa)} */}
					<QA updateQA={updateQA} data={editData.draft?.qa || {}} currentDraft={currentDraft} handleQAUpdate={handleQAUpdate} isFromTopPage={true} topEditMode={editMode} handleDraftUpsert={handleDraftUpsert} isHonban={currentDraft && currentDraft.status === 'approved'} setTopEditMode={setTopEditMode} updateCurrentDraft={updateCurrentDraft} studentId={student?.student_id || id} />
				</Box>
			) : null}
			<ProfileConfirmDialog open={confirmMode} onClose={toggleConfirmMode} onConfirm={handleSubmitDraft} />

			{/* Auto-save indicator */}
			{editMode && role === 'Student' ? (
				<Snackbar open={saveStatus.isSaving || !!saveStatus.lastSaved} autoHideDuration={saveStatus.isSaving ? null : 2000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} onClose={() => setSaveStatus(prev => ({ ...prev, lastSaved: null }))}>
					<Alert severity='info' icon={saveStatus.isSaving ? <SaveIcon /> : <SaveIcon />} sx={{ alignItems: 'center' }}>
						{saveStatus.isSaving ? t('savingChanges') || 'Saving...' : t('changesSaved') || 'Changes saved'}
						{saveStatus.isSaving ? <LinearProgress color='inherit' sx={{ ml: 2, width: 100 }} /> : null}
					</Alert>
				</Snackbar>
			) : null}

			{/* Recovery dialog */}
			<Dialog open={showRecoveryDialog} onClose={() => setShowRecoveryDialog(false)}>
				<DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<RestoreIcon color='info' />
					{t('recoverUnsavedChanges') || 'Recover Unsaved Changes?'}
				</DialogTitle>
				<DialogContent>
					<Typography>{t('unsavedChangesFound') || 'We found unsaved changes from your previous editing session. Would you like to restore them?'}</Typography>
					{persistedData.timestamp && (
						<Typography variant='caption' color='text.secondary' sx={{ mt: 1, display: 'block' }}>
							{t('lastModified') || 'Last modified'}: {new Date(persistedData.timestamp).toLocaleString()}
						</Typography>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={handleDiscardRecovery} color='error'>
						{t('discard') || 'Discard'}
					</Button>
					<Button onClick={handleRecoverData} variant='contained' startIcon={<RestoreIcon />}>
						{t('restore') || 'Restore'}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Unsaved changes warning */}
			<Dialog
				open={showUnsavedWarning}
				onClose={() => {
					setShowUnsavedWarning(false)
					if (pendingLanguageChange) {
						cancelLanguageChange()
					}
					if (pendingNavigation) {
						setPendingNavigation(null)
					}
				}}
			>
				<DialogTitle>{pendingLanguageChange ? t('unsavedChangesLanguageTitle') || 'Save changes before switching language?' : pendingNavigation ? t('unsavedChangesNavigationTitle') || 'Save changes before leaving?' : t('unsavedChangesTitle') || 'Unsaved Changes'}</DialogTitle>
				<DialogContent>
					<Typography>{pendingLanguageChange ? t('unsavedChangesLanguageMessage') || 'You have unsaved changes. Would you like to save them before changing the language?' : pendingNavigation ? t('unsavedChangesNavigationMessage') || 'You have unsaved changes. Would you like to save them before leaving this page?' : t('unsavedChangesMessage') || 'You have unsaved changes. Are you sure you want to discard them?'}</Typography>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() => {
							setShowUnsavedWarning(false)
							if (pendingLanguageChange) {
								cancelLanguageChange()
							}
							if (pendingNavigation) {
								setPendingNavigation(null)
							}
						}}
					>
						{t('continueEditing') || 'Continue Editing'}
					</Button>
					{pendingLanguageChange ? (
						<>
							<Button
								onClick={() => {
									// Discard changes and switch language
									setEditData(student)
									setEditMode(false)
									clearStorage()
									setShowUnsavedWarning(false)
									confirmLanguageChange()
								}}
								color='error'
							>
								{t('discardAndSwitch') || 'Discard & Switch'}
							</Button>
							<Button onClick={handleConfirmCancel} variant='contained' color='primary'>
								{t('saveAndSwitch') || 'Save & Switch'}
							</Button>
						</>
					) : pendingNavigation ? (
						<>
							<Button onClick={handleConfirmCancel} color='error'>
								{t('discardAndLeave') || 'Discard & Leave'}
							</Button>
							<Button onClick={handleSaveAndNavigate} variant='contained' color='primary'>
								{t('saveAndLeave') || 'Save & Leave'}
							</Button>
						</>
					) : (
						<Button onClick={handleConfirmCancel} color='error' variant='contained'>
							{t('discardChanges') || 'Discard Changes'}
						</Button>
					)}
				</DialogActions>
			</Dialog>

			{/* Submit warning modal (e.g., missing required QA answers) */}
			<Dialog open={warningModal.open} onClose={() => setWarningModal({ open: false, message: '' })} aria-labelledby='submit-warning-title' aria-describedby='submit-warning-desc'>
				<DialogTitle id='submit-warning-title'>{t('warning') || 'Warning'}</DialogTitle>
				<DialogContent>
					<DialogContentText id='submit-warning-desc'>{warningModal.message}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setWarningModal({ open: false, message: '' })} color='primary' autoFocus>
						{t('ok')}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

// --- Helper component: Student's past staff comment history (from notifications) ---
function HistoryComments({ targetStudentId }) {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const [items, setItems] = useState([])
	const [loaded, setLoaded] = useState(false)

	useEffect(() => {
		let mounted = true
		;(async () => {
			try {
				const url = targetStudentId ? `/api/notification/history/student/${encodeURIComponent(targetStudentId)}` : '/api/notification/history'
				const res = await axios.get(url)
				const list = res?.data?.notifications || []
				const filtered = list.filter(n => typeof n.message === 'string' && n.message.includes('|||COMMENT_SEPARATOR|||')).slice(0, 2)
				if (mounted) setItems(filtered)
			} catch (e) {
				// ignore
			} finally {
				if (mounted) setLoaded(true)
			}
		})()
		return () => {
			mounted = false
		}
	}, [targetStudentId])

	if (!loaded || items.length === 0) return null

	return (
		<Box
			sx={{
				my: 2,
				mx: 2,
				p: 2,
				backgroundColor: '#f7f7f7',
				borderRadius: '8px',
				border: '1px solid #e0e0e0',
			}}
		>
			<Typography sx={{ fontWeight: 600, mb: 1 }}>{t('pastStaffComments') || '過去のスタッフコメント'}</Typography>
			{items.map((n, idx) => {
				const parts = n.message.split('|||COMMENT_SEPARATOR|||')
				const commentRaw = parts[1] || ''
				const comment = (() => {
					const lines = String(commentRaw).split('\n')
					return lines.length > 1 ? lines.slice(1).join('\n').trim() : commentRaw.trim()
				})()
				return (
					<Box
						key={n.id || idx}
						sx={{
							p: 1.5,
							mb: 1,
							backgroundColor: '#fff',
							borderRadius: '6px',
							border: '1px solid #eee',
						}}
					>
						<Typography sx={{ whiteSpace: 'pre-wrap' }}>{comment}</Typography>
						<Typography variant='caption' color='text.secondary'>
							{new Date(n.createdAt).toLocaleString()}
						</Typography>
					</Box>
				)
			})}
		</Box>
	)
}

export default Top

HistoryComments.propTypes = {
	targetStudentId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}
