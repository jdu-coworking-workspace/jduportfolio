import ArrowBackIosNewOutlinedIcon from '@mui/icons-material/ArrowBackIosNewOutlined'
import EmailIcon from '@mui/icons-material/Email'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { Avatar, Box, Button, IconButton } from '@mui/material'
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

const StudentProfile = ({ userId = 0, isPublic = false }) => {
	const [tableScrollPosition, setTableScrollPosition] = useAtom(tableScrollPositionAtom)
	const [studentsBackPage] = useAtom(studentsBackPageAtom)
	const [studentsSortBy] = useAtom(studentsSortByAtom)
	const [studentsSortOrder] = useAtom(studentsSortOrderAtom)
	const [checkprofileBackPage] = useAtom(checkprofileBackPageAtom)
	const [checkprofileSortBy] = useAtom(checkprofileSortByAtom)
	const [checkprofileSortOrder] = useAtom(checkprofileSortOrderAtom)
	const [listReturnPath] = useAtom(listReturnPathAtom)

	const [visibleRowsStudentIds, setVisibleRowsStudentIds] = useState([])
	const step = 1

	const { studentId, uuid } = useParams()
	const { language, activeUser, role: contextRole, isInitializing } = useContext(UserContext)

	const t = key => translations[language][key] || key
	const role = contextRole || sessionStorage.getItem('role')

	const getStudentIdFromLoginUser = () => {
		if (activeUser?.studentId) return activeUser.studentId
		try {
			const loginUserData = JSON.parse(sessionStorage.getItem('loginUser'))
			return loginUserData?.studentId
		} catch {
			return null
		}
	}

	let id
	if (isPublic && uuid) {
		id = uuid
	} else if (role === 'Student') {
		id = getStudentIdFromLoginUser()
	} else if (studentId) {
		id = studentId
	} else if (userId !== 0) {
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
		if (!isPublic && isInitializing) return

		const fetchStudent = async () => {
			if (!id) {
				setError('no_valid_student_id')
				setLoading(false)
				return
			}

			try {
				setLoading(true)
				setError(null)
				const apiUrl = isPublic ? `/api/students/public/share/${id}` : `/api/students/${id}`
				const response = await axios.get(apiUrl)
				setStudent(response.data)
				setLoading(false)
			} catch (err) {
				setError(err.response?.data?.message || 'errorFetchingStudent')
				setLoading(false)
			}
		}

		fetchStudent()
	}, [id, studentId, userId, role, isPublic, isInitializing, uuid])

	useEffect(() => {
		if (isPublic || role !== 'Recruiter' || !student?.id) return
		const checkBookmark = async () => {
			try {
				const response = await axios.get(`/api/bookmarks/check/${student.id}`)
				setIsBookmarked(response.data.isBookmarked)
			} catch (err) {
				console.error('Error checking bookmark status:', err)
			}
		}
		checkBookmark()
	}, [student?.id, role, isPublic])

	useEffect(() => {
		if (isPublic || role === 'Student') return

		try {
			const raw = localStorage.getItem('visibleRowsStudentIds')
			if (!raw) {
				setVisibleRowsStudentIds([])
				return
			}

			const parsed = JSON.parse(raw)
			if (!Array.isArray(parsed)) {
				setVisibleRowsStudentIds([])
				return
			}

			const currentStudentId = String(studentId || id || '')
			const hasCurrent = parsed.some(item => item?.isCurrent)
			const normalized = parsed.map(item => ({
				...item,
				isCurrent: currentStudentId ? String(item?.student_id) === currentStudentId : Boolean(item?.isCurrent),
			}))

			const finalList = hasCurrent || !currentStudentId ? parsed : normalized
			setVisibleRowsStudentIds(finalList)
			if (!hasCurrent && currentStudentId) {
				localStorage.setItem('visibleRowsStudentIds', JSON.stringify(finalList))
			}
		} catch (_) {
			setVisibleRowsStudentIds([])
		}
	}, [studentId, id, isPublic, role])

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
				const query = new URLSearchParams()
				if (checkprofileBackPage > 0) query.set('page', String(checkprofileBackPage))
				if (checkprofileSortBy) query.set('sortBy', checkprofileSortBy)
				if (checkprofileSortOrder) query.set('sortOrder', checkprofileSortOrder)
				navigate(`/checkprofile${query.toString() ? `?${query.toString()}` : ''}`)
			} else {
				const query = new URLSearchParams()
				if (studentsBackPage > 0) query.set('page', String(studentsBackPage))
				if (studentsSortBy) query.set('sortBy', studentsSortBy)
				if (studentsSortOrder) query.set('sortOrder', studentsSortOrder)
				navigate(`/student${query.toString() ? `?${query.toString()}` : ''}`)
			}
		} else {
			navigate(-1)
		}
	}

	const handleNextClick = () => {
		const isRootPath = location.pathname.endsWith('/top')
		if (!isRootPath) return

		const currentIndex = visibleRowsStudentIds.findIndex(i => i.isCurrent)
		const next = visibleRowsStudentIds[currentIndex + step]
		if (!next) return
		const nextStudentId = next.student_id

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
		} catch (_) {
			// ignore error
		}

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
			<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 5, color: 'red' }}>
				<div>
					{t('error_label')}: {translations[language][error] ? t(error) : error}
				</div>
				<div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
					Debug: id={id}, isPublic={String(isPublic)}, uuid={uuid}
				</div>
			</Box>
		)
	}

	return (
		<Box sx={{ borderRadius: '10px' }}>
			{/* Back/Next buttons faqat ichki foydalanuvchilar uchun */}
			{!isPublic && role !== 'Student' && (
				<Box className={styles.topControlButtons}>
					<Button onClick={handleBackClick} className={styles.topBtn}>
						<ArrowBackIosNewOutlinedIcon /> {t('back')}
					</Button>
					<Button disabled={visibleRowsStudentIds.length <= 0 || visibleRowsStudentIds.findIndex(ids => ids.isCurrent) + step >= visibleRowsStudentIds.length} onClick={handleNextClick} className={styles.topBtn}>
						{t('next')} <ArrowBackIosNewOutlinedIcon sx={{ transform: 'rotate(180deg)' }} />
					</Button>
				</Box>
			)}

			<Box className={styles.container}>
				{!isPublic && (
					<Box className={styles.avatarContainer}>
						<Avatar src={student.photo} alt={student.first_name} sx={{ width: 120, height: 120 }} />
					</Box>
				)}
				<Box className={styles.infoContainer}>
					<Box className={styles.nameEmailContainer}>
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
							<div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
								{student.first_name} {student.last_name}
								{!isPublic && role === 'Recruiter' && (
									<IconButton onClick={handleToggleBookmark} disabled={bookmarkLoading} sx={{ color: isBookmarked ? '#faaf00' : '#ccc' }}>
										{isBookmarked ? <StarIcon /> : <StarBorderIcon />}
									</IconButton>
								)}
							</div>

							<div className={styles.inlineInfoRow}>
								<div className={styles.infoPair}>
									<div style={{ color: '#787878' }}>{t('student_id')}:</div>
									<div>{student.student_id || 'N/A'}</div>
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
						{['Admin', 'Staff', 'Recruiter'].includes(role) || (role === 'Student' && !isPublic) ? (
							<Box>
								<a href={`mailto:${student.email}`} className={styles.email}>
									<EmailIcon className={styles.emailIcon} />
									{student.email}
								</a>
								<Box className={styles.statusChipContainer}>
									<div>{student.visibility ? <div style={{ color: '#7ED6A7' }}>{t('published')}</div> : <div style={{ color: '#812958' }}>{t('private')}</div>}</div>
								</Box>
							</Box>
						) : null}
					</Box>
				</Box>
			</Box>
			<Outlet context={{ student, isPublic }} />
		</Box>
	)
}

StudentProfile.propTypes = {
	userId: PropTypes.number,
	isPublic: PropTypes.bool,
}

export default StudentProfile
