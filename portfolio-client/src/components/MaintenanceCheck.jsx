import { useState, useEffect } from 'react'
import PublicMaintenancePage from './PublicMaintenancePage'
import axios from '../utils/axiosUtils'

/**
 * MaintenanceCheck component that wraps the app and checks for maintenance mode
 *
 * Shows PublicMaintenancePage when:
 * 1. Backend is down (ECONNREFUSED, network errors) - Local development or production
 * 2. Maintenance mode is enabled in maintenance.json by developer
 *
 * Note: Uses PublicMaintenancePage (not Maintenance) because it renders outside
 * of LanguageProvider and AlertProvider contexts
 */
const MaintenanceCheck = ({ children }) => {
	const [isMaintenance, setIsMaintenance] = useState(false) // false = normal/checking, true = maintenance

	useEffect(() => {
		const checkMaintenance = async () => {
			try {
				const response = await axios.get('/api/maintenance')
				const data = response.data

				// If maintenance is enabled, show maintenance page
				if (data.enabled) {
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

	// Show PUBLIC maintenance page if enabled or unreachable
	// This component doesn't use contexts, so it won't crash
	if (isMaintenance) {
		return <PublicMaintenancePage />
	}

	// Normal app rendering (also shown while checking to avoid flash)
	return children
}

export default MaintenanceCheck
