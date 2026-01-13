const express = require('express')
const StudentController = require('../controllers/studentController')
// const { validateStudentCreation, validateStudentUpdate } = require('../middlewares/student-validation')
const { validateStudentCreation, validateStudentUpdate } = require('../validators/studentValidators')

const authMiddleware = require('../middlewares/auth-middleware')
// const { validateEducation, validateWorkExperience, validateLicenses, validateProjects, validateAdditionalInfo, validateAddress } = require('../validators/studentValidator')
const { checkOwnership } = require('../middlewares/ownershipMiddleware')
const router = express.Router()

/**
 * @swagger
 * tags:
 *   - name: Students
 *     description: Student management
 */

/**
 * @swagger
 * /api/students:
 *   post:
 *     tags: [Students]
 *     summary: Create a new student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               student_id:
 *                 type: string
 *               visibility:
 *                 type: boolean
 *               semester:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Student created successfully
 *       400:
 *         description: Bad request
 */
// POST /api/students
router.post('/', validateStudentCreation, StudentController.createStudent)

/**
 * @swagger
 * /api/students:
 *   get:
 *     tags: [Students]
 *     summary: Retrieve a list of students
 *     responses:
 *       200:
 *         description: A list of students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 */
router.get('/', StudentController.getAllStudents)

/**
 * @swagger
 * /api/students/ids:
 *   get:
 *     tags: [Students]
 *     summary: Get student IDs for autocomplete
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term to filter student IDs
 *     responses:
 *       200:
 *         description: List of student IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   student_id:
 *                     type: string
 *                   name:
 *                     type: string
 */
router.get('/ids', StudentController.getStudentIds)

/**
 * @swagger
 * /api/students/{id}/for-cv:
 *   get:
 *     tags: [Students]
 *     summary: Get student data formatted for CV download
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student CV data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fullName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 education:
 *                   type: array
 *                 workExperience:
 *                   type: array
 *                 licenses:
 *                   type: array
 *                 skills:
 *                   type: object
 *       404:
 *         description: Student not found
 */
router.get('/:id/for-cv', StudentController.getStudentForCV)

/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     tags: [Students]
 *     summary: Retrieve a single student by primary key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A single student
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 */
// GET /api/students/:id
router.get('/:id', StudentController.getStudentById)

/**
 * @swagger
 * /api/students/{id}/credit-details:
 *   get:
 *     tags: [Students]
 *     summary: Get credit details for a student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Credit details retrieved successfully
 *       404:
 *         description: Student not found
 */
// GET /api/students/:id/credit-details
router.get('/:id/credit-details', StudentController.getCreditDetails)

/**
 * @swagger
 * /api/students/{id}/sync-credit-details:
 *   post:
 *     tags: [Students]
 *     summary: Sync credit details for a student from Kintone
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Credit details synced successfully
 *       404:
 *         description: Student not found
 */
// POST /api/students/:id/sync-credit-details
router.post('/:id/sync-credit-details', StudentController.syncStudentCreditDetails)

/**
 * @swagger
 * /api/students/{id}:
 *   put:
 *     tags: [Students]
 *     summary: Update a student by primary key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
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
 *               visibility:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       400:
 *         description: Bad request
 */
// PUT /api/students/:id
// router.put('/:id', validateStudentUpdate, StudentController.updateStudent)

/**
 * @swagger
 * /api/students/{id}:
 *   patch:
 *     tags: [Students]
 *     summary: Update student information (including CV data)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               # Basic fields
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               email:
 *                 type: string
 *               # CV fields
 *               cv_education:
 *                 type: array
 *               cv_work_experience:
 *                 type: array
 *               cv_licenses:
 *                 type: array
 *               cv_projects:
 *                 type: array
 *               cv_additional_info:
 *                 type: object
 *               address_furigana:
 *                 type: string
 *               postal_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not owner or admin
 *       404:
 *         description: Student not found
 */
router.patch('/:id', authMiddleware, checkOwnership, validateStudentUpdate, StudentController.updateStudent)

/**
 * @swagger
 * /api/students/{id}:
 *   delete:
 *     tags: [Students]
 *     summary: Delete a student by primary key
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       400:
 *         description: Bad request
 */
// DELETE /api/students/:id
router.delete('/:id', StudentController.deleteStudent)

// GET Pending status drafts
// router.get('/pending-drafts', StudentController.getStudentsWithPendingDrafts);

module.exports = router
