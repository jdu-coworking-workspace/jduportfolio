'use strict'

const bcrypt = require('bcrypt')

module.exports = {
	up: async (queryInterface, Sequelize) => {
		// Check if test students already exist - use specific email list to avoid false positives
		const testEmails = ['student@jdu.uz', 'student00@jdu.uz', 'student01@jdu.uz', 'student02@jdu.uz', 'student03@jdu.uz', 'student04@jdu.uz', 'student05@jdu.uz', 'student06@jdu.uz', 'student07@jdu.uz', 'student08@jdu.uz', 'student09@jdu.uz']

		const existingStudents = await queryInterface.sequelize.query(`SELECT email FROM "Students" WHERE email IN (:emails)`, {
			replacements: { emails: testEmails },
			type: Sequelize.QueryTypes.SELECT,
		})

		// If any test students already exist, skip insertion
		if (existingStudents.length > 0) {
			console.log('Test student accounts already exist. Skipping insertion.')
			return
		}

		// Hash the password once (all students will have the same password: "1234")
		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash('1234', salt)

		const testStudents = []

		// Create 10 test student accounts
		for (let i = 0; i < 10; i++) {
			const studentNumber = String(i).padStart(2, '0')
			const email = i === 0 ? 'student@jdu.uz' : `student${studentNumber}@jdu.uz`
			const studentId = `TEST${studentNumber}`

			testStudents.push({
				email: email,
				password: hashedPassword,
				student_id: studentId,
				first_name: `Test${studentNumber}`,
				last_name: 'Student',
				first_name_furigana: `テスト${studentNumber}`,
				last_name_furigana: 'スチューデント',
				date_of_birth: '2000-01-01',
				phone: '080-0000-0000',
				photo: null,
				gender: i % 2 === 0 ? 'Male' : 'Female',
				address: 'Tashkent, Uzbekistan',
				parents_phone_number: '998-90-000-0000',
				enrollment_date: '2021-04-01',
				partner_university_enrollment_date: '2021-04-01',
				semester: String((i % 8) + 1),
				partner_university: 'Tashkent State University',
				faculty: 'Information Technology',
				department: 'Computer Science',
				student_status: 'active',
				partner_university_credits: 20,
				world_language_university_credits: 10,
				business_skills_credits: 5,
				japanese_employment_credits: 5,
				liberal_arts_education_credits: 5,
				total_credits: 45,
				specialized_education_credits: 15,
				self_introduction: `I am Test Student ${studentNumber}. This is a test account for development and testing purposes.`,
				hobbies: 'Reading, Coding, Gaming',
				gallery: null,
				skills: null,
				it_skills: null,
				other_information: 'Test account - do not modify',
				other_skills: null,
				language_skills: 'English (Basic), Japanese (N5)',
				ielts: null,
				jlpt: null,
				deliverables: null,
				graduation_year: '2025年',
				graduation_season: '春',
				visibility: false, // Hidden by default
				active: false,
				has_pending: false,
				kintone_id: 99999 + i, // Unique kintone_id for each test student
				createdAt: new Date(),
				updatedAt: new Date(),
			})
		}

		await queryInterface.bulkInsert('Students', testStudents)
		console.log('✅ Successfully created 10 test student accounts')
		console.log('📧 Email pattern: student@jdu.uz, student01@jdu.uz, ..., student09@jdu.uz')
		console.log('🔑 Password for all accounts: 1234')
		console.log('🆔 Student IDs: TEST00, TEST01, ..., TEST09')
	},

	down: async (queryInterface, Sequelize) => {
		// Remove test students - use explicit email list to avoid deleting legitimate users
		const testEmails = ['student@jdu.uz', 'student00@jdu.uz', 'student01@jdu.uz', 'student02@jdu.uz', 'student03@jdu.uz', 'student04@jdu.uz', 'student05@jdu.uz', 'student06@jdu.uz', 'student07@jdu.uz', 'student08@jdu.uz', 'student09@jdu.uz']

		await queryInterface.bulkDelete('Students', {
			email: {
				[Sequelize.Op.in]: testEmails,
			},
		})
		console.log('✅ Test student accounts removed')
	},
}
