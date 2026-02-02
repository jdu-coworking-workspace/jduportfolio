import { Box } from '@mui/material'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Filter from '../../components/Filter/Filter'
import Table from '../../components/Table/Table'

import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import { useAtom } from 'jotai'
import { listReturnPathAtom, studentsBackPageAtom, studentsSortByAtom, studentsSortOrderAtom } from '../../atoms/store'

// localStorage dan viewMode ni o'qish yoki default qiymat
const getInitialViewMode = () => {
	try {
		const saved = localStorage.getItem('studentTableViewMode')
		return saved || 'table'
	} catch (error) {
		console.error('Error reading viewMode from localStorage:', error)
		return 'table'
	}
}

// localStorage dan filter state ni o'qish yoki default qiymat
const getInitialFilterState = () => {
	const defaultState = {
		search: '',
		it_skills: [],
		language_skills: [],
		jlpt: [],
		jdu_japanese_certification: [],
		graduation_year: [],
		partner_university: [],
		other_information: '',
	}

	try {
		const saved = localStorage.getItem('students-filter-v1')
		if (saved) {
			const parsedState = JSON.parse(saved)
			// Validate va merge with default state
			return { ...defaultState, ...parsedState }
		}
	} catch (error) {
		console.error('Error reading filter state from localStorage:', error)
	}
	return defaultState
}

const Student = ({ OnlyBookmarked = false }) => {
	const { language } = useLanguage()
	const [studentsBackPage, setStudentsBackPage] = useAtom(studentsBackPageAtom)
	const [, setStudentsSortBy] = useAtom(studentsSortByAtom)
	const [, setStudentsSortOrder] = useAtom(studentsSortOrderAtom)
	const [, setListReturnPath] = useAtom(listReturnPathAtom)
	const t = key => translations[language][key] || key

	// Initial filter state - localStorage dan olish
	const initialFilterState = getInitialFilterState()

	const [filterState, setFilterState] = useState({
		...initialFilterState,
		language_skills: initialFilterState.language_skills || [],
		language_skills_match: initialFilterState.language_skills_match || '',
	})
	const [viewMode, setViewMode] = useState(getInitialViewMode()) // localStorage dan olish
	const [updatedBookmark, setUpdatedBookmark] = useState({
		studentId: null,
		timestamp: new Date().getTime(),
	})
	const recruiterId = JSON.parse(sessionStorage.getItem('loginUser')).id

	// localStorage ga viewMode ni saqlash
	useEffect(() => {
		try {
			localStorage.setItem('studentTableViewMode', viewMode)
		} catch (error) {
			console.error('Error saving viewMode to localStorage:', error)
		}
	}, [viewMode])

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
				// fallback to defaults
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

	// Generate graduation year options dynamically (current year to 5 years ahead)
	// Database stores dates in format: "2026-03-30", "2026-09-30", etc.
	// Filter options use date format internally, but display in Japanese format (2026年03月)
	const currentYear = new Date().getFullYear()
	const graduationYearOptions = []
	for (let i = 0; i <= 5; i++) {
		const year = currentYear + i
		// Generate date strings for March 30th and September 30th
		graduationYearOptions.push(`${year}-03-30`) // Spring graduation (March)
		graduationYearOptions.push(`${year}-09-30`) // Fall graduation (September)
	}

	// Utility function to format graduation year from date format to Japanese format
	// Input: "2026-03-30" -> Output: "2026年03月"
	const formatGraduationYear = dateStr => {
		if (!dateStr || typeof dateStr !== 'string') return dateStr
		// Extract year and month from date string (YYYY-MM-DD)
		const match = dateStr.match(/^(\d{4})-(\d{2})/)
		if (match) {
			const [, year, month] = match
			return `${year}年${month}月`
		}
		return dateStr
	}

	const filterFields = [
		{
			key: 'it_skills',
			label: t('programming_languages'),
			type: 'checkbox',
			options: itSkillOptions,
			matchModeKey: 'it_skills_match',
		},
		{
			key: 'language_skills',
			label: t('languageSkills'),
			type: 'checkbox',
			options: languageSkillOptions,
			matchModeKey: 'language_skills_match',
		},
		{
			key: 'jlpt',
			label: t('jlpt'),
			type: 'checkbox',
			options: ['N1', 'N2', 'N3', 'N4', 'N5'],
		},
		{
			key: 'jdu_japanese_certification',
			label: t('jdu_certification'),
			type: 'checkbox',
			options: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
		},
		{
			key: 'graduation_year',
			label: '卒業予定年（月）',
			type: 'checkbox',
			options: graduationYearOptions,
			displayFormat: formatGraduationYear, // Format for display: "2026-03-30" -> "2026年03月"
		},
		{
			key: 'partner_university',
			label: t('partner_university'),
			type: 'checkbox',
			options: [t('tokyo_communication_university'), t('kyoto_tachibana_university'), t('sanno_university'), t('sanno_junior_college'), t('niigata_sangyo_university'), t('otemae_university'), t('okayama_university_of_science')],
		},
		{
			key: 'other_information',
			label: t('special_skills'),
			type: 'radio',
			options: [t('yes'), t('no')],
		},
	]

	const handleFilterChange = useCallback(newFilterState => {
		setFilterState(newFilterState)
		// console.log('Filter changed:', newFilterState)
	}, [])

	// ✅ viewMode change handler
	const handleViewModeChange = useCallback(newMode => {
		setViewMode(newMode)
	}, [])

	const navigate = useNavigate()

	const navigateToProfile = (student, currentPage, currentSortBy, currentSortOrder) => {
		setStudentsBackPage(currentPage ?? 0)
		setStudentsSortBy(currentSortBy ?? '')
		setStudentsSortOrder(currentSortOrder ?? '')
		setListReturnPath('/student')
		navigate(`profile/${student.student_id}/top`)
	}

	const addToBookmark = async student => {
		try {
			const response = await axios.post('/api/bookmarks/toggle', {
				studentId: student.id,
				recruiterId,
			})
			setUpdatedBookmark({
				studentId: response.data.studentId,
				timestamp: new Date().getTime(),
			})
		} catch (error) {
			console.error('Error bookmarking student:', error)
		}
	}

	const headers = [
		{
			id: 'first_name',
			numeric: false,
			disablePadding: true,
			label: t('student'),
			type: 'avatar',
			minWidth: '220px',
			onClickAction: navigateToProfile,
			isSort: true,
		},
		{
			id: 'student_id',
			numeric: false,
			disablePadding: false,
			label: t('student_id'),
			minWidth: '120px',
			isSort: true,
		},
		{
			id: 'age',
			numeric: true,
			disablePadding: false,
			label: t('age'),
			minWidth: '80px !important',
			suffix: ' 歳',
			isSort: true,
		},
		{
			id: 'jlpt',
			numeric: true,
			disablePadding: false,
			label: t('jlpt'),
			minWidth: '160px',
			isJSON: true,
		},
		{
			id: 'partner_university',
			numeric: false,
			disablePadding: false,
			label: t('partner_university'),
			isJSON: false,
		},
		{
			id: 'graduation_year',
			numeric: true,
			disablePadding: false,
			label: t('expectedGraduationYearMonth'),
			minWidth: '160px',
			isSort: true,
		},
		{
			id: 'bookmark',
			numeric: false,
			disablePadding: true,
			label: '',
			type: 'bookmark',
			role: 'Recruiter',
			onClickAction: addToBookmark,
		},
	]

	const tableProps = {
		headers: headers,
		dataLink: '/api/students',
		filter: filterState,
		recruiterId: recruiterId,
		OnlyBookmarked: OnlyBookmarked,
		onFilterChange: handleFilterChange, // Pass filter change handler to Table
		// Pass filter options for header dropdowns
		filterOptions: {
			jlpt: ['N1', 'N2', 'N3', 'N4', 'N5', '未提出'],
			partner_university: ['東京通信大学', '産業能率大学', '新潟産業大学', '京都橘大学', '大手前大学', '自由が丘産能短期大学', '40単位モデル'],
			graduation_year: graduationYearOptions,
			graduation_year_format: formatGraduationYear,
		},
	}

	return (
		<div key={language}>
			<Box sx={{ width: '100%', mb: 2 }}>
				<Filter fields={filterFields} filterState={filterState} onFilterChange={handleFilterChange} viewMode={viewMode} onViewModeChange={handleViewModeChange} persistKey='students-filter-v1' showFilteredItems={true} />
			</Box>
			<Table tableProps={tableProps} updatedBookmark={updatedBookmark} viewMode={viewMode} />
		</div>
	)
}

Student.propTypes = {
	OnlyBookmarked: PropTypes.bool,
}

export default Student
