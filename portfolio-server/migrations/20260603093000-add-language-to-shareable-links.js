'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('ShareableLinks', 'language', {
			type: Sequelize.STRING,
			allowNull: false,
			defaultValue: 'ja',
		})

		await queryInterface.addColumn('ShareableLinks', 'translatedPayload', {
			type: Sequelize.JSONB,
			allowNull: true,
		})

		await queryInterface.addColumn('ShareableLinks', 'translatedAt', {
			type: Sequelize.DATE,
			allowNull: true,
		})

		await queryInterface.addColumn('ShareableLinks', 'translationStatus', {
			type: Sequelize.STRING,
			allowNull: false,
			defaultValue: 'not_required',
		})

		await queryInterface.addColumn('ShareableLinks', 'translationError', {
			type: Sequelize.TEXT,
			allowNull: true,
		})

		await queryInterface.addColumn('ShareableLinks', 'sourceProfileHash', {
			type: Sequelize.STRING,
			allowNull: true,
		})

		await queryInterface.addIndex('ShareableLinks', ['studentId', 'language'], {
			unique: true,
			name: 'shareable_links_student_language_unique',
		})
	},

	async down(queryInterface) {
		await queryInterface.removeIndex('ShareableLinks', 'shareable_links_student_language_unique')
		await queryInterface.removeColumn('ShareableLinks', 'sourceProfileHash')
		await queryInterface.removeColumn('ShareableLinks', 'translationError')
		await queryInterface.removeColumn('ShareableLinks', 'translationStatus')
		await queryInterface.removeColumn('ShareableLinks', 'translatedAt')
		await queryInterface.removeColumn('ShareableLinks', 'translatedPayload')
		await queryInterface.removeColumn('ShareableLinks', 'language')
	},
}
