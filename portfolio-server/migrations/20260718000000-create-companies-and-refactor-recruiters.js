'use strict'

/**
 * Refactor: split flat Recruiters table into Companies (company profile)
 * and Recruiters (personal account).
 *
 * 1. Create Companies table with all company-related columns.
 * 2. Backfill Companies from existing Recruiters data
 *    (one Company per distinct company_name; field values taken from the
 *    most recently updated recruiter; isPartner = true if ANY recruiter
 *    of that company was a partner).
 * 3. Add Recruiters.companyId FK and link each recruiter to its company.
 * 4. Drop all company-related columns from Recruiters.
 */

const COMPANY_TEXT = ['company_description', 'company_Address', 'business_overview', 'target_audience', 'required_skills', 'welcome_skills', 'work_location', 'work_hours', 'salary', 'benefits', 'selection_process', 'job_description', 'probation_period', 'employment_period', 'recommended_skills', 'recommended_licenses', 'recommended_other', 'allowances', 'holidays_vacation', 'other_notes', 'application_requirements_other', 'relocation_support']

const COMPANY_STRING = ['established_Date', 'employee_Count', 'tagline', 'company_website', 'company_capital', 'company_revenue', 'company_representative', 'job_title', 'number_of_openings', 'employment_type', 'salary_increase', 'bonus', 'interview_method', 'japanese_level', 'retirement_benefit', 'telework_availability', 'housing_availability', 'airport_pickup', 'intro_page_thumbnail']

const COMPANY_JSONB = ['gallery', 'company_video_url', 'intro_page_links']

// Every column moving out of Recruiters
const ALL_MOVED_COLUMNS = ['company_name', ...COMPANY_TEXT, ...COMPANY_STRING, ...COMPANY_JSONB, 'isPartner']

module.exports = {
	async up(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction()
		try {
			// 1. Create Companies table
			const columns = {
				id: {
					type: Sequelize.INTEGER,
					autoIncrement: true,
					primaryKey: true,
					allowNull: false,
				},
				company_name: {
					type: Sequelize.STRING,
					allowNull: false,
					unique: true,
				},
				isPartner: {
					type: Sequelize.BOOLEAN,
					allowNull: false,
					defaultValue: false,
				},
			}
			COMPANY_TEXT.forEach(c => {
				columns[c] = { type: Sequelize.TEXT, allowNull: true }
			})
			COMPANY_STRING.forEach(c => {
				columns[c] = { type: Sequelize.STRING, allowNull: true }
			})
			COMPANY_JSONB.forEach(c => {
				columns[c] = {
					type: Sequelize.JSONB,
					allowNull: true,
					defaultValue: c === 'gallery' ? null : [],
				}
			})
			columns.createdAt = { type: Sequelize.DATE, allowNull: false }
			columns.updatedAt = { type: Sequelize.DATE, allowNull: false }

			await queryInterface.createTable('Companies', columns, { transaction })

			// 2. Backfill Companies from existing Recruiters.
			// Base row = most recently updated recruiter per company_name.
			// isPartner = bool_or across the group.
			const dataCols = [...COMPANY_TEXT, ...COMPANY_STRING, ...COMPANY_JSONB]
			const quoted = dataCols.map(c => `"${c}"`).join(', ')
			await queryInterface.sequelize.query(
				`
				INSERT INTO "Companies" ("company_name", "isPartner", ${quoted}, "createdAt", "updatedAt")
				SELECT DISTINCT ON (r."company_name")
					r."company_name",
					COALESCE(p."isPartner", false),
					${dataCols.map(c => `r."${c}"`).join(', ')},
					NOW(),
					NOW()
				FROM "Recruiters" r
				JOIN (
					SELECT "company_name", bool_or("isPartner") AS "isPartner"
					FROM "Recruiters"
					GROUP BY "company_name"
				) p ON p."company_name" = r."company_name"
				WHERE r."company_name" IS NOT NULL
				ORDER BY r."company_name", r."updatedAt" DESC
				`,
				{ transaction }
			)

			// 3. Add companyId FK to Recruiters and link
			await queryInterface.addColumn(
				'Recruiters',
				'companyId',
				{
					type: Sequelize.INTEGER,
					allowNull: true,
					references: { model: 'Companies', key: 'id' },
					onUpdate: 'CASCADE',
					onDelete: 'SET NULL',
				},
				{ transaction }
			)

			await queryInterface.sequelize.query(
				`
				UPDATE "Recruiters" r
				SET "companyId" = c."id"
				FROM "Companies" c
				WHERE r."company_name" = c."company_name"
				`,
				{ transaction }
			)

			// 4. Drop moved columns from Recruiters
			for (const col of ALL_MOVED_COLUMNS) {
				await queryInterface.removeColumn('Recruiters', col, { transaction })
			}

			await transaction.commit()
		} catch (error) {
			await transaction.rollback()
			throw error
		}
	},

	async down(queryInterface, Sequelize) {
		const transaction = await queryInterface.sequelize.transaction()
		try {
			// Re-add columns to Recruiters
			await queryInterface.addColumn('Recruiters', 'company_name', { type: Sequelize.STRING, allowNull: true }, { transaction })
			await queryInterface.addColumn('Recruiters', 'isPartner', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, { transaction })
			for (const col of COMPANY_TEXT) {
				await queryInterface.addColumn('Recruiters', col, { type: Sequelize.TEXT, allowNull: true }, { transaction })
			}
			for (const col of COMPANY_STRING) {
				await queryInterface.addColumn('Recruiters', col, { type: Sequelize.STRING, allowNull: true }, { transaction })
			}
			for (const col of COMPANY_JSONB) {
				await queryInterface.addColumn('Recruiters', col, { type: Sequelize.JSONB, allowNull: true }, { transaction })
			}

			// Copy company data back onto each recruiter row
			const dataCols = ['company_name', 'isPartner', ...COMPANY_TEXT, ...COMPANY_STRING, ...COMPANY_JSONB]
			await queryInterface.sequelize.query(
				`
				UPDATE "Recruiters" r
				SET ${dataCols.map(c => `"${c}" = c."${c}"`).join(', ')}
				FROM "Companies" c
				WHERE r."companyId" = c."id"
				`,
				{ transaction }
			)

			// company_name was NOT NULL before the refactor
			await queryInterface.sequelize.query(`UPDATE "Recruiters" SET "company_name" = '' WHERE "company_name" IS NULL`, { transaction })
			await queryInterface.changeColumn('Recruiters', 'company_name', { type: Sequelize.STRING, allowNull: false }, { transaction })

			await queryInterface.removeColumn('Recruiters', 'companyId', { transaction })
			await queryInterface.dropTable('Companies', { transaction })

			await transaction.commit()
		} catch (error) {
			await transaction.rollback()
			throw error
		}
	},
}
