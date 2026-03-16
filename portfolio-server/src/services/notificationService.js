const { Op } = require('sequelize')
const { Notification } = require('../models')

class NotificationService {
	static async create(data) {
		return Notification.create(data)
	}

	// static async getById(id) {
	//   return Notification.findByPk(id);
	// }

	static async getByUserId(user_id, filter = {}) {
		// Normalize to string because column type is STRING
		const normalizedUserId = user_id != null ? String(user_id) : user_id
		return Notification.findAll({
			where: { user_id: normalizedUserId, ...filter },
			order: [['createdAt', 'DESC']],
		})
	}

	static async update(id, data) {
		const notification = await Notification.findByPk(id)
		if (!notification) {
			throw new Error('Notification not found')
		}
		return notification.update(data)
	}

	static async delete(id) {
		const notification = await Notification.findByPk(id)
		if (!notification) {
			throw new Error('Notification not found')
		}
		return notification.destroy()
	}

	static async getAll() {
		return Notification.findAll()
	}

	static async markOneAsRead(notificationId, user_id) {
		const normalizedUserId = user_id != null ? String(user_id) : user_id
		const notification = await Notification.findOne({
			where: {
				id: notificationId,
				user_id: normalizedUserId,
				status: 'unread',
			},
		})

		if (!notification) return null

		await notification.update({ status: 'read' })

		return notification
	}

	static async markAllAsRead(userId, userType) {
		try {
			console.log('NotificationService.markAllAsRead - Input:', {
				userId,
				userType,
			})

			let whereClause = {}

			if (userType.toLowerCase() === 'student') {
				whereClause = {
					user_id: String(userId),
					user_role: 'student',
					status: { [Op.ne]: 'read' },
				}
			} else if (userType.toLowerCase() === 'admin') {
				whereClause = { user_id: String(userId), user_role: 'admin', status: { [Op.ne]: 'read' } }
			} else {
				whereClause = {
					user_id: String(userId),
					user_role: userType.toLowerCase(),
					status: { [Op.ne]: 'read' },
				}
			}

			console.log('NotificationService.markAllAsRead - Where clause:', whereClause)

			const [updatedCount] = await Notification.update({ status: 'read' }, { where: whereClause })

			console.log('NotificationService.markAllAsRead - Updated count:', updatedCount)
			return updatedCount
		} catch (error) {
			console.error('Error in NotificationService.markAllAsRead:', error)
			throw error
		}
	}
}

module.exports = NotificationService
