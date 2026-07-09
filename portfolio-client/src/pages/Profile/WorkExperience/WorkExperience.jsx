import { Delete as DeleteIcon, Edit as EditIcon, MoreVert as MoreVertIcon } from '@mui/icons-material'
import AddIcon from '@mui/icons-material/Add'
import BusinessCenterOutlinedIcon from '@mui/icons-material/BusinessCenterOutlined'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, TextField, Typography } from '@mui/material'
import * as React from 'react'
import { useState } from 'react'
const WorkExperience = ({ workExperience = [], editMode = false, onUpdate, t = key => key, editData = [], isChanged = false }) => {
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
		handleClose()
	}

	const handleDelete = index => {
		const updated = workExperience.filter((_, i) => i !== index)
		onUpdate('work_experience', updated)
		handleClose()
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
		onUpdate('work_experience', updated)
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
					{t('changed') || 'Changed'}
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
										{item.from} — {item.to || t('present')}
									</Typography>
									{editMode && (
										<>
											<IconButton id={`work-experience-menu-button-${index}`} aria-controls={currentMenuIndex === index ? 'work-experience-menu' : undefined} aria-haspopup='true' aria-expanded={currentMenuIndex === index ? 'true' : undefined} onClick={e => handleClick(e, index)}>
												<MoreVertIcon />
											</IconButton>
											<Menu id='work-experience-menu' anchorEl={anchorEl} open={currentMenuIndex === index} onClose={handleClose}>
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
					<Typography color='text.secondary'>{t('no_work_experience')}</Typography>
				)}
			</div>

			{/* Work Experience Form Dialog */}
			<Dialog open={showForm} onClose={resetForm} maxWidth='sm' fullWidth>
				<DialogTitle>{editingIndex !== null ? t('edit_work_experience') : t('add_work_experience')}</DialogTitle>
				<DialogContent>
					<Box display='flex' flexDirection='column' gap={2} mt={1}>
						<TextField label={t('company')} value={formData.company} onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))} required fullWidth />
						<TextField label={t('role_position')} value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} fullWidth />
						<TextField label={t('description_label')} value={formData.details} onChange={e => setFormData(prev => ({ ...prev, details: e.target.value }))} multiline rows={3} fullWidth />
						<Box display='flex' gap={2}>
							<TextField label={t('from_yyyy_mm')} value={formData.from} onChange={e => setFormData(prev => ({ ...prev, from: e.target.value }))} placeholder={t('work_experience_from_placeholder')} required fullWidth />
							<TextField label={t('to_yyyy_mm')} value={formData.to} onChange={e => setFormData(prev => ({ ...prev, to: e.target.value }))} placeholder={t('work_experience_to_placeholder')} fullWidth />
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={resetForm}>{t('cancel')}</Button>
					<Button onClick={handleSubmit} variant='contained' disabled={!formData.company || !formData.from}>
						{editingIndex !== null ? t('update') : t('add')}
					</Button>
				</DialogActions>
			</Dialog>
			{/* Context Menu */}
			<div></div>
		</Box>
	)
}

export default WorkExperience
