/*
TODO: Student Resubmission and Staff Workflow Fixes
- [x] Fixed submit button logic: Students can now resubmit after rejection (承認依頼・同意 button appears)
- [x] Fixed start_checking button: Only appears for initial submission, disappears after clicking
- [x] Fixed TextField keyName conflicts: major and job_type fields now use proper unique keyNames
- [x] Added callback mechanism: QA component now updates parent currentDraft state
- [x] Simplified submit button condition: Focus on draft/resubmission_required status
- [x] Fixed handleConfirmProfile: Now updates parent currentDraft state to 'submitted' when student submits
- [x] Added passedDraft synchronization: passedDraft state now stays in sync with currentDraft changes
- [x] Added debug logging to track state changes and button visibility conditions
- [x] FIXED: Submit button visibility issue in Top.jsx - added resubmission_required status condition
- [x] FIXED: Comment input clearing - comment field now clears after staff approval/rejection
- [x] Test and verify submit button appears correctly after rejection
- [x] Verify IT skills section design is properly restored
- [x] FIXED: Profile visibility toggle 404 errors - improved ID determination logic to prioritize student_id over primary key
*/

import { useState, useEffect, useContext } from 'react'
import Cookies from 'js-cookie'
import ReactDOM from 'react-dom'
import { useLocation, useParams } from 'react-router-dom'
import styles from './QA.module.css'
import QATextField from '../../../components/QATextField/QATextField'
import QAAccordion from '../../../components/QAAccordion/QAAccordion'
import TextField from '../../../components/TextField/TextField'
import ProfileConfirmDialog from '../../../components/Dialogs/ProfileConfirmDialog'

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import {
	// School,
	// AutoStories,
	// Face,
	// WorkHistory,
	TrendingUp,
	DragIndicator,
} from '@mui/icons-material'
import axios from '../../../utils/axiosUtils'
import {
	Box,
	// Tabs,
	// Tab,
	Button,
	Snackbar,
	Alert,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Typography,
	// IconButton,
} from '@mui/material'

import translations from '../../../locales/translations'
import { UserContext } from '../../../contexts/UserContext'
import { useLanguage } from '../../../contexts/LanguageContext'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined'
import PermIdentityIcon from '@mui/icons-material/PermIdentity'
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined'

const qaQuestions = [
	{
		icon: SchoolOutlinedIcon,
		label: '学生成績',
		iconColor: '#3275f2',
	},
	{
		icon: AutoStoriesOutlinedIcon,
		label: '専門知識',
		iconColor: '#a551f5',
	},
	{
		icon: PermIdentityIcon,
		label: '個性',
		iconColor: '#0dae7a',
	},
	{
		icon: WorkOutlineOutlinedIcon,
		label: '実務経験',
		iconColor: '#5b59ec',
	},
	{
		icon: TrendingUp,
		label: 'キャリア目標',
		iconColor: '#e63c8c',
	},
]

const hasAnswerData = qaPayload => {
	if (!qaPayload || typeof qaPayload !== 'object') return false
	return Object.entries(qaPayload).some(([category, entries]) => {
		if (category === 'idList') return false
		if (!entries || typeof entries !== 'object') return false
		return Object.values(entries).some(item => typeof item?.answer === 'string' && item.answer.trim() !== '')
	})
}

// Sortable Item Component
const SortableQATextField = ({ id, data, editData, category, question, keyName, aEdit, qEdit, updateEditData, DeleteQA, isReorderMode }) => {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		position: 'relative',
		zIndex: isDragging ? 1000 : 'auto',
	}

	return (
		<div ref={setNodeRef} style={style}>
			<Box
				sx={{
					display: 'flex',
					alignItems: 'center',
					border: isReorderMode ? '2px dashed #1976d2' : 'none',
					borderRadius: isReorderMode ? 1 : 0,
					padding: isReorderMode ? 1 : 0,
					marginBottom: 1,
				}}
			>
				{isReorderMode && (
					<Box
						{...attributes}
						{...listeners}
						sx={{
							cursor: 'grab',
							padding: '8px',
							marginRight: '8px',
							backgroundColor: '#f5f5f5',
							borderRadius: '4px',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							minWidth: '32px',
							height: '32px',
							'&:active': {
								cursor: 'grabbing',
							},
							'&:hover': {
								backgroundColor: '#e0e0e0',
							},
						}}
					>
						<DragIndicator sx={{ color: '#666' }} />
					</Box>
				)}
				<Box sx={{ flex: 1 }}>
					<QATextField data={data} editData={editData} category={category} question={question} keyName={keyName} aEdit={aEdit && !isReorderMode} qEdit={qEdit && !isReorderMode} updateEditData={updateEditData} DeleteQA={DeleteQA} />
				</Box>
			</Box>
		</div>
	)
}

const QA = ({ data = {}, handleQAUpdate, isFromTopPage = false, topEditMode = false, updateQA = false, currentDraft, isHonban = false, handleDraftUpsert = () => {}, setTopEditMode = () => {}, updateCurrentDraft = () => {} }) => {
	// Prefer context role; fall back to cookie or sessionStorage for cold loads
	const { language, activeUser, role: contextRole, isInitializing } = useContext(UserContext)
	const role = contextRole || Cookies.get('userType') || sessionStorage.getItem('role') || null
	const labels = ['学生成績', '専門知識', '個性', '実務経験', 'キャリア目標']
	let id
	const { studentId } = useParams()
	const location = useLocation()
	const { userId } = location.state || {}

	const { language: langContext } = useLanguage()
	const t = key => translations[langContext][key] || key

	// Helper function to get student_id from login user data
	const getStudentIdFromLoginUser = () => {
		try {
			const loginUserData = JSON.parse(sessionStorage.getItem('loginUser'))
			// Prefer context activeUser when available; then session-backed loginUser
			return activeUser?.studentId || activeUser?.id || loginUserData?.studentId || loginUserData?.student_id || loginUserData?.id || null
		} catch (e) {
			return activeUser?.studentId || activeUser?.id || null
		}
	}

	// Determine which student_id to use
	if (role === 'Student') {
		// For students, try multiple sources
		id = getStudentIdFromLoginUser() || activeUser?.studentId || activeUser?.id
	} else if (studentId) {
		// For staff/admin, prefer studentId from URL params (this should be student_id)
		id = studentId
	} else {
		// Fallback: try to get student data from location.state if available
		const student = location.state?.student
		if (student && student.student_id) {
			id = student.student_id
		} else if (userId !== 0 && userId) {
			// Last resort: use userId prop (might be primary key, could cause issues)
			id = userId
		} else {
			// Don't log error for Admin on QA management page
			if (!(role === 'Admin' && window.location.pathname === '/student-qa')) {
			}
			id = null
		}
	}

	const [studentQA, setStudentQA] = useState(isFromTopPage && data ? data : null)
	const [editData, setEditData] = useState(isFromTopPage && data ? data : null)
	const [editMode, setEditMode] = useState(topEditMode)
	const [isFirstTime, setIsFirstTime] = useState(false)
	const [isDataLoaded, setIsDataLoaded] = useState(false)
	const [isSaving, setIsSaving] = useState(false)
	const [deleteConfirmation, setDeleteConfirmation] = useState({
		open: false,
		itemToDelete: null,
	})
	const [isReorderMode, setIsReorderMode] = useState(false)

	// DnD Kit sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	)

	const [confirmMode, setConfirmMode] = useState(false)
	const [comment, setComment] = useState({ comments: '' })
	const [reviewMode, setReviewMode] = useState(!currentDraft || Object.keys(currentDraft).length === 0)
	const [passedDraft, setPassedDraft] = useState(currentDraft)
	const [warningModal, setWarningModal] = useState({
		open: false,
		message: '',
	})

	// Staff approve/reject confirm dialog state
	const [staffConfirm, setStaffConfirm] = useState({
		open: false,
		action: null,
	})

	// Reviewer view: allow a single arrow to toggle all
	const isReviewer = ['Admin', 'Staff', 'Recruiter'].includes(role) && !!id
	const [allExpanded, setAllExpanded] = useState(true)

	// Debug logging to track state changes

	// Check submit button visibility condition
	const shouldShowSubmitButton = role === 'Student' && currentDraft && (currentDraft.status === 'draft' || currentDraft.status === 'resubmission_required')

	// Keep passedDraft synchronized with currentDraft changes
	useEffect(() => {
		setPassedDraft(currentDraft)
	}, [currentDraft])

	// Fallback: if reviewer and no currentDraft passed, fetch student's latest draft
	useEffect(() => {
		const shouldFetch = isReviewer && (!currentDraft || Object.keys(currentDraft || {}).length === 0) && id
		if (!shouldFetch) return
		;(async () => {
			try {
				const res = await axios.get(`/api/draft/student/${id}`)
				if (res?.data) {
					setPassedDraft(res.data)
					setReviewMode(false)
				}
			} catch (e) {
				// ignore silently
			}
		})()
	}, [isReviewer, id])

	const fetchStudent = async () => {
		// Prevent fetching if already loaded (only for non-student roles)
		if (isDataLoaded && role !== 'Student') return

		try {
			// Always fetch questions to get the latest admin-added questions
			const questionsResponse = await axios.get('/api/settings/studentQA')
			const questions = JSON.parse(questionsResponse.data.value)

			let answers = null

			// For Top page, use provided data as answers
			if (isFromTopPage && data && Object.keys(data).length > 0) {
				answers = data
			} else if (id) {
				// Otherwise fetch answers from API
				try {
					answers = (await axios.get(`/api/qa/student/${id}`)).data
				} catch (err) {}
			}

			if ((!answers || !hasAnswerData(answers)) && id) {
				const draftFallback = await getQaFromDraft(id)
				if (draftFallback) {
					answers = draftFallback
				}
			}

			let response
			if (id && answers) {
				// Student view with answers
				const combinedData = {}
				// Check if this is first time or has idList
				let firsttime = !answers.idList || Object.keys(answers.idList || {}).length === 0
				if (firsttime) {
					setIsFirstTime(true)
				}

				// Add idList if missing (for Top page data)
				if (!answers.idList) {
					answers.idList = {}
				}

				for (const category in questions) {
					if (category == 'idList') {
						combinedData[category] = answers[category] || {}
					} else {
						combinedData[category] = {}
						for (const key in questions[category]) {
							combinedData[category][key] = {
								question: questions[category][key].question || '',
								required: !!questions[category][key].required,
								answer: !answers[category] || !answers[category][key] ? '' : answers[category][key].answer || '',
							}
						}
					}
				}
				response = combinedData
			} else if (id) {
				// Student view without answers (first time)
				// Preserve required flags for first-time student
				response = { ...questions, idList: {} }
				setIsFirstTime(true)
			} else {
				// Admin view - just questions, no answers needed
				response = questions
			}

			setStudentQA(response)
			setEditData(response)
			setIsDataLoaded(true)
		} catch (error) {
			// Initialize with empty structure on error
			setStudentQA({ idList: {} })
			setEditData({ idList: {} })
			setIsDataLoaded(true)
		}
	}

	const getQaFromDraft = async studentIdToFetch => {
		try {
			const draftRes = await axios.get(`/api/draft/student/${studentIdToFetch}`)
			const payload = draftRes?.data
			if (!payload) return null

			const candidates = []

			if (role === 'Student') {
				if (payload.draft?.profile_data?.qa) candidates.push(payload.draft.profile_data.qa)
				if (payload.pendingDraft?.profile_data?.qa) candidates.push(payload.pendingDraft.profile_data.qa)
			} else {
				if (payload.pendingDraft?.profile_data?.qa) candidates.push(payload.pendingDraft.profile_data.qa)
				if (payload.draft?.profile_data?.qa) candidates.push(payload.draft.profile_data.qa)
			}

			return candidates.find(hasAnswerData) || candidates.find(candidate => candidate && Object.keys(candidate).length > 0) || null
		} catch (e) {
			return null
		}
	}

	useEffect(() => {
		// Wait for user context to initialize; avoids missing role/id on cold loads
		if (isInitializing) return
		if (role && (id || role === 'Admin')) {
			// Always fetch for students to get latest admin questions
			if (role === 'Student') {
				fetchStudent()
			} else {
				// For other roles, only fetch if not loaded
				if (!isDataLoaded) {
					fetchStudent()
				}
			}
		}
	}, [isInitializing, role, id, isFromTopPage])

	// Reset data loaded flag when updateQA changes
	useEffect(() => {
		if (updateQA) {
			setIsDataLoaded(false)
		}
	}, [updateQA])

	useEffect(() => {
		if (isFromTopPage && data && Object.keys(data).length > 0) {
			setEditData(data)
		}
	}, [updateQA])

	useEffect(() => {
		setEditMode(topEditMode)
	}, [topEditMode])

	const handleUpdate = (category, keyName, value, qa) => {
		setEditData(prevEditData => {
			const updatedEditData = { ...prevEditData }
			if (updatedEditData[category]) {
				updatedEditData[category] = {
					...updatedEditData[category],
					[keyName]: {
						...updatedEditData[category][keyName],
						[qa]: value,
					},
				}
			}

			// If called from Top page, update parent with the latest data
			if (isFromTopPage && handleQAUpdate) {
				// Use the updated data, not the stale editData
				handleQAUpdate(updatedEditData)
			}

			return updatedEditData
		})
	}

	const updateComment = (key, value) => {
		const next = { [key]: value }
		setComment(next)
		try {
			if (id) {
				localStorage.setItem(`qa_comment_draft_${id}`, JSON.stringify(next))
			}
		} catch (e) {}
	}

	// Restore saved comment draft when opening this student's QA
	useEffect(() => {
		try {
			if (id) {
				const saved = localStorage.getItem(`qa_comment_draft_${id}`)
				if (saved) {
					const parsed = JSON.parse(saved)
					if (parsed && typeof parsed.comments === 'string') {
						setComment(parsed)
					}
				}
			}
		} catch (e) {}
	}, [id])

	const toggleEditMode = () => {
		setEditMode(prev => !prev)
		setTopEditMode(!editMode)
	}
	const toggleConfirmMode = () => {
		setConfirmMode(prev => !prev)
	}

	const handleConfirmProfile = async () => {
		try {
			const res = await axios.put(`/api/draft/${currentDraft.id}/submit`)
			if (res.status == 200) {
				// Update parent's currentDraft state to 'submitted'
				updateCurrentDraft('submitted')
				showAlert(t('profileConfirmed'), 'success')
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
					message: t('errorConfirmingProfile') || '送信時にエラーが発生しました。',
				})
			}
		} finally {
			setConfirmMode(false)
		}
	}

	const approveProfile = async value => {
		try {
			const res = await axios.put(`/api/draft/status/${currentDraft.id}`, {
				status: value,
				comments: comment.comments,
			})

			// Update local draft status to reflect the change
			setPassedDraft(prevDraft => ({
				...prevDraft,
				status: value,
			}))
			// Update parent's currentDraft state
			updateCurrentDraft(value)
			// Clear comment input after successful submission
			setComment({ comments: '' })
			try {
				if (id) localStorage.removeItem(`qa_comment_draft_${id}`)
			} catch (e) {}
			if (value === 'approved') {
				showAlert(t('approvedSuccessfully') || '承認しました', 'success')
			} else if (value === 'resubmission_required') {
				showAlert(t('sentBackForRevision') || '差し戻しました', 'warning')
			} else {
				showAlert(t('profileConfirmed') || '更新しました', 'success')
			}
		} catch (error) {
			showAlert(t('errorConfirmingProfile') || 'エラーが発生しました', 'error')
		} finally {
			setConfirmMode(false)
			setStaffConfirm({ open: false, action: null })
		}
	}

	const setProfileVisible = async visibility => {
		try {
			const res = await axios.put(`/api/students/${id}`, {
				visibility: visibility,
			})

			// Check if response contains warning
			if (res.data && res.data.warning && res.data.requiresStaffApproval) {
				setWarningModal({
					open: true,
					message: t(res.data.message) || t('studentNotApprovedByStaff'),
				})
				return
			}

			showAlert(visibility ? t('profileVisibilityEnabled') : t('profileHidden'), 'success')
		} catch (error) {
			showAlert(t('errorConfirmingProfile'), 'error')
		} finally {
			setConfirmMode(false)
		}
	}

	const handleSave = async () => {
		if (isSaving) return // Prevent multiple simultaneous saves

		setIsSaving(true)
		try {
			if (role == 'Admin') {
				let questions = removeKey(editData, 'answer')

				const updatedValue = JSON.stringify(questions)

				await axios.put(`/api/settings/studentQA`, {
					value: updatedValue,
				})
				showAlert(t('changes_saved'), 'success')
				setEditMode(false)
				setTopEditMode(false)
			} else {
				let answers = removeKey(editData, 'question')

				let res
				if (isFirstTime) {
					const requestData = { studentId: id, data: answers }

					res = await axios.post('/api/qa/', requestData)
				} else {
					const updateData = { data: answers }

					res = await axios.put(`/api/qa/${id}`, updateData)
				}

				// Update local state with server response
				setStudentQA(res.data)

				// Set isFirstTime to false after successful save
				if (isFirstTime && res.data.idList) {
					setIsFirstTime(false)
				}

				// Sync editData with the latest server data
				const updatedEditData = { ...editData }

				// Update editData with the response data
				Object.keys(res.data).forEach(category => {
					if (category !== 'idList') {
						updatedEditData[category] = res.data[category]
					}
				})
				if (res.data.idList) {
					updatedEditData.idList = res.data.idList
				}

				setEditData(updatedEditData)

				// If called from Top page, update parent component
				if (isFromTopPage && handleQAUpdate) {
					handleQAUpdate(res.data)
				}

				setEditMode(false)
				setTopEditMode(false)
			}

			showAlert('Changes saved successfully!', 'success')
		} catch (error) {
			const errorMessage = error.response?.data?.message || error.response?.data?.error || "Q&A javoblarini saqlashda xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring."
			showAlert(errorMessage, 'error')
		} finally {
			setIsSaving(false)
		}
	}

	const handleCancel = () => {
		try {
			// Reset to last known good state
			setEditData(studentQA)
			setEditMode(false)
			setTopEditMode(false)

			// If called from Top page, sync with parent
			if (isFromTopPage && handleQAUpdate) {
				handleQAUpdate(studentQA)
			}

			showAlert(t('changes_cancelled'), 'info')
		} catch (error) {
			// Fallback: re-fetch from server
			fetchStudent()
			setEditMode(false)
			setTopEditMode(false)
		}
	}

	const handleAdd = async (isRequired = false) => {
		let keys = Object.keys(getCategoryData(subTabIndex))
		if (keys.length === 0) {
			// Start from q1 if there are no existing questions
			await setEditData(prevEditData => {
				const updatedEditData = { ...prevEditData }
				const category = labels[subTabIndex]
				if (!updatedEditData[category]) {
					updatedEditData[category] = {}
				}
				updatedEditData[category]['q1'] = {
					question: '',
					answer: '',
					required: !!isRequired,
				}
				return updatedEditData
			})
		} else {
			let lastKey = keys[keys.length - 1]
			let nextKeyNumber = parseInt(lastKey.slice(1)) + 1
			let nextKey = 'q' + nextKeyNumber

			await setEditData(prevEditData => {
				const updatedEditData = { ...prevEditData }
				const category = labels[subTabIndex]
				if (updatedEditData[category]) {
					updatedEditData[category] = {
						...updatedEditData[category],
						[nextKey]: {
							question: '',
							answer: '',
							required: !!isRequired,
						},
					}
				}
				return updatedEditData
			})
		}
	}

	// Drag & Drop functions
	const handleDragEnd = event => {
		const { active, over } = event

		if (!over || active.id === over.id) {
			return
		}

		setEditData(prevEditData => {
			const category = labels[subTabIndex]
			const categoryData = prevEditData[category] || {}
			const entries = Object.entries(categoryData)

			// Find the indices of the dragged items
			const activeIndex = entries.findIndex(([key]) => key === active.id)
			const overIndex = entries.findIndex(([key]) => key === over.id)

			if (activeIndex === -1 || overIndex === -1) {
				return prevEditData
			}

			// Reorder the entries but keep the original keys stable
			// so that student answers remain mapped correctly by key.
			const reorderedEntries = arrayMove(entries, activeIndex, overIndex)

			// Preserve keys; only change property order
			const reorderedData = {}
			reorderedEntries.forEach(([key, value]) => {
				reorderedData[key] = value
			})

			return {
				...prevEditData,
				[category]: reorderedData,
			}
		})
	}

	const toggleReorderMode = () => {
		setIsReorderMode(!isReorderMode)
	}

	const showDeleteConfirmation = indexToDelete => {
		setDeleteConfirmation({
			open: true,
			itemToDelete: indexToDelete,
		})
	}

	const handleDeleteConfirm = async () => {
		const indexToDelete = deleteConfirmation.itemToDelete
		setDeleteConfirmation({ open: false, itemToDelete: null })

		await handleDelete(indexToDelete)
	}

	const handleDeleteCancel = () => {
		setDeleteConfirmation({ open: false, itemToDelete: null })
	}

	const handleDelete = async indexToDelete => {
		try {
			// Optimistic update: immediately update local state
			setEditData(prevEditData => {
				const updatedEditData = { ...prevEditData }
				const category = labels[subTabIndex]

				if (updatedEditData[category] && updatedEditData[category][indexToDelete]) {
					delete updatedEditData[category][indexToDelete]
				}

				return updatedEditData
			})

			// If called from Top page, update parent immediately
			if (isFromTopPage && handleQAUpdate) {
				const updatedData = { ...editData }
				const category = labels[subTabIndex]
				if (updatedData[category] && updatedData[category][indexToDelete]) {
					delete updatedData[category][indexToDelete]
				}
				handleQAUpdate(updatedData)
			}

			showAlert(t('item_deleted_success'), 'success')
		} catch (error) {
			showAlert(t('error_deleting_item'), 'error')

			// Rollback optimistic update on error
			fetchStudent()
		}
	}

	const removeKey = (obj, excludeKey) => {
		const newObj = {}

		for (const key in obj) {
			if (key === 'idList') {
				newObj[key] = obj[key]
			} else if (typeof obj[key] === 'object' && obj[key] !== null) {
				newObj[key] = {}
				for (const subKey in obj[key]) {
					if (typeof obj[key][subKey] === 'object' && obj[key][subKey] !== null) {
						const { [excludeKey]: _, ...rest } = obj[key][subKey]
						newObj[key][subKey] = rest
					}
				}
			} else {
				newObj[key] = obj[key]
			}
		}

		return newObj
	}

	// const combineQuestionsAndAnswers = (questions, answers) => {
	// 	const combinedData = {}
	// 	// Check if answers exist and have idList
	// 	let firsttime = !answers || !answers.idList || Object.keys(answers.idList).length === 0
	// 	if (firsttime) {
	// 		setIsFirstTime(true)
	// 	}
	// 	for (const category in questions) {
	// 		if (category == 'idList') {
	// 			combinedData[category] = (answers && answers[category]) || {}
	// 		} else {
	// 			combinedData[category] = {}
	// 			for (const key in questions[category]) {
	// 				combinedData[category][key] = {
	// 					question: questions[category][key].question || '',
	// 					answer: firsttime
	// 						? ''
	// 						: !answers || !answers[category] || !answers[category][key]
	// 							? ''
	// 							: answers[category][key].answer || '',
	// 				}
	// 			}
	// 		}
	// 	}

	// 	return combinedData
	// }

	const [subTabIndex, setSubTabIndex] = useState(0)
	const [alert, setAlert] = useState({
		open: false,
		message: '',
		severity: '',
	})

	// const handleSubTabChange = (event, newIndex) => {
	// 	setSubTabIndex(newIndex)
	// }

	const showAlert = (message, severity) => {
		setAlert({ open: true, message, severity })
	}

	const handleCloseAlert = () => {
		setAlert({ open: false, message: '', severity: '' })
	}

	const getCategoryData = index => {
		const category = labels[index]
		return (editData && editData[category]) || {}
	}

	// --- Required (必須) validation helpers ---
	const collectMissingRequiredAnswers = () => {
		const missing = []
		labels.forEach(category => {
			const items = (editData && editData[category]) || {}
			for (const key in items) {
				const { question, answer, required } = items[key] || {}
				if (required === true) {
					if (!answer || String(answer).trim() === '') {
						missing.push({ category, key, question })
					}
				}
			}
		})
		return missing
	}

	const handleStudentSubmitClick = async () => {
		try {
			// ✅ FIX: Always fetch latest settings before validation
			// This ensures we check against current required flags, not stale cached ones
			const questionsResponse = await axios.get('/api/settings/studentQA')
			const latestQuestions = JSON.parse(questionsResponse.data.value)

			console.log('=== Q&A VALIDATION DEBUG ===')
			console.log('Latest questions from settings:', latestQuestions)
			console.log('Current editData:', editData)

			// Update editData with latest required flags from admin settings
			// Also ADD any new questions that admin added but don't exist in student's data yet
			const updatedEditData = { ...editData }
			for (const category in latestQuestions) {
				if (category === 'idList') continue

				// Ensure category exists in updatedEditData
				if (!updatedEditData[category]) {
					updatedEditData[category] = {}
				}

				for (const key in latestQuestions[category]) {
					if (updatedEditData[category][key]) {
						// Update existing question with latest required flag
						updatedEditData[category][key].required = !!latestQuestions[category][key].required
						updatedEditData[category][key].question = latestQuestions[category][key].question || updatedEditData[category][key].question
					} else {
						// ✅ ADD new question that doesn't exist in student's data yet
						updatedEditData[category][key] = {
							question: latestQuestions[category][key].question || '',
							required: !!latestQuestions[category][key].required,
							answer: '', // New question has no answer yet
						}
					}
				}
			}

			// ✅ CRITICAL FIX: Validate using LOCAL variable BEFORE state update
			// Don't rely on setState() which is async and may not complete before validation
			// ✅ IMPORTANT: Only validate questions that exist in SETTINGS (not old deleted questions)
			const missing = []
			for (const category in latestQuestions) {
				if (category === 'idList') continue

				const settingsQuestions = latestQuestions[category] || {}
				const studentAnswers = updatedEditData[category] || {}

				for (const key in settingsQuestions) {
					const settingsQuestion = settingsQuestions[key]
					const studentAnswer = studentAnswers[key]

					// Only check if question is required in CURRENT settings
					if (settingsQuestion && settingsQuestion.required === true) {
						const answer = studentAnswer?.answer || ''
						if (!answer || String(answer).trim() === '') {
							missing.push({
								category,
								key,
								question: settingsQuestion.question || studentAnswer?.question || key,
							})
						}
					}
				}
			}

			// Update state AFTER validation (for UI refresh)
			setEditData(updatedEditData)

			console.log('Updated editData:', updatedEditData)
			console.log('Missing required answers:', missing)
			console.log('=== END DEBUG ===')

			// Check validation results
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

				// Jump to the first category with missing answer to help the student
				const first = missing[0]
				const idx = labels.findIndex(l => l === first.category)
				if (idx >= 0) setSubTabIndex(idx)
				// Ensure student can edit to fill answers
				if (!editMode) setEditMode(true)
				setWarningModal({
					open: true,
					message: `必須の質問に回答してください。\n未回答のカテゴリ: ${categoryList}\n（未回答: ${missing.length}件）`,
				})
				return
			}

			// ✅ CRITICAL FIX: Save the updated Q&A data to draft BEFORE submitting
			// This ensures backend validation sees the latest data including new questions
			console.log('Saving updated Q&A data to draft before submission...')
			try {
				// Remove 'question' and 'required' fields - only save answers
				const answersOnly = {}
				for (const category in updatedEditData) {
					if (category === 'idList') continue
					answersOnly[category] = {}
					for (const key in updatedEditData[category]) {
						const item = updatedEditData[category][key]
						// Save just the answer value (backend expects this format)
						answersOnly[category][key] = {
							answer: item.answer || '',
						}
					}
				}

				// Update the draft with new Q&A data
				const draftData = {
					student_id: id,
					profile_data: {
						...currentDraft.profile_data,
						qa: answersOnly,
					},
				}

				console.log('Saving draft with Q&A data:', draftData)
				const saveResponse = await axios.put(`/api/draft`, draftData)
				console.log('Draft saved successfully:', saveResponse.data)
			} catch (saveError) {
				console.error('Error saving draft before submission:', saveError)
				showAlert(t('errorSavingDraft') || 'Failed to save draft', 'error')
				return
			}

			// Open confirmation dialog if all required answers provided
			toggleConfirmMode()
		} catch (error) {
			console.error('Error fetching latest Q&A settings:', error)
			// Fallback: proceed with current data if fetch fails
			const missing = collectMissingRequiredAnswers()
			if (missing.length > 0) {
				const first = missing[0]
				const idx = labels.findIndex(l => l === first.category)
				if (idx >= 0) setSubTabIndex(idx)
				if (!editMode) setEditMode(true)
				setWarningModal({
					open: true,
					message: `${t('pleaseAnswerRequired') || '必須の質問に回答してください'}（未回答: ${missing.length}）`,
				})
				return
			}
			toggleConfirmMode()
		}
	}

	// Debug logging to understand the state

	// While user context is initializing, show loading to avoid flashing errors
	if (isInitializing) {
		return <div>{t('loading')}</div>
	}

	// For Admin viewing QA management, we don't need an ID
	if (role === 'Admin' && !studentId && !userId) {
		// Admin can view/edit questions without a student ID
		if (!studentQA) {
			return <div>{t('loading_questions')}</div>
		}
	} else if (!studentQA) {
		// Still loading data
		return <div>{t('loading')}</div>
	} else if (!id && role === 'Student') {
		// Student needs an ID but doesn't have one
		return <div>Error: Student ID not found. Please log in again.</div>
	}

	// Debug logging

	// Don't render buttons if component is used from Top page
	const portalContent = !isFromTopPage ? (
		<Box className={styles.buttonsContainer}>
			{(role == 'Student' || role == 'Admin' || role == 'Staff') && (
				<>
					{editMode ? (
						<>
							{role == 'Admin' && (
								<>
									<Button onClick={() => handleAdd(true)} variant='contained' color='warning' size='small'>
										{t('add_required') || '必須追加'}
									</Button>
									<Button onClick={() => handleAdd(false)} variant='outlined' color='primary' size='small' sx={{ ml: 1 }}>
										{t('add_optional') || '任意追加'}
									</Button>
									<Button onClick={toggleReorderMode} variant={isReorderMode ? 'contained' : 'outlined'} color='info' size='small' sx={{ ml: 1 }}>
										{isReorderMode ? '順序確定' : '順序変更'}
									</Button>
								</>
							)}
							{!isHonban && (role == 'Student' || role == 'Staff') && (
								<Button onClick={() => handleDraftUpsert(true)} variant='contained' color='primary' size='small'>
									{t('updateDraft')}
								</Button>
							)}
							{role == 'Student' && id && (
								<Button onClick={() => handleDraftUpsert(false)} variant='contained' color='primary' size='small'>
									{t('saveDraft')}
								</Button>
							)}
							{role == 'Admin' && (
								<Button onClick={handleSave} variant='contained' color='primary' size='small' disabled={isSaving}>
									{isSaving ? 'Saving...' : t('save')}
								</Button>
							)}
							<Button onClick={handleCancel} variant='outlined' color='error' size='small'>
								{t('cancel')}
							</Button>
						</>
					) : (
						<>
							{role == 'Student' && currentDraft && (currentDraft.status === 'draft' || currentDraft.status === 'resubmission_required') && (
								<Button onClick={handleStudentSubmitClick} variant='contained' color='secondary' size='small'>
									{t('submitAgree')}
								</Button>
							)}
							<Button onClick={toggleEditMode} variant='contained' color='primary' size='small'>
								{role == 'Student' ? t('editProfile') : ''}
								{role == 'Admin' ? t('q_edit') : ''}
								{role == 'Staff' ? t('editProfile') : ''}
							</Button>
						</>
					)}
				</>
			)}
		</Box>
	) : null

	return (
		<Box mb={2}>
			{/* Only render save button container for Admin on QA management page */}
			{!id && role === 'Admin' && (
				<Box className={styles.topControlButtons} mb={2} px={2}>
					<Box id='saveButton'>{portalContent}</Box>
				</Box>
			)}

			{/* For other cases, use portal if saveButton exists and not from Top page */}
			{id && !isFromTopPage && portalContent && document.getElementById('saveButton') && ReactDOM.createPortal(portalContent, document.getElementById('saveButton'))}

			<div className={styles.categoriesRow}>
				{qaQuestions.map((item, ind) => (
					<div
						key={ind}
						className={styles.qaBox}
						style={{
							backgroundColor: subTabIndex === ind ? '#d8e1f0' : 'transparent',
						}}
						onClick={() => {
							setSubTabIndex(ind)
						}}
					>
						<div
							className={styles.iconBox}
							style={{
								backgroundColor: item.iconColor,
							}}
						>
							<item.icon style={{ color: '#FFFFFF', fontSize: 25 }} />
						</div>
						<div
							style={{
								fontSize: 14,
								color: subTabIndex === ind ? item.iconColor : 'inherit',
							}}
						>
							{item.label}
						</div>
					</div>
				))}
			</div>

			{/* <Tabs
				className={styles.Tabs}
				value={subTabIndex}
				onChange={handleSubTabChange}
			>
				<Tab icon={<School />} iconPosition='top' label='学生成績' />
				<Tab icon={<AutoStories />} iconPosition='top' label='専門知識' />
				<Tab icon={<Face />} iconPosition='top' label='個性' />
				<Tab icon={<WorkHistory />} iconPosition='top' label='実務経験' />
				<Tab icon={<TrendingUp />} iconPosition='top' label='キャリア目標' />
			</Tabs> */}

			<Box my={2}>
				{editMode && (
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
						<SortableContext items={Object.keys(getCategoryData(subTabIndex))} strategy={verticalListSortingStrategy}>
							{Object.entries(getCategoryData(subTabIndex)).map(([key, { question }]) => (
								<SortableQATextField key={key} id={key} data={studentQA} editData={editData} category={labels[subTabIndex]} question={question} keyName={key} aEdit={role == 'Admin'} qEdit={role == 'Student' || role == 'Staff'} updateEditData={handleUpdate} DeleteQA={showDeleteConfirmation} isReorderMode={isReorderMode && role === 'Admin'} />
							))}
						</SortableContext>
					</DndContext>
				)}
			</Box>

			<Box my={2} sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
				{!editMode &&
					(() => {
						const entries = Object.entries(getCategoryData(subTabIndex))
						const isViewerRole = ['Admin', 'Staff', 'Recruiter'].includes(role)
						const isAdminQA = role === 'Admin' && window.location.pathname === '/student-qa'

						// For viewer roles, only show answered questions
						// Admin on /student-qa should see all questions (template), even without answers
						const visibleEntries = isAdminQA ? entries : isViewerRole ? entries.filter(([, { answer }]) => answer && String(answer).trim() !== '') : entries

						const hasAnyAnswered = visibleEntries.length > 0
						// Decide which row shows the global toggle icon for reviewers
						const iconRowIdx = isReviewer && hasAnyAnswered ? 0 : -1

						return visibleEntries.map(([key, { question, answer }], idx) => {
							// Disable expansion if no student id (e.g., Top page preview)
							const disableExpand = !id
							const isIconRow = idx === iconRowIdx

							// Ensure question has a value (fallback to key if undefined)
							const questionText = question || key

							return <QAAccordion key={key} question={questionText} answer={answer ? answer : ''} notExpand={disableExpand} expanded={isReviewer && !disableExpand ? allExpanded : undefined} showExpandIcon={isReviewer ? isIconRow : !disableExpand} allowToggleWhenNotExpand={isReviewer && isIconRow && disableExpand} onToggle={isReviewer && isIconRow ? () => setAllExpanded(prev => !prev) : undefined} />
						})
					})()}
			</Box>

			<Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
				<Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
					{alert.message}
				</Alert>
			</Snackbar>
			{/* ---- CONFIRM DIALOG ---- */}
			<ProfileConfirmDialog open={confirmMode} onClose={toggleConfirmMode} onConfirm={handleConfirmProfile} />

			{/* ---- STAFF APPROVE/REJECT CONFIRM ---- */}
			<Dialog open={staffConfirm.open} onClose={() => setStaffConfirm({ open: false, action: null })}>
				<DialogTitle>{staffConfirm.action === 'approved' ? t('confirmApprove') || '承認しますか？' : t('confirmSendBack') || '差し戻しますか？'}</DialogTitle>
				<DialogContent>
					<DialogContentText>{staffConfirm.action === 'approved' ? t('confirmApproveDesc') || 'この操作は学生に「承認済」通知を送ります。続行しますか？' : t('confirmSendBackDesc') || 'この操作は学生に差し戻し通知をコメント付きで送ります。続行しますか？'}</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setStaffConfirm({ open: false, action: null })}>{t('cancel')}</Button>
					<Button variant='contained' color={staffConfirm.action === 'approved' ? 'primary' : 'warning'} onClick={() => approveProfile(staffConfirm.action)}>
						{t('ok')}
					</Button>
				</DialogActions>
			</Dialog>

			{/* ---- DELETE CONFIRMATION DIALOG ---- */}
			<Dialog open={deleteConfirmation.open} onClose={handleDeleteCancel} maxWidth='sm' fullWidth>
				<DialogTitle>{t('confirmDelete') || 'Confirm Delete'}</DialogTitle>
				<DialogContent>
					<Typography>{t('confirmDeleteMessage') || 'Are you sure you want to delete this Q&A item? This action cannot be undone.'}</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={handleDeleteCancel} color='primary'>
						{t('cancel') || 'Cancel'}
					</Button>
					<Button onClick={handleDeleteConfirm} color='error' variant='contained'>
						{t('delete') || 'Delete'}
					</Button>
				</DialogActions>
			</Dialog>
			{(role == 'Staff' || role == 'Admin') && !reviewMode && id && (
				<Box
					sx={{
						borderRadius: '10px',
						padding: 2,
					}}
				>
					{passedDraft && passedDraft.status != 'approved' ? (
						<>
							{/* Staff approval controls */}
							{role === 'Staff' && (
								<>
									<TextField title='コメント' data={comment?.comments || ''} editData={comment} editMode={true} updateEditData={updateComment} keyName='comments' maxLength={500} showCounter={true} />

									<Box
										sx={{
											display: 'flex',
											justifyContent: 'center',
											gap: 10,
										}}
									>
										<Button onClick={() => setStaffConfirm({ open: true, action: 'approved' })} variant='contained' color='primary' size='small'>
											承認する
										</Button>
										<Button
											onClick={() =>
												setStaffConfirm({
													open: true,
													action: 'resubmission_required',
												})
											}
											variant='contained'
											color='primary'
											size='small'
										>
											承認しない
										</Button>
									</Box>
								</>
							)}

							{/* Admin visibility controls */}
							{role === 'Admin' && (
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'center',
										gap: 10,
									}}
								>
									<Button onClick={() => setProfileVisible(false)} variant='contained' color='primary' size='small'>
										非公開
									</Button>
									<Button onClick={() => setProfileVisible(true)} variant='contained' color='primary' size='small'>
										公開
									</Button>
								</Box>
							)}
						</>
					) : (
						<>
							{/* Staff can reject after approval */}
							{role === 'Staff' && (
								<>
									<TextField title='差し戻しコメント' data={comment?.comments || ''} editData={comment} editMode={true} updateEditData={updateComment} keyName='comments' maxLength={500} showCounter={true} />
									<Box
										sx={{
											display: 'flex',
											justifyContent: 'center',
											gap: 10,
											mb: 2,
										}}
									>
										<Button
											onClick={() =>
												setStaffConfirm({
													open: true,
													action: 'resubmission_required',
												})
											}
											variant='contained'
											color='warning'
											size='small'
										>
											差し戻し
										</Button>
									</Box>
								</>
							)}

							{/* Admin visibility controls */}
							{role === 'Admin' && (
								<Box
									sx={{
										display: 'flex',
										justifyContent: 'center',
										gap: 10,
									}}
								>
									<Button onClick={() => setProfileVisible(false)} variant='contained' color='primary' size='small'>
										非公開
									</Button>
									<Button onClick={() => setProfileVisible(true)} variant='contained' color='primary' size='small'>
										公開
									</Button>
								</Box>
							)}
						</>
					)}
				</Box>
			)}

			{/* Warning Modal */}
			<Dialog open={warningModal.open} onClose={() => setWarningModal({ open: false, message: '' })} aria-labelledby='warning-dialog-title' aria-describedby='warning-dialog-description'>
				<DialogTitle id='warning-dialog-title'>{t('warning')}</DialogTitle>
				<DialogContent>
					<DialogContentText id='warning-dialog-description'>{warningModal.message}</DialogContentText>
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

export default QA
