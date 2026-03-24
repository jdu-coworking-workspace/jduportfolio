import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent, Box, Button, Typography, Card, CardContent, CardActionArea } from '@mui/material'
import { useLanguage } from '../../contexts/LanguageContext'
import styles from './LanguageSelectionModal.module.css'

const languages = [
	{
		code: 'ja',
		name: '日本語',
		englishName: 'Japanese',
		flag: '🇯🇵',
		description: '日本語でポートフォリオシステムを使用します',
	},
	{
		code: 'en',
		name: 'English',
		englishName: 'English',
		flag: '🇺🇸',
		description: 'Use the portfolio system in English',
	},
	{
		code: 'uz',
		name: "O'zbek",
		englishName: 'Uzbek',
		flag: '🇺🇿',
		description: "Portfolio tizimini o'zbek tilida ishlating",
	},
	{
		code: 'ru',
		name: 'Русский',
		englishName: 'Russian',
		flag: '🇷🇺',
		description: 'Используйте систему портфолио на русском языке',
	},
]

const LanguageSelectionModal = ({ open, onClose }) => {
	const { language, changeLanguage } = useLanguage()
	const [selectedLanguage, setSelectedLanguage] = useState(language)

	const handleLanguageSelect = langCode => {
		setSelectedLanguage(langCode)
	}

	const handleConfirm = () => {
		// Save that user has selected a language
		localStorage.setItem('hasSelectedLanguage', 'true')

		// Change the language
		changeLanguage(selectedLanguage)

		// Close the modal
		onClose()
	}

	return (
		<Dialog
			open={open}
			onClose={() => {}} // Prevent closing by clicking outside
			maxWidth='sm'
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: '16px',
					overflow: 'hidden',
				},
			}}
		>
			<DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
				<Typography variant='h5' fontWeight='bold'>
					ようこそ! Welcome! Xush kelibsiz! Добро пожаловать!
				</Typography>
				<Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
					Please select your preferred language
				</Typography>
			</DialogTitle>
			<DialogContent sx={{ pb: 3 }}>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					{languages.map(lang => (
						<Card
							key={lang.code}
							variant={selectedLanguage === lang.code ? 'elevation' : 'outlined'}
							sx={{
								border: selectedLanguage === lang.code ? '2px solid #5627DB' : '1px solid #e0e0e0',
								transition: 'all 0.2s ease',
								'&:hover': {
									transform: 'translateY(-2px)',
									boxShadow: 2,
								},
							}}
						>
							<CardActionArea onClick={() => handleLanguageSelect(lang.code)}>
								<CardContent>
									<Box display='flex' alignItems='center' gap={2}>
										<Typography variant='h2' sx={{ fontSize: '48px' }}>
											{lang.flag}
										</Typography>
										<Box flex={1}>
											<Typography variant='h6' fontWeight='bold'>
												{lang.name}
											</Typography>
											<Typography variant='body2' color='text.secondary'>
												{lang.description}
											</Typography>
										</Box>
										{selectedLanguage === lang.code && (
											<Box
												sx={{
													width: 24,
													height: 24,
													borderRadius: '50%',
													bgcolor: '#5627DB',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													color: 'white',
												}}
											>
												✓
											</Box>
										)}
									</Box>
								</CardContent>
							</CardActionArea>
						</Card>
					))}
				</Box>
				<Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
					<Button
						variant='contained'
						size='large'
						onClick={handleConfirm}
						sx={{
							backgroundColor: '#5627DB',
							color: 'white',
							px: 6,
							py: 1.5,
							borderRadius: '8px',
							textTransform: 'none',
							fontSize: '16px',
							fontWeight: 'bold',
							'&:hover': {
								backgroundColor: '#4520A6',
							},
						}}
					>
						Continue
					</Button>
				</Box>
			</DialogContent>
		</Dialog>
	)
}

export default LanguageSelectionModal
