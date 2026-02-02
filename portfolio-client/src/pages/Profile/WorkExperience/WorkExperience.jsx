import { Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
const WorkExperience = ({ workExperience = [], editMode = false, onUpdate, t = key => key, editData = [] }) => {
	const [editingIndex, setEditingIndex] = useState(null)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({
		company: '',
		role: '',
		details: '',
		from: '',
		to: '',
	})
	const [anchorEl, setAnchorEl] = React.useState(null)
	const open = Boolean(anchorEl)
	const handleClick = event => {
		setAnchorEl(event.currentTarget)
	}
	const handleClose = () => {
		setAnchorEl(null)
	}
	const resetForm = () => {
		setFormData({
			company: '',
			role: '',
			details: '',
			from: '',
			to: '',
		})
		setEditingIndex(null)
		setShowForm(false)
	}

	const handleEdit = index => {
		const item = workExperience[index]
		setFormData({ ...item })
		setEditingIndex(index)
		setShowForm(true)
	}

	const handleDelete = index => {
		const updated = workExperience.filter((_, i) => i !== index)
		onUpdate('work_experience', updated)
	}

	const handleSubmit = () => {
		if (!formData.company || !formData.from) return

		let updated
		if (editingIndex !== null) {
			// Edit existing
			updated = [...workExperience]
			updated[editingIndex] = { ...formData }
		} else {
			// Add new
			updated = [...workExperience, { ...formData }]
		}
		console.log(updated)

		onUpdate('work_experience', updated)
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
				<BusinessCenterOutlinedIcon sx={{ color: '#5627DB' }} />
				{t('work_experience')}
				{editMode && (
					<Button startIcon={<AddIcon />} variant='outlined' size='small' onClick={handleAdd} sx={{ ml: 2 }}>
						{t('add')}
					</Button>
				)}
			</div>

			<div>
				{workExperience && workExperience.length > 0 ? (
					<Box display='flex' flexDirection='column' gap={2}>
						{workExperience.map((item, index) => (
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
									{item.details && (
										<Typography variant='body2' sx={{ mt: 1 }}>
											{item.details}
										</Typography>
									)}
								</Box>

								<Box display='flex' alignItems='center' gap={1} mt={{ xs: 1, sm: 0 }}>
									<Typography variant='body2' color='text.secondary'>
										{item.from} — {item.to || t('present') || 'Present'}
									</Typography>
									{editMode && (
										<>
											<IconButton id='basic-button' aria-controls={open ? 'basic-menu' : undefined} aria-haspopup='true' aria-expanded={open ? 'true' : undefined} onClick={handleClick}>
												<MoreVertIcon />
											</IconButton>
											<Menu id='basic-menu' anchorEl={anchorEl} open={open} onClose={handleClose}>
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
					<Typography color='text.secondary'>sizda hali work experience yo`q</Typography>
				)}
			</div>

			{/* Work Experience Form Dialog */}
			<Dialog open={showForm} onClose={resetForm} maxWidth='sm' fullWidth>
				<DialogTitle>{editingIndex !== null ? 'Edit Work Experience' : 'Add Work Experience'}</DialogTitle>
				<DialogContent>
					<Box display='flex' flexDirection='column' gap={2} mt={1}>
						<TextField label='Company' value={formData.company} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} required fullWidth />
						<TextField label='Role/Position' value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} fullWidth />
						<TextField label='Description' value={formData.details} onChange={e => setFormData(prev => ({ ...prev, details: e.target.value }))} multiline rows={3} fullWidth />
						<Box display='flex' gap={2}>
							<TextField label='From (YYYY-MM)' value={formData.from} onChange={e => setFormData(prev => ({ ...prev, from: e.target.value }))} placeholder='2023-01' required fullWidth />
							<TextField label='To (YYYY-MM)' value={formData.to} onChange={e => setFormData(prev => ({ ...prev, to: e.target.value }))} placeholder='2024-01 or leave empty' fullWidth />
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetForm}>Cancel</Button>
					<Button onClick={handleSubmit} variant='contained' disabled={!formData.company || !formData.from}>
						{editingIndex !== null ? 'Update' : 'Add'}
					</Button>
				</DialogActions>
			</Dialog>
			{/* Context Menu */}
			<div></div>
		</Box>
	)
}

export default WorkExperience
