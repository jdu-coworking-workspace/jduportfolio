'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		const tableInfo = await queryInterface.describeTable('Students')

		if (!tableInfo.education) {
			await queryInterface.addColumn('Students', 'education', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!tableInfo.work_experience) {
			await queryInterface.addColumn('Students', 'work_experience', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!tableInfo.licenses) {
			await queryInterface.addColumn('Students', 'licenses', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!tableInfo.additional_info) {
			await queryInterface.addColumn('Students', 'additional_info', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: {},
			})
		}

		if (!tableInfo.address_furigana) {
			await queryInterface.addColumn('Students', 'address_furigana', {
				type: Sequelize.STRING,
				allowNull: true,
			})
		}

		if (!tableInfo.postal_code) {
			await queryInterface.addColumn('Students', 'postal_code', {
				type: Sequelize.STRING,
				allowNull: true,
			})
		}

		if (!tableInfo.arubaito) {
			await queryInterface.addColumn('Students', 'arubaito', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}
	},

	async down(queryInterface, Sequelize) {
		const tableInfo = await queryInterface.describeTable('Students')

		if (tableInfo.education) {
			await queryInterface.removeColumn('Students', 'education')
		}
		if (tableInfo.work_experience) {
			await queryInterface.removeColumn('Students', 'work_experience')
		}
		if (tableInfo.licenses) {
			await queryInterface.removeColumn('Students', 'licenses')
		}
		if (tableInfo.additional_info) {
			await queryInterface.removeColumn('Students', 'additional_info')
		}
		if (tableInfo.address_furigana) {
			await queryInterface.removeColumn('Students', 'address_furigana')
		}
		if (tableInfo.postal_code) {
			await queryInterface.removeColumn('Students', 'postal_code')
		}
		if (tableInfo.arubaito) {
			await queryInterface.removeColumn('Students', 'arubaito')
		}
	},
}
