const authMiddleware = require('./middlewares/auth-middleware')

const authRoute = require('./routes/auth-route')

const adminRoute = require('./routes/admins-route')
const recruiterRoute = require('./routes/recruiters-route')
const staffRoute = require('./routes/staff-route')
const studentRoute = require('./routes/students-route')
const bookmarkRoute = require('./routes/bookmarks-route')
const qaRoute = require('./routes/qa-route')
const settingRoute = require('./routes/settings-route')
const draftRoute = require('./routes/drafts-route')
const logRoute = require('./routes/log-route')
const notificationRoute = require('./routes/notification-route')
const newsRoute = require('./routes/newsRoutes')
const fileRecordRoute = require('./routes/fileRecordRoute')

const fileRoutes = require('./routes/file-routes')
const imageRoutes = require('./routes/image-routes')
const kintoneRoutes = require('./routes/kintone-routes')
const webhookRoutes = require('./routes/webhook-routes')
const itSkillRoutes = require('./routes/itSkillRoutes')
const skillRoutes = require('./routes/skillRoutes')
const recruiterFileRoutes = require('./routes/recruiterFileRoutes')
const deliverableRoutes = require('./routes/deliverableRoutes')
const maintenanceRoute = require('./routes/maintenance-route')
// const healthRoute = require('./routes/health-route')

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication-related endpoints
 *   - name: Admin
 *     description: Administration-related endpoints
 *   - name: Recruiters
 *     description: Endpoints for recruiter-related operations
 *   - name: Staff
 *     description: Endpoints for managing staff activities
 *   - name: Students
 *     description: Endpoints for student management
 *   - name: Bookmarks
 *     description: Bookmarks management endpoints
 *   - name: QA
 *     description: Question and answer endpoints
 *   - name: Files
 *     description: Endpoints for file uploads and downloads
 *   - name: Kintone
 *     description: Endpoints integrating with Kintone
 *   - name: Webhook
 *     description: Endpoints for webhook handling
 *   - name: Settings
 *     description: Endpoints for system settings
 *   - name: Drafts
 *     description: Draft management endpoints
 *   - name: Log
 *     description: Endpoints for logging operations
 *   - name: Notification
 *     description: Notification endpoints
 */

const configureRoutes = app => {
	// Maintenance endpoint (public, no auth required)
	app.use('/api/maintenance', maintenanceRoute)

	// Auth routes
	app.use('/api/auth', authRoute)

	// Health (no auth)
	// app.use('/api/health', healthRoute)

	// Public routes
	app.get('/api/students/:studentId/credit-details', require('./controllers/studentController').getStudentWithCreditDetails)

	// Protected routes
	app.use('/api/admin', adminRoute)
	app.use('/api/recruiters', authMiddleware, recruiterRoute)
	app.use('/api/staff', authMiddleware, staffRoute)
	app.use('/api/students', authMiddleware, studentRoute)
	app.use('/api/bookmarks', authMiddleware, bookmarkRoute)
	app.use('/api/qa', authMiddleware, qaRoute)
	app.use('/api/files', fileRoutes)
	app.use('/api/kintone', kintoneRoutes)
	app.use('/api/webhook', webhookRoutes)
	app.use('/api/settings', settingRoute)
	app.use('/api/draft', authMiddleware, draftRoute)
	app.use('/api/log', logRoute)
	app.use('/api/images', imageRoutes)
	app.use('/api/notification', authMiddleware, notificationRoute)
	app.use('/api/news', newsRoute)
	app.use('/api/file-records', authMiddleware, fileRecordRoute)
	app.use('/api/itskills', authMiddleware, itSkillRoutes)
	app.use('/api/skills', authMiddleware, skillRoutes)
	app.use('/api/recruiter-files', authMiddleware, recruiterFileRoutes)
	app.use('/api/deliverables', authMiddleware, deliverableRoutes)
}

module.exports = configureRoutes
