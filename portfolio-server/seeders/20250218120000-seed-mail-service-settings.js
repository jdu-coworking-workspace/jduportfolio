'use strict'

module.exports = {
	async up(queryInterface) {
		const now = new Date()

		// Check if settings already exist
		const [existing] = await queryInterface.sequelize.query(`SELECT key FROM "MailServiceSettings" WHERE key IN ('periodic_email', 'inactive_student_email');`)

		const toInsert = []

		if (!existing.find(r => r.key === 'periodic_email')) {
			toInsert.push({
				key: 'periodic_email',
				is_active: false,
				period_days: 30,
				day_of_week: null,
				message_subject: 'ポートフォリオの更新について',
				message_body: '<p>学生の皆さん、こんにちは。</p><p>最近のニュースや活動があれば、ぜひポートフォリオを更新してください。</p><p>よろしくお願いします。</p>',
				updated_by_id: null,
				updated_by_type: null,
				createdAt: now,
				updatedAt: now,
			})
		}

		if (!existing.find(r => r.key === 'inactive_student_email')) {
			toInsert.push({
				key: 'inactive_student_email',
				is_active: false,
				period_days: 14,
				day_of_week: 1,
				message_subject: 'ポートフォリオの更新をお願いします',
				message_body: '<p>学生の皆さん、こんにちは。</p><p>ポートフォリオが長い間更新されていません。最新の情報を追加して、採用担当者にアピールしましょう。</p><p>よろしくお願いします。</p>',
				updated_by_id: null,
				updated_by_type: null,
				createdAt: now,
				updatedAt: now,
			})
		}

		if (toInsert.length > 0) {
			await queryInterface.bulkInsert('MailServiceSettings', toInsert)
		}
	},

	async down(queryInterface) {
		await queryInterface.bulkDelete('MailServiceSettings', { key: ['periodic_email', 'inactive_student_email'] }, {})
	},
}
