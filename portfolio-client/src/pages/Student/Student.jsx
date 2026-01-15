import { Box } from '@mui/material'
import PropTypes from 'prop-types'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Filter from '../../components/Filter/Filter'
import Table from '../../components/Table/Table'

import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'

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
	const t = key => translations[language][key] || key

	// Initial filter state - localStorage dan olish
	const initialFilterState = getInitialFilterState()

	const [filterState, setFilterState] = useState(initialFilterState)
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

	// Generate graduation year options dynamically (current year to 5 years ahead)
	const currentYear = new Date().getFullYear()
	const graduationYearOptions = []
	for (let i = 0; i <= 5; i++) {
		const year = currentYear + i
		// Generate options in both formats that might be stored in DB
		graduationYearOptions.push(`${year}年春`)
		graduationYearOptions.push(`${year}年秋`)
		graduationYearOptions.push(`${year}年`)
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

	const navigateToProfile = student => {
		navigate(`profile/${student.student_id}`)
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
			label: '年齢',
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
			id: 'expected_graduation_year',
			numeric: true,
			disablePadding: false,
			label: '卒業予定年（月）',
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
