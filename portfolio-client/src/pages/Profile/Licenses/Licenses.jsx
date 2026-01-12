import { Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'

export const Licenses = ({ licenses = [], onUpdate, editMode, t = key => key }) => {
	const [editingIndex, setEditingIndex] = useState(null)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({
		year: '',
		month: '',
		certifacateName: '',
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
			year: '',
			month: '',
			certifacateName: '',
		})
		setEditingIndex(null)
		setShowForm(false)
	}

	const handleEdit = index => {
		const item = licenses[index]
		setFormData({ ...item })
		setEditingIndex(index)
		setShowForm(true)
		handleClose()
	}

	const handleDelete = index => {
		const updated = licenses.filter((_, i) => i !== index)
		onUpdate('licenses', updated)
		handleClose()
	}

	const handleSubmit = () => {
		if (!formData.year || !formData.certifacateName) return

		let updated
		if (editingIndex !== null) {
			updated = [...licenses]
			updated[editingIndex] = { ...formData }
		} else {
			updated = [...licenses, { ...formData }]
		}

		onUpdate('licenses', updated)
		resetForm()
	}

	const handleAdd = () => {
		resetForm()
		setShowForm(true)
	}

	return (
		<Box>
			<div
				style={{
					fontSize: 20,
					fontWeight: 600,
					display: 'flex',
					alignItems: 'center',
					gap: 8,
					marginBottom: 20,
				}}
			>
				<WorkspacePremiumOutlinedIcon sx={{ color: '#5627DB' }} />
				{t('licenses') || '資格・免許'}
				{editMode && (
					<Button startIcon={<AddIcon />} variant='outlined' size='small' onClick={handleAdd} sx={{ ml: 2 }}>
						{t('add')}
					</Button>
				)}
			</div>

			<div>
				{licenses && licenses.length > 0 ? (
					<Box display='flex' flexDirection='column' gap={2}>
						{licenses.map((item, index) => (
							<Box
								key={`${item.certifacateName || 'certificate'}-${index}`}
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
										{item.certifacateName}
									</Typography>
								</Box>

								<Box display='flex' alignItems='center' gap={1} mt={{ xs: 1, sm: 0 }}>
									<Typography variant='body2' color='text.secondary'>
										{item.year}
										{item.month && ` / ${item.month}`}
									</Typography>
									{editMode && (
										<>
											<IconButton onClick={e => handleClick(e, index)} aria-controls={currentMenuIndex === index ? 'licenses-menu' : undefined} aria-haspopup='true' aria-expanded={currentMenuIndex === index ? 'true' : undefined}>
												<MoreVertIcon />
											</IconButton>
											<Menu id='licenses-menu' anchorEl={anchorEl} open={currentMenuIndex === index} onClose={handleClose}>
												<MenuItem onClick={() => handleEdit(index)}>
													<EditIcon sx={{ mr: 1 }} />
													Edit
												</MenuItem>
												<MenuItem onClick={() => handleDelete(index)}>
													<DeleteIcon sx={{ mr: 1 }} color='error' />
													Delete
												</MenuItem>
											</Menu>
										</>
									)}
								</Box>
							</Box>
						))}
					</Box>
				) : (
					<Typography color='text.secondary'>{t('no_licenses') || 'No licenses or certificates yet'}</Typography>
				)}
			</div>

			{/* Licenses Form Dialog */}
			<Dialog open={showForm} onClose={resetForm} maxWidth='sm' fullWidth>
				<DialogTitle>{editingIndex !== null ? t('edit_license') || 'Edit License/Certificate' : t('add_license') || 'Add License/Certificate'}</DialogTitle>
				<DialogContent>
					<Box display='flex' flexDirection='column' gap={2} mt={1}>
						<TextField label={t('certificate_name') || 'Certificate Name'} value={formData.certifacateName} onChange={e => setFormData(prev => ({ ...prev, certifacateName: e.target.value }))} required fullWidth placeholder='e.g. TOEIC 800, 運転免許証' />
						<Box display='flex' gap={2}>
							<TextField label={t('year') || 'Year'} value={formData.year} onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))} placeholder='2023' required fullWidth />
							<TextField label={t('month') || 'Month'} value={formData.month} onChange={e => setFormData(prev => ({ ...prev, month: e.target.value }))} placeholder='03 (optional)' fullWidth />
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetForm}>{t('cancel') || 'Cancel'}</Button>
					<Button onClick={handleSubmit} variant='contained' disabled={!formData.certifacateName || !formData.year}>
						{editingIndex !== null ? t('update') || 'Update' : t('add') || 'Add'}
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	)
}
