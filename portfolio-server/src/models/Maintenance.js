'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Maintenance extends Model {
		/**
		 * Helper method for defining associations.
		 */
		static associate(models) {
			// Define associations here if needed
		}
	}

	Maintenance.init(
		{
			message: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			is_public: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
		},
		{
			sequelize,
			modelName: 'Maintenance',
			tableName: 'Maintenances',
			timestamps: true,
		}
	)

	return Maintenance
}
