'use strict'
const bcrypt = require('bcrypt')
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Admin extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			Admin.hasMany(models.News, {
				foreignKey: 'authorId',
				constraints: false,
				scope: { authorType: 'Admin' },
				as: 'authorAdmin',
			})
			// Admin bir nechta yangilikni moderatsiya qila oladi
			Admin.hasMany(models.News, {
				foreignKey: 'moderatorId',
				constraints: false,
				scope: { moderatorType: 'Admin' },
				as: 'moderatorAdmin',
			})
		}
	}
	Admin.init(
		{
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				validate: {
					isEmail: true,
				},
			},
			password: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			first_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			last_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			first_name_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			last_name_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			date_of_birth: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			phone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			photo: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			last_login: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: 'Admin',
			hooks: {
				beforeCreate: async admin => {
					if (admin.password) {
						const salt = await bcrypt.genSalt(10)
						admin.password = await bcrypt.hash(admin.password, salt)
					}
				},
				beforeUpdate: async admin => {
					if (admin.changed('password')) {
						const salt = await bcrypt.genSalt(10)
						admin.password = await bcrypt.hash(admin.password, salt)
					}
				},
			},
		}
	)

	return Admin
}
