import { useContext, useEffect, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { UserContext } from '../../../contexts/UserContext'
import translations from '../../../locales/translations'
import axios from '../../../utils/axiosUtils'
import Deliverables from '../../../components/Deliverables/Deliverables'
import { Box } from '@mui/material'

const DeliverablesPage = () => {
	const { studentId } = useParams()
	const location = useLocation()
	const { language } = useContext(UserContext)
	const t = translations[language] || translations.en
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

	const handleImageUpload = async (file, index) => {
		// This function should handle image upload
		// Implementation would depend on your image upload service
		console.log('Image upload for deliverable', index, file)
	}

	if (!student) {
		return <div>{t('loading')}</div>
	}

	return (
		<Box sx={{ padding: '20px' }}>
			<Box
				sx={{
					fontSize: '18px',
					fontWeight: 'bold',
					marginBottom: '20px',
				}}
			>
				{t('deliverables')}
			</Box>
			<Deliverables data={student.draft.deliverables} editData={editData.draft.deliverables} editMode={editMode.deliverables} updateEditData={updateEditData} keyName='deliverables' updateEditMode={updateEditMode} onImageUpload={handleImageUpload} />
		</Box>
	)
}

export default DeliverablesPage
