import { Box, Typography, Container, Paper } from '@mui/material'
import BuildIcon from '@mui/icons-material/Build'
import { useState, useEffect } from 'react'

/**
 * Public maintenance page shown to users when:
 * 1. Backend is down (ECONNREFUSED, network errors)
 * 2. Maintenance mode is enabled in maintenance.json
 *
 * This component does NOT use LanguageContext or AlertContext
 * because it's rendered outside of those providers
 */
const PublicMaintenancePage = () => {
	const [maintenanceInfo, setMaintenanceInfo] = useState(null)
	const [showDefault, setShowDefault] = useState(false)

	useEffect(() => {
		// Try to fetch maintenance message from maintenance.json
		const fetchMaintenanceInfo = async () => {
			try {
				const response = await fetch('/api/maintenance')
				if (response.ok) {
					const data = await response.json()
					// Only use custom message if maintenance is ENABLED
					if (data.enabled === true) {
						setMaintenanceInfo(data)
						setShowDefault(false)
					} else {
						// Maintenance is disabled, show default message
						setShowDefault(true)
					}
				} else {
					// Backend responded but with error, show default message
					setShowDefault(true)
				}
			} catch (error) {
				// Network error or backend is down - show default message
				setShowDefault(true)
			}
		}

		fetchMaintenanceInfo()
	}, [])

	// Default message when backend is down (local development or production failure)
	const defaultMessage = {
		ja: {
			title: 'メンテナンス中',
			message: 'システムメンテナンス中です。しばらくお待ちください。',
			subtitle: 'ご不便をおかけして申し訳ございません',
		},
		en: {
			title: 'Under Maintenance',
			message: 'System is currently under maintenance. Please try again later.',
			subtitle: 'We apologize for any inconvenience',
		},
		uz: {
			title: 'Texnik xizmat',
			message: "Tizim texnik xizmat jarayonida. Iltimos, keyinroq urinib ko'ring.",
			subtitle: "Noqulaylik uchun uzr so'raymiz",
		},
	}

	// Get browser language (default to Japanese)
	const getBrowserLanguage = () => {
		const lang = navigator.language || navigator.userLanguage || 'ja'
		if (lang.startsWith('en')) return 'en'
		if (lang.startsWith('uz')) return 'uz'
		return 'ja' // Default to Japanese
	}

	const language = getBrowserLanguage()
	const messages = defaultMessage[language]

	// Get custom message from maintenance.json based on language
	const getCustomMessage = () => {
		if (!maintenanceInfo) return null

		switch (language) {
			case 'en':
				return maintenanceInfo.messageEn || maintenanceInfo.message
			case 'uz':
				return maintenanceInfo.messageUz || maintenanceInfo.message
			case 'ja':
			default:
				return maintenanceInfo.message
		}
	}

	const customMessage = getCustomMessage()

	return (
		<Box
			sx={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
				padding: 2,
			}}
		>
			<Container maxWidth='md'>
				<Paper
					elevation={8}
					sx={{
						padding: { xs: 3, sm: 4, md: 6 },
						borderRadius: 4,
						textAlign: 'center',
						background: 'rgba(255, 255, 255, 0.95)',
						backdropFilter: 'blur(10px)',
					}}
				>
					{/* Icon */}
					<Box
						sx={{
							display: 'flex',
							justifyContent: 'center',
							mb: 3,
						}}
					>
						<BuildIcon
							sx={{
								fontSize: { xs: 60, sm: 80, md: 100 },
								color: '#667eea',
								animation: 'pulse 2s ease-in-out infinite',
								'@keyframes pulse': {
									'0%, 100%': {
										opacity: 1,
									},
									'50%': {
										opacity: 0.5,
									},
								},
							}}
						/>
					</Box>

					{/* Title */}
					<Typography
						variant='h3'
						component='h1'
						gutterBottom
						sx={{
							fontWeight: 700,
							color: '#2d3748',
							fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
							mb: 2,
						}}
					>
						{messages.title}
					</Typography>

					{/* Subtitle */}
					<Typography
						variant='h6'
						sx={{
							color: '#718096',
							mb: 4,
							fontSize: { xs: '0.875rem', sm: '1rem', md: '1.25rem' },
						}}
					>
						{messages.subtitle}
					</Typography>

					{/* Message */}
					<Typography
						variant='body1'
						sx={{
							color: '#4a5568',
							fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
							lineHeight: 1.8,
							whiteSpace: 'pre-line',
						}}
					>
						{showDefault ? messages.message : customMessage || messages.message}
					</Typography>

					{/* Developer Message (only shown when custom message is active) */}
					{!showDefault && maintenanceInfo && maintenanceInfo.developerMessage && (
						<Box
							sx={{
								mt: 4,
								pt: 3,
								borderTop: '2px solid #e2e8f0',
							}}
						>
							<Typography
								variant='body2'
								sx={{
									color: '#667eea',
									fontStyle: 'italic',
									fontSize: { xs: '0.75rem', sm: '0.875rem' },
								}}
							>
								{maintenanceInfo.developerMessage}
							</Typography>
						</Box>
					)}

					{/* Status Indicator */}
					<Box
						sx={{
							mt: 4,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 1,
						}}
					>
						<Box
							sx={{
								width: 12,
								height: 12,
								borderRadius: '50%',
								backgroundColor: '#f59e0b',
								animation: 'blink 1.5s ease-in-out infinite',
								'@keyframes blink': {
									'0%, 100%': {
										opacity: 1,
									},
									'50%': {
										opacity: 0.3,
									},
								},
							}}
						/>
						<Typography
							variant='caption'
							sx={{
								color: '#a0aec0',
								fontSize: { xs: '0.6875rem', sm: '0.75rem' },
							}}
						>
							{language === 'ja' ? 'システム状態: メンテナンス中' : language === 'en' ? 'System Status: Maintenance' : 'Tizim holati: Texnik xizmat'}
						</Typography>
					</Box>
				</Paper>
			</Container>
		</Box>
	)
}

export default PublicMaintenancePage
