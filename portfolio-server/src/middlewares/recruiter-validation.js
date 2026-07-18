const { body } = require('express-validator')
const { companyFieldRules, handleValidationErrors } = require('./company-validation')

// ===== Personal (recruiter account) field rules =====
const recruiterPersonalRules = ({ forCreation = false } = {}) => [
	forCreation ? body('email').isEmail().withMessage('Email must be a valid email address') : body('email').isEmail().optional({ nullable: true }).withMessage('Email must be a valid email address'),
	body('phone')
		.customSanitizer(v => (v === '' ? null : v))
		.optional({ nullable: true, checkFalsy: true })
		.matches(/^\+?\d{6,15}$/)
		.withMessage('Phone number must be numeric (6-15 digits, optionally + prefix)'),
	forCreation ? body('first_name').notEmpty().withMessage('First name is required') : body('first_name').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('First name must be a string'),
	forCreation ? body('last_name').notEmpty().withMessage('Last name is required') : body('last_name').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Last name must be a string'),
	body('first_name_furigana').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('First name furigana must be a string'),
	body('last_name_furigana').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Last name furigana must be a string'),
	body('date_of_birth').optional({ nullable: true, checkFalsy: true }).isISO8601().toDate().withMessage('Date of birth must be a valid date'),
	body('photo').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Photo must be a string (<=500)'),
	body('active').optional({ nullable: true }).isBoolean().withMessage('Active must be a boolean'),
]

/**
 * POST /api/recruiters (Admin only)
 * Creates a personal recruiter account. The company is referenced either by
 * `companyId` (existing company) or `company_name` (findOrCreate).
 */
exports.validateRecruiterCreation = [
	...recruiterPersonalRules({ forCreation: true }),
	body('password').notEmpty().withMessage('Password is required'),
	body('companyId').optional({ nullable: true }).isInt().withMessage('companyId must be an integer'),
	body('company_name').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Company name must be a string up to 100 chars'),
	body().custom(b => {
		if (!b.companyId && !b.company_name) {
			throw new Error('Either companyId or company_name is required')
		}
		return true
	}),
	handleValidationErrors,
]

/**
 * PUT /api/recruiters/:id
 * Body contains flat personal fields plus an optional nested `company` object
 * with company-profile fields. Example:
 * {
 *   "first_name": "Taro",
 *   "phone": "+8180...",
 *   "company": { "benefits": "...", "salary": "..." }
 * }
 */
exports.validateRecruiterUpdate = [
	...recruiterPersonalRules({ forCreation: false }),
	body('company').optional({ nullable: true }).isObject().withMessage('company must be an object'),
	// Recruiters may NOT rename the company or change partner status via this endpoint
	body('company.company_name').not().exists().withMessage('company_name cannot be changed here — use PUT /api/companies/:id (Admin only)'),
	body('company.isPartner').not().exists().withMessage('isPartner cannot be changed here — use PUT /api/companies/:id (Admin only)'),
	...companyFieldRules('company.'),
	handleValidationErrors,
]
