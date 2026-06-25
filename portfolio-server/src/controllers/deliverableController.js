// controllers/deliverableController.js

const DeliverableService = require('../services/deliverableService')
const { Student } = require('../models')

class DeliverableController {
	static async add(req, res, next) {
		try {
			const userType = req.user.userType.toLowerCase()
			let studentId

			if (userType === 'student') {
				const student = await Student.findByPk(req.user.id)
				if (!student) {
					return res.status(404).json({ error: "Foydalanuvchi ma'lumotlari topilmadi." })
				}
				studentId = student.student_id
			} else if (userType === 'staff' || userType === 'admin') {
				studentId = req.body.student_id
				if (!studentId) {
					return res.status(400).json({ error: 'student_id is required for staff/admin edits.' })
				}
			} else {
				return res.status(403).json({
					error: "Ruxsat yo'q. Faqat talabalar, xodimlar va adminlar bu amalni bajara oladi.",
				})
			}

			const versionType = userType === 'student' ? 'draft' : 'pending'
			const updatedDraft = await DeliverableService.addDeliverable(studentId, req.body, req.files, versionType)
			res.status(201).json(updatedDraft)
		} catch (err) {
			next(err)
		}
	}

	static async update(req, res, next) {
		try {
			const userType = req.user.userType.toLowerCase()
			let studentId

			if (userType === 'student') {
				const student = await Student.findByPk(req.user.id)
				if (!student) {
					return res.status(404).json({ error: "Foydalanuvchi ma'lumotlari topilmadi." })
				}
				studentId = student.student_id
			} else if (userType === 'staff' || userType === 'admin') {
				studentId = req.body.student_id
				if (!studentId) {
					return res.status(400).json({ error: 'student_id is required for staff/admin edits.' })
				}
			} else {
				return res.status(403).json({
					error: "Ruxsat yo'q. Faqat talabalar, xodimlar va adminlar bu amalni bajara oladi.",
				})
			}

			const { deliverableId } = req.params
			const versionType = userType === 'student' ? 'draft' : 'pending'
			const updatedDraft = await DeliverableService.updateDeliverable(studentId, deliverableId, req.body, req.files, versionType)
			res.status(200).json(updatedDraft)
		} catch (err) {
			next(err)
		}
	}

	static async remove(req, res, next) {
		try {
			const userType = req.user.userType.toLowerCase()
			let studentId

			if (userType === 'student') {
				const student = await Student.findByPk(req.user.id)
				if (!student) {
					return res.status(404).json({ error: "Foydalanuvchi ma'lumotlari topilmadi." })
				}
				studentId = student.student_id
			} else if (userType === 'staff' || userType === 'admin') {
				studentId = req.body.student_id
				if (!studentId) {
					return res.status(400).json({ error: 'student_id is required for staff/admin edits.' })
				}
			} else {
				return res.status(403).json({
					error: "Ruxsat yo'q. Faqat talabalar, xodimlar va adminlar bu amalni bajara oladi.",
				})
			}

			const { deliverableId } = req.params
			const versionType = userType === 'student' ? 'draft' : 'pending'
			const updatedDraft = await DeliverableService.removeDeliverable(studentId, deliverableId, versionType)
			res.status(200).json(updatedDraft)
		} catch (err) {
			next(err)
		}
	}
}

module.exports = DeliverableController
