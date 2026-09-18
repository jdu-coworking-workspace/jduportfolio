'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface) {
		await queryInterface.sequelize.query('ALTER TYPE "enum_Notifications_type" ADD VALUE IF NOT EXISTS \'news\';')
	},

	async down() {
		console.warn('⚠️ Rolling back ENUM value "news" is not supported directly in PostgreSQL')
	},
}
