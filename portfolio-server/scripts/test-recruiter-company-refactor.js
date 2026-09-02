const test = require('node:test')
const assert = require('node:assert/strict')

const { Recruiter, Company, sequelize } = require('../src/models')
const RecruiterService = require('../src/services/recruiterService')
const CompanyService = require('../src/services/companyService')
const KintoneService = require('../src/services/kintoneService')
const { toKintoneRecord, extractKintoneId } = require('../src/utils/recruiterKintoneMapper')

test('1. Mapper: toKintoneRecord with and without company', () => {
	const withCompany = toKintoneRecord({ email: 'a@b.com', first_name: 'John', last_name: 'Doe', phone: '123456789' }, { company_name: 'Test Corp' })
	assert.equal(withCompany.recruiterEmail.value, 'a@b.com')
	assert.equal(withCompany.recruiterCompany.value, 'Test Corp')

	const withoutCompany = toKintoneRecord({ email: 'solo@b.com', first_name: 'Solo', last_name: 'User' }, null)
	assert.equal(withoutCompany.recruiterEmail.value, 'solo@b.com')
	// When no company, mapper sets '-' placeholder so Kintone required validation passes
	assert.equal(withoutCompany.recruiterCompany.value, '-')
})

test('2. CompanyService: getCompanyById returns recruiters with isParent boolean', async () => {
	const origFindByPk = Company.findByPk
	try {
		const mockCompany = {
			id: 10,
			company_name: 'ACME',
			parent_recruiter_id: 1,
			recruiters: [
				{ id: 1, first_name: 'Taro', password: 'hash' },
				{ id: 2, first_name: 'Jiro', password: 'hash' },
			],
		}
		Company.findByPk = async () => mockCompany

		const company = await CompanyService.getCompanyById(10)
		assert.equal(company.parent_recruiter_id, 1)
		assert.equal(company.recruiters[0].isParent, true)
		assert.equal(company.recruiters[0].id, 1)
		assert.equal(company.recruiters[1].isParent, false)
		assert.equal(company.recruiters[1].id, 2)
	} finally {
		Company.findByPk = origFindByPk
	}
})

test('3. RecruiterService: getRecruiterById returns isParent boolean', async () => {
	const origFindOne = Recruiter.findOne
	try {
		const mockRecruiter = {
			id: 5,
			first_name: 'Hanako',
			company: {
				id: 20,
				company_name: 'Tokyo Tech',
				parent_recruiter_id: 5,
			},
			toJSON: function () {
				return {
					id: 5,
					first_name: 'Hanako',
					company: { id: 20, company_name: 'Tokyo Tech', parent_recruiter_id: 5 },
				}
			},
		}
		Recruiter.findOne = async () => mockRecruiter

		const recruiter = await RecruiterService.getRecruiterById(5, false, true)
		assert.equal(recruiter.isParent, true)
	} finally {
		Recruiter.findOne = origFindOne
	}
})

test('4. CompanyService: updateCompany parent_recruiter_id validation', async () => {
	const origFindByPk = Company.findByPk
	const origFindOne = Recruiter.findOne
	const origGetCompById = CompanyService.getCompanyById

	try {
		Company.findByPk = async id => ({
			id,
			company_name: 'Test Corp',
			update: async data => true,
		})

		// Recruiter not belonging to company
		Recruiter.findOne = async () => null

		await assert.rejects(
			async () => {
				await CompanyService.updateCompany(10, { parent_recruiter_id: 999 }, { isAdmin: true })
			},
			{
				status: 400,
				message: 'The specified parent recruiter does not belong to this company',
			}
		)

		// Recruiter belonging to company
		Recruiter.findOne = async () => ({ id: 50, companyId: 10 })
		let updatedData = null
		Company.findByPk = async id => ({
			id,
			company_name: 'Test Corp',
			update: async data => {
				updatedData = data
				return [1]
			},
		})
		CompanyService.getCompanyById = async id => ({ id, ...updatedData })

		const res = await CompanyService.updateCompany(10, { parent_recruiter_id: 50 }, { isAdmin: true })
		assert.equal(res.parent_recruiter_id, 50)
	} finally {
		Company.findByPk = origFindByPk
		Recruiter.findOne = origFindOne
		CompanyService.getCompanyById = origGetCompById
	}
})

test('5. CompanyService: assignRecruiter sets parent_recruiter_id if empty', async () => {
	const company = { id: 15, parent_recruiter_id: null, update: async data => Object.assign(company, data) }
	const recruiter = { id: 77, update: async data => Object.assign(recruiter, data) }

	const origCompFindByPk = Company.findByPk
	const origRecFindByPk = Recruiter.findByPk
	const origGetCompById = CompanyService.getCompanyById

	try {
		Company.findByPk = async () => company
		Recruiter.findByPk = async () => recruiter
		CompanyService.getCompanyById = async () => company

		await CompanyService.assignRecruiter(15, 77)
		assert.equal(recruiter.companyId, 15)
		assert.equal(company.parent_recruiter_id, 77)
	} finally {
		Company.findByPk = origCompFindByPk
		Recruiter.findByPk = origRecFindByPk
		CompanyService.getCompanyById = origGetCompById
	}
})

test('6. CompanyService: unassignRecruiter promotes next remaining recruiter', async () => {
	const company = { id: 22, parent_recruiter_id: 88, update: async data => Object.assign(company, data) }
	const recruiter = { id: 88, companyId: 22, update: async data => Object.assign(recruiter, data) }
	const nextRecruiter = { id: 89, companyId: 22 }

	const origRecFindOne = Recruiter.findOne
	const origCompFindByPk = Company.findByPk
	const origGetCompById = CompanyService.getCompanyById

	try {
		let callCount = 0
		Recruiter.findOne = async () => {
			callCount++
			if (callCount === 1) return recruiter // finding target
			return nextRecruiter // finding next
		}
		Company.findByPk = async () => company
		CompanyService.getCompanyById = async () => company

		await CompanyService.unassignRecruiter(22, 88)
		assert.equal(recruiter.companyId, null)
		assert.equal(company.parent_recruiter_id, 89)
	} finally {
		Recruiter.findOne = origRecFindOne
		Company.findByPk = origCompFindByPk
		CompanyService.getCompanyById = origGetCompById
	}
})

test('7. RecruiterService: createRecruiterViaWeb with no company', async () => {
	const origCreateRecord = KintoneService.createRecord
	const origTx = sequelize.transaction
	const origRecCreate = Recruiter.create

	try {
		KintoneService.createRecord = async (app, data) => {
			assert.equal(data.recruiterCompany.value, '-')
			return { id: '9000' }
		}
		sequelize.transaction = async cb => cb({})
		Recruiter.create = async data => ({
			id: 111,
			...data,
			setDataValue: () => {},
		})

		const created = await RecruiterService.createRecruiterViaWeb({
			email: 'solo@example.com',
			first_name: 'Solo',
			last_name: 'Tester',
			password: 'password123',
		})

		assert.equal(created.companyId, null)
		assert.equal(created.kintone_id, '9000')
	} finally {
		KintoneService.createRecord = origCreateRecord
		sequelize.transaction = origTx
		Recruiter.create = origRecCreate
	}
})

test('8. RecruiterService: createRecruiterViaWeb with inline company and parent_recruiter_id', async () => {
	const origCreateRecord = KintoneService.createRecord
	const origTx = sequelize.transaction
	const origRecCreate = Recruiter.create
	const origCompFindOrCreate = Company.findOrCreate
	const origCompFindByPk = Company.findByPk

	try {
		KintoneService.createRecord = async () => ({ id: '9001' })
		sequelize.transaction = async cb => cb({})

		const mockCompany = {
			id: 300,
			company_name: 'Inline Co',
			company_representative: 'CEO San',
			isPartner: true,
			parent_recruiter_id: null,
			update: async data => Object.assign(mockCompany, data),
		}

		Company.findOrCreate = async () => [mockCompany, true]
		Company.findByPk = async () => mockCompany

		Recruiter.create = async data => ({
			id: 222,
			...data,
			setDataValue: () => {},
		})

		const created = await RecruiterService.createRecruiterViaWeb({
			email: 'inline@example.com',
			first_name: 'Inline',
			last_name: 'Tester',
			password: 'password123',
			company_name: 'Inline Co',
			company_representative: 'CEO San',
			isPartner: true,
		})

		assert.equal(created.companyId, 300)
		assert.equal(created.kintone_id, '9001')
		assert.equal(mockCompany.parent_recruiter_id, 222)
	} finally {
		KintoneService.createRecord = origCreateRecord
		sequelize.transaction = origTx
		Recruiter.create = origRecCreate
		Company.findOrCreate = origCompFindOrCreate
		Company.findByPk = origCompFindByPk
	}
})
