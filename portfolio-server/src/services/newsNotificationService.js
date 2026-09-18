const { Student, Staff, Admin, Recruiter } = require('../models')
const NotificationService = require('./notificationService')
const { sendBulkEmails } = require('../utils/emailService')
const { formatNewsPublishedEmail } = require('../utils/emailToNews')
const { buildNotificationUrl } = require('../utils/notificationUrlBuilder')

const hasUsableEmail = email => typeof email === 'string' && email.trim().includes('@')

const normalizeTestEmail = value => {
	if (typeof value !== 'string') return ''
	let email = value.trim()
	// tolerate accidental leading '@' like "@name@gmail.com"
	if (/^@[^@\s]+@/.test(email)) email = email.slice(1)
	return hasUsableEmail(email) ? email : ''
}

const applyEmailTestRouting = recipients => {
	const studentTo = normalizeTestEmail(process.env.EMAIL_TEST_TO_STUDENT)
	const recruiterTo = normalizeTestEmail(process.env.EMAIL_TEST_TO_RECRUITER)
	if (!studentTo && !recruiterTo) {
		return { recipients, testMode: false, studentTo: '', recruiterTo: '' }
	}

	const routed = []
	const seen = new Set()
	for (const recipient of recipients) {
		const isRecruiter = recipient.userRole === 'recruiter'
		const target = isRecruiter ? recruiterTo : studentTo
		if (!target) continue
		const key = `${isRecruiter ? 'recruiter' : 'internal'}:${target}`
		if (seen.has(key)) continue
		seen.add(key)
		routed.push({ ...recipient, email: target })
	}

	return { recipients: routed, testMode: true, studentTo, recruiterTo }
}

const displayName = user => {
	const last = (user.last_name || '').trim()
	const first = (user.first_name || '').trim()
	return [last, first].filter(Boolean).join(' ') || 'ユーザー'
}

const buildNewsMessage = title => {
	const safeTitle = String(title || 'お知らせ').trim()
	const msgJA = `新しいお知らせが公開されました：「${safeTitle}」`
	const msgEN = `A new announcement has been published: "${safeTitle}"`
	const msgUZ = `Yangi yangilik e'lon qilindi: "${safeTitle}"`
	const msgRU = `Опубликовано новое объявление: «${safeTitle}»`
	return `【JA】${msgJA}\n【EN】${msgEN}\n【UZ】${msgUZ}\n【RU】${msgRU}`
}

class NewsNotificationService {
	static async collectRecipients(news, author) {
		const recipients = []

		const [students, staffMembers, admins] = await Promise.all([
			Student.findAll({
				where: { active: true },
				attributes: ['student_id', 'email', 'first_name', 'last_name'],
			}),
			Staff.findAll({
				where: { active: true },
				attributes: ['id', 'email', 'first_name', 'last_name'],
			}),
			Admin.findAll({
				attributes: ['id', 'email', 'first_name', 'last_name'],
			}),
		])

		for (const student of students) {
			if (!student.student_id || !hasUsableEmail(student.email)) continue
			recipients.push({
				userId: String(student.student_id),
				userRole: 'student',
				email: student.email.trim(),
				name: displayName(student),
			})
		}

		for (const staff of staffMembers) {
			if (!hasUsableEmail(staff.email)) continue
			recipients.push({
				userId: String(staff.id),
				userRole: 'staff',
				email: staff.email.trim(),
				name: displayName(staff),
			})
		}

		const authorId = author?.id
		for (const admin of admins) {
			if (authorId != null && Number(admin.id) === Number(authorId)) continue
			if (!hasUsableEmail(admin.email)) continue
			recipients.push({
				userId: String(admin.id),
				userRole: 'admin',
				email: admin.email.trim(),
				name: displayName(admin),
			})
		}

		if (news.visible_to_recruiter === true) {
			const recruiters = await Recruiter.findAll({
				where: { active: true },
				attributes: ['id', 'email', 'first_name', 'last_name'],
			})
			for (const recruiter of recruiters) {
				if (!hasUsableEmail(recruiter.email)) continue
				recipients.push({
					userId: String(recruiter.id),
					userRole: 'recruiter',
					email: recruiter.email.trim(),
					name: displayName(recruiter),
				})
			}
		}

		return recipients
	}

	/**
	 * Fire-and-forget: in-app bell + Japanese email after Admin creates news.
	 * Must never throw into the news create path.
	 */
	static async notifyAdminNewsCreated(createdNews, author) {
		try {
			if (!createdNews || author?.userType !== 'Admin') return { skipped: true }

			const news = typeof createdNews.get === 'function' ? createdNews.get({ plain: true }) : createdNews
			if (!news?.id) return { skipped: true }

			const recipients = await this.collectRecipients(news, author)
			if (recipients.length === 0) {
				console.log(`[NewsNotify] No recipients for news ${news.id}`)
				return { total: 0, notifications: 0, emails: null }
			}

			const message = buildNewsMessage(news.title)
			const now = new Date()
			const notificationRows = recipients.map(recipient => ({
				user_id: recipient.userId,
				user_role: recipient.userRole,
				type: 'news',
				message,
				status: 'unread',
				related_id: news.id,
				target_url: buildNotificationUrl({
					type: 'news',
					userRole: recipient.userRole,
					relatedId: news.id,
				}),
				createdAt: now,
			}))

			await NotificationService.bulkCreate(notificationRows)

			const routing = applyEmailTestRouting(recipients)
			if (routing.testMode) {
				console.log(`[NewsNotify] test routing: internal→${routing.studentTo || 'skip'} recruiter→${routing.recruiterTo || 'skip'} (from ${recipients.length} recipients)`)
			}

			const emailTasks = routing.recipients.map(recipient =>
				formatNewsPublishedEmail({
					email: recipient.email,
					recipientName: recipient.name,
					title: news.title,
					description: news.description,
					newsId: news.id,
				})
			)
			const emailReport = await sendBulkEmails(emailTasks)

			console.log(`[NewsNotify] news ${news.id}: notifications=${notificationRows.length}, emails total=${emailReport.total} ok=${emailReport.successful} fail=${emailReport.failed}, visible_to_recruiter=${news.visible_to_recruiter}`)

			return {
				total: recipients.length,
				notifications: notificationRows.length,
				emails: emailReport,
				testMode: routing.testMode,
				emailRecipients: routing.recipients.map(recipient => ({
					role: recipient.userRole,
					to: recipient.email,
				})),
			}
		} catch (error) {
			console.error('[NewsNotify] Failed to notify users after news create:', error)
			return { error: error.message }
		}
	}
}

module.exports = NewsNotificationService
module.exports.normalizeTestEmail = normalizeTestEmail
module.exports.applyEmailTestRouting = applyEmailTestRouting
