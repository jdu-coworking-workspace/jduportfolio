'use strict'

const express = require('express')
const router = express.Router()
const authMiddleware = require('../middlewares/auth-middleware')
const MailServiceController = require('../controllers/mailServiceController')

/**
 * @swagger
 * tags:
 *   - name: MailService
 *     description: Mail service settings and actions
 */

/**
 * @swagger
 * /api/mail-service:
 *   get:
 *     tags: [MailService]
 *     summary: Get all mail service settings
 *     responses:
 *       200:
 *         description: List of mail service settings
 */
router.get('/', authMiddleware, MailServiceController.getAllSettings)

/**
 * @swagger
 * /api/mail-service/{key}:
 *   get:
 *     tags: [MailService]
 *     summary: Get a specific mail service setting
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:key', authMiddleware, MailServiceController.getSetting)

/**
 * @swagger
 * /api/mail-service/{key}:
 *   put:
 *     tags: [MailService]
 *     summary: Update a mail service setting
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:key', authMiddleware, MailServiceController.updateSetting)

/**
 * @swagger
 * /api/mail-service/{key}/toggle:
 *   patch:
 *     tags: [MailService]
 *     summary: Toggle active status of a mail service setting
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:key/toggle', authMiddleware, MailServiceController.toggleActive)

/**
 * @swagger
 * /api/mail-service/inactive-students/search:
 *   get:
 *     tags: [MailService]
 *     summary: Find inactive students for a given period
 *     parameters:
 *       - in: query
 *         name: periodDays
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/inactive-students/search', authMiddleware, MailServiceController.findInactiveStudents)

/**
 * @swagger
 * /api/mail-service/inactive-students/send:
 *   post:
 *     tags: [MailService]
 *     summary: Send emails to inactive students
 */
router.post('/inactive-students/send', authMiddleware, MailServiceController.sendInactiveStudentEmails)

module.exports = router
