'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('ShareableLinks', {
			id: {
				allowNull: false,
				primaryKey: true,
				type: Sequelize.UUID,
				defaultValue: Sequelize.UUIDV4,
			},
			studentId: {
				type: Sequelize.STRING,
				allowNull: false,
				references: {
					model: 'Students',
					key: 'student_id',
				},
				onUpdate: 'CASCADE',
				onDelete: 'CASCADE',
			},
			expiresAt: {
				allowNull: false,
				type: Sequelize.DATE,
			},
			createdAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.fn('now'),
			},
			updatedAt: {
				allowNull: false,
				type: Sequelize.DATE,
				defaultValue: Sequelize.fn('now'),
			},
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable('ShareableLinks')
	},
}
