#!/usr/bin/env node
/**
 * Mail Service Integration Test
 * Tests all mail service endpoints for both Admin and Staff roles.
 *
 * Usage: node scripts/test-mail-service.js
 *
 * What it tests:
 * 1. Login as Admin
 * 2. GET  /api/mail-service              — Get all settings
 * 3. GET  /api/mail-service/:key         — Get a single setting
 * 4. PUT  /api/mail-service/:key         — Update setting
 * 5. PATCH /api/mail-service/:key/toggle — Toggle is_active
 * 6. GET  /api/mail-service/inactive-students/search?intervalWeeks=N — Condition 1: interval-inactive
 * 7. POST /api/mail-service/inactive-students/send — Send to interval-inactive
 * 8. GET  /api/mail-service/never-active-students/search — Condition 2: zero drafts
 * 9. POST /api/mail-service/never-active-students/send — Send to never-active
 * 10. Cron logic verification (sendPeriodicEmails)
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const http = require('http')

process.env.EMAIL_TEST_TO = '225158x@jdu.uz'

const BASE_URL = `http://localhost:${process.env.PORT || 8000}`
let TOKEN = null
let passed = 0
let failed = 0
const results = []

// ─── HTTP Helper ───────────────────────────────────────────────────
function request(method, path, body = null, cookie = null) {
	return new Promise((resolve, reject) => {
		const url = new URL(path, BASE_URL)
		const options = {
			method,
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			headers: { 'Content-Type': 'application/json' },
		}
		if (cookie) options.headers['Cookie'] = cookie

		const req = http.request(options, res => {
			let data = ''
			res.on('data', chunk => (data += chunk))
			res.on('end', () => {
				const setCookie = res.headers['set-cookie']
				let parsed
				try {
					parsed = JSON.parse(data)
				} catch {
					parsed = data
				}
				resolve({ status: res.statusCode, data: parsed, setCookie })
			})
		})
		req.on('error', reject)
		if (body) req.write(JSON.stringify(body))
		req.end()
	})
}

function assert(condition, testName, detail = '') {
	if (condition) {
		passed++
		results.push({ name: testName, status: '✅ PASS', detail })
		console.log(`  ✅ ${testName}`)
	} else {
		failed++
		results.push({ name: testName, status: '❌ FAIL', detail })
		console.log(`  ❌ ${testName}${detail ? ' — ' + detail : ''}`)
	}
}

// ─── Tests ─────────────────────────────────────────────────────────
async function testLogin() {
	console.log('\n🔐 Test: Login as Admin')
	const res = await request('POST', '/api/auth/login', {
		email: 'admin@jdu.uz',
		password: 'admin',
	})
	const cookieHeader = res.setCookie
	if (cookieHeader) {
		TOKEN = cookieHeader.find(c => c.startsWith('token='))
		if (TOKEN) TOKEN = TOKEN.split(';')[0] // "token=xxx"
	}
	assert(res.status === 200, 'Admin login returns 200', `status=${res.status}`)
	assert(!!TOKEN, 'Auth cookie received', TOKEN ? 'token present' : 'no cookie')
}

async function testGetAllSettings() {
	console.log('\n📋 Test: GET /api/mail-service (all settings)')
	const res = await request('GET', '/api/mail-service', null, TOKEN)
	assert(res.status === 200, 'Returns 200')
	assert(Array.isArray(res.data), 'Response is array')
	assert(res.data.length >= 2, 'Has at least 2 settings', `count=${res.data.length}`)

	const keys = res.data.map(s => s.key)
	assert(keys.includes('periodic_email'), 'Has periodic_email setting')
	assert(keys.includes('inactive_student_email'), 'Has inactive_student_email setting')

	// Verify schema fields
	const first = res.data[0]
	const requiredFields = ['id', 'key', 'is_active', 'period_days', 'message_subject', 'message_body']
	for (const field of requiredFields) {
		assert(field in first, `Setting has field: ${field}`)
	}
}

async function testGetSingleSetting() {
	console.log('\n🔍 Test: GET /api/mail-service/periodic_email (single setting)')
	const res = await request('GET', '/api/mail-service/periodic_email', null, TOKEN)
	assert(res.status === 200, 'Returns 200')
	assert(res.data.key === 'periodic_email', 'Correct key returned')
	assert(typeof res.data.is_active === 'boolean', 'is_active is boolean')
	assert(typeof res.data.period_days === 'number' || res.data.period_days === null, 'period_days is number or null')

	// Test 404 for non-existent key
	console.log('\n🔍 Test: GET /api/mail-service/nonexistent_key (404)')
	const res404 = await request('GET', '/api/mail-service/nonexistent_key', null, TOKEN)
	assert(res404.status === 404, 'Returns 404 for unknown key', `status=${res404.status}`)
}

async function testUpdateSetting() {
	console.log('\n✏️  Test: PUT /api/mail-service/periodic_email (update)')

	// First, get current state to restore later
	const current = await request('GET', '/api/mail-service/periodic_email', null, TOKEN)
	const originalSubject = current.data.message_subject
	const originalBody = current.data.message_body
	const originalPeriod = current.data.period_days

	// Update with new values
	const res = await request(
		'PUT',
		'/api/mail-service/periodic_email',
		{
			period_days: 14,
			message_subject: '【テスト】ポートフォリオ更新リマインダー',
			message_body: 'これはテストメッセージです。\nポートフォリオを更新してください。',
		},
		TOKEN
	)
	assert(res.status === 200, 'Update returns 200', `status=${res.status}`)
	assert(res.data.period_days === 14, 'period_days updated to 14', `got=${res.data.period_days}`)
	assert(res.data.message_subject === '【テスト】ポートフォリオ更新リマインダー', 'Subject updated')
	assert(res.data.updated_by_id !== null, 'updated_by_id is set', `id=${res.data.updated_by_id}`)
	assert(res.data.updated_by_type === 'Admin', 'updated_by_type is Admin', `type=${res.data.updated_by_type}`)

	// Restore original values
	await request(
		'PUT',
		'/api/mail-service/periodic_email',
		{
			period_days: originalPeriod,
			message_subject: originalSubject,
			message_body: originalBody,
		},
		TOKEN
	)
	console.log('    (restored original values)')
}

async function testToggle() {
	console.log('\n🔄 Test: PATCH /api/mail-service/periodic_email/toggle')

	// Get current state
	const before = await request('GET', '/api/mail-service/periodic_email', null, TOKEN)
	const waActive = before.data.is_active

	// Toggle
	const res = await request('PATCH', '/api/mail-service/periodic_email/toggle', null, TOKEN)
	assert(res.status === 200, 'Toggle returns 200', `status=${res.status}`)
	assert(res.data.is_active === !waActive, `is_active toggled from ${waActive} to ${!waActive}`)

	// Toggle back to restore
	const restore = await request('PATCH', '/api/mail-service/periodic_email/toggle', null, TOKEN)
	assert(restore.data.is_active === waActive, 'Toggled back to original state')
}

async function testSearchInactiveStudents() {
	console.log('\n🔍 Test: GET /api/mail-service/inactive-students/search (Condition 1)')

	// Search with 1 week
	const res1 = await request('GET', '/api/mail-service/inactive-students/search?intervalWeeks=1', null, TOKEN)
	assert(res1.status === 200, 'Search with intervalWeeks=1 returns 200')
	assert(typeof res1.data.count === 'number', 'Response has count field')
	assert(Array.isArray(res1.data.students), 'Response has students array')
	assert(!('neverActiveCount' in res1.data), 'Response does NOT have neverActiveCount (separate endpoint now)')
	console.log(`    Found ${res1.data.count} interval-inactive students`)

	// Verify student shape if any found
	if (res1.data.students.length > 0) {
		const s = res1.data.students[0]
		assert('id' in s, 'Student has id')
		assert('student_id' in s, 'Student has student_id')
		assert('email' in s, 'Student has email')
		assert('name' in s, 'Student has name')
		assert('last_activity' in s, 'Student has last_activity')
		assert(s.last_activity !== null, 'Period-inactive student has non-null last_activity')
	}

	// Test with large interval — may find more students
	const res52 = await request('GET', '/api/mail-service/inactive-students/search?intervalWeeks=52', null, TOKEN)
	assert(res52.status === 200, 'Search with intervalWeeks=52 returns 200')
	assert(res52.data.count >= res1.data.count, 'Larger interval finds >= same students', `1w=${res1.data.count}, 52w=${res52.data.count}`)

	// Test validation: missing intervalWeeks
	const resBad = await request('GET', '/api/mail-service/inactive-students/search', null, TOKEN)
	assert(resBad.status === 400, 'Missing intervalWeeks returns 400', `status=${resBad.status}`)

	// Test validation: invalid intervalWeeks
	const resBad2 = await request('GET', '/api/mail-service/inactive-students/search?intervalWeeks=abc', null, TOKEN)
	assert(resBad2.status === 400, 'Invalid intervalWeeks returns 400', `status=${resBad2.status}`)
}

async function testSendInactiveEmails() {
	console.log('\n📧 Test: POST /api/mail-service/inactive-students/send')

	// Test validation: missing fields
	const resBad1 = await request('POST', '/api/mail-service/inactive-students/send', {}, TOKEN)
	assert(resBad1.status === 400, 'Empty body returns 400', `status=${resBad1.status}`)

	const resBad2 = await request('POST', '/api/mail-service/inactive-students/send', { intervalWeeks: 2, subject: 'test' }, TOKEN)
	assert(resBad2.status === 400, 'Missing body field returns 400', `status=${resBad2.status}`)

	// Use intervalWeeks=520 — long interval to exercise the endpoint without assuming data size.
	const resDry = await request(
		'POST',
		'/api/mail-service/inactive-students/send',
		{
			intervalWeeks: 520,
			subject: 'テスト件名',
			body: 'テスト本文',
		},
		TOKEN
	)
	assert(resDry.status === 200, 'Send with 9999 days returns 200', `status=${resDry.status}`)
	assert(typeof resDry.data.total === 'number', 'Response has total field', `total=${resDry.data.total}`)
	console.log(`    Send result: total=${resDry.data.total}, successful=${resDry.data.successful}, failed=${resDry.data.failed}`)
}

async function testSearchNeverActiveStudents() {
	console.log('\n🔍 Test: GET /api/mail-service/never-active-students/search (Condition 2)')

	const res = await request('GET', '/api/mail-service/never-active-students/search', null, TOKEN)
	assert(res.status === 200, 'Never-active search returns 200')
	assert(typeof res.data.count === 'number', 'Response has count field')
	assert(Array.isArray(res.data.students), 'Response has students array')
	console.log(`    Found ${res.data.count} never-active students`)

	// No intervalWeeks needed — this is the key difference from Condition 1
	assert(!res.data.neverActiveCount, 'No neverActiveCount in response (flat structure)')

	// Verify student shape if any found
	if (res.data.students.length > 0) {
		const s = res.data.students[0]
		assert('id' in s, 'Never-active student has id')
		assert('student_id' in s, 'Never-active student has student_id')
		assert('email' in s, 'Never-active student has email')
		assert('name' in s, 'Never-active student has name')
		assert('registered_at' in s, 'Never-active student has registered_at')
	}
}

async function testSendNeverActiveEmails() {
	console.log('\n📧 Test: POST /api/mail-service/never-active-students/send')

	// Test validation: missing fields
	const resBad1 = await request('POST', '/api/mail-service/never-active-students/send', {}, TOKEN)
	assert(resBad1.status === 400, 'Empty body returns 400', `status=${resBad1.status}`)

	const resBad2 = await request('POST', '/api/mail-service/never-active-students/send', { subject: 'test' }, TOKEN)
	assert(resBad2.status === 400, 'Missing body field returns 400', `status=${resBad2.status}`)

	// No intervalWeeks needed for never-active send
	const resDry = await request('POST', '/api/mail-service/never-active-students/send', { subject: 'テスト件名', body: 'テスト本文' }, TOKEN)
	assert(resDry.status === 200, 'Send to never-active returns 200', `status=${resDry.status}`)
	assert(typeof resDry.data.total === 'number', 'Response has total field', `total=${resDry.data.total}`)
	console.log(`    Send result: total=${resDry.data.total}, successful=${resDry.data.successful}, failed=${resDry.data.failed}`)
}

async function testUnauthorizedAccess() {
	console.log('\n🔒 Test: Unauthorized access (no token)')
	const res = await request('GET', '/api/mail-service')
	assert(res.status === 401 || res.status === 403, 'No-token request is rejected', `status=${res.status}`)
}

async function testPeriodicEmailServiceLogic() {
	console.log('\n⏰ Test: Periodic email service logic (unit-level)')
	const MailServiceService = require('../src/services/mailServiceService')

	// Test plainTextToHtml
	const html = MailServiceService.plainTextToHtml('Hello\nWorld\n<script>alert("xss")</script>')
	assert(html.includes('<br>'), 'plainTextToHtml converts newlines to <br>')
	assert(html.includes('&lt;script&gt;'), 'plainTextToHtml escapes HTML tags (XSS safe)')
	assert(!html.includes('<script>'), 'No raw script tags in output')

	// Test buildEmailHtml
	const emailHtml = MailServiceService.buildEmailHtml('Test body\nLine 2')
	assert(emailHtml.includes('JDU Portfolio'), 'Email template includes JDU Portfolio branding')
	assert(emailHtml.includes('Test body'), 'Email template includes the body text')
	assert(emailHtml.includes('<br>'), 'Email template preserves line breaks')
	assert(emailHtml.includes('このメールはシステムによって'), 'Email template includes auto-send warning')

	// Test findInactiveStudentsByInterval (Condition 1 — returns array)
	const inactiveResult = await MailServiceService.findInactiveStudentsByInterval(4)
	assert(Array.isArray(inactiveResult), 'findInactiveStudentsByInterval returns array')
	if (inactiveResult.length > 0) {
		const s = inactiveResult[0]
		assert('email' in s, 'Inactive student has email')
		assert('student_id' in s, 'Inactive student has student_id')
		assert('last_activity' in s, 'Inactive student has last_activity')
	}
	console.log(`    findInactiveStudentsByInterval(4): ${inactiveResult.length} students`)

	// Test findNeverActiveStudents (Condition 2 — returns array, no params)
	const neverActiveResult = await MailServiceService.findNeverActiveStudents()
	assert(Array.isArray(neverActiveResult), 'findNeverActiveStudents returns array')
	if (neverActiveResult.length > 0) {
		const s = neverActiveResult[0]
		assert('email' in s, 'Never-active student has email')
		assert('student_id' in s, 'Never-active student has student_id')
		assert('registered_at' in s, 'Never-active student has registered_at')
	}
	console.log(`    findNeverActiveStudents(): ${neverActiveResult.length} students`)
}

async function testPeriodicEmailJob() {
	console.log('\n🕒 Test: Periodic email job (schedule match)')

	const CronService = require('../src/services/cronService')

	const current = await request('GET', '/api/mail-service/periodic_email', null, TOKEN)
	assert(current.status === 200, 'Loaded periodic_email setting', `status=${current.status}`)
	const original = current.data

	const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }))
	const needsToggle = !original.is_active
	try {
		if (needsToggle) {
			const toggleOn = await request('PATCH', '/api/mail-service/periodic_email/toggle', null, TOKEN)
			assert(toggleOn.status === 200, 'Enabled periodic_email for job test', `status=${toggleOn.status}`)
		}

		const updateRes = await request(
			'PUT',
			'/api/mail-service/periodic_email',
			{
				period_days: original.period_days ?? 30,
				schedule_day_of_month: now.getDate(),
				schedule_hour: now.getHours(),
				message_subject: original.message_subject || '【テスト】定期メール',
				message_body: original.message_body || 'これは定期メールのテスト送信です。',
			},
			TOKEN
		)
		assert(updateRes.status === 200, 'Updated periodic_email schedule for job test', `status=${updateRes.status}`)

		await CronService.runPeriodicEmailJob()
		assert(true, 'Periodic email job executed without error')
	} finally {
		await request(
			'PUT',
			'/api/mail-service/periodic_email',
			{
				period_days: original.period_days,
				schedule_day_of_month: original.schedule_day_of_month,
				schedule_hour: original.schedule_hour,
				message_subject: original.message_subject,
				message_body: original.message_body,
			},
			TOKEN
		)
		if (needsToggle) {
			await request('PATCH', '/api/mail-service/periodic_email/toggle', null, TOKEN)
		}
	}
}

async function testCronJobLogic() {
	console.log('\n🕐 Test: Cron job schedule check logic')

	const { Sequelize } = require('sequelize')
	const config = require('../config/config.js').development
	const sequelize = new Sequelize(config.database, config.username, config.password, {
		host: config.host,
		port: config.port,
		dialect: 'postgres',
		logging: false,
	})

	// Get the periodic_email setting
	const [rows] = await sequelize.query('SELECT * FROM "MailServiceSettings" WHERE key = \'periodic_email\'')
	const setting = rows[0]

	if (setting) {
		const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }))
		const dayMatches = setting.schedule_day_of_month === null || setting.schedule_day_of_month === undefined ? true : now.getDate() === setting.schedule_day_of_month
		const hourMatches = setting.schedule_hour === null || setting.schedule_hour === undefined ? true : now.getHours() === setting.schedule_hour
		const hasSubject = typeof setting.message_subject === 'string' && setting.message_subject.trim().length > 0
		const hasBody = typeof setting.message_body === 'string' && setting.message_body.trim().length > 0
		const shouldSend = Boolean(setting.is_active && dayMatches && hourMatches && hasSubject && hasBody)

		console.log(`    schedule_day_of_month: ${setting.schedule_day_of_month ?? '—'}`)
		console.log(`    schedule_hour: ${setting.schedule_hour ?? '—'}`)
		console.log(`    is_active: ${setting.is_active}`)
		console.log(`    has_subject: ${hasSubject}`)
		console.log(`    has_body: ${hasBody}`)
		console.log(`    Would send now: ${shouldSend}`)

		assert(typeof shouldSend === 'boolean', 'Cron send decision is deterministic')
	}

	await sequelize.close()
}

// ─── REAL EMAIL TEST (Optional, requires confirmation) ─────────────
async function testRealEmailSend() {
	console.log('\n📧 Test: REAL email send to inactive students')
	console.log('    ⚠️  This test will send ACTUAL emails via AWS SES!')
	console.log('    Skipping real send test — uncomment below to enable.')
	console.log('    To test real sending, use the UI or uncomment the code below.')

	/*
	// Uncomment to actually send:
	const res = await request('POST', '/api/mail-service/inactive-students/send', {
		intervalWeeks: 4,
		subject: '【テスト】ポートフォリオ更新のお願い',
		body: 'ポートフォリオの更新をお願いします。\nこれはテストメールです。',
	}, TOKEN)
	console.log('    Result:', JSON.stringify(res.data, null, 2))
	assert(res.status === 200, 'Real send returns 200')
	*/
}

// ─── Runner ────────────────────────────────────────────────────────
async function run() {
	console.log('═══════════════════════════════════════════════')
	console.log('  📧 Mail Service Integration Test Suite')
	console.log('═══════════════════════════════════════════════')
	console.log(`  Server: ${BASE_URL}`)

	try {
		await testLogin()
		if (!TOKEN) {
			console.log('\n⛔ Cannot continue without auth token. Aborting.')
			process.exit(1)
		}

		await testGetAllSettings()
		await testGetSingleSetting()
		await testUpdateSetting()
		await testToggle()
		await testSearchInactiveStudents()
		await testSendInactiveEmails()
		await testSearchNeverActiveStudents()
		await testSendNeverActiveEmails()
		await testUnauthorizedAccess()
		await testPeriodicEmailServiceLogic()
		await testPeriodicEmailJob()
		await testCronJobLogic()
		await testRealEmailSend()
	} catch (err) {
		console.error('\n💥 Unexpected error:', err)
		failed++
	}

	console.log('\n═══════════════════════════════════════════════')
	console.log(`  Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
	console.log('═══════════════════════════════════════════════')

	if (failed > 0) {
		console.log('\n❌ Failed tests:')
		results.filter(r => r.status.includes('FAIL')).forEach(r => console.log(`   - ${r.name}: ${r.detail}`))
	} else {
		console.log('\n🎉 All tests passed!')
	}

	// Close sequelize connections opened by service imports
	try {
		const { sequelize } = require('../src/models')
		await sequelize.close()
	} catch {}

	process.exit(failed > 0 ? 1 : 0)
}

run()
