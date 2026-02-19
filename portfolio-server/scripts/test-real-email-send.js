#!/usr/bin/env node
/**
 * Test the actual email sending flow for inactive students.
 * Sends emails to students inactive for >= 17 days.
 *
 * ⚠️  This ACTUALLY sends emails via AWS SES!
 * Run only when you want to test real email delivery.
 *
 * Usage: node scripts/test-real-email-send.js [periodDays]
 */
require('dotenv').config()
const http = require('http')

const BASE_URL = `http://localhost:${process.env.PORT || 8000}`
const PERIOD_DAYS = parseInt(process.argv[2]) || 17

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

async function main() {
	console.log('📧 Real Email Send Test')
	console.log(`   Period: ${PERIOD_DAYS} days`)
	console.log(`   Server: ${BASE_URL}\n`)

	// 1. Login
	const loginRes = await request('POST', '/api/auth/login', {
		email: 'admin@jdu.uz',
		password: 'admin',
	})
	const cookieHeader = loginRes.setCookie
	let token = null
	if (cookieHeader) {
		token = cookieHeader.find(c => c.startsWith('token='))
		if (token) token = token.split(';')[0]
	}
	if (!token) {
		console.error('❌ Login failed')
		process.exit(1)
	}
	console.log('✅ Logged in as admin\n')

	// 2. Search first
	const searchRes = await request('GET', `/api/mail-service/inactive-students/search?periodDays=${PERIOD_DAYS}`, null, token)
	console.log(`🔍 Found ${searchRes.data.count} inactive students (> ${PERIOD_DAYS} days):`)
	if (searchRes.data.students) {
		searchRes.data.students.forEach((s, i) => {
			console.log(`   ${i + 1}. ${s.name} (${s.student_id}) — ${s.email} — last updated: ${s.last_updated}`)
		})
	}

	if (searchRes.data.count === 0) {
		console.log('\n⚠️  No students found. Nothing to send.')
		process.exit(0)
	}

	console.log(`\n📧 Sending emails to ${searchRes.data.count} students...`)

	// 3. Send
	const sendRes = await request(
		'POST',
		'/api/mail-service/inactive-students/send',
		{
			periodDays: PERIOD_DAYS,
			subject: 'ポートフォリオの更新をお願いします',
			body: '学生の皆さん、こんにちは。\n\nあなたのポートフォリオがしばらく更新されていないことに気づきました。\n最新の情報でポートフォリオを更新して、リクルーターがあなたを見つけやすくしてください。\n\nよろしくお願いします。\nJDUチーム',
		},
		token
	)

	console.log('\n📊 Send Result:')
	console.log(`   Total:      ${sendRes.data.total}`)
	console.log(`   Successful: ${sendRes.data.successful}`)
	console.log(`   Failed:     ${sendRes.data.failed}`)

	if (sendRes.data.failed > 0) {
		console.log('\n❌ Failed emails:')
		// The students array is returned in the response
		console.log(JSON.stringify(sendRes.data, null, 2))
	} else {
		console.log('\n🎉 All emails sent successfully!')
	}

	// Close any open connections
	try {
		const { sequelize } = require('../src/models')
		await sequelize.close()
	} catch {}
}

main().catch(err => {
	console.error('💥 Error:', err)
	process.exit(1)
})
