import { useState, useEffect, useContext } from 'react'
import { Container, Typography, Box, Button, Grid, Card, CardContent } from '@mui/material'

// Custom icons import
import MailIcon from '../../assets/icons/mail-line.svg'
import LocationIcon from '../../assets/icons/map-pin-line.svg'
import TimeIcon from '../../assets/icons/time-line.svg'
import PhoneIcon from '../../assets/icons/phone-line.svg'

import FAQstyle from './FAQ.module.css'
import QATextField from '../../components/QATextField/QATextField'
import QAAccordion from '../../components/QAAccordion/QAAccordion'

import axios from '../../utils/axiosUtils'
import { useAlert } from '../../contexts/AlertContext'
import { UserContext } from '../../contexts/UserContext'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'

const FAQ = () => {
	const [editData, setEditData] = useState([])
	const [settings, setSettings] = useState({})
	const [editMode, setEditMode] = useState(false)
	const { role } = useContext(UserContext)
	const { language } = useLanguage()
	const t = key => translations[language]?.[key] ?? key
	const [allExpanded, setAllExpanded] = useState(true) // default open on load

	const showAlert = useAlert()

	const fetchFAQ = async signal => {
		try {
			const response = await axios.get('/api/settings/faq', { signal })
			const value = response.data.value
			if (value) {
				setEditData(JSON.parse(value))
			}
		} catch (error) {
			if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
				console.error('Error fetching FAQ data:', error)
			}
		}
	}

	const fetchSettings = async signal => {
		const keys = ['contactEmail', 'contactPhone', 'workingHours', 'location']

		try {
			const response = await axios.get('/api/settings', {
				params: { keys: keys.join(',') },
				signal,
			})
			setSettings(response.data)
		} catch (error) {
			if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
				console.error('Error fetching settings:', error)
			}
		}
	}

	useEffect(() => {
		const controller = new AbortController()
		const timerId = setTimeout(() => {
			fetchSettings(controller.signal)
			fetchFAQ(controller.signal)
		}, 0)
		return () => {
			clearTimeout(timerId)
			controller.abort()
		}
	}, [])

	const handleUpdate = (keyName, value, qa) => {
		setEditData(prevEditData => {
			const updatedEditData = [...prevEditData]

			if (updatedEditData[keyName]) {
				updatedEditData[keyName] = {
					...updatedEditData[keyName],
					[qa]: value,
				}
			}

			return updatedEditData
		})
	}

	const toggleEditMode = () => {
		setEditMode(prev => !prev)
	}

	const handleSave = async () => {
		try {
			const updatedValue = JSON.stringify(editData)

			const response = await axios.put(`/api/settings/faq`, {
				value: updatedValue,
			})

			if (response.status === 200) {
				setEditMode(false)
				showAlert(t('changes_saved'), 'success')
			}
		} catch (error) {
			console.error('Error updating FAQ data:', error)
		}
	}

	const handleCancel = () => {
		fetchFAQ()
		setEditMode(false)
	}

	const handleAdd = async () => {
		await setEditData(prevEditData => [...prevEditData, { question: '', answer: '' }])
	}

	const handleDelete = indexToDelete => {
		setEditData(prevEditData =>
			prevEditData.filter((_, index) => {
				return index != indexToDelete
			})
		)
	}

	return (
		<Container className={FAQstyle.container}>
			{/* Header Section */}
			<Box className={FAQstyle.header}>
				<Typography variant='h4' className={FAQstyle.title}>
					{t('faq_heading')}
				</Typography>
				<Box className={FAQstyle.buttonGroup}>
					{role == 'Admin' && (
						<>
							{editMode ? (
								<>
									<Button onClick={handleSave} variant='contained' size='small'>
										{t('save')}
									</Button>
									<Button onClick={handleCancel} variant='outlined' color='error' size='small'>
										{t('cancel')}
									</Button>
									<Button onClick={handleAdd} variant='outlined' color='primary' size='small'>
										{t('add')}
									</Button>
								</>
							) : (
								<Button onClick={toggleEditMode} variant='contained' color='primary' size='small'>
									{t('qa_edit')}
								</Button>
							)}
						</>
					)}
				</Box>
			</Box>

			{/* FAQ Content */}
			<Box className={FAQstyle.content}>
				{/* Edit Mode */}
				{editMode && (
					<Box className={FAQstyle.editSection}>
						{Object.entries(editData).map(([key, { question, answer }]) => (
							<Box key={key}>
								<QATextField data={editData} editData={editData} category={false} question={question} keyName={key} updateEditData={handleUpdate} DeleteQA={handleDelete} aEdit={role == 'Admin'} qEdit={role == 'Admin'} />
							</Box>
						))}
					</Box>
				)}

				{/* View Mode */}
				{!editMode && (
					<Box className={FAQstyle.faqList}>
						{Object.entries(editData).map(([key, { question, answer }], index) => (
							<QAAccordion key={key} question={question} answer={answer ? answer : t('faq_no_answer')} expanded={allExpanded} showExpandIcon={index === 0} onToggle={index === 0 ? () => setAllExpanded(prev => !prev) : undefined} />
						))}
					</Box>
				)}
			</Box>

			{/* Contact Information */}
			<Card className={FAQstyle.contactCard}>
				<CardContent className={FAQstyle.contactContent}>
					<Grid container spacing={3}>
						<Grid item xs={12} sm={6} md={6}>
							<Box className={FAQstyle.contactItem}>
								<img src={MailIcon} alt='Email' className={FAQstyle.contactIcon} />
								<Typography className={FAQstyle.contactText}>{settings.contactEmail || 'test@jdu.uz'}</Typography>
							</Box>
						</Grid>
						<Grid item xs={12} sm={6} md={6}>
							<Box className={FAQstyle.contactItem}>
								<img src={PhoneIcon} alt='Phone' className={FAQstyle.contactIcon} />
								<Typography className={FAQstyle.contactText}>{settings.contactPhone || '+998 90 234 56 78'}</Typography>
							</Box>
						</Grid>
						<Grid item xs={12} sm={6} md={6}>
							<Box className={FAQstyle.contactItem}>
								<img src={TimeIcon} alt='Working Hours' className={FAQstyle.contactIcon} />
								<Typography className={FAQstyle.contactText}>{settings.workingHours || '9:00 - 18:00'}</Typography>
							</Box>
						</Grid>
						<Grid item xs={12} sm={6} md={6}>
							<Box className={FAQstyle.contactItem}>
								<img src={LocationIcon} alt='Location' className={FAQstyle.contactIcon} />
								<Typography className={FAQstyle.contactText}>{settings.location || 'Tashkent, Shayhontohur district, Sebzor, 21'}</Typography>
							</Box>
						</Grid>
					</Grid>
				</CardContent>
			</Card>
		</Container>
	)
}

export default FAQ
