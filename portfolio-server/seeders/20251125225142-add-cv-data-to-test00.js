'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		// Update only TEST00 student with CV data
		await queryInterface.bulkUpdate(
			'Students',
			{
				// CV Education
				cv_education: JSON.stringify([
					{
						year: 2020,
						month: 9,
						institution: 'Japan Digital University ITマネジメント学科',
						status: '入学',
					},
					{
						year: 2021,
						month: 4,
						institution: 'Tokyo Communication University 情報マネジメント学部',
						status: '編入',
					},
					{
						year: 2024,
						month: 3,
						institution: 'Tokyo Communication University',
						status: '卒業予定',
					},
				]),

				// CV Work Experience
				cv_work_experience: JSON.stringify([
					{
						company: 'セブンイレブン 渋谷店',
						role: 'アルバイト',
						from: '2023-07-01',
						to: '2023-08-31',
						details: 'コンビニでの接客・レジ業務を担当。日本語でのコミュニケーション能力を向上させました。',
					},
					{
						company: 'ファミリーマート 新宿店',
						role: 'アルバイト',
						from: '2023-09-01',
						to: null,
						details: '現在も継続中。商品陳列や在庫管理を担当しています。週3日勤務。',
					},
				]),

				// CV Licenses
				cv_licenses: JSON.stringify([
					{
						year: 2022,
						month: 12,
						certifacateName: 'JLPT N4',
					},
					{
						year: 2023,
						month: 7,
						certifacateName: 'JLPT N3',
					},
					{
						year: 2023,
						month: 11,
						certifacateName: 'ITパスポート',
					},
					{
						year: 2024,
						month: 1,
						certifacateName: '基本情報技術者試験',
					},
				]),

				// CV Projects
				cv_projects: JSON.stringify([
					{
						title: 'Portfolio Website',
						description: '個人ポートフォリオサイトの開発。ReactとNode.jsを使用して、レスポンシブデザインで実装しました。AWS EC2にデプロイし、CI/CDパイプラインを構築。',
						technologies: ['React', 'Node.js', 'PostgreSQL', 'Express', 'AWS EC2', 'Docker'],
						url: 'https://github.com/test/portfolio',
						startDate: '2023-09-01',
						endDate: '2023-12-15',
					},
					{
						title: 'E-Commerce API',
						description: 'RESTful API for e-commerce platform.  JWT authentication, Stripe payment integration, and role-based access control implemented.',
						technologies: ['Node.js', 'Express', 'MongoDB', 'JWT', 'Stripe', 'Redis'],
						url: 'https://github.com/test/ecommerce-api',
						startDate: '2024-01-10',
						endDate: '2024-03-20',
					},
					{
						title: 'Task Management App',
						description: 'チーム向けタスク管理アプリケーション。リアルタイム通知機能とドラッグ&ドロップ機能を実装。Firebase Cloud Messagingを使用したプッシュ通知。',
						technologies: ['Vue.js', 'Firebase', 'Tailwind CSS', 'Vuex', 'FCM'],
						url: 'https://github.com/test/task-manager',
						startDate: '2024-04-01',
						endDate: null,
					},
				]),

				// CV Additional Info
				cv_additional_info: JSON.stringify({
					addressFurigana: 'トウキョウトシブヤクジングウマエ',
					indeks: '150-0001',
					additionalAddress: '東京都新宿区西新宿2-8-1',
					additionalAddressFurigana: 'トウキョウトシンジュククニシシンジュク',
					additionalIndeks: '160-0023',
					additionalEmail: 'test00. sub@jdu.uz',
					transportation: '自転車通勤可能、公共交通機関利用',
					commuteTime: 30,
					numDependents: 0,
					isMarried: false,
					spousalSupportObligation: false,
					hopes: 'フルスタックエンジニアとして日本のIT企業で働きたいです。特にWebアプリケーション開発に興味があり、バックエンドからフロントエンドまで幅広く携わりたいと考えています。チームで協力しながら、ユーザーに価値を提供できるサービスを開発することが目標です。また、将来的にはプロジェクトマネージャーとしてチームをリードする経験も積みたいと考えています。',
					languageUzbek: 'Native',
					languageEnglish: 'Advanced (IELTS 6.5相当)',
					languageRussian: 'Fluent (ビジネスレベル)',
					languageJapanese: 'N3 (Intermediate, 日常会話可能)',
					tools: ['Git', 'Docker', 'VS Code', 'Postman', 'Figma', 'Jira', 'Slack', 'Notion'],
					databases: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Firebase'],
					arubaito: [
						{
							company: 'セブンイレブン',
							period: '2023年7月-8月',
							role: 'レジ・接客',
						},
						{
							company: 'ファミリーマート',
							period: '2023年9月-現在',
							role: '商品管理・接客',
						},
					],
				}),

				// Address fields
				address_furigana: 'トウキョウトシブヤクジングウマエ',
				postal_code: '150-0001',

				// Update timestamp
				updatedAt: new Date(),
			},
			{
				student_id: 'TEST00', // Only update TEST00
			}
		)

		console.log('✅ Successfully added CV data to TEST00 student')
		console.log('📋 CV Fields Updated:')
		console.log('   - cv_education: 3 entries')
		console.log('   - cv_work_experience: 2 entries')
		console.log('   - cv_licenses: 4 entries')
		console.log('   - cv_projects: 3 entries')
		console.log('   - cv_additional_info: Complete profile')
		console.log('   - address_furigana & postal_code')
	},

	async down(queryInterface, Sequelize) {
		// Remove CV data from TEST00
		await queryInterface.bulkUpdate(
			'Students',
			{
				cv_education: null,
				cv_work_experience: null,
				cv_licenses: null,
				cv_projects: null,
				cv_additional_info: null,
				address_furigana: null,
				postal_code: null,
				updatedAt: new Date(),
			},
			{
				student_id: 'TEST00',
			}
		)

		console.log('✅ Successfully removed CV data from TEST00 student')
	},
}
