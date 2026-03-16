'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MailServiceSettings', 'recipient_snapshot', {
			type: Sequelize.TEXT,
			allowNull: true,
			comment: 'JSON array of student IDs (primary key) who were public when periodic email was last saved. Used for 更新催促定期メール.',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('MailServiceSettings', 'recipient_snapshot')
	},
}
