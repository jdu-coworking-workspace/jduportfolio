const bcrypt = require('bcrypt')
const StudentService = require('../services/studentService')
const DraftService = require('../services/draftService')
const QAService = require('../services/qaService')
const generatePassword = require('generate-password')
const { sendStudentWelcomeEmail, formatStudentProfilePublicEmail } = require('../utils/emailToStudent')
const { sendEmail } = require('../utils/emailService')
const { Student, ShareableLink } = require('../models')
const ShareableLinkTranslationService = require('../services/shareableLinkTranslationService')

const buildShareableLinkResponse = link => {
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
	const expiresAt = link.expiresAt instanceof Date ? link.expiresAt : new Date(link.expiresAt)
	return {
		id: link.id,
		language: link.language || 'ja',
		url: `${frontendUrl}/student/share/${link.id}`,
		createdAt: link.createdAt,
		expiresAt: link.expiresAt,
		timeRemainingMs: expiresAt.getTime() - Date.now(),
		translationStatus: link.translationStatus || 'not_required',
	}
}

class StudentController {
	// Get student IDs for autocomplete
	static async getStudentIds(req, res, next) {
		try {
			const { search } = req.query
			const requesterRole = req.user?.userType || null
			const studentIds = await StudentService.getStudentIds(search, requesterRole)
			res.status(200).json(studentIds)
		} catch (error) {
			next(error)
		}
	}

	// Get all unique language skills
	static async getLanguageSkills(req, res, next) {
		try {
			const requesterRole = req.user?.userType || null
			const languageSkills = await StudentService.getLanguageSkills(requesterRole)
			res.status(200).json(languageSkills)
		} catch (error) {
			next(error)
		}
	}

	// Webhook handler for Kintone events
	static async webhookHandler(req, res) {
		try {
			const { type, record, recordId } = req.body

			// Hodisa turiga qarab ish bajaramiz
			switch (type) {
				// YANGI YOZUV QO'SHILGANDA
				case 'ADD_RECORD': {
					const password = generatePassword.generate({
						length: 12,
						numbers: true,
						symbols: false,
						uppercase: true,
						excludeSimilarCharacters: true,
					})

					// Kintone'dan kelgan ma'lumotlarni DB modeliga moslashtiramiz
					const studentData = {
						email: record.mail?.value,
						password: password, // Parol model ichida avtomatik xeshlanadi
						first_name: record.studentFirstName?.value,
						last_name: record.studentLastName?.value,
						student_id: record.studentId?.value,
						phone: record.phoneNumber?.value,
						date_of_birth: record.birthday?.value,
						gender: record.gender?.value,
						address: record.address?.value,
						parents_phone_number: record.parentsPhoneNumber?.value,
						enrollment_date: record.jduDate?.value,
						partner_university: record.partnerUniversity?.value,
						faculty: record.faculty?.value,
						department: record.department?.value,
						partner_university_enrollment_date: record.partnerUniversityEnrollmentDate?.value,
						semester: record.semester?.value,
						student_status: record.studentStatus?.value,
						// If Kintone field is a Date with field code 'graduation_year', prefer it
						graduation_year: record.graduation_year?.value || record.graduationYear?.value,
						graduation_season: record.graduationSeason?.value,
						kintone_id: record['$id']?.value,
						active: record.semester?.value > 0, // Semestri bo'lsa, aktiv deb hisoblaymiz
					}

					// Servis orqali yangi talaba yaratamiz
					const newStudent = await StudentService.createStudent(studentData)

					// Agar talaba aktiv bo'lsa, unga xush kelibsiz xabarini jo'natamiz
					if (newStudent?.active) {
						await sendStudentWelcomeEmail(
							newStudent.email,
							password, // Xeshlanmagan parolni yuboramiz
							newStudent.first_name,
							newStudent.last_name
						)
					}

					// Muvaffaqiyatli javob qaytaramiz
					return res.status(201).json({
						message: 'Student created via webhook',
						student: newStudent,
					})
				}

				// YOZUV YANGILANGANDA
				case 'UPDATE_RECORD': {
					const kintoneId = record['$id']?.value
					// Kintone'dan kelgan ma'lumotlarni DB modeliga moslashtiramiz
					const studentData = {
						email: record.mail?.value,
						first_name: record.studentFirstName?.value,
						last_name: record.studentLastName?.value,
						student_id: record.studentId?.value,
						phone: record.phoneNumber?.value,
						date_of_birth: record.birthday?.value,
						gender: record.gender?.value,
						address: record.address?.value,
						parents_phone_number: record.parentsPhoneNumber?.value,
						enrollment_date: record.jduDate?.value,
						partner_university: record.partnerUniversity?.value,
						faculty: record.faculty?.value,
						department: record.department?.value,
						partner_university_enrollment_date: record.partnerUniversityEnrollmentDate?.value,
						semester: record.semester?.value,
						student_status: record.studentStatus?.value,
						graduation_year: record.graduation_year?.value || record.graduationYear?.value,
						graduation_season: record.graduationSeason?.value,
						active: record.semester?.value > 0,
					}

					// Servis orqali kintone_id bo'yicha yangilaymiz
					const updatedStudent = await StudentService.updateStudentWithKintoneID(kintoneId, studentData)

					if (!updatedStudent) {
						return res.status(404).json({ message: 'Student not found with this Kintone ID' })
					}

					return res.status(200).json({
						message: 'Student updated successfully',
						student: updatedStudent,
					})
				}

				// YOZUV O'CHIRILGANDA
				case 'DELETE_RECORD': {
					const deletedCount = await StudentService.deleteStudentByKintoneId(recordId)

					if (deletedCount === 0) {
						return res.status(404).json({ message: 'Student not found with this Kintone ID' })
					}

					return res.status(204).send() // Muvaffaqiyatli o'chirish uchun javob
				}

				default:
					return res.status(400).json({ message: 'Invalid webhook event type' })
			}
		} catch (error) {
			console.error('Error in Student webhook handler:', error)
			return res.status(500).json({ error: 'Internal Server Error', message: error.message })
		}
	}

	static async createStudent(req, res, next) {
		try {
			const studentData = req.body
			const newStudent = await StudentService.createStudent(studentData)
			res.status(201).json(newStudent)
		} catch (error) {
			next(error)
		}
	}

	static async getAllStudents(req, res, next) {
		try {
			let filter = {}
			const userType = req.user?.userType || 'Guest'

			if (req.query.filter) {
				try {
					filter = typeof req.query.filter === 'string' ? JSON.parse(req.query.filter) : req.query.filter
				} catch (e) {
					console.error('Failed to parse filter:', e.message)
					return res.status(400).json({ error: 'Invalid filter format' })
				}
			}

			const recruiterId = req.query.recruiterId
			const onlyBookmarked = req.query.onlyBookmarked

			const { sortBy, sortOrder } = req.query
			const sortOptions = { sortBy, sortOrder }

			// Pagination parametrlari
			const page = req.query.page ? parseInt(req.query.page, 10) : undefined
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined
			const isPaginated = page !== undefined && limit !== undefined
			const pagination = isPaginated ? { page, limit, offset: (page - 1) * limit } : {}

			if (userType === 'Recruiter' && !recruiterId) {
				console.log('Recruiter user but no recruiterId provided, returning empty result')
				return res.status(200).json(isPaginated ? { data: [], pagination: { page: 1, limit: limit || 50, total: 0, totalPages: 0 } } : [])
			}

			const result = await StudentService.getAllStudents(filter, recruiterId, onlyBookmarked, userType, sortOptions, pagination)

			// Set cache control headers to prevent 304 responses
			res.set({
				'Cache-Control': 'no-cache, no-store, must-revalidate',
				Pragma: 'no-cache',
				Expires: '0',
			})

			// Pagination bo'lsa, yangi format; aks holda eski format
			if (isPaginated) {
				res.status(200).json({
					data: result.students,
					pagination: {
						page: page,
						limit: limit,
						total: result.total,
						totalPages: Math.ceil(result.total / limit),
					},
				})
			} else {
				res.status(200).json(result)
			}
		} catch (error) {
			console.error('Error in getAllStudents controller:', error.message, error.stack)

			// Return empty array/object instead of 500 error for better UX
			const isPaginated = req.query.page !== undefined && req.query.limit !== undefined
			if (isPaginated) {
				res.status(200).json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } })
			} else {
				res.status(200).json([])
			}
		}
	}

	// Controller method to get a student by ID
	static async getStudentById(req, res, next) {
		try {
			const { id } = req.params
			// Pass requester info to service method
			const requesterId = req.user?.id
			const requesterRole = req.user?.userType
			const student = await StudentService.getStudentByStudentId(id, false, requesterId, requesterRole)
			res.status(200).json(student)
		} catch (error) {
			if (error.message === 'Student not found') {
				return res.status(404).json({
					error: 'Student not found',
					message: `Student with ID ${req.params.id} not found`,
				})
			}
			next(error)
		}
	}

	static async updateStudent(req, res, next) {
		try {
			const { id } = req.params
			const { currentPassword, password, ...studentData } = req.body

			console.log('UpdateStudent called with:', { id, studentData })

			// Use getStudentByStudentId to be consistent with GET endpoint
			const student = await StudentService.getStudentByStudentId(id)

			if (!student) {
				console.log('Student not found:', id)
				return res.status(404).json({ error: 'Student not found' })
			}

			console.log('Current student data:', student.dataValues)

			let updatePayload = { ...studentData }

			// visibility true bo'lsa, pendingDraft borligini va u 'approved' statusida ekanligini tekshirish
			if (studentData.visibility === true) {
				const studentWithDraft = await DraftService.getStudentWithDraft(student.student_id)

				// Check pendingDraft instead of draft, as approvals happen on pending versions
				const pendingDraft = studentWithDraft?.pendingDraft
				console.log('Pending draft data for student:', pendingDraft)

				// Check if student is approved by staff (pendingDraft status should be 'approved')
				if (!pendingDraft || pendingDraft.status !== 'approved') {
					// Return warning response instead of error
					return res.status(200).json({
						warning: true,
						message: 'studentNotApprovedByStaff',
						requiresStaffApproval: true,
					})
				}

				if (pendingDraft && pendingDraft.status === 'approved') {
					// Pending draftdan profile_data ni olish va uni yangilash payload'ga qo'shish
					const profileData = pendingDraft.profile_data || {}
					updatePayload = {
						...profileData, // Pending draftdan kelgan profil ma'lumotlari
						visibility: true, // Tasdiqlanganidan keyin faollashtiramiz
					}
					console.log('Using pending draft profile data:', updatePayload)
				} else {
					// Agar pending draft yo'q yoki approved emas bo'lsa, faqat visibility'ni yangilash
					updatePayload = { visibility: true }
					console.log('Using visibility only:', updatePayload)
				}
			}

			// Agar parol o'zgartirilayotgan bo'lsa, eski parolni tekshirish
			if (password) {
				const studentWithPassword = await StudentService.getStudentByStudentId(req.params.id, true)
				if (!studentWithPassword || !(await bcrypt.compare(currentPassword, studentWithPassword.password))) {
					return res.status(400).json({ error: '現在のパスワードを入力してください' })
				}
				updatePayload.password = password
			}

			console.log('Final update payload:', updatePayload)

			// Studentni bir marta yangilash
			const updatedStudent = await StudentService.updateStudent(id, updatePayload)

			console.log('Updated student:', updatedStudent.dataValues)

			// Notify recruiters when a student's profile is made public
			try {
				const becamePublic = studentData.visibility === true && student.visibility !== true
				if (becamePublic) {
					const { Recruiter } = require('../models')
					const NotificationService = require('../services/notificationService')
					const { buildNotificationUrl } = require('../utils/notificationUrlBuilder')
					const recruiters = await Recruiter.findAll({ attributes: ['id'] })
					if (Array.isArray(recruiters) && recruiters.length > 0) {
						const sid = updatedStudent.student_id || id
						const msgJA = `学生 (ID: ${sid}) のプロフィールが公開されました。`
						const msgEN = `Student (ID: ${sid}) profile has been made public.`
						const msgUZ = `Talaba (ID: ${sid}) profili ommaga ochildi.`
						const msgRU = `Профиль студента (ID: ${sid}) стал публичным.`
						const message = `【JA】${msgJA}\n【EN】${msgEN}\n【UZ】${msgUZ}\n【RU】${msgRU}`
						const targetUrl = buildNotificationUrl({
							type: 'etc',
							userRole: 'recruiter',
							studentId: sid,
							relatedId: updatedStudent.id,
						})
						await Promise.all(
							recruiters.map(r =>
								NotificationService.create({
									user_id: String(r.id),
									user_role: 'recruiter',
									type: 'etc',
									status: 'unread',
									message,
									related_id: updatedStudent.id,
									target_url: targetUrl,
								})
							)
						)
					}
				}

				// Studentga koukai (public) bo'lgani haqida email jo'natish
				if (student.email) {
					try {
						const studentFullName = `${updatedStudent.first_name || ''} ${updatedStudent.last_name || ''}`.trim() || id
						const koukaMailData = formatStudentProfilePublicEmail(student.email, studentFullName, updatedStudent.student_id || id)
						await sendEmail(koukaMailData)
						console.log(`✅ Student (${updatedStudent.student_id || id}) ga koukai email muvaffaqiyatli jo'natildi.`)
					} catch (emailErr) {
						console.error(`❌ Student koukai email jo'natishda xatolik:`, emailErr.message)
					}
				}
			} catch (e) {
				console.error('Failed to notify recruiters on publish:', e)
			}

			res.status(200).json(updatedStudent)
		} catch (error) {
			console.error('Error updating student:', error)
			res.status(500).json({ error: error.message })
		}
	}

	// Controller method to delete a student
	static async deleteStudent(req, res, next) {
		try {
			const { id } = req.params
			await StudentService.deleteStudent(id)
			res.status(204).end()
		} catch (error) {
			next(error)
		}
	}

	// sample email sender
	static async mail(req, res, next) {
		try {
			const { email, password, firstName, lastName } = req.body
			await StudentService.EmailToStudent(email, password, firstName, lastName)
			res.status(204).end()
		} catch (error) {
			next(error)
		}
	}

	// Credit Details Methods
	static async getStudentWithCreditDetails(req, res, next) {
		try {
			const { studentId } = req.params
			const student = await StudentService.getStudentWithCreditDetails(studentId)

			res.status(200).json({
				success: true,
				data: student,
				message: 'Student with credit details retrieved successfully',
			})
		} catch (error) {
			if (error.message === 'Student not found') {
				res.status(404).json({
					success: false,
					message: 'Student not found',
				})
			} else {
				next(error)
			}
		}
	}

	static async syncStudentCreditDetails(req, res, next) {
		try {
			const { studentId } = req.params
			const result = await StudentService.updateStudentCreditDetails(studentId)

			res.status(200).json({
				success: true,
				data: result,
				message: 'Credit details synced successfully',
			})
		} catch (error) {
			if (error.message === 'Student not found or no update needed') {
				res.status(404).json({
					success: false,
					message: 'Student not found',
				})
			} else {
				next(error)
			}
		}
	}

	static async syncAllStudentCreditDetails(req, res, next) {
		try {
			const results = await StudentService.syncAllStudentCreditDetails()

			const successCount = results.filter(r => !r.error).length
			const errorCount = results.filter(r => r.error).length

			res.status(200).json({
				success: true,
				data: {
					results,
					summary: {
						total: results.length,
						successful: successCount,
						failed: errorCount,
					},
				},
				message: `Credit details sync completed. ${successCount} successful, ${errorCount} failed.`,
			})
		} catch (error) {
			next(error)
		}
	}

	// Get credit details for a student
	static async getCreditDetails(req, res, next) {
		try {
			const { id } = req.params
			const result = await StudentService.getStudentWithCreditDetails(id)

			res.status(200).json({
				success: true,
				data: result,
				message: 'Student with credit details retrieved successfully',
			})
		} catch (error) {
			if (error.message === 'Student not found') {
				res.status(404).json({
					success: false,
					message: 'Student not found',
				})
			} else {
				next(error)
			}
		}
	}

	static async generateShareableLink(req, res, next) {
		try {
			const studentId = req.params.id
			const language = ShareableLinkTranslationService.normalizeLanguage(req.body?.language || req.body?.lang || req.query?.language || 'ja')
			const requestedExpiry = String(req.body?.expiresIn || req.body?.expirationPeriod || req.body?.duration || '24h')
				.trim()
				.toLowerCase()

			const expiryMap = {
				'24h': 24 * 60 * 60 * 1000,
				'7d': 7 * 24 * 60 * 60 * 1000,
				'1m': 30 * 24 * 60 * 60 * 1000,
			}
			const expiresInMs = expiryMap[requestedExpiry] || expiryMap['24h']
			const expiresInKey = expiryMap[requestedExpiry] ? requestedExpiry : '24h'

			if (!ShareableLink) {
				return res.status(500).json({ error: 'ShareableLink model is not loaded' })
			}

			const student = await StudentService.getStudentByStudentId(studentId)
			if (!student) {
				return res.status(404).json({ error: 'Student not found' })
			}

			if (req.user?.userType !== 'Student' || req.user.id !== student.id) {
				return res.status(403).json({ error: 'Forbidden' })
			}

			if (!student.visibility) {
				return res.status(403).json({ error: 'profile_not_public', message: 'Profile must be public to generate a shareable link' })
			}

			const publicProfile = await StudentService.getStudentByStudentId(
				studentId,
				false,
				null,
				'Guest',
				true // bypassVisibility = true
			)
			const sourceProfile = ShareableLinkTranslationService.prepareSourceProfile(publicProfile)
			const sourceProfileHash = ShareableLinkTranslationService.hashProfile(sourceProfile)
			const existingLink = await ShareableLink.findOne({ where: { studentId, language } })
			let translation

			if (existingLink?.translatedPayload && existingLink.sourceProfileHash === sourceProfileHash) {
				translation = {
					payload: existingLink.translatedPayload,
					status: existingLink.translationStatus || (language === 'ja' ? 'not_required' : 'translated'),
					translatedAt: existingLink.translatedAt,
					error: existingLink.translationError || null,
					hash: sourceProfileHash,
				}
			} else {
				translation = await ShareableLinkTranslationService.translateProfile(sourceProfile, language)
			}

			const sequelize = ShareableLink.sequelize
			let newLink
			let expiresAt
			await sequelize.transaction(async transaction => {
				await ShareableLink.destroy({
					where: { studentId, language },
					transaction,
				})

				expiresAt = new Date(Date.now() + expiresInMs)

				newLink = await ShareableLink.create(
					{
						studentId,
						language,
						expiresAt,
						translatedPayload: translation.payload,
						translatedAt: translation.translatedAt,
						translationStatus: translation.status,
						translationError: translation.error,
						sourceProfileHash: translation.hash,
					},
					{ transaction }
				)
			})

			const linkResponse = buildShareableLinkResponse(newLink)

			res.status(201).json({
				success: true,
				url: linkResponse.url,
				link: linkResponse,
				language,
				expiresAt: expiresAt,
				expiresIn: expiresInKey,
			})
		} catch (error) {
			if (error.message === 'GEMINI_API_KEY is not configured') {
				return res.status(500).json({ error: 'translation_not_configured', message: error.message })
			}
			if (error.code === 'translation_rate_limited' || error.response?.status === 429) {
				return res.status(429).json({
					error: 'translation_rate_limited',
					message: 'Gemini translation quota or rate limit was reached. Please try again later or generate a Japanese link.',
				})
			}
			if (error.code === 'translation_provider_unavailable') {
				return res.status(503).json({
					error: 'translation_provider_unavailable',
					message: 'Translation service is temporarily unavailable. Please try again later or generate a Japanese link.',
				})
			}
			next(error)
		}
	}

	static async deactivateShareableLink(req, res, next) {
		try {
			const studentId = req.params.id

			if (!ShareableLink) {
				return res.status(500).json({ error: 'ShareableLink model is not loaded' })
			}

			const student = await StudentService.getStudentByStudentId(studentId)
			if (!student) {
				return res.status(404).json({ error: 'Student not found' })
			}

			if (req.user?.userType !== 'Student' || req.user.id !== student.id) {
				return res.status(403).json({ error: 'Forbidden' })
			}

			const language = req.query?.language || req.body?.language || null
			const where = { studentId }
			if (language) {
				where.language = ShareableLinkTranslationService.normalizeLanguage(language)
			}

			const deletedCount = await ShareableLink.destroy({ where })

			return res.status(200).json({
				success: true,
				message: 'Shareable link deactivated successfully',
				deletedCount,
				language: where.language || null,
			})
		} catch (error) {
			next(error)
		}
	}

	static async getLinkStatus(req, res, next) {
		try {
			const studentId = req.params.id

			const student = await StudentService.getStudentByStudentId(studentId)
			if (!student) {
				return res.status(404).json({ error: 'Student not found' })
			}

			if (req.user?.userType !== 'Student' || req.user.id !== student.id) {
				return res.status(403).json({ error: 'Forbidden' })
			}

			const requestedLanguage = ShareableLinkTranslationService.normalizeLanguage(req.query?.language || 'ja')
			const links = await ShareableLink.findAll({
				where: { studentId },
				order: [['createdAt', 'DESC']],
			})

			const activeLinks = []
			for (const link of links) {
				if (new Date() > link.expiresAt) {
					await link.destroy()
				} else {
					activeLinks.push(link)
				}
			}

			const linkMap = activeLinks.reduce((acc, link) => {
				acc[link.language || 'ja'] = buildShareableLinkResponse(link)
				return acc
			}, {})
			const requestedLink = linkMap[requestedLanguage] || null

			return res.status(200).json({
				hasLink: Boolean(requestedLink),
				url: requestedLink?.url || null,
				createdAt: requestedLink?.createdAt || null,
				expiresAt: requestedLink?.expiresAt || null,
				timeRemainingMs: requestedLink?.timeRemainingMs || 0,
				language: requestedLanguage,
				links: linkMap,
			})
		} catch (error) {
			next(error)
		}
	}

	static async getProfileByPublicLink(req, res, next) {
		try {
			const { uuid } = req.params
			const linkData = await ShareableLink.findOne({ where: { id: uuid } })

			if (!linkData) {
				return res.status(404).json({ message: "Link yaroqsiz yoki o'chirilgan" })
			}

			if (new Date() > linkData.expiresAt) {
				await linkData.destroy()
				return res.status(410).json({ message: 'Link muddati tugagan' })
			}
			const student =
				linkData.translatedPayload ||
				(await StudentService.getStudentByStudentId(
					linkData.studentId,
					false,
					null,
					'Guest',
					true // bypassVisibility = true
				))

			student.linkLanguage = linkData.language || 'ja'
			student.publicLanguage = linkData.language || 'ja'

			res.status(200).json(student)
		} catch (error) {
			next(error)
		}
	}
}

module.exports = StudentController
