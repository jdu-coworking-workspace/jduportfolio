'use strict'

const { MailServiceSetting, Student, sequelize } = require('../models')
const { sendBulkEmails } = require('../utils/emailService')
const { Op } = require('sequelize')

class MailServiceService {
	/**
	 * Get a mail service setting by key
	 */
	static async getSetting(key) {
		const setting = await MailServiceSetting.findOne({ where: { key } })
		if (!setting) throw new Error(`Mail service setting '${key}' not found`)
		return setting
	}

	/**
	 * Get all mail service settings
	 */
	static async getAllSettings() {
		return await MailServiceSetting.findAll()
	}

	/**
	 * Update a mail service setting
	 */
	static async updateSetting(key, data, user) {
		const setting = await MailServiceSetting.findOne({ where: { key } })
		if (!setting) throw new Error(`Mail service setting '${key}' not found`)

		const updateData = {
			...data,
			updated_by_id: user.id,
			updated_by_type: user.userType,
		}

		await setting.update(updateData)
		return setting
	}

	/**
	 * Toggle active status for a mail service setting
	 */
	static async toggleActive(key, user) {
		const setting = await MailServiceSetting.findOne({ where: { key } })
		if (!setting) throw new Error(`Mail service setting '${key}' not found`)

		await setting.update({
			is_active: !setting.is_active,
			updated_by_id: user.id,
			updated_by_type: user.userType,
		})
		return setting
	}

	/**
	 * Convert plain text to a nicely formatted HTML email.
	 * Preserves line breaks and spaces.
	 */
	static plainTextToHtml(text) {
		if (!text) return ''
		const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
		const withBreaks = escaped.replace(/\n/g, '<br>')
		return withBreaks
	}

	/**
	 * Wrap plain text body into a styled HTML email template.
	 */
	static buildEmailHtml(plainTextBody) {
		const bodyHtml = MailServiceService.plainTextToHtml(plainTextBody)
		return `
			<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
				<div style="background-color: #1a73e8; padding: 24px 32px; border-radius: 8px 8px 0 0;">
					<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">JDU Portfolio</h1>
				</div>
				<div style="background-color: #ffffff; padding: 32px; border: 1px solid #e0e0e0; border-top: none;">
					<p style="font-size: 15px; line-height: 1.8; color: #333333; margin: 0; white-space: pre-wrap;">${bodyHtml}</p>
				</div>
				<div style="background-color: #f5f5f5; padding: 16px 32px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
					<p style="color: #888; font-size: 12px; margin: 0;">⚠ このメールはシステムによって自動的に送信されました。返信しないでください。</p>
				</div>
			</div>
		`
	}

	/**
	 * Find inactive students who are NOT public (visibility=false)
	 * and have not submitted a profile within the given period.
	 * These are students whose profile has not been updated for a long time
	 * and is still not public.
	 */
	static async findInactiveStudents(periodDays) {
		const thresholdDate = new Date()
		thresholdDate.setDate(thresholdDate.getDate() - periodDays)

		const students = await sequelize.query(
			`
			SELECT s.id, s.email, s.student_id, s.first_name, s.last_name,
			       s."updatedAt" AS last_updated
			FROM "Students" s
			WHERE s.active = true
			  AND s.visibility = false
			  AND s."updatedAt" < :thresholdDate
			  AND NOT EXISTS (
			    SELECT 1 FROM "Drafts" d
			    WHERE d.student_id = s.student_id
			      AND d.status = 'submitted'
			      AND d."updated_at" >= :thresholdDate
			  )
			ORDER BY s."updatedAt" ASC
			`,
			{
				replacements: { thresholdDate },
				type: sequelize.QueryTypes.SELECT,
			}
		)

		return students
	}

	/**
	 * Send emails to inactive students (Tab 2 - manual trigger)
	 */
	static async sendInactiveStudentEmails(periodDays, subject, body, user) {
		const students = await MailServiceService.findInactiveStudents(periodDays)

		if (students.length === 0) {
			return { total: 0, successful: 0, failed: 0, students: [] }
		}

		const emailTasks = students.map(student => ({
			to: student.email,
			subject: subject,
			text: body,
			html: MailServiceService.buildEmailHtml(body),
		}))

		const report = await sendBulkEmails(emailTasks)

		// Update the setting with who performed this action
		await MailServiceSetting.update(
			{
				updated_by_id: user.id,
				updated_by_type: user.userType,
			},
			{ where: { key: 'inactive_student_email' } }
		)

		return {
			...report,
			students: students.map(s => ({
				id: s.id,
				student_id: s.student_id,
				email: s.email,
				name: `${s.last_name} ${s.first_name}`,
				last_updated: s.last_updated,
			})),
		}
	}

	/**
	 * Send periodic emails to all public students (Tab 1 - cron triggered)
	 */
	static async sendPeriodicEmails() {
		const setting = await MailServiceSetting.findOne({
			where: { key: 'periodic_email' },
		})

		if (!setting || !setting.is_active) {
			console.log('📧 Periodic email service is disabled. Skipping.')
			return null
		}

		// Find all public students (visibility=true, active=true)
		const students = await Student.findAll({
			attributes: ['id', 'email', 'student_id', 'first_name', 'last_name'],
			where: {
				visibility: true,
				active: true,
				email: { [Op.ne]: null },
			},
		})

		if (students.length === 0) {
			console.log('📧 No public students found. Skipping periodic email.')
			return { total: 0, successful: 0, failed: 0 }
		}

		const emailTasks = students.map(student => ({
			to: student.email,
			subject: setting.message_subject || 'ポートフォリオの更新について',
			text: setting.message_body || '',
			html: MailServiceService.buildEmailHtml(setting.message_body || ''),
		}))

		console.log(`📧 Sending periodic email to ${emailTasks.length} public students...`)
		const report = await sendBulkEmails(emailTasks)

		console.log('--- Periodic Email Report ---')
		console.log(`Total: ${report.total}, Successful: ${report.successful}, Failed: ${report.failed}`)
		if (report.failed > 0) {
			console.error('Failed to send to:', report.failedEmails)
		}
		console.log('--- Report End ---')

		return report
	}
}

module.exports = MailServiceService
