/**
 * Single source of truth for which fields belong to the Recruiter (personal
 * account) vs the Company (company profile) after the Recruiter/Company split.
 */

// Personal recruiter account fields that can be updated via API
const RECRUITER_UPDATABLE_FIELDS = ['first_name', 'last_name', 'first_name_furigana', 'last_name_furigana', 'phone', 'email', 'photo', 'date_of_birth', 'active', 'kintone_id']

// Company profile fields that can be updated via API
const COMPANY_UPDATABLE_FIELDS = ['company_name', 'company_description', 'gallery', 'company_Address', 'established_Date', 'employee_Count', 'business_overview', 'target_audience', 'required_skills', 'welcome_skills', 'work_location', 'work_hours', 'salary', 'benefits', 'selection_process', 'company_video_url', 'tagline', 'company_website', 'company_capital', 'company_revenue', 'company_representative', 'job_title', 'job_description', 'number_of_openings', 'employment_type', 'probation_period', 'employment_period', 'recommended_skills', 'recommended_licenses', 'recommended_other', 'salary_increase', 'bonus', 'allowances', 'holidays_vacation', 'other_notes', 'interview_method', 'japanese_level', 'application_requirements_other', 'retirement_benefit', 'telework_availability', 'housing_availability', 'relocation_support', 'airport_pickup', 'intro_page_thumbnail', 'intro_page_links']

// Company fields only Admin may change
const COMPANY_ADMIN_ONLY_FIELDS = ['company_name', 'isPartner']

/**
 * Picks only the allowed keys (and only ones actually present) from a body.
 */
const pickFields = (source, allowedFields) => {
	const picked = {}
	if (!source || typeof source !== 'object') return picked
	allowedFields.forEach(field => {
		if (source[field] !== undefined) {
			picked[field] = source[field]
		}
	})
	return picked
}

module.exports = {
	RECRUITER_UPDATABLE_FIELDS,
	COMPANY_UPDATABLE_FIELDS,
	COMPANY_ADMIN_ONLY_FIELDS,
	pickFields,
}
