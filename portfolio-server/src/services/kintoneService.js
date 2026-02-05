// services/KintoneService.js

const axios = require('axios')
const kintoneConfig = require('../config/kintoneConfig')

const StudentService = require('./studentService')
const StaffService = require('./staffService')
const RecruiterService = require('./recruiterService')
const { sendBulkEmails } = require('../utils/emailService')

class KintoneService {
	static baseUrl = process.env.KINTONE_API_BASE_URL

	/**
	 * Kintone ilovasi uchun konfiguratsiyani oladi.
	 * @param {string} appName - Ilovaning nomi (masalan, 'students').
	 * @returns {object} Ilova konfiguratsiyasi (appId, token).
	 */
	static getAppConfig(appName) {
		const appConfig = kintoneConfig[appName]
		if (!appConfig) {
			throw new Error(`App configuration for '${appName}' not found in kintoneConfig.js`)
		}
		return appConfig
	}

	/**
	 * Kintone'dan barcha yozuvlarni pagination bilan oladi.
	 * @param {string} appName - Ilovaning nomi.
	 * @returns {Promise<object>} Yozuvlar massivini o'z ichiga olgan obyekt.
	 */
	static async getAllRecords(appName) {
		try {
			const { appId, token } = this.getAppConfig(appName)
			let allRecords = []
			let offset = 0
			let hasMoreRecords = true

			while (hasMoreRecords) {
				const response = await axios.get(`${this.baseUrl}/k/v1/records.json`, {
					headers: { 'X-Cybozu-API-Token': token },
					params: {
						app: appId,
						query: `limit 100 offset ${offset}`,
					},
				})

				const records = response.data.records
				allRecords = allRecords.concat(records)
				hasMoreRecords = records.length === 100
				offset += 100
			}
			return { records: allRecords }
		} catch (error) {
			console.error(`Error fetching records from Kintone app '${appName}':`, error.message)
			console.error('Error details:', error.response ? error.response.data : error)
			throw error
		}
	}

	/**
	 * Barcha ma'lumotlarni Kintone'dan olib, mahalliy baza bilan sinxronizatsiya qiladi.
	 */
	static async syncData() {
		try {
			console.log('🚀 Umumiy sinxronizatsiya boshlandi...')

			// 1. Kintone'dan barcha ma'lumotlarni parallel ravishda olamiz
			const [students, staff, recruiters, credits, ieltsCerts, itContestCerts, jlptCerts, benronCerts, jduNinteiCerts] = await Promise.all([this.getAllRecords('students').then(res => res.records), this.getAllRecords('staff').then(res => res.records), this.getAllRecords('recruiters').then(res => res.records), this.getAllRecords('student_credits').then(res => res.records), this.getAllRecords('student_ielts').then(res => res.records), this.getAllRecords('student_it_contest').then(res => res.records), this.getAllRecords('student_jlpt').then(res => res.records), this.getAllRecords('student_benron_taikai').then(res => res.records), this.getAllRecords('student_jdu_ninteishiken').then(res => res.records)])

			console.log(`✅ Ma'lumotlar olindi: ${students.length} talaba, ${staff.length} xodim, ${recruiters.length} rekruter.`)

			// 2. Har bir turdagi foydalanuvchini sinxronizatsiya qilib, email vazifalarini yig'amiz
			const staffEmailTasks = await StaffService.syncStaffData(staff)
			const recruiterEmailTasks = await RecruiterService.syncRecruiterData(recruiters)

			// 3. Talabalar uchun ma'lumotlarni formatlash
			const creditsMap = new Map()
			credits.forEach(rec => {
				creditsMap.set(rec.studentId?.value, {
					worldLanguageUniversityCredits: rec.worldLanguageUniversityCredits?.value,
					businessSkillsCredits: rec.businessSkillsCredits?.value,
					japaneseEmploymentCredits: rec.japaneseEmploymentCredits?.value,
					liberalArtsEducationCredits: rec.liberalArtsEducationCredits?.value,
					totalCredits: rec.totalCredits?.value,
					specializedEducationCredits: rec.specializedEducationCredits?.value,
					partnerUniversityCredits: rec.partnerUniversityCredits?.value,
				})
			})

			const ieltsData = this.formatCertificateData(ieltsCerts, 'ielts', 'date')
			const itContestData = this.formatCertificateData(itContestCerts, 'it_contest', 'date', true)
			const jlptData = this.formatCertificateData(jlptCerts, 'jlptCertificate', 'jlpt_date', true)
			const benronData = this.formatCertificateData(benronCerts, 'japanese_speech_contest', 'campusDate', true)
			const jduNinteiData = this.formatCertificateData(jduNinteiCerts, 'jdu_japanese_certification', 'date', true)

			const formattedStudentData = students
				.map(record => {
					const studentId = record.studentId?.value
					if (!studentId) return null
					const studentCredits = creditsMap.get(studentId) || {}
					return {
						studentId,
						studentFirstName: record.studentFirstName?.value,
						studentLastName: record.studentLastName?.value,
						birthday: record.birthday?.value,
						gender: record.gender?.value,
						address: record.address?.value,
						postalCode: record.postalCode?.value,
						mail: record.mail?.value,
						phoneNumber: record.phoneNumber?.value,
						parentsPhoneNumber: record.parentsPhoneNumber?.value,
						jduDate: record.jduDate?.value,
						partnerUniversity: record.partnerUniversity?.value,
						// Newly added fields from Kintone student app
						faculty: record.faculty?.value,
						department: record.department?.value,
						partnerUniversityEnrollmentDate: record.partnerUniversityEnrollmentDate?.value,
						semester: record.semester?.value,
						studentStatus: record.studentStatus?.value,
						// Graduation can come as a Date (YYYY-MM-DD). Support both field codes.
						graduationYear: record.graduationYear?.value,
						graduation_year: record.graduation_year?.value || record.graduationYear?.value,
						graduationSeason: record.graduationSeason?.value,
						kintone_id_value: record['$id']?.value,
						...studentCredits,
						ielts: JSON.stringify(ieltsData[studentId] || null),
						it_contest: JSON.stringify(itContestData[studentId] || null),
						jlpt: JSON.stringify(jlptData[studentId] || null),
						japanese_speech_contest: JSON.stringify(benronData[studentId] || null),
						jdu_japanese_certification: JSON.stringify(jduNinteiData[studentId] || null),
					}
				})
				.filter(Boolean)

			const studentEmailTasks = await StudentService.syncStudentData(formattedStudentData)

			// 4. Barcha email vazifalarini bitta ro'yxatga birlashtiramiz
			const allEmailTasks = [...studentEmailTasks, ...staffEmailTasks, ...recruiterEmailTasks]

			// 5. Agar jo'natiladigan email bo'lsa, barchasini ommaviy jo'natamiz
			if (allEmailTasks.length > 0) {
				console.log(`📨 Jami ${allEmailTasks.length} ta yangi foydalanuvchiga email jo'natish boshlandi...`)
				const emailReport = await sendBulkEmails(allEmailTasks)
				console.log("--- Ommaviy Email Jo'natish Hisoboti ---")
				console.log(`Total: ${emailReport.total}, Successful: ${emailReport.successful}, Failed: ${emailReport.failed}`)
				if (emailReport.failed > 0) {
					console.error('Xato bilan tugagan emaillar:', emailReport.failedEmails)
				}
				console.log('-------------------------')
			} else {
				console.log("✅ Jo'natish uchun yangi foydalanuvchilar topilmadi.")
			}

			console.log('🎉 Umumiy sinxronizatsiya muvaffaqiyatli yakunlandi.')
			return { message: 'All data synchronized successfully.' }
		} catch (error) {
			console.error('❌ KintoneService syncData da jiddiy xatolik yuz berdi:', error)
			throw error
		}
	}

	/**
	 * Sertifikat ma'lumotlarini talaba IDsi bo'yicha guruhlaydi.
	 */
	static formatCertificateData(certificateRecords, levelField, dateField, isReverse = false) {
		const data = {}
		if (!Array.isArray(certificateRecords)) return data

		certificateRecords.forEach(record => {
			const studentId = record.studentId?.value
			if (!studentId) return

			const nLevel = record[levelField]?.value
			const date = record[dateField]?.value
			if (!nLevel) return

			const newEntry = { level: nLevel, date: date }

			if (!data[studentId]) {
				data[studentId] = {
					highest: nLevel,
					list: [newEntry],
				}
			} else {
				data[studentId].list.push(newEntry)
				if (this.isHigherLevel(nLevel, data[studentId].highest, isReverse)) {
					data[studentId].highest = nLevel
				}
			}
		})
		return data
	}

	/**
	 * Sertifikat darajasidan raqamni ajratib oladi.
	 */
	static extractLevelNumber(level) {
		if (typeof level !== 'string') return null
		const match = level.match(/\d+(\.\d+)?/) // Son va o'nlik kasrlarni ham topadi
		return match ? parseFloat(match[0]) : null
	}

	/**
	 * Ikki sertifikat darajasini solishtiradi (N1 > N2 yoki 8.0 > 7.5).
	 */
	static isHigherLevel(level1, level2, isReverse = false) {
		const level1Number = this.extractLevelNumber(level1)
		const level2Number = this.extractLevelNumber(level2)

		if (level1Number === null || level2Number === null) {
			// Raqam bo'lmasa, matnli solishtirish
			return isReverse ? level1 < level2 : level1 > level2
		}

		return isReverse ? level1Number < level2Number : level1Number > level2Number
	}

	// Bu metodlar tashqaridan chaqirilishi mumkinligi uchun saqlab qolindi
	static async getRecordBy(appName, colName, colValue) {
		try {
			const { appId, token } = this.getAppConfig(appName)

			let allRecords = []
			let offset = 0
			let hasMoreRecords = true

			let query

			while (hasMoreRecords) {
				query = `${colName} = "${colValue}" limit 100 offset ${offset}`
				const response = await axios.get(`${this.baseUrl}/k/v1/records.json`, {
					headers: {
						'X-Cybozu-API-Token': token,
					},
					params: {
						app: appId,
						query: query,
					},
				})

				// Add the current batch of records to the allRecords array
				allRecords = allRecords.concat(response.data.records)
				// Check if more records are available (if the response contains 100 records)
				hasMoreRecords = response.data.records.length === 100

				// Increment offset for next batch
				offset += 100
			}

			let data = {
				records: allRecords,
			}
			return data
		} catch (error) {
			console.error(`Error fetching record by ${colName} from Kintone:`, error.message)
			console.error('Error details:', error.response ? error.response.data : error)
			throw error
		}
	}

	// Service method to create a new record
	static async createRecord(appName, data) {
		try {
			const { appId, token } = this.getAppConfig(appName)
			// console.log(`Creating record in app ${appId} with data:`, data)

			const response = await axios.post(
				`${this.baseUrl}/k/v1/record.json`,
				{
					app: appId,
					record: data,
				},
				{
					headers: {
						'X-Cybozu-API-Token': token,
					},
				}
			)

			return response.data
		} catch (error) {
			console.error('Error creating record in Kintone:', error.message)
			console.error('Error details:', error.response ? error.response.data : error)
			throw error
		}
	}

	// Service method to update a record
	static async updateRecord(appName, recordId, data) {
		try {
			const { appId, token } = this.getAppConfig(appName)
			// console.log(
			// 	`Updating record ${recordId} in app ${appId} with data:`,
			// 	data
			// )

			const response = await axios.put(
				`${this.baseUrl}/k/v1/record.json`,
				{
					app: appId,
					id: recordId,
					record: data,
				},
				{
					headers: {
						'X-Cybozu-API-Token': token,
					},
				}
			)

			return response.data
		} catch (error) {
			console.error('Error updating record in Kintone:', error.message)
			console.error('Error details:', error.response ? error.response.data : error)
			throw error
		}
	}

	static async deleteRecord(appName, recordId) {
		try {
			const { appId, token } = this.getAppConfig(appName)
			// console.log(`Deleting record ${recordId} from app ${appId}`); // Debugging uchun

			const response = await axios.post(
				`${this.baseUrl}/k/v1/records.json`,
				{
					app: appId,
					ids: [recordId], // O'chiriladigan yozuvlar ID'si
				},
				{
					headers: {
						'X-Cybozu-API-Token': token,
					},
				}
			)

			return response.data
		} catch (error) {
			console.error('Error deleting record from Kintone:', error.message)
			console.error('Error details:', error.response ? error.response.data : error)
			throw error
		}
	}
}

// Boshqa metodlarni (create, update, delete, getBy) eski koddan to'liq ko'chirib, shu yerga qo'yish kerak
// Ularning tanasi o'zgarishsiz qoladi

module.exports = KintoneService
