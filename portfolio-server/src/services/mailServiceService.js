'use strict'

const { MailServiceSetting, Student, sequelize } = require('../models')
const { sendBulkEmails } = require('../utils/emailService')
const { Op } = require('sequelize')

class MailServiceService {
	/**
	 * Default rows (same as seeders/20250218120000-seed-mail-service-settings.js).
	 * Production often runs migrations without seeds, leaving an empty table; the UI then hides the periodic tab content.
	 */
	static async ensureDefaultSettings() {
		const rows = [
			{
				key: 'periodic_email',
				is_active: false,
				period_days: 30,
				day_of_week: null,
				message_subject: 'ポートフォリオの更新について',
				message_body: '学生の皆さん、こんにちは。最近のニュースや活動があれば、ぜひポートフォリオを更新してください。\nよろしくお願いします。',
			},
			{
				key: 'inactive_student_email',
				is_active: false,
				period_days: 14,
				day_of_week: 1,
				message_subject: '再提出のお願い（差し戻し後）',
				message_body: '皆さん、こんにちは。\n差し戻しになってからしばらく時間が経っていますが、まだ再提出が行われていないようです。再提出をお願いします。',
			},
			{
				key: 'never_active_student_email',
				is_active: false,
				period_days: null,
				day_of_week: null,
				message_subject: 'ポートフォリオ未着手のお知らせ',
				message_body: '皆さん、アカウントが作成されて以来、一度も触れられていない状態になっています。そのため、無視せず、速やかにポートフォリオを完成させるようお願いします。\n就職のために、これは最も重要なことの一つであることを忘れないでください。',
			},
		]

		for (const row of rows) {
			const { key, ...defaults } = row
			await MailServiceSetting.findOrCreate({
				where: { key },
				defaults,
			})
		}
	}

	/**
	 * Get a mail service setting by key
	 */
	static async getSetting(key) {
		await MailServiceService.ensureDefaultSettings()
		const setting = await MailServiceSetting.findOne({ where: { key } })
		if (!setting) throw new Error(`Mail service setting '${key}' not found`)
		return setting
	}

	/**
	 * Get all mail service settings
	 */
	static async getAllSettings() {
		await MailServiceService.ensureDefaultSettings()
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
	 * Admin may save plain text or HTML in message_body. If it looks like HTML, inject lightly sanitized fragment; otherwise escape as plain text.
	 */
	static bodyToInnerHtml(body) {
		if (body === null || body === undefined) return ''
		const s = String(body).trim()
		if (!s) return ''
		if (/<\s*[a-z][\s\S]*>/i.test(s)) {
			return s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
		}
		return MailServiceService.plainTextToHtml(s)
	}

	/**
	 * Wrap message body into a styled HTML email. Variants match mail type (定期 / 差し戻し警告 / 未着手強調).
	 * @param {string} body - plain text or HTML fragment from settings / UI
	 * @param {'periodic'|'inactive'|'never_active'} variant
	 */
	static buildEmailHtml(body, variant = 'periodic') {
		const bodyHtml = MailServiceService.bodyToInnerHtml(body)
		const footer = '<p style="color:#757575;font-size:12px;line-height:1.6;margin:0;">このメールはシステムによって自動的に送信されました。返信はできません。</p>'

		if (variant === 'periodic') {
			return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#e8f5e9;font-family:'Helvetica Neue',Arial,'Hiragino Sans','Noto Sans JP',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(46,125,50,0.12);border:1px solid #c8e6c9;">
    <tr>
      <td style="background:linear-gradient(135deg,#2e7d32 0%,#66bb6a 100%);padding:22px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">
            <span style="font-size:26px;line-height:1;vertical-align:middle;">&#128231;</span>
            <span style="color:#ffffff;font-size:18px;font-weight:700;vertical-align:middle;margin-left:10px;">JDU Portfolio</span>
          </td>
        </tr></table>
        <p style="color:#e8f5e9;font-size:13px;margin:10px 0 0 0;font-weight:500;">ご案内（定期メール）</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 8px 28px;background:#f9fff9;border-left:4px solid #43a047;">
        <p style="margin:0 0 8px 0;font-size:15px;line-height:1.85;color:#1b5e20;font-weight:600;">ポートフォリオ更新のお願い</p>
        <div style="font-size:15px;line-height:1.85;color:#263238;">${bodyHtml}</div>
      </td>
    </tr>
    <tr><td style="padding:16px 28px 24px 28px;background:#f1f8e9;">${footer}</td></tr>
  </table>
</body></html>`
		}

		if (variant === 'inactive') {
			return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#fff3e0;font-family:'Helvetica Neue',Arial,'Hiragino Sans','Noto Sans JP',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(230,81,0,0.25);border:1px solid #ffcc80;">
    <tr>
      <td style="background:linear-gradient(135deg,#e65100 0%,#ff6f00 45%,#d84315 100%);padding:22px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">
            <span style="font-size:28px;line-height:1;">&#128293;</span>
            <span style="color:#fff8e1;font-size:18px;font-weight:800;vertical-align:middle;margin-left:8px;letter-spacing:0.02em;">重要：未更新のお知らせ</span>
          </td>
        </tr></table>
        <p style="color:#ffe0b2;font-size:12px;margin:10px 0 0 0;">差し戻し後の再提出が確認できません</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 8px 28px;background:#fff8f5;border-left:4px solid #e64a19;">
        <div style="font-size:15px;line-height:1.85;color:#3e2723;">${bodyHtml}</div>
      </td>
    </tr>
    <tr><td style="padding:16px 28px 24px 28px;background:#fff3e0;">${footer}</td></tr>
  </table>
</body></html>`
		}

		// never_active — stronger warning
		return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#ffebee;font-family:'Helvetica Neue',Arial,'Hiragino Sans','Noto Sans JP',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 22px rgba(183,28,28,0.35);border:2px solid #c62828;">
    <tr>
      <td style="background:#b71c1c;padding:22px 28px;border-bottom:3px solid #7f0000;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">
            <span style="display:inline-block;width:44px;height:44px;line-height:44px;text-align:center;background:#ffcdd2;border-radius:50%;font-size:26px;">&#9888;&#65039;</span>
            <span style="color:#ffffff;font-size:18px;font-weight:800;vertical-align:middle;margin-left:12px;">至急対応：未活動（未着手）のお知らせ</span>
          </td>
        </tr></table>
        <p style="color:#ffcdd2;font-size:12px;margin:12px 0 0 0;font-weight:600;">アカウント作成後、ポートフォリオにアクセスされていない可能性があります</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 28px 8px 28px;background:#ffebee;border-left:5px solid #b71c1c;">
        <div style="font-size:15px;line-height:1.9;color:#3e2723;font-weight:500;">${bodyHtml}</div>
      </td>
    </tr>
    <tr><td style="padding:16px 28px 24px 28px;background:#fce4ec;">${footer}</td></tr>
  </table>
</body></html>`
	}

	/**
	 * Condition 1: Students who were sent back for resubmission
	 * and have not resubmitted within a specific week interval.
	 *
	 * Uses EXCLUSIVE date ranges — no overlap between intervals:
	 *   intervalWeeks=1 → returned 7–13 days ago
	 *   intervalWeeks=2 → returned 14–20 days ago
	 *   intervalWeeks=3 → returned 21–27 days ago
	 *   intervalWeeks=4 → returned 28–34 days ago
	 *
	 * Conditions:
	 * 1. active = true
	 * 2. latest "resubmission_required" falls within [rangeStart, rangeEnd]
	 * 3. no later "submitted/approved" draft after that send-back event
	 */
	static async findInactiveStudentsByInterval(intervalWeeks) {
		const now = new Date()
		// rangeEnd = intervalWeeks * 7 days ago (start of this interval, more recent boundary)
		// rangeStart = (intervalWeeks + 1) * 7 - 1 days ago (end of this interval, older boundary)
		const rangeEndDate = new Date(now)
		rangeEndDate.setDate(rangeEndDate.getDate() - intervalWeeks * 7)
		rangeEndDate.setHours(23, 59, 59, 999)

		const rangeStartDate = new Date(now)
		rangeStartDate.setDate(rangeStartDate.getDate() - ((intervalWeeks + 1) * 7 - 1))
		rangeStartDate.setHours(0, 0, 0, 0)

		const students = await sequelize.query(
			`
			SELECT s.id, s.email, s.student_id, s.first_name, s.last_name,
			       r.withdrawn_at AS last_activity
			FROM "Students" s
			JOIN LATERAL (
			  SELECT d."updated_at" AS withdrawn_at
			  FROM "Drafts" d
			  WHERE d.student_id = s.student_id
			    AND d.status = 'resubmission_required'
			  ORDER BY d."updated_at" DESC
			  LIMIT 1
			) r ON true
			WHERE s.active = true
			  AND s.email IS NOT NULL
			  AND r.withdrawn_at >= :rangeStartDate
			  AND r.withdrawn_at <= :rangeEndDate
			  AND NOT EXISTS (
			    SELECT 1 FROM "Drafts" d2
			    WHERE d2.student_id = s.student_id
			      AND d2."updated_at" > r.withdrawn_at
			      AND d2.status IN ('submitted', 'approved')
			  )
			ORDER BY last_activity ASC
			`,
			{
				replacements: { rangeStartDate, rangeEndDate },
				type: sequelize.QueryTypes.SELECT,
			}
		)

		return students
	}

	/**
	 * Condition 2: Find students who have NEVER submitted a single draft.
	 * No period needed — these students have zero draft activity ever.
	 *
	 * Conditions:
	 * 1. active = true
	 * 2. No drafts at all
	 */
	static async findNeverActiveStudents() {
		const students = await sequelize.query(
			`
			SELECT s.id, s.email, s.student_id, s.first_name, s.last_name,
			       s."createdAt" AS registered_at
			FROM "Students" s
			WHERE s.active = true
			  AND NOT EXISTS (
			    SELECT 1 FROM "Drafts" d
			    WHERE d.student_id = s.student_id
			  )
			ORDER BY s."createdAt" ASC
			`,
			{ type: sequelize.QueryTypes.SELECT }
		)

		return students
	}

	/**
	 * Send emails to interval-inactive students (Condition 1 - manual trigger)
	 * Message is composed at send-time, not read from DB settings.
	 */
	static async sendInactiveStudentEmails(intervalWeeks, subject, body, user) {
		const students = await MailServiceService.findInactiveStudentsByInterval(intervalWeeks)

		if (students.length === 0) {
			return { total: 0, successful: 0, failed: 0, students: [] }
		}

		const emailTasks = students.map(student => ({
			to: student.email,
			subject: subject,
			text: body,
			html: MailServiceService.buildEmailHtml(body, 'inactive'),
		}))

		const report = await sendBulkEmails(emailTasks)

		await MailServiceSetting.update({ updated_by_id: user.id, updated_by_type: user.userType }, { where: { key: 'inactive_student_email' } })

		return {
			...report,
			students: students.map(s => ({
				id: s.id,
				student_id: s.student_id,
				email: s.email,
				name: `${s.last_name} ${s.first_name}`,
				last_activity: s.last_activity,
			})),
		}
	}

	/**
	 * Send emails to never-active students (Condition 2 - manual trigger)
	 */
	static async sendNeverActiveStudentEmails(subject, body, user) {
		const students = await MailServiceService.findNeverActiveStudents()

		if (students.length === 0) {
			return { total: 0, successful: 0, failed: 0, students: [] }
		}

		const emailTasks = students.map(student => ({
			to: student.email,
			subject: subject,
			text: body,
			html: MailServiceService.buildEmailHtml(body, 'never_active'),
		}))

		const report = await sendBulkEmails(emailTasks)

		await MailServiceSetting.update({ updated_by_id: user.id, updated_by_type: user.userType }, { where: { key: 'never_active_student_email' } })

		return {
			...report,
			students: students.map(s => ({
				id: s.id,
				student_id: s.student_id,
				email: s.email,
				name: `${s.last_name} ${s.first_name}`,
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
			html: MailServiceService.buildEmailHtml(setting.message_body || '', 'periodic'),
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
