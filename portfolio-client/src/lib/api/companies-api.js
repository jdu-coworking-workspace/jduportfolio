import { axiosInstance } from '../../utils/axiosUtils'
/**
 * Company API — doc 3-bo'lim asosida.
 * Barcha endpointlar auth (cookie) talab qiladi.
 */

// GET /api/companies?search=...&isPartner=true/false
export const getCompanies = async ({ search = '', isPartner } = {}) => {
	const params = {}
	if (search) params.search = search
	if (isPartner !== undefined && isPartner !== 'all') params.isPartner = isPartner

	const { data } = await axiosInstance.get('/companies', { params })
	return data
}

// GET /api/companies/:id
export const getCompany = async id => {
	const { data } = await axiosInstance.get(`/companies/${id}`)
	return data
}

// POST /api/companies  (Admin) — { company_name } majburiy
export const createCompany = async payload => {
	const { data } = await axiosInstance.post('/companies', payload)
	return data
}

// PUT /api/companies/:id
// Admin: barcha maydonlar (company_name, isPartner ham)
// Recruiter/Staff: faqat profil maydonlari (company_name/isPartner yuborilmasin)
export const updateCompany = async (id, payload) => {
	const { data } = await axiosInstance.put(`/companies/${id}`, payload)
	return data
}

// DELETE /api/companies/:id  (Admin)
export const deleteCompany = async id => {
	const { data } = await axiosInstance.delete(`/companies/${id}`)
	return data
}

// POST /api/companies/:id/recruiters  (Admin) — { recruiterId }
export const assignRecruiter = async (companyId, recruiterId) => {
	const { data } = await axiosInstance.post(`/companies/${companyId}/recruiters`, {
		recruiterId,
	})
	return data
}

// DELETE /api/companies/:id/recruiters/:recruiterId  (Admin)
export const unassignRecruiter = async (companyId, recruiterId) => {
	const { data } = await axiosInstance.delete(`/companies/${companyId}/recruiters/${recruiterId}`)
	return data
}

// Recruiter biriktirish dialogida qidirish uchun (doc 2.1)
export const searchRecruiters = async search => {
	const { data } = await axiosInstance.get('/recruiters', {
		params: { 'filter[search]': search },
	})
	return data
}
