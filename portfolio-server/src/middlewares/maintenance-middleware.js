const path = require('path')
const fs = require('fs')

/**
 * Maintenance middleware that short-circuits requests when maintenance is enabled
 * Excludes the /api/maintenance endpoint itself to allow frontend to check status
 */
const maintenanceMiddleware = (req, res, next) => {
	// Allow the maintenance endpoint itself to be accessed
	if (req.path === '/api/maintenance' || req.path.startsWith('/api/maintenance/')) {
		return next()
	}

	try {
		const configPath = path.join(__dirname, '../config/maintenance.json')
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

		if (config.enabled) {
			return res.status(503).json({
				error: 'Service Unavailable',
				message: config.message,
				messageEn: config.messageEn,
				messageUz: config.messageUz,
				maintenance: true,
			})
		}
	} catch (error) {
		// If config file doesn't exist or is invalid, continue normally
		console.error('Error reading maintenance config:', error)
	}

	next()
}

module.exports = maintenanceMiddleware
