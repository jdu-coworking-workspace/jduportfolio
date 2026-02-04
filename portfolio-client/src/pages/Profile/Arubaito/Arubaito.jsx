import { Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import WorkOutlineIcon from '@mui/icons-material/WorkOutline'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'

const Arubaito = ({ arubaito = [], editMode = false, onUpdate, t = key => key, isChanged = false }) => {
	const [editingIndex, setEditingIndex] = useState(null)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({
		company: '',
		role: '',
		period: '',
	})
	const [anchorEl, setAnchorEl] = React.useState(null)
	const [currentMenuIndex, setCurrentMenuIndex] = React.useState(null)

	const handleClick = (event, index) => {
		setAnchorEl(event.currentTarget)
		setCurrentMenuIndex(index)
	}

	const handleClose = () => {
		setAnchorEl(null)
		setCurrentMenuIndex(null)
	}

	const resetForm = () => {
		setFormData({
			company: '',
			role: '',
			period: '',
		})
		setEditingIndex(null)
		setShowForm(false)
	}

	const handleEdit = index => {
		const item = arubaito[index]
		setFormData({ ...item })
		setEditingIndex(index)
		setShowForm(true)
		handleClose()
	}

	const handleDelete = index => {
		const updated = arubaito.filter((_, i) => i !== index)
		onUpdate('arubaito', updated)
		handleClose()
	}

	const handleSubmit = () => {
		if (!formData.company || !formData.period) return

		let updated
		if (editingIndex !== null) {
			updated = [...arubaito]
			updated[editingIndex] = { ...formData }
		} else {
			updated = [...arubaito, { ...formData }]
		}

		onUpdate('arubaito', updated)
		resetForm()
	}

	const handleAdd = () => {
		resetForm()
		setShowForm(true)
	}

	return (
		<Box
			sx={{
				backgroundColor: isChanged ? '#fff3cd' : 'transparent',
				border: isChanged ? '2px solid #ffc107' : 'none',
				borderRadius: isChanged ? '10px' : '0',
				padding: isChanged ? 2 : 0,
				position: 'relative',
				marginTop: 2,
			}}
		>
			{isChanged && (
				<div
					style={{
						position: 'absolute',
						top: 8,
						right: 8,
						backgroundColor: '#ffc107',
						color: '#000',
						padding: '2px 8px',
						borderRadius: 4,
						fontSize: 12,
						fontWeight: 600,
					}}
				>
					Changed
				</div>
			)}
			<div
				style={{
					fontSize: 20,
					fontWeight: 600,
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 20,
					marginTop: isChanged ? 0 : 40,
				}}
			>
				<WorkOutlineIcon sx={{ color: '#5627DB' }} />
				{t('arubaito')}
				{editMode && (
					<Button startIcon={<AddIcon />} variant='outlined' size='small' onClick={handleAdd} sx={{ ml: 2 }}>
						{t('add')}
					</Button>
				)}
			</div>

			<div>
				{arubaito && arubaito.length > 0 ? (
					<Box display='flex' flexDirection='column' gap={2}>
						{arubaito.map((item, index) => (
							<Box
								key={`${item.company || 'company'}-${index}`}
								display='flex'
								flexDirection={{ xs: 'column', sm: 'row' }}
								justifyContent='space-between'
								alignItems='flex-start'
								p={2}
								sx={{
									borderRadius: 2,
									border: '1px solid',
									borderColor: 'grey.200',
									backgroundColor: 'background.paper',
									position: 'relative',
								}}
							>
								<Box flex={1}>
									<Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
										{item.company}
									</Typography>
									{item.role && (
										<Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
											{item.role}
										</Typography>
									)}
								</Box>

								<Box display='flex' alignItems='center' gap={1} mt={{ xs: 1, sm: 0 }}>
									<Typography variant='body2' color='text.secondary'>
										{item.period}
									</Typography>
									{editMode && (
										<>
											<IconButton onClick={e => handleClick(e, index)} aria-controls={currentMenuIndex === index ? 'arubaito-menu' : undefined} aria-haspopup='true' aria-expanded={currentMenuIndex === index ? 'true' : undefined}>
												<MoreVertIcon />
											</IconButton>
											<Menu id='arubaito-menu' anchorEl={anchorEl} open={currentMenuIndex === index} onClose={handleClose}>
												<MenuItem onClick={() => handleEdit(index)}>
													<EditIcon sx={{ mr: 1 }} />
													{t('edit')}
												</MenuItem>
												<MenuItem onClick={() => handleDelete(index)}>
													<DeleteIcon sx={{ mr: 1 }} color='error' />
													{t('delete')}
												</MenuItem>
											</Menu>
										</>
									)}
								</Box>
							</Box>
						))}
					</Box>
				) : (
					<Typography color='text.secondary'>{t('no_arubaito')}</Typography>
				)}
			</div>

			{/* Arubaito Form Dialog */}
			<Dialog open={showForm} onClose={resetForm} maxWidth='sm' fullWidth>
				<DialogTitle>{editingIndex !== null ? t('edit_arubaito') : t('add_arubaito_form')}</DialogTitle>
				<DialogContent>
					<Box display='flex' flexDirection='column' gap={2} mt={1}>
						<TextField label={t('company')} value={formData.company} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} required fullWidth placeholder={t('company_placeholder')} />
						<TextField label={t('role_position')} value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} fullWidth placeholder={t('role_placeholder')} />
						<TextField label={t('period')} value={formData.period} onChange={e => setFormData(prev => ({ ...prev, period: e.target.value }))} placeholder={t('period_placeholder')} required fullWidth />
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetForm}>{t('cancel')}</Button>
					<Button onClick={handleSubmit} variant='contained' disabled={!formData.company || !formData.period}>
						{editingIndex !== null ? t('update') : t('add')}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}

export default Arubaito
