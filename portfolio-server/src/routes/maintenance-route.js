const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')

/**
 * @swagger
 * /api/maintenance:
 *   get:
 *     summary: Get maintenance status
 *     description: Returns the current maintenance status and message
 *     tags: [Maintenance]
 *     responses:
 *       200:
 *         description: Maintenance status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   description: Whether maintenance mode is enabled
 *                 message:
 *                   type: string
 *                   description: Maintenance message in Japanese
 *                 messageEn:
 *                   type: string
 *                   description: Maintenance message in English
 *                 messageUz:
 *                   type: string
 *                   description: Maintenance message in Uzbek
 */
const MaintenanceController = require('../controllers/maintenanceController')

// Public endpoint to get active announcement (for login page)
router.get('/active', MaintenanceController.getActiveAnnouncement)

// Legacy endpoint for backward compatibility (returns JSON config)
router.get('/', (req, res) => {
	try {
		const configPath = path.join(__dirname, '../config/maintenance.json')
		const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
		res.json(config)
	} catch (error) {
		console.error('Error reading maintenance config:', error)
		// If config file doesn't exist or is invalid, assume maintenance is disabled
		res.json({
			enabled: false,
			message: 'システムは現在メンテナンス中です。しばらくしてから再度お試しください。',
			messageEn: 'The system is currently under maintenance. Please try again later.',
			messageUz: 'Tizim hozirda texnik xizmat korsatish rejimida. Iltimos, keyinroq qayta urinib koring.',
		})
	}
})

module.exports = router
