'use strict'

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction()
		try {
			// 1. Add parent_recruiter_id column to Companies
			await queryInterface.addColumn(
				'Companies',
				'parent_recruiter_id',
				{
					type: Sequelize.INTEGER,
					allowNull: true,
					references: {
						model: 'Recruiters',
						key: 'id',
					},
					onUpdate: 'CASCADE',
					onDelete: 'SET NULL',
				},
				{ transaction }
			)

			// 2. Backfill parent_recruiter_id for existing companies
			// Sets the earliest registered recruiter (MIN(id)) as the parent recruiter
			await queryInterface.sequelize.query(
				`
				UPDATE "Companies" c
				SET "parent_recruiter_id" = sub.min_recruiter_id
				FROM (
					SELECT "companyId", MIN("id") AS min_recruiter_id
					FROM "Recruiters"
					WHERE "companyId" IS NOT NULL
					GROUP BY "companyId"
				) sub
				WHERE c."id" = sub."companyId";
				`,
				{ transaction }
			)

			await transaction.commit()
		} catch (error) {
			await transaction.rollback()
			throw error
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction()
		try {
			await queryInterface.removeColumn('Companies', 'parent_recruiter_id', { transaction })
			await transaction.commit()
		} catch (error) {
			await transaction.rollback()
			throw error
		}
	},
}
