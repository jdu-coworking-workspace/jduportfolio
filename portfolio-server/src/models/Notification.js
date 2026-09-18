'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Notification extends Model {
		static associate(models) {
			Notification.belongsTo(models.Student, {
				foreignKey: 'user_id',
				as: 'student',
				constraints: false,
			})
			Notification.belongsTo(models.Staff, {
				foreignKey: 'user_id',
				as: 'staff',
				constraints: false,
			})
			Notification.belongsTo(models.Admin, {
				foreignKey: 'user_id',
				as: 'admin',
				constraints: false,
			})
		}
	}

	Notification.init(
		{
			id: {
				type: DataTypes.BIGINT,
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
			},
			user_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			user_role: {
				type: DataTypes.ENUM('student', 'staff', 'admin', 'recruiter'),
				allowNull: false,
			},
			type: {
				type: DataTypes.ENUM('draft_submitted', 'approved', 'etc', 'news'),
				allowNull: false,
			},
			message: {
				type: DataTypes.TEXT,
				allowNull: false,
			},
			status: {
				type: DataTypes.ENUM('unread', 'read'),
				allowNull: false,
				defaultValue: 'unread',
			},
			related_id: {
				type: DataTypes.BIGINT,
				allowNull: true,
			},
			target_url: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			createdAt: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: DataTypes.NOW,
			},
		},
		{
			sequelize,
			modelName: 'Notification',
			timestamps: false,
		}
	)

	return Notification
}
