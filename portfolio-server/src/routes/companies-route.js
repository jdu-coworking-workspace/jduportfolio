const express = require('express')
const router = express.Router()
const CompanyController = require('../controllers/companyController')
const { validateCompanyCreation, validateCompanyUpdate } = require('../middlewares/company-validation')

// Admin-only guard (same pattern as maintenance-admin-route)
const adminOnly = (req, res, next) => {
	if (req.user?.userType !== 'Admin') {
		return res.status(403).json({ error: 'Admin access required' })
	}
	next()
}

/**
 * @swagger
 * /api/companies:
 *   get:
 *     tags: [Companies]
 *     summary: Get all companies (with their recruiters)
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         required: false
 *       - in: query
 *         name: isPartner
 *         schema:
 *           type: boolean
 *         required: false
 *     responses:
 *       200:
 *         description: A list of companies
 */
router.get('/', CompanyController.getAll)

/**
 * @swagger
 * /api/companies/{id}:
 *   get:
 *     tags: [Companies]
 *     summary: Get company by ID (with its recruiters)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Company data
 *       404:
 *         description: Company not found
 */
router.get('/:id', CompanyController.getById)

/**
 * @swagger
 * /api/companies:
 *   post:
 *     tags: [Companies]
 *     summary: Create a company (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [company_name]
 *             properties:
 *               company_name:
 *                 type: string
 *               isPartner:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Company created
 *       409:
 *         description: Company with this name already exists
 */
router.post('/', adminOnly, validateCompanyCreation, CompanyController.create)

/**
 * @swagger
 * /api/companies/{id}:
 *   put:
 *     tags: [Companies]
 *     summary: Update a company (Admin - full; Recruiter - own company profile fields)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Company updated
 *       403:
 *         description: Not allowed
 *       404:
 *         description: Company not found
 */
router.put('/:id', validateCompanyUpdate, CompanyController.update)

/**
 * @swagger
 * /api/companies/{id}:
 *   delete:
 *     tags: [Companies]
 *     summary: Delete a company (Admin only). Recruiters are unlinked, not deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       204:
 *         description: Company deleted
 *       404:
 *         description: Company not found
 */
router.delete('/:id', adminOnly, CompanyController.delete)

/**
 * @swagger
 * /api/companies/{id}/recruiters:
 *   post:
 *     tags: [Companies]
 *     summary: Assign a recruiter to a company (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [recruiterId]
 *             properties:
 *               recruiterId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Recruiter assigned, returns updated company
 */
router.post('/:id/recruiters', adminOnly, CompanyController.assignRecruiter)

/**
 * @swagger
 * /api/companies/{id}/recruiters/{recruiterId}:
 *   delete:
 *     tags: [Companies]
 *     summary: Unassign a recruiter from a company (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: recruiterId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Recruiter unassigned, returns updated company
 */
router.delete('/:id/recruiters/:recruiterId', adminOnly, CompanyController.unassignRecruiter)

module.exports = router
