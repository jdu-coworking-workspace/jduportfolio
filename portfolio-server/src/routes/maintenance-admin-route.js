const express = require('express')
const router = express.Router()
const MaintenanceController = require('../controllers/maintenanceController')
const authMiddleware = require('../middlewares/auth-middleware')

// All routes require authentication and Admin role
router.use(authMiddleware)
router.use((req, res, next) => {
	if (req.user?.userType !== 'Admin') {
		return res.status(403).json({ error: 'Forbidden: Admin access required' })
	}
	next()
})

// Admin-only routes
router.get('/', MaintenanceController.getAllAnnouncements)
router.get('/:id', MaintenanceController.getAnnouncementById)
router.post('/', MaintenanceController.upsertAnnouncement)
router.put('/:id/toggle', MaintenanceController.togglePublicStatus)

module.exports = router
