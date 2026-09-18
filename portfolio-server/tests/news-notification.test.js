jest.mock('../src/models', () => ({
	Student: { findAll: jest.fn() },
	Staff: { findAll: jest.fn() },
	Admin: { findAll: jest.fn() },
	Recruiter: { findAll: jest.fn() },
}))

jest.mock('../src/services/notificationService', () => ({
	bulkCreate: jest.fn(),
}))

jest.mock('../src/utils/emailService', () => ({
	sendBulkEmails: jest.fn(),
}))

const { Student, Staff, Admin, Recruiter } = require('../src/models')
const NotificationService = require('../src/services/notificationService')
const { sendBulkEmails } = require('../src/utils/emailService')
const { formatNewsPublishedEmail } = require('../src/utils/emailToNews')
const { buildNotificationUrl } = require('../src/utils/notificationUrlBuilder')
const NewsNotificationService = require('../src/services/newsNotificationService')

describe('news notifications', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		Student.findAll.mockResolvedValue([{ student_id: 'S001', email: 'student@example.com', first_name: 'Taro', last_name: 'Yamada' }])
		Staff.findAll.mockResolvedValue([{ id: 2, email: 'staff@example.com', first_name: 'Staff', last_name: 'San' }])
		Admin.findAll.mockResolvedValue([
			{ id: 1, email: 'author@example.com', first_name: 'Admin', last_name: 'Author' },
			{ id: 9, email: 'other-admin@example.com', first_name: 'Other', last_name: 'Admin' },
		])
		Recruiter.findAll.mockResolvedValue([{ id: 5, email: 'recruiter@example.com', first_name: 'Rec', last_name: 'Ruiter' }])
		NotificationService.bulkCreate.mockResolvedValue([])
		sendBulkEmails.mockResolvedValue({ total: 1, successful: 1, failed: 0 })
	})

	test('Japanese email includes title and news link', () => {
		const mail = formatNewsPublishedEmail({
			email: 'user@example.com',
			recipientName: '山田 太郎',
			title: '卒業式のお知らせ',
			description: '来月開催します',
			newsId: 42,
		})
		expect(mail.subject).toBe('【JDU】新しいお知らせが公開されました')
		expect(mail.to).toBe('user@example.com')
		expect(mail.text).toContain('卒業式のお知らせ')
		expect(mail.text).toContain('/news/42')
		expect(mail.html).toContain('lang="ja"')
		expect(mail.html).toContain('お知らせを見る')
	})

	test('notification URL points to news detail', () => {
		expect(buildNotificationUrl({ type: 'news', relatedId: 12 })).toBe('/news/12')
	})

	test('skips notify unless author is Admin', async () => {
		const result = await NewsNotificationService.notifyAdminNewsCreated({ id: 1, title: 'N' }, { userType: 'Staff', id: 2 })
		expect(result).toEqual({ skipped: true })
		expect(NotificationService.bulkCreate).not.toHaveBeenCalled()
	})

	test('includes recruiters only when visible_to_recruiter is true', async () => {
		await NewsNotificationService.notifyAdminNewsCreated({ id: 10, title: 'Open news', description: 'Hello', visible_to_recruiter: true }, { userType: 'Admin', id: 1 })
		expect(Recruiter.findAll).toHaveBeenCalled()
		const rows = NotificationService.bulkCreate.mock.calls[0][0]
		expect(rows.some(r => r.user_role === 'recruiter')).toBe(true)
		expect(rows.some(r => r.user_id === '1' && r.user_role === 'admin')).toBe(false)
		expect(rows.some(r => r.user_id === 'S001' && r.user_role === 'student')).toBe(true)
	})

	test('excludes recruiters when visible_to_recruiter is false', async () => {
		await NewsNotificationService.notifyAdminNewsCreated({ id: 11, title: 'Hidden from recruiters', description: 'Internal', visible_to_recruiter: false }, { userType: 'Admin', id: 1 })
		expect(Recruiter.findAll).not.toHaveBeenCalled()
		const rows = NotificationService.bulkCreate.mock.calls[0][0]
		expect(rows.some(r => r.user_role === 'recruiter')).toBe(false)
	})

	test('normalizes recruiter test email with extra leading @', () => {
		const { normalizeTestEmail } = NewsNotificationService
		expect(normalizeTestEmail('@tillayevx1@gmail.com')).toBe('tillayevx1@gmail.com')
	})

	test('test routing sends one internal and one recruiter inbox', () => {
		const prevStudent = process.env.EMAIL_TEST_TO_STUDENT
		const prevRecruiter = process.env.EMAIL_TEST_TO_RECRUITER
		process.env.EMAIL_TEST_TO_STUDENT = '225158x@jdu.uz'
		process.env.EMAIL_TEST_TO_RECRUITER = '@tillayevx1@gmail.com'
		try {
			const { applyEmailTestRouting } = NewsNotificationService
			const routed = applyEmailTestRouting([
				{ userRole: 'student', email: 'a@x.com', name: 'A' },
				{ userRole: 'staff', email: 'b@x.com', name: 'B' },
				{ userRole: 'recruiter', email: 'c@x.com', name: 'C' },
				{ userRole: 'recruiter', email: 'd@x.com', name: 'D' },
			])
			expect(routed.testMode).toBe(true)
			expect(routed.recipients.map(r => r.email)).toEqual(['225158x@jdu.uz', 'tillayevx1@gmail.com'])
		} finally {
			process.env.EMAIL_TEST_TO_STUDENT = prevStudent
			process.env.EMAIL_TEST_TO_RECRUITER = prevRecruiter
		}
	})

	test('test routing omits recruiter inbox when no recruiter recipients', () => {
		const prevStudent = process.env.EMAIL_TEST_TO_STUDENT
		const prevRecruiter = process.env.EMAIL_TEST_TO_RECRUITER
		process.env.EMAIL_TEST_TO_STUDENT = '225158x@jdu.uz'
		process.env.EMAIL_TEST_TO_RECRUITER = 'tillayevx1@gmail.com'
		try {
			const { applyEmailTestRouting } = NewsNotificationService
			const routed = applyEmailTestRouting([{ userRole: 'student', email: 'a@x.com', name: 'A' }])
			expect(routed.recipients.map(r => r.email)).toEqual(['225158x@jdu.uz'])
		} finally {
			process.env.EMAIL_TEST_TO_STUDENT = prevStudent
			process.env.EMAIL_TEST_TO_RECRUITER = prevRecruiter
		}
	})
})
