import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined'
import EmailIcon from '@mui/icons-material/Email'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { Avatar, Box, Button, IconButton, Tooltip } from '@mui/material'
import { useAtom } from 'jotai'
import PropTypes from 'prop-types'
import { useContext, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { UserContext } from '../../../contexts/UserContext'
import translations from '../../../locales/translations'
import { formatGraduationMonth } from '../../../utils/formatGraduationMonth'
import { formatPartnerUniversity } from '../../../utils/formatPartnerUniversity'
import axios from '../../../utils/axiosUtils'
import styles from './StudentProfile.module.css'
import { checkprofileBackPageAtom, checkprofileSortByAtom, checkprofileSortOrderAtom, listReturnPathAtom, studentsBackPageAtom, studentsSortByAtom, studentsSortOrderAtom, tableScrollPositionAtom } from '../../../atoms/store'
const StudentProfile = ({ userId = 0 }) => {
	const [tableScrollPosition, setTableScrollPosition] = useAtom(tableScrollPositionAtom)
	const [studentsBackPage] = useAtom(studentsBackPageAtom)
	const [studentsSortBy] = useAtom(studentsSortByAtom)
	const [studentsSortOrder] = useAtom(studentsSortOrderAtom)
	const [checkprofileBackPage] = useAtom(checkprofileBackPageAtom)
	const [checkprofileSortBy] = useAtom(checkprofileSortByAtom)
	const [checkprofileSortOrder] = useAtom(checkprofileSortOrderAtom)
	const [listReturnPath] = useAtom(listReturnPathAtom)
	const [visibleRowsStudentIds, setVisibleRowsStudentIds] = useState([])
	const [step, setStep] = useState(1)
	const { studentId } = useParams()
	const { language, activeUser, role: contextRole, isInitializing } = useContext(UserContext)
	const t = key => translations[language][key] || key
	const role = contextRole || sessionStorage.getItem('role')

	// Helper function to get student_id from login user data
	const getStudentIdFromLoginUser = () => {
		// Try context first (already synced)
		if (activeUser?.studentId) {
			return activeUser.studentId
		}
		// Fallback to sessionStorage
		try {
			const loginUserData = JSON.parse(sessionStorage.getItem('loginUser'))
			return loginUserData?.studentId
		} catch {
			return null
		}
	}

	// Determine which student_id to use
	let id
	if (role === 'Student') {
		// For students, ALWAYS use their own student_id from session, ignore userId prop
		id = getStudentIdFromLoginUser()
	} else if (studentId) {
		// For staff/admin, prefer studentId from URL params (this should be student_id)
		id = studentId
	} else if (userId !== 0) {
		// For staff/admin, fallback to userId prop (but this might be primary key, needs verification)
		id = userId
	} else {
		id = null
	}

	const navigate = useNavigate()
	const location = useLocation()
	const [student, setStudent] = useState(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState(null)
	const [isBookmarked, setIsBookmarked] = useState(false)
	const [bookmarkLoading, setBookmarkLoading] = useState(false)

	useEffect(() => {
		// Wait for context initialization before attempting to fetch
		if (isInitializing) {
			return
		}

		const fetchStudent = async () => {
			if (!id) {
				setError('no_valid_student_id')
				setLoading(false)
				return
			}

			try {
				setLoading(true)
				setError(null)

				// Debug: check what id value we're using

				// Use student_id for API call, not primary key id
				const response = await axios.get(`/api/students/${id}`)
				setStudent(response.data)
				setLoading(false)
			} catch (error) {
				setError(error.response?.data?.message || 'errorFetchingStudent')
				setLoading(false)
			}
		}

		fetchStudent()
	}, [id, studentId, userId, role, isInitializing])

	// Check bookmark status for Recruiter
	useEffect(() => {
		if (role !== 'Recruiter' || !student?.id) return
		const checkBookmark = async () => {
			try {
				const response = await axios.get(`/api/bookmarks/check/${student.id}`)
				setIsBookmarked(response.data.isBookmarked)
			} catch (err) {
				console.error('Error checking bookmark status:', err)
			}
		}
		checkBookmark()
	}, [student?.id, role])

	const handleToggleBookmark = async () => {
		if (bookmarkLoading || !student?.id) return
		setBookmarkLoading(true)
		try {
			await axios.post('/api/bookmarks/toggle', {
				studentId: student.id,
				recruiterId: activeUser?.id,
			})
			setIsBookmarked(prev => !prev)
		} catch (err) {
			console.error('Error toggling bookmark:', err)
		} finally {
			setBookmarkLoading(false)
		}
	}

	const handleBackClick = () => {
		const isRootPath = location.pathname.endsWith('/top')
		if (isRootPath) {
			const returnPath = listReturnPath || (location.pathname.startsWith('/checkprofile') ? '/checkprofile' : '/student')
			if (returnPath === '/checkprofile') {
				const page = checkprofileBackPage ?? 0
				const sortBy = checkprofileSortBy ?? ''
				const sortOrder = checkprofileSortOrder ?? ''
				const query = new URLSearchParams()
				if (page > 0) query.set('page', String(page))
				if (sortBy) query.set('sortBy', sortBy)
				if (sortOrder) query.set('sortOrder', sortOrder)
				navigate(`/checkprofile${query.toString() ? `?${query.toString()}` : ''}`)
			} else {
				const page = studentsBackPage ?? 0
				const sortBy = studentsSortBy ?? ''
				const sortOrder = studentsSortOrder ?? ''
				const query = new URLSearchParams()
				if (page > 0) query.set('page', String(page))
				if (sortBy) query.set('sortBy', sortBy)
				if (sortOrder) query.set('sortOrder', sortOrder)
				navigate(`/student${query.toString() ? `?${query.toString()}` : ''}`)
			}
		} else {
			navigate(-1)
		}
	}
	useEffect(() => {
		const studentIdsString = localStorage.getItem('visibleRowsStudentIds')
		if (!studentIdsString) return

		setVisibleRowsStudentIds(JSON.parse(studentIdsString))
	}, [])
	const handleNextClick = () => {
		const isRootPath = location.pathname.endsWith('/top')
		if (!isRootPath) return

		setStep(step + 1)
		const currentIndex = visibleRowsStudentIds.findIndex(i => i.isCurrent)
		const next = visibleRowsStudentIds[currentIndex + step]
		if (!next) return
		const nextStudentId = next.student_id

		// Update isCurrent in localStorage so when user presses Back we scroll to this student
		try {
			const raw = localStorage.getItem('visibleRowsStudentIds')
			if (raw) {
				const list = JSON.parse(raw)
				const updated = list.map(item => ({
					...item,
					isCurrent: item.student_id === nextStudentId,
				}))
				localStorage.setItem('visibleRowsStudentIds', JSON.stringify(updated))
			}
		} catch (_) {}

		setVisibleRowsStudentIds(prev => prev.map(item => ({ ...item, isCurrent: item.student_id === nextStudentId })))
		setTableScrollPosition(oldData => (oldData != null ? oldData + 48 : 48))

		const basePath = listReturnPath || (location.pathname.startsWith('/checkprofile') ? '/checkprofile' : '/student')
		navigate(`${basePath}/profile/${nextStudentId}/top`)
	}

	const calculateAge = birthDateString => {
		const today = new Date()
		const birthDate = new Date(birthDateString)
		let age = today.getFullYear() - birthDate.getFullYear()
		const monthDifference = today.getMonth() - birthDate.getMonth()

		if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
			age--
		}

		return age
	}

	const formattedGraduationMonth = student?.expected_graduation_year ? formatGraduationMonth(student.expected_graduation_year, language) : t('not_set')
	const formattedPartnerUniversity = student?.partner_university ? formatPartnerUniversity(student.partner_university, t) : t('not_set')

	if (loading) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '200px',
					fontSize: '18px',
				}}
			>
				{t('loading_student_profile')}
			</Box>
		)
	}

	if (error) {
		return (
			<Box
				sx={{
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					height: '200px',
					fontSize: '18px',
					color: 'red',
				}}
			>
				<div>
					{t('error_label')}: {translations[language][error] ? t(error) : error}
				</div>
				<div style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
					Debug info: id={id}, role={role}, studentId={studentId}, userId=
					{userId}
				</div>
			</Box>
		)
	}

	if (!student) {
		return (
			<Box
				sx={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					height: '200px',
					fontSize: '18px',
				}}
			>
				No student data found
			</Box>
		)
	}

	return (
		<Box
			sx={{
				borderRadius: '10px',
			}}
		>
			<Box className={styles.topControlButtons}>
				{role !== 'Student' ? (
					<>
						<Button onClick={handleBackClick} className={styles.topBtn}>
							<ArrowBackIosNewOutlinedIcon />
							{t('back')}
						</Button>

						<Button disabled={visibleRowsStudentIds.length <= 0 || visibleRowsStudentIds.findIndex(ids => ids.isCurrent) + step >= visibleRowsStudentIds.length} onClick={handleNextClick} className={styles.topBtn}>
							{t('next')}
							<ArrowBackIosNewOutlinedIcon sx={{ transform: 'rotate(180deg)' }} />
						</Button>
					</>
				) : null}
			</Box>
			<Box className={styles.container}>
				<Box className={styles.avatarContainer}>
					<Avatar
						src={student.photo}
						alt={student.first_name}
						sx={{
							width: { xs: 80, sm: 96, md: 120 },
							height: { xs: 80, sm: 96, md: 120 },
						}}
					/>
				</Box>
				<Box className={styles.infoContainer}>
					<Box className={styles.nameEmailContainer}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
							{/* name and lastname */}
							<div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
								{student.first_name} {student.last_name}
								{role === 'Recruiter' && (
									<Tooltip title={t('bookmarked')}>
										<IconButton
											onClick={handleToggleBookmark}
											disabled={bookmarkLoading}
											sx={{
												padding: '4px',
												color: isBookmarked ? '#faaf00' : '#ccc',
												transition: 'color 0.2s ease',
												'&:hover': { color: '#faaf00' },
											}}
										>
											{isBookmarked ? <StarIcon /> : <StarBorderIcon />}
										</IconButton>
									</Tooltip>
								)}
							</div>
							{/* furigana */}
							{student.first_name_furigana || student.last_name_furigana ? (
								<div style={{ fontSize: 14, color: '#666' }}>
									{student.last_name_furigana || ''} {student.first_name_furigana || ''}
								</div>
							) : null}
							{/* student id and birthday */}
							<div className={styles.inlineInfoRow}>
								<div className={styles.infoPair}>
									<div style={{ color: '#787878' }}>{t('student_id')}:</div>
									<div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{student.student_id || 'N/A'}</div>
								</div>
								<div className={styles.infoPair}>
									<div style={{ color: '#787878' }}>{t('age')}:</div>
									<div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{student.date_of_birth ? calculateAge(student.date_of_birth) : '0'}</div>
								</div>
								<div className={styles.infoPair}>
									<div style={{ color: '#787878' }}>{t('expected_graduation_month')}:</div>
									<div style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{formattedGraduationMonth}</div>
								</div>
							</div>
							{/* partner university info - desktop */}
							<div className={styles.desktopUniversityGroup}>
								<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
									<div style={{ display: 'flex' }}>
										<div style={{ color: '#787878' }}>{t('enrolled_partner_university')}:</div>
										<div>{student.partner_university && student.faculty && student.department ? [formattedPartnerUniversity, student.faculty, student.department].filter(Boolean).join(' ') : formattedPartnerUniversity}</div>
									</div>
								</div>
							</div>

							{/* partner university info - mobile */}
							<div className={`${styles.mobileUniversityGroup} ${styles.mobileOnly}`}>
								<div className={styles.uniLabel}>
									{t('enrolled_partner_university')}:<div className={styles.uniValueLine}>{formattedPartnerUniversity}</div>
								</div>
								{(student.faculty || student.department) && (
									<>
										<div className={styles.uniLabelSpacer}></div>
										<div className={styles.uniValueLineDep}>{[student.faculty, student.department].filter(Boolean).join(' ')}</div>
									</>
								)}
							</div>
						</Box>
						{['Admin', 'Staff', 'Student', 'Recruiter'].includes(role) ? (
							<Box>
								<a href={`mailto:${student.email}`} className={styles.email}>
									<EmailIcon className={styles.emailIcon} />
									{student.email}
								</a>
								<Box className={styles.statusChipContainer}>
									<div>{student.visibility ? <div style={{ color: '#7ED6A7' }}>{t('published')}</div> : <div style={{ color: '#812958' }}>{t('private')}</div>}</div>
									<Box id='saveButton'></Box>
								</Box>
							</Box>
						) : null}
					</Box>
				</Box>
			</Box>
			<Outlet />
		</Box>
	)
}

// PropTypes validation
StudentProfile.propTypes = {
	userId: PropTypes.number,
}

export default StudentProfile
