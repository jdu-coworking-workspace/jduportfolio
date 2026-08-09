'use strict'
const bcrypt = require('bcrypt')
const { Model, DataTypes } = require('sequelize')

module.exports = sequelize => {
	class Staff extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			Staff.hasMany(models.News, {
				foreignKey: 'authorId',
				constraints: false,
				scope: { authorType: 'Staff' },
				as: 'authorStaff',
			})
			Staff.hasMany(models.News, {
				foreignKey: 'moderatorId',
				constraints: false,
				scope: { moderatorType: 'Staff' },
				as: 'moderatorStaff',
			})
			Staff.hasMany(models.Draft, {
				foreignKey: 'reviewed_by',
				as: 'reviewedDrafts',
			})
		}
	}

	Staff.init(
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
			department: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			position: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			date_of_birth: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			phone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			photo: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			active: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			kintone_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			last_login: {
				type: DataTypes.DATE,
				allowNull: true,
			},
		},
		{
			sequelize,
			modelName: 'Staff',
			tableName: 'Staff',
			hooks: {
				beforeCreate: async staff => {
					if (staff.password) {
						const salt = await bcrypt.genSalt(10)
						staff.password = await bcrypt.hash(staff.password, salt)
					}
				},
				beforeUpdate: async staff => {
					if (staff.changed('password')) {
						const salt = await bcrypt.genSalt(10)
						staff.password = await bcrypt.hash(staff.password, salt)
					}
				},
			},
		}
	)

	return Staff
}
