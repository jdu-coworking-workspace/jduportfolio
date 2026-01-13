'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		// CV uchun maxsus maydonlar qo'shamiz
		await queryInterface.addColumn('Students', 'cv_education', {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: [],
			comment: 'Education history for CV',
		})

		await queryInterface.addColumn('Students', 'cv_work_experience', {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: [],
			comment: 'Work experience for CV',
		})

		await queryInterface.addColumn('Students', 'cv_licenses', {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: [],
			comment: 'Licenses and certifications for CV',
		})

		await queryInterface.addColumn('Students', 'cv_projects', {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: [],
			comment: 'Projects for CV',
		})

		await queryInterface.addColumn('Students', 'cv_additional_info', {
			type: Sequelize.JSONB,
			allowNull: true,
			defaultValue: {},
			comment: 'Additional CV information (transportation, dependents, marital status, etc.)',
		})

		await queryInterface.addColumn('Students', 'address_furigana', {
			type: Sequelize.TEXT,
			allowNull: true,
			comment: 'Address in furigana for CV',
		})

		await queryInterface.addColumn('Students', 'postal_code', {
			type: Sequelize.STRING,
			allowNull: true,
			comment: 'Postal code (indeks)',
		})
	},

	async down(queryInterface, Sequelize) {
		// Rollback: fieldlarni o'chirish
		await queryInterface.removeColumn('Students', 'cv_education')
		await queryInterface.removeColumn('Students', 'cv_work_experience')
		await queryInterface.removeColumn('Students', 'cv_licenses')
		await queryInterface.removeColumn('Students', 'cv_projects')
		await queryInterface.removeColumn('Students', 'cv_additional_info')
		await queryInterface.removeColumn('Students', 'address_furigana')
		await queryInterface.removeColumn('Students', 'postal_code')
	},
}
