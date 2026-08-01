const { News, Staff, Recruiter, Admin, Company } = require('../models')
const NewsViewsService = require('./newsViewsService')
const { Op } = require('sequelize')
const { uploadFile, deleteFile } = require('../utils/storageService')
const generateUniqueFilename = require('../utils/uniqueFilename')

class NewsService {
	static async createNews(newsData, file, user) {
		if (!file) {
			throw { status: 400, message: 'Yangilik uchun rasm majburiy.' }
		}
		const uniqueFilename = generateUniqueFilename(file.originalname)
		const s3Path = `news/${user.userType.toLowerCase()}/${uniqueFilename}`
		const uploadResult = await uploadFile(file.buffer, s3Path)
		const dataToCreate = { ...newsData }
		dataToCreate.image_url = uploadResult.Location
		dataToCreate.authorId = user.id
		dataToCreate.authorType = user.userType

		if (newsData.visible_to_recruiter !== undefined) {
			dataToCreate.visible_to_recruiter = newsData.visible_to_recruiter === 'true' || newsData.visible_to_recruiter === true
		} else {
			dataToCreate.visible_to_recruiter = true
		}

		if (user.userType === 'Admin' || user.userType === 'Staff') {
			dataToCreate.type = 'university'
			dataToCreate.status = 'approved'
		} else if (user.userType === 'Recruiter') {
			dataToCreate.type = 'company'
			dataToCreate.status = 'pending'
		} else {
			throw { status: 403, message: 'Yangilik yaratish uchun ruxsat yo‘q.' }
		}
		if (typeof dataToCreate.hashtags === 'string') {
			try {
				dataToCreate.hashtags = JSON.parse(dataToCreate.hashtags)
			} catch (e) {
				dataToCreate.hashtags = dataToCreate.hashtags.split(',').map(tag => tag.trim())
			}
		}
		return await News.create(dataToCreate)
	}

	static async updateNews(newsId, updateData, file, user) {
		const news = await News.findByPk(newsId)
		if (!news) throw { status: 404, message: 'Yangilik topilmadi.' }
		const isOwner = news.authorId === user.id && news.authorType === user.userType
		const isAdminOrStaff = user.userType === 'Admin' || user.userType === 'Staff'
		if (!isOwner && !isAdminOrStaff) {
			throw { status: 403, message: "Bu amal uchun sizda ruxsat yo'q." }
		}
		if (file) {
			await deleteFile(news.image_url)
			const uniqueFilename = generateUniqueFilename(file.originalname)
			const s3Path = `news/${user.userType.toLowerCase()}/${uniqueFilename}`
			const uploadResult = await uploadFile(file.buffer, s3Path)
			updateData.image_url = uploadResult.Location
		} else {
			// optional: explicit remove image when no new file provided
			const removeImage = updateData.removeImage === true || updateData.removeImage === 'true'
			if (removeImage && news.image_url) {
				await deleteFile(news.image_url)
				updateData.image_url = null
			}
			delete updateData.removeImage
		}
		if (isOwner && user.userType === 'Recruiter' && news.status === 'rejected') {
			updateData.status = 'pending'
			updateData.rejection_reason = null
			updateData.moderatorId = null
			updateData.moderatorType = null
		}
		if (!isOwner && isAdminOrStaff) {
			delete updateData.status
		}

		if (updateData.visible_to_recruiter !== undefined) {
			updateData.visible_to_recruiter = updateData.visible_to_recruiter === 'true' || updateData.visible_to_recruiter === true
		}

		await news.update(updateData)
		return news
	}

	static async deleteNews(newsId, user) {
		const news = await News.findByPk(newsId)
		if (!news) throw { status: 404, message: 'Yangilik topilmadi.' }
		const isOwner = news.authorId === user.id && news.authorType === user.userType
		const isAdminOrStaff = user.userType === 'Admin' || user.userType === 'Staff'
		if (!isOwner && !isAdminOrStaff) {
			throw { status: 403, message: "Bu amal uchun sizda ruxsat yo'q." }
		}
		await deleteFile(news.image_url)
		await news.destroy()
		return { message: "Yangilik muvaffaqiyatli o'chirildi." }
	}

	static async getNews(filters, user) {
		const { type, status, search } = filters

		const finalConditions = []

		if (user.userType === 'Admin' || user.userType === 'Staff') {
			if (status) finalConditions.push({ status: status })
		} else if (user.userType === 'Recruiter') {
			finalConditions.push({
				[Op.or]: [
					{
						status: 'approved',
						visible_to_recruiter: true,
					},
					{
						authorId: user.id,
						authorType: 'Recruiter',
						status: { [Op.in]: ['pending', 'rejected'] },
					},
				],
			})
		} else {
			finalConditions.push({ status: 'approved' })
		}

		if (type) {
			finalConditions.push({ type: type })
		}

		if (search) {
			const searchQuery = { [Op.iLike]: `%${search}%` }
			const searchOrConditions = [{ title: searchQuery }, { hashtags: { [Op.contains]: [search] } }]
			if (user.userType !== 'Student') {
				searchOrConditions.push({
					'$authorRecruiter.company.company_name$': searchQuery,
				})
			}
			finalConditions.push({ [Op.or]: searchOrConditions })
		}

		const newsListWithIncludes = await News.findAll({
			where: {
				[Op.and]: finalConditions,
			},
			order: [['createdAt', 'DESC']],
			include: [
				{
					model: Admin,
					as: 'authorAdmin',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Staff,
					as: 'authorStaff',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Recruiter,
					as: 'authorRecruiter',
					attributes: ['id'],
					required: false,
					include: [
						{
							model: Company,
							as: 'company',
							attributes: ['id', 'company_name'],
							required: false,
						},
					],
				},
				{
					model: Admin,
					as: 'moderatorAdmin',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Staff,
					as: 'moderatorStaff',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
			],
		})

		const cleanNewsList = newsListWithIncludes.map(newsItem => {
			const newsJson = newsItem.toJSON()
			let author = null
			if (newsJson.authorType === 'Admin' && newsJson.authorAdmin) author = newsJson.authorAdmin
			else if (newsJson.authorType === 'Staff' && newsJson.authorStaff) author = newsJson.authorStaff
			else if (newsJson.authorType === 'Recruiter' && newsJson.authorRecruiter) {
				// Keep the old flat shape: { id, company_name }
				author = {
					id: newsJson.authorRecruiter.id,
					company_name: newsJson.authorRecruiter.company?.company_name || null,
				}
			}
			let moderator = null
			if (newsJson.moderatorType === 'Admin' && newsJson.moderatorAdmin) moderator = newsJson.moderatorAdmin
			else if (newsJson.moderatorType === 'Staff' && newsJson.moderatorStaff) moderator = newsJson.moderatorStaff
			delete newsJson.authorAdmin
			delete newsJson.authorStaff
			delete newsJson.authorRecruiter
			delete newsJson.moderatorAdmin
			delete newsJson.moderatorStaff
			newsJson.author = author
			newsJson.moderator = moderator
			return newsJson
		})

		return cleanNewsList
	}

	static async moderateNews(newsId, action, reason, moderator) {
		if (moderator.userType !== 'Admin' && moderator.userType !== 'Staff') {
			throw {
				status: 403,
				message: 'Sizda bu amalni bajarish uchun ruxsat yo‘q.',
			}
		}
		const news = await News.findByPk(newsId)
		if (!news) throw { status: 404, message: 'Yangilik topilmadi.' }
		if (news.type !== 'company')
			throw {
				status: 400,
				message: 'Faqat kompaniya yangiliklarini moderatsiya qilish mumkin.',
			}
		news.status = action
		news.moderatorId = moderator.id
		news.moderatorType = moderator.userType
		news.rejection_reason = action === 'rejected' ? reason : null
		await news.save()
		return news
	}

	static async getNewsWithUnreadCount(filters, user) {
		try {
			const news = await this.getNews(filters, user)

			let unreadCount = 0
			if (user && user.id && user.userType) {
				let userId = user.id
				let userRole = user.userType.toLowerCase()

				// Map Student to business ID to match NewsViews/Notifications
				if (userRole === 'student') {
					const { getStudentById } = require('./studentService')
					const student = await getStudentById(user.id)
					if (student) {
						userId = student.student_id
					}
				}

				// Derive unread count strictly from the same news list we return,
				// so filters (hashtags, recruiter name, etc.) are perfectly aligned.
				const newsIds = (news || []).map(n => n.id)
				unreadCount = await NewsViewsService.getUnreadCountForNewsIds(String(userId), userRole, newsIds)
			}

			return {
				news,
				unreadCount,
				totalCount: news.length,
			}
		} catch (error) {
			console.error('Error getting news with unread count:', error)
			throw error
		}
	}

	static async getById(id, user) {
		const { News, Staff, Recruiter, Admin, Company } = require('../models')
		const { Op } = require('sequelize')
		const finalConditions = [{ id: id }]
		if (user.userType === 'Admin' || user.userType === 'Staff') {
			// no extra restrictions
		} else if (user.userType === 'Recruiter') {
			finalConditions.push({
				[Op.or]: [
					{ status: 'approved', visible_to_recruiter: true },
					{ authorId: user.id, authorType: 'Recruiter' },
				],
			})
		} else {
			finalConditions.push({ status: 'approved' })
		}
		const item = await News.findOne({
			where: { [Op.and]: finalConditions },
			include: [
				{
					model: Admin,
					as: 'authorAdmin',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Staff,
					as: 'authorStaff',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Recruiter,
					as: 'authorRecruiter',
					attributes: ['id'],
					required: false,
					include: [
						{
							model: Company,
							as: 'company',
							attributes: ['id', 'company_name'],
							required: false,
						},
					],
				},
				{
					model: Admin,
					as: 'moderatorAdmin',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
				{
					model: Staff,
					as: 'moderatorStaff',
					attributes: ['id', 'first_name', 'last_name'],
					required: false,
				},
			],
		})
		if (!item) return null
		const newsJson = item.toJSON()
		let author = null
		if (newsJson.authorType === 'Admin' && newsJson.authorAdmin) author = newsJson.authorAdmin
		else if (newsJson.authorType === 'Staff' && newsJson.authorStaff) author = newsJson.authorStaff
		else if (newsJson.authorType === 'Recruiter' && newsJson.authorRecruiter) {
			// Keep the old flat shape: { id, company_name }
			author = {
				id: newsJson.authorRecruiter.id,
				company_name: newsJson.authorRecruiter.company?.company_name || null,
			}
		}
		let moderator = null
		if (newsJson.moderatorType === 'Admin' && newsJson.moderatorAdmin) moderator = newsJson.moderatorAdmin
		else if (newsJson.moderatorType === 'Staff' && newsJson.moderatorStaff) moderator = newsJson.moderatorStaff
		delete newsJson.authorAdmin
		delete newsJson.authorStaff
		delete newsJson.authorRecruiter
		delete newsJson.moderatorAdmin
		delete newsJson.moderatorStaff
		newsJson.author = author
		newsJson.moderator = moderator
		return newsJson
	}
}

module.exports = NewsService
