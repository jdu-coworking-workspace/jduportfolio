'use strict'

const MailServiceService = require('../services/mailServiceService')

class MailServiceController {
	/**
	 * Get all mail service settings
	 */
	static async getAllSettings(req, res) {
		try {
			const settings = await MailServiceService.getAllSettings()
			res.json(settings)
		} catch (error) {
			console.error('Error fetching mail service settings:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Get a specific mail service setting by key
	 */
	static async getSetting(req, res) {
		try {
			const { key } = req.params
			const setting = await MailServiceService.getSetting(key)
			res.json(setting)
		} catch (error) {
			console.error('Error fetching mail service setting:', error)
			if (error.message.includes('not found')) {
				return res.status(404).json({ error: error.message })
			}
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Update a mail service setting
	 */
	static async updateSetting(req, res) {
		try {
			const { key } = req.params
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can update mail service settings' })
			}

			const setting = await MailServiceService.updateSetting(key, req.body, req.user)
			res.json(setting)
		} catch (error) {
			console.error('Error updating mail service setting:', error)
			if (error.message.includes('not found')) {
				return res.status(404).json({ error: error.message })
			}
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Toggle active status
	 */
	static async toggleActive(req, res) {
		try {
			const { key } = req.params
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can toggle mail service settings' })
			}

			const setting = await MailServiceService.toggleActive(key, req.user)
			res.json(setting)
		} catch (error) {
			console.error('Error toggling mail service setting:', error)
			if (error.message.includes('not found')) {
				return res.status(404).json({ error: error.message })
			}
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Condition 1: Find sent-back students who have not resubmitted in period
	 */
	static async findInactiveStudents(req, res) {
		try {
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can access this feature' })
			}

			const { periodDays } = req.query
			if (!periodDays || isNaN(Number(periodDays))) {
				return res.status(400).json({ error: 'periodDays query parameter is required and must be a number' })
			}

			const students = await MailServiceService.findInactiveStudents(Number(periodDays))
			res.json({
				count: students.length,
				students: students.map(s => ({
					id: s.id,
					student_id: s.student_id,
					email: s.email,
					name: `${s.last_name} ${s.first_name}`,
					last_activity: s.last_activity,
				})),
			})
		} catch (error) {
			console.error('Error finding inactive students:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Condition 2: Find never-active students (zero drafts ever)
	 */
	static async findNeverActiveStudents(req, res) {
		try {
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can access this feature' })
			}

			const students = await MailServiceService.findNeverActiveStudents()
			res.json({
				count: students.length,
				students: students.map(s => ({
					id: s.id,
					student_id: s.student_id,
					email: s.email,
					name: `${s.last_name} ${s.first_name}`,
					registered_at: s.registered_at,
				})),
			})
		} catch (error) {
			console.error('Error finding never-active students:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Send emails to sent-back students who have not resubmitted in period
	 */
	static async sendInactiveStudentEmails(req, res) {
		try {
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can send emails' })
			}

			const { periodDays, subject, body } = req.body
			if (!periodDays || !subject || !body) {
				return res.status(400).json({ error: 'periodDays, subject, and body are required' })
			}

			const result = await MailServiceService.sendInactiveStudentEmails(Number(periodDays), subject, body, req.user)
			res.json(result)
		} catch (error) {
			console.error('Error sending inactive student emails:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}

	/**
	 * Send emails to never-active students (Condition 2)
	 */
	static async sendNeverActiveStudentEmails(req, res) {
		try {
			const userType = req.user.userType || req.user.role
			if (!['Admin', 'Staff'].includes(userType)) {
				return res.status(403).json({ error: 'Only Admin and Staff can send emails' })
			}

			const { subject, body } = req.body
			if (!subject || !body) {
				return res.status(400).json({ error: 'subject and body are required' })
			}

			const result = await MailServiceService.sendNeverActiveStudentEmails(subject, body, req.user)
			res.json(result)
		} catch (error) {
			console.error('Error sending never-active student emails:', error)
			res.status(500).json({ error: 'Internal server error' })
		}
	}
}

module.exports = MailServiceController
