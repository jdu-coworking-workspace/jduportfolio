const { Op } = require('sequelize')
const { QA, Student } = require('../models')

class QAService {
	static async resolveStudentPrimaryId(studentIdentifier) {
		if (studentIdentifier === null || studentIdentifier === undefined || studentIdentifier === '') {
			return null
		}

		const asString = String(studentIdentifier).trim()
		const asNumber = Number(asString)
		const hasNumericValue = Number.isFinite(asNumber)

		const student = await Student.findOne({
			attributes: ['id'],
			where: {
				[Op.or]: [{ student_id: asString }, ...(hasNumericValue ? [{ id: asNumber }] : [])],
			},
		})

		return student?.id || null
	}

	// Service method to create a new QA entry
	static async createQA(qaData) {
		try {
			const resolvedStudentId = await QAService.resolveStudentPrimaryId(qaData.studentId)
			if (!resolvedStudentId) {
				throw new Error('Student not found for QA create')
			}

			const newQA = await QA.create({
				...qaData,
				studentId: resolvedStudentId,
			})
			return newQA
		} catch (error) {
			throw error
		}
	}

	// Service method to retrieve all QA entries
	static async getAllQA() {
		try {
			const qa = await QA.findAll()
			return qa
		} catch (error) {
			throw error
		}
	}

	// Service method to retrieve a QA entry by ID
	static async getQAById(qaId) {
		try {
			const qa = await QA.findByPk(qaId)
			return qa
		} catch (error) {
			throw error
		}
	}

	// Service method to update a QA entry
	static async updateQA(qaId, qaData) {
		try {
			const qa = await QA.findByPk(qaId)
			if (!qa) {
				throw new Error('QA entry not found')
			}
			await qa.update({ qa_list: qaData })
			return qa
		} catch (error) {
			throw error
		}
	}

	// Service method to delete a QA entry
	static async deleteQA(qaId) {
		try {
			const qa = await QA.findByPk(qaId)
			if (!qa) {
				throw new Error('QA entry not found')
			}
			await qa.destroy()
			return { message: 'QA entry deleted successfully' }
		} catch (error) {
			throw error
		}
	}

	// Service method to find QA entries by category
	static async findQAByCategory(category) {
		try {
			const qaList = await QA.findAll({
				where: { category: category },
			})
			return qaList
		} catch (error) {
			throw error
		}
	}

	// Service method to find QA entries by studentId
	static async findQAByStudentId(studentId) {
		try {
			const resolvedStudentId = await QAService.resolveStudentPrimaryId(studentId)
			if (!resolvedStudentId) {
				return []
			}

			const qaList = await QA.findAll({
				where: { studentId: resolvedStudentId },
			})
			return qaList
		} catch (error) {
			throw error
		}
	}

	// Service method to count QA entries
	static async countQA() {
		try {
			const count = await QA.count()
			return count
		} catch (error) {
			throw error
		}
	}
}

module.exports = QAService
