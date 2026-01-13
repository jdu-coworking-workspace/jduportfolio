// src/validators/studentValidators.js

const { body, validationResult } = require('express-validator')

// ============================================
// HELPER FUNCTION
// ============================================

const handleValidationErrors = (req, res, next) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			errors: errors.array(),
		})
	}
	next()
}

// ============================================
// VALIDATION RULES
// ============================================

const validateStudentCreation = [body('email').isEmail().withMessage('Email must be a valid email address'), body('password').notEmpty().withMessage('Password is required'), body('first_name').notEmpty().withMessage('First name is required'), body('last_name').notEmpty().withMessage('Last name is required'), body('graduation_year').optional().isString().withMessage('Graduation year must be a string'), body('graduation_season').optional().isString().withMessage('Graduation season must be a string'), body('language_skills').optional().isString().withMessage('Language skills must be a string'), body('date_of_birth').isISO8601().toDate().withMessage('Date of birth must be a valid date'), handleValidationErrors]

const validateStudentUpdate = [
	// Basic fields
	body('graduation_year').optional().isString().withMessage('Graduation year must be a string'),
	body('graduation_season').optional().isString().withMessage('Graduation season must be a string'),
	body('language_skills').optional().isString().withMessage('Language skills must be a string'),
	body('email').optional().isEmail().withMessage('Email must be a valid email address'),
	body('date_of_birth').optional().isISO8601().toDate().withMessage('Date of birth must be a valid date'),

	// ========== CV FIELDS VALIDATION ==========

	// CV Education
	body('cv_education').optional().isArray().withMessage('cv_education must be an array'),
	body('cv_education.*.year').optional().isInt({ min: 1900, max: 2100 }).withMessage('Year must be between 1900 and 2100'),
	body('cv_education.*.month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
	body('cv_education.*.institution').optional().trim().isLength({ max: 255 }).withMessage('Institution name must be less than 255 characters'),
	body('cv_education.*.status').optional().trim().isLength({ max: 50 }).withMessage('Status must be less than 50 characters'),

	// CV Work Experience
	body('cv_work_experience').optional().isArray().withMessage('cv_work_experience must be an array'),
	body('cv_work_experience.*.company').optional().trim().isLength({ max: 255 }).withMessage('Company name must be less than 255 characters'),
	body('cv_work_experience.*.role').optional().trim().isLength({ max: 255 }).withMessage('Role must be less than 255 characters'),
	body('cv_work_experience.*.from').optional().isISO8601().withMessage('Start date must be a valid date'),
	body('cv_work_experience.*.to').optional({ nullable: true }).isISO8601().withMessage('End date must be a valid date'),
	body('cv_work_experience.*.details').optional().trim().isLength({ max: 1000 }).withMessage('Details must be less than 1000 characters'),

	// CV Licenses
	body('cv_licenses').optional().isArray().withMessage('cv_licenses must be an array'),
	body('cv_licenses.*.year').optional().isInt({ min: 1900, max: 2100 }).withMessage('Year must be between 1900 and 2100'),
	body('cv_licenses.*.month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
	body('cv_licenses.*.certifacateName').optional().trim().isLength({ max: 255 }).withMessage('Certificate name must be less than 255 characters'),

	// CV Projects
	body('cv_projects').optional().isArray().withMessage('cv_projects must be an array'),
	body('cv_projects.*.title').optional().trim().isLength({ max: 255 }).withMessage('Project title must be less than 255 characters'),
	body('cv_projects.*.description').optional().trim().isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
	body('cv_projects.*.technologies').optional().isArray().withMessage('Technologies must be an array'),
	body('cv_projects.*.url').optional().trim().isURL().withMessage('URL must be valid'),
	body('cv_projects.*.startDate').optional().isISO8601().withMessage('Start date must be valid'),
	body('cv_projects.*.endDate').optional().isISO8601().withMessage('End date must be valid'),

	// CV Additional Info
	body('cv_additional_info').optional().isObject().withMessage('cv_additional_info must be an object'),
	body('cv_additional_info.addressFurigana').optional().trim().isLength({ max: 255 }).withMessage('Address furigana must be less than 255 characters'),
	body('cv_additional_info.indeks').optional().trim().isLength({ max: 20 }).withMessage('Indeks must be less than 20 characters'),
	body('cv_additional_info.additionalAddress').optional().trim().isLength({ max: 500 }).withMessage('Additional address must be less than 500 characters'),
	body('cv_additional_info.additionalAddressFurigana').optional().trim().isLength({ max: 255 }),
	body('cv_additional_info.additionalIndeks').optional().trim().isLength({ max: 20 }),
	body('cv_additional_info.additionalEmail').optional().trim().isEmail().withMessage('Additional email must be valid'),
	body('cv_additional_info.transportation').optional().trim().isLength({ max: 100 }).withMessage('Transportation must be less than 100 characters'),
	body('cv_additional_info.commuteTime').optional().isInt({ min: 0, max: 300 }).withMessage('Commute time must be between 0 and 300 minutes'),
	body('cv_additional_info.numDependents').optional().isInt({ min: 0 }).withMessage('Number of dependents must be 0 or greater'),
	body('cv_additional_info.isMarried').optional().isBoolean().withMessage('Married status must be boolean'),
	body('cv_additional_info.spousalSupportObligation').optional().isBoolean().withMessage('Spousal support obligation must be boolean'),
	body('cv_additional_info.hopes').optional().trim().isLength({ max: 2000 }).withMessage('Hopes must be less than 2000 characters'),
	body('cv_additional_info.languageUzbek').optional().trim().isLength({ max: 50 }),
	body('cv_additional_info.languageEnglish').optional().trim().isLength({ max: 50 }),
	body('cv_additional_info.languageRussian').optional().trim().isLength({ max: 50 }),
	body('cv_additional_info.tools').optional().isArray().withMessage('Tools must be an array'),
	body('cv_additional_info.databases').optional().isArray().withMessage('Databases must be an array'),
	body('cv_additional_info.arubatio').optional().isArray().withMessage('Arubatio must be an array'),

	// Address fields (top-level)
	body('address_furigana').optional().trim().isLength({ max: 255 }).withMessage('Address furigana must be less than 255 characters'),
	body('postal_code').optional().trim().isLength({ max: 20 }).withMessage('Postal code must be less than 20 characters'),

	handleValidationErrors,
]

// ============================================
// EXPORTS
// ============================================

module.exports = {
	validateStudentCreation,
	validateStudentUpdate,
}
