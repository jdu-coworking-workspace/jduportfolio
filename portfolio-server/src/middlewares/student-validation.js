// validators/studentValidators.js

const { body, validationResult } = require('express-validator')

// Validation middleware for creating a student
exports.validateStudentCreation = [
	body('email').isEmail().withMessage('Email must be a valid email address'),
	body('password').notEmpty().withMessage('Password is required'),
	body('first_name').notEmpty().withMessage('First name is required'),
	body('last_name').notEmpty().withMessage('Last name is required'),
	body('graduation_year').optional().isString().withMessage('Graduation year must be a string'),
	body('graduation_season').optional().isString().withMessage('Graduation season must be a string'),
	body('language_skills').optional().isString().withMessage('Language skills must be a string'),
	body('date_of_birth').isISO8601().toDate().withMessage('Date of birth must be a valid date'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}
		next()
	},
]

// Validation middleware for updating a student
exports.validateStudentUpdate = [
	body('first_name').optional().isString().withMessage('First name must be a string'),
	body('last_name').optional().isString().withMessage('Last name must be a string'),
	body('first_name_furigana').optional().isString().withMessage('First name furigana must be a string'),
	body('last_name_furigana').optional().isString().withMessage('Last name furigana must be a string'),
	body('phone').optional().isString().withMessage('Phone must be a string'),
	body('email').optional().isEmail().withMessage('Email must be a valid email address'),
	body('postal_code').optional().isString().withMessage('Postal code must be a string'),
	body('graduation_year').optional().isString().withMessage('Graduation year must be a string'),
	body('graduation_season').optional().isString().withMessage('Graduation season must be a string'),
	body('language_skills').optional().isString().withMessage('Language skills must be a string'),
	body('date_of_birth').optional().isISO8601().toDate().withMessage('Date of birth must be a valid date'),
	body('additional_info').optional().isObject().withMessage('Additional info must be an object'),
	body('additional_info.additionalAddress').optional().isString().withMessage('Additional address must be a string'),
	body('additional_info.additionalAddressFurigana').optional().isString().withMessage('Additional address furigana must be a string'),
	body('additional_info.additionalEmail').optional().isString().withMessage('Additional email must be a string'),
	body('additional_info.additionalIndeks').optional().isString().withMessage('Additional index must be a string'),
	body('additional_info.additionalPhone').optional().isString().withMessage('Additional phone must be a string'),
	body('additional_info.isMarried').optional().isBoolean().withMessage('Marital status must be a boolean'),
	(req, res, next) => {
		const errors = validationResult(req)
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() })
		}
		next()
	},
]
