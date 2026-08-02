import AddIcon from '@mui/icons-material/Add'
import { Box, Button, Stack } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import Filter from '../../components/Filter/Filter'
import Table from '../../components/Table/Table'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import RecruiterFormDialog from './Recruiter-form-dialog'

const Recruiter = () => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const navigate = useNavigate()
	const role = sessionStorage.getItem('role')

	const [filterState, setFilterState] = useState({})
	const [refreshTrigger, setRefreshTrigger] = useState(0)
	const [formDialogOpen, setFormDialogOpen] = useState(false)
	const [editingRecruiter, setEditingRecruiter] = useState(null)

	const handleAddClick = () => {
		setEditingRecruiter(null)
		setFormDialogOpen(true)
	}

	const handleFormDialogClose = () => {
		setFormDialogOpen(false)
		setEditingRecruiter(null)
	}

	const handleSaved = () => {
		setRefreshTrigger(prev => prev + 1)
	}

	// Called from the "..." action menu. Table only passes the row id, so we
	// fetch the full (nested company) recruiter before opening the dialog.
	const handleEditAction = async id => {
		try {
			const res = await axios.get(`/api/recruiters/${id}`)
			setEditingRecruiter(res.data)
			setFormDialogOpen(true)
		} catch (error) {
			console.error('Failed to load recruiter:', error)
		}
		// Returning a value (not undefined) so Table's own (unused) refresher
		// logic doesn't fire — we control refetching via refreshTrigger.
		return true
	}

	// Called from the delete_icon column. Table shows its own confirmation
	// modal ("この採用担当者を削除しますか？") before invoking this.
	const handleDeleteAction = async id => {
		const confirmed = window.confirm(t('confirm_delete_recruiter') || 'Are you sure you want to delete this recruiter?')

		if (!confirmed) return

		try {
			await axios.delete(`/api/recruiters/${id}`)
			setRefreshTrigger(prev => prev + 1)
			toast.success(t('delete_recruiter_success') || 'Recruiter deleted successfully')
		} catch (error) {
			console.error('Failed to delete recruiter:', error)
			alert(t('delete_recruiter_failed') || 'Failed to delete recruiter')
		}
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
					// Edit — recruiterning o'zi, Admin va Staff PUT qila oladi (0.4-band).
					// Table.jsx 'action' menu itemlari faqat bitta rolga mos keladi
					// (option.visibleTo === role), shuning uchun har rol uchun alohida
					// yozuv beramiz — ikkalasi ham bir xil handleEditAction'ga ishora qiladi.
					{
						id: 'edit-action',
						keyIdentifier: 'edit-action',
						label: '',
						type: 'action',
						minWidth: '50px',
						visibleTo: ['Admin', 'Staff'],
						options: [
							{ label: t('edit') || 'Edit', visibleTo: 'Admin', action: handleEditAction },
							{ label: t('delete') || 'Delete', visibleTo: 'Admin', action: handleDeleteAction },
							{ label: t('edit') || 'Edit', visibleTo: 'Staff', action: handleEditAction },
						],
					},
					// Delete — faqat Admin (0.3-band: DELETE /api/recruiters/:id Admin uchun).
					// {
					// 	id: 'delete-action',
					// 	keyIdentifier: 'delete-action',
					// 	label: '',
					// 	type: 'delete_icon',
					// 	minWidth: '50px',
					// 	visibleTo: ['Admin'],
					// 	onClickAction: handleDeleteAction,
					// },
				]

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
		refreshTrigger,
	}

	const handleFilterChange = value => {
		setFilterState(value)
	}

	return (
		<div>
			<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent='space-between' sx={{ mb: 2 }}>
				<Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<Filter fields={filterProps} filterState={filterState} onFilterChange={handleFilterChange} />
					{/* Recruiter yaratish faqat Admin uchun (0.2 / 2.3-band) */}
					{role === 'Admin' && (
						<Button variant='contained' startIcon={<AddIcon />} onClick={handleAddClick} sx={{ ml: 2, whiteSpace: 'nowrap' }}>
							{t('add_recruiter')}
						</Button>
					)}
				</Box>
			</Stack>

			<Table tableProps={tableProps} />

			<RecruiterFormDialog open={formDialogOpen} onClose={handleFormDialogClose} onSaved={handleSaved} recruiter={editingRecruiter} />
		</div>
	)
}

export default Recruiter
