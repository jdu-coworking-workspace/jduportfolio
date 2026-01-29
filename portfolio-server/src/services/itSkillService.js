const { ItSkill } = require('../models')
const { Op } = require('sequelize')

class ItSkillService {
	/**
	 * Yangi ko'nikma yaratish
	 */
	static async createSkill(skillData) {
		try {
			const skill = await ItSkill.create(skillData)
			return skill
		} catch (error) {
			// Unikal nom xatoligini ushlash
			if (error.name === 'SequelizeUniqueConstraintError') {
				throw new Error(`'${skillData.name}' already exists.`)
			}
			throw error
		}
	}

	/**
	 * Barcha ko'nikmalarni olish (qidiruv va saralash bilan)
	 */
	static async getAllSkills(searchQuery) {
		const options = {
			// Talab bo'yicha: nomiga ko'ra alifbo tartibida saralash
			order: [['name', 'ASC']],
		}

		// Talab bo'yicha: agar qidiruv so'rovi bo'lsa, nomi bo'yicha qidirish
		if (searchQuery) {
			options.where = {
				name: {
					[Op.iLike]: `%${searchQuery}%`, // Katta-kichik harflarni farqlamaydi
				},
			}
		}

		const skills = await ItSkill.findAll(options)
		return skills
	}

	/**
	 * Ko'nikmani ID bo'yicha olish
	 */
	static async getSkillById(id) {
		const skill = await ItSkill.findByPk(id)
		return skill
	}

	/**
	 * Ko'nikmani yangilash
	 */
	static async updateSkill(id, updateData) {
		const skill = await ItSkill.findByPk(id)
		if (!skill) {
			return null
		}
		await skill.update(updateData)
		return skill
	}

	/**
	 * Ko'nikmani o'chirish
	 */
	static async deleteSkill(id) {
		const skill = await ItSkill.findByPk(id)
		if (!skill) {
			return null
		}
		await skill.destroy()
		return skill
	}
}

module.exports = ItSkillService
