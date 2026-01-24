const express = require('express')
const StudentController = require('../controllers/studentController')
const { validateStudentCreation, validateStudentUpdate } = require('../middlewares/student-validation')

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
 * /api/students/language-skills:
 *   get:
 *     tags: [Students]
 *     summary: Get all unique language skills from students
 *     responses:
 *       200:
 *         description: List of unique language skills
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 */
router.get('/language-skills', StudentController.getLanguageSkills)

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
router.put('/:id', validateStudentUpdate, StudentController.updateStudent)

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
