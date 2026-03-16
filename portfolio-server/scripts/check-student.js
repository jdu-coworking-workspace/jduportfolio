#!/usr/bin/env node
require('dotenv').config()
const { sequelize } = require('../src/models')

async function check() {
	// 1. Student record
	const [student] = await sequelize.query(`
		SELECT id, student_id, email, active, visibility,
		       "createdAt", "updatedAt"
		FROM "Students"
		WHERE email = 'student@jdu.uz'
	`)
	console.log('=== Student record ===')
	console.table(student)

	if (student.length > 0) {
		const sid = student[0].student_id
		console.log(`\nStudent ID: ${sid}`)
		console.log(`active: ${student[0].active}`)
		console.log(`visibility: ${student[0].visibility}`)

		// 2. All drafts for this student
		const [drafts] = await sequelize.query(`
			SELECT id, student_id, status, "created_at", "updated_at"
			FROM "Drafts"
			WHERE student_id = '${sid}'
			ORDER BY "updated_at" DESC
		`)
		console.log('\n=== Drafts for this student ===')
		if (drafts.length === 0) {
			console.log('  *** NO DRAFTS FOUND ***')
		} else {
			console.table(drafts)
		}

		// 3. Simulate the search query for period 2,3,4,7 days
		const today = new Date()
		for (const days of [2, 3, 4, 7, 8, 30]) {
			const threshold = new Date()
			threshold.setDate(threshold.getDate() - days)

			const [result] = await sequelize.query(
				`
				SELECT s.id, s.email, s.student_id, s.visibility, s.active,
				       (SELECT MAX(d."updated_at") FROM "Drafts" d WHERE d.student_id = s.student_id) AS last_activity,
				       EXISTS (SELECT 1 FROM "Drafts" d WHERE d.student_id = s.student_id) AS has_drafts,
				       NOT EXISTS (SELECT 1 FROM "Drafts" d WHERE d.student_id = s.student_id AND d."updated_at" >= :threshold) AS no_recent_drafts
				FROM "Students" s
				WHERE s.email = 'student@jdu.uz'
			`,
				{ replacements: { threshold } }
			)

			const s = result[0]
			const wouldAppear = s.active && s.visibility && s.has_drafts && s.no_recent_drafts
			console.log(`\nPeriod ${days} days (threshold: ${threshold.toISOString().split('T')[0]}):`)
			console.log(`  active=${s.active}, visibility=${s.visibility}, has_drafts=${s.has_drafts}, no_recent_drafts=${s.no_recent_drafts}`)
			console.log(`  last_activity=${s.last_activity}`)
			console.log(`  → Would appear in search: ${wouldAppear ? 'YES ✅' : 'NO ❌'}`)
			if (!wouldAppear) {
				const reasons = []
				if (!s.active) reasons.push('active=false')
				if (!s.visibility) reasons.push('visibility=false (profile not public)')
				if (!s.has_drafts) reasons.push('has NO drafts at all')
				if (!s.no_recent_drafts) reasons.push(`has draft activity after ${threshold.toISOString().split('T')[0]}`)
				console.log(`  → Reason: ${reasons.join(', ')}`)
			}
		}
	}

	await sequelize.close()
}
check()
