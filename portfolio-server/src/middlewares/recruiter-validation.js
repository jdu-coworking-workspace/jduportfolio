const { body, validationResult } = require('express-validator')

// Middleware to validate recruiter creation request
exports.validateRecruiterCreation = [
	body('email').isEmail().withMessage('Email must be a valid email address'),
	body('password').notEmpty().withMessage('Password is required'),
	body('company_name').notEmpty().withMessage('Company name is required'),
	body('phone')
		.customSanitizer(v => (v === '' ? null : v))
		.optional({ nullable: true, checkFalsy: true })
		.matches(/^\+?\d{6,15}$/)
		.withMessage('Phone number must be numeric (6-15 digits, optionally + prefix)'),
	body('first_name').notEmpty().withMessage('First name is required'),
	body('last_name').notEmpty().withMessage('Last name is required'),
	body('date_of_birth').isISO8601().toDate().withMessage('Date of birth must be a valid date'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}
		next()
	},
]

// Helpers
const isValidUrl = val => {
	try {
		const u = new URL(val)
		return u.protocol === 'http:' || u.protocol === 'https:'
	} catch (e) {
		return false
	}
}

const normalizeCommaList = val => {
	if (val == null) return val
	if (Array.isArray(val)) {
		const uniq = Array.from(new Set(val.map(v => String(v).trim()).filter(v => v)))
		return uniq.join(', ')
	}
	const parts = String(val)
		.split(',')
		.map(s => s.trim())
		.filter(Boolean)
	const uniq = Array.from(new Set(parts))
	return uniq.join(', ')
}

// Middleware to validate recruiter update request
exports.validateRecruiterUpdate = [
	body('email').isEmail().optional({ nullable: true }).withMessage('Email must be a valid email address'),
	body('phone')
		.customSanitizer(v => (v === '' ? null : v))
		.optional({ nullable: true, checkFalsy: true })
		.matches(/^\+?\d{6,15}$/)
		.withMessage('Phone number must be numeric (6-15 digits, optionally + prefix)'),
	body('company_name').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Company name must be a string up to 100 chars'),
	body('company_Address').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Company address must be a string (<=1000 chars)'),
	body('established_Date').optional({ nullable: true }).isString().withMessage('Established date must be a string'),
	body('employee_Count').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Employee count must be a string up to 500 chars'),
	body('business_overview').optional({ nullable: true }).isString().isLength({ max: 5000 }).withMessage('Business overview must be a string'),
	body('target_audience').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().withMessage('Target audience must be a string'),
	body('required_skills').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().withMessage('Required skills must be a string'),
	body('welcome_skills').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().withMessage('Welcome skills must be a string'),
	body('work_location').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Work location must be a string (<=1000 chars)'),
	body('work_hours').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Work hours must be a string'),
	body('salary').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Salary must be a string'),
	body('benefits').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Benefits must be a string'),
	body('selection_process').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Selection process must be a string'),
	// New fields - optional validations
	body('company_website')
		.optional({ nullable: true })
		.customSanitizer(v => (v == null ? v : String(v).trim()))
		.custom(v => (v == null || v === '' ? true : isValidUrl(v)))
		.withMessage('Website must be a valid URL'),
	body('company_capital').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Capital must be a string (<=500)'),
	body('company_revenue').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Revenue must be a string (<=500)'),
	body('company_representative').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Representative must be a string'),
	body('tagline')
		.optional({ nullable: true })
		.customSanitizer(v =>
			v == null
				? v
				: String(v)
						.replace(/[\r\n]+/g, ' ')
						.trim()
		)
		.isString()
		.isLength({ max: 50 })
		.withMessage('Tagline must be a single line up to 50 chars'),
	body('job_title').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Job title must be a string'),
	body('job_description').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Job description must be at most 1000 chars'),
	body('number_of_openings').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Number of openings must be a string up to 500 chars'),
	body('employment_type').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Employment type must be a string'),
	body('probation_period').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Probation period must be a string'),
	body('employment_period').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Employment period must be a string'),
	body('recommended_skills').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().isLength({ max: 500 }).withMessage('Recommended skills must be a string'),
	body('recommended_licenses').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().isLength({ max: 500 }).withMessage('Recommended licenses must be a string'),
	body('recommended_other').optional({ nullable: true }).customSanitizer(normalizeCommaList).isString().isLength({ max: 500 }).withMessage('Recommended other must be a string'),
	body('salary_increase').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Salary increase must be a string'),
	body('bonus').optional({ nullable: true }).isString().isLength({ max: 1000 }).withMessage('Bonus must be a string'),
	body('allowances').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Allowances must be a string (<=500)'),
	body('holidays_vacation').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Holidays/vacation must be a string'),
	body('other_notes').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Other notes must be a string'),
	body('interview_method').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Interview method must be a string'),

	// Additional fields
	body('japanese_level').optional({ nullable: true }).isString().isLength({ max: 100 }).withMessage('Japanese level must be a string'),
	body('application_requirements_other').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Other requirements must be a string (<=500)'),
	body('retirement_benefit').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Retirement benefit must be a string (<=500)'),
	body('telework_availability').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Telework availability must be a string'),
	body('housing_availability').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Housing availability must be a string'),
	body('relocation_support').optional({ nullable: true }).isString().withMessage('Relocation support must be a string'),
	body('airport_pickup').optional({ nullable: true }).isString().isLength({ max: 200 }).withMessage('Airport pickup must be a string'),
	body('intro_page_thumbnail').optional({ nullable: true }).isString().isLength({ max: 500 }).withMessage('Intro page thumbnail must be a string (<=500)'),
	body('intro_page_links')
		.optional({ nullable: true })
		.isArray({ max: 4 })
		.withMessage('intro_page_links must be an array (max 4)')
		// Normalize to array of { title, url }
		.customSanitizer(arr => {
			if (!Array.isArray(arr)) return arr
			return arr
				.map(item => {
					if (typeof item === 'string') {
						return { title: '', url: String(item).trim() }
					}
					if (item && typeof item === 'object') {
						return {
							title: item.title != null ? String(item.title).trim() : '',
							url: item.url != null ? String(item.url).trim() : '',
						}
					}
					return null
				})
				.filter(v => v && v.url)
		})
		.custom(arr => arr.every(v => v && typeof v.url === 'string' && v.url.length > 0 && (v.title == null || typeof v.title === 'string')))
		.withMessage('Each intro link must be an object { title?, url } with non-empty url'),
	// Enforce title length <= 50
	body('intro_page_links')
		.optional({ nullable: true })
		.custom(arr => arr.every(v => (v.title ? String(v.title).length <= 50 : true)))
		.withMessage('Intro link title must be at most 50 characters'),

	// Arrays
	body('company_video_url')
		.optional({ nullable: true })
		.isArray({ max: 3 })
		.withMessage('company_video_url must be an array')
		.custom(arr => arr.every(u => typeof u === 'string' && isValidUrl(u)))
		.withMessage('All video URLs must be valid URLs')
		.custom(arr => arr.every(u => /(youtube\.com|youtu\.be)/i.test(u)))
		.withMessage('Video URLs must be YouTube links'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}
		next()
	},
]
