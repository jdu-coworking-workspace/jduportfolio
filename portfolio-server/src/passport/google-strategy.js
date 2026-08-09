const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const AuthService = require('../services/authService')

passport.use(
	new GoogleStrategy(
		{
			clientID: process.env.GOOGLE_CLIENT_ID,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET,
			callbackURL: process.env.GOOGLE_CALLBACK_URL,
			passReqToCallback: true,
		},
		async (req, accessToken, refreshToken, profile, done) => {
			try {
				const ip = req.ip || req.connection?.remoteAddress
				const userAgent = req.headers['user-agent']
				const result = await AuthService.loginWithGoogle(profile, ip, userAgent)
				done(null, result)
			} catch (err) {
				done(err)
			}
		}
	)
)

module.exports = passport
