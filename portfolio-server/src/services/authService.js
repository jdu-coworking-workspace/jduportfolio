// const bcrypt = require('bcrypt')
// const jwt = require('jsonwebtoken')
// const { Admin, Staff, Recruiter, Student } = require('../models')

// class AuthService {
// 	static async login(email, password, res) {
// 		const userTypes = [Admin, Staff, Recruiter, Student]

// 		for (const UserType of userTypes) {
// 			const user = await UserType.findOne({ where: { email } })
// 			if (user) {
// 				const isMatch = await bcrypt.compare(password, user.password)
// 				if (isMatch) {
// 					const token = jwt.sign(
// 						{ id: user.id, userType: UserType.name },
// 						process.env.JWT_SECRET,
// 						{ expiresIn: process.env.JWT_EXPIRATION }
// 					)

// 					// Set the JWT token and userType as cookies
// 					res.cookie('token', token, {
// 						httpOnly: false,
// 						secure: process.env.NODE_ENV === 'production',
// 						expires: new Date(
// 							Date.now() + parseInt(process.env.JWT_EXPIRATION) * 60 * 60 * 1000
// 						), // Convert expiresIn to milliseconds
// 					})

// 					// Also set userType as a separate cookie
// 					res.cookie('userType', UserType.name, {
// 						httpOnly: false, // Can be accessed on the client-side
// 						secure: process.env.NODE_ENV === 'production',
// 						expires: new Date(
// 							Date.now() + parseInt(process.env.JWT_EXPIRATION) * 60 * 60 * 1000
// 						), // Convert expiresIn to milliseconds
// 					})
// 					return {
// 						userType: UserType.name,
// 						userData: {
// 							id: user.id,
// 							name: user.first_name + ' ' + user.last_name,
// 							studentId: user.student_id,
// 							photo: user.photo,
// 						},
// 					}
// 				}
// 			}
// 		}

// 		throw new Error('Invalid credentials')
// 	}

// 	static async logout(res) {
// 		// Clear cookies by setting them to empty and setting expiry in the past
// 		res.clearCookie('token', {
// 			httpOnly: false,
// 			secure: process.env.NODE_ENV === 'production',
// 			// expires: new Date(0),
// 		})
// 		res.clearCookie('userType', {
// 			httpOnly: false,
// 			secure: process.env.NODE_ENV === 'production',
// 			// expires: new Date(0),
// 		})
// 	}

// }

// module.exports = AuthService

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Admin, Staff, Recruiter, Student, LoginLog } = require('../models')

class AuthService {
	static async login(email, password, res, ip, userAgent) {
		const userTypes = [Admin, Staff, Recruiter, Student]

		for (const UserType of userTypes) {
			const user = await UserType.findOne({ where: { email } })
			if (user) {
				const isMatch = await bcrypt.compare(password, user.password)
				if (isMatch) {
					user.last_login = new Date()
					await user.save()

					await LoginLog.create({
						userId: String(user.id),
						userType: UserType.name,
						ip_address: ip || 'unknown',
						user_agent: userAgent || 'unknown',
						status: 'success',
					})

					const expiresIn = process.env.JWT_EXPIRATION || '1d'
					const token = jwt.sign({ id: user.id, userType: UserType.name }, process.env.JWT_SECRET, { expiresIn })
					AuthService.setAuthCookies(res, token, UserType.name)
					return {
						userType: UserType.name,
						userData: {
							id: user.id,
							name: user.first_name + ' ' + user.last_name,
							studentId: user.student_id,
							photo: user.photo,
						},
					}
				} else {
					await LoginLog.create({
						userId: String(user.id),
						userType: UserType.name,
						ip_address: ip || 'unknown',
						user_agent: userAgent || 'unknown',
						status: 'failed',
						reason: 'Invalid password',
					})
					throw new Error('Invalid credentials')
				}
			}
		}

		await LoginLog.create({
			userId: email,
			userType: 'Unknown',
			ip_address: ip || 'unknown',
			user_agent: userAgent || 'unknown',
			status: 'failed',
			reason: 'User not found',
		})
		throw new Error('Invalid credentials')
	}

	static async loginWithGoogle(profile, ip, userAgent) {
		const email = profile.emails[0].value
		const userTypes = [Admin, Staff, Recruiter, Student]

		for (const UserType of userTypes) {
			const user = await UserType.findOne({ where: { email } })
			if (user) {
				user.last_login = new Date()
				await user.save()

				await LoginLog.create({
					userId: String(user.id),
					userType: UserType.name,
					ip_address: ip || 'unknown',
					user_agent: userAgent || 'unknown',
					status: 'success',
				})

				const expiresIn = process.env.JWT_EXPIRATION || '1d'
				const token = jwt.sign({ id: user.id, userType: UserType.name }, process.env.JWT_SECRET, { expiresIn })
				return {
					userType: UserType.name,
					userData: {
						id: user.id,
						name: user.first_name + ' ' + user.last_name,
						studentId: user.student_id,
						photo: user.photo,
					},
					token,
				}
			}
		}

		await LoginLog.create({
			userId: email,
			userType: 'Unknown',
			ip_address: ip || 'unknown',
			user_agent: userAgent || 'unknown',
			status: 'failed',
			reason: 'Google account not found',
		})
		throw new Error('Bu Google email bilan hisob topilmadi')
	}

	static setAuthCookies(res, token, userType) {
		const toMs = val => {
			if (!val) return 60 * 60 * 1000 // default 1h
			if (typeof val === 'number') return val
			const s = String(val).trim().toLowerCase()
			// support forms like '30m', '1h', '7d', '45s', '3600000'
			const num = parseInt(s, 10)
			if (s.endsWith('ms')) return num
			if (s.endsWith('s')) return num * 1000
			if (s.endsWith('m')) return num * 60 * 1000
			if (s.endsWith('h')) return num * 60 * 60 * 1000
			if (s.endsWith('d')) return num * 24 * 60 * 60 * 1000
			// plain number: interpret as hours for backward compatibility
			return num * 60 * 60 * 1000
		}

		const ttlMs = toMs(process.env.JWT_EXPIRATION)
		const expiresAt = new Date(Date.now() + ttlMs)

		res.cookie('token', token, {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			expires: expiresAt,
		})
		res.cookie('userType', userType, {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			expires: expiresAt,
		})
	}

	static async logout(res) {
		res.clearCookie('token', {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
		})
		res.clearCookie('userType', {
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
		})
	}
}

module.exports = AuthService
