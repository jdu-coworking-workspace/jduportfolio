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
			company_name: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			phone: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			company_description: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			gallery: {
				type: DataTypes.JSONB,
				allowNull: true,
			},
			photo: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			first_name_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			last_name_furigana: {
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
			date_of_birth: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			active: {
				type: DataTypes.BOOLEAN,
				allowNull: true,
				defaultValue: false,
			},
			isPartner: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			kintone_id: {
				type: DataTypes.STRING,
				allowNull: false,
			},
			company_Address: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			established_Date: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			employee_Count: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			business_overview: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			target_audience: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			required_skills: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			welcome_skills: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			work_location: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			work_hours: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			salary: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			benefits: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			selection_process: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			company_video_url: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
			// New fields
			tagline: { type: DataTypes.STRING, allowNull: true },
			company_website: { type: DataTypes.STRING, allowNull: true },
			company_capital: { type: DataTypes.STRING, allowNull: true },
			company_revenue: { type: DataTypes.STRING, allowNull: true },
			company_representative: { type: DataTypes.STRING, allowNull: true },

			job_title: { type: DataTypes.STRING, allowNull: true },
			job_description: { type: DataTypes.TEXT, allowNull: true },
			number_of_openings: { type: DataTypes.STRING, allowNull: true },
			employment_type: { type: DataTypes.STRING, allowNull: true },
			probation_period: { type: DataTypes.TEXT, allowNull: true },
			employment_period: { type: DataTypes.TEXT, allowNull: true },

			recommended_skills: { type: DataTypes.TEXT, allowNull: true },
			recommended_licenses: { type: DataTypes.TEXT, allowNull: true },
			recommended_other: { type: DataTypes.TEXT, allowNull: true },

			salary_increase: { type: DataTypes.STRING, allowNull: true },
			bonus: { type: DataTypes.STRING, allowNull: true },
			allowances: { type: DataTypes.TEXT, allowNull: true },
			holidays_vacation: { type: DataTypes.TEXT, allowNull: true },

			other_notes: { type: DataTypes.TEXT, allowNull: true },
			interview_method: { type: DataTypes.STRING, allowNull: true },

			// Additional fields
			japanese_level: { type: DataTypes.STRING, allowNull: true },
			application_requirements_other: { type: DataTypes.TEXT, allowNull: true },
			retirement_benefit: { type: DataTypes.STRING, allowNull: true },
			telework_availability: { type: DataTypes.STRING, allowNull: true },
			housing_availability: { type: DataTypes.STRING, allowNull: true },
			relocation_support: { type: DataTypes.TEXT, allowNull: true },
			airport_pickup: { type: DataTypes.STRING, allowNull: true },
			intro_page_thumbnail: { type: DataTypes.STRING, allowNull: true },
			// New: multiple intro page links (max 4 at validation)
			intro_page_links: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
		},
		{
			sequelize,
			modelName: 'Recruiter',
			tableName: 'Recruiters', // Ensure your table name is plural if that is your convention
			timestamps: true, // Automatically add createdAt and updatedAt
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
