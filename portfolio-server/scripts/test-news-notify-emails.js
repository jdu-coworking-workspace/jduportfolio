#!/usr/bin/env node
/**
 * Live Admin news-create test for mail + notifications.
 *
 * Sends REAL emails via AWS SES, but only to:
 *   EMAIL_TEST_TO_STUDENT
 *   EMAIL_TEST_TO_RECRUITER
 *
 * Case A: visible_to_recruiter=true  → both inboxes
 * Case B: visible_to_recruiter=false → student inbox only
 *
 * Usage: node scripts/test-news-notify-emails.js
 */
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const { Admin, Student, Staff, Recruiter, Notification, sequelize } = require('../src/models')
const NewsService = require('../src/services/newsService')
const { normalizeTestEmail } = require('../src/services/newsNotificationService')

const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const studentInbox = normalizeTestEmail(process.env.EMAIL_TEST_TO_STUDENT)
const recruiterInbox = normalizeTestEmail(process.env.EMAIL_TEST_TO_RECRUITER)

let passed = 0
let failed = 0

function assert(condition, name, detail = '') {
	if (condition) {
		passed++
		console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`)
	} else {
		failed++
		console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`)
	}
}

function sentAddresses(report) {
	const ok = report?.emails?.successfulEmails || []
	return ok.map(item => item.to)
}

async function createAsAdmin(admin, { title, description, visibleToRecruiter }) {
	const news = await NewsService.createNews(
		{
			title,
			description,
			visible_to_recruiter: visibleToRecruiter,
			source_link: '',
			hashtags: ['#test', '#news-notify'],
		},
		{ originalname: 'test-news.png', buffer: TINY_PNG },
		{ id: admin.id, userType: 'Admin' }
	)
	const notifyReport = news.notifyPromise ? await news.notifyPromise : { error: 'notifyPromise missing' }
	return { news, notifyReport }
}

async function main() {
	console.log('Admin news create — live mail + notification test')
	console.log(`  FROM: ${process.env.EMAIL_FROM}`)
	console.log(`  STUDENT inbox: ${studentInbox || '(missing EMAIL_TEST_TO_STUDENT)'}`)
	console.log(`  RECRUITER inbox: ${recruiterInbox || '(missing EMAIL_TEST_TO_RECRUITER)'}`)
	console.log('')

	assert(Boolean(studentInbox), 'EMAIL_TEST_TO_STUDENT is set')
	assert(Boolean(recruiterInbox), 'EMAIL_TEST_TO_RECRUITER is set')
	if (!studentInbox || !recruiterInbox) {
		process.exit(1)
	}

	const admin = (await Admin.findOne({ where: { email: 'admin@jdu.uz' } })) || (await Admin.findOne())
	if (!admin) {
		console.error('No Admin user in DB')
		process.exit(1)
	}

	const [studentCount, staffCount, recruiterCount] = await Promise.all([Student.count({ where: { active: true } }), Staff.count({ where: { active: true } }), Recruiter.count({ where: { active: true } })])
	console.log(`  Active recipients in DB: students=${studentCount} staff=${staffCount} recruiters=${recruiterCount}`)
	console.log(`  Creating as Admin id=${admin.id} ${admin.email}\n`)

	assert(studentCount + staffCount + recruiterCount > 0, 'DB has at least one active recipient')
	assert(recruiterCount > 0, 'DB has active recruiters (needed for visible_to_recruiter=true case)')

	console.log('Case A: visible_to_recruiter = true (university / everyone)')
	const caseA = await createAsAdmin(admin, {
		title: '[TEST] 全員向けお知らせ',
		description: 'リクルーターにも見えるテストニュースです。',
		visibleToRecruiter: true,
	})
	console.log(`  news id=${caseA.news.id}`)
	if (caseA.notifyReport.error) {
		assert(false, 'Case A notify completed', caseA.notifyReport.error)
	} else {
		const to = sentAddresses(caseA.notifyReport)
		const roles = (caseA.notifyReport.emailRecipients || []).map(item => item.role)
		assert(caseA.notifyReport.testMode === true, 'Case A used test email routing')
		assert(caseA.news.visible_to_recruiter === true, 'Case A news flag is true')
		assert(to.includes(studentInbox), 'Case A SES delivered to student inbox', to.join(', ') || 'none')
		assert(to.includes(recruiterInbox), 'Case A SES delivered to recruiter inbox', to.join(', ') || 'none')
		assert(roles.includes('recruiter'), 'Case A email routing included a recruiter recipient')
		assert((caseA.notifyReport.emails?.failed || 0) === 0, 'Case A had no SES failures', JSON.stringify(caseA.notifyReport.emails?.failedEmails || []))
		const recruiterBells = await Notification.count({
			where: { type: 'news', related_id: caseA.news.id, user_role: 'recruiter' },
		})
		assert(recruiterBells > 0, 'Case A created recruiter bell notifications', `count=${recruiterBells}`)
	}

	console.log('\nCase B: visible_to_recruiter = false (hidden from recruiters)')
	const caseB = await createAsAdmin(admin, {
		title: '[TEST] リクルーター以外向けお知らせ',
		description: 'リクルーターには見えないテストニュースです。',
		visibleToRecruiter: false,
	})
	console.log(`  news id=${caseB.news.id}`)
	if (caseB.notifyReport.error) {
		assert(false, 'Case B notify completed', caseB.notifyReport.error)
	} else {
		const to = sentAddresses(caseB.notifyReport)
		const roles = (caseB.notifyReport.emailRecipients || []).map(item => item.role)
		assert(caseB.notifyReport.testMode === true, 'Case B used test email routing')
		assert(caseB.news.visible_to_recruiter === false, 'Case B news flag is false')
		assert(to.includes(studentInbox), 'Case B SES delivered to student inbox', to.join(', ') || 'none')
		assert(!to.includes(recruiterInbox), 'Case B did NOT email recruiter inbox', to.join(', ') || 'none')
		assert(!roles.includes('recruiter'), 'Case B email routing had no recruiter recipient')
		assert((caseB.notifyReport.emails?.failed || 0) === 0, 'Case B had no SES failures', JSON.stringify(caseB.notifyReport.emails?.failedEmails || []))
		const recruiterBells = await Notification.count({
			where: { type: 'news', related_id: caseB.news.id, user_role: 'recruiter' },
		})
		assert(recruiterBells === 0, 'Case B created no recruiter bell notifications', `count=${recruiterBells}`)
	}

	console.log(`\nResult: ${passed} passed, ${failed} failed`)
	await sequelize.close()
	process.exit(failed > 0 ? 1 : 0)
}

main().catch(async error => {
	console.error('Live test crashed:', error)
	try {
		await sequelize.close()
	} catch {
		// ignore
	}
	process.exit(1)
})
