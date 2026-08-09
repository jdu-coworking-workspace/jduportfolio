'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class LoginLog extends Model {
		static associate(models) {
			// define association here
		}
	}
	LoginLog.init(
		{
			userId: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			userType: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			ip_address: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			user_agent: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			status: {
				type: DataTypes.ENUM('success', 'failed'),
				allowNull: false,
			},
			reason: {
				type: DataTypes.STRING,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: 'LoginLog',
		}
	)
	return LoginLog
}
