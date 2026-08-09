'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const tables = ['Admins', 'Staff', 'Recruiters', 'Students']

		for (const table of tables) {
			try {
				await queryInterface.addColumn(table, 'last_login', {
					type: Sequelize.DATE,
					allowNull: true,
				})
			} catch (e) {
				if (!e.message.includes('already exists')) {
					throw e
				}
			}
		}
	},

	async down(queryInterface, Sequelize) {
		const tables = ['Admins', 'Staff', 'Recruiters', 'Students']

		for (const table of tables) {
			await queryInterface.removeColumn(table, 'last_login')
		}
	},
}
