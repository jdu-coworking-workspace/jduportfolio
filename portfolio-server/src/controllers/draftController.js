const { Student, Admin, Draft, Staff, Notification } = require('../models')
const { sendEmail } = require('../utils/emailService')
const DraftService = require('../services/draftService')
const NotificationService = require('../services/notificationService')
const StaffService = require('../services/staffService')
const { buildNotificationUrl } = require('../utils/notificationUrlBuilder')

class DraftController {
	/**
	 * Talaba uchun draft yaratadi yoki yangilaydi (Upsert)
	 * Staff/Admin uchun pending draft'ni yangilaydi
	 */
	static async upsertDraft(req, res) {
		try {
			const userRole = req.user.userType
			const { profile_data, student_id } = req.body

			if (!profile_data) {
				return res.status(400).json({ error: 'profile_data yuborilishi shart.' })
			}

			// For students: edit their own draft version
			if (userRole === 'Student') {
				const student = await Student.findOne({ where: { id: req.user.id } })
				if (!student) {
					return res.status(403).json({ error: "Faqat talabalar profilni o'zgartirishi mumkin." })
				}

				const { draft, created } = await DraftService.upsertDraft(student.student_id, profile_data)

				const message = created ? 'Qoralama muvaffaqiyatli yaratildi' : 'Qoralama muvaffaqiyatli yangilandi'
				return res.status(created ? 201 : 200).json({ message, draft })
			}

			// For staff/admin: edit the pending draft of a student
			if (userRole === 'Staff' || userRole === 'Admin') {
				if (!student_id) {
					return res.status(400).json({ error: 'student_id is required for staff edits.' })
				}

				const { draft, created } = await DraftService.upsertPendingDraft(student_id, profile_data)

				const message = created ? 'Pending draft created successfully' : 'Pending draft updated successfully'
				return res.status(created ? 201 : 200).json({ message, draft })
			}

			return res.status(403).json({ error: 'Unauthorized' })
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}
	/**
	 * Talaba o'z draftini tekshiruvga yuboradi
	 */
	static async submitDraft(req, res) {
		try {
			const { id } = req.params
			const { staff_id } = req.body

			const draftForCheck = await Draft.findByPk(id)
			if (!draftForCheck) {
				return res.status(404).json({ error: 'Qoralama topilmadi.' })
			}

			// Ensure it's a draft version being submitted
			if (draftForCheck.version_type !== 'draft') {
				return res.status(400).json({ error: 'Faqat draft versiyasini yuborish mumkin.' })
			}

			const student = await Student.findOne({ where: { id: req.user.id } })
			if (!student || student.student_id !== draftForCheck.student_id) {
				return res.status(403).json({
					error: "Ruxsat yo'q. Faqat o'z profilingizni yubora olasiz.",
				})
			}

			const pendingDraft = await DraftService.submitForReview(id)

			// Xodimlarga bildirishnoma yuborish
			const studentID = pendingDraft.student_id || 'Unknown'
			const message = `学生${studentID}からプロフィール情報が送信されました`
			const targetUrl = buildNotificationUrl({
				type: 'draft_submitted',
				userRole: 'staff',
				studentId: studentID,
				relatedId: pendingDraft.id,
			})
			const notificationPayload = {
				user_role: 'staff',
				type: 'draft_submitted',
				message: message,
				status: 'unread',
				related_id: pendingDraft.id,
				target_url: targetUrl,
			}

			if (staff_id) {
				const staff = await Staff.findByPk(staff_id)
				if (staff) {
					await NotificationService.create({
						...notificationPayload,
						user_id: staff.id,
					})
				}
			} else {
				const staffMembers = await Staff.findAll()
				for (const staff of staffMembers) {
					await NotificationService.create({
						...notificationPayload,
						user_id: staff.id,
					})
				}
			}

			return res.status(200).json({
				message: 'Qoralama muvaffaqiyatli tekshiruvga yuborildi.',
				draft: pendingDraft,
			})
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}

	static async updateStatus(req, res) {
		try {
			const { id } = req.params
			let { status, comments } = req.body
			const reviewed_by = req.user.id

			if (req.user.userType.toLowerCase() !== 'staff') {
				return res.status(403).json({
					error: "Ruxsat yo'q. Faqat xodimlar statusni o'zgartira oladi.",
				})
			}
			if (!status) {
				return res.status(400).json({ error: 'Status yuborilishi shart.' })
			}

			// Normalize and validate comments
			if (typeof comments === 'string') {
				comments = comments.trim()
				if (comments.length === 0) comments = null
			}
			if (comments && comments.length > 2000) {
				return res.status(400).json({ error: 'コメントが長すぎます（最大2000文字）。' })
			}

			const draft = await DraftService.updateStatusByStaff(id, status, comments, reviewed_by)
			const student = await Student.findOne({
				where: { student_id: draft.student_id },
			})

			if (status.toLowerCase() === 'approved') {
				// Serialize fields that are TEXT in Student table but stored as objects in Draft
				const sanitizedProfileData = { ...draft.profile_data }
				const textFields = ['jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'ielts', 'language_skills']
				textFields.forEach(field => {
					if (sanitizedProfileData[field] && typeof sanitizedProfileData[field] === 'object') {
						sanitizedProfileData[field] = JSON.stringify(sanitizedProfileData[field])
					}
				})

				await Student.update(sanitizedProfileData, {
					where: { student_id: draft.student_id },
				})

				const admins = await Admin.findAll()
				const adminMessage = `学生 (ID: ${student.student_id}) の情報は、スタッフ (ID: ${reviewed_by}) によって承認されました。`
				const adminTargetUrl = buildNotificationUrl({
					type: 'approved',
					userRole: 'admin',
					studentId: student.student_id,
					relatedId: draft.id,
				})
				for (const admin of admins) {
					await NotificationService.create({
						message: adminMessage,
						status: 'unread',
						user_id: admin.id,
						user_role: 'admin',
						type: 'approved',
						related_id: draft.id,
						target_url: adminTargetUrl,
					})
				}

				const staffMember = await Staff.findByPk(reviewed_by)
				const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'JDU Staff'
				const studentName = student ? `${student.first_name} ${student.last_name}` : draft.student_id

				const academicAffairsEmails = ['academic-affairs@jdu.uz', 'masato.s@jdu.uz', 'yoko.w@jdu.uz']
				const mailData = {
					to: academicAffairsEmails.join(', '),
					subject: `学生のプロフィール更新が承認されました (学生ID: ${draft.student_id})`,
					text: `${studentName} (ID: ${draft.student_id}) さんのプロフィール更新が、${staffName} によって承認されました。詳細はポートフォリオシステムでご確認ください。`,
					html: `
                        <p>${studentName} (学生ID: ${draft.student_id}) さんのプロフィール更新が、<strong>${staffName}</strong> によって承認されました。</p>
                        <p>詳細はポートフォリオシステムでご確認ください。</p>
                        <p><a href="https://portfolio.jdu.uz/checkprofile/profile/${draft.student_id}">学生のプロフィールを見る</a></p>
                    `,
				}
				await sendEmail(mailData)
				console.log("✅ Academic Affairs bo'limiga tasdiqlash emaili muvaffaqiyatli jo'natildi.")
			}

			// Talabaga bildirishnoma yuborish (multi-language)
			const staffMember = await StaffService.getStaffById(draft.reviewed_by)
			const staffDisplayName = staffMember ? `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim() : 'JDU Staff'

			const statusKey = String(status || '').toLowerCase()
			const statusLabels = {
				ja: {
					approved: '確認済',
					checking: '確認中',
					resubmission_required: '要修正',
					disapproved: '差し戻し',
				},
				en: {
					approved: 'Approved',
					checking: 'Checking',
					resubmission_required: 'Resubmission required',
					disapproved: 'Disapproved',
				},
				uz: {
					approved: 'Tasdiqlangan',
					checking: 'Tekshirilmoqda',
					resubmission_required: 'Qayta topshirish talab etildi',
					disapproved: 'Rad etildi',
				},
				ru: {
					approved: 'Одобрено',
					checking: 'Проверка',
					resubmission_required: 'Требуется повторная отправка',
					disapproved: 'Отклонено',
				},
			}

			const statusJa = statusLabels.ja[statusKey] || status
			const statusEn = statusLabels.en[statusKey] || status
			const statusUz = statusLabels.uz[statusKey] || status
			const statusRu = statusLabels.ru[statusKey] || status

			let notificationMessage = [`【JA】あなたの情報は${staffDisplayName} によって「${statusJa}」ステータスに変更されました。`, `【EN】Your profile status has been changed to "${statusEn}" by ${staffDisplayName}.`, `【UZ】Sizning profilingiz holati "${statusUz}" ga o'zgartirildi (${staffDisplayName} tomonidan).`, `【RU】Статус вашего профиля изменен на «${statusRu}» (${staffDisplayName}).`].join('\n')

			// Always include staff comment in notification if provided (including approved)
			if (comments) {
				notificationMessage += `|||COMMENT_SEPARATOR|||📝 **スタッフからのコメント / Staff comment / Xodim izohi / Комментарий сотрудника:**\n${comments}`
			}

			const studentTargetUrl = buildNotificationUrl({
				type: status.toLowerCase() === 'approved' ? 'approved' : 'etc',
				userRole: 'student',
				studentId: student.student_id,
				relatedId: draft.id,
			})

			await NotificationService.create({
				message: notificationMessage,
				status: 'unread',
				user_id: student.student_id,
				user_role: 'student',
				type: status.toLowerCase() === 'approved' ? 'approved' : 'etc',
				related_id: draft.id,
				target_url: studentTargetUrl,
			})

			// Adminlarga bildirishnoma yuborish
			if (status.toLowerCase() === 'approved') {
				const admins = await Admin.findAll()
				const adminMessage = `学生 (ID: ${student.student_id}) の情報は、スタッフ (ID: ${reviewed_by}) によって承認されました。`
				const adminTargetUrl2 = buildNotificationUrl({
					type: 'approved',
					userRole: 'admin',
					studentId: student.student_id,
					relatedId: draft.id,
				})
				for (const admin of admins) {
					await NotificationService.create({
						message: adminMessage,
						status: 'unread',
						user_id: admin.id,
						user_role: 'admin',
						type: 'approved',
						related_id: draft.id,
						target_url: adminTargetUrl2,
					})
				}
			}

			return res.json({
				message: 'Qoralama statusi muvaffaqiyatli yangilandi.',
				draft,
			})
		} catch (error) {
			console.error('updateStatus error:', error)
			return res.status(500).json({ error: 'Internal server error' })
		}
	}
	/**
	 * Barcha qoralamalarni olish (xodim/admin uchun)
	 */
	static async getAllDrafts(req, res, next) {
		try {
			let filter = {}

			// Handle different filter formats
			if (req.query.filter) {
				// If filter is already an object (from nested query params like filter[search]=value)
				if (typeof req.query.filter === 'object') {
					filter = req.query.filter
				}
				// If filter is a JSON string
				else if (typeof req.query.filter === 'string') {
					try {
						filter = JSON.parse(req.query.filter)
					} catch (e) {
						// If JSON parse fails, assume it's a simple search string
						filter = { search: req.query.filter }
					}
				}
			}

			// Pagination parametrlari
			const page = req.query.page ? parseInt(req.query.page, 10) : undefined
			const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined
			const isPaginated = page !== undefined && limit !== undefined
			const pagination = isPaginated ? { page, limit, offset: (page - 1) * limit } : {}

			console.log('Parsed filter:', filter)

			const result = await DraftService.getAll(filter, pagination)

			// Set cache control headers
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
			console.error('getAllDrafts error:', error)

			// Return empty array/object instead of 500 error for better UX
			const isPaginated = req.query.page !== undefined && req.query.limit !== undefined
			if (isPaginated) {
				res.status(200).json({ data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } })
			} else {
				res.status(200).json([])
			}
		}
	}
	/**
	 * Qoralamani o'zining IDsi bo'yicha olish
	 */
	static async getDraftById(req, res) {
		try {
			const { id } = req.params
			const draft = await DraftService.getById(id)
			if (!draft) {
				return res.status(404).json({ error: 'Qoralama topilmadi' })
			}
			return res.status(200).json(draft)
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}
	/**
	 * Qoralamani talabaning IDsi bo'yicha olish
	 */
	static async getDraftByStudentId(req, res) {
		try {
			const { student_id } = req.params
			if (!student_id) {
				return res.status(400).json({ error: 'student_id yuborilishi shart' })
			}

			let studentWithDrafts = await DraftService.getStudentWithDraft(student_id)

			if (!studentWithDrafts) {
				return res.status(404).json({ message: 'Talaba topilmadi' })
			}

			// If no draft version exists, create a default one from live data
			if (!studentWithDrafts.draft) {
				const studentProfile = studentWithDrafts
				const draftKeys = ['self_introduction', 'hobbies', 'skills', 'it_skills', 'gallery', 'deliverables', 'other_information', 'education', 'work_experience', 'licenses', 'additional_info', 'arubaito']
				const defaultDraftData = draftKeys.reduce((acc, key) => {
					acc[key] = studentProfile[key] || null
					return acc
				}, {})

				studentWithDrafts.draft = {
					id: null,
					student_id: studentProfile.student_id,
					version_type: 'draft',
					profile_data: defaultDraftData,
					status: 'draft',
					submit_count: 0,
					changed_fields: [],
				}
			}

			return res.status(200).json(studentWithDrafts)
		} catch (error) {
			console.error('getDraftByStudentId xatoligi:', error)
			return res.status(500).json({ error: 'Internal Server Error' })
		}
	}
	/**
	 * Qoralamani o'chirish
	 */
	static async deleteDraft(req, res) {
		try {
			const { id } = req.params
			const deletedDraft = await DraftService.delete(id)
			return res.status(200).json({
				message: "Qoralama muvaffaqiyatli o'chirildi",
				draft: deletedDraft,
			})
		} catch (error) {
			return res.status(400).json({ error: error.message })
		}
	}
}

module.exports = DraftController
