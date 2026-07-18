const { Op } = require('sequelize')
const bcrypt = require('bcrypt')
const { Recruiter, Company, sequelize } = require('../models')
const { formatRecruiterWelcomeEmail } = require('../utils/emailToRecruiter')
const generatePassword = require('generate-password')
const { RECRUITER_UPDATABLE_FIELDS, COMPANY_UPDATABLE_FIELDS, pickFields } = require('../utils/recruiterCompanyFields')

// Recruiter columns searched by the list endpoint
const RECRUITER_SEARCH_COLUMNS = ['email', 'first_name', 'last_name', 'phone']

// Company columns searched by the list endpoint (via the joined company)
const COMPANY_SEARCH_COLUMNS = ['company_name', 'company_description', 'company_Address', 'tagline', 'company_website', 'company_representative', 'job_title', 'job_description', 'employment_type', 'work_location']

const companyInclude = (attributes = null) => ({
	model: Company,
	as: 'company',
	...(attributes ? { attributes } : {}),
})

class RecruiterService {
	/**
	 * Finds an existing company or creates a new one.
	 * Accepts either a companyId (must exist) or a company_name (findOrCreate).
	 * `extraDefaults` (e.g. { isPartner }) are applied on creation; if the
	 * company already exists and `syncPartner` is true, isPartner is updated.
	 */
	static async resolveCompany({ companyId, company_name, isPartner, syncPartner = false }, transaction = null) {
		if (companyId) {
			const company = await Company.findByPk(companyId, { transaction })
			if (!company) {
				throw new Error(`Company with id ${companyId} not found`)
			}
			return company
		}

		if (!company_name || !String(company_name).trim()) {
			return null
		}

		const name = String(company_name).trim()
		const [company, created] = await Company.findOrCreate({
			where: { company_name: name },
			defaults: {
				company_name: name,
				isPartner: isPartner === true,
			},
			transaction,
		})

		// Keep partner status in sync with Kintone on webhook updates
		if (!created && syncPartner && isPartner !== undefined && company.isPartner !== isPartner) {
			await company.update({ isPartner: isPartner === true }, { transaction })
		}

		return company
	}

	/**
	 * Creates a recruiter (personal account) and links it to a company.
	 * `recruiterData` may contain companyId OR company_name (+ isPartner for
	 * webhook-driven creation).
	 */
	static async createRecruiter(recruiterData) {
		const { companyId, company_name, isPartner, ...personal } = recruiterData

		return await sequelize.transaction(async transaction => {
			const company = await RecruiterService.resolveCompany({ companyId, company_name, isPartner, syncPartner: true }, transaction)

			const newRecruiter = await Recruiter.create(
				{
					...personal,
					companyId: company ? company.id : null,
				},
				{ transaction }
			)

			newRecruiter.setDataValue('company', company)
			return newRecruiter
		})
	}

	// Service method to retrieve all recruiters (with their company)
	static async getAllRecruiters(filter) {
		try {
			// Ensure filter is a valid object
			if (!filter || typeof filter !== 'object') {
				filter = {}
			}

			const andConditions = []

			// Exclude recruiters of partner companies from the public list.
			// Recruiters without a company are kept visible.
			andConditions.push({
				[Op.or]: [{ '$company.isPartner$': false }, { '$company.id$': null }],
			})

			// Handle search across recruiter + company columns
			if (filter.search && String(filter.search).trim() !== '') {
				const searchValue = String(filter.search).trim()
				const orConditions = [
					...RECRUITER_SEARCH_COLUMNS.map(column => ({
						[column]: { [Op.iLike]: `%${searchValue}%` },
					})),
					...COMPANY_SEARCH_COLUMNS.map(column => ({
						[`$company.${column}$`]: { [Op.iLike]: `%${searchValue}%` },
					})),
				]
				andConditions.push({ [Op.or]: orConditions })
			}

			// Handle other filters (recruiter fields directly, company fields via $company.x$)
			Object.keys(filter).forEach(key => {
				if (key !== 'search' && filter[key]) {
					const columnKey = COMPANY_UPDATABLE_FIELDS.includes(key) || key === 'isPartner' ? `$company.${key}$` : key
					if (Array.isArray(filter[key])) {
						andConditions.push({ [columnKey]: { [Op.in]: filter[key] } })
					} else if (typeof filter[key] === 'string') {
						andConditions.push({
							[columnKey]: { [Op.iLike]: `%${filter[key]}%` },
						})
					} else {
						andConditions.push({ [columnKey]: filter[key] })
					}
				}
			})

			const recruiters = await Recruiter.findAll({
				attributes: { exclude: ['password'] },
				where: { [Op.and]: andConditions },
				include: [{ ...companyInclude(), attributes: { exclude: ['isPartner'] } }],
				order: [
					['first_name', 'ASC'],
					['last_name', 'ASC'],
				],
				subQuery: false,
			})

			return recruiters
		} catch (error) {
			console.error('Error in getAllRecruiters service:', error.message, error.stack)
			// Return empty array instead of throwing to prevent 500 errors
			return []
		}
	}

	// Service method to retrieve a recruiter by ID (with company profile)
	static async getRecruiterById(recruiterId, password = false, isSelf = false) {
		try {
			let excluded = ['createdAt', 'updatedAt']
			if (!password) {
				excluded.push('password')
			}

			const recruiter = await Recruiter.findOne({
				where: { id: recruiterId },
				attributes: { exclude: excluded },
				include: [companyInclude()],
			})
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}

			// For public GET by ID, hide recruiters of partner companies
			// BUT allow self-access regardless of partner status
			if (!password && !isSelf && recruiter.company && recruiter.company.isPartner) {
				throw new Error('Recruiter not found')
			}

			// Keep old behavior: isPartner is not exposed in API responses
			if (recruiter.company) {
				delete recruiter.company.dataValues.isPartner
			}

			return recruiter
		} catch (error) {
			throw error
		}
	}

	static async getRecruiterByIdWithPassword(recruiterId) {
		try {
			const recruiter = await Recruiter.findByPk(recruiterId, {
				include: [companyInclude()],
			})
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}
			return recruiter
		} catch (error) {
			throw error
		}
	}

	/**
	 * Updates a recruiter's personal fields and (optionally) its company's
	 * profile fields.
	 *
	 * `data` shape:
	 *   { ...personalFields, company: { ...companyFields } }
	 *
	 * Any recruiter belonging to the same company may edit the company profile
	 * (business rule: colleagues share and co-edit the company page).
	 * company_name / isPartner are NOT updatable here (admin-only, via CompanyService).
	 */
	static async updateRecruiter(id, data) {
		try {
			const recruiter = await Recruiter.findByPk(id)
			if (!recruiter) {
				throw new Error('Recruiter not found')
			}

			const personalData = pickFields(data, RECRUITER_UPDATABLE_FIELDS)

			// Handle password separately with verification
			if (data.currentPassword && data.password) {
				const isValidPassword = await bcrypt.compare(data.currentPassword, recruiter.password)
				if (!isValidPassword) {
					throw new Error('Current password is incorrect')
				}
				// Plain password: the model's beforeUpdate hook hashes it
				personalData.password = data.password
			} else if (data.password && !data.currentPassword) {
				// Direct password update (for admin or initial setup)
				personalData.password = data.password
			}

			// Company profile update (nested `company` object)
			const companyData = pickFields(data.company, COMPANY_UPDATABLE_FIELDS)
			delete companyData.company_name // admin-only, via CompanyService
			delete companyData.isPartner

			await sequelize.transaction(async transaction => {
				await recruiter.update(personalData, { transaction })

				if (Object.keys(companyData).length > 0) {
					if (!recruiter.companyId) {
						throw new Error('Recruiter has no company assigned — cannot update company profile')
					}
					await Company.update(companyData, {
						where: { id: recruiter.companyId },
						transaction,
					})
				}
			})

			// Return fresh state with company included
			return await RecruiterService.getRecruiterById(id, false, true)
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

	/**
	 * Webhook (UPDATE_RECORD): updates personal fields by kintone_id and
	 * re-links the company if the company name changed in Kintone.
	 */
	static async updateRecruiterByKintoneId(kintoneId, data) {
		const { company_name, isPartner, ...personal } = data

		const recruiter = await Recruiter.findOne({ where: { kintone_id: kintoneId } })
		if (!recruiter) return null

		return await sequelize.transaction(async transaction => {
			if (company_name) {
				const company = await RecruiterService.resolveCompany({ company_name, isPartner, syncPartner: true }, transaction)
				personal.companyId = company ? company.id : recruiter.companyId
			}

			await recruiter.update(personal, { transaction })
			return recruiter
		})
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

				const recruiterData = {
					email: record.recruiterEmail?.value,
					password: password,
					first_name: record.recruiterFirstName?.value,
					last_name: record.recruiterLastName?.value,
					company_name: record.recruiterCompany?.value,
					phone: record.recruiterPhone?.value || null,
					kintone_id: kintoneId,
					active: true,
					isPartner: RecruiterService.parseKintoneIsPartner(record),
				}

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

	/**
	 * Parses the isPartner flag from a Kintone record (checkbox array or
	 * 'true'/'false' string).
	 */
	static parseKintoneIsPartner(record) {
		const raw = record?.isPartner?.value
		if (Array.isArray(raw)) {
			return raw.map(v => String(v).toLowerCase()).includes('true')
		}
		if (typeof raw === 'string') {
			return raw.toLowerCase() === 'true'
		}
		return false
	}
}

module.exports = RecruiterService
