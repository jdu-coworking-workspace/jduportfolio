import { useContext, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { UserContext } from '../../../contexts/UserContext'
import translations from '../../../locales/translations'
import axios from '../../../utils/axiosUtils'
import SkillSelector from '../../../components/SkillSelector/SkillSelector'
import { Box } from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'

const Skills = () => {
	const { studentId } = useParams()
	const location = useLocation()
	const { language } = useContext(UserContext)
	const t = key => (translations[language] || translations.en)[key] || key
	const [student, setStudent] = useState(null)
	const [editMode, setEditMode] = useState({})
	const [editData, setEditData] = useState({})

	// Get userId from location state or use studentId from params
	const userId = location.state?.userId || 0
	const id = userId !== 0 ? userId : studentId

	useEffect(() => {
		const fetchStudent = async () => {
			try {
				const response = await axios.get(`/api/students/${id}`)
				setStudent(response.data)
				setEditData(response.data)
			} catch (error) {
				console.log('Error fetching student data', error)
			}
		}

		if (id) {
			fetchStudent()
		}
	}, [id])

	const updateEditData = (key, value) => {
		setEditData(prev => ({
			...prev,
			draft: {
				...prev.draft,
				[key]: value,
			},
		}))
	}

	const updateEditMode = (key, value) => {
		setEditMode(prev => ({
			...prev,
			[key]: value,
		}))
	}

	if (!student) {
		return <div>{t('loading')}</div>
	}

	return (
		<Box sx={{ p: 2, overflowX: 'hidden' }}>
			{/* Special Skills */}
			<Box sx={{ marginBottom: '40px' }}>
				<SkillSelector title={t('specialSkills')} data={student.draft.special_skills} editData={editData.draft.special_skills} editMode={editMode.special_skills} updateEditData={updateEditData} keyName='special_skills' updateEditMode={updateEditMode} placeholder={t('specialSkills')} />
			</Box>

			{/* IT Skills */}
			<Box sx={{ marginBottom: '40px' }}>
				<SkillSelector title={t('itSkills')} data={student.draft.it_skills} editData={editData.draft.it_skills} editMode={editMode.it_skills} updateEditData={updateEditData} keyName='it_skills' updateEditMode={updateEditMode} placeholder={t('itSkills')} />
			</Box>

			{/* Other Skills */}
			<Box sx={{ marginBottom: '40px' }}>
				<SkillSelector title={t('otherSkills')} data={student.draft.skills} editData={editData.draft.skills} editMode={editMode.skills} updateEditData={updateEditData} keyName='skills' updateEditMode={updateEditMode} placeholder={t('otherSkills')} />
			</Box>

			{/* Language Skills */}
			<Box sx={{ marginBottom: '40px' }}>
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						gap: 1,
						marginBottom: '20px',
						fontSize: '18px',
						fontWeight: 'bold',
					}}
				>
					<TranslateIcon sx={{ color: '#5627DB' }} />
					{t('languageSkills')}
				</Box>
				{/* Language skills content can be added here based on the Top.jsx implementation */}
			</Box>
		</Box>
	)
}

export default Skills
