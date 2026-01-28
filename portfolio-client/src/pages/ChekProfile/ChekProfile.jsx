import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Filter from '../../components/Filter/Filter'
import Table from '../../components/Table/Table'

import { useAlert } from '../../contexts/AlertContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { UserContext } from '../../contexts/UserContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'

const Student = ({ OnlyBookmarked = false }) => {
	const { language } = useLanguage()
	const { role } = useContext(UserContext)
	const t = key => translations[language][key] || key
	const [filterState, setFilterState] = useState({
		search: '',
		reviewerId: null, // Track active reviewer filter
	})
	const [warningModal, setWarningModal] = useState({
		open: false,
		message: '',
	})

	const showAlert = useAlert()

	const [updatedBookmark, setUpdatedBookmark] = useState({
		studentId: null,
		timestamp: new Date().getTime(),
	})
	const userId = JSON.parse(sessionStorage.getItem('loginUser')).id

	const [itSkillOptions, setItSkillOptions] = useState(['JS', 'Python', 'Java', 'SQL'])
	const [languageSkillOptions, setLanguageSkillOptions] = useState([])

	useEffect(() => {
		let cancelled = false
		const fetchItSkills = async () => {
			try {
				const res = await axios.get('/api/itskills')
				if (!cancelled) {
					const names = Array.isArray(res.data) ? res.data.map(s => s.name).filter(Boolean) : []
					if (names.length > 0) setItSkillOptions(names)
				}
			} catch {
				// fallback silently
			}
		}
		fetchItSkills()
		return () => {
			cancelled = true
		}
	}, [])

	useEffect(() => {
		let cancelled = false
		const fetchLanguageSkills = async () => {
			try {
				const res = await axios.get('/api/skills')
				if (!cancelled) {
					const names = Array.isArray(res.data) ? res.data.map(s => s.name).filter(Boolean) : []
					if (names.length > 0) setLanguageSkillOptions(names)
				}
			} catch {
				// fallback silently
			}
		}
		fetchLanguageSkills()
		return () => {
			cancelled = true
		}
	}, [])

	const filterProps = [
		//{
		//  key: "semester",
		//  label: t("grade"), // Переводится
		//  type: "checkbox",
		//  options: [t("grade1"), t("grade2"), t("grade3"), t("grade4")],
		//  minWidth: "120px",
		//},
		{
			key: 'it_skills',
			label: t('programming_languages'),
			type: 'checkbox',
			options: itSkillOptions,
			matchModeKey: 'it_skills_match',
			minWidth: '160px',
		},
		{
			key: 'language_skills',
			label: t('language_skills') || 'Language Skills',
			type: 'checkbox',
			options: languageSkillOptions,
			matchModeKey: 'language_skills_match',
			minWidth: '160px',
		},
		{
			key: 'jlpt',
			label: t('jlpt'),
			type: 'checkbox',
			options: ['N1', 'N2', 'N3', 'N4', 'N5'],
			minWidth: '160px',
		},
		{
			key: 'jdu_japanese_certification',
			label: t('jdu_certification'),
			type: 'checkbox',
			options: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
			minWidth: '160px',
		},
		//{
		//  key: "partner_university_credits",
		//  label: t("credits"),
		//  type: "radio",
		//  options: ["20", "40", "60", "80", "100"],
		//  unit: t("credits_unit"),
		//  minWidth: "160px",
		//},
		{
			key: 'partner_university',
			label: t('partner_university'),
			type: 'checkbox',
			options: [t('tokyo_communication_university'), t('kyoto_tachibana_university'), t('sanno_university'), t('sanno_junior_college'), t('niigata_sangyo_university'), t('otemae_university'), t('okayama_university_of_science')],
			minWidth: '160px',
		},
		{
			key: 'other_information',
			label: t('special_skills'),
			type: 'radio',
			options: [t('yes'), t('no')],
			minWidth: '160px',
		},
		{
			key: 'approval_status',
			label: t('approvalStatus'),
			type: 'checkbox',
			options: [t('approval_status_unconfirmed'), t('approval_status_in_review'), t('approval_status_returned'), t('approval_status_approved')],
			minWidth: '160px',
		},
		{
			key: 'visibility',
			label: t('visible_status'),
			type: 'checkbox',
			options: [t('visible'), t('invisible')],
			minWidth: '160px',
		},
	]

	const handleFilterChange = newFilterState => {
		setFilterState(newFilterState)
	}

	const handleReviewerClick = reviewerId => {
		// Toggle filter: if same reviewer clicked, deactivate filter; otherwise activate
		setFilterState(prev => ({
			...prev,
			reviewerId: prev.reviewerId === reviewerId ? null : reviewerId,
		}))
	}

	const navigate = useNavigate()

	const navigateToProfile = (student, currentPage, currentSortBy, currentSortOrder) => {
		navigate(`profile/${student.student_id}/top`, {
			state: {
				student,
				fromPage: currentPage || 0,
				sortBy: currentSortBy || '',
				sortOrder: currentSortOrder || '',
				returnPath: '/checkprofile',
			},
		})
	}

	const updateDraftStatus = async (draftId, status) => {
		const res = await axios.put(`/api/draft/status/${draftId}`, {
			status: status,
			reviewed_by: userId,
		})
		if (res.status == 200) {
			showAlert(t['profileConfirmed'], 'success')
			return true
		} else {
			return false
		}
	}

	// New function to update draft status with comments
	const updateDraftStatusWithComments = async (draftId, status, comments = '') => {
		try {
			const res = await axios.put(`/api/draft/status/${draftId}`, {
				status: status,
				reviewed_by: userId,
				comments: comments,
			})
			if (res.status === 200) {
				showAlert(t('statusUpdatedSuccessfully'), 'success')
				return true
			} else {
				return false
			}
		} catch (error) {
			showAlert(t('errorUpdatingStatus'), 'error')
			return false
		}
	}

	const setProfileVisibility = async (studentId, visibility) => {
		try {
			if (visibility) {
				const draftsResponse = await axios.get(`/api/draft/student/${studentId}`)

				// Check pendingDraft status instead of draft, as approvals happen on pending versions
				if (draftsResponse.data && draftsResponse.data.pendingDraft && draftsResponse.data.pendingDraft.status === 'approved') {
					const profileData = draftsResponse.data.pendingDraft.profile_data || {}

					// Use studentId (student_id) for API calls
					const res = await axios.put(`/api/students/${studentId}`, {
						...profileData,
						visibility: true,
					})

					// Check if response contains warning
					if (res.data && res.data.warning && res.data.requiresStaffApproval) {
						setWarningModal({
							open: true,
							message: t(res.data.message) || t('studentNotApprovedByStaff'),
						})
						return false
					}

					if (res.status === 200) {
						showAlert(t['profileVisibilityEnabled'], 'success')
						return true
					} else {
						return false
					}
				} else {
					// Use studentId (student_id) for API calls
					const res = await axios.put(`/api/students/${studentId}`, {
						visibility: true,
					})

					// Check if response contains warning
					if (res.data && res.data.warning && res.data.requiresStaffApproval) {
						setWarningModal({
							open: true,
							message: t(res.data.message) || t('studentNotApprovedByStaff'),
						})
						return false
					}

					if (res.status === 200) {
						showAlert(t['profileVisibilityEnabled'], 'success')
						return true
					} else {
						return false
					}
				}
			} else {
				// For visibility=false, we don't need to get additional data
				// since we already have studentId parameter

				// Use studentId (student_id) for API calls
				const res = await axios.put(`/api/students/${studentId}`, {
					visibility: false,
				})

				if (res.status === 200) {
					showAlert(t['profileHidden'], 'success')
					return true
				} else {
					return false
				}
			}
		} catch (error) {
			showAlert(t['errorSettingVisibility'] || 'Error setting visibility', 'error')
			return false
		}
	}

	const headers = [
		{
			id: 'first_name',
			numeric: false,
			disablePadding: true,
			label: '学生',
			type: 'avatar',
			minWidth: '220px',
			onClickAction: navigateToProfile,
			isSort: true,
		},
		{
			id: 'student_id',
			numeric: false,
			disablePadding: false,
			label: '学籍番号',
			minWidth: '120px',
			isSort: true,
		},
		{
			id: 'age',
			numeric: true,
			disablePadding: false,
			label: '年齢',
			minWidth: '80px !important',
			suffix: ' 歳',
			isSort: true,
		},
		{
			id: 'draft',
			subkey: 'updated_at',
			numeric: true,
			type: 'date',
			disablePadding: false,
			label: '申請日',
			minWidth: '120px',
		},
		{
			id: 'draft',
			subkey: 'submit_count',
			numeric: true,
			disablePadding: false,
			label: '申請回数',
			minWidth: '100px',
		},
		{
			id: 'draft',
			subkey: 'changed_fields',
			type: 'changed_fields',
			numeric: false,
			disablePadding: false,
			label: '変更項目',
			minWidth: '120px',
		},
		{
			id: 'draft',
			subkey: 'status',
			type: 'status_icon',
			numeric: false,
			disablePadding: false,
			label: '承認状況',
			minWidth: '100px',
			statusMap: {
				submitted: { icon: 'pending', color: '#ff9800', text: t('approval_status_unconfirmed') },
				checking: { icon: 'pending', color: '#2196f3', text: t('approval_status_in_review') },
				resubmission_required: {
					icon: 'rejected',
					color: '#f44336',
					text: t('approval_status_returned'),
				},
				disapproved: {
					icon: 'rejected',
					color: '#f44336',
					text: t('approval_status_returned'),
				},
				approved: { icon: 'approved', color: '#4caf50', text: t('approval_status_approved') },
			},
			onReviewerClick: handleReviewerClick,
		},
		{
			id: 'visibility',
			keyIdentifier: 'visibility_toggle',
			numeric: false,
			type: 'visibility_toggle',
			disablePadding: false,
			label: '公開状況',
			minWidth: '100px',
			onToggle: (row, visibility) => setProfileVisibility(row.student_id, visibility),
			disabled: role !== 'Admin', // Only admins can toggle visibility
		},
		{
			id: 'email',
			numeric: false,
			type: 'email',
			disablePadding: false,
			label: 'メール',
			minWidth: '200px',
			isSort: true,
		},
	]

	const tableProps = {
		headers: headers,
		dataLink: '/api/draft',
		filter: filterState,
		recruiterId: userId,
		OnlyBookmarked: OnlyBookmarked,
		updateDraftStatusWithComments: updateDraftStatusWithComments,
		userRole: role,
	}

	return (
		<div key={language}>
			<Box sx={{ width: '100%', mb: 2 }}>
				<Filter fields={filterProps} filterState={filterState} onFilterChange={handleFilterChange} disableStudentIdSearch={true} persistKey='drafts-filter-v1' showCardFormatButton={false} />
			</Box>
			<Table tableProps={tableProps} updatedBookmark={updatedBookmark} />

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
		</div>
	)
}

export default Student
