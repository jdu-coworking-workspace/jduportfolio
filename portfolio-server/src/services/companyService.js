const { Op } = require('sequelize')
const { Company, Recruiter, UserFile } = require('../models')
const { COMPANY_UPDATABLE_FIELDS, pickFields } = require('../utils/recruiterCompanyFields')

const recruitersInclude = {
	model: Recruiter,
	as: 'recruiters',
	attributes: { exclude: ['password'] },
}

class CompanyService {
	/**
	 * Creates a company (Admin only). company_name must be unique.
	 */
	static async createCompany(data) {
		const companyData = pickFields(data, COMPANY_UPDATABLE_FIELDS)
		if (data.isPartner !== undefined) companyData.isPartner = data.isPartner === true

		const existing = await Company.findOne({
			where: { company_name: companyData.company_name },
		})
		if (existing) {
			const error = new Error('Company with this name already exists')
			error.status = 409
			throw error
		}

		return await Company.create(companyData)
	}

	static async getAllCompanies(filter = {}) {
		const where = {}

		if (filter.search && String(filter.search).trim() !== '') {
			const searchValue = String(filter.search).trim()
			where[Op.or] = ['company_name', 'company_description', 'company_Address', 'tagline', 'job_title'].map(column => ({
				[column]: { [Op.iLike]: `%${searchValue}%` },
			}))
		}

		if (filter.isPartner !== undefined) {
			where.isPartner = String(filter.isPartner) === 'true'
		}

		return await Company.findAll({
			where,
			include: [recruitersInclude],
			order: [['company_name', 'ASC']],
		})
	}

	static async getCompanyById(id) {
		const company = await Company.findByPk(id, {
			include: [recruitersInclude],
		})
		if (!company) {
			const error = new Error('Company not found')
			error.status = 404
			throw error
		}
		return company
	}

	static async resolveCompanyIdForDetails({ companyId, user }) {
		if (companyId) return companyId

		if (user?.userType === 'Recruiter') {
			const recruiter = await Recruiter.findByPk(user.id, {
				attributes: ['id', 'companyId'],
			})
			if (!recruiter?.companyId) {
				const error = new Error('Recruiter is not assigned to a company')
				error.status = 404
				throw error
			}
			return recruiter.companyId
		}

		const error = new Error('companyId query parameter is required')
		error.status = 400
		throw error
	}

	static async getCompanyDetails({ companyId, user }) {
		const resolvedCompanyId = await CompanyService.resolveCompanyIdForDetails({ companyId, user })
		const company = await CompanyService.getCompanyById(resolvedCompanyId)
		const plainCompany = company.toJSON()
		delete plainCompany.isPartner

		const recruiters = (plainCompany.recruiters || []).map(recruiter => {
			const { password, ...safeRecruiter } = recruiter
			return safeRecruiter
		})
		const recruiterIds = recruiters.map(recruiter => recruiter.id).filter(Boolean)

		const files = recruiterIds.length
			? await UserFile.findAll({
					where: {
						owner_id: { [Op.in]: recruiterIds },
						owner_type: 'Recruiter',
					},
					order: [['createdAt', 'DESC']],
				})
			: []

		const fileRows = files.map(file => file.toJSON())
		const totalSize = fileRows.reduce((sum, file) => sum + (file.file_size || 0), 0)
		const companyPayload = {
			...plainCompany,
			recruiters,
		}

		return {
			...companyPayload,
			company: companyPayload,
			primaryRecruiter: recruiters[0] || null,
			recruiter: recruiters[0] || null,
			files: fileRows,
			totalSize,
			maxSize: 20 * 1024 * 1024,
		}
	}

	/**
	 * Updates a company profile.
	 * `isAdmin` unlocks admin-only fields (company_name, isPartner).
	 */
	static async updateCompany(id, data, { isAdmin = false } = {}) {
		const company = await Company.findByPk(id)
		if (!company) {
			const error = new Error('Company not found')
			error.status = 404
			throw error
		}

		const companyData = pickFields(data, COMPANY_UPDATABLE_FIELDS)

		if (!isAdmin) {
			delete companyData.company_name
		} else {
			if (companyData.company_name && companyData.company_name !== company.company_name) {
				const duplicate = await Company.findOne({
					where: { company_name: companyData.company_name, id: { [Op.ne]: id } },
				})
				if (duplicate) {
					const error = new Error('Company with this name already exists')
					error.status = 409
					throw error
				}
			}
			if (data.isPartner !== undefined) {
				companyData.isPartner = data.isPartner === true
			}
		}

		await company.update(companyData)
		return await CompanyService.getCompanyById(id)
	}

	/**
	 * Deletes a company (Admin only). Recruiters keep their accounts
	 * (companyId becomes NULL via FK ON DELETE SET NULL).
	 */
	static async deleteCompany(id) {
		const deleted = await Company.destroy({ where: { id } })
		if (!deleted) {
			const error = new Error('Company not found')
			error.status = 404
			throw error
		}
		return deleted
	}

	/**
	 * Assigns an existing recruiter to a company (Admin only).
	 */
	static async assignRecruiter(companyId, recruiterId) {
		const company = await Company.findByPk(companyId)
		if (!company) {
			const error = new Error('Company not found')
			error.status = 404
			throw error
		}

		const recruiter = await Recruiter.findByPk(recruiterId)
		if (!recruiter) {
			const error = new Error('Recruiter not found')
			error.status = 404
			throw error
		}

		await recruiter.update({ companyId: company.id })
		return await CompanyService.getCompanyById(companyId)
	}

	/**
	 * Unassigns a recruiter from a company (Admin only).
	 */
	static async unassignRecruiter(companyId, recruiterId) {
		const recruiter = await Recruiter.findOne({
			where: { id: recruiterId, companyId },
		})
		if (!recruiter) {
			const error = new Error('Recruiter not found in this company')
			error.status = 404
			throw error
		}

		await recruiter.update({ companyId: null })
		return await CompanyService.getCompanyById(companyId)
	}
}

module.exports = CompanyService
