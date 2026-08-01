import CloseIcon from '@mui/icons-material/Close'
import { Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, Stack, TextField, Typography } from '@mui/material'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'

const EMPTY_FORM = {
	email: '',
	password: '',
	first_name: '',
	last_name: '',
	phone: '',
}

/**
 * Create / edit dialog for recruiters.
 *
 * Create flow (Admin only):
 *   - Requires a company. Either pick an existing one (GET /api/companies)
 *     or create a new one inline (POST /api/companies), then
 *     POST /api/recruiters with the resulting companyId.
 *   - Kintone-first: if creation fails (502), the recruiter is NOT created
 *     and the returned error is shown as-is.
 *
 * Edit flow (self / Admin / Staff):
 *   - Only top-level personal fields are sent (first_name, last_name,
 *     phone, email, password + currentPassword). company_name / isPartner
 *     can never be changed here (400 if attempted), so company is shown
 *     read-only and never submitted.
 */
const RecruiterFormDialog = ({ open, onClose, onSaved, recruiter }) => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const isEdit = Boolean(recruiter)

	const [form, setForm] = useState(EMPTY_FORM)
	const [currentPassword, setCurrentPassword] = useState('')
	const [companies, setCompanies] = useState([])
	const [companyId, setCompanyId] = useState(null)
	const [isNewCompany, setIsNewCompany] = useState(false)
	const [newCompanyName, setNewCompanyName] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')

	// Company dropdown is only needed when creating a new recruiter
	useEffect(() => {
		if (!open || isEdit) return
		axios
			.get('/api/companies')
			.then(res => setCompanies(res.data || []))
			.catch(() => setCompanies([]))
	}, [open, isEdit])

	// (Re)initialize form whenever the dialog opens
	useEffect(() => {
		if (!open) return
		setError('')
		setCurrentPassword('')
		setIsNewCompany(false)
		setNewCompanyName('')

		if (isEdit && recruiter) {
			setForm({
				email: recruiter.email || '',
				password: '',
				first_name: recruiter.first_name || '',
				last_name: recruiter.last_name || '',
				phone: recruiter.phone || '',
			})
			setCompanyId(recruiter.companyId ?? null)
		} else {
			setForm(EMPTY_FORM)
			setCompanyId(null)
		}
	}, [open, isEdit, recruiter])

	const handleChange = field => e => {
		setForm(prev => ({ ...prev, [field]: e.target.value }))
	}

	const handleClose = () => {
		if (loading) return
		onClose()
	}

	const extractErrorMessage = err => {
		if (err.response?.status === 502) {
			return err.response?.data?.message || t('kintone_create_failed') || 'Failed to create recruiter in Kintone. Recruiter was not created.'
		}
		return err.response?.data?.message || err.response?.data?.error || t('something_went_wrong') || 'Something went wrong'
	}

	const handleSubmit = async () => {
		setError('')

		if (!isEdit) {
			if (!form.email || !form.password || !form.first_name || !form.last_name) {
				setError(t('fill_required_fields') || 'Please fill in all required fields')
				return
			}
			if (!isNewCompany && !companyId) {
				setError(t('select_company') || 'Please select a company')
				return
			}
			if (isNewCompany && !newCompanyName.trim()) {
				setError(t('company_name_required') || 'Company name is required')
				return
			}
		} else if (!form.first_name || !form.last_name) {
			setError(t('fill_required_fields') || 'Please fill in all required fields')
			return
		}

		setLoading(true)
		try {
			if (isEdit) {
				const payload = {
					first_name: form.first_name,
					last_name: form.last_name,
					phone: form.phone,
					email: form.email,
				}
				if (form.password) {
					payload.password = form.password
					payload.currentPassword = currentPassword
				}
				await axios.put(`/api/recruiters/${recruiter.id}`, payload)
			} else {
				let finalCompanyId = companyId
				if (isNewCompany) {
					const companyRes = await axios.post('/api/companies', { company_name: newCompanyName.trim() })
					finalCompanyId = companyRes.data.id
				}

				await axios.post('/api/recruiters', {
					email: form.email,
					password: form.password,
					first_name: form.first_name,
					last_name: form.last_name,
					phone: form.phone,
					companyId: finalCompanyId,
				})
			}

			setLoading(false)
			onSaved()
			onClose()
		} catch (err) {
			setLoading(false)
			setError(extractErrorMessage(err))
		}
	}

	return (
		<Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
			<DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
				{isEdit ? t('edit_recruiter') || 'Edit recruiter' : t('add_recruiter') || 'Add recruiter'}
				<IconButton onClick={handleClose} size='small' disabled={loading}>
					<CloseIcon fontSize='small' />
				</IconButton>
			</DialogTitle>
			<Divider />
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{error && (
						<Typography color='error' variant='body2'>
							{error}
						</Typography>
					)}

					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
						<TextField label={t('first_name') || 'First name'} value={form.first_name} onChange={handleChange('first_name')} fullWidth required />
						<TextField label={t('last_name') || 'Last name'} value={form.last_name} onChange={handleChange('last_name')} fullWidth required />
					</Stack>

					<TextField label={t('email') || 'Email'} type='email' value={form.email} onChange={handleChange('email')} fullWidth required />

					<TextField label={t('phone_number') || 'Phone'} value={form.phone} onChange={handleChange('phone')} fullWidth />

					{!isEdit && <TextField label={t('password') || 'Password'} type='password' value={form.password} onChange={handleChange('password')} fullWidth required />}

					{isEdit && (
						<>
							<Divider textAlign='left'>{t('change_password') || 'Change password (optional)'}</Divider>
							<TextField label={t('current_password') || 'Current password'} type='password' value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} fullWidth />
							<TextField label={t('new_password') || 'New password'} type='password' value={form.password} onChange={handleChange('password')} fullWidth />
						</>
					)}

					{!isEdit && (
						<>
							<Divider textAlign='left'>{t('company') || 'Company'}</Divider>
							{!isNewCompany ? (
								<Stack spacing={1}>
									<Autocomplete options={companies} getOptionLabel={option => option.company_name || ''} isOptionEqualToValue={(option, value) => option.id === value.id} value={companies.find(c => c.id === companyId) || null} onChange={(_, value) => setCompanyId(value ? value.id : null)} renderInput={params => <TextField {...params} label={t('select_company') || 'Select company'} required />} />
									<Button size='small' onClick={() => setIsNewCompany(true)} sx={{ alignSelf: 'flex-start' }}>
										{t('create_new_company') || '+ Create new company'}
									</Button>
								</Stack>
							) : (
								<Stack spacing={1}>
									<TextField label={t('company_name') || 'Company name'} value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} fullWidth required />
									<Button size='small' onClick={() => setIsNewCompany(false)} sx={{ alignSelf: 'flex-start' }}>
										{t('choose_existing_company') || 'Choose existing company'}
									</Button>
								</Stack>
							)}
						</>
					)}

					{isEdit && recruiter?.company?.company_name && <TextField label={t('company_name') || 'Company'} value={recruiter.company.company_name} fullWidth disabled helperText={t('company_change_hint') || 'Company can only be changed from the company page'} />}
				</Stack>
			</DialogContent>
			<Divider />
			<DialogActions sx={{ p: 2 }}>
				<Button onClick={handleClose} disabled={loading}>
					{t('cancel') || 'Cancel'}
				</Button>
				<Button variant='contained' onClick={handleSubmit} disabled={loading}>
					{loading ? t('saving') || 'Saving...' : t('save') || 'Save'}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

RecruiterFormDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onSaved: PropTypes.func.isRequired,
	recruiter: PropTypes.object,
}

export default RecruiterFormDialog
