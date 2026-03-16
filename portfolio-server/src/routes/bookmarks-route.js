const express = require('express')
const BookmarkController = require('../controllers/bookmarkController')
const router = express.Router()

/**
 * @swagger
 * tags:
 *   - name: Bookmarks
 *     description: Endpoints for managing and viewing bookmarks
 */

/**
 * @swagger
 * /api/bookmarks/toggle:
 *   post:
 *     tags: [Bookmarks]
 *     summary: Toggle a bookmark for a student
 *     description: Creates or removes a bookmark for a given recruiter and student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               recruiterId:
 *                 type: integer
 *               studentId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Bookmark toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 recruiterId:
 *                   type: integer
 *                 studentId:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */
router.post('/toggle', BookmarkController.toggleBookmark.bind(BookmarkController))

/**
 * @swagger
 * /api/bookmarks/students:
 *   get:
 *     tags: [Bookmarks]
 *     summary: Retrieve students with bookmark status
 *     description: Returns all students along with information indicating whether they are bookmarked
 *     responses:
 *       200:
 *         description: A list of students with bookmark status
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   isBookmarked:
 *                     type: boolean
 *                   # ...existing student fields...
 *       500:
 *         description: Internal server error
 */
router.get('/students', BookmarkController.getStudentsWithBookmarkStatus.bind(BookmarkController))
router.get('/check/:studentId', BookmarkController.checkBookmark.bind(BookmarkController))

module.exports = router
