import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SearchIcon from '@mui/icons-material/Search'
import { Alert, Avatar, AvatarGroup, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, MenuItem, Paper, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material'
import { debounce } from 'lodash'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import { createCompany, deleteCompany, getCompanies } from '../../lib/api/companies-api'
import CompanyCreateDialog from './Company-create-dialog'

const PARTNER_FILTERS = [
	{ value: 'all', label: 'Barchasi' },
	{ value: 'false', label: 'Faqat oddiy' },
	{ value: 'true', label: 'Faqat hamkor' },
]

export const Companies = () => {
	const navigate = useNavigate()
	const { activeUser, role } = useContext(UserContext)
	const isRecruiter = role === 'Staff' && activeUser?.companyId
	const canManageCompanies = role === 'Admin'
	// const { canManageCompanies, isRecruiter, user } = useAuth()

	const [companies, setCompanies] = useState([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')
	const [isPartner, setIsPartner] = useState('all')
	const [createOpen, setCreateOpen] = useState(false)
	const [creating, setCreating] = useState(false)
	const [createError, setCreateError] = useState('')
	const [toast, setToast] = useState(null)

	// Recruiter o'z akkaunti bilan kirsa, umumiy ro'yxat o'rniga to'g'ridan-to'g'ri
	// o'z kompaniyasi sahifasiga yo'naltiriladi (doc 4-bo'lim: login faqat recruiter orqali).
	useEffect(() => {
		if (isRecruiter && activeUser?.companyId) {
			navigate(`/companies/${activeUser.companyId}`, { replace: true })
		}
	}, [isRecruiter, activeUser, navigate])

	const fetchCompanies = useCallback(async params => {
		setLoading(true)
		try {
			const data = await getCompanies(params)
			setCompanies(Array.isArray(data) ? data : data?.items || [])
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		} finally {
			setLoading(false)
		}
	}, [])

	const debouncedFetch = useMemo(() => debounce(fetchCompanies, 350), [fetchCompanies])

	useEffect(() => {
		debouncedFetch({ search, isPartner })
		return () => debouncedFetch.cancel()
	}, [search, isPartner, debouncedFetch])

	const handleCreate = async values => {
		setCreating(true)
		setCreateError('')
		try {
			await createCompany(values)
			setCreateOpen(false)
			setToast({ severity: 'success', message: 'Kompaniya yaratildi' })
			fetchCompanies({ search, isPartner })
		} catch (err) {
			// 409 — company_name unikal emas
			setCreateError(err.message)
		} finally {
			setCreating(false)
		}
	}

	const handleDelete = async (e, company) => {
		e.stopPropagation()
		if (!window.confirm(`"${company.company_name}" o'chirilsinmi? Recruiterlar saqlanib qoladi.`)) {
			return
		}
		try {
			await deleteCompany(company.id)
			setToast({ severity: 'success', message: 'Kompaniya o\u02bbchirildi' })
			setCompanies(prev => prev.filter(c => c.id !== company.id))
		} catch (err) {
			setToast({ severity: 'error', message: err.message })
		}
	}

	if (isRecruiter) {
		return (
			<Box display='flex' justifyContent='center' py={6}>
				<CircularProgress />
			</Box>
		)
	}

	return (
		<Box
			sx={{ maxWidth: 1400, mx: 'auto', p: { xs: 2, md: 3 } }}
			onClick={e => {
				console.log(activeUser)
			}}
		>
			<Stack direction={{ xs: 'column', sm: 'row' }} justifyContent='space-between' alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 3 }}>
				<Typography variant='h5' fontWeight={700}>
					Kompaniyalar
				</Typography>
				{canManageCompanies && (
					<Button variant='contained' startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
						Yangi kompaniya
					</Button>
				)}
			</Stack>

			<Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
				<TextField
					placeholder="Nomi, manzili, vakili bo'yicha qidirish..."
					value={search}
					onChange={e => setSearch(e.target.value)}
					fullWidth
					size='small'
					InputProps={{
						startAdornment: (
							<InputAdornment position='start'>
								<SearchIcon fontSize='small' />
							</InputAdornment>
						),
					}}
				/>
				<TextField select size='small' value={isPartner} onChange={e => setIsPartner(e.target.value)} sx={{ minWidth: 180 }}>
					{PARTNER_FILTERS.map(opt => (
						<MenuItem key={opt.value} value={opt.value}>
							{opt.label}
						</MenuItem>
					))}
				</TextField>
			</Stack>

			<Paper variant='outlined'>
				<TableContainer>
					<Table>
						<TableHead>
							<TableRow>
								<TableCell>Nomi</TableCell>
								<TableCell>Vakil</TableCell>
								<TableCell>Manzil</TableCell>
								<TableCell>Holati</TableCell>
								<TableCell>Recruiterlar</TableCell>
								{canManageCompanies && <TableCell align='right' />}
							</TableRow>
						</TableHead>
						<TableBody>
							{loading && (
								<TableRow>
									<TableCell colSpan={6} align='center' sx={{ py: 4 }}>
										<CircularProgress size={24} />
									</TableCell>
								</TableRow>
							)}
							{!loading && companies.length === 0 && (
								<TableRow>
									<TableCell colSpan={6} align='center' sx={{ py: 4 }}>
										<Typography color='text.secondary'>Hech qanday kompaniya topilmadi</Typography>
									</TableCell>
								</TableRow>
							)}
							{!loading &&
								companies.map(company => (
									<TableRow key={company.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/companies/${company.id}`)}>
										<TableCell sx={{ fontWeight: 600 }}>{company.company_name}</TableCell>
										<TableCell>{company.company_representative || '\u2014'}</TableCell>
										<TableCell>{company.company_Address || '\u2014'}</TableCell>
										<TableCell>{company.isPartner ? <Chip label='Hamkor' color='secondary' size='small' /> : <Chip label='Oddiy' size='small' variant='outlined' />}</TableCell>
										<TableCell>
											<AvatarGroup max={3}>
												{(company.recruiters || []).map(r => (
													<Tooltip key={r.id} title={`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email}>
														<Avatar src={r.photo || undefined} sx={{ width: 40, height: 40, fontSize: 13 }}>
															{r.first_name?.[0] || '?'}
														</Avatar>
													</Tooltip>
												))}
											</AvatarGroup>
										</TableCell>
										{canManageCompanies && (
											<TableCell align='right'>
												<IconButton size='small' aria-label="Kompaniyani o'chirish" onClick={e => handleDelete(e, company)}>
													<DeleteOutlineIcon fontSize='small' />
												</IconButton>
											</TableCell>
										)}
									</TableRow>
								))}
						</TableBody>
					</Table>
				</TableContainer>
			</Paper>

			<CompanyCreateDialog
				open={createOpen}
				onClose={() => {
					setCreateOpen(false)
					setCreateError('')
				}}
				onCreate={handleCreate}
				saving={creating}
				serverError={createError}
			/>

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
