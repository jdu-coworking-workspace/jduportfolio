'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		const table = await queryInterface.describeTable('Students')

		// Faqat yo'q column'larni qo'shamiz (idempotent)

		if (!table.cv_education) {
			await queryInterface.addColumn('Students', 'cv_education', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!table.cv_work_experience) {
			await queryInterface.addColumn('Students', 'cv_work_experience', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!table.cv_licenses) {
			await queryInterface.addColumn('Students', 'cv_licenses', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!table.cv_projects) {
			await queryInterface.addColumn('Students', 'cv_projects', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: [],
			})
		}

		if (!table.cv_additional_info) {
			await queryInterface.addColumn('Students', 'cv_additional_info', {
				type: Sequelize.JSONB,
				allowNull: true,
				defaultValue: {},
			})
		}

		if (!table.address_furigana) {
			await queryInterface.addColumn('Students', 'address_furigana', {
				type: Sequelize.TEXT,
				allowNull: true,
			})
		}

		if (!table.postal_code) {
			await queryInterface.addColumn('Students', 'postal_code', {
				type: Sequelize.STRING,
				allowNull: true,
			})
		}

		console.log('✅ CV fields added/verified successfully')
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('Students', 'cv_education')
		await queryInterface.removeColumn('Students', 'cv_work_experience')
		await queryInterface.removeColumn('Students', 'cv_licenses')
		await queryInterface.removeColumn('Students', 'cv_projects')
		await queryInterface.removeColumn('Students', 'cv_additional_info')
		await queryInterface.removeColumn('Students', 'address_furigana')
		await queryInterface.removeColumn('Students', 'postal_code')
	},
}
