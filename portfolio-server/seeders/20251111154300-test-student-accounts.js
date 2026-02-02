'use strict'

const bcrypt = require('bcrypt')

module.exports = {
	up: async (queryInterface, Sequelize) => {
		// Hash the password once (all students will have the same password: "1234")
		const salt = await bcrypt.genSalt(10)
		const hashedPassword = await bcrypt.hash('1234', salt)

		// Avval mavjud test studentlarni o'chiramiz (agar mavjud bo'lsa)
		await queryInterface.sequelize.query(`DELETE FROM "Drafts" WHERE student_id LIKE 'TEST%'`)
		await queryInterface.sequelize.query(`DELETE FROM "Students" WHERE student_id LIKE 'TEST%'`)

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
				// CV download / additional student fields
				education: JSON.stringify([
					{
						year: 2018,
						month: 4,
						status: '入学',
						institution: 'タシケント第一高等学校',
					},
					{
						year: 2021,
						month: 3,
						status: '卒業',
						institution: 'タシケント第一高等学校',
					},
					{
						year: 2021,
						month: 9,
						status: '入学',
						institution: 'Japan Digital University',
					},
				]),
				work_experience: JSON.stringify([
					{
						from: '2023-06-01',
						to: '2023-08-31',
						company: '株式会社テック',
						role: 'インターン',
						details: 'Webアプリケーション開発',
					},
				]),
				licenses: JSON.stringify([
					{
						year: 2023,
						month: 7,
						certifacateName: 'JLPT N3',
					},
					{
						year: 2023,
						month: 12,
						certifacateName: '普通自動車免許',
					},
				]),
				additional_info: JSON.stringify({
					hopes: 'フルスタックエンジニアとして日本のIT企業で働きたいです。特にWebアプリケーション開発に興味があり、バックエンドからフロントエンドまで幅広く携わりたいと考えています。チームで協力しながら、ユーザーに価値を提供できるサービスを開発することが目標です。また、将来的にはプロジェクトマネージャーとしてチームをリードする経験も積みたいと考えています。',
					tools: ['Git', 'Docker', 'VS Code', 'Postman', 'Figma', 'Jira', 'Slack', 'Notion'],
					indeks: '150-0001',
					databases: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Firebase'],
					isMarried: false,
					commuteTime: 30,
					languageUzbek: 'Native',
					numDependents: 0,
					transportation: '自転車通勤可能、公共交通機関利用',
					additionalEmail: `test${studentNumber}. sub@jdu. uz`,
					additionalPhone: '090-1234-5678',
					addressFurigana: 'トウキョウトシブヤクジングウマエ',
					languageEnglish: 'Advanced (IELTS 6.5相当)',
					languageRussian: 'Fluent (ビジネスレベル)',
					additionalIndeks: '160-0023',
					languageJapanese: 'N3 (Intermediate, 日常会話可能)',
					additionalAddress: '東京都新宿区西新宿2-8-1',
					spousalSupportObligation: false,
					additionalAddressFurigana: 'トウキョウトシンジュククニシシンジュク',
				}),
				address_furigana: 'トウキョウトシブヤク',
				postal_code: '150-0001',
				arubaito: JSON.stringify([
					{
						company: 'セブンイレブン',
						role: 'レジ・接客',
						period: '2022年4月-2023年3月',
					},
					{
						company: 'ファミリーマート',
						role: '品出し・清掃',
						period: '2023年4月-現在',
					},
				]),
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
		// Avval Drafts jadvalidan o'chirish
		await queryInterface.sequelize.query(`DELETE FROM "Drafts" WHERE student_id LIKE 'TEST%'`)

		// Keyin studentlarni o'chirish
		await queryInterface.sequelize.query(`DELETE FROM "Students" WHERE student_id LIKE 'TEST%'`)
		console.log('✅ Test student accounts removed')
	},
}
