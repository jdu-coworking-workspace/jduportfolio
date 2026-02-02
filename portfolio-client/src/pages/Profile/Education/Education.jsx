import { Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
export const Education = ({ education = [], onUpdate, editMode, t = key => key }) => {
	const [editingIndex, setEditingIndex] = useState(null)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({
		year: '',
		month: '',
		status: '',
		institution: '',
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
			status: '',
			institution: '',
		})
		setEditingIndex(null)
		setShowForm(false)
	}

	const handleEdit = index => {
		const item = education[index]
		setFormData({ ...item })
		setEditingIndex(index)
		setShowForm(true)
		handleClose()
	}

	const handleDelete = index => {
		const updated = education.filter((_, i) => i !== index)
		onUpdate('education', updated)
		handleClose()
	}

	const handleSubmit = () => {
		if (!formData.year || !formData.institution) return

		let updated
		if (editingIndex !== null) {
			updated = [...education]
			updated[editingIndex] = { ...formData }
		} else {
			updated = [...education, { ...formData }]
		}
		console.log(updated)

		onUpdate('education', updated)
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
				<SchoolOutlinedIcon sx={{ color: '#5627DB' }} />
				{t('education')}

				{editMode && (
					<Button startIcon={<AddIcon />} variant='outlined' size='small' onClick={handleAdd} sx={{ ml: 2 }}>
						{t('add')}
					</Button>
				)}
			</div>

			<div>
				{education && education.length > 0 ? (
					<Box display='flex' flexDirection='column' gap={2}>
						{education.map((item, index) => (
							<Box
								key={`${item.institution || 'institution'}-${index}`}
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
										{item.institution}
									</Typography>
									{item.status && (
										<Typography variant='body2' color='text.secondary' sx={{ mt: 0.5 }}>
											{item.status}
										</Typography>
									)}
								</Box>

								<Box display='flex' alignItems='center' gap={1} mt={{ xs: 1, sm: 0 }}>
									<Typography variant='body2' color='text.secondary'>
										{item.year}
										{item.month && ` / ${item.month}`}
									</Typography>
									{editMode && (
										<>
											<IconButton onClick={e => handleClick(e, index)} aria-controls={currentMenuIndex === index ? 'education-menu' : undefined} aria-haspopup='true' aria-expanded={currentMenuIndex === index ? 'true' : undefined}>
												<MoreVertIcon />
											</IconButton>
											<Menu id='education-menu' anchorEl={anchorEl} open={currentMenuIndex === index} onClose={handleClose}>
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
					<Typography color='text.secondary'>{t('no_education') || 'No education records yet'}</Typography>
				)}
			</div>

			{/* Education Form Dialog */}
			<Dialog open={showForm} onClose={resetForm} maxWidth='sm' fullWidth>
				<DialogTitle>{editingIndex !== null ? t('edit_education') || 'Edit Education' : t('add_education') || 'Add Education'}</DialogTitle>
				<DialogContent>
					<Box display='flex' flexDirection='column' gap={2} mt={1}>
						<TextField label={t('institution') || 'Institution'} value={formData.institution} onChange={e => setFormData(prev => ({ ...prev, institution: e.target.value }))} required fullWidth placeholder='e.g. Tokyo University' />
						<TextField label={t('status') || 'Status'} value={formData.status} onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))} fullWidth placeholder='e.g. Graduated, Enrolled' />
						<Box display='flex' gap={2}>
							<TextField label={t('year') || 'Year'} value={formData.year} onChange={e => setFormData(prev => ({ ...prev, year: e.target.value }))} placeholder='2023' required fullWidth />
							<TextField label={t('month') || 'Month'} value={formData.month} onChange={e => setFormData(prev => ({ ...prev, month: e.target.value }))} placeholder='03 (optional)' fullWidth />
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetForm}>{t('cancel') || 'Cancel'}</Button>
					<Button onClick={handleSubmit} variant='contained' disabled={!formData.institution || !formData.year}>
						{editingIndex !== null ? t('update') || 'Update' : t('add') || 'Add'}
					</Button>
				</DialogActions>
			</Dialog>
			{/* Context Menu */}
			<div></div>
		</Box>
	)
}
