const SEASON_MAP = {
	en: {
		spring: 'Spring',
		fall: 'Fall',
	},
	ja: {
		spring: '春',
		fall: '秋',
	},
	uz: {
		spring: 'Bahor',
		fall: 'Kuz',
	},
	ru: {
		spring: 'Весна',
		fall: 'Осень',
	},
}

const normalizeLanguage = language => {
	if (!language) return 'en'
	if (language.startsWith('ja')) return 'ja'
	if (language.startsWith('uz')) return 'uz'
	if (language.startsWith('ru')) return 'ru'
	return 'en'
}

const resolveLocale = language => {
	const lang = normalizeLanguage(language)
	if (lang === 'ja') return 'ja-JP'
	if (lang === 'uz') return 'uz-UZ'
	if (lang === 'ru') return 'ru-RU'
	return 'en-US'
}

const parseSeason = seasonRaw => {
	if (!seasonRaw) return null
	const season = String(seasonRaw).trim().toLowerCase()
	if (season === '春' || season === 'spring') return 'spring'
	if (season === '秋' || season === 'fall' || season === 'autumn') return 'fall'
	return null
}

const parseGraduationMonth = value => {
	if (!value) return null
	const raw = String(value).trim()
	if (!raw) return null

	// YYYY-MM-DD
	let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
	if (match) {
		return {
			year: Number(match[1]),
			month: Number(match[2]),
			season: null,
		}
	}

	// YYYY-MM
	match = raw.match(/^(\d{4})-(\d{2})$/)
	if (match) {
		return {
			year: Number(match[1]),
			month: Number(match[2]),
			season: null,
		}
	}

	// YYYY年MM月 + optional season (e.g. 秋/春)
	match = raw.match(/^(\d{4})年(\d{1,2})月(?:\s*(春|秋|spring|fall|autumn))?$/i)
	if (match) {
		return {
			year: Number(match[1]),
			month: Number(match[2]),
			season: parseSeason(match[3]),
		}
	}

	return null
}

const getLocalizedSeason = (season, language) => {
	if (!season) return ''
	const lang = normalizeLanguage(language)
	return SEASON_MAP[lang]?.[season] || SEASON_MAP.en[season] || ''
}

export const formatGraduationMonth = (value, language) => {
	const parsed = parseGraduationMonth(value)
	if (!parsed) return value

	const { year, month, season } = parsed
	if (!year || !month) return value

	const locale = resolveLocale(language)
	const date = new Date(year, month - 1, 1)
	const localizedSeason = getLocalizedSeason(season, language)
	const lang = normalizeLanguage(language)

	if (lang === 'ja') {
		return `${year}年${String(month).padStart(2, '0')}月${localizedSeason}`
	}

	const monthLabel = date.toLocaleString(locale, { month: 'long' })
	return localizedSeason ? `${monthLabel} ${year} (${localizedSeason})` : `${monthLabel} ${year}`
}
