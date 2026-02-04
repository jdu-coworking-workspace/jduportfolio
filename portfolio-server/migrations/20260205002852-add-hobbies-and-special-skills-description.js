'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('Students', 'hobbies_description', {
			type: Sequelize.TEXT,
			allowNull: true,
		})

		await queryInterface.addColumn('Students', 'special_skills_description', {
			type: Sequelize.TEXT,
			allowNull: true,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Students', 'hobbies_description')
		await queryInterface.removeColumn('Students', 'special_skills_description')
	},
}
