const express = require('express')
const router = express.Router()
const SettingsController = require('../controllers/settingController')

/**
 * @swagger
 * /api/settings/{key}:
 *   get:
 *     tags: [Settings]
 *     summary: Retrieve a specific setting by key
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         description: The key identifying the setting
 *     responses:
 *       200:
 *         description: Retrieved setting
 *       404:
 *         description: Setting not found
 *       500:
 *         description: Internal server error
 *
 *   put:
 *     tags: [Settings]
 *     summary: Update a specific setting by key
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Setting updated
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Retrieve all settings
 *     responses:
 *       200:
 *         description: Successful retrieval of settings
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/settings/keys:
 *   post:
 *     tags: [Settings]
 *     summary: Retrieve multiple settings by an array of keys
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keys:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Settings for the given keys
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/settings/homepage:
 *   get:
 *     tags: [Settings]
 *     summary: Retrieve the homepage setting
 *     responses:
 *       200:
 *         description: Homepage setting
 *       404:
 *         description: Homepage setting not found
 *       500:
 *         description: Internal server error
 */

router.get('/', SettingsController.getAllSettings)
router.post('/keys', SettingsController.getSettingsByKeys)
router.get('/homepage', SettingsController.getHomepageSetting)
// Parameterized routes MUST come after all specific routes
router.get('/:key', SettingsController.getSetting)
router.put('/:key', SettingsController.updateSetting)

module.exports = router
