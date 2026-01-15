const { Maintenance } = require('../models')

class MaintenanceService {
	// Get the current active maintenance announcement (if any)
	static async getActiveAnnouncement() {
		try {
			const announcement = await Maintenance.findOne({
				where: {
					is_public: true,
				},
				order: [['createdAt', 'DESC']], // Get the most recent one
			})
			return announcement
		} catch (error) {
			console.error('Error getting active announcement:', error)
			return null
		}
	}

	// Get all maintenance announcements (for admin)
	static async getAllAnnouncements() {
		try {
			const announcements = await Maintenance.findAll({
				order: [['createdAt', 'DESC']],
			})
			return announcements
		} catch (error) {
			console.error('Error getting all announcements:', error)
			throw error
		}
	}

	// Get a single announcement by ID
	static async getAnnouncementById(id) {
		try {
			const announcement = await Maintenance.findByPk(id)
			if (!announcement) {
				throw new Error('Announcement not found')
			}
			return announcement
		} catch (error) {
			console.error('Error getting announcement by ID:', error)
			throw error
		}
	}

	// Create or update maintenance announcement
	// Since there should only be one announcement, we'll update if exists, create if not
	static async upsertAnnouncement(data) {
		try {
			// Check if there's an existing announcement
			const existing = await Maintenance.findOne({
				order: [['createdAt', 'DESC']],
			})

			if (existing) {
				// Update existing
				await existing.update({
					message: data.message,
					is_public: data.is_public !== undefined ? data.is_public : existing.is_public,
				})
				return existing
			} else {
				// Create new
				const announcement = await Maintenance.create({
					message: data.message,
					is_public: data.is_public !== undefined ? data.is_public : false,
				})
				return announcement
			}
		} catch (error) {
			console.error('Error upserting announcement:', error)
			throw error
		}
	}

	// Toggle is_public status
	static async togglePublicStatus(id) {
		try {
			const announcement = await Maintenance.findByPk(id)
			if (!announcement) {
				throw new Error('Announcement not found')
			}
			announcement.is_public = !announcement.is_public
			await announcement.save()
			return announcement
		} catch (error) {
			console.error('Error toggling public status:', error)
			throw error
		}
	}
}

module.exports = MaintenanceService
