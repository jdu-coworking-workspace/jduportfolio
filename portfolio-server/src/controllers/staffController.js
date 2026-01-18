const bcrypt = require('bcrypt')
const StaffService = require('../services/staffService')
const { sendStaffWelcomeEmail } = require('../utils/emailToStaff')
const generatePassword = require('generate-password')

class StaffController {
	// Webhook handler for Kintone events
	static async webhookHandler(req, res) {
		try {
			const { type, record, recordId } = req.body
			switch (type) {
				case 'ADD_RECORD': {
					const password = generatePassword.generate({
						length: 12,
						numbers: true,
						symbols: false,
						uppercase: true,
					})
					const data = {
						email: record.staffEmail?.value,
						password: password,
						first_name: record.staffFirstName?.value,
						last_name: record.staffLastName?.value,
						department: record.staffDepartment?.value,
						position: record.staffPosition?.value,
						kintone_id: record['$id']?.value,
					}
					const newStaff = await StaffService.createStaff(data)
					if (newStaff) {
						await sendStaffWelcomeEmail(newStaff.email, password, newStaff.first_name, newStaff.last_name)
					}
					return res.status(201).json(newStaff)
				}
				case 'UPDATE_RECORD': {
					const staffData = {
						email: record.staffEmail.value,
						first_name: record.staffFirstName.value,
						last_name: record.staffLastName.value,
						department: record.staffDepartment.value,
						position: record.staffPosition.value,
						kintone_id: record['$id'].value,
					}
					const updatedStaff = await StaffService.updateStaffByKintoneId(record['$id']?.value, staffData)
					if (!updatedStaff) return res.status(404).json({ message: 'Staff not found' })
					return res.status(200).json({ message: 'Updated', staff: updatedStaff })
				}
				case 'DELETE_RECORD': {
					const deletedCount = await StaffService.deleteStaffByKintoneId(recordId)
					if (deletedCount === 0) return res.status(404).json({ message: 'Staff not found' })
					return res.status(204).send()
				}
				default:
					return res.status(400).json({ message: 'Invalid event type' })
			}
		} catch (error) {
			console.error('Staff webhook error:', error)
			return res.status(500).json({ message: 'Internal Server Error' })
		}
	}

	static async getAllStaff(req, res) {
		try {
			const filter = req.query.filter ? JSON.parse(req.query.filter) : {}
			const staffList = await StaffService.getAllStaff(filter)
			res.json(staffList)
		} catch (error) {
			res.status(400).json({ error: error.message })
		}
	}

	static async getStaffById(req, res) {
		try {
			const staffId = req.params.id
			const staff = await StaffService.getStaffById(staffId)
			res.json(staff)
		} catch (error) {
			res.status(404).json({ error: error.message })
		}
	}

	static async updateStaff(req, res) {
		try {
			const { currentPassword, password, ...updateData } = req.body

			if (password) {
				const staff = await StaffService.getStaffById(req.params.id, true)
				if (!staff || !(await bcrypt.compare(currentPassword, staff.password))) {
					return res.status(400).json({ error: '現在のパスワードを入力してください' })
				}
			}
			const updatedStaff = await StaffService.updateStaff(req.params.id, {
				...updateData,
				password: password || undefined,
			})
			res.status(200).json(updatedStaff)
		} catch (error) {
			res.status(404).json({ error: error.message })
		}
	}

	static async deleteStaff(req, res) {
		try {
		} catch (error) {
			res.status(404).json({ error: error.message })
		}
	}
}

module.exports = StaffController
