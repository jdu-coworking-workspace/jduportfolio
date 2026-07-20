import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Box } from '@mui/material'

import Filter from '../../components/Filter/Filter'
import Table from '../../components/Table/Table'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'

const Recruiter = () => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const navigate = useNavigate()
	const role = sessionStorage.getItem('role')

	const navigateToCompanyProfile = recruiter => {
		navigate(`/companyprofile`, {
			state: { recruiterId: recruiter.id }, // passing state
		})
	}

	// NOTE (API o'zgarishi): GET /api/recruiters endi har bir qatorni
	// { id, email, first_name, ..., companyId, company: { company_name, ... } }
	// ko'rinishida qaytaradi — company_name endi flat emas, `company` obyekti
	// ichida keladi. Shaxsiy maydonlar (first_name/last_name/phone/email/photo)
	// hamon top-level'da, shuning uchun ular o'zgarishsiz qoladi.
	//
	// EnhancedTable (Table.jsx) header.id'ni to'g'ridan-to'g'ri flat kalit
	// sifatida o'qiydi: row[header.id]. 'company.company_name' kabi dot-path
	// ishlamaydi (row['company.company_name'] mavjud emas — shuning uchun N/A
	// chiqadi). Komponentda bitta bosqichli nested o'qish uchun tayyor mexanizm
	// bor — `subkey`: row[header.id][header.subkey]. Shu sabab id: 'company',
	// subkey: 'company_name' qilib beriladi.
	const headers =
		role === 'Student'
			? [
					{
						id: 'company',
						subkey: 'company_name',
						numeric: false,
						disablePadding: false,
						label: t('company_name'),
						type: 'company_summary',
						minWidth: 'auto',
						onClickAction: navigateToCompanyProfile,
					},
				]
			: [
					{
						id: 'name',
						numeric: false,
						disablePadding: true,
						label: t('recruiter'),
						type: 'avatar',
						minWidth: '160px',
						onClickAction: navigateToCompanyProfile,
					},
					{
						id: 'company',
						subkey: 'company_name',
						numeric: false,
						disablePadding: false,
						label: t('company_name'),
						minWidth: '220px',
					},
					{
						id: 'phone',
						numeric: true,
						disablePadding: false,
						label: t('phone_number'),
						minWidth: '160px',
					},
					{
						id: 'email',
						numeric: false,
						disablePadding: false,
						label: t('email'),
						type: 'email',
						minWidth: '220px',
						visibleTo: ['Admin', 'Staff'],
					},
				]

	const [filterState, setFilterState] = useState({})
	// must match with db table col names
	// Diqqat: filter kaliti hamon 'company_name' — backend filter[company_name]=...
	// ni avtomatik kompaniya jadvalidan qidirishni o'zi bajaradi (hujjat 2.1-bo'lim),
	// shuning uchun bu yerda nested path ('company.company_name') kerak emas.
	const filterProps =
		role === 'Student'
			? [
					{
						key: 'company_name',
						label: t('company_name'),
						type: 'text',
						minWidth: '200px',
					},
				]
			: [{ key: 'name', label: t('name'), type: 'text', minWidth: '160px' }]

	const tableProps = {
		headers: headers,
		dataLink: '/api/recruiters',
		filter: filterState,
	}

	const handleFilterChange = value => {
		setFilterState(value)
	}

	return (
		<div>
			<Box
				sx={{
					width: '100%',
					height: '100px',
					'@media (max-width:600px)': {
						marginBottom: '50px',
					},
				}}
			>
				<Filter fields={filterProps} filterState={filterState} onFilterChange={handleFilterChange} />
			</Box>
			<Table tableProps={tableProps} />
		</div>
	)
}

export default Recruiter
