'use strict'
const bcrypt = require('bcrypt')

module.exports = {
	up: async (queryInterface, Sequelize) => {
		const saltRounds = 10
		const gallery = Array.from({ length: 5 }, () => `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 101)}`)

		// 1. Insert Companies
		const companies = [
			{
				company_name: 'Example Corp',
				isPartner: false,
				company_description: 'A sample company description.',
				gallery: JSON.stringify(gallery),
				company_Address: '123 Business Street, Tokyo, Japan',
				established_Date: '2015-01-01',
				employee_Count: '50-100',
				business_overview: 'Leading technology solutions provider',
				target_audience: 'Enterprise clients and startups',
				required_skills: 'JavaScript, Node.js, React',
				welcome_skills: 'TypeScript, AWS, Docker',
				work_location: 'Tokyo office / Remote hybrid',
				work_hours: '9:00-18:00 (Flexible)',
				salary: '¥4,000,000 - ¥8,000,000',
				benefits: 'Health insurance, Transportation allowance, Learning budget',
				selection_process: 'Document screening, Technical interview, Final interview',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				company_name: 'Tech Innovations Ltd',
				isPartner: false,
				company_description: 'Innovative tech solutions for modern businesses.',
				gallery: JSON.stringify(gallery),
				company_Address: '456 Innovation Ave, Osaka, Japan',
				established_Date: '2010-05-15',
				employee_Count: '100-200',
				business_overview: 'Software development and IT consulting',
				target_audience: 'SMEs and large enterprises',
				required_skills: 'Python, Django, PostgreSQL',
				welcome_skills: 'React, Docker, Kubernetes',
				work_location: 'Osaka HQ / Remote',
				work_hours: '9:00-18:00',
				salary: '¥5,000,000 - ¥10,000,000',
				benefits: 'Full social insurance, Remote work support',
				selection_process: 'Resume screening, Technical test, Interview',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]

		await queryInterface.bulkInsert('Companies', companies, {})

		// 2. Fetch inserted companies to get their IDs
		const [insertedCompanies] = await queryInterface.sequelize.query(`SELECT id, company_name FROM "Companies" WHERE company_name IN ('Example Corp', 'Tech Innovations Ltd')`)

		const companyMap = {}
		for (const company of insertedCompanies) {
			companyMap[company.company_name] = company.id
		}

		// 3. Insert Recruiters with companyId
		const recruiters = [
			{
				email: 'john.doe@example.com',
				password: await bcrypt.hash('image.png', saltRounds),
				phone: '1234567890',
				photo: 'https://randomuser.me/api/portraits/med/men/1.jpg',
				first_name: 'John',
				last_name: 'Doe',
				date_of_birth: '1980-01-01',
				active: true,
				kintone_id: '1',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'jane.doe@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567891',
				photo: 'https://randomuser.me/api/portraits/med/women/2.jpg',
				first_name: 'Jane',
				last_name: 'Doe',
				date_of_birth: '1981-02-02',
				active: true,
				kintone_id: '2',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'mike.smith@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567892',
				photo: 'https://randomuser.me/api/portraits/med/men/3.jpg',
				first_name: 'Mike',
				last_name: 'Smith',
				date_of_birth: '1982-03-03',
				active: true,
				kintone_id: '3',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'susan.jones@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567893',
				photo: 'https://randomuser.me/api/portraits/med/women/4.jpg',
				first_name: 'Susan',
				last_name: 'Jones',
				date_of_birth: '1983-04-04',
				active: true,
				kintone_id: '4',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'peter.brown@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567894',
				photo: 'https://randomuser.me/api/portraits/med/men/5.jpg',
				first_name: 'Peter',
				last_name: 'Brown',
				date_of_birth: '1984-05-05',
				active: true,
				kintone_id: '5',
				companyId: companyMap['Tech Innovations Ltd'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'linda.white@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567895',
				photo: 'https://randomuser.me/api/portraits/med/women/6.jpg',
				first_name: 'Linda',
				last_name: 'White',
				date_of_birth: '1985-06-06',
				active: true,
				kintone_id: '6',
				companyId: companyMap['Tech Innovations Ltd'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'david.miller@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567896',
				photo: 'https://randomuser.me/api/portraits/med/men/7.jpg',
				first_name: 'David',
				last_name: 'Miller',
				date_of_birth: '1986-07-07',
				active: true,
				kintone_id: '7',
				companyId: companyMap['Tech Innovations Ltd'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'barbara.wilson@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567897',
				photo: 'https://randomuser.me/api/portraits/med/women/8.jpg',
				first_name: 'Barbara',
				last_name: 'Wilson',
				date_of_birth: '1987-08-08',
				active: true,
				kintone_id: '8',
				companyId: companyMap['Tech Innovations Ltd'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'robert.moore@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567898',
				photo: 'https://randomuser.me/api/portraits/med/men/9.jpg',
				first_name: 'Robert',
				last_name: 'Moore',
				date_of_birth: '1988-09-09',
				active: true,
				kintone_id: '9',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				email: 'patricia.taylor@example.com',
				password: await bcrypt.hash('password123', saltRounds),
				phone: '1234567899',
				photo: 'https://randomuser.me/api/portraits/med/women/10.jpg',
				first_name: 'Patricia',
				last_name: 'Taylor',
				date_of_birth: '1989-10-10',
				active: true,
				kintone_id: '10',
				companyId: companyMap['Example Corp'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]

		await queryInterface.bulkInsert('Recruiters', recruiters, {})
	},

	down: async (queryInterface, Sequelize) => {
		await queryInterface.bulkDelete(
			'Recruiters',
			{
				email: {
					[Sequelize.Op.in]: ['john.doe@example.com', 'jane.doe@example.com', 'mike.smith@example.com', 'susan.jones@example.com', 'peter.brown@example.com', 'linda.white@example.com', 'david.miller@example.com', 'barbara.wilson@example.com', 'robert.moore@example.com', 'patricia.taylor@example.com'],
				},
			},
			{}
		)
		await queryInterface.bulkDelete(
			'Companies',
			{
				company_name: {
					[Sequelize.Op.in]: ['Example Corp', 'Tech Innovations Ltd'],
				},
			},
			{}
		)
	},
}
