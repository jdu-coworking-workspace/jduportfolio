import { useState, useEffect, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import axios from '../../utils/axiosUtils'
import { useAlert } from '../../contexts/AlertContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { UserContext } from '../../contexts/UserContext'

import RichTextEditor from '../../components/RichTextEditor/RichTextEditor'

import styles from './Home.module.css'
import Photo1 from '../../assets/Photo1.jpg'
import Photo2 from '../../assets/Photo2.jpg'
import { Box, Button } from '@mui/material'

import translations from '../../locales/translations'

const Home = () => {
	const navigate = useNavigate()
	const { language } = useLanguage()
	const { role } = useContext(UserContext)
	const t = key => translations[language][key] || key
	const [editData, setEditData] = useState('')
	const [editMode, setEditMode] = useState(false)
	const showAlert = useAlert()

	const fetchHomePageData = async signal => {
		try {
			const response = await axios.get('/api/settings/homepage', { signal })
			setEditData(response.data.value || '')
		} catch (error) {
			if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
				console.error('Error fetching homepage data:', error)
			}
		}
	}

	const handleContentChange = newContent => {
		setEditData(newContent)
	}

	const handleClick = () => {
		navigate('/student')
	}

	const toggleEditMode = () => {
		setEditMode(prev => !prev)
	}

	const handleCancel = () => {
		fetchHomePageData()
		setEditMode(false)
	}

	const handleSave = async () => {
		try {
			const response = await axios.put(`/api/settings/homepage`, {
				value: editData,
			})

			if (response.status === 200) {
				setEditMode(false)
				showAlert(t('changes_saved'), 'success')
			}
		} catch (error) {
			console.error('Error updating homepage data:', error)
		}
	}

	const cleanHtmlContent = html => {
		if (!html) return ''
		const tempDiv = document.createElement('div')
		tempDiv.innerHTML = html
		const paragraphs = tempDiv.querySelectorAll('p')
		paragraphs.forEach(p => {
			const span = document.createElement('span')
			span.innerHTML = p.innerHTML
			p.parentNode.replaceChild(span, p)
		})
		return tempDiv.innerHTML
	}

	useEffect(() => {
		const controller = new AbortController()
		const timerId = setTimeout(() => {
			fetchHomePageData(controller.signal)
		}, 0)
		return () => {
			clearTimeout(timerId)
			controller.abort()
		}
	}, [])

	return (
		<div key={language}>
			<Box className={styles.header}>
				<Box display={'flex'} gap={'10px'} justifyContent={'flex-end'}>
					{role === 'Admin' && (
						<>
							{editMode ? (
								<>
									<Button onClick={handleSave} variant='contained' color='primary' size='small'>
										{t('save')}
									</Button>
									<Button onClick={handleCancel} variant='outlined' color='error' size='small'>
										{t('cancel')}
									</Button>
								</>
							) : (
								<Button onClick={toggleEditMode} variant='contained' color='primary' size='small'>
									{t('edit')}
								</Button>
							)}
						</>
					)}
				</Box>
			</Box>

			{/* Main Banner Section */}
			<div className={styles.container}>
				<div className={styles.mainBanner}>
					<div className={styles.backgroundImage}></div>
					<div className={styles.textContent}>
						{editMode && <RichTextEditor value={editData} onChange={handleContentChange} />}

						{!editMode && <p className={styles.textParagraph} dangerouslySetInnerHTML={{ __html: cleanHtmlContent(editData) }}></p>}

						<div className={styles.buttonContainer}>
							<button className={styles.button} onClick={handleClick}>
								{t('next_button')}
							</button>
						</div>
					</div>
				</div>
			</div>

			{/* Bottom Images Grid - 2 ta image yonma-yon */}
			<div className={styles.bottomImagesGrid}>
				<div className={styles.gridImageItem}>
					<img src={Photo1} alt={t('large_class_photo_alt')} />
				</div>
				<div className={styles.gridImageItem}>
					<img src={Photo2} alt={t('group_photo_alt')} />
				</div>
			</div>
		</div>
	)
}

export default Home
