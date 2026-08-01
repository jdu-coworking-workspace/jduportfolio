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
	 *
	 * NOTE: isPartner is NOT set here. It is an admin-controlled, company-level
	 * flag managed exclusively via CompanyService (PUT /api/companies/:id).
	 * New companies default to isPartner=false (model default); the Kintone
	 * webhook never overwrites an admin's isPartner decision.
	 */
	static async resolveCompany({ companyId, company_name }, transaction = null) {
		if (companyId) {
			const company = await Company.findByPk(companyId, { transaction })
			if (!company) {
				const error = new Error(`Company with id ${companyId} not found`)
				error.status = 404
				throw error
			}
			return company
		}

		if (!company_name || !String(company_name).trim()) {
			return null
		}

		const name = String(company_name).trim()
		const [company] = await Company.findOrCreate({
			where: { company_name: name },
			defaults: { company_name: name }, // isPartner defaults to false
			transaction,
		})

		return company
	}

	/**
	 * DB-ONLY create. Links to a company by companyId or company_name
	 * (find-or-create). Used by the Kintone webhook / bulk-sync inbound path.
	 * Does NOT push anything back to Kintone (that would create an echo loop).
	 */
	static async createRecruiter(recruiterData) {
		const { companyId, company_name, isPartner, ...personal } = recruiterData

		return await sequelize.transaction(async transaction => {
			const company = await RecruiterService.resolveCompany({ companyId, company_name }, transaction)

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

	/**
	 * WEB (admin) create — Kintone-first.
	 *
	 * Flow:
	 *   1. Validate the chosen company exists (companyId required).
	 *   2. Create the record in Kintone first and read back its id.
	 *   3. Create the DB recruiter with kintone_id already set.
	 *
	 * The echo ADD_RECORD webhook that Kintone fires afterwards is absorbed by
	 * the idempotency guard in the webhook handler (skips existing kintone_id).
	 *
	 * @param {object} recruiterData - personal fields + companyId
	 * @returns {Promise<Recruiter>}
	 */
	static async createRecruiterViaWeb(recruiterData) {
		const KintoneService = require('./kintoneService')
		const { toKintoneRecord, extractKintoneId } = require('../utils/recruiterKintoneMapper')

		const { companyId, ...personal } = recruiterData

		// 1. Company must exist (drop-down selection)
		const company = await RecruiterService.resolveCompany({ companyId })
		if (!company) {
			const error = new Error('A valid companyId is required to create a recruiter')
			error.status = 400
			throw error
		}

		// 2. Kintone-first
		let kintoneId
		try {
			const kintonePayload = toKintoneRecord(personal, company)
			const kintoneResp = await KintoneService.createRecord('recruiters', kintonePayload)
			kintoneId = extractKintoneId(kintoneResp)
			if (!kintoneId) {
				throw new Error('Kintone did not return a record id')
			}
		} catch (error) {
			console.error('[RECRUITER][createViaWeb] Kintone create failed:', error.message)
			const wrapped = new Error('Failed to create recruiter in Kintone. Recruiter was not created.')
			wrapped.status = 502
			wrapped.cause = error
			throw wrapped
		}

		// 3. DB create with kintone_id set
		try {
			const newRecruiter = await Recruiter.create({
				...personal,
				companyId: company.id,
				kintone_id: String(kintoneId),
			})
			newRecruiter.setDataValue('company', company)
			return newRecruiter
		} catch (error) {
			// Race: the ADD_RECORD echo webhook may have created the row first.
			// If a recruiter with this kintone_id now exists, treat as success.
			const raced = await RecruiterService.findByKintoneId(kintoneId)
			if (raced) {
				console.warn(`[RECRUITER][createViaWeb] DB row already created by webhook echo for kintone_id ${kintoneId}`)
				raced.setDataValue('company', company)
				return raced
			}
			// Genuine DB failure after Kintone succeeded → the orphaned Kintone
			// record will be reconciled into our DB by the next scheduled sync.
			console.error(`[RECRUITER][createViaWeb] DB create failed after Kintone id ${kintoneId}:`, error.message)
			throw error
		}
	}

	/**
	 * Idempotency guard for the inbound ADD_RECORD webhook: returns the
	 * existing recruiter if one already has this kintone_id (e.g. the echo of
	 * a web-initiated create), otherwise null.
	 */
	static async findByKintoneId(kintoneId) {
		if (!kintoneId) return null
		return await Recruiter.findOne({ where: { kintone_id: String(kintoneId) } })
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
			delete companyData.isPartner

			if (companyData.company_name !== undefined) {
				if (!recruiter.companyId) {
					throw new Error('Recruiter has no company assigned — cannot update company profile')
				}

				const currentCompany = await Company.findByPk(recruiter.companyId)
				if (!currentCompany) {
					const error = new Error('Company not found')
					error.status = 404
					throw error
				}

				const nextCompanyName = String(companyData.company_name).trim()
				companyData.company_name = nextCompanyName

				if (nextCompanyName !== currentCompany.company_name) {
					const duplicate = await Company.findOne({
						where: {
							company_name: nextCompanyName,
							id: { [Op.ne]: currentCompany.id },
						},
					})
					if (duplicate) {
						const error = new Error('Company with this name already exists')
						error.status = 409
						throw error
					}
				}
			}

			// Did any Kintone-mirrored personal field change?
			const kintoneRelevant = ['email', 'first_name', 'last_name', 'phone']
			const personalChanged = kintoneRelevant.some(f => personalData[f] !== undefined)

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
			const fresh = await RecruiterService.getRecruiterById(id, false, true)

			// Best-effort mirror of personal changes to Kintone (web path only).
			// The webhook path (updateRecruiterByKintoneId) never calls this, so
			// the Kintone echo cannot loop back into another push.
			if (personalChanged && recruiter.kintone_id) {
				await RecruiterService.pushUpdateToKintone(fresh)
			}

			return fresh
		} catch (error) {
			console.error('Update recruiter error:', error)
			throw error
		}
	}

	/**
	 * Best-effort push of a recruiter's personal fields to Kintone.
	 * Never throws — a Kintone outage must not block a DB update. The next
	 * scheduled sync reconciles any drift.
	 */
	static async pushUpdateToKintone(recruiter) {
		try {
			const KintoneService = require('./kintoneService')
			const { toKintoneRecord } = require('../utils/recruiterKintoneMapper')
			const company = recruiter.company || (recruiter.companyId ? await Company.findByPk(recruiter.companyId) : null)
			const payload = toKintoneRecord(recruiter, company)
			await KintoneService.updateRecord('recruiters', recruiter.kintone_id, payload)
		} catch (error) {
			console.error(`[RECRUITER][pushUpdateToKintone] failed for kintone_id ${recruiter.kintone_id}:`, error.message)
		}
	}

	/**
	 * WEB (admin) delete — Kintone-first.
	 * Removes the Kintone record (best-effort: proceeds even if it is already
	 * gone), then deletes the DB row. The echo DELETE_RECORD webhook is a
	 * harmless no-op (row already deleted).
	 */
	static async deleteRecruiterViaWeb(id) {
		const recruiter = await Recruiter.findByPk(id)
		if (!recruiter) {
			const error = new Error('Recruiter not found')
			error.status = 404
			throw error
		}

		if (recruiter.kintone_id) {
			try {
				const KintoneService = require('./kintoneService')
				await KintoneService.deleteRecord('recruiters', recruiter.kintone_id)
			} catch (error) {
				// Already deleted in Kintone, or Kintone unreachable — log and
				// still remove locally so the admin's intent is honored.
				console.error(`[RECRUITER][deleteViaWeb] Kintone delete failed for kintone_id ${recruiter.kintone_id}:`, error.message)
			}
		}

		await recruiter.destroy()
		return true
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
	 * DB-only — never pushes back to Kintone (prevents an update echo loop).
	 */
	static async updateRecruiterByKintoneId(kintoneId, data) {
		const { company_name, isPartner, ...personal } = data

		const recruiter = await Recruiter.findOne({ where: { kintone_id: kintoneId } })
		if (!recruiter) return null

		return await sequelize.transaction(async transaction => {
			if (company_name) {
				const company = await RecruiterService.resolveCompany({ company_name }, transaction)
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
					// isPartner is intentionally NOT synced from Kintone — it is
					// admin-controlled at the company level (via CompanyService).
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
}

module.exports = RecruiterService
