jest.mock('bcrypt', () => ({
	compare: jest.fn(),
}))

jest.mock('jsonwebtoken', () => ({
	sign: jest.fn(),
}))

jest.mock('../src/models', () => {
	const mockUser = {
		id: 1,
		email: 'test@example.com',
		password: 'hashedpassword',
		first_name: 'Test',
		last_name: 'User',
		student_id: 'S123',
		photo: 'photo.jpg',
		save: jest.fn(),
	}

	return {
		Admin: { findOne: jest.fn(), name: 'Admin' },
		Staff: { findOne: jest.fn(), name: 'Staff' },
		Recruiter: { findOne: jest.fn(), name: 'Recruiter' },
		Student: { findOne: jest.fn(), name: 'Student' },
		LoginLog: { create: jest.fn() },
		mockUser, // to easily manipulate it in tests
	}
})

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { Admin, Staff, Recruiter, Student, LoginLog, mockUser } = require('../src/models')
const AuthService = require('../src/services/authService')

const createRes = () => {
	const res = {}
	res.cookie = jest.fn()
	res.clearCookie = jest.fn()
	res.status = jest.fn().mockReturnValue(res)
	res.json = jest.fn().mockReturnValue(res)
	return res
}

describe('AuthService Login Tracking', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		// Reset mock behavior
		Admin.findOne.mockResolvedValue(null)
		Staff.findOne.mockResolvedValue(null)
		Recruiter.findOne.mockResolvedValue(null)
		Student.findOne.mockResolvedValue(null)
	})

	test('Successful login updates last_login and creates success log', async () => {
		Student.findOne.mockResolvedValueOnce(mockUser)
		bcrypt.compare.mockResolvedValueOnce(true)
		jwt.sign.mockReturnValueOnce('test-jwt-token')

		const res = createRes()

		const result = await AuthService.login('test@example.com', 'correctpass', res, '127.0.0.1', 'Mozilla/5.0')

		expect(mockUser.last_login).toBeDefined()
		expect(mockUser.save).toHaveBeenCalled()

		expect(LoginLog.create).toHaveBeenCalledWith({
			userId: '1',
			userType: 'Student',
			ip_address: '127.0.0.1',
			user_agent: 'Mozilla/5.0',
			status: 'success',
		})

		expect(result.userType).toBe('Student')
		expect(result.userData.name).toBe('Test User')
	})

	test('Failed login (wrong password) creates failed log and throws error', async () => {
		Admin.findOne.mockResolvedValueOnce(mockUser)
		bcrypt.compare.mockResolvedValueOnce(false) // Wrong password

		const res = createRes()

		await expect(AuthService.login('test@example.com', 'wrongpass', res, '192.168.1.1', 'Chrome')).rejects.toThrow('Invalid credentials')

		expect(mockUser.save).not.toHaveBeenCalled()

		expect(LoginLog.create).toHaveBeenCalledWith({
			userId: '1',
			userType: 'Admin',
			ip_address: '192.168.1.1',
			user_agent: 'Chrome',
			status: 'failed',
			reason: 'Invalid password',
		})
	})

	test('Failed login (user not found) creates failed log and throws error', async () => {
		const res = createRes()

		await expect(AuthService.login('unknown@example.com', 'somepass', res, '8.8.8.8', 'Safari')).rejects.toThrow('Invalid credentials')

		expect(LoginLog.create).toHaveBeenCalledWith({
			userId: 'unknown@example.com',
			userType: 'Unknown',
			ip_address: '8.8.8.8',
			user_agent: 'Safari',
			status: 'failed',
			reason: 'User not found',
		})
	})
})
