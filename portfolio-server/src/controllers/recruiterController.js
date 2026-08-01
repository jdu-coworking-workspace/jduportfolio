const bcrypt = require('bcrypt')
const { validationResult } = require('express-validator')
const RecruiterService = require('../services/recruiterService')
const { sendRecruiterWelcomeEmail } = require('../utils/emailToRecruiter')
const generatePassword = require('generate-password')

class RecruiterController {
	/**
	 * Webhook handler for Kintone events.
	 *
	 * The Kintone payload is a single flat record containing both personal
	 * fields (recruiterEmail, recruiterFirstName...) and the company name
	 * (recruiterCompany). The service layer resolves the company via
	 * findOrCreate(company_name) and links Company.id to Recruiter.companyId.
	 */
	static async webhookHandler(req, res) {
		try {
			const { type, record, recordId } = req.body

			switch (type) {
				case 'ADD_RECORD': {
					const kintoneId = record['$id']?.value

					// Idempotency: absorb the echo of a web-initiated create.
					// If a recruiter with this kintone_id already exists, do
					// nothing (no duplicate, no second welcome email).
					const existing = await RecruiterService.findByKintoneId(kintoneId)
					if (existing) {
						console.log(`[WEBHOOK] ADD_RECORD echo ignored — recruiter with kintone_id ${kintoneId} already exists`)
						return res.status(200).json({ message: 'Already exists', recruiter: existing })
					}

					const password = generatePassword.generate({
						length: 12,
						numbers: true,
						symbols: false,
						uppercase: true,
					})

					const data = {
						email: record.recruiterEmail?.value,
						password: password,
						first_name: record.recruiterFirstName?.value,
						last_name: record.recruiterLastName?.value,
						phone: record.recruiterPhone?.value,
						kintone_id: kintoneId,
						// Company info — resolved to companyId inside the service
						company_name: record.recruiterCompany?.value,
					}
					const newRecruiter = await RecruiterService.createRecruiter(data)
					if (newRecruiter) {
						console.log(`[WEBHOOK] New recruiter created: ${newRecruiter.email}, attempting to send welcome email...`)
						try {
							await sendRecruiterWelcomeEmail(newRecruiter.email, password, newRecruiter.first_name, newRecruiter.last_name)
							console.log(`[WEBHOOK] Welcome email sent successfully for recruiter: ${newRecruiter.email}`)
						} catch (emailError) {
							console.error(`[WEBHOOK] Failed to send welcome email for recruiter ${newRecruiter.email}:`, emailError)
							console.error('[WEBHOOK] Email error stack:', emailError.stack)
						}
					}
					return res.status(201).json(newRecruiter)
				}
				case 'UPDATE_RECORD': {
					const recruiterData = {
						email: record.recruiterEmail?.value,
						first_name: record.recruiterFirstName?.value,
						last_name: record.recruiterLastName?.value,
						phone: record.recruiterPhone?.value,
						kintone_id: record['$id']?.value,
						// Company info — if the name changed, the service re-links
						// the recruiter to the (found-or-created) company
						company_name: record.recruiterCompany?.value,
					}
					const updatedRecruiter = await RecruiterService.updateRecruiterByKintoneId(record['$id']?.value, recruiterData)
					if (!updatedRecruiter) return res.status(404).json({ message: 'Recruiter not found' })
					return res.status(200).json({ message: 'Updated', recruiter: updatedRecruiter })
				}
				case 'DELETE_RECORD': {
					// Idempotent: a 0-count delete means the row is already gone
					// (e.g. the echo of a web-initiated delete). Treat as success
					// so Kintone doesn't retry the webhook.
					await RecruiterService.deleteRecruiterByKintoneId(recordId)
					return res.status(204).send()
				}
				default:
					return res.status(400).json({ message: 'Invalid event type' })
			}
		} catch (error) {
			console.error('Recruiter webhook error:', error)
			return res.status(500).json({ message: 'Internal Server Error' })
		}
	}

	// Admin only: create a recruiter account linked to an existing company.
	// Kintone-first — the recruiter is created in Kintone, then in our DB.
	static async create(req, res, next) {
		try {
			const errors = validationResult(req)
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() })
			}

			const newRecruiter = await RecruiterService.createRecruiterViaWeb(req.body)
			res.status(201).json(newRecruiter)
		} catch (error) {
			if (error.status) {
				return res.status(error.status).json({ error: error.message })
			}
			next(error)
		}
	}

	static async getAll(req, res, next) {
		try {
			let filter = {}

			// Handle both filter and filter[key] formats
			if (req.query.filter) {
				try {
					filter = typeof req.query.filter === 'string' ? JSON.parse(req.query.filter) : req.query.filter
				} catch (e) {
					console.error('Failed to parse filter:', e.message)
					// If JSON parsing fails, treat it as a direct search value
					filter = { search: req.query.filter }
				}
			}

			// Handle URL query parameter format like filter[search]=Peter
			Object.keys(req.query).forEach(key => {
				if (key.startsWith('filter[') && key.endsWith(']')) {
					const filterKey = key.slice(7, -1) // Remove 'filter[' and ']'
					filter[filterKey] = req.query[key]
				}
			})

			const recruiters = await RecruiterService.getAllRecruiters(filter)

			// Set cache control headers to prevent 304 responses
			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
			})

			res.status(200).json(recruiters)
		} catch (error) {
			console.error('Error in getAllRecruiters controller:', error.message, error.stack)

			// Return empty array instead of 500 error for better UX
			res.status(200).json([])
		}
	}

	static async getById(req, res, next) {
		try {
			const authenticatedUserId = req.user?.id
			const authenticatedUserType = req.user?.userType
			const isSelf = authenticatedUserType === 'Recruiter' && String(authenticatedUserId) === String(req.params.id)
			const recruiter = await RecruiterService.getRecruiterById(req.params.id, false, isSelf)
			res.status(200).json(recruiter)
		} catch (error) {
			next(error)
		}
	}

	/**
	 * Updates a recruiter's personal profile and, via the nested `company`
	 * object, the shared company profile.
	 *
	 * Permissions:
	 *  - Admin/Staff: any recruiter
	 *  - Recruiter: only own profile (and thereby own company's profile)
	 */
	static async update(req, res, next) {
		try {
			const { id } = req.params
			const authenticatedUserId = req.user?.id
			const authenticatedUserType = req.user?.userType
			const isSelf = authenticatedUserType === 'Recruiter' && String(authenticatedUserId) === String(id)
			const isPrivileged = authenticatedUserType === 'Admin' || authenticatedUserType === 'Staff'

			if (!isSelf && !isPrivileged) {
				return res.status(403).json({ error: 'You are not allowed to update this recruiter' })
			}

			const { currentPassword, password, ...updateData } = req.body

			if (password) {
				const recruiter = await RecruiterService.getRecruiterById(id, true, isSelf)
				if (!recruiter || !(await bcrypt.compare(currentPassword, recruiter.password))) {
					return res.status(400).json({ error: '現在のパスワードを入力してください' })
				}
			}

			const updatedRecruiter = await RecruiterService.updateRecruiter(id, {
				...updateData,
				currentPassword,
				password: password || undefined,
			})
			res.status(200).json(updatedRecruiter)
		} catch (error) {
			next(error)
		}
	}

	/**
	 * DELETE /api/recruiters/:id (Admin only)
	 * Kintone-first: removes the record from Kintone, then from our DB.
	 */
	static async delete(req, res, next) {
		try {
			await RecruiterService.deleteRecruiterViaWeb(req.params.id)
			res.status(204).send()
		} catch (error) {
			if (error.status) {
				return res.status(error.status).json({ error: error.message })
			}
			next(error)
		}
	}
}

module.exports = RecruiterController
