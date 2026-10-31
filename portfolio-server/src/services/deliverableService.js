// services/deliverableService.js

const { Draft } = require('../models')
const _ = require('lodash')
const { uploadFile, deleteFile } = require('../utils/storageService')
const generateUniqueFilename = require('../utils/uniqueFilename')

/**
 * Talaba uchun mavjud draftni topadi yoki yangisini yaratadi.
 * Bu funksiya `upsertDraft`'dan farqli o'laroq, `profile_data`'ni o'zgartirmaydi.
 * @param {string} studentId - Talabaning ID raqami.
 * @param {string} versionType - Draft version type ('draft' or 'pending'). Defaults to 'draft'.
 * @returns {Promise<Draft>} Topilgan yoki yaratilgan draft obyekti.
 */
const _getOrCreateDraft = async (studentId, versionType = 'draft') => {
	if (!studentId) {
		throw { status: 400, message: 'Talaba ID raqami topilmadi.' }
	}
	let draft = await Draft.findOne({
		where: { student_id: studentId, version_type: versionType },
	})
	if (!draft) {
		draft = await Draft.create({
			student_id: studentId,
			version_type: versionType,
			profile_data: {},
			status: versionType === 'pending' ? 'checking' : 'draft',
			changed_fields: [],
		})
	}
	return draft
}

/**
 * Talaba uchun draftni topadi. Agar pending topilmasa, draft versiyasini qaytaradi.
 * Bu staff/admin uchun update/delete operatsiyalarida ishlatiladi.
 * @param {string} studentId - Talabaning ID raqami.
 * @param {string} versionType - Draft version type ('draft' or 'pending'). Defaults to 'draft'.
 * @returns {Promise<Draft>} Topilgan draft obyekti.
 */
const _getDraftWithFallback = async (studentId, versionType = 'draft') => {
	if (!studentId) {
		throw { status: 400, message: 'Talaba ID raqami topilmadi.' }
	}
	let draft = await Draft.findOne({
		where: { student_id: studentId, version_type: versionType },
	})
	// If pending not found and versionType is pending, fall back to draft
	if (!draft && versionType === 'pending') {
		draft = await Draft.findOne({
			where: { student_id: studentId, version_type: 'draft' },
		})
	}
	if (!draft) {
		throw { status: 404, message: 'Draft topilmadi.' }
	}
	return draft
}

class DeliverableService {
	/**
	 * Draft'ga yangi ish namunasini (bir nechta rasm bilan) qo'shadi.
	 * @param {string} studentId - Student ID
	 * @param {object} deliverableData - Deliverable data
	 * @param {Array} files - Uploaded files
	 * @param {string} versionType - Draft version type ('draft' or 'pending')
	 */
	static async addDeliverable(studentId, deliverableData, files, versionType = 'draft') {
		if (!files || files.length === 0) {
			throw {
				status: 400,
				message: 'Ish namunasi uchun kamida bitta rasm majburiy.',
			}
		}

		const uploadPromises = files.map(file => {
			const uniqueFilename = generateUniqueFilename(file.originalname)
			const s3Path = `students/${studentId}/deliverables/${uniqueFilename}`
			return uploadFile(file.buffer, s3Path)
		})

		const uploadResults = await Promise.all(uploadPromises)
		const imageUrls = uploadResults.map(result => result.Location)

		const newDeliverable = {
			id: Date.now(),
			...deliverableData,
			image_urls: imageUrls,
		}

		if (typeof newDeliverable.role === 'string') {
			newDeliverable.role = newDeliverable.role
				.split(',')
				.map(r => r.trim())
				.filter(r => r)
		}
		const draft = await _getOrCreateDraft(studentId, versionType)

		const currentDeliverables = draft.profile_data.deliverables || []
		const updatedDeliverables = [...currentDeliverables, newDeliverable]

		// `profile_data`'ni to'liq almashtirmasdan, faqat `deliverables` qismini yangilaymiz
		draft.set('profile_data.deliverables', updatedDeliverables)

		draft.changed_fields = _.union(draft.changed_fields || [], ['deliverables'])
		if (versionType === 'draft' && draft.status !== 'draft') draft.status = 'draft'

		await draft.save()
		return draft
	}

	/**
	 * Mavjud ish namunasini tahrirlaydi.
	 * @param {string} studentId - Student ID
	 * @param {string|number} deliverableId - Deliverable ID
	 * @param {object} updateData - Update data
	 * @param {Array} files - Uploaded files
	 * @param {string} versionType - Draft version type ('draft' or 'pending')
	 */
	static async updateDeliverable(studentId, deliverableId, updateData, files, versionType = 'draft') {
		const draft = await _getDraftWithFallback(studentId, versionType)
		let deliverables = draft.profile_data.deliverables || []

		const deliverableIndex = deliverables.findIndex(d => d.id == deliverableId)
		if (deliverableIndex === -1) {
			throw { status: 404, message: 'Bu IDga ega ish namunasi topilmadi.' }
		}

		if (updateData.role && typeof updateData.role === 'string') {
			updateData.role = updateData.role
				.split(',')
				.map(r => r.trim())
				.filter(r => r)
		}

		const deliverableToUpdate = deliverables[deliverableIndex]

		// Normalize intent flags for image handling
		const parseBool = v => {
			if (typeof v === 'boolean') return v
			if (typeof v === 'string') {
				const s = v.trim().toLowerCase()
				return s === 'true' || s === '1' || s === 'yes'
			}
			return false
		}

		const toArray = v => {
			if (Array.isArray(v)) return v
			if (typeof v === 'string') {
				const s = v.trim()
				if (!s) return []
				if ((s.startsWith('[') && s.endsWith(']')) || s.includes(',')) {
					try {
						const j = JSON.parse(s)
						if (Array.isArray(j)) return j
					} catch (_) {
						return s
							.split(',')
							.map(x => x.trim())
							.filter(Boolean)
					}
				}
				return [s]
			}
			return []
		}

		// Default to append behavior unless explicitly told to replace
		const replaceAll = parseBool(updateData.replace_all || updateData.replaceAll || updateData.mode === 'replace')
		const removeImageUrls = toArray(updateData.remove_image_urls || updateData.removeImageUrls)

		let currentUrls = Array.isArray(deliverableToUpdate.image_urls) ? [...deliverableToUpdate.image_urls] : []

		// Remove specific images if requested
		if (removeImageUrls.length > 0 && currentUrls.length > 0) {
			const toRemove = new Set(removeImageUrls)
			const remaining = []
			for (const url of currentUrls) {
				if (toRemove.has(url)) {
					try {
						await deleteFile(url)
					} catch (_) {}
				} else {
					remaining.push(url)
				}
			}
			currentUrls = remaining
		}

		if (files && files.length > 0) {
			// If replaceAll, clear existing and delete them; otherwise append new files
			if (replaceAll && currentUrls.length > 0) {
				await Promise.all(currentUrls.map(url => deleteFile(url)))
				currentUrls = []
			}
			const uploadPromises = files.map(file => {
				const uniqueFilename = generateUniqueFilename(file.originalname)
				const s3Path = `students/${studentId}/deliverables/${uniqueFilename}`
				return uploadFile(file.buffer, s3Path)
			})
			const uploadResults = await Promise.all(uploadPromises)
			const newUrls = uploadResults.map(result => result.Location)
			const merged = [...currentUrls, ...newUrls]
			// Deduplicate while preserving order
			const seen = new Set()
			deliverableToUpdate.image_urls = merged.filter(u => {
				if (!u || seen.has(u)) return false
				seen.add(u)
				return true
			})
		} else {
			// No new files; just persist the possibly updated currentUrls
			deliverableToUpdate.image_urls = currentUrls
		}

		Object.assign(deliverableToUpdate, updateData)
		deliverables[deliverableIndex] = deliverableToUpdate

		draft.set('profile_data.deliverables', deliverables)
		draft.changed_fields = _.union(draft.changed_fields || [], ['deliverables'])
		// Only reset status to draft if editing the actual draft version
		if (draft.version_type === 'draft' && draft.status !== 'draft') draft.status = 'draft'

		await draft.save()
		return draft
	}

	/**
	 * Ish namunasini o'chiradi.
	 * @param {string} studentId - Student ID
	 * @param {string|number} deliverableId - Deliverable ID
	 * @param {string} versionType - Draft version type ('draft' or 'pending')
	 */
	static async removeDeliverable(studentId, deliverableId, versionType = 'draft') {
		const draft = await _getDraftWithFallback(studentId, versionType)
		const deliverables = draft.profile_data.deliverables || []

		const deliverableToRemove = deliverables.find(d => d.id == deliverableId)
		if (!deliverableToRemove) {
			throw { status: 404, message: 'Bu IDga ega ish namunasi topilmadi.' }
		}

		if (deliverableToRemove.image_urls) {
			await Promise.all(deliverableToRemove.image_urls.map(url => deleteFile(url)))
		}

		const updatedDeliverables = deliverables.filter(d => d.id != deliverableId)

		draft.set('profile_data.deliverables', updatedDeliverables)
		draft.changed_fields = _.union(draft.changed_fields || [], ['deliverables'])
		// Only reset status to draft if editing the actual draft version
		if (draft.version_type === 'draft' && draft.status !== 'draft') draft.status = 'draft'

		await draft.save()
		return draft
	}
}

module.exports = DeliverableService
