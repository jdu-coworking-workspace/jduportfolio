const axios = require('axios')
const crypto = require('crypto')

const SUPPORTED_LANGUAGES = ['ja', 'en', 'uz', 'ru']

const LANGUAGE_NAMES = {
	ja: 'Japanese',
	en: 'English',
	uz: 'Uzbek',
	ru: 'Russian',
}

const JSON_TEXT_FIELDS = ['jlpt', 'ielts', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest', 'language_skills']
const TRANSLATABLE_KEYS = new Set(['first_name', 'last_name', 'first_name_furigana', 'last_name_furigana', 'self_introduction', 'hobbies', 'hobbies_description', 'other_information', 'special_skills_description', 'major', 'job_type', 'address', 'address_furigana', 'partner_university', 'faculty', 'department', 'title', 'name', 'description', 'summary', 'content', 'company', 'organization', 'position', 'role', 'period', 'text'])

class TranslationRateLimitError extends Error {
	constructor(message = 'Translation rate limit exceeded') {
		super(message)
		this.name = 'TranslationRateLimitError'
		this.code = 'translation_rate_limited'
		this.status = 429
	}
}

class TranslationProviderError extends Error {
	constructor(message = 'Translation provider is unavailable') {
		super(message)
		this.name = 'TranslationProviderError'
		this.code = 'translation_provider_unavailable'
		this.status = 503
	}
}

const normalizeLanguage = value => {
	const lang = String(value || 'ja')
		.trim()
		.toLowerCase()
	if (lang === 'jp') return 'ja'
	return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'ja'
}

const parseJsonTextFields = profile => {
	const normalized = JSON.parse(JSON.stringify(profile || {}))
	for (const field of JSON_TEXT_FIELDS) {
		const value = normalized[field]
		if (typeof value !== 'string') continue
		const trimmed = value.trim()
		if (!trimmed || !['[', '{'].includes(trimmed[0])) continue
		try {
			normalized[field] = JSON.parse(trimmed)
		} catch (_) {
			// Keep original text when it is not valid JSON.
		}
	}
	return normalized
}

const hashProfile = profile =>
	crypto
		.createHash('sha256')
		.update(JSON.stringify(profile || {}))
		.digest('hex')

const looksLikeNonHumanText = value => {
	const text = String(value || '').trim()
	if (!text) return true
	if (/^https?:\/\//i.test(text)) return true
	if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return true
	if (/^#[0-9a-f]{3,8}$/i.test(text)) return true
	if (/^[\d\s()+\-.,/年月日:]+$/.test(text)) return true
	if (/^[A-Z]{1,6}\d{0,3}$/i.test(text)) return true
	return false
}

const pickTranslatableFields = value => {
	if (Array.isArray(value)) {
		const picked = value.map(item => pickTranslatableFields(item))
		return picked.some(item => item !== undefined) ? picked : undefined
	}

	if (value && typeof value === 'object') {
		const picked = {}
		for (const [key, child] of Object.entries(value)) {
			if (typeof child === 'string') {
				if (TRANSLATABLE_KEYS.has(key) && !looksLikeNonHumanText(child)) {
					picked[key] = child
				}
				continue
			}
			const nested = pickTranslatableFields(child)
			if (nested !== undefined) {
				picked[key] = nested
			}
		}
		return Object.keys(picked).length > 0 ? picked : undefined
	}

	return undefined
}

const mergeTranslatedFields = (source, translated) => {
	if (translated === undefined || translated === null) return source

	if (Array.isArray(source)) {
		if (!Array.isArray(translated)) return source
		return source.map((item, index) => mergeTranslatedFields(item, translated[index]))
	}

	if (source && typeof source === 'object') {
		if (!translated || typeof translated !== 'object' || Array.isArray(translated)) return source
		const merged = { ...source }
		for (const [key, value] of Object.entries(translated)) {
			if (value === undefined || value === null) continue
			if (typeof value === 'string') {
				merged[key] = value
			} else {
				merged[key] = mergeTranslatedFields(source[key], value)
			}
		}
		return merged
	}

	return typeof translated === 'string' ? translated : source
}

const extractJson = text => {
	if (!text || typeof text !== 'string') {
		throw new Error('Gemini returned an empty translation response')
	}

	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
	const candidate = fenced ? fenced[1] : text
	const start = candidate.indexOf('{')
	const end = candidate.lastIndexOf('}')
	if (start === -1 || end === -1 || end <= start) {
		throw new Error('Gemini translation response did not contain JSON')
	}
	return JSON.parse(candidate.slice(start, end + 1))
}

const buildPrompt = (profile, targetLanguage) => {
	return [`Translate this public student portfolio JSON subset into ${LANGUAGE_NAMES[targetLanguage]}.`, 'Return only valid JSON. Keep exactly the same object keys and nesting.', 'Translate every string value in this subset naturally.', 'Do not add explanations. Do not alter object keys.', 'If a value is already in the target language, keep it natural and do not add explanations.', 'JSON:', JSON.stringify(profile)].join('\n')
}

const COMMUNITY_TRANSLATE_TEXT_LIMIT = 1800

const splitTextForCommunityTranslate = (text, maxLength = COMMUNITY_TRANSLATE_TEXT_LIMIT) => {
	const normalized = String(text || '').trim()
	if (!normalized) return []
	if (normalized.length <= maxLength) return [normalized]

	const chunks = []
	let remaining = normalized
	while (remaining.length > 0) {
		if (remaining.length <= maxLength) {
			chunks.push(remaining)
			break
		}

		const window = remaining.slice(0, maxLength)
		const splitAt = Math.max(window.lastIndexOf('\n'), window.lastIndexOf('。'), window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '), window.lastIndexOf(', '), window.lastIndexOf(' '))
		const end = splitAt > 80 ? splitAt + 1 : maxLength
		chunks.push(remaining.slice(0, end).trim())
		remaining = remaining.slice(end).trim()
	}
	return chunks.filter(Boolean)
}

const translateTextWithGoogleCommunity = async (text, targetLanguage) => {
	const chunks = splitTextForCommunityTranslate(text)
	const translatedChunks = []

	for (const chunk of chunks) {
		const response = await axios.get('https://translate.googleapis.com/translate_a/single', {
			params: {
				client: 'gtx',
				sl: 'auto',
				tl: targetLanguage,
				dt: 't',
				q: chunk,
			},
			timeout: 20000,
		})

		const translated = Array.isArray(response.data?.[0]) ? response.data[0].map(part => part?.[0] || '').join('') : ''
		if (!translated) {
			throw new TranslationProviderError('Google community translator returned an invalid response')
		}
		translatedChunks.push(translated)
	}

	return translatedChunks.join(' ')
}

const translateTextWithCommunityFallback = async (text, targetLanguage) => {
	try {
		return {
			text: await translateTextWithGoogleCommunity(text, targetLanguage),
			provider: 'google-community',
		}
	} catch (error) {
		if (error.response?.status === 429) {
			throw new TranslationRateLimitError('Community translator rate limit exceeded')
		}
		throw new TranslationProviderError(error.message)
	}
}

const translateSubsetWithCommunityFallback = async (value, targetLanguage, providerRef) => {
	if (typeof value === 'string') {
		const result = await translateTextWithCommunityFallback(value, targetLanguage)
		providerRef.provider = result.provider
		return result.text
	}

	if (Array.isArray(value)) {
		const translated = []
		for (const item of value) {
			translated.push(await translateSubsetWithCommunityFallback(item, targetLanguage, providerRef))
		}
		return translated
	}

	if (value && typeof value === 'object') {
		const translated = {}
		for (const [key, child] of Object.entries(value)) {
			translated[key] = await translateSubsetWithCommunityFallback(child, targetLanguage, providerRef)
		}
		return translated
	}

	return value
}

const translateWithGemini = async (translatableProfile, targetLanguage) => {
	const apiKey = process.env.GEMINI_API_KEY
	if (!apiKey) return null

	const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
	const prompt = buildPrompt(translatableProfile, targetLanguage)

	const response = await axios.post(
		endpoint,
		{
			contents: [
				{
					parts: [{ text: prompt }],
				},
			],
			generationConfig: {
				temperature: 0.1,
				responseMimeType: 'application/json',
			},
		},
		{
			params: { key: apiKey },
			timeout: 45000,
		}
	)

	const text = response.data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || ''
	return extractJson(text)
}

class ShareableLinkTranslationService {
	static normalizeLanguage(value) {
		return normalizeLanguage(value)
	}

	static getSupportedLanguages() {
		return SUPPORTED_LANGUAGES
	}

	static prepareSourceProfile(profile) {
		return parseJsonTextFields(profile)
	}

	static hashProfile(profile) {
		return hashProfile(profile)
	}

	static async translateProfile(profile, language) {
		const targetLanguage = normalizeLanguage(language)
		const sourceProfile = parseJsonTextFields(profile)

		if (targetLanguage === 'ja') {
			return {
				payload: sourceProfile,
				status: 'not_required',
				translatedAt: null,
				error: null,
				hash: hashProfile(sourceProfile),
			}
		}

		const translatableProfile = pickTranslatableFields(sourceProfile)
		if (!translatableProfile) {
			return {
				payload: sourceProfile,
				status: 'not_required',
				translatedAt: null,
				error: null,
				hash: hashProfile(sourceProfile),
			}
		}

		let translatedSubset
		let provider = 'gemini'
		try {
			translatedSubset = await translateWithGemini(translatableProfile, targetLanguage)
		} catch (error) {
			const shouldFallback = error.response?.status === 429 || error.response?.status >= 500 || ['ECONNABORTED', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'].includes(error.code)
			if (!shouldFallback) {
				throw error
			}
		}

		if (!translatedSubset) {
			const providerRef = { provider: 'google-community' }
			translatedSubset = await translateSubsetWithCommunityFallback(translatableProfile, targetLanguage, providerRef)
			provider = providerRef.provider
		}

		const payload = mergeTranslatedFields(sourceProfile, translatedSubset)

		return {
			payload,
			status: `translated:${provider}`,
			translatedAt: new Date(),
			error: null,
			hash: hashProfile(sourceProfile),
		}
	}
}

module.exports = ShareableLinkTranslationService
