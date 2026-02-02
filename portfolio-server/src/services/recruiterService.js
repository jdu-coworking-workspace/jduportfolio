const { Op } = require('sequelize')
const bcrypt = require('bcrypt')
const { Recruiter } = require('../models')
const { formatRecruiterWelcomeEmail } = require('../utils/emailToRecruiter')
const generatePassword = require('generate-password')

class RecruiterService {
	// Service method to create a new recruiter
	static async createRecruiter(recruiterData) {
		try {
			const newRecruiter = await Recruiter.create(recruiterData)
			return newRecruiter
		} catch (error) {
			throw error // Throw the error for the controller to handle
		}
	}

	// Service method to retrieve all recruiters
	static async getAllRecruiters(filter) {
		try {
			let whereCondition = {}

			// Ensure filter is a valid object
			if (!filter || typeof filter !== 'object') {
				filter = {}
			}

			// Handle search across multiple columns
			if (filter.search && filter.search.trim() !== '') {
				const searchValue = String(filter.search).trim()
				const searchableColumns = [
					'email',
					'first_name',
					'last_name',
					'company_name',
					'company_description',
					'phone',
					'company_Address',
					// New recruiter profile fields included in search
					'tagline',
					'company_website',
					'company_representative',
					'job_title',
					'job_description',
					'employment_type',
					'work_location',
				]

				whereCondition[Op.or] = searchableColumns.map(column => ({
					[column]: { [Op.iLike]: `%${searchValue}%` },
				}))
			}

			// Handle other filters
			Object.keys(filter).forEach(key => {
				if (key !== 'search' && filter[key]) {
					if (Array.isArray(filter[key])) {
						whereCondition[key] = { [Op.in]: filter[key] }
					} else if (typeof filter[key] === 'string') {
						whereCondition[key] = { [Op.iLike]: `%${filter[key]}%` }
					} else {
						whereCondition[key] = filter[key]
					}
				}
			})

			// Always exclude partner recruiters from public GET list
			whereCondition.isPartner = false

			const recruiters = await Recruiter.findAll({
				attributes: { exclude: ['isPartner'] },
				where: whereCondition,
				order: [
					['first_name', 'ASC'],
					['last_name', 'ASC'],
				],
			})

			return recruiters
		} catch (error) {
			console.error('Error in getAllRecruiters service:', error.message, error.stack)
			// Return empty array instead of throwing to prevent 500 errors
			return []
		}
	}

	// Service method to retrieve a recruiter by ID
	static async getRecruiterById(recruiterId, password = false, isSelf = false) {
		try {
			let excluded = ['createdAt', 'updatedAt', 'isPartner']
			if (!password) {
				excluded.push('password')
			}
			// For public GET by ID (password=false), exclude partner recruiters
			// BUT allow self-access regardless of isPartner status
			const where = { id: recruiterId }
			if (!password && !isSelf) where.isPartner = false

			const recruiter = await Recruiter.findOne({
				where,
				attributes: { exclude: excluded },
			})
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}
			return recruiter
		} catch (error) {
			throw error
		}
	}

	static async getRecruiterByIdWithPassword(recruiterId) {
		try {
			const recruiter = await Recruiter.findByPk(recruiterId)
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}
			return recruiter
		} catch (error) {
			throw error
		}
	}

	static async updateRecruiter(id, data) {
		try {
			const recruiter = await Recruiter.findByPk(id)
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}

			// Only include fields that are actually provided (not undefined)
			const updatedData = {}
			const fields = [
				'first_name',
				'last_name',
				'first_name_furigana',
				'last_name_furigana',
				'phone',
				'email',
				'company_name',
				'company_description',
				'gallery',
				'photo',
				'date_of_birth',
				'active',
				'kintone_id',
				'company_Address',
				'established_Date',
				'employee_Count',
				'business_overview',
				'target_audience',
				'required_skills',
				'welcome_skills',
				'work_location',
				'work_hours',
				'salary',
				'benefits',
				'selection_process',
				'company_video_url',
				// New fields
				'tagline',
				'company_website',
				'company_capital',
				'company_revenue',
				'company_representative',
				'job_title',
				'job_description',
				'number_of_openings',
				'employment_type',
				'probation_period',
				'employment_period',
				'recommended_skills',
				'recommended_licenses',
				'recommended_other',
				'salary_increase',
				'bonus',
				'allowances',
				'holidays_vacation',
				'other_notes',
				'interview_method',
				// Additional fields
				'japanese_level',
				'application_requirements_other',
				'retirement_benefit',
				'telework_availability',
				'housing_availability',
				'relocation_support',
				'airport_pickup',
				'intro_page_thumbnail',
				'intro_page_links',
			]

			fields.forEach(field => {
				if (data[field] !== undefined) {
					updatedData[field] = data[field]
				}
			})

			// Handle password separately with verification
			if (data.currentPassword && data.password) {
				const bcrypt = require('bcrypt')
				const isValidPassword = await bcrypt.compare(data.currentPassword, recruiter.password)
				if (!isValidPassword) {
					throw new Error('Current password is incorrect')
				}
				updatedData.password = await bcrypt.hash(data.password, 10)
			} else if (data.password && !data.currentPassword) {
				// Direct password update (for admin or initial setup)
				updatedData.password = data.password
			}

			console.log('Update request data:', data)
			console.log('Constructed update data:', updatedData)

			const result = await recruiter.update(updatedData)
			console.log('Update result:', result.toJSON())

			return result
		} catch (error) {
			console.error('Update recruiter error:', error)
			throw error
		}
	}

	static async deleteRecruiter(recruiterId) {
		try {
			await Recruiter.destroy({ where: { kintone_id: recruiterId } })
		} catch (error) {
			console.error('Error deleting recruiter:', error)
			throw error
		}
	}

	static async updateRecruiterByKintoneId(kintoneId, data) {
		const [affectedRows, updatedRecruiters] = await Recruiter.update(data, {
			where: { kintone_id: kintoneId },
			returning: true,
		})
		return updatedRecruiters ? updatedRecruiters[0] : null
	}

	static async deleteRecruiterByKintoneId(kintoneId) {
		return await Recruiter.destroy({ where: { kintone_id: kintoneId } })
	}

	/**
	 * Kintone'dan kelgan rekruterlar ro'yxatini sinxronizatsiya qiladi.
	 * @param {Array} recruiterRecords - Kintone'dan olingan rekruterlar ro'yxati.
	 * @returns {Array} Yangi rekruterlar uchun email vazifalari massivi.
	 */
	static async syncRecruiterData(recruiterRecords) {
		console.log(`Rekruter sinxronizatsiyasi boshlandi: ${recruiterRecords.length} ta yozuv topildi.`)
		const emailTasks = []
		for (const record of recruiterRecords) {
			const kintoneId = record['$id']?.value
			if (!kintoneId) continue

			const existingRecruiter = await Recruiter.findOne({
				where: { kintone_id: kintoneId },
			})
			console.log(`Kintone ID: ${typeof kintoneId}, Mavjud rekruter: ${!!existingRecruiter}`)
			if (!existingRecruiter) {
				console.log(`Yangi rekruter topildi: Kintone ID ${kintoneId}. Bazaga qo'shilmoqda...`)
				const password = generatePassword.generate({
					length: 12,
					numbers: true,
					symbols: false,
					uppercase: true,
				})

				// Parse isPartner from Kintone (checkbox/string 'true'/'false')
				let isPartner = false
				const isPartnerRaw = record.isPartner?.value
				if (Array.isArray(isPartnerRaw)) {
					isPartner = isPartnerRaw.map(v => String(v).toLowerCase()).includes('true')
				} else if (typeof isPartnerRaw === 'string') {
					isPartner = isPartnerRaw.toLowerCase() === 'true'
				}

				const recruiterData = {
					email: record.recruiterEmail?.value,
					password: password,
					first_name: record.recruiterFirstName?.value,
					last_name: record.recruiterLastName?.value,
					company_name: record.recruiterCompany?.value,
					phone: record.recruiterPhone?.value || null,
					kintone_id: kintoneId,
					active: true,
					isPartner,
				}
				console.log('====================================')
				console.log("Yangi rekruter ma'lumotlari:", recruiterData)
				console.log('====================================')

				const newRecruiter = await this.createRecruiter(recruiterData)

				if (newRecruiter) {
					// >>> O'ZGARISH: Email vazifasini ro'yxatga qo'shamiz <<<
					emailTasks.push(formatRecruiterWelcomeEmail(newRecruiter.email, password, newRecruiter.first_name, newRecruiter.last_name))
				}
			}
		}
		console.log('Rekruter sinxronizatsiyasi yakunlandi.')
		return emailTasks
	}
}

module.exports = RecruiterService
