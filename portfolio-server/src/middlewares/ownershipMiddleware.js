/**
 * Middleware to check if user has permission to modify student data
 * Only the student themselves or admin/staff can edit
 */
exports.checkOwnership = async (req, res, next) => {
	try {
		const requestedStudentId = req.params.id
		const currentUser = req.user // from authMiddleware

		if (!currentUser) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
				message: 'User not authenticated',
			})
		}

		// Admin and staff can edit any student
		if (currentUser.userType === 'Admin' || currentUser.userType === 'Staff') {
			return next()
		}

		// Student: check if they're editing their own data
		// Try both student_id (from token) or lookup by id
		if (currentUser.userType === 'Student') {
			// If token has student_id, use it
			if (currentUser.student_id === requestedStudentId) {
				return next()
			}

			// Otherwise, lookup student by id and compare student_id
			const { Student } = require('../models')
			const student = await Student.findByPk(currentUser.id, {
				attributes: ['student_id'],
			})

			if (student && student.student_id === requestedStudentId) {
				return next()
			}
		}

		return res.status(403).json({
			success: false,
			error: 'Forbidden',
			message: 'You do not have permission to edit this student data',
		})
	} catch (error) {
		console.error('Ownership check error:', error)
		return res.status(500).json({
			success: false,
			error: 'Internal server error',
			message: 'Error checking ownership',
		})
	}
}
