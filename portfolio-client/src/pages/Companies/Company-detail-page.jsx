import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1'
import PersonRemoveIcon from '@mui/icons-material/PersonRemove'
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, FormControlLabel, IconButton, List, ListItem, ListItemAvatar, ListItemSecondaryAction, ListItemText, Paper, Snackbar, Stack, Switch, TextField, Typography } from '@mui/material'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { assignRecruiter, getCompany, unassignRecruiter, updateCompany } from '../../lib/api/companies-api'
import RecruiterAssignDialog from './recruiter-assign-dialog'

const CompanyDetailPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const { activeUser, role } = useContext(UserContext)
	const isRecruiter = role === 'Staff' && activeUser?.companyId
	const canManageCompanies = role === 'Admin'
	const canEditCompanyIdentity = role === 'Admin'

	const [company, setCompany] = useState(null)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [assignOpen, setAssignOpen] = useState(false)
	const [toast, setToast] = useState(null) // { severity, message }

	// Identity (Admin only): company_name / isPartner
	const [name, setName] = useState('')
	const [isPartner, setIsPartner] = useState(false)

	const load = async () => {
		setLoading(true)
		try {
			const data = await getCompany(id)
			setCompany(data)
			setName(data.company_name || '')
			setIsPartner(!!data.isPartner)
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		load()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [id])

	const saveIdentity = async () => {
		setSaving(true)
		try {
			const data = await updateCompany(id, { company_name: name, isPartner })
			setCompany(data)
			setToast({ severity: 'success', message: 'Kompaniya ma\u02bclumotlari yangilandi' })
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		} finally {
			setSaving(false)
		}
	}

	const saveProfile = async profileValues => {
		setSaving(true)
		try {
			const data = await updateCompany(id, profileValues)
			setCompany(data)
			setToast({ severity: 'success', message: 'Profil saqlandi' })
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		} finally {
			setSaving(false)
		}
	}

	const handleAssign = async recruiterId => {
		try {
			const data = await assignRecruiter(id, recruiterId)
			setCompany(data)
			setAssignOpen(false)
			setToast({ severity: 'success', message: 'Recruiter biriktirildi' })
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		}
	}

	const handleUnassign = async recruiterId => {
		try {
			const data = await unassignRecruiter(id, recruiterId)
			setCompany(data)
			setToast({ severity: 'success', message: 'Biriktiruv olib tashlandi' })
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		}
	}

	if (loading) {
		return (
			<Box display='flex' justifyContent='center' py={6}>
				<CircularProgress />
			</Box>
		)
	}

	if (!company) return null

	return (
		<Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 3 } }}>
			<Stack direction='row' alignItems='center' spacing={1} sx={{ mb: 2 }}>
				<IconButton onClick={() => navigate('/companies')} aria-label='Orqaga'>
					<ArrowBackIcon />
				</IconButton>
				<Typography variant='h5' fontWeight={700} sx={{ flex: 1 }}>
					{company.company_name}
				</Typography>
				{company.isPartner && <Chip label='Hamkor' color='secondary' size='small' />}
			</Stack>

			{canEditCompanyIdentity && (
				<Paper variant='outlined' sx={{ p: 2.5, mb: 3 }}>
					<Typography variant='subtitle1' fontWeight={600} sx={{ mb: 2 }}>
						Kompaniya nomi va holati
					</Typography>
					<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems='center'>
						<TextField label='Kompaniya nomi' value={name} onChange={e => setName(e.target.value)} fullWidth size='small' />
						<FormControlLabel control={<Switch checked={isPartner} onChange={e => setIsPartner(e.target.checked)} />} label='Hamkor (isPartner)' />
						<Button variant='contained' onClick={saveIdentity} disabled={saving || !name.trim()} sx={{ whiteSpace: 'nowrap' }}>
							Saqlash
						</Button>
					</Stack>
				</Paper>
			)}

			{/* <Paper variant='outlined' sx={{ p: 2.5, mb: 3 }}>
				<Typography variant='subtitle1' fontWeight={600} sx={{ mb: 2 }}>
					Kompaniya profili
				</Typography>
				<CompanyProfileForm defaultValues={company} onSubmit={saveProfile} saving={saving} />
			</Paper> */}

			<Paper variant='outlined' sx={{ p: 2.5 }}>
				<Stack direction='row' justifyContent='space-between' alignItems='center' sx={{ mb: 1 }}>
					<Typography variant='subtitle1' fontWeight={600}>
						Recruiterlar ({company.recruiters?.length || 0})
					</Typography>
					{canManageCompanies && (
						<Button startIcon={<PersonAddAlt1Icon />} onClick={() => setAssignOpen(true)} size='small'>
							Biriktirish
						</Button>
					)}
				</Stack>
				<Divider sx={{ mb: 1 }} />
				<List>
					{(company.recruiters || []).map(r => (
						<ListItem key={r.id} disableGutters>
							<ListItemAvatar>
								<Avatar src={r.photo || undefined}>{r.first_name?.[0] || '?'}</Avatar>
							</ListItemAvatar>
							<ListItemText primary={`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email} secondary={r.email} />
							{canManageCompanies && (
								<ListItemSecondaryAction>
									<IconButton edge='end' aria-label='Biriktiruvni olib tashlash' onClick={() => handleUnassign(r.id)}>
										<PersonRemoveIcon fontSize='small' />
									</IconButton>
								</ListItemSecondaryAction>
							)}
						</ListItem>
					))}
					{(!company.recruiters || company.recruiters.length === 0) && (
						<Typography color='text.secondary' fontSize={14} sx={{ py: 1 }}>
							Hozircha recruiter biriktirilmagan
						</Typography>
					)}
				</List>
			</Paper>

			<RecruiterAssignDialog open={assignOpen} onClose={() => setAssignOpen(false)} onAssign={handleAssign} currentCompanyId={company.id} />

			<Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
				{toast && (
					<Alert severity={toast.severity} onClose={() => setToast(null)}>
						{toast.message}
					</Alert>
				)}
			</Snackbar>
		</Box>
	)
}

export default CompanyDetailPage
