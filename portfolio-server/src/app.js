const express = require('express')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const path = require('path')
const cors = require('cors')
const multer = require('multer')
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const cron = require('node-cron')

const configureRoutes = require('./routes')
const KintoneService = require('./services/kintoneService')
const maintenanceMiddleware = require('./middlewares/maintenance-middleware')

const PORT = process.env.PORT || 4000

const options = {
	definition: {
		openapi: '3.0.0',
		info: {
			title: 'Portfolio API',
			version: '1.0.0',
			description: 'API documentation for the Portfolio system',
		},
		servers: [
			{
				url: '/', // Use relative URL for same-origin requests
				description: 'Current server',
			},
		],
		components: {
			securitySchemes: {
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'token',
					description: 'Authentication token stored in a cookie. Login first using the /api/auth/login endpoint.',
				},
			},
		},
		security: [
			{
				cookieAuth: [],
			},
		],
	},
	apis: ['./src/routes/*.js'],
}

const swaggerSpec = swaggerJSDoc(options)

// Enhanced Swagger UI configuration for cookie authentication
const swaggerOptions = {
	withCredentials: true,
	persistAuthorization: true,
	// Add request interceptor to ensure credentials are included
	requestInterceptor: req => {
		req.credentials = 'include'
		return req
	},
}

// Load environment variables from .env file
dotenv.config()
const CronService = require('./services/cronService')
const app = express()

// Optionally trust reverse proxies (so req.ip honors X-Forwarded-For as configured by Express)
// Set TRUST_PROXY=1 or a boolean-like value in production behind a proxy (e.g., Nginx)
if (process.env.TRUST_PROXY) {
	const v = process.env.TRUST_PROXY
	app.set('trust proxy', v === 'true' || v === '1' ? 1 : v)
}

// Use cookie-parser middleware
app.use(cookieParser())
// Middleware to parse JSON bodies with 21MB limit
app.use(express.json({ limit: '21mb' }))
// Middleware to parse URL-encoded bodies with 21MB limit
app.use(express.urlencoded({ extended: true, limit: '21mb' }))

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// app.use(express.static(path.resolve(__dirname, '../../portfolio-client/dist')))

const allowedOrigins = [
	process.env.FRONTEND_URL, // http://localhost:5173
	process.env.FRONTEND_URL_PROD, // https://portfolio.jdu.uz
	'http://localhost:3000', // Additional dev server
	'http://localhost:5174', // Alternative Vite port
	'http://127.0.0.1:5173', // Alternative localhost
	'http://127.0.0.1:3000', // Alternative localhost
	'http://127.0.0.1:5174', // Alternative localhost
].filter(Boolean) // Remove undefined values

console.log('Allowed CORS origins:', allowedOrigins)

app.use(
	cors({
		origin: function (origin, callback) {
			// Allow requests with no origin (like mobile apps or curl requests)
			if (!origin) {
				return callback(null, true)
			}

			if (allowedOrigins.indexOf(origin) !== -1) {
				callback(null, true)
			} else {
				console.error(`CORS error: Origin '${origin}' not allowed. Allowed origins:`, allowedOrigins)
				callback(new Error(`Not allowed by CORS. Origin: ${origin}`))
			}
		},
		credentials: true,
	})
)

// Apply maintenance middleware before routes (but after CORS to allow maintenance endpoint)
app.use(maintenanceMiddleware)

// Configure routes
configureRoutes(app)

cron.schedule('0 4 * * *', async () => {
	// console.log('syncing with kintone')
	await KintoneService.syncData()
})

// NewsViews routes qo'shish
const newsViewsRoutes = require('./routes/newsViewsRoutes')
app.use('/api/news-views', newsViewsRoutes)

CronService.scheduleJobs()

// Updated Swagger UI setup with enhanced options
app.use(
	'/api-docs',
	swaggerUi.serve,
	swaggerUi.setup(swaggerSpec, {
		swaggerOptions,
		customCss: '.swagger-ui .auth-wrapper .authorize {padding: 15px 20px; display: block;}',
		customSiteTitle: 'Portfolio API Documentation',
		customfavIcon: '',
		customCssUrl: '',
	})
)

// Serve uploaded files statically (only for local development)
if (process.env.NODE_ENV === 'development') {
	app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
}

app.use(express.static(path.resolve(__dirname, '../../portfolio-client/dist')))

app.get('*', (req, res) => {
	res.sendFile(path.resolve(__dirname, '../../portfolio-client/dist/index.html'))
})

// Start the server
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`)
})
