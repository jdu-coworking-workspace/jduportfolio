const AuthService = require('../services/authService')

class AuthController {
	static async login(req, res) {
		const { email, password } = req.body
		const ip = req.ip || req.connection?.remoteAddress
		const userAgent = req.headers['user-agent']
		try {
			const { userType, userData } = await AuthService.login(email, password, res, ip, userAgent)
			res.json({ userType, userData })
		} catch (error) {
			res.status(400).json({ error: error.message })
		}
	}

	static async logout(req, res) {
		try {
			await AuthService.logout(res)
			res.json({ message: 'Logged out successfully' })
		} catch (error) {
			res.status(500).json({ error: 'Failed to logout' })
		}
	}

	static async googleCallback(req, res) {
		const { userType, userData, token } = req.user || {}
		const frontendUrl = process.env.FRONTEND_URL
		if (userType && userData && token) {
			AuthService.setAuthCookies(res, token, userType)
			// Redirect to frontend home page
			// return res.redirect('https://portfolio.jdu.uz/google/callback')
			return res.redirect(`${frontendUrl}/google/callback`)
		} else {
			// Redirect to login page with error
			// return res.redirect('https://portfolio.jdu.uz/login?error=notfound')
			return res.redirect(`${frontendUrl}/login?error=notfound`)
		}
	}
}

module.exports = AuthController
