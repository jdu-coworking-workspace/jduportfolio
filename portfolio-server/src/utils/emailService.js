// src/utils/emailService.js
// Email service using AWS SES v1 API with nodemailer v6.9.0

const { SES } = require('@aws-sdk/client-ses')
const nodemailer = require('nodemailer')

// 1. AWS SES Klientini sozlash
const ses = new SES({
	region: process.env.AWS_SES_REGION,
	credentials: {
		accessKeyId: process.env.AWS_SES_ACCESS_KEY,
		secretAccessKey: process.env.AWS_SES_SECRET_KEY,
	},
})

// 2. Nodemailer transportini AWS SES bilan bog'lash
const transporter = nodemailer.createTransport({
	SES: { ses, aws: require('@aws-sdk/client-ses') },
	sendingRate: 14, // AWS limitiga mos ravishda sekundiga 14 ta email
})

/**
 * Bitta email jo'natish uchun asosiy funksiya.
 * (Bu funksiya o'zgarishsiz qoladi)
 */
const sendEmail = async mailData => {
	const mailOptions = {
		from: process.env.EMAIL_FROM,
		to: mailData.to,
		subject: mailData.subject,
		text: mailData.text,
		html: mailData.html,
	}

	console.log(`[SES] Attempting to send email via AWS SES:`)
	console.log(`[SES] From: ${mailOptions.from}`)
	console.log(`[SES] To: ${mailOptions.to}`)
	console.log(`[SES] Subject: ${mailOptions.subject}`)
	console.log(`[SES] Region: ${process.env.AWS_SES_REGION}`)

	try {
		const info = await transporter.sendMail(mailOptions)
		console.log(`[SES] Email successfully sent to: ${mailData.to}`)
		console.log(`[SES] MessageId: ${info.messageId}`)
		return { success: true, to: mailData.to, messageId: info.messageId }
	} catch (error) {
		console.error(`[SES] Failed to send email to ${mailData.to}:`, error.message)
		console.error(`[SES] Error code: ${error.code}`)
		console.error(`[SES] Error stack:`, error.stack)
		return { success: false, to: mailData.to, error: error.message }
	}
}

/**
 * Ko'p sonli emaillarni parallel ravishda, samarali jo'natadi.
 * (Bu funksiya o'zgarishsiz qoladi)
 */
const sendBulkEmails = async emailTasks => {
	if (!Array.isArray(emailTasks) || emailTasks.length === 0) {
		return {
			total: 0,
			successful: 0,
			failed: 0,
			successfulEmails: [],
			failedEmails: [],
		}
	}

	const promises = emailTasks.map(task => sendEmail(task))
	const results = await Promise.allSettled(promises)

	const report = {
		total: emailTasks.length,
		successful: 0,
		failed: 0,
		successfulEmails: [],
		failedEmails: [],
	}

	// forEach o'rniga for...of tsiklini ishlatamiz. Bu yanada xavfsizroq.
	for (const result of results) {
		// Muvaffaqiyatli holatni tekshirish
		if (result.status === 'fulfilled' && result.value && result.value.success === true) {
			report.successful++
			report.successfulEmails.push(result.value)
		}
		// Xatolik holatini tekshirish
		else {
			report.failed++
			let errorInfo
			if (result.status === 'rejected') {
				// Agar promise'ning o'zi xato qaytarsa
				errorInfo = {
					success: false,
					reason: result.reason?.message || result.reason,
				}
			} else {
				// Agar sendEmail funksiyasi { success: false } qaytarsa
				errorInfo = result.value || {
					success: false,
					reason: "Noma'lum xatolik",
				}
			}
			report.failedEmails.push(errorInfo)
		}
	}

	return report
}

module.exports = {
	sendEmail,
	sendBulkEmails,
}
