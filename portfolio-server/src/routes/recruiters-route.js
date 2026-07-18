const express = require('express')
const router = express.Router()
const RecruiterController = require('../controllers/recruiterController')
const { validateRecruiterCreation, validateRecruiterUpdate } = require('../middlewares/recruiter-validation')

// Admin-only guard
const adminOnly = (req, res, next) => {
	if (req.user?.userType !== 'Admin') {
		return res.status(403).json({ error: 'Admin access required' })
	}
	next()
}

/**
 * @swagger
 * /api/recruiters:
 *   post:
 *     tags: [Recruiters]
 *     summary: Create a new recruiter (Admin only). Company is referenced by companyId or company_name (findOrCreate).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, first_name, last_name]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               phone:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               companyId:
 *                 type: integer
 *                 description: ID of an existing company
 *               company_name:
 *                 type: string
 *                 description: Alternative to companyId — company is found or created by name
 *     responses:
 *       201:
 *         description: Recruiter created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Admin access required
 */
router.post('/', adminOnly, validateRecruiterCreation, RecruiterController.create)

/**
 * @swagger
 * /api/recruiters:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get all recruiters (each with nested company object)
 *     parameters:
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter criteria (search matches personal and company fields)
 *     responses:
 *       200:
 *         description: A list of recruiters with nested company
 *       400:
 *         description: Bad request
 */
router.get('/', RecruiterController.getAll)

/**
 * @swagger
 * /api/recruiters/{id}:
 *   get:
 *     tags: [Recruiters]
 *     summary: Get recruiter by ID (with nested company object)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Recruiter ID
 *     responses:
 *       200:
 *         description: Recruiter data with nested company
 *       400:
 *         description: Bad request
 */
router.get('/:id', RecruiterController.getById)

/**
 * @swagger
 * /api/recruiters/{id}:
 *   put:
 *     tags: [Recruiters]
 *     summary: Update a recruiter (personal fields flat, company profile via nested `company` object)
 *     description: |
 *       Personal fields (first_name, phone, email, photo, ...) go at the top level.
 *       Company profile fields go inside the nested `company` object and update the
 *       shared Company record (visible to all recruiters of the same company).
 *       company_name and isPartner cannot be changed here (Admin only, via /api/companies).
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Recruiter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               password:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               first_name_furigana:
 *                 type: string
 *               last_name_furigana:
 *                 type: string
 *               photo:
 *                 type: string
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *               company:
 *                 type: object
 *                 description: Company profile fields (company_description, benefits, salary, gallery, ...)
 *     responses:
 *       200:
 *         description: Recruiter updated (returns recruiter with nested company)
 *       400:
 *         description: Bad request
 *       403:
 *         description: Not allowed
 */
router.put('/:id', validateRecruiterUpdate, RecruiterController.update)

module.exports = router
