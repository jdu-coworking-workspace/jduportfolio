// services/studentService.js
const { Op } = require('sequelize')
const bcrypt = require('bcrypt')
const generatePassword = require('generate-password')
const { Student, Draft, Bookmark, sequelize } = require('../models')
const DraftService = require('./draftService')
const kintoneCreditDetailsService = require('./kintoneCreditDetailsService')

const { formatStudentWelcomeEmail } = require('../utils/emailToStudent')
const { sendBulkEmails } = require('../utils/emailService')

class StudentService {
	// Service method to create a new student
	static async createStudent(studentData) {
		try {
			const newStudent = await Student.create(studentData)
			return newStudent
		} catch (error) {
			throw error
		}
	}

	// static async getAllStudents(filter, recruiterId, onlyBookmarked, userType) {
	// 	try {
	// 		// console.log('Received filter:', filter);

	// 		const semesterMapping = {
	// 			'1年生': ['1', '2'],
	// 			'2年生': ['3', '4'],
	// 			'3年生': ['5', '6'],
	// 			'4年生': ['7', '8', '9'],
	// 		}
	// 		const getSemesterNumbers = term => semesterMapping[term] || []
	// 		if (filter && filter.semester) {
	// 			filter.semester = filter.semester.flatMap(term =>
	// 				getSemesterNumbers(term)
	// 			)
	// 		}

	// 		let query = {}
	// 		let querySearch = {}
	// 		let queryOther = {}
	// 		queryOther[Op.and] = []

	// 		const searchableColumns = [
	// 			'email',
	// 			'first_name',
	// 			'last_name',
	// 			'self_introduction',
	// 			'hobbies',
	// 			'skills',
	// 			'it_skills',
	// 			'jlpt',
	// 			'student_id',
	// 		]

	// 		if (!filter || typeof filter !== 'object') {
	// 			filter = {}
	// 		}

	// 		Object.keys(filter).forEach(key => {
	// 			if (filter[key]) {
	// 				// console.log(`Processing key: ${key}, value: ${filter[key]}`);
	// 				if (key === 'search') {
	// 					const searchValue = String(filter[key])
	// 					// console.log('Search value:', searchValue);
	// 					querySearch[Op.or] = searchableColumns.map(column => {
	// 						// console.log(`Building condition for column: ${column}`);
	// 						if (['skills', 'it_skills'].includes(column)) {
	// 							return {
	// 								[Op.or]: [
	// 									{
	// 										[column]: {
	// 											'上級::text': { [Op.iLike]: `%${searchValue}%` },
	// 										},
	// 									},
	// 									{
	// 										[column]: {
	// 											'中級::text': { [Op.iLike]: `%${searchValue}%` },
	// 										},
	// 									},
	// 									{
	// 										[column]: {
	// 											'初級::text': { [Op.iLike]: `%${searchValue}%` },
	// 										},
	// 									},
	// 								],
	// 							}
	// 						} else if (column === 'student_id') {
	// 							return { [column]: { [Op.iLike]: `%${searchValue}%` } } // Student ID uchun qisman moslik
	// 						} else {
	// 							return { [column]: { [Op.iLike]: `%${searchValue}%` } }
	// 						}
	// 					})
	// 				} else if (key === 'skills' || key === 'it_skills') {
	// 					queryOther[Op.and].push({
	// 						[Op.or]: [
	// 							{ [key]: { '上級::text': { [Op.iLike]: `%${filter[key]}%` } } },
	// 							{ [key]: { '中級::text': { [Op.iLike]: `%${filter[key]}%` } } },
	// 							{ [key]: { '初級::text': { [Op.iLike]: `%${filter[key]}%` } } },
	// 						],
	// 					})
	// 				} else if (key === 'partner_university_credits') {
	// 					const credits = Number(filter[key])
	// 					if (!isNaN(credits)) {
	// 						queryOther[key] = { [Op.lt]: credits }
	// 					}
	// 				} else if (key === 'other_information') {
	// 					if (filter[key] === '有り') {
	// 						queryOther['other_information'] = { [Op.ne]: null }
	// 					} else if (filter[key] === '無し') {
	// 						queryOther['other_information'] = { [Op.is]: null }
	// 					}
	// 				} else if (
	// 					key === 'jlpt' ||
	// 					key === 'ielts' ||
	// 					key === 'jdu_japanese_certification'
	// 				) {
	// 					if (Array.isArray(filter[key])) {
	// 						queryOther[Op.and].push({
	// 							[Op.or]: filter[key].map(level => ({
	// 								[key]: { [Op.iLike]: `%${level}"%` },
	// 							})),
	// 						})
	// 					}
	// 				} else if (Array.isArray(filter[key])) {
	// 					queryOther[key] = { [Op.in]: filter[key] }
	// 				} else if (typeof filter[key] === 'string') {
	// 					queryOther[key] = { [Op.iLike]: `%${filter[key]}%` }
	// 				} else {
	// 					queryOther[key] = filter[key]
	// 				}
	// 			}
	// 		})

	// 		if (!query[Op.and]) {
	// 			query[Op.and] = []
	// 		}

	// 		query[Op.and].push(querySearch, queryOther, { active: true })

	// 		// Only apply visibility filter for Recruiter users
	// 		if (userType === 'Recruiter') {
	// 			query[Op.and].push({ visibility: true })
	// 		}

	// 		// Only apply bookmark filter if both conditions are met
	// 		if (onlyBookmarked === 'true' && recruiterId) {
	// 			query[Op.and].push(
	// 				sequelize.literal(`EXISTS (
	// 			SELECT 1
	// 			FROM "Bookmarks" AS "Bookmark"
	// 			WHERE "Bookmark"."studentId" = "Student"."id"
	// 			  AND "Bookmark"."recruiterId" = ${sequelize.escape(recruiterId)}
	// 		  )`)
	// 			)
	// 		}

	// 		// Build attributes for the query
	// 		const attributes = {
	// 			include: [],
	// 		}

	// 		// Only include bookmark status if recruiterId is provided
	// 		if (recruiterId) {
	// 			attributes.include.push([
	// 				sequelize.literal(`EXISTS (
	// 					SELECT 1
	// 					FROM "Bookmarks" AS "Bookmark"
	// 					WHERE "Bookmark"."studentId" = "Student"."id"
	// 					  AND "Bookmark"."recruiterId" = ${sequelize.escape(recruiterId)}
	// 				  )`),
	// 				'isBookmarked',
	// 			])
	// 		}

	// 		// console.log('Generated Query:', JSON.stringify(query, null, 2));
	// 		const students = await Student.findAll({
	// 			where: query,
	// 			attributes: attributes,
	// 			include: [
	// 				{
	// 					model: Draft,
	// 					as: 'draft',
	// 					attributes: [
	// 						'id',
	// 						'status',
	// 						'submit_count',
	// 						'created_at',
	// 						'updated_at',
	// 						'profile_data', // Include profile_data to get draft information
	// 					],
	// 					required: false, // LEFT JOIN so students without drafts are still included
	// 				},
	// 			],
	// 		})

	// 		// Merge draft data with student data if draft exists and is NOT in 'draft' status
	// 		const studentsWithDraftData = students.map(student => {
	// 			const studentJson = student.toJSON()

	// 			// Only merge draft data if it exists and status is NOT 'draft'
	// 			// Draft status data should only be visible to the student themselves
	// 			if (
	// 				studentJson.draft &&
	// 				studentJson.draft.profile_data &&
	// 				studentJson.draft.status !== 'draft'
	// 			) {
	// 				const draftData = studentJson.draft.profile_data

	// 				// Merge draft fields into the main student object
	// 				const fieldsToMerge = [
	// 					'deliverables',
	// 					'gallery',
	// 					'self_introduction',
	// 					'hobbies',
	// 					'hobbies_description',
	// 					'special_skills_description',
	// 					'other_information',
	// 					'it_skills',
	// 					'skills',
	// 				]

	// 				fieldsToMerge.forEach(field => {
	// 					if (draftData[field] !== undefined) {
	// 						studentJson[field] = draftData[field]
	// 					}
	// 				})
	// 			}

	// 			return studentJson
	// 		})

	// 		return studentsWithDraftData
	// 	} catch (error) {
	// 		console.error('Error in getAllStudents:', error.message, error.stack)
	// 		// Return empty array instead of throwing to prevent 500 errors
	// 		return []
	// 	}
	// }

	static async getAllStudents(filter, recruiterId, onlyBookmarked, userType, sortOptions = {}, pagination = {}) {
		try {
			const normalizedUserType = (userType || '').toLowerCase()

			// Pagination parametrlari
			const { page, limit, offset } = pagination
			const isPaginated = page !== undefined && limit !== undefined
			// 1. FILTRLASH MANTIG'I (o'zgarishsiz qoladi)
			const semesterMapping = {
				'1年生': ['1', '2'],
				'2年生': ['3', '4'],
				'3年生': ['5', '6'],
				'4年生': ['7', '8', '9'],
			}
			if (filter && filter.semester) {
				filter.semester = filter.semester.flatMap(term => semesterMapping[term] || [])
			}

			let query = {}
			let querySearch = {}
			let queryOther = { [Op.and]: [] }

			if (!filter || typeof filter !== 'object') {
				filter = {}
			}

			const searchableColumns = ['email', 'first_name', 'last_name', 'skills', 'it_skills', 'jlpt', 'student_id', 'partner_university']

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

			Object.keys(filter).forEach(key => {
				if (key === 'search') {
					// Handle search separately - process even if empty string to allow clearing search
					const searchValue = filter[key] ? String(filter[key]).trim() : ''

					// Only process if search value is not empty
					if (searchValue) {
						// If search value is purely numeric, only search student_id with prefix match
						// This prevents "66" from matching "21" in other columns
						if (/^\d+$/.test(searchValue)) {
							querySearch[Op.or] = [{ student_id: { [Op.iLike]: `${searchValue}%` } }]
						}
						// If search value looks like a JLPT level (N1-N5), only search jlpt field with exact matching
						// This prevents "N1" from matching "N3" or appearing in other columns
						else if (/^N[1-5]$/i.test(searchValue)) {
							const normalizedSearch = searchValue.toUpperCase()
							querySearch[Op.or] = [
								{
									jlpt: {
										[Op.or]: [
											// Match "highest":"N1" (exact, with quotes)
											{ [Op.iLike]: `%"highest":"${normalizedSearch}"%` },
											// Match "highest":"N1", (with comma after)
											{ [Op.iLike]: `%"highest":"${normalizedSearch}",%` },
											// Match "highest":"N1"} (with closing brace)
											{ [Op.iLike]: `%"highest":"${normalizedSearch}"}%` },
										],
									},
								},
							]
						}
						// For all other text searches, search only in name fields and student_id
						// This prevents unexpected matches from email, skills, partner_university, etc.
						// Example: "Ja" should match "Janiya", "Jacobson" but NOT match emails like "@japan.edu"
						else {
							querySearch[Op.or] = [
								// Search in first_name (substring match)
								{ first_name: { [Op.iLike]: `%${searchValue}%` } },
								// Search in last_name (substring match)
								{ last_name: { [Op.iLike]: `%${searchValue}%` } },
								// Search in student_id (prefix match)
								{ student_id: { [Op.iLike]: `${searchValue}%` } },
							]
						}
					}
					// Continue to next key after processing search
					return
				}

				// Skip empty values for other filter keys: empty strings, empty arrays, null, undefined
				// Arrays are truthy even when empty, so check length explicitly
				if (filter[key] && !(Array.isArray(filter[key]) && filter[key].length === 0) && filter[key] !== '') {
					if (key === 'it_skills') {
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
					} else if (key === 'it_skills_match') {
						// handled together with it_skills
						return
					} else if (key === 'language_skills_match') {
						// handled together with language_skills
						return
					} else if (key === 'partner_university_credits') {
						const credits = Number(filter[key])
						if (!isNaN(credits)) {
							queryOther[key] = { [Op.lt]: credits }
						}
					} else if (key === 'other_information') {
						if (filter[key] === '有り') {
							queryOther['other_information'] = { [Op.ne]: null }
						} else if (filter[key] === '無し') {
							queryOther['other_information'] = { [Op.is]: null }
						}
					} else if (['jlpt', 'jdu_japanese_certification'].includes(key)) {
						if (Array.isArray(filter[key])) {
							// Separate "未提出" (not submitted) from level filters
							const hasNotSubmitted = filter[key].includes('未提出')
							const levels = filter[key].filter(level => level !== '未提出')

							const conditions = []

							// Add level conditions if any levels are selected
							if (levels.length > 0) {
								conditions.push({
									[Op.or]: levels.map(level => ({
										[Op.or]: [
											// Match "highest":"N2" (exact)
											{ [key]: { [Op.iLike]: `%"highest":"${level}"%` } },
											// Match "highest":"N2", (with comma)
											{ [key]: { [Op.iLike]: `%"highest":"${level}",%` } },
											// Match "highest":"N2"} (with closing brace)
											{ [key]: { [Op.iLike]: `%"highest":"${level}"}%` } },
										],
									})),
								})
							}

							// Add "未提出" condition (null, empty, or string "null")
							if (hasNotSubmitted) {
								conditions.push({
									[Op.or]: [
										{ [key]: { [Op.is]: null } }, // SQL NULL
										{ [key]: { [Op.eq]: '' } }, // Empty string
										{ [key]: { [Op.eq]: 'null' } }, // String "null" from JSON.stringify(null)
									],
								})
							}

							if (conditions.length > 0) {
								queryOther[Op.and].push({
									[Op.or]: conditions,
								})
							}
						}
					} else if (key === 'ielts') {
						if (Array.isArray(filter[key]) && filter[key].length > 0) {
							queryOther[Op.and].push({
								[Op.or]: filter[key].map(level => ({
									[key]: { [Op.iLike]: `%${level}%` },
								})),
							})
						}
					} else if (key === 'graduation_year') {
						// Handle graduation year filter - match dates by year and month
						// Filter options are in format "YYYY-MM-30", but database may have different days
						// So we match by year and month (YYYY-MM) only
						if (Array.isArray(filter[key]) && filter[key].length > 0) {
							queryOther[Op.and].push({
								[Op.or]: filter[key].map(yearValue => {
									// Extract year and month from filter value (e.g., "2026-03-30" -> "2026-03")
									const yearMonth = yearValue.substring(0, 7) // Get "YYYY-MM" part
									return {
										graduation_year: { [Op.iLike]: `${yearMonth}%` },
									}
								}),
							})
						}
					} else if (Array.isArray(filter[key]) && filter[key].length > 0) {
						queryOther[key] = { [Op.in]: filter[key] }
					} else if (typeof filter[key] === 'string') {
						queryOther[key] = { [Op.iLike]: `%${filter[key]}%` }
					} else {
						queryOther[key] = filter[key]
					}
				}
			})

			// Build query conditions - only include querySearch and queryOther if they have actual conditions
			query[Op.and] = [{ active: true }]

			// Only add querySearch if it has conditions
			// querySearch uses Op.or (a Symbol), so we check for it directly
			// Object.keys() doesn't return Symbol keys, so we must check Op.or explicitly
			if (querySearch[Op.or] && querySearch[Op.or].length > 0) {
				query[Op.and].push(querySearch)
			}

			// Check if queryOther has any conditions
			// queryOther can have:
			// 1. Direct properties (e.g., queryOther.partner_university = { [Op.in]: [...] })
			// 2. Items in queryOther[Op.and] array (e.g., queryOther[Op.and].push(...))
			// Note: Op.and is a Symbol, so it won't appear in Object.keys()
			const hasQueryOtherConditions =
				(queryOther[Op.and] && queryOther[Op.and].length > 0) || // Has items in Op.and array
				Object.keys(queryOther).length > 0 // Has direct properties (Symbol keys not included in Object.keys)

			if (hasQueryOtherConditions) {
				query[Op.and].push(queryOther)
			}

			if (normalizedUserType === 'recruiter') {
				query[Op.and].push({ visibility: true })
			}
			if (onlyBookmarked === 'true' && recruiterId) {
				query[Op.and].push(sequelize.literal(`EXISTS (SELECT 1 FROM "Bookmarks" AS "Bookmark" WHERE "Bookmark"."studentId" = "Student"."id" AND "Bookmark"."recruiterId" = ${sequelize.escape(recruiterId)})`))
			}

			// 2. SARALASH MANTIG'I (YANGI QISM)
			let order = []
			const { sortBy, sortOrder } = sortOptions
			const validSortOrder = sortOrder && ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'ASC'

			// Frontend'dan kelgan nomni DB'dagi ustun nomiga o'girish (xavfsizlik uchun)
			const columnMap = {
				name: ['first_name', 'last_name'], // Ism bo'yicha saralash uchun ikkita ustun
				student_id: ['student_id'],
				graduation_year: ['graduation_year'],
				age: ['date_of_birth'],
				email: ['email'],
			}

			const dbColumns = columnMap[sortBy]

			if (dbColumns) {
				if (sortBy === 'age') {
					// Yosh bo'yicha o'sish tartibi -> tug'ilgan sana bo'yicha kamayish tartibi
					const ageSortOrder = validSortOrder === 'ASC' ? 'DESC' : 'ASC'
					order.push([dbColumns[0], ageSortOrder])
				} else {
					dbColumns.forEach(column => order.push([column, validSortOrder]))
				}
			} else {
				order.push(['student_id', 'ASC']) // Standart saralash
			}

			// 3. MA'LUMOTLARNI OLISH (order parametri qo'shildi)
			const attributes = {}
			if (recruiterId) {
				attributes.include = [[sequelize.literal(`EXISTS (SELECT 1 FROM "Bookmarks" AS "Bookmark" WHERE "Bookmark"."studentId" = "Student"."id" AND "Bookmark"."recruiterId" = ${sequelize.escape(recruiterId)})`), 'isBookmarked']]
			}

			// Pagination uchun findAndCountAll, aks holda findAll
			let students
			let totalCount = 0

			if (isPaginated) {
				const result = await Student.findAndCountAll({
					where: query,
					attributes,
					include: [
						{
							model: Draft,
							as: 'draft',
							attributes: ['id', 'status', 'profile_data'],
							required: false,
						},
					],
					order: order,
					limit: limit,
					offset: offset,
					distinct: true, // JOIN bilan to'g'ri hisoblash uchun
				})
				students = result.rows
				totalCount = result.count
			} else {
				students = await Student.findAll({
					where: query,
					attributes,
					include: [
						{
							model: Draft,
							as: 'draft',
							attributes: ['id', 'status', 'profile_data'],
							required: false,
						},
					],
					order: order,
				})
			}

			// 4. DRAFT MA'LUMOTLARINI BIRLASHTIRISH (o'zgarishsiz qoladi)
			const studentsWithDraftData = students.map(student => {
				const studentJson = student.toJSON()
				if (studentJson.draft && studentJson.draft.profile_data && studentJson.draft.status !== 'draft') {
					const draftData = studentJson.draft.profile_data
					const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'hobbies_description', 'special_skills_description', 'other_information', 'it_skills', 'skills', 'language_skills', 'education', 'work_experience', 'licenses', 'additional_info', 'address_furigana', 'postal_code', 'arubaito']
					fieldsToMerge.forEach(field => {
						if (draftData[field] !== undefined) {
							studentJson[field] = draftData[field]
						}
					})
				}
				return studentJson
			})

			// Pagination bo'lsa, object qaytarish; aks holda eski format (array)
			if (isPaginated) {
				return {
					students: studentsWithDraftData,
					total: totalCount,
				}
			}

			return studentsWithDraftData
		} catch (error) {
			console.error('Error in getAllStudents:', error.message, error.stack)
			// Pagination bo'lsa, object qaytarish; aks holda eski format (array)
			if (pagination.page !== undefined && pagination.limit !== undefined) {
				return { students: [], total: 0 }
			}
			return []
		}
	}

	// Service method to retrieve a student by ID
	static async getStudentById(studentId, password = false, requesterId = null, requesterRole = null) {
		try {
			let excluded = ['createdAt', 'updatedAt']
			if (!password) {
				excluded.push('password')
			}
			const student = await Student.findByPk(studentId, {
				attributes: { exclude: excluded },
				include: [
					{
						model: Draft,
						as: 'draft',
						attributes: ['id', 'status', 'submit_count', 'created_at', 'updated_at', 'profile_data', 'version_type'],
						required: false, // LEFT JOIN so students without drafts are still included
					},
					{
						model: Draft,
						as: 'pendingDraft',
						attributes: ['id', 'status', 'submit_count', 'created_at', 'updated_at', 'profile_data', 'version_type', 'comments', 'reviewed_by'],
						required: false, // LEFT JOIN so students without pending drafts are still included
					},
				],
			})
			if (!student) {
				throw new Error('Student not found')
			}

			// Convert to JSON
			const studentJson = student.toJSON()

			// Determine which draft data should be merged based on role and status
			let shouldMergeDraft = false
			let draftToMerge = null

			// For Staff/Admin viewing: use pending draft if available and submitted for review
			if ((requesterRole === 'Staff' || requesterRole === 'Admin') && studentJson.pendingDraft && studentJson.pendingDraft.profile_data) {
				if (['submitted', 'approved', 'disapproved', 'resubmission_required'].includes(studentJson.pendingDraft.status)) {
					shouldMergeDraft = true
					draftToMerge = studentJson.pendingDraft
					// Keep both draft and pendingDraft in response for staff
				}
			}
			// For Student viewing their own profile: use draft version
			else if (requesterRole === 'Student' && requesterId && student.id === requesterId && studentJson.draft && studentJson.draft.profile_data) {
				shouldMergeDraft = true
				draftToMerge = studentJson.draft
			}
			// For Recruiter viewing: use pending draft if approved (published profile)
			else if (requesterRole === 'Recruiter' && studentJson.pendingDraft && studentJson.pendingDraft.profile_data) {
				if (studentJson.pendingDraft.status === 'approved') {
					shouldMergeDraft = true
					draftToMerge = studentJson.pendingDraft
				}
			}

			// Merge draft data if conditions are met
			if (shouldMergeDraft && draftToMerge) {
				const draftData = draftToMerge.profile_data

				// Merge draft fields into the main student object
				const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'other_information', 'it_skills', 'skills', 'education', 'work_experience', 'licenses', 'additional_info', 'address_furigana', 'postal_code', 'arubaito']

				fieldsToMerge.forEach(field => {
					if (draftData[field] !== undefined) {
						studentJson[field] = draftData[field]
					}
				})
			}

			return studentJson
		} catch (error) {
			throw error
		}
	}

	// Service method to retrieve a student by student_id
	static async getStudentByStudentId(studentId, password = false, requesterId = null, requesterRole = null) {
		try {
			let excluded = ['createdAt', 'updatedAt']
			if (!password) {
				excluded.push('password')
			}

			const student = await Student.findOne({
				where: { student_id: studentId }, // Search by student_id instead of id
				attributes: { exclude: excluded },
				include: [
					{
						model: Draft,
						as: 'draft',
						attributes: ['id', 'status', 'submit_count', 'created_at', 'updated_at', 'profile_data', 'version_type'],
						required: false, // LEFT JOIN so students without drafts are still included
					},
					{
						model: Draft,
						as: 'pendingDraft',
						attributes: ['id', 'status', 'submit_count', 'created_at', 'updated_at', 'profile_data', 'version_type', 'comments', 'reviewed_by'],
						required: false, // LEFT JOIN so students without pending drafts are still included
					},
				],
			})

			if (!student) {
				throw new Error('Student not found')
			}

			const normalizedRole = (requesterRole || '').toLowerCase()
			if (normalizedRole === 'recruiter' && student.visibility !== true) {
				throw new Error('Student not found')
			}

			// Convert to JSON
			const studentJson = student.toJSON()

			// Determine which draft data should be merged based on role and status
			let shouldMergeDraft = false
			let draftToMerge = null

			// For Staff/Admin viewing: use pending draft if available and submitted for review
			if ((normalizedRole === 'staff' || normalizedRole === 'admin') && studentJson.pendingDraft && studentJson.pendingDraft.profile_data) {
				if (['submitted', 'approved', 'disapproved', 'resubmission_required'].includes(studentJson.pendingDraft.status)) {
					shouldMergeDraft = true
					draftToMerge = studentJson.pendingDraft
					// Keep both draft and pendingDraft in response for staff
				}
			}
			// For Student viewing their own profile: use draft version
			else if (normalizedRole === 'student' && requesterId && student.id === requesterId && studentJson.draft && studentJson.draft.profile_data) {
				shouldMergeDraft = true
				draftToMerge = studentJson.draft
			}

			// Merge draft data if conditions are met
			if (shouldMergeDraft && draftToMerge) {
				const draftData = draftToMerge.profile_data

				// Merge draft fields into the main student object
				const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'other_information', 'it_skills', 'skills', 'education', 'work_experience', 'licenses', 'additional_info', 'address_furigana', 'postal_code', 'arubaito']

				fieldsToMerge.forEach(field => {
					if (draftData[field] !== undefined) {
						studentJson[field] = draftData[field]
					}
				})
			}

			return studentJson
		} catch (error) {
			throw error
		}
	}

	static async updateStudent(studentId, studentData) {
		try {
			console.log('StudentService.updateStudent called with:', {
				studentId,
				studentData,
			})

			// Always use student_id for lookup to be consistent with getStudentByStudentId
			const student = await Student.findOne({
				where: { student_id: studentId },
			})

			if (!student) {
				throw new Error('Student not found')
			}

			console.log('Found student:', student.dataValues)

			// If we're setting visibility to true, ensure we have the latest approved draft
			if (studentData.visibility === true) {
				// Check if we already have draft data in the request
				const hasDraftData = studentData.hasOwnProperty('self_introduction') || studentData.hasOwnProperty('hobbies') || studentData.hasOwnProperty('skills') || studentData.hasOwnProperty('it_skills')

				console.log('Has draft data:', hasDraftData)

				// If no draft data provided, try to find the latest approved draft
				if (!hasDraftData) {
					const latestApprovedDraft = await DraftService.getLatestApprovedDraftByStudentId(student.student_id)

					console.log('Latest approved draft:', latestApprovedDraft)

					if (latestApprovedDraft) {
						// console.log('Applying latest approved draft to student profile...')

						// Extract profile data from the draft
						const profileData = latestApprovedDraft.profile_data || {}

						// Merge the profile data with the request data
						studentData = {
							...profileData,
							...studentData,
							visibility: true,
						}

						console.log('Merged student data with draft:', studentData)
					}
				}
			}

			console.log('Final student data to update:', studentData)

			// CRITICAL: Merge additional_info instead of replacing it
			// JSONB fields in Sequelize are replaced entirely, not merged
			if (studentData.additional_info) {
				const existingAdditionalInfo = student.additional_info || {}
				studentData.additional_info = {
					...existingAdditionalInfo, // Keep all existing fields
					...studentData.additional_info, // Merge with new fields
				}
				console.log('Merged additional_info:', studentData.additional_info)
			}

			// Update the student with the provided data
			await student.update(studentData)

			// CRITICAL FIX: Also update draft's additional_info to keep them in sync
			// When Settings page updates live data, draft data overwrites it on GET
			// So we must update the draft too
			if (studentData.additional_info) {
				try {
					// Find both draft and pendingDraft for this student
					const drafts = await Draft.findAll({
						where: {
							student_id: student.student_id,
							version_type: {
								[Op.in]: ['draft', 'pending'],
							},
						},
					})

					for (const draft of drafts) {
						if (draft.profile_data) {
							// Merge additional_info in draft too
							const existingDraftAdditionalInfo = draft.profile_data.additional_info || {}
							const mergedAdditionalInfo = {
								...existingDraftAdditionalInfo,
								...studentData.additional_info,
							}

							// CRITICAL: Update the entire profile_data object to ensure Sequelize detects the change
							// Use set() to explicitly mark the field as changed
							draft.set('profile_data', {
								...draft.profile_data,
								additional_info: mergedAdditionalInfo,
							})

							await draft.save()
							console.log(`Updated ${draft.version_type} draft additional_info:`, JSON.stringify(mergedAdditionalInfo, null, 2))
						}
					}
				} catch (draftError) {
					// Don't fail the update if draft update fails
					console.error('Failed to update draft additional_info:', draftError)
				}
			}

			console.log('Student updated successfully, new data:', student.dataValues)

			return student
		} catch (error) {
			console.error('Error updating student:', error)
			throw error
		}
	}

	// Service method to update a student by kintone_id
	static async updateStudentWithKintoneID(kintoneId, studentData) {
		try {
			// Find student by kintone_id and exclude certain fields from the response
			const student = await Student.findOne({
				where: { kintone_id: kintoneId },
				attributes: { exclude: ['password', 'createdAt', 'updatedAt'] },
			})

			// If student not found, throw an error
			if (!student) {
				throw new Error('Student not found')
			}

			// CRITICAL: Merge additional_info instead of replacing it
			if (studentData.additional_info) {
				const existingAdditionalInfo = student.additional_info || {}
				studentData.additional_info = {
					...existingAdditionalInfo,
					...studentData.additional_info,
				}
			}

			// Update the student with the provided data
			await student.update(studentData)

			return student
		} catch (error) {
			console.error('Error updating student:', error)
			throw error
		}
	}

	// Service method to update a student by kintone_id
	static async updateStudentWithStudentID(studentId, studentData) {
		try {
			// Find student by kintone_id and exclude certain fields from the response
			const student = await Student.findOne({
				where: { student_id: studentId },
				attributes: { exclude: ['password', 'createdAt', 'updatedAt'] },
			})

			// If student not found, throw an error
			if (!student) {
				throw new Error('Student not found')
			}

			// CRITICAL: Merge additional_info instead of replacing it
			if (studentData.additional_info) {
				const existingAdditionalInfo = student.additional_info || {}
				studentData.additional_info = {
					...existingAdditionalInfo,
					...studentData.additional_info,
				}
			}

			// Update the student with the provided data
			await student.update(studentData)

			return student
		} catch (error) {
			console.error('Error updating student:', error)
			throw error
		}
	}

	// Service method to delete a student by kintone_id
	static async deleteStudent(kintoneId) {
		try {
			// Find student by kintone_id
			const student = await Student.findOne({
				where: { kintone_id: kintoneId },
			})

			// If student not found, throw an error
			if (!student) {
				throw new Error('Student not found')
			}

			// Delete the student
			await student.destroy()
		} catch (error) {
			console.error('Error deleting student:', error)
			throw error
		}
	}

	//         for (const data of studentData) {
	//             if (!data.studentId || !data.mail) continue; // Agar asosiy maydonlar bo'lmasa, keyingisiga o'tish

	//             const existingStudent = await Student.findOne({ where: { student_id: data.studentId } });

	//             const formattedData = {
	//                 email: data.mail.trim(),
	//                 student_id: data.studentId,
	//                 first_name: data.studentFirstName,
	//                 last_name: data.studentLastName,
	//                 date_of_birth: data.birthday,
	//                 gender: data.gender,
	//                 address: data.address,
	//                 parents_phone_number: data.parentsPhoneNumber,
	//                 phone: data.phoneNumber,
	//                 enrollment_date: data.jduDate,
	//                 partner_university_enrollment_date: data.partnerUniversityEnrollmentDate,
	//                 semester: data.semester,
	//                 student_status: data.studentStatus,
	//                 partner_university: data.partnerUniversity,
	//                 kintone_id: data.kintone_id_value,
	//                 world_language_university_credits: Number(data.worldLanguageUniversityCredits) || 0,
	//                 business_skills_credits: Number(data.businessSkillsCredits) || 0,
	//                 japanese_employment_credits: Number(data.japaneseEmploymentCredits) || 0,
	//                 liberal_arts_education_credits: Number(data.liberalArtsEducationCredits) || 0,
	//                 total_credits: Number(data.totalCredits) || 0,
	//                 specialized_education_credits: Number(data.specializedEducationCredits) || 0,
	//                 partner_university_credits: Number(data.partnerUniversityCredits) || 0,
	//                 jlpt: data.jlpt,
	//                 jdu_japanese_certification: data.jdu_japanese_certification,
	//                 ielts: data.ielts,
	//                 japanese_speech_contest: data.japanese_speech_contest,
	//                 it_contest: data.it_contest,
	//             };

	//             if (!existingStudent || (data.semester > 0 && !existingStudent.active)) {
	//                 const password = generatePassword.generate({ length: 12, numbers: true, symbols: false, uppercase: true, });
	//                 formattedData.password = await bcrypt.hash(password, 10);
	//                 formattedData.active = true;
	//                 emailTasks.push(formatStudentWelcomeEmail(formattedData.email, password, formattedData.first_name, formattedData.last_name));
	//             } else {
	//                 formattedData.password = existingStudent.password;
	//             }

	//             upsertPromises.push(Student.upsert(formattedData));
	//         }

	//         await Promise.all(upsertPromises);
	//         console.log(`${upsertPromises.length} ta talaba ma'lumotlari DBda yangilandi/yaratildi.`);

	//         if (emailTasks.length > 0) {
	//             console.log(`${emailTasks.length} ta yangi talabaga email jo'natish boshlandi...`);
	//             const emailReport = await sendBulkEmails(emailTasks);
	//             console.log('--- Ommaviy Email Jo\'natish Hisoboti ---', emailReport);
	//         } else {
	//             console.log('Jo\'natish uchun yangi aktiv talabalar topilmadi.');
	//         }

	//         return { message: "Sinxronizatsiya muvaffaqiyatli yakunlandi." };

	//     } catch (error) {
	//         console.error("syncStudentData xatolik:", error);
	//         throw error;
	//     }
	// }
	/**
	 * Kintone'dan kelgan talabalar ro'yxatini sinxronizatsiya qiladi.
	 * Yangi yaratilgan har bir talaba uchun email vazifasini tayyorlaydi.
	 * @param {Array} studentData - Kintone'dan kelgan formatlangan talabalar ro'yxati.
	 * @returns {Array} Yangi talabalar uchun email vazifalari massivi.
	 */
	static async syncStudentData(studentData) {
		try {
			const emailTasks = [] // Jo'natiladigan email vazifalari uchun massiv
			const upsertPromises = [] // DB'ga yozish uchun promise'lar massivi

			for (const data of studentData) {
				if (!data.studentId || !data.mail) continue

				const existingStudent = await Student.findOne({
					where: { student_id: data.studentId },
				})

				const formattedData = {
					email: data.mail.trim(),
					student_id: data.studentId,
					first_name: data.studentFirstName,
					last_name: data.studentLastName,
					date_of_birth: data.birthday,
					gender: data.gender,
					address: data.address,
					parents_phone_number: data.parentsPhoneNumber,
					phone: data.phoneNumber,
					enrollment_date: data.jduDate,
					partner_university_enrollment_date: data.partnerUniversityEnrollmentDate,
					// Kintone'dan yangi qo'shilgan maydonlar
					faculty: data.faculty,
					department: data.department,
					semester: data.semester,
					student_status: data.studentStatus,
					partner_university: data.partnerUniversity,
					// Accept both snake_case and camelCase from Kintone formatter
					graduation_year: data.graduation_year || data.graduationYear,
					graduation_season: data.graduationSeason,
					kintone_id: data.kintone_id_value,
					world_language_university_credits: Number(data.worldLanguageUniversityCredits) || 0,
					business_skills_credits: Number(data.businessSkillsCredits) || 0,
					japanese_employment_credits: Number(data.japaneseEmploymentCredits) || 0,
					liberal_arts_education_credits: Number(data.liberalArtsEducationCredits) || 0,
					total_credits: Number(data.totalCredits) || 0,
					specialized_education_credits: Number(data.specializedEducationCredits) || 0,
					partner_university_credits: Number(data.partnerUniversityCredits) || 0,
					jlpt: data.jlpt,
					jdu_japanese_certification: data.jdu_japanese_certification,
					ielts: data.ielts,
					japanese_speech_contest: data.japanese_speech_contest,
					it_contest: data.it_contest,
				}

				// Faqat yangi yoki inactive talabalar uchun parol yaratamiz
				const isNewStudent = !existingStudent
				const isReactivation = existingStudent && !existingStudent.active && data.semester > 0

				if (isNewStudent || isReactivation) {
					const password = generatePassword.generate({
						length: 12,
						numbers: true,
						symbols: false,
						uppercase: true,
					})
					formattedData.password = password // Parolni xeshlash model ichidagi hook'da bajariladi
					formattedData.active = true

					// Faqat yangi yaratilgan yoki qayta aktivlashtirilgan talabalar uchun email jo'natamiz
					emailTasks.push(formatStudentWelcomeEmail(formattedData.email, password, formattedData.first_name, formattedData.last_name))
				}

				// Upsert operatsiyasi
				if (!existingStudent) {
					// Yangi talaba uchun - barcha maydonlar bilan yaratamiz
					upsertPromises.push(Student.create(formattedData))
				} else {
					// Mavjud talaba uchun - parolni chiqarib, faqat boshqa maydonlarni yangilaymiz
					const { password, ...updateData } = formattedData
					upsertPromises.push(existingStudent.update(updateData))
				}
			}

			// Barcha talabalarni bazaga yozib olamiz
			await Promise.all(upsertPromises)
			console.log(`${upsertPromises.length} ta talaba ma'lumotlari DBda yangilandi/yaratildi.`)

			// >>> O'ZGARISH: Tayyor bo'lgan email vazifalari ro'yxatini qaytaramiz <<<
			return emailTasks
		} catch (error) {
			console.error('syncStudentData jarayonida jiddiy xatolik:', error)
			throw error
		}
	}

	static async getStudentsWithPendingDrafts() {
		try {
			const students = await Student.findAll({
				include: [
					{
						model: Draft,
						as: 'drafts',
						where: { status: 'pending' }, // status = "pending" filter
					},
				],
			})
			return students
		} catch (error) {
			throw error
		}
	}

	// Get student IDs for autocomplete
	static async getStudentIds(search = '', requesterRole = null) {
		try {
			const { Op } = require('sequelize')
			const normalizedRole = (requesterRole || '').toLowerCase()
			let whereClause = { active: true }

			if (search) {
				const searchValue = String(search).trim()

				// If search value looks like a JLPT level (N1-N5), search in jlpt field
				if (/^N[1-5]$/i.test(searchValue)) {
					const normalizedSearch = searchValue.toUpperCase()
					whereClause[Op.or] = [
						// Search in student_id, first_name, last_name as before
						{ student_id: { [Op.iLike]: `%${searchValue}%` } },
						{ first_name: { [Op.iLike]: `%${searchValue}%` } },
						{ last_name: { [Op.iLike]: `%${searchValue}%` } },
						// Also search in jlpt field for JLPT level matches
						{
							jlpt: {
								[Op.or]: [{ [Op.iLike]: `%"highest":"${normalizedSearch}"%` }, { [Op.iLike]: `%"highest":"${normalizedSearch}",%` }, { [Op.iLike]: `%"highest":"${normalizedSearch}"}%` }],
							},
						},
					]
				} else {
					// Default search in student_id, first_name, last_name
					whereClause[Op.or] = [{ student_id: { [Op.iLike]: `%${searchValue}%` } }, { first_name: { [Op.iLike]: `%${searchValue}%` } }, { last_name: { [Op.iLike]: `%${searchValue}%` } }]
				}
			}

			// Recruiters should only see public (visible) student IDs
			if (normalizedRole === 'recruiter') {
				whereClause.visibility = true
			}

			const students = await Student.findAll({
				where: whereClause,
				attributes: ['student_id', 'first_name', 'last_name'],
				order: [['student_id', 'ASC']],
				limit: 10, // Limit to 10 suggestions
			})

			return students.map(student => ({
				student_id: student.student_id,
				name: `${student.first_name} ${student.last_name}`,
				display: `${student.student_id} - ${student.first_name} ${student.last_name}`,
			}))
		} catch (error) {
			throw error
		}
	}

	static async getLanguageSkills(requesterRole = null) {
		try {
			const normalizedRole = (requesterRole || '').toLowerCase()
			let whereClause = { active: true }

			// Recruiters should only see public (visible) students
			if (normalizedRole === 'recruiter') {
				whereClause.visibility = true
			}

			const students = await Student.findAll({
				where: whereClause,
				attributes: ['language_skills'],
			})

			const uniqueSkills = new Set()

			students.forEach(student => {
				if (student.language_skills) {
					try {
						// Parse JSON string to array
						const skills = typeof student.language_skills === 'string' ? JSON.parse(student.language_skills) : student.language_skills
						if (Array.isArray(skills)) {
							skills.forEach(skill => {
								if (skill && skill.name) {
									uniqueSkills.add(skill.name)
								}
							})
						}
					} catch (error) {
						// Skip invalid JSON
						console.warn('Invalid language_skills JSON:', student.language_skills)
					}
				}
			})

			// Convert Set to sorted array of objects
			return Array.from(uniqueSkills)
				.sort()
				.map(name => ({ name }))
		} catch (error) {
			throw error
		}
	}

	// Credit Details Methods
	static async updateStudentCreditDetails(studentId) {
		try {
			// Fetch credit details from Kintone
			const creditDetails = await kintoneCreditDetailsService.getCreditDetailsByStudentId(studentId)

			// Update student record with credit details
			const [updatedRowsCount] = await Student.update({ credit_details: creditDetails }, { where: { student_id: studentId } })

			if (updatedRowsCount === 0) {
				throw new Error('Student not found or no update needed')
			}

			// Calculate total credits and update if needed
			const totalCredits = kintoneCreditDetailsService.calculateTotalCredits(creditDetails)
			await Student.update({ total_credits: totalCredits }, { where: { student_id: studentId } })

			console.log(`✅ Updated credit details for student ${studentId}: ${creditDetails.length} records, ${totalCredits} total credits`)

			return {
				studentId,
				creditDetailsCount: creditDetails.length,
				totalCredits,
				creditDetails,
			}
		} catch (error) {
			console.error(`❌ Error updating credit details for student ${studentId}:`, error.message)
			throw error
		}
	}

	static async getStudentWithCreditDetails(studentId) {
		try {
			const student = await this.getStudentByStudentId(studentId)
			if (!student) {
				throw new Error('Student not found')
			}

			// Always fetch fresh data from Kintone for real-time updates
			console.log(`🔄 Fetching fresh credit details from Kintone for student ${studentId}`)
			await this.updateStudentCreditDetails(studentId)
			// Fetch updated student data
			const updatedStudent = await this.getStudentByStudentId(studentId)

			// Calculate total credits from credit details (like Sanno University)
			const totalCredits = kintoneCreditDetailsService.calculateTotalCredits(updatedStudent.credit_details || [])

			return {
				...updatedStudent,
				totalCredits,
				creditDetails: updatedStudent.credit_details || [],
			}
		} catch (error) {
			throw error
		}
	}

	static async syncAllStudentCreditDetails() {
		try {
			const students = await Student.findAll({
				attributes: ['student_id'],
				where: { active: true },
			})

			const results = []
			for (const student of students) {
				try {
					const result = await this.updateStudentCreditDetails(student.student_id)
					results.push(result)
				} catch (error) {
					console.error(`Failed to sync credit details for ${student.student_id}:`, error.message)
					results.push({
						studentId: student.student_id,
						error: error.message,
					})
				}
			}

			console.log(`✅ Sync completed for ${students.length} students`)
			return results
		} catch (error) {
			throw error
		}
	}
}

module.exports = StudentService
