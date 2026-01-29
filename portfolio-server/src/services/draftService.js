const models = require('../models')
const { Draft, Student, sequelize } = models
const { Staff } = models
const SettingsService = require('./settingService')
const QAService = require('./qaService')
const _ = require('lodash') // Used for deep object comparison
const { uploadFile, deleteFile } = require('../utils/storageService')
const generateUniqueFilename = require('../utils/uniqueFilename')

const { Op } = require('sequelize')

/**
 * Compares two objects and returns an array of keys that have changed.
 * @param {object} newData - The new data object.
 * @param {object} oldData - The old data object.
 * @returns {string[]} An array of changed keys.
 */
const getChangedKeys = (newData, oldData) => {
	if (!oldData) return Object.keys(newData)
	const allKeys = _.union(Object.keys(newData), Object.keys(oldData))

	return allKeys.filter(key => {
		// _.isEqual provides deep comparison for nested objects and arrays
		return !_.isEqual(newData[key], oldData[key])
	})
}

class DraftService {
	static async getAll(filter, pagination = {}) {
		try {
			console.log('DraftService.getAll called with filter:', JSON.stringify(filter, null, 2))

			const semesterMapping = {
				'1年生': ['1', '2'],
				'2年生': ['3', '4'],
				'3年生': ['5', '6'],
				'4年生': ['7', '8', '9'],
			}

			const statusMapping = {
				未確認: 'submitted',
				確認中: 'checking',
				差し戻し: 'resubmission_required',
				要修正: 'resubmission_required',
				確認済: 'approved',
			}

			// New mapping for approval_status filter
			const approvalStatusMapping = {
				未確認: ['submitted'],
				確認中: ['checking'],
				承認済: ['approved'],
				Unconfirmed: ['submitted'],
				'In review': ['checking'],
				Returned: ['resubmission_required', 'disapproved'],
				Approved: ['approved'],
				Tasdiqlanmagan: ['submitted'],
				Tekshirilmoqda: ['checking'],
				Qaytarilgan: ['resubmission_required', 'disapproved'],
				Tasdiqlangan: ['approved'],
				'Не подтверждено': ['submitted'],
				'На проверке': ['checking'],
				Возвращено: ['resubmission_required', 'disapproved'],
				Одобрено: ['approved'],
				未承認: ['draft', 'submitted', 'checking'],
				差し戻し: ['resubmission_required', 'disapproved'],
			}

			// New mapping for visibility filter
			const visibilityMapping = {
				公開: true,
				非公開: false,
			}

			const getSemesterNumbers = term => semesterMapping[term] || []

			if (filter.semester) {
				filter.semester = filter.semester.flatMap(term => getSemesterNumbers(term))
			}

			let query = {}
			let querySearch = {}
			let queryOther = {}
			queryOther[Op.and] = []

			// Helper to build JSONB conditions for it_skills across levels (case-insensitive)
			// Only checks Student.it_skills (public data only)
			const buildItSkillsCondition = (names = [], match = 'any') => {
				const lvls = ['上級', '中級', '初級']
				const safeNames = Array.isArray(names) ? names.filter(Boolean) : []
				if (safeNames.length === 0) return null

				const perSkill = safeNames.map(n => {
					const skillName = String(n).toLowerCase()
					const escapedName = skillName.replace(/'/g, "''") // Escape single quotes for SQL
					// Use jsonb_array_elements to iterate over array elements and compare case-insensitively
					const levelExpr = lvls
						.map(
							l => `(
					"Student"."it_skills" IS NOT NULL 
					AND EXISTS (
						SELECT 1 
						FROM jsonb_array_elements("Student"."it_skills"->'${l}') AS elem
						WHERE LOWER(elem->>'name') = '${escapedName}'
					)
				)`
						)
						.join(' OR ')
					return `(${levelExpr})`
				})
				const joiner = match === 'all' ? ' AND ' : ' OR '
				return `(${perSkill.join(joiner)})`
			}

			// Helper to build conditions for language_skills (TEXT field containing JSON string)
			// Handles both formats:
			// 1. Old seeder format (plain text): "English (TOEIC 800), Korean (TOPIK 4)"
			// 2. Correct format (JSON string): [{"name":"中国語","level":"#ffeb3b","color":"#5627DB"}]
			// Only checks Student.language_skills (public data only)
			const buildLanguageSkillsCondition = (names = [], match = 'any') => {
				const safeNames = Array.isArray(names) ? names.filter(Boolean) : []
				if (safeNames.length === 0) return null

				const perSkill = safeNames.map(n => {
					// Escape the skill name for SQL LIKE pattern matching
					const escapedName = String(n).replace(/[%_\\]/g, '\\$&')
					// Match both formats:
					// 1. Plain text format (old seeder): "Japanese (JLPT N2), English (IELTS 6.5)" - search for language name
					// 2. JSON string format (correct): [{"name":"中国語",...}] - search for JSON pattern with "name" field
					// Only check Student.language_skills (public data), handle NULL values
					return `(
						"Student"."language_skills" IS NOT NULL 
						AND (
							"Student"."language_skills"::text LIKE '%${escapedName}%'
							OR "Student"."language_skills"::text LIKE '%"name":"${escapedName}"%'
							OR "Student"."language_skills"::text LIKE '%"name": "${escapedName}"%'
							OR "Student"."language_skills"::text LIKE '%"name":"${escapedName}",%'
							OR "Student"."language_skills"::text LIKE '%"name": "${escapedName}",%'
						)
					)`
				})
				const joiner = match === 'all' ? ' AND ' : ' OR '
				return `(${perSkill.join(joiner)})`
			}

			// Process visibility filter before the main loop
			if (filter.visibility && Array.isArray(filter.visibility) && filter.visibility.length > 0) {
				const visibilityValues = filter.visibility.map(val => visibilityMapping[val]).filter(val => val !== undefined)
				if (visibilityValues.length) {
					queryOther['visibility'] = { [Op.in]: visibilityValues }
				}
				delete filter.visibility // Remove to avoid double handling
			}

			const searchableColumns = ['email', 'first_name', 'last_name', 'student_id', 'self_introduction', 'hobbies', 'jlpt']
			let statusFilter = ''
			let approvalStatusFilter = '' // New filter for approval_status

			// Process approval_status filter
			if (filter.approval_status && Array.isArray(filter.approval_status) && filter.approval_status.length > 0) {
				const draftStatuses = []
				filter.approval_status.forEach(approvalStatus => {
					if (approvalStatusMapping[approvalStatus]) {
						draftStatuses.push(...approvalStatusMapping[approvalStatus])
					}
				})

				approvalStatusFilter = draftStatuses.length ? `AND d.status IN (${draftStatuses.map(s => `'${s}'`).join(', ')})` : ''

				delete filter.approval_status // Remove to avoid double handling
			}

			// Process reviewerId filter
			let reviewerFilter = ''
			if (filter.reviewerId) {
				reviewerFilter = `AND d.reviewed_by = ${parseInt(filter.reviewerId)}`
				delete filter.reviewerId // Remove to avoid double handling
			}

			Object.keys(filter).forEach(key => {
				if (filter[key] && key !== 'draft_status') {
					if (key === 'search') {
						let searchConditions = searchableColumns.map(column => ({
							[column]: { [Op.iLike]: `%${filter[key]}%` },
						}))

						// Add JSONB search conditions for skills and it_skills using sequelize.where
						searchConditions.push(sequelize.where(sequelize.cast(sequelize.col('Student.skills'), 'TEXT'), { [Op.iLike]: `%${filter[key]}%` }))
						searchConditions.push(sequelize.where(sequelize.cast(sequelize.col('Student.it_skills'), 'TEXT'), { [Op.iLike]: `%${filter[key]}%` }))

						querySearch[Op.or] = searchConditions
					} else if (key === 'it_skills') {
						const values = Array.isArray(filter[key]) ? filter[key] : [filter[key]]
						const match = filter.it_skills_match === 'all' ? 'all' : 'any'
						const expr = buildItSkillsCondition(values, match)
						if (expr) {
							queryOther[Op.and].push(sequelize.literal(expr))
						}
					} else if (key === 'language_skills') {
						const values = Array.isArray(filter[key]) ? filter[key] : [filter[key]]
						const match = filter.language_skills_match === 'all' ? 'all' : 'any'
						const expr = buildLanguageSkillsCondition(values, match)
						if (expr) {
							queryOther[Op.and].push(sequelize.literal(expr))
						}
					} else if (key === 'skills') {
						queryOther[Op.and].push({
							[Op.or]: [
								{
									skills: { '上級::text': { [Op.iLike]: `%${filter[key]}%` } },
								},
								{
									skills: { '中級::text': { [Op.iLike]: `%${filter[key]}%` } },
								},
								{
									skills: { '初級::text': { [Op.iLike]: `%${filter[key]}%` } },
								},
							],
						})
					} else if (key === 'partner_university_credits') {
						queryOther[key] = { [Op.lt]: Number(filter[key]) }
					} else if (key === 'other_information') {
						queryOther[key] = filter[key] === '有り' ? { [Op.ne]: null } : { [Op.is]: null }
					} else if (key === 'jlpt' || key === 'jdu_japanese_certification') {
						// Match only the highest level within stored JSON string
						queryOther[Op.and].push({
							[Op.or]: filter[key].map(level => ({
								[key]: { [Op.iLike]: `%\"highest\":\"${level}\"%` },
							})),
						})
					} else if (key === 'ielts') {
						queryOther[Op.and].push({
							[Op.or]: filter[key].map(level => ({
								[key]: { [Op.iLike]: `%${level}%` },
							})),
						})
					} else if (key === 'it_skills_match') {
						// handled together with it_skills
						return
					} else if (key === 'language_skills_match') {
						// handled together with language_skills
						return
					} else if (Array.isArray(filter[key])) {
						queryOther[key] = { [Op.in]: filter[key] }
					} else if (typeof filter[key] === 'string') {
						queryOther[key] = { [Op.like]: `%${filter[key]}%` }
					} else {
						queryOther[key] = filter[key]
					}
				}

				if (filter[key] && key === 'draft_status') {
					const filteredStatuses = filter[key].map(status => statusMapping[status])
					statusFilter = filteredStatuses.length ? `AND d.status IN (${filteredStatuses.map(s => `'${s}'`).join(', ')})` : ''
				}
			})

			if (!query[Op.and]) {
				query[Op.and] = []
			}

			query[Op.and].push(querySearch, queryOther, { active: true })

			// Combine status filters and reviewer filter
			let combinedStatusFilter = ''
			if (statusFilter && approvalStatusFilter) {
				// If both filters are specified, use OR logic between them
				const statusPart = statusFilter.replace(/^AND /, '')
				const approvalPart = approvalStatusFilter.replace(/^AND /, '')
				combinedStatusFilter = `AND (${statusPart} OR ${approvalPart})`
			} else {
				combinedStatusFilter = statusFilter || approvalStatusFilter
			}

			// Add reviewer filter if present
			const allFilters = [combinedStatusFilter, reviewerFilter].filter(Boolean).join(' ')

			console.log('Final query object:', JSON.stringify(query, null, 2))
			console.log('Combined filters:', allFilters)

			// Pagination parametrlari
			const isPaginated = pagination.limit !== undefined && pagination.offset !== undefined
			const queryOptions = {
				where: query,
				attributes: {
					include: ['credit_details'], // Explicitly include credit_details field
				},
				include: [
					{
						model: Draft,
						as: 'pendingDraft',
						required: true,
						where: {
							status: { [Op.ne]: 'draft' },
							updated_at: {
								[Op.eq]: sequelize.literal(`
                              (SELECT MAX("updated_at") 
                              FROM "Drafts" AS d
                              WHERE d.student_id = "Student".student_id
                              AND d.version_type = 'pending'
                              AND d.status != 'draft' ${allFilters})
                          `),
							},
						},
						include: [
							{
								model: Staff,
								as: 'reviewer',
								attributes: ['id', 'first_name', 'last_name', 'email'],
								required: false, // Left join - not all drafts have reviewers
							},
						],
					},
				],
				...(isPaginated && { limit: pagination.limit, offset: pagination.offset }),
				distinct: true, // For accurate count with JOINs
			}

			// Pagination bo'lsa findAndCountAll, aks holda findAll
			if (isPaginated) {
				const { count, rows: students } = await Student.findAndCountAll(queryOptions)

				// Map pendingDraft to draft for backward compatibility with frontend
				const mappedStudents = students.map(student => {
					const studentJson = student.toJSON()
					return {
						...studentJson,
						draft: studentJson.pendingDraft,
						pendingDraft: undefined,
					}
				})
				return { students: mappedStudents, total: count }
			} else {
				const students = await Student.findAll(queryOptions)

				// Map pendingDraft to draft for backward compatibility with frontend
				return students.map(student => {
					const studentJson = student.toJSON()
					return {
						...studentJson,
						draft: studentJson.pendingDraft,
						pendingDraft: undefined,
					}
				})
			}
		} catch (error) {
			console.error('DraftService.getAll error:', error)
			console.error('Error message:', error.message)
			console.error('SQL:', error.sql)
			throw error
		}
	}
	/**
	 * Creates a new draft or updates an existing one (upsert).
	 * This is the primary method for student edits.
	 * Always targets the 'draft' version_type.
	 */
	static async upsertDraft(studentId, newProfileData) {
		let draft = await Draft.findOne({
			where: {
				student_id: studentId,
				version_type: 'draft',
			},
		})

		if (draft) {
			const oldProfileData = draft.profile_data || {}
			const changedKeys = getChangedKeys(newProfileData, oldProfileData)
			draft.profile_data = newProfileData
			draft.changed_fields = _.union(draft.changed_fields || [], changedKeys)

			if (['submitted', 'approved', 'resubmission_required', 'disapproved'].includes(draft.status)) {
				draft.status = 'draft'
			}

			await draft.save()
			return { draft, created: false }
		} else {
			// If draft does not exist, create a new one
			const changedKeys = Object.keys(newProfileData) // All fields are considered new
			draft = await Draft.create({
				student_id: studentId,
				version_type: 'draft',
				profile_data: newProfileData,
				changed_fields: changedKeys,
				status: 'draft',
			})
			return { draft, created: true }
		}
	}

	/**
	 * Creates or updates a pending draft when staff members edit a student's profile under review.
	 * This is used when staff/admin edit a student's pending draft.
	 * Always targets the 'pending' version_type.
	 */
	static async upsertPendingDraft(studentId, newProfileData) {
		let pendingDraft = await Draft.findOne({
			where: {
				student_id: studentId,
				version_type: 'pending',
			},
		})

		// Check if student profile is already public (has been approved before)
		const student = await Student.findOne({
			where: { student_id: studentId },
			attributes: ['visibility'],
		})
		const isAlreadyPublic = student && student.visibility === true

		// Check if there's a fresh student submission pending review
		// If status is 'submitted' or 'checking', it means student submitted recently
		const hasFreshStudentSubmission = pendingDraft && ['submitted', 'checking'].includes(pendingDraft.status)

		// Only auto-approve if profile is public AND there's NO fresh student submission
		const shouldAutoApprove = isAlreadyPublic && !hasFreshStudentSubmission

		if (pendingDraft) {
			const oldProfileData = pendingDraft.profile_data || {}
			const changedKeys = getChangedKeys(newProfileData, oldProfileData)
			pendingDraft.profile_data = newProfileData
			pendingDraft.changed_fields = _.union(pendingDraft.changed_fields || [], changedKeys)

			await pendingDraft.save()

			// If profile is public and no fresh student submission, auto-update live
			if (shouldAutoApprove) {
				// Serialize fields that are TEXT in Student table but stored as objects in Draft
				const sanitizedProfileData = { ...newProfileData }
				const textFields = ['jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'ielts', 'language_skills']
				textFields.forEach(field => {
					if (sanitizedProfileData[field] && typeof sanitizedProfileData[field] === 'object') {
						sanitizedProfileData[field] = JSON.stringify(sanitizedProfileData[field])
					}
				})

				await Student.update(sanitizedProfileData, {
					where: { student_id: studentId },
				})
			}

			return { draft: pendingDraft, created: false }
		} else {
			// If pending draft does not exist, create a new one
			const changedKeys = Object.keys(newProfileData) // All fields are considered new
			pendingDraft = await Draft.create({
				student_id: studentId,
				version_type: 'pending',
				profile_data: newProfileData,
				changed_fields: changedKeys,
				status: 'checking', // Staff is already reviewing
				submit_count: 1,
			})

			// Auto-approve only if no fresh submission exists
			if (shouldAutoApprove) {
				// Serialize fields that are TEXT in Student table but stored as objects in Draft
				const sanitizedProfileData = { ...newProfileData }
				const textFields = ['jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'ielts', 'language_skills']
				textFields.forEach(field => {
					if (sanitizedProfileData[field] && typeof sanitizedProfileData[field] === 'object') {
						sanitizedProfileData[field] = JSON.stringify(sanitizedProfileData[field])
					}
				})

				await Student.update(sanitizedProfileData, {
					where: { student_id: studentId },
				})
			}

			return { draft: pendingDraft, created: true }
		}
	}

	/**
	 * Submits a draft for review.
	 * Clones the Draft version to Pending version.
	 */
	static async submitForReview(draftId) {
		const draft = await Draft.findByPk(draftId)
		if (!draft) {
			throw new Error('Qoralama topilmadi.')
		}

		if (draft.version_type !== 'draft') {
			throw new Error('Faqat draft versiyasini yuborish mumkin.')
		}

		// Check if there's already a pending version under review
		const existingPending = await Draft.findOne({
			where: {
				student_id: draft.student_id,
				version_type: 'pending',
				status: 'submitted',
			},
		})

		if (existingPending) {
			throw new Error('既に提出済みの下書きがあります。新しい下書きを提出する前に、前回の審査結果をお待ちください。')
		}

		// Server-side validation: ensure all required QA answers are filled
		try {
			const settingsRaw = await SettingsService.getSetting('studentQA')
			if (settingsRaw) {
				let settings
				try {
					settings = JSON.parse(settingsRaw)
				} catch {
					settings = null
				}
				if (settings && typeof settings === 'object') {
					// Prefer answers from current draft.profile_data.qa if present
					const profileQA = (draft.profile_data && draft.profile_data.qa) || null

					console.log('=== BACKEND Q&A VALIDATION DEBUG ===')
					console.log('Settings from database:', JSON.stringify(settings, null, 2))
					console.log('Draft profile_data.qa:', JSON.stringify(profileQA, null, 2))

					let answersByCategory = {}
					if (profileQA && typeof profileQA === 'object') {
						answersByCategory = profileQA
					} else {
						// Fallback to persisted QA rows
						const student = await Student.findOne({
							where: { student_id: draft.student_id },
						})
						if (student) {
							const qaRows = await QAService.findQAByStudentId(student.id)
							for (const row of qaRows) {
								answersByCategory[row.category] = row.qa_list || {}
							}
						}
					}

					const missing = []
					for (const category of Object.keys(settings)) {
						if (category === 'idList') continue
						const questions = settings[category] || {}
						const answers = answersByCategory[category] || {}

						console.log(`Checking category: ${category}`)
						console.log(`Questions in settings:`, Object.keys(questions))
						console.log(`Answers from draft:`, JSON.stringify(answers, null, 2))

						for (const key of Object.keys(questions)) {
							const q = questions[key]
							if (q && q.required === true) {
								// Accept legacy answer shapes: object { answer } or plain string
								const raw = answers[key]
								const ans = raw && typeof raw === 'object' && raw !== null && 'answer' in raw ? raw.answer : raw

								console.log(`Question ${key}: required=${q.required}, answer="${ans}"`)

								if (!ans || String(ans).trim() === '') {
									console.log(`  → MISSING!`)
									missing.push({ category, key, question: q.question || key })
								}
							}
						}
					}

					console.log('Missing required answers:', missing)
					console.log('=== END BACKEND DEBUG ===')

					if (missing.length > 0) {
						// Group missing questions by category for better error message
						const missingByCategory = {}
						missing.forEach(item => {
							if (!missingByCategory[item.category]) {
								missingByCategory[item.category] = []
							}
							missingByCategory[item.category].push(item.question)
						})

						// Build user-friendly error message in Japanese
						const categoryList = Object.keys(missingByCategory)
							.map(cat => `「${cat}」`)
							.join('、')
						const errorMsg = `必須の質問に回答してください。\n未回答のカテゴリ: ${categoryList}\n(未回答: ${missing.length}件)`

						throw new Error(errorMsg)
					}
				}
			}
		} catch (e) {
			throw e
		}

		// Create or update pending version
		let pendingDraft = await Draft.findOne({
			where: {
				student_id: draft.student_id,
				version_type: 'pending',
			},
		})

		if (pendingDraft) {
			// Update existing pending draft
			pendingDraft.profile_data = draft.profile_data
			pendingDraft.changed_fields = draft.changed_fields
			pendingDraft.status = 'submitted'
			pendingDraft.submit_count += 1
			pendingDraft.comments = null
			pendingDraft.reviewed_by = null
			await pendingDraft.save()
		} else {
			// Create new pending draft
			pendingDraft = await Draft.create({
				student_id: draft.student_id,
				version_type: 'pending',
				profile_data: draft.profile_data,
				changed_fields: draft.changed_fields,
				status: 'submitted',
				submit_count: 1,
			})
		}

		// Don't change visibility on submit - let profile remain as is
		return pendingDraft
	}
	/**
	 * Updates the status of a pending draft by a staff member.
	 * On approval, promotes Pending → Live and creates a fresh Draft from Live.
	 * Clears the changed_fields array upon review completion.
	 */
	static async updateStatusByStaff(draftId, status, comments, reviewedBy) {
		const draft = await Draft.findByPk(draftId)
		if (!draft) {
			throw new Error('Qoralama topilmadi.')
		}

		// Staff should only update pending versions
		if (draft.version_type !== 'pending') {
			throw new Error('Staff can only review pending versions.')
		}

		draft.status = status
		draft.comments = comments
		draft.reviewed_by = reviewedBy

		// When a review cycle is complete, clear the list of changes
		if (['approved', 'resubmission_required', 'disapproved'].includes(status)) {
			draft.changed_fields = []
		}

		await draft.save()

		// On approval, promote pending to live
		if (status.toLowerCase() === 'approved') {
			// Serialize fields that are TEXT in Student table but stored as objects in Draft
			const sanitizedProfileData = { ...draft.profile_data }
			const textFields = ['jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'ielts', 'language_skills']
			textFields.forEach(field => {
				if (sanitizedProfileData[field] && typeof sanitizedProfileData[field] === 'object') {
					sanitizedProfileData[field] = JSON.stringify(sanitizedProfileData[field])
				}
			})

			// Update live profile (Student table)
			await Student.update(sanitizedProfileData, {
				where: { student_id: draft.student_id },
			})

			// Do NOT touch the draft version - let students continue editing independently
		}

		return draft
	}

	static async getById(id) {
		return Draft.findByPk(id)
	}

	static async getStudentWithDraft(studentId) {
		const student = await Student.findOne({
			where: { student_id: studentId },
			attributes: {
				exclude: ['password', 'createdAt', 'updatedAt'],
			},
			include: [
				{
					model: Draft,
					as: 'drafts',
					required: false,
				},
			],
		})

		if (!student) {
			return null
		}

		// Separate drafts by version_type for easier frontend consumption
		const studentData = student.toJSON()
		const draftVersion = studentData.drafts?.find(d => d.version_type === 'draft') || null
		const pendingVersion = studentData.drafts?.find(d => d.version_type === 'pending') || null

		return {
			...studentData,
			draft: draftVersion,
			pendingDraft: pendingVersion,
			drafts: undefined, // Remove the raw drafts array
		}
	}

	static async delete(id) {
		const draft = await Draft.findByPk(id)
		if (!draft) {
			throw new Error('Qoralama topilmadi')
		}
		await draft.destroy()
		return draft
	}
}

module.exports = DraftService
