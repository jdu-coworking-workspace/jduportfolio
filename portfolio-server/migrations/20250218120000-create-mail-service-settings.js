'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('MailServiceSettings', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			key: {
				type: Sequelize.STRING,
				allowNull: false,
				unique: true,
				comment: 'Setting identifier: periodic_email | inactive_student_email',
			},
			is_active: {
				type: Sequelize.BOOLEAN,
				allowNull: false,
				defaultValue: false,
				comment: 'Whether this mail service feature is enabled',
			},
			period_days: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'Period in days for the email schedule or inactivity threshold',
			},
			day_of_week: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'Day of week to send (0=Sunday, 1=Monday, ..., 6=Saturday). Used by inactive_student_email.',
			},
			message_subject: {
				type: Sequelize.STRING,
				allowNull: true,
				comment: 'Email subject line',
			},
			message_body: {
				type: Sequelize.TEXT,
				allowNull: true,
				comment: 'Email body content (HTML supported)',
			},
			updated_by_id: {
				type: Sequelize.INTEGER,
				allowNull: true,
				comment: 'ID of the admin or staff who last updated this setting',
			},
			updated_by_type: {
				type: Sequelize.ENUM('Admin', 'Staff'),
				allowNull: true,
				comment: 'Type of user who last updated this setting',
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
		})
	},

	async down(queryInterface) {
		await queryInterface.dropTable('MailServiceSettings')
	},
}
