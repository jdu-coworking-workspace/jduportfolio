/**
 * Maps our DB recruiter (+ its company) to the Kintone "recruiters" app
 * record shape ({ fieldCode: { value } }), and back.
 *
 * Kintone field codes are the same ones the incoming webhook uses
 * (see recruiterController.webhookHandler): recruiterEmail, recruiterFirstName,
 * recruiterLastName, recruiterCompany, recruiterPhone.
 *
 * NOTE on isPartner: it is intentionally NOT written to Kintone from the web.
 * isPartner is an admin-controlled, company-level flag (managed via
 * PUT /api/companies/:id). Its Kintone field type (checkbox vs text) is
 * app-specific; writing a wrong-typed value would fail the whole record
 * create. If you later need to push it, confirm the Kintone field type and
 * add it here.
 */

/**
 * Build the Kintone record payload for create/update.
 * @param {object} recruiter - DB recruiter (plain or model instance values)
 * @param {object|null} company - linked company (for company_name)
 * @returns {object} Kintone record object
 */
const toKintoneRecord = (recruiter, company = null) => {
	const record = {}
	const set = (field, value) => {
		if (value !== undefined && value !== null) {
			record[field] = { value: String(value) }
		}
	}

	set('recruiterEmail', recruiter.email)
	set('recruiterFirstName', recruiter.first_name)
	set('recruiterLastName', recruiter.last_name)
	set('recruiterPhone', recruiter.phone)

	const companyName = company?.company_name ?? recruiter.company?.company_name ?? recruiter.company_name
	set('recruiterCompany', companyName)

	return record
}

/**
 * Extracts the Kintone record id from a create/update API response.
 * Kintone returns { id, revision } on create.
 */
const extractKintoneId = response => response?.id ?? response?.record?.id?.value ?? null

module.exports = { toKintoneRecord, extractKintoneId }
