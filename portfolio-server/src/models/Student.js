'use strict'
const bcrypt = require('bcrypt')
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
	class Student extends Model {
		static associate(models) {
			Student.hasMany(models.Bookmark, {
				foreignKey: 'studentId',
				as: 'bookmarks',
			})
			Student.hasMany(models.Draft, {
				foreignKey: 'student_id',
				sourceKey: 'student_id',
				as: 'drafts',
			})
			Student.hasOne(models.Draft, {
				foreignKey: 'student_id',
				sourceKey: 'student_id',
				as: 'draft',
				scope: {
					version_type: 'draft',
				},
			})
			Student.hasOne(models.Draft, {
				foreignKey: 'student_id',
				sourceKey: 'student_id',
				as: 'pendingDraft',
				scope: {
					version_type: 'pending',
				},
			})
			Student.hasMany(models.QA, { foreignKey: 'studentId', as: 'qas' })
		}
	}

	Student.init(
		{
			email: {
				type: DataTypes.STRING,
				allowNull: false,
				unique: true,
				validate: { isEmail: true },
			},
			password: { type: DataTypes.STRING, allowNull: false },
			student_id: { type: DataTypes.STRING, allowNull: false, unique: true },
			first_name: { type: DataTypes.STRING, allowNull: false },
			last_name: { type: DataTypes.STRING, allowNull: false },
			first_name_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			last_name_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
			phone: { type: DataTypes.STRING, allowNull: true },
			photo: { type: DataTypes.STRING, allowNull: true },
			gender: { type: DataTypes.STRING, allowNull: true },
			address: { type: DataTypes.TEXT, allowNull: true },
			parents_phone_number: { type: DataTypes.STRING, allowNull: true },
			enrollment_date: { type: DataTypes.DATEONLY, allowNull: true }, // Kintone'dagi "jduDate"
			partner_university_enrollment_date: {
				type: DataTypes.DATEONLY,
				allowNull: true,
			},
			semester: {
				type: DataTypes.ENUM('1', '2', '3', '4', '5', '6', '7', '8', '9', '卒業'),
				defaultValue: '1',
			},
			partner_university: { type: DataTypes.STRING, allowNull: true },
			faculty: { type: DataTypes.STRING, allowNull: true },
			department: { type: DataTypes.STRING, allowNull: true },
			student_status: { type: DataTypes.STRING, allowNull: true },
			partner_university_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			world_language_university_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			business_skills_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			japanese_employment_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			liberal_arts_education_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			total_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			specialized_education_credits: {
				type: DataTypes.INTEGER,
				allowNull: true,
				defaultValue: 0,
			},
			self_introduction: { type: DataTypes.TEXT, allowNull: true },
			hobbies: { type: DataTypes.STRING, allowNull: true },
			major: { type: DataTypes.TEXT, allowNull: true },
			job_type: { type: DataTypes.TEXT, allowNull: true },
			gallery: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
			skills: { type: DataTypes.JSONB, allowNull: true },
			it_skills: { type: DataTypes.JSONB, allowNull: true },
			other_information: { type: DataTypes.TEXT, allowNull: true },
			other_skills: {
				type: DataTypes.JSONB,
				allowNull: true,
			},
			deliverables: { type: DataTypes.JSONB, allowNull: true },
			jlpt: { type: DataTypes.TEXT, allowNull: true },
			ielts: { type: DataTypes.TEXT, allowNull: true },
			jdu_japanese_certification: { type: DataTypes.TEXT, allowNull: true },
			japanese_speech_contest: { type: DataTypes.TEXT, allowNull: true },
			it_contest: { type: DataTypes.TEXT, allowNull: true },
			graduation_year: { type: DataTypes.TEXT, allowNull: true },
			graduation_season: { type: DataTypes.TEXT, allowNull: true },
			language_skills: { type: DataTypes.TEXT, allowNull: true },

			credit_details: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
				comment: 'Detailed credit information from Kintone app 233',
			},
			active: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
			visibility: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			has_pending: {
				type: DataTypes.BOOLEAN,
				allowNull: false,
				defaultValue: false,
			},
			kintone_id: { type: DataTypes.INTEGER, allowNull: false },
			// Virtual field for age calculation

			// === NEW  FIELDLS ===
			education: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
			work_experience: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
			licenses: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},
			additional_info: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: {},
			},
			address_furigana: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			postal_code: {
				type: DataTypes.STRING,
				allowNull: true,
			},
			arubaito: {
				type: DataTypes.JSONB,
				allowNull: true,
				defaultValue: [],
			},

			age: {
				type: DataTypes.VIRTUAL,
				get() {
					const dateOfBirth = this.getDataValue('date_of_birth')
					if (!dateOfBirth) return null

					const today = new Date()
					const birthDate = new Date(dateOfBirth)
					let age = today.getFullYear() - birthDate.getFullYear()
					const monthDiff = today.getMonth() - birthDate.getMonth()

					if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
						age--
					}

					return age
				},
			},
			// Virtual field for expected graduation year combining year and season
			expected_graduation_year: {
				type: DataTypes.VIRTUAL,
				get() {
					const raw = this.getDataValue('graduation_year')
					const season = this.getDataValue('graduation_season')
					if (!raw && !season) return null

					// If stored as ISO date (YYYY-MM-DD), format to 'YYYY年MM月'
					if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
						const [Y, M] = raw.split('-')
						const formatted = `${Y}年${M}月`
						return season ? `${formatted}${season}` : formatted
					}

					// Fallback: return as-is, optionally append season
					const yearText = raw || ''
					return season ? `${yearText}${season}` : yearText || null
				},
			},
		},
		{
			sequelize,
			modelName: 'Student',
			hooks: {
				beforeCreate: async student => {
					if (student.password) {
						const salt = await bcrypt.genSalt(10)
						student.password = await bcrypt.hash(student.password, salt)
					}
				},
				beforeUpdate: async student => {
					if (student.changed('password')) {
						const salt = await bcrypt.genSalt(10)
						student.password = await bcrypt.hash(student.password, salt)
					}
				},
			},
		}
	)
	return Student
}
