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

	static async getAllStudents(filter, recruiterId, onlyBookmarked, userType, sortOptions = {}) {
		try {
			const normalizedUserType = (userType || '').toLowerCase()
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

			const searchableColumns = ['email', 'first_name', 'last_name', 'self_introduction', 'hobbies', 'skills', 'it_skills', 'jlpt', 'student_id']

			// Helper to build JSONB @> conditions for it_skills across levels
			const buildItSkillsCondition = (names = [], match = 'any') => {
				const lvls = ['上級', '中級', '初級']
				const safeNames = Array.isArray(names) ? names.filter(Boolean) : []
				if (safeNames.length === 0) return null

				const perSkill = safeNames.map(n => {
					// JSON array string for [{"name":"<n>"}]
					const json = JSON.stringify([{ name: String(n) }])
					const esc = sequelize.escape(json) // safe string with quotes
					const levelExpr = lvls.map(l => `(("Student"."it_skills"->'${l}') @> ${esc}::jsonb)`).join(' OR ')
					return `(${levelExpr})`
				})
				const joiner = match === 'all' ? ' AND ' : ' OR '
				return `(${perSkill.join(joiner)})`
			}

			Object.keys(filter).forEach(key => {
				if (filter[key]) {
					if (key === 'search') {
						const searchValue = String(filter[key])
						querySearch[Op.or] = searchableColumns.map(column => {
							if (['skills', 'it_skills'].includes(column)) {
								return {
									[Op.or]: [
										{
											[column]: {
												'上級::text': { [Op.iLike]: `%${searchValue}%` },
											},
										},
										{
											[column]: {
												'中級::text': { [Op.iLike]: `%${searchValue}%` },
											},
										},
										{
											[column]: {
												'初級::text': { [Op.iLike]: `%${searchValue}%` },
											},
										},
									],
								}
							}
							return { [column]: { [Op.iLike]: `%${searchValue}%` } }
						})
					} else if (key === 'it_skills') {
						const values = Array.isArray(filter[key]) ? filter[key] : [filter[key]]
						const match = filter.it_skills_match === 'all' ? 'all' : 'any'
						const expr = buildItSkillsCondition(values, match)
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
							// Match only the highest level inside stored JSON string e.g. {"highest":"N5"}
							queryOther[Op.and].push({
								[Op.or]: filter[key].map(level => ({
									[key]: { [Op.iLike]: `%"highest":"${level}"%` },
								})),
							})
						}
					} else if (key === 'ielts') {
						if (Array.isArray(filter[key])) {
							queryOther[Op.and].push({
								[Op.or]: filter[key].map(level => ({
									[key]: { [Op.iLike]: `%${level}%` },
								})),
							})
						}
					} else if (Array.isArray(filter[key])) {
						queryOther[key] = { [Op.in]: filter[key] }
					} else if (typeof filter[key] === 'string') {
						queryOther[key] = { [Op.iLike]: `%${filter[key]}%` }
					} else {
						queryOther[key] = filter[key]
					}
				}
			})

			query[Op.and] = [querySearch, queryOther, { active: true }]
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

			const students = await Student.findAll({
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
				order: order, // <<<<<<<<<<<<<<<< SARALASH SHU YERDA QO'LLANILADI
			})

			// 4. DRAFT MA'LUMOTLARINI BIRLASHTIRISH (o'zgarishsiz qoladi)
			const studentsWithDraftData = students.map(student => {
				const studentJson = student.toJSON()
				if (studentJson.draft && studentJson.draft.profile_data && studentJson.draft.status !== 'draft') {
					const draftData = studentJson.draft.profile_data
					const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'hobbies_description', 'special_skills_description', 'other_information', 'it_skills', 'skills']
					fieldsToMerge.forEach(field => {
						if (draftData[field] !== undefined) {
							studentJson[field] = draftData[field]
						}
					})
				}
				return studentJson
			})

			return studentsWithDraftData
		} catch (error) {
			console.error('Error in getAllStudents:', error.message, error.stack)
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
				const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'hobbies_description', 'special_skills_description', 'other_information', 'it_skills', 'skills']

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
				const fieldsToMerge = ['deliverables', 'gallery', 'self_introduction', 'hobbies', 'hobbies_description', 'special_skills_description', 'other_information', 'it_skills', 'skills']

				fieldsToMerge.forEach(field => {
					if (draftData[field] !== undefined) {
						studentJson[field] = draftData[field]
					}
				})
			}

			// ======= RENAME CV FIELDS (remove cv_ prefix) ==========
			if (studentJson.cv_education) {
				studentJson.education = studentJson.cv_education
				delete studentJson.cv_education
			}

			if (studentJson.cv_work_experience) {
				studentJson.workExperience = studentJson.cv_work_experience
				delete studentJson.cv_work_experience
			}

			if (studentJson.cv_licenses) {
				studentJson.licenses = studentJson.cv_licenses
				delete studentJson.cv_licenses
			}

			// Remove cv_projects (frontend uses deliverables instead)
			if (studentJson.cv_projects) {
				delete studentJson.cv_projects
			}

			if (studentJson.cv_additional_info) {
				studentJson.additionalInfo = studentJson.cv_additional_info
				delete studentJson.cv_additional_info
			}

			if (studentJson.address_furigana) {
				studentJson.addressFurigana = studentJson.address_furigana
				delete studentJson.address_furigana
			}

			if (studentJson.postal_code) {
				studentJson.postalCode = studentJson.postal_code
				delete studentJson.postal_code
			}

			if (studentJson.additionalInfo && studentJson.additionalInfo.arubaito) {
				studentJson.arubaito = studentJson.additionalInfo.arubaito
				delete studentJson.additionalInfo.arubaito
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

			// Update the student with the provided data
			await student.update(studentData)

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
			const whereClause = search
				? {
						[Op.or]: [
							{ student_id: { [Op.iLike]: `%${search}%` } },
							{
								[Op.or]: [{ first_name: { [Op.iLike]: `%${search}%` } }, { last_name: { [Op.iLike]: `%${search}%` } }],
							},
						],
						active: true,
					}
				: { active: true }

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

	/**
	 * Service method to get student data formatted for CV download
	 * @param {string} studentId - Student ID
	 * @returns {object} Student data formatted for CV
	 */
	static async getStudentForCV(studentId) {
		try {
			console.log('🔍 Fetching student for CV:', studentId)

			const student = await Student.findOne({
				where: { student_id: studentId },
				raw: true,
			})

			if (!student) {
				throw new Error('Student not found')
			}

			delete student.password
			console.log('✅ Student found:', student.student_id)

			// Safe helper functions
			const parseJSON = field => {
				if (!field) return null
				if (typeof field === 'object') return field
				if (typeof field === 'string') {
					try {
						return JSON.parse(field)
					} catch (e) {
						return null
					}
				}
				return null
			}

			const safeArray = value => {
				return Array.isArray(value) ? value : []
			}

			const calculateAge = birthDate => {
				if (!birthDate) return null
				const today = new Date()
				const birth = new Date(birthDate)
				let age = today.getFullYear() - birth.getFullYear()
				const monthDiff = today.getMonth() - birth.getMonth()
				if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
					age--
				}
				return age
			}

			// FIXED: Use cv_education directly
			const allEducation = safeArray(student.cv_education).sort((a, b) => {
				if (a.year !== b.year) return (a.year || 0) - (b.year || 0)
				return (a.month || 0) - (b.month || 0)
			})

			// Work Experience
			const workExperience = safeArray(student.cv_work_experience)

			// Licenses (cv_licenses + parsed certificates)
			const licenses = [...safeArray(student.cv_licenses)]

			const jlptData = parseJSON(student.jlpt)
			if (jlptData?.highest) {
				licenses.push({
					year: new Date().getFullYear(),
					month: 12,
					certifacateName: `JLPT ${jlptData.highest} Certificate`,
				})
			}

			if (student.ielts) {
				licenses.push({
					year: new Date().getFullYear(),
					month: 6,
					certifacateName: `IELTS ${student.ielts}`,
				})
			}

			const jduJapaneseData = parseJSON(student.jdu_japanese_certification)
			if (jduJapaneseData?.highest) {
				licenses.push({
					year: new Date().getFullYear(),
					month: 3,
					certifacateName: `JDU Japanese Certification ${jduJapaneseData.highest}`,
				})
			}

			// IT Skills → Programming
			const itSkills = student.it_skills || {}
			const programmingSkills = []

			if (itSkills && typeof itSkills === 'object') {
				Object.keys(itSkills).forEach(level => {
					const skillsAtLevel = itSkills[level]
					if (Array.isArray(skillsAtLevel)) {
						skillsAtLevel.forEach(skill => {
							if (skill && skill.name && !programmingSkills.includes(skill.name)) {
								programmingSkills.push(skill.name)
							}
						})
					}
				})
			}

			// Hobbies
			let hobbiesArray = []
			if (student.hobbies) {
				if (typeof student.hobbies === 'string') {
					hobbiesArray = [student.hobbies]
				} else if (Array.isArray(student.hobbies)) {
					hobbiesArray = student.hobbies
				}
			}

			// Additional Info
			const additionalInfo = student.cv_additional_info || {}
			// Build CV Data
			const cvData = {
				fullNameFurigana: `${student.last_name_furigana || ''} ${student.first_name_furigana || ''}`.trim() || null,
				fullName: `${student.last_name} ${student.first_name}`,
				gender: student.gender || null,
				imageUrl: student.photo || null,
				birthday: student.date_of_birth || null,
				age: calculateAge(student.date_of_birth),
				addressFurigana: student.address_furigana || additionalInfo.addressFurigana || null,
				indeks: student.postal_code || additionalInfo.indeks || null,
				address: student.address || null,
				tel: student.phone || null,
				email: student.email || null,
				additionalAddressFurigana: additionalInfo.additionalAddressFurigana || null,
				additionalIndeks: additionalInfo.additionalIndeks || null,
				additionalAddress: additionalInfo.additionalAddress || student.address || null,
				additionalTel: student.parents_phone_number || null,
				additionalEmail: additionalInfo.additionalEmail || student.email || null,
				education: allEducation, // ← Fixed: no duplicates
				workExperience: workExperience,
				licenses: licenses,
				skills: {
					programming: programmingSkills,
					languages: {
						uzbek: additionalInfo.languageUzbek || 'Native',
						english: student.language_skills || additionalInfo.languageEnglish || 'Intermediate',
						japanese: jlptData?.highest ? `${jlptData.highest} Level` : additionalInfo.languageJapanese || 'Elementary',
						russian: additionalInfo.languageRussian || 'Fluent',
					},
					tools: safeArray(additionalInfo.tools),
					databases: safeArray(additionalInfo.databases),
				},
				personalStatement: student.self_introduction || '',
				hobbies: hobbiesArray,
				transportation: additionalInfo.transportation || '自転車通勤可能',
				commuteTime: additionalInfo.commuteTime || 45,
				numDependents: additionalInfo.numDependents || 0,
				isMarried: additionalInfo.isMarried || false,
				spousalSupportObligation: additionalInfo.spousalSupportObligation || false,
				hopes: additionalInfo.hopes || student.other_information || '',
				// ==========  CHANGED: Use deliverables only  ==========
				projects: safeArray(student.deliverables),
				arubaito: safeArray(additionalInfo.arubaito), // ← Changed arubaito
			}

			console.log('✅ CV data built successfully')
			return cvData
		} catch (error) {
			console.error('❌ Error in getStudentForCV:', error)
			throw error
		}
	}
}

module.exports = StudentService
