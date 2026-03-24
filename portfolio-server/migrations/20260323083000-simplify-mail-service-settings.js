'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MailServiceSettings', 'last_sent_at', {
			type: Sequelize.DATE,
			allowNull: true,
			comment: 'Tracks when periodic mail was last sent',
		})

		// recipient_snapshot is no longer used after simplification.
		await queryInterface.removeColumn('MailServiceSettings', 'recipient_snapshot')
	},

	async down(queryInterface) {
		await queryInterface.addColumn('MailServiceSettings', 'recipient_snapshot', {
			type: Sequelize.TEXT,
			allowNull: true,
			comment: 'Legacy snapshot data',
		})

		await queryInterface.removeColumn('MailServiceSettings', 'last_sent_at')
	},
}
