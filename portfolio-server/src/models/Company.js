'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Company extends Model {
		static associate(models) {
			Company.hasMany(models.Recruiter, {
				foreignKey: 'companyId',
				as: 'recruiters',
			})
		}
	}

	Company.init(
		{
			company_name: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
			},
			isPartner: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			company_description: { type: DataTypes.TEXT, allowNull: true },
			gallery: { type: DataTypes.JSONB, allowNull: true },
			company_Address: { type: DataTypes.TEXT, allowNull: true },
			established_Date: { type: DataTypes.STRING, allowNull: true },
			employee_Count: { type: DataTypes.STRING, allowNull: true },
			business_overview: { type: DataTypes.TEXT, allowNull: true },
			target_audience: { type: DataTypes.TEXT, allowNull: true },
			required_skills: { type: DataTypes.TEXT, allowNull: true },
			welcome_skills: { type: DataTypes.TEXT, allowNull: true },
			work_location: { type: DataTypes.TEXT, allowNull: true },
			work_hours: { type: DataTypes.TEXT, allowNull: true },
			salary: { type: DataTypes.TEXT, allowNull: true },
			benefits: { type: DataTypes.TEXT, allowNull: true },
			selection_process: { type: DataTypes.TEXT, allowNull: true },
			company_video_url: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
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

			japanese_level: { type: DataTypes.STRING, allowNull: true },
			application_requirements_other: { type: DataTypes.TEXT, allowNull: true },
			retirement_benefit: { type: DataTypes.STRING, allowNull: true },
			telework_availability: { type: DataTypes.STRING, allowNull: true },
			housing_availability: { type: DataTypes.STRING, allowNull: true },
			relocation_support: { type: DataTypes.TEXT, allowNull: true },
			airport_pickup: { type: DataTypes.STRING, allowNull: true },
			intro_page_thumbnail: { type: DataTypes.STRING, allowNull: true },
			intro_page_links: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
		},
		{
			sequelize,
			modelName: 'Company',
			tableName: 'Companies',
			timestamps: true,
		}
	)

	return Company
}
