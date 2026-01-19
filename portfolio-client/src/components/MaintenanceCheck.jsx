import { useState, useEffect } from 'react'
import MaintenancePage from './MaintenancePage'
import axios from '../utils/axiosUtils'

/**
 * MaintenanceCheck component that wraps the app and checks for maintenance mode
 * If maintenance is enabled or the endpoint is unreachable, shows maintenance page
 */
const MaintenanceCheck = ({ children }) => {
	const [isMaintenance, setIsMaintenance] = useState(false) // false = normal/checking, true = maintenance
	const [maintenanceMessage, setMaintenanceMessage] = useState({})

	useEffect(() => {
		const checkMaintenance = async () => {
			try {
				const response = await axios.get('/api/maintenance')
				const data = response.data

				// If maintenance is enabled, show maintenance page
				if (data.enabled) {
					setMaintenanceMessage({
						message: data.message,
						messageEn: data.messageEn,
						messageUz: data.messageUz,
					})
					setIsMaintenance(true)
				} else {
					setIsMaintenance(false)
				}
			} catch (error) {
				// If endpoint is unreachable (network error, 502, 503, 504, 500), assume maintenance
				// Only log if it's not a network/server error (backend might be down)
				if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED' && error.response?.status !== 500 && error.response?.status !== 502 && error.response?.status !== 503 && error.response?.status !== 504) {
					console.error('Failed to check maintenance status:', error)
				}
				// Only show maintenance page if it's a server/network error (backend might be down)
				// For other errors, assume normal operation
				if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.response?.status === 500 || error.response?.status === 502 || error.response?.status === 503 || error.response?.status === 504) {
					// Try to get message from error response (503 returns maintenance message)
					if (error.response?.data?.maintenance) {
						setMaintenanceMessage({
							message: error.response.data.message,
							messageEn: error.response.data.messageEn,
							messageUz: error.response.data.messageUz,
						})
					}
					setIsMaintenance(true)
				} else {
					setIsMaintenance(false)
				}
			}
		}

		checkMaintenance()

		// Poll every 30 seconds to check if maintenance status changes
		const interval = setInterval(checkMaintenance, 30000)

		return () => clearInterval(interval)
	}, [])

	// Show maintenance page if enabled or unreachable
	if (isMaintenance) {
		return <MaintenancePage {...maintenanceMessage} />
	}

	// Normal app rendering (also shown while checking to avoid flash)
	return children
}

export default MaintenanceCheck
