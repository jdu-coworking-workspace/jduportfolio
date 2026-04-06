'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('MailServiceSettings', 'schedule_day_of_month', {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: 'Day of month to send periodic email (1-28)',
		})

		await queryInterface.addColumn('MailServiceSettings', 'schedule_hour', {
			type: Sequelize.INTEGER,
			allowNull: true,
			comment: 'Hour of day to send periodic email (0-23, Tashkent time)',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeColumn('MailServiceSettings', 'schedule_hour')
		await queryInterface.removeColumn('MailServiceSettings', 'schedule_day_of_month')
	},
}
