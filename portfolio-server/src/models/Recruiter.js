'use strict'
const bcrypt = require('bcrypt')
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Recruiter extends Model {
		/**
		 * Helper method for defining associations.
		 * This method is not a part of Sequelize lifecycle.
		 * The `models/index` file will call this method automatically.
		 */
		static associate(models) {
			Recruiter.belongsTo(models.Company, {
				foreignKey: 'companyId',
				as: 'company',
			})
			Recruiter.hasMany(models.News, {
				foreignKey: 'authorId',
				constraints: false,
				scope: { authorType: 'Recruiter' },
				as: 'authorRecruiter',
			})
		}
	}

	Recruiter.init(
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
			companyId: {
				type: DataTypes.INTEGER,
				allowNull: true,
				references: {
					model: 'Companies',
					key: 'id',
				},
			},
			phone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			photo: {
				type: DataTypes.STRING,
				allowNull: true,
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
				allowNull: true,
			},
			active: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
				defaultValue: false,
			},
			kintone_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
		},
		{
			sequelize,
			modelName: 'Recruiter',
			tableName: 'Recruiters',
			timestamps: true,
			hooks: {
				beforeCreate: async recruiter => {
					if (recruiter.password) {
						const salt = await bcrypt.genSalt(10)
						recruiter.password = await bcrypt.hash(recruiter.password, salt)
					}
				},
				beforeUpdate: async recruiter => {
					if (recruiter.changed('password')) {
						const salt = await bcrypt.genSalt(10)
						recruiter.password = await bcrypt.hash(recruiter.password, salt)
					}
				},
			},
		}
	)

	return Recruiter
}
