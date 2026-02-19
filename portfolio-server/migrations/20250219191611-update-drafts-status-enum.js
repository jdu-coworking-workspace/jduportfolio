'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	up: async (queryInterface, Sequelize) => {
		await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'ts_status' AND e.enumlabel = 'checking') THEN
          ALTER TYPE "enum_Drafts_status" ADD VALUE 'checking';
        END IF;
      END
      $$;
    `)
	},

	down: async (queryInterface, Sequelize) => {
		// Note: ENUM values cannot be removed easily, so you might need to recreate the ENUM type if needed.
		// This example does NOT remove 'checking' since it's complex in PostgreSQL.
		console.warn('⚠️ Rolling back ENUM changes is not supported directly in PostgreSQL')
	},
}
