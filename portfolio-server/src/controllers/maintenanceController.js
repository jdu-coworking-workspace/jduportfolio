const MaintenanceService = require('../services/maintenanceService')

class MaintenanceController {
	// Get active announcement (public endpoint - for login page)
	static async getActiveAnnouncement(req, res, next) {
		try {
			const announcement = await MaintenanceService.getActiveAnnouncement()
			if (announcement) {
				res.status(200).json(announcement)
			} else {
				res.status(200).json(null)
			}
		} catch (error) {
			next(error)
		}
	}

	// Get all announcements (admin only)
	static async getAllAnnouncements(req, res, next) {
		try {
			const announcements = await MaintenanceService.getAllAnnouncements()
			res.status(200).json(announcements)
		} catch (error) {
			next(error)
		}
	}

	// Get single announcement (admin only)
	static async getAnnouncementById(req, res, next) {
		try {
			const { id } = req.params
			const announcement = await MaintenanceService.getAnnouncementById(id)
			res.status(200).json(announcement)
		} catch (error) {
			if (error.message === 'Announcement not found') {
				return res.status(404).json({ error: error.message })
			}
			next(error)
		}
	}

	// Create or update announcement (admin only)
	static async upsertAnnouncement(req, res, next) {
		try {
			const { message, is_public } = req.body

			// Validate required fields
			if (!message) {
				return res.status(400).json({ error: 'Message is required' })
			}

			const announcement = await MaintenanceService.upsertAnnouncement({
				message,
				is_public: is_public !== undefined ? is_public : false,
			})

			res.status(200).json(announcement)
		} catch (error) {
			next(error)
		}
	}

	// Toggle is_public status (admin only)
	static async togglePublicStatus(req, res, next) {
		try {
			const { id } = req.params
			const announcement = await MaintenanceService.togglePublicStatus(id)
			res.status(200).json(announcement)
		} catch (error) {
			if (error.message === 'Announcement not found') {
				return res.status(404).json({ error: error.message })
			}
			next(error)
		}
	}
}

module.exports = MaintenanceController
