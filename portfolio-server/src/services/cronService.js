// services/CronService.js

const cron = require('node-cron')
const { Draft, Staff, sequelize } = require('../models')
const { sendBulkEmails } = require('../utils/emailService')
const { Op } = require('sequelize')
const MailServiceService = require('./mailServiceService')

class CronService {
	/**
	 * "submitted" statusidagi bugungi draft'lar haqida yaponiyalik staff'larga email jo'natadi.
	 */
	static async sendTodaysDraftsSummary() {
		console.log('🚀 Running daily draft summary job for Japanese staff...')

		try {
			// 1. Bugungi kunning boshlanishi va oxirini aniqlash
			const now = new Date()
			const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
			const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

			// 2. Bugun topshirilgan draft'larni olish
			const drafts = await sequelize.query(
				`
                SELECT DISTINCT ON (student_id) * FROM "Drafts"
                WHERE status = 'submitted' AND "updated_at" >= :startOfDay AND "updated_at" <= :endOfDay
                ORDER BY student_id, "updated_at" DESC;
                `,
				{
					replacements: { startOfDay, endOfDay },
					type: sequelize.QueryTypes.SELECT,
				}
			)

			if (drafts.length === 0) {
				console.log('✅ No new drafts submitted today. Job finished.')
				return
			}

			// 3. Barcha aktiv staff xodimlarining emaillarini olish
			const staffMembers = await Staff.findAll({
				attributes: ['email'],
				where: { active: true },
			})

			if (staffMembers.length === 0) {
				console.log('⚠️ No active staff found to send emails to.')
				return
			}

			const staffEmails = staffMembers.map(staff => staff.email)
			const todayFormatted = now.toLocaleDateString('ja-JP', {
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
			})

			// >>> O'ZGARISH: Emailning HTML qismi asl yaponcha holatiga qaytarildi <<<
			const emailHtmlBody = `
            <div style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5;">
                <h2 style="color: #333;">📑 以下の学生たちがプロフィール情報を送信しました</h2>
                <p style="color: #555;">本日提出された情報:</p>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">👤 学籍番号</th>
                            <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">📅 提出日</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${drafts
													.map(
														draft => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 10px;">${draft.student_id || '不明'}</td>
                            {/* >>> YAXSHILANISH: Sana yapon auditoriyasi uchun qulay formatda chiqarilmoqda <<< */}
                            <td style="border: 1px solid #ddd; padding: 10px;">${new Date(draft.updated_at).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}</td>
                        </tr>
                        `
													)
													.join('')}
                    </tbody>
                </table>
                <p style="margin-top: 20px; color: #777;">📧 ここで情報を確認できます: <a href="https://portfolio.jdu.uz/admin">https://portfolio.jdu.uz/admin</a></p>
                <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
                <p style="color: #888; font-size: 12px;">⚠ このメールはシステムによって自動的に送信されました。返信しないでください。</p>
            </div>
            `

			// >>> O'ZGARISH: Email sarlavhasi va matni yapon tiliga o'zgartirildi <<<
			const emailTasks = staffEmails.map(email => ({
				to: email,
				subject: `📩 本日提出された学生の情報 (${todayFormatted})`,
				text: `本日提出された学生情報の一覧`,
				html: emailHtmlBody,
			}))

			if (emailTasks.length > 0) {
				console.log(`Sending daily summary to ${emailTasks.length} staff members...`)
				const report = await sendBulkEmails(emailTasks)

				console.log('--- Daily Email Report ---')
				console.log(`Total: ${report.total}, Successful: ${report.successful}, Failed: ${report.failed}`)
				if (report.failed > 0) {
					console.error('Failed to send to:', report.failedEmails)
				}
				console.log('--- Report End ---')
			}
		} catch (error) {
			console.error('❌ Error in scheduled daily draft summary job:', error)
		}
	}

	/**
	 * Cron job'ni rejalashtirish
	 */
	static scheduleJobs() {
		// Har kuni ertalab soat 6:00 da (Toshkent vaqti bilan) ishga tushadi
		cron.schedule('0 6 * * *', CronService.sendTodaysDraftsSummary, {
			scheduled: true,
			timezone: 'Asia/Tashkent',
		})

		console.log('📌 Daily draft summary job scheduled for 06:00 AM (Tashkent Time).')

		// Periodic email to public students - runs daily at 07:00 AM and checks if it's time to send
		cron.schedule('0 7 * * *', CronService.runPeriodicEmailJob, {
			scheduled: true,
			timezone: 'Asia/Tashkent',
		})
		console.log('📌 Periodic email job scheduled for 07:00 AM (Tashkent Time).')
	}

	/**
	 * Periodic email job - sends emails to public students at configured intervals
	 */
	static async runPeriodicEmailJob() {
		console.log('🚀 Running periodic email job...')
		try {
			const { MailServiceSetting } = require('../models')
			const setting = await MailServiceSetting.findOne({ where: { key: 'periodic_email' } })

			if (!setting || !setting.is_active || !setting.period_days) {
				console.log('📧 Periodic email is disabled or not configured. Skipping.')
				return
			}

			// Check if enough days have passed since last update (used as last send marker)
			const daysSinceLastUpdate = Math.floor((Date.now() - new Date(setting.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
			// Only send if the period has elapsed (or first run)
			if (daysSinceLastUpdate < setting.period_days && setting.updated_by_id !== null) {
				console.log(`📧 Only ${daysSinceLastUpdate} days since last send. Period is ${setting.period_days} days. Skipping.`)
				return
			}

			await MailServiceService.sendPeriodicEmails()

			// Update the timestamp to track when we last sent
			await setting.update({ updatedAt: new Date() })
		} catch (error) {
			console.error('❌ Error in periodic email job:', error)
		}
	}
}

module.exports = CronService
