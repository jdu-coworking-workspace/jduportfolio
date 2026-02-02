'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.changeColumn(
				'Recruiters',
				'phone',
				{
					type: Sequelize.STRING,
					allowNull: true,
				},
				{ transaction }
			)
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.sequelize.transaction(async transaction => {
			// Replace nulls with empty string before re-adding the NOT NULL constraint
			await queryInterface.sequelize.query(`UPDATE "Recruiters" SET "phone" = '' WHERE "phone" IS NULL`, {
				transaction,
			})

			await queryInterface.changeColumn(
				'Recruiters',
				'phone',
				{
					type: Sequelize.STRING,
					allowNull: false,
				},
				{ transaction }
			)
		})
	},
}
