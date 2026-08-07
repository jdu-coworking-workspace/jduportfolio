const { validationResult } = require('express-validator')
const CompanyService = require('../services/companyService')

const handleServiceError = (res, error, next) => {
	if (error.status) {
		return res.status(error.status).json({ error: error.message })
	}
	next(error)
}

class CompanyController {
	// POST /api/companies (Admin only)
	static async create(req, res, next) {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() })
			}

			const company = await CompanyService.createCompany(req.body)
			res.status(201).json(company)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	// GET /api/companies
	static async getAll(req, res, next) {
		try {
			const filter = {
				search: req.query.search,
				isPartner: req.query.isPartner,
			}
			const companies = await CompanyService.getAllCompanies(filter)
			res.status(200).json(companies)
		} catch (error) {
			next(error)
		}
	}

	// GET /api/companies/:id
	static async getById(req, res, next) {
		try {
			const company = await CompanyService.getCompanyById(req.params.id)
			res.status(200).json(company)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	// GET /api/company/details?companyId=:id
	static async getDetails(req, res, next) {
		try {
			const details = await CompanyService.getCompanyDetails({
				companyId: req.query.companyId || req.query.id,
				user: req.user,
			})
			res.status(200).json(details)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	/**
	 * PUT /api/companies/:id
	 * Admin: full update (incl. company_name, isPartner).
	 * Recruiter: may update own company's profile fields only.
	 */
	static async update(req, res, next) {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() })
			}

			const userType = req.user?.userType
			const isAdmin = userType === 'Admin' || userType === 'Staff'

			if (!isAdmin) {
				if (userType !== 'Recruiter') {
					return res.status(403).json({ error: 'You are not allowed to update companies' })
				}
				// A recruiter may only edit the company they belong to
				const RecruiterService = require('../services/recruiterService')
				const recruiter = await RecruiterService.getRecruiterById(req.user.id, false, true)
				if (!recruiter || String(recruiter.companyId) !== String(req.params.id)) {
					return res.status(403).json({ error: 'You can only update your own company' })
				}
			}

			const company = await CompanyService.updateCompany(req.params.id, req.body, { isAdmin })
			res.status(200).json(company)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	// DELETE /api/companies/:id (Admin only)
	static async delete(req, res, next) {
		try {
			await CompanyService.deleteCompany(req.params.id)
			res.status(204).send()
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	// POST /api/companies/:id/recruiters (Admin only) — body: { recruiterId }
	static async assignRecruiter(req, res, next) {
		try {
			const { recruiterId } = req.body
			if (!recruiterId) {
				return res.status(400).json({ error: 'recruiterId is required' })
			}
			const company = await CompanyService.assignRecruiter(req.params.id, recruiterId)
			res.status(200).json(company)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}

	// DELETE /api/companies/:id/recruiters/:recruiterId (Admin only)
	static async unassignRecruiter(req, res, next) {
		try {
			const company = await CompanyService.unassignRecruiter(req.params.id, req.params.recruiterId)
			res.status(200).json(company)
		} catch (error) {
			handleServiceError(res, error, next)
		}
	}
}

module.exports = CompanyController
