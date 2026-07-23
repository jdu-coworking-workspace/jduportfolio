jest.mock('../src/models', () => ({
	Recruiter: {
		findByPk: jest.fn(),
		create: jest.fn(),
		findOne: jest.fn(),
		destroy: jest.fn(),
		update: jest.fn(),
	},
	Company: {
		findByPk: jest.fn(),
		findOne: jest.fn(),
		findOrCreate: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
	},
	sequelize: {
		transaction: jest.fn(),
	},
}))

jest.mock('../src/services/kintoneService', () => ({
	createRecord: jest.fn(),
	updateRecord: jest.fn(),
	deleteRecord: jest.fn(),
}))

jest.mock('../src/utils/recruiterKintoneMapper', () => ({
	toKintoneRecord: jest.fn(),
	extractKintoneId: jest.fn(),
}))

jest.mock('../src/utils/emailToRecruiter', () => ({
	sendRecruiterWelcomeEmail: jest.fn(),
	formatRecruiterWelcomeEmail: jest.fn(),
}))

jest.mock('generate-password', () => ({
	generate: jest.fn(),
}))

const { Recruiter, Company, sequelize } = require('../src/models')
const KintoneService = require('../src/services/kintoneService')
const { toKintoneRecord, extractKintoneId } = require('../src/utils/recruiterKintoneMapper')
const { sendRecruiterWelcomeEmail } = require('../src/utils/emailToRecruiter')
const generatePassword = require('generate-password')

const RecruiterService = require('../src/services/recruiterService')
const RecruiterController = require('../src/controllers/recruiterController')
const CompanyService = require('../src/services/companyService')

const createRes = () => {
	const res = {}
	res.status = jest.fn().mockReturnValue(res)
	res.json = jest.fn().mockReturnValue(res)
	res.send = jest.fn().mockReturnValue(res)
	return res
}

describe('Recruiter/Company/Kintone main flows', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		jest.restoreAllMocks()
		sequelize.transaction.mockImplementation(async callback => callback({ id: 'tx-1' }))
	})

	test('Admin can create Company and linked Recruiter (Kintone-first)', async () => {
		const createdCompany = { id: 10, company_name: 'Alpha LLC' }
		const createdRecruiter = { id: 99, setDataValue: jest.fn() }

		Company.findOne.mockResolvedValueOnce(null)
		Company.create.mockResolvedValueOnce(createdCompany)
		const company = await CompanyService.createCompany({ company_name: 'Alpha LLC' })

		expect(company).toEqual(createdCompany)
		expect(Company.create).toHaveBeenCalledWith({ company_name: 'Alpha LLC' })

		Company.findByPk.mockResolvedValueOnce(createdCompany)
		toKintoneRecord.mockReturnValue({ recruiterEmail: { value: 'new@alpha.uz' } })
		extractKintoneId.mockReturnValue('501')
		KintoneService.createRecord.mockResolvedValue({ id: '501' })
		Recruiter.create.mockResolvedValue(createdRecruiter)

		await RecruiterService.createRecruiterViaWeb({
			email: 'new@alpha.uz',
			first_name: 'Ali',
			last_name: 'Valiyev',
			companyId: 10,
		})

		expect(KintoneService.createRecord).toHaveBeenCalledWith('recruiters', { recruiterEmail: { value: 'new@alpha.uz' } })
		expect(Recruiter.create).toHaveBeenCalledWith(
			expect.objectContaining({
				companyId: 10,
				kintone_id: '501',
			})
		)
	})

	test('Webhook ADD_RECORD flow can create recruiter with company resolved via findOrCreate', async () => {
		const foundOrCreatedCompany = { id: 20, company_name: 'Webhook Co' }
		const createdRecruiter = { id: 300, companyId: 20, setDataValue: jest.fn() }

		Company.findOrCreate.mockResolvedValueOnce([foundOrCreatedCompany, true])
		Recruiter.create.mockResolvedValueOnce(createdRecruiter)

		await RecruiterService.createRecruiter({
			email: 'hook@co.uz',
			password: 'Plain1234',
			first_name: 'Web',
			last_name: 'Hook',
			kintone_id: '9001',
			company_name: 'Webhook Co',
		})

		expect(Company.findOrCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { company_name: 'Webhook Co' },
				defaults: { company_name: 'Webhook Co' },
			})
		)
		expect(Recruiter.create).toHaveBeenCalledWith(
			expect.objectContaining({
				companyId: 20,
			}),
			expect.any(Object)
		)
	})

	test('Webhook ADD_RECORD is idempotent when kintone_id already exists', async () => {
		const existingRecruiter = { id: 7, kintone_id: '777' }
		jest.spyOn(RecruiterService, 'findByKintoneId').mockResolvedValue(existingRecruiter)
		const createSpy = jest.spyOn(RecruiterService, 'createRecruiter')

		const req = {
			body: {
				type: 'ADD_RECORD',
				record: {
					$id: { value: '777' },
					recruiterEmail: { value: 'exists@example.com' },
				},
			},
		}
		const res = createRes()

		await RecruiterController.webhookHandler(req, res)

		expect(res.status).toHaveBeenCalledWith(200)
		expect(createSpy).not.toHaveBeenCalled()
	})

	test('Webhook ADD_RECORD creates recruiter and forwards company_name', async () => {
		jest.spyOn(RecruiterService, 'findByKintoneId').mockResolvedValue(null)
		const createdRecruiter = {
			id: 55,
			email: 'new@hook.uz',
			first_name: 'New',
			last_name: 'Recruiter',
		}
		const createSpy = jest.spyOn(RecruiterService, 'createRecruiter').mockResolvedValue(createdRecruiter)
		generatePassword.generate.mockReturnValue('GeneratedPass1')
		sendRecruiterWelcomeEmail.mockResolvedValue(undefined)

		const req = {
			body: {
				type: 'ADD_RECORD',
				record: {
					$id: { value: '1234' },
					recruiterEmail: { value: 'new@hook.uz' },
					recruiterFirstName: { value: 'New' },
					recruiterLastName: { value: 'Recruiter' },
					recruiterPhone: { value: '+998901234567' },
					recruiterCompany: { value: 'Hooked Company' },
				},
			},
		}
		const res = createRes()

		await RecruiterController.webhookHandler(req, res)

		expect(createSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				kintone_id: '1234',
				company_name: 'Hooked Company',
			})
		)
		expect(res.status).toHaveBeenCalledWith(201)
	})

	test('Recruiter can update personal + company info including company_name and triggers pushUpdateToKintone', async () => {
		const recruiter = {
			id: 1,
			companyId: 42,
			kintone_id: '900',
			password: 'hashed',
			update: jest.fn().mockResolvedValue(true),
		}
		Recruiter.findByPk.mockResolvedValue(recruiter)
		Company.findByPk.mockResolvedValue({ id: 42, company_name: 'Old Name' })
		Company.findOne.mockResolvedValue(null)
		Company.update.mockResolvedValue([1])
		const freshRecruiter = { id: 1, kintone_id: '900', company: { id: 42, company_name: 'New Name' } }
		jest.spyOn(RecruiterService, 'getRecruiterById').mockResolvedValue(freshRecruiter)
		const pushSpy = jest.spyOn(RecruiterService, 'pushUpdateToKintone').mockResolvedValue(undefined)

		await RecruiterService.updateRecruiter(1, {
			first_name: 'UpdatedName',
			company: {
				company_name: 'New Name',
				company_description: 'Updated description',
			},
		})

		expect(Company.update).toHaveBeenCalledWith(
			expect.objectContaining({
				company_name: 'New Name',
				company_description: 'Updated description',
			}),
			expect.objectContaining({ where: { id: 42 } })
		)
		expect(pushSpy).toHaveBeenCalledWith(freshRecruiter)
	})

	test('Recruiter cannot change isPartner through updateRecruiter', async () => {
		const recruiter = {
			id: 2,
			companyId: 11,
			kintone_id: null,
			update: jest.fn().mockResolvedValue(true),
		}
		Recruiter.findByPk.mockResolvedValue(recruiter)
		Company.update.mockResolvedValue([1])
		jest.spyOn(RecruiterService, 'getRecruiterById').mockResolvedValue({ id: 2, company: { id: 11 } })
		const pushSpy = jest.spyOn(RecruiterService, 'pushUpdateToKintone').mockResolvedValue(undefined)

		await RecruiterService.updateRecruiter(2, {
			company: {
				isPartner: true,
				company_description: 'Only this should be updated',
			},
		})

		expect(Company.update).toHaveBeenCalledWith(
			expect.objectContaining({
				company_description: 'Only this should be updated',
			}),
			expect.any(Object)
		)
		expect(Company.update.mock.calls[0][0]).not.toHaveProperty('isPartner')
		expect(pushSpy).not.toHaveBeenCalled()
	})

	test('Changing company_name to an existing one returns 409 conflict', async () => {
		const recruiter = {
			id: 3,
			companyId: 70,
			kintone_id: null,
			update: jest.fn().mockResolvedValue(true),
		}
		Recruiter.findByPk.mockResolvedValue(recruiter)
		Company.findByPk.mockResolvedValue({ id: 70, company_name: 'Current Co' })
		Company.findOne.mockResolvedValue({ id: 71, company_name: 'Existing Co' })

		await expect(
			RecruiterService.updateRecruiter(3, {
				company: {
					company_name: 'Existing Co',
				},
			})
		).rejects.toMatchObject({
			message: 'Company with this name already exists',
			status: 409,
		})

		expect(sequelize.transaction).not.toHaveBeenCalled()
		expect(Company.update).not.toHaveBeenCalled()
	})
})
