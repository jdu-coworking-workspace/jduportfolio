const PARTNER_UNIVERSITY_KEY_MAP = {
	// Japanese (stored/raw values)
	東京通信大学: 'tokyo_communication_university',
	京都橘大学: 'kyoto_tachibana_university',
	産業能率大学: 'sanno_university',
	自由が丘産能短期大学: 'sanno_junior_college',
	新潟産業大学: 'niigata_sangyo_university',
	大手前大学: 'otemae_university',
	岡山理科大学: 'okayama_university_of_science',
	未所属: 'unaffiliated',
	なし: 'none',
	'40単位モデル': 'none',

	// English variants
	'Tokyo Communication University': 'tokyo_communication_university',
	'Kyoto Tachibana University': 'kyoto_tachibana_university',
	'Sanno University': 'sanno_university',
	'Sanno Junior College (Jiyugaoka)': 'sanno_junior_college',
	'Niigata Sangyo University': 'niigata_sangyo_university',
	'Otemae University': 'otemae_university',
	'Okayama University of Science': 'okayama_university_of_science',
	Unaffiliated: 'unaffiliated',
	None: 'none',
}

const normalizeValue = value => String(value || '').trim()

export const getPartnerUniversityTranslationKey = value => PARTNER_UNIVERSITY_KEY_MAP[normalizeValue(value)] || null

export const formatPartnerUniversity = (value, t) => {
	if (!value) return value
	const key = getPartnerUniversityTranslationKey(value)
	return key ? t(key) : value
}
