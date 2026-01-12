import React, { useEffect, useState } from 'react'
import { Box, Typography, Container, CircularProgress } from '@mui/material'
import styles from './Maintenance.module.css'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'

const Maintenance = () => {
	// Get language from localStorage directly since UserContext may not be available yet
	const [language] = useState(() => localStorage.getItem('language') || 'ja')
	const t = translations[language] || translations.ja
	const [maintenanceData, setMaintenanceData] = useState(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const checkMaintenance = async () => {
			try {
				const response = await axios.get('/api/maintenance')
				setMaintenanceData(response.data)
			} catch (error) {
				// If endpoint is unreachable, assume maintenance mode
				// Only log if it's not a network/server error (backend might be down)
				if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED' && error.response?.status !== 500 && error.response?.status !== 502 && error.response?.status !== 503 && error.response?.status !== 504) {
					console.error('Failed to fetch maintenance status:', error)
				}
				setMaintenanceData({
					enabled: true,
					message: 'システムは現在メンテナンス中です。しばらくしてから再度お試しください。',
					messageEn: 'The system is currently under maintenance. Please try again later.',
					messageUz: "Tizim hozirda texnik xizmat ko'rsatish rejimida. Iltimos, keyinroq qayta urinib ko'ring.",
				})
			} finally {
				setIsLoading(false)
			}
		}

		checkMaintenance()

		// Poll every 30 seconds to check if maintenance is disabled
		const interval = setInterval(checkMaintenance, 30000)
		return () => clearInterval(interval)
	}, [])

	const getMessage = () => {
		if (!maintenanceData) return ''
		if (language === 'en') return maintenanceData.messageEn || maintenanceData.message
		if (language === 'uz') return maintenanceData.messageUz || maintenanceData.message
		return maintenanceData.message
	}

	if (isLoading) {
		return (
			<Box className={styles.maintenanceBackground}>
				<Container maxWidth='md' className={styles.maintenanceContainer}>
					<CircularProgress />
					<Typography variant='body1' sx={{ mt: 2 }}>
						{t.checkingMaintenance || 'Checking maintenance status...'}
					</Typography>
				</Container>
			</Box>
		)
	}

	return (
		<Box className={styles.maintenanceBackground}>
			<Container maxWidth='md' className={styles.maintenanceContainer}>
				<Box className={styles.iconContainer}>
					<Typography variant='h1' className={styles.icon}>
						🔧
					</Typography>
				</Box>
				<Typography variant='h3' gutterBottom className={styles.title}>
					{t.maintenanceTitle || 'メンテナンス中'}
				</Typography>
				<Typography variant='body1' className={styles.message}>
					{getMessage()}
				</Typography>
				{maintenanceData?.enabled && (
					<Box className={styles.loadingContainer}>
						<CircularProgress size={24} sx={{ mr: 1 }} />
						<Typography variant='body2' className={styles.checkingText}>
							{t.checkingStatus || '自動的に再チェック中...'}
						</Typography>
					</Box>
				)}
			</Container>
		</Box>
	)
}

export default Maintenance
