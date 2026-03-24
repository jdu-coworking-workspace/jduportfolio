'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class MailServiceSetting extends Model {
		static associate(models) {
			// No associations needed
		}
	}

	MailServiceSetting.init(
		{
			key: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				comment: 'Setting identifier: periodic_email | inactive_student_email',
			},
			is_active: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			period_days: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			day_of_week: {
				type: DataTypes.INTEGER,
				allowNull: true,
				comment: '0=Sunday, 1=Monday, ..., 6=Saturday',
			},
			message_subject: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			message_body: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			last_sent_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			updated_by_id: {
				type: DataTypes.INTEGER,
				allowNull: true,
			},
			updated_by_type: {
				type: DataTypes.ENUM('Admin', 'Staff'),
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: 'MailServiceSetting',
			tableName: 'MailServiceSettings',
			timestamps: true,
		}
	)

	return MailServiceSetting
}
