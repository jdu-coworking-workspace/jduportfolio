const NotificationService = require('../services/notificationService')
const { getStudentById } = require('../services/studentService')
const { Op } = require('sequelize')

class NotificationController {
	static async createNotification(req, res) {
		try {
			const notification = await NotificationService.create(req.body)
			return res.status(201).json(notification)
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}

	static async getNotificationsByUserId(req, res) {
		try {
			const { id, userType } = req.user

			if (!id || !userType) {
				return res.status(400).json({ error: 'User ID and user type are required' })
			}

			let user_id = id
			let user_role = userType.toLowerCase()

			if (user_role === 'student') {
				const student = await getStudentById(id)
				if (!student) {
					return res.status(404).json({ error: 'Student not found' })
				}
				user_id = student.student_id
			}

			// Do not include user_id inside filter; it's passed separately
			let filter = { status: { [Op.ne]: 'read' } }

			if (user_role === 'admin') {
				filter.user_role = 'admin'
			} else if (user_role === 'student') {
				filter.user_role = 'student'
			} else if (user_role === 'staff') {
				filter.user_role = 'staff'
			} else if (user_role === 'recruiter') {
				filter.user_role = 'recruiter'
			}

			const notifications = await NotificationService.getByUserId(user_id, filter)

			return res.status(200).json(notifications)
		} catch (error) {
			console.error('Error fetching notifications:', error)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}

	static async updateNotification(req, res) {
		try {
			const { id } = req.params
			const notification = await NotificationService.update(id, req.body)
			return res.status(200).json(notification)
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}

	static async deleteNotification(req, res) {
		try {
			const { id } = req.params
			const notification = await NotificationService.delete(id)
			return res.status(200).json({ message: 'Notification deleted', notification })
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}

	static async getAllNotifications(req, res) {
		try {
			const { userType } = req.user
			if (userType !== 'Admin') {
				return res.status(403).json({
					error: 'Permission denied. Only admin can get all notifications.',
				})
			}
			const notifications = await NotificationService.getAll()
			return res.status(200).json(notifications)
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}

	static async historyNotification(req, res) {
		try {
			const { id, userType } = req.user

			if (!id || !userType) {
				return res.status(400).json({ error: 'User ID and user type are required' })
			}

			let user_id = id
			const user_role = userType.toLowerCase()

			if (userType === 'Student') {
				const student = await getStudentById(id)
				if (!student) {
					return res.status(404).json({ error: 'Student not found' })
				}
				user_id = student.student_id
			}

			const notifications = await NotificationService.getByUserId(user_id, {
				status: 'read',
				user_role,
			})

			return res.status(200).json({
				message: notifications.length ? 'History notifications found' : 'No history notifications found',
				notifications,
			})
		} catch (error) {
			console.error('Error fetching history notifications:', error)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}

	static async markNotificationAsRead(req, res) {
		try {
			const { notificationId } = req.params
			const { id, userType } = req.user

			if (!notificationId) {
				return res.status(400).json({ error: 'Notification ID is required' })
			}

			let user_id = id

			if (userType === 'Student') {
				const student = await getStudentById(id)
				if (!student) {
					return res.status(404).json({ error: 'Student not found' })
				}
				user_id = student.student_id
			}

			const updatedNotification = await NotificationService.markOneAsRead(notificationId, user_id)

			if (!updatedNotification) {
				return res.status(404).json({ error: 'Notification not found or access denied' })
			}

			return res.status(200).json({ message: 'Notification marked as read', updatedNotification })
		} catch (error) {
			console.error('Error marking notification as read:', error)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}

	static async markNotificationAsReadAll(req, res) {
		try {
			const { id, userType } = req.user
			console.log('markNotificationAsReadAll - User info:', { id, userType })

			if (!id || !userType) {
				return res.status(400).json({ error: 'User ID and user type are required' })
			}

			let user_id = id

			if (userType === 'Student') {
				console.log('markNotificationAsReadAll - Getting student by id:', id)
				const student = await getStudentById(id)
				console.log('markNotificationAsReadAll - Found student:', student ? student.student_id : 'null')
				if (!student) {
					return res.status(404).json({ error: 'Student not found' })
				}
				user_id = student.student_id
			}

			console.log('markNotificationAsReadAll - Final user_id:', user_id, 'userType:', userType)
			const updatedCount = await NotificationService.markAllAsRead(user_id, userType)
			console.log('markNotificationAsReadAll - Updated count:', updatedCount)

			return res.status(200).json({
				message: `${updatedCount} notification(s) marked as read for this user.`,
			})
		} catch (error) {
			console.error('Error marking all notifications as read:', error)
			console.error('Error stack:', error.stack)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}

	// Staff-only: get notifications (read and unread) for a specific student by student_id
	static async historyNotificationForStudent(req, res) {
		try {
			const { userType } = req.user
			if (!userType || userType !== 'Staff') {
				return res.status(403).json({
					error: "Permission denied. Only Staff can view a student's notifications.",
				})
			}

			const { studentId } = req.params
			if (!studentId) {
				return res.status(400).json({ error: 'studentId is required' })
			}

			// Fetch both unread and read notifications for the given student_id
			const notifications = await NotificationService.getByUserId(String(studentId), { user_role: 'student' })

			return res.status(200).json({
				message: notifications.length ? 'History notifications found' : 'No history notifications found',
				notifications,
			})
		} catch (error) {
			console.error('Error fetching student history notifications:', error)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}
}

module.exports = NotificationController
