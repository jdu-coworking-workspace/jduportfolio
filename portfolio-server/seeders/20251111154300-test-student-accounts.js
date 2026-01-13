'use strict'
const bcrypt = require('bcrypt')

module.exports = {
	async up(queryInterface, Sequelize) {
		// Check if test student accounts already exist
		const existingStudents = await queryInterface.sequelize.query(`SELECT email FROM "Students" WHERE email LIKE 'student%@jdu.uz'`, { type: Sequelize.QueryTypes.SELECT })

		if (existingStudents.length > 0) {
			console.log('✅ Test student accounts already exist. Skipping insertion.')
			return
		}

		// Hash the password once (for all accounts)
		const hashedPassword = await bcrypt.hash('1234', 10)

		// Base date for enrollment (2020-09-01)
		const baseEnrollmentDate = new Date('2020-09-01')

		// Generate 10 test student accounts (student@jdu.uz + student01-09@jdu.uz)
		const testStudents = []

		for (let i = 0; i < 10; i++) {
			const paddedNum = i.toString().padStart(2, '0')
			const email = i === 0 ? 'student@jdu.uz' : `student${paddedNum}@jdu.uz`
			const studentId = `TEST${paddedNum}`

			testStudents.push({
				email: email,
				password: hashedPassword,
				student_id: studentId,
				first_name: `Test${paddedNum}`,
				last_name: 'Student',
				first_name_furigana: `テスト${paddedNum}`,
				last_name_furigana: 'スチューデント',
				date_of_birth: `200${i}-01-01`, // 2000-2009
				phone: `+99890123450${i}`,
				gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
				address: `${123 + i} Test Street, Tashkent, Uzbekistan`,
				parents_phone_number: `+99890123460${i}`,
				enrollment_date: baseEnrollmentDate,
				partner_university: 'Tokyo Communication University',
				partner_university_enrollment_date: new Date('2021-04-01'),
				semester: ((i % 8) + 1).toString(),
				graduation_year: (2024 + (i % 4)).toString(),
				graduation_season: i % 2 === 0 ? '春' : '秋',
				department: 'ITマネジメント学科',
				faculty: '情報マネジメント学部',
				// TUZATILDI: JSON.stringify qo'shildi
				it_skills: JSON.stringify({
					上級: [],
					中級: [],
					初級: [],
				}),
				partner_university_credits: 20 + i * 5,
				world_language_university_credits: 10 + i * 2,
				business_skills_credits: 5 + i,
				japanese_employment_credits: 8 + i,
				liberal_arts_education_credits: 12 + i * 2,
				total_credits: 55 + i * 10,
				specialized_education_credits: 0,
				active: true,
				visibility: false,
				has_pending: false,
				kintone_id: 99900 + i,
				self_introduction: `This is a test student account created for development and testing purposes. Account ID: ${studentId}`,
				other_information: 'TEST ACCOUNT - Do not use in production',
				createdAt: new Date(),
				updatedAt: new Date(),
			})
		}

		// Insert all test students
		await queryInterface.bulkInsert('Students', testStudents)

		console.log('✅ Successfully created 10 test student accounts:')
		console.log('   - student@jdu.uz (password: 1234)')
		console.log('   - student01@jdu.uz through student09@jdu.uz (password: 1234)')
	},

	async down(queryInterface, Sequelize) {
		// Remove all test student accounts
		await queryInterface.bulkDelete('Students', {
			email: {
				[Sequelize.Op.like]: 'student%@jdu.uz',
			},
		})

		console.log('✅ Removed all test student accounts')
	},
}
