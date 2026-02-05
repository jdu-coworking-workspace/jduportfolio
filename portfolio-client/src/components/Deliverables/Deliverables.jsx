import { useState, useRef, useEffect } from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Card, CardContent, CardMedia, Typography, Grid, Chip, Menu, MenuItem, CircularProgress, Tooltip, ImageList, ImageListItem } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Launch as LaunchIcon, Close as CloseIcon, PhotoCamera as PhotoCameraIcon, MoreVert as MoreVertIcon, ZoomIn as ZoomInIcon, NavigateBefore as NavigateBeforeIcon, NavigateNext as NavigateNextIcon, Code as CodeIcon } from '@mui/icons-material'
import { useLanguage } from '../../contexts/LanguageContext'
import { useAlert } from '../../contexts/AlertContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import PropTypes from 'prop-types'
import styles from './Deliverables.module.css'

const Deliverables = ({ data = [], editData, editMode, updateEditData, keyName = false, studentId = null, isChanged = false }) => {
	const { language } = useLanguage()
	const showAlert = useAlert()
	const t = key => translations[language][key] || key
	const fileInputRef = useRef(null)
	const role = sessionStorage.getItem('role')

	// Safely convert possible JSON string into an array
	const toArray = value => {
		try {
			if (Array.isArray(value)) return value
			if (typeof value === 'string') {
				const parsed = JSON.parse(value)
				return Array.isArray(parsed) ? parsed : []
			}
			return []
		} catch {
			return []
		}
	}

	// Helpers
	const hasNonEmpty = v => typeof v === 'string' && v.trim().length > 0

	// State management
	const [deliverables, setDeliverables] = useState([])
	const [createDialogOpen, setCreateDialogOpen] = useState(false)
	const [editDialogOpen, setEditDialogOpen] = useState(false)
	const [viewModalOpen, setViewModalOpen] = useState(false)
	const [currentDeliverable, setCurrentDeliverable] = useState(null)
	const [currentImageIndex, setCurrentImageIndex] = useState(0)
	const [menuAnchor, setMenuAnchor] = useState(null)
	const [selectedDeliverable, setSelectedDeliverable] = useState(null)
	const [loading, setLoading] = useState(false)

	// Form state
	const [formData, setFormData] = useState({
		title: '',
		description: '',
		link: '',
		codeLink: '',
		role: '',
		files: [],
	})
	const [selectedFiles, setSelectedFiles] = useState([])
	const [previewUrls, setPreviewUrls] = useState([])
	const [removeUrls, setRemoveUrls] = useState([])

	const toggleRemoveUrl = url => {
		setRemoveUrls(prev => (prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]))
	}

	// Initialize deliverables from data
	useEffect(() => {
		if (editMode && editData && Object.prototype.hasOwnProperty.call(editData, keyName)) {
			setDeliverables(toArray(editData[keyName]))
		} else {
			setDeliverables(toArray(data))
		}
	}, [data, editData, editMode, keyName])

	// Cleanup preview URLs on component unmount
	useEffect(() => {
		return () => {
			previewUrls.forEach(url => URL.revokeObjectURL(url))
		}
	}, [previewUrls])

	// Handle file selection
	const handleFileSelect = event => {
		const files = Array.from(event.target.files)
		if (files.length === 0) return

		// Validate file types and sizes
		const validFiles = files.filter(file => {
			const isValidType = file.type.startsWith('image/')
			const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB

			if (!isValidType) {
				showAlert('Invalid file type. Please select image files only.', 'error')
				return false
			}
			if (!isValidSize) {
				showAlert('File size too large. Maximum size is 5MB.', 'error')
				return false
			}
			return true
		})

		// Add new files to existing files instead of replacing
		setSelectedFiles(prevFiles => [...prevFiles, ...validFiles])

		// Create preview URLs for new files and add to existing previews
		const newUrls = validFiles.map(file => URL.createObjectURL(file))
		setPreviewUrls(prevUrls => [...prevUrls, ...newUrls])

		// Clear the input so the same file can be selected again if needed
		if (event.target) {
			event.target.value = ''
		}
	}

	// Remove individual image from preview
	const removeImage = index => {
		setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index))
		setPreviewUrls(prevUrls => {
			// Revoke the URL to prevent memory leaks
			URL.revokeObjectURL(prevUrls[index])
			return prevUrls.filter((_, i) => i !== index)
		})
	}

	// Clear form data
	const clearForm = () => {
		// Revoke all preview URLs to prevent memory leaks
		previewUrls.forEach(url => URL.revokeObjectURL(url))

		setFormData({
			title: '',
			description: '',
			link: '',
			codeLink: '',
			role: '',
			files: [],
		})
		setSelectedFiles([])
		setPreviewUrls([])
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	// Handle dialog close
	const handleCreateDialogClose = () => {
		setCreateDialogOpen(false)
		clearForm()
	}

	const handleEditDialogClose = () => {
		setEditDialogOpen(false)
		clearForm()
		setRemoveUrls([])
	}

	// Handle create deliverable
	const handleCreate = async () => {
		if (!formData.title.trim()) {
			showAlert(t('titleRequired') || 'Title is required', 'error')
			return
		}

		if (selectedFiles.length === 0) {
			showAlert(t('filesRequired') || 'At least one image is required', 'error')
			return
		}

		setLoading(true)
		try {
			const formDataToSend = new FormData()
			formDataToSend.append('title', formData.title)
			formDataToSend.append('description', formData.description)
			formDataToSend.append('link', formData.link)
			formDataToSend.append('codeLink', formData.codeLink)
			formDataToSend.append('role', formData.role)

			// Add student_id if Staff/Admin editing
			if ((role === 'Staff' || role === 'Admin') && studentId) {
				formDataToSend.append('student_id', studentId)
			}

			selectedFiles.forEach(file => {
				formDataToSend.append('files', file)
			})

			const response = await axios.post('/api/deliverables', formDataToSend, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			})

			// Update local state with the new deliverable from the response
			const newDeliverables = response.data.profile_data?.deliverables || []
			setDeliverables(newDeliverables)

			// Update parent component's edit data
			if (updateEditData) {
				updateEditData(keyName, newDeliverables)
			}

			showAlert(t('deliverableCreated') || 'Deliverable created successfully!', 'success')
			handleCreateDialogClose()
		} catch (error) {
			console.error('Error creating deliverable:', error)
			showAlert(error.response?.data?.message || 'Failed to create deliverable', 'error')
		} finally {
			setLoading(false)
		}
	}

	// Handle update deliverable
	const handleUpdate = async () => {
		if (!formData.title.trim()) {
			showAlert(t('titleRequired') || 'Title is required', 'error')
			return
		}

		setLoading(true)
		try {
			const formDataToSend = new FormData()
			formDataToSend.append('title', formData.title)
			formDataToSend.append('description', formData.description)
			formDataToSend.append('link', formData.link)
			formDataToSend.append('codeLink', formData.codeLink)
			formDataToSend.append('role', formData.role)

			// Add student_id if Staff/Admin editing
			if ((role === 'Staff' || role === 'Admin') && studentId) {
				formDataToSend.append('student_id', studentId)
			}

			if (selectedFiles.length > 0) {
				selectedFiles.forEach(file => {
					formDataToSend.append('files', file)
				})
			}

			// Mark images for removal
			if (removeUrls.length > 0) {
				formDataToSend.append('remove_image_urls', JSON.stringify(removeUrls))
			}

			const response = await axios.put(`/api/deliverables/${currentDeliverable.id}`, formDataToSend, {
				headers: {
					'Content-Type': 'multipart/form-data',
				},
			})

			// Update local state
			const updatedDeliverables = response.data.profile_data?.deliverables || []
			setDeliverables(updatedDeliverables)

			// Update parent component's edit data
			if (updateEditData) {
				updateEditData(keyName, updatedDeliverables)
			}

			showAlert(t('deliverableUpdated') || 'Deliverable updated successfully!', 'success')
			handleEditDialogClose()
		} catch (error) {
			console.error('Error updating deliverable:', error)
			showAlert(error.response?.data?.message || 'Failed to update deliverable', 'error')
		} finally {
			setLoading(false)
		}
	}

	// Handle delete deliverable
	const handleDelete = async deliverableId => {
		if (!window.confirm(t('confirmDelete') || 'Are you sure you want to delete this deliverable?')) {
			return
		}

		setLoading(true)
		try {
			// For Staff/Admin, we need to pass student_id in the request body
			const config = {}
			if ((role === 'Staff' || role === 'Admin') && studentId) {
				config.data = { student_id: studentId }
			}

			const response = await axios.delete(`/api/deliverables/${deliverableId}`, config)

			// Update local state
			const updatedDeliverables = response.data.profile_data?.deliverables || []
			setDeliverables(updatedDeliverables)

			// Update parent component's edit data
			if (updateEditData) {
				updateEditData(keyName, updatedDeliverables)
			}

			showAlert(t('deliverableDeleted') || 'Deliverable deleted successfully!', 'success')
			setMenuAnchor(null)
		} catch (error) {
			console.error('Error deleting deliverable:', error)
			showAlert(error.response?.data?.message || 'Failed to delete deliverable', 'error')
		} finally {
			setLoading(false)
		}
	}

	// Handle menu operations
	const handleMenuOpen = (event, deliverable) => {
		setMenuAnchor(event.currentTarget)
		setSelectedDeliverable(deliverable)
	}

	const handleMenuClose = () => {
		setMenuAnchor(null)
		setSelectedDeliverable(null)
	}

	const handleEditClick = () => {
		setCurrentDeliverable(selectedDeliverable)
		// Clear any existing previews first
		previewUrls.forEach(url => URL.revokeObjectURL(url))
		setSelectedFiles([])
		setPreviewUrls([])

		setFormData({
			title: selectedDeliverable.title || '',
			description: selectedDeliverable.description || '',
			link: selectedDeliverable.link || '',
			codeLink: selectedDeliverable.codeLink || '',
			role: Array.isArray(selectedDeliverable.role) ? selectedDeliverable.role.join(', ') : selectedDeliverable.role || '',
			files: [],
		})
		setEditDialogOpen(true)
		handleMenuClose()
	}

	// Handle view modal
	const handleViewDeliverable = (deliverable, imageIndex = 0) => {
		setCurrentDeliverable(deliverable)
		setCurrentImageIndex(imageIndex)
		setViewModalOpen(true)
	}

	const handlePrevImage = () => {
		const images = currentDeliverable?.image_urls || currentDeliverable?.files || []
		if (images.length > 0) {
			setCurrentImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))
		}
	}

	const handleNextImage = () => {
		const images = currentDeliverable?.image_urls || currentDeliverable?.files || []
		if (images.length > 0) {
			setCurrentImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))
		}
	}

	// Open link in new tab
	const handleOpenLink = link => {
		if (link) {
			window.open(link, '_blank', 'noopener,noreferrer')
		}
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
						zIndex: 1,
					}}
				>
					{t('changed') || 'Changed'}
				</div>
			)}
			<div className={styles.container}>
				{/* Header with Add Button */}
				{editMode && (
					<Box
						sx={{
							mb: 3,
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<Typography variant='h6' component='h2'>
							{t('deliverables') || 'Deliverables'}
						</Typography>
						<Button
							variant='contained'
							startIcon={<AddIcon />}
							onClick={() => setCreateDialogOpen(true)}
							sx={{
								backgroundColor: '#5627DB',
								'&:hover': { backgroundColor: '#4520A6' },
							}}
						>
							{t('addDeliverable') || 'Add Deliverable'}
						</Button>
					</Box>
				)}

				{/* Deliverables Grid */}
				<Grid container spacing={3}>
					{deliverables.map((deliverable, index) => {
						const images = deliverable.image_urls || deliverable.files || []
						return (
							<Grid item xs={12} sm={6} md={4} key={deliverable.id || index}>
								<Card
									className={styles.deliverableCard}
									elevation={2}
									sx={{
										display: 'flex',
										flexDirection: 'column',
										height: '100%',
									}}
								>
									{/* Main Image */}
									{images.length > 0 && <CardMedia component='img' image={images[0]} alt={deliverable.title} className={styles.cardImage} onClick={() => handleViewDeliverable(deliverable, 0)} sx={{ cursor: 'pointer' }} />}

									<CardContent
										sx={{
											display: 'flex',
											flexDirection: 'column',
											flexGrow: 1,
											pb: 1,
										}}
									>
										{/* Title and Menu */}
										<Box
											sx={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'flex-start',
												mb: 1,
											}}
										>
											<Typography variant='h6' className={styles.title} sx={{ flex: 1 }}>
												{deliverable.title}
											</Typography>
											{editMode && (
												<IconButton size='small' onClick={e => handleMenuOpen(e, deliverable)}>
													<MoreVertIcon />
												</IconButton>
											)}
										</Box>

										{/* Content Container - Grows to fill space */}
										<Box sx={{ flexGrow: 1 }}>
											{/* Description */}
											{deliverable.description && (
												<Typography variant='body2' className={styles.description} sx={{ mb: 2 }}>
													{deliverable.description}
												</Typography>
											)}
											{/* Code Link */}

											{/* Role */}
											{deliverable.role && Array.isArray(deliverable.role) && deliverable.role.length > 0 && (
												<Box sx={{ mb: 2 }}>
													{deliverable.role.map((item, ind) => (
														<Chip key={ind} label={item.trim()} size='small' sx={{ mr: 0.5, mb: 0.5 }} variant='outlined' />
													))}
												</Box>
											)}

											{/* Image Count */}
											{images.length > 1 && <Chip label={`${images.length} ${t('images') || 'images'}`} size='small' sx={{ mb: 2 }} />}
										</Box>

										{/* Actions - Always at bottom */}
										<Box
											sx={{
												display: 'flex',
												gap: 1,
												mt: 'auto',
												pt: 2,
												flexWrap: 'wrap',
											}}
										>
											{images.length > 0 && (
												<Button size='small' startIcon={<ZoomInIcon />} onClick={() => handleViewDeliverable(deliverable)}>
													{t('view') || 'View'}
												</Button>
											)}
											{hasNonEmpty(deliverable.link) && (
												<Button size='small' startIcon={<LaunchIcon />} onClick={() => handleOpenLink(deliverable.link)}>
													{t('openLink') || 'Open Link'}
												</Button>
											)}
											{hasNonEmpty(deliverable.codeLink) && (
												<Button size='small' startIcon={<CodeIcon />} onClick={() => handleOpenLink(deliverable.codeLink)}>
													{t('openCodeLink') || 'Open Code Link'}
												</Button>
											)}
										</Box>
									</CardContent>
								</Card>
							</Grid>
						)
					})}
				</Grid>

				{/* Empty State (no extra button under 未入力) */}
				{deliverables.length === 0 && (
					<Box sx={{ textAlign: 'center', py: 8 }}>
						<Typography variant='h6' color='text.secondary' gutterBottom>
							{t('notEntered')}
						</Typography>
					</Box>
				)}

				{/* Context Menu */}
				<Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
					<MenuItem onClick={handleEditClick}>
						<EditIcon sx={{ mr: 1 }} />
						{t('edit') || 'Edit'}
					</MenuItem>
					<MenuItem
						onClick={() => {
							handleDelete(selectedDeliverable?.id)
							handleMenuClose()
						}}
						sx={{ color: 'error.main' }}
					>
						<DeleteIcon sx={{ mr: 1 }} />
						{t('delete') || 'Delete'}
					</MenuItem>
				</Menu>

				{/* Create Dialog */}
				<Dialog open={createDialogOpen} onClose={handleCreateDialogClose} maxWidth='md' fullWidth>
					<DialogTitle>{t('createDeliverable') || 'Create Deliverable'}</DialogTitle>
					<DialogContent>
						<Box sx={{ pt: 1 }}>
							<TextField fullWidth label={t('title') || 'Title'} value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} margin='normal' required />
							<TextField fullWidth label={t('description') || 'Description'} value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} margin='normal' multiline rows={3} />
							<TextField fullWidth label={t('link') || 'Link'} value={formData.link} onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))} margin='normal' placeholder='https://...' />
							<TextField fullWidth label={t('role') || 'Role'} value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} margin='normal' placeholder='frontend developer, designer, UI/UX' />
							<TextField fullWidth label={t('codeLink') || 'Code link'} value={formData.codeLink} onChange={e => setFormData(prev => ({ ...prev, codeLink: e.target.value }))} margin='normal' placeholder='https://github.com/...' />

							{/* File Upload */}
							<Box sx={{ mt: 2 }}>
								<input ref={fileInputRef} type='file' multiple accept='image/*' onChange={handleFileSelect} style={{ display: 'none' }} />
								<Button variant='outlined' startIcon={<PhotoCameraIcon />} onClick={() => fileInputRef.current?.click()} fullWidth sx={{ mb: 2 }}>
									{selectedFiles.length > 0 ? `${t('addMoreImages') || 'Add More Images'} (${selectedFiles.length})` : t('selectImages') || 'Select Images'}
								</Button>

								{/* Image Previews */}
								{previewUrls.length > 0 && (
									<ImageList cols={3} gap={8}>
										{previewUrls.map((url, index) => (
											<ImageListItem key={index} sx={{ position: 'relative' }}>
												<img
													src={url}
													alt={`Preview ${index + 1}`}
													style={{
														width: '100%',
														height: 100,
														objectFit: 'cover',
														borderRadius: 4,
													}}
												/>
												<IconButton
													size='small'
													sx={{
														position: 'absolute',
														top: 4,
														right: 4,
														bgcolor: 'rgba(255,255,255,0.8)',
														'&:hover': {
															bgcolor: 'rgba(255,255,255,0.9)',
														},
													}}
													onClick={() => removeImage(index)}
												>
													<CloseIcon fontSize='small' />
												</IconButton>
											</ImageListItem>
										))}
									</ImageList>
								)}
							</Box>
						</Box>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleCreateDialogClose}>{t('cancel') || 'Cancel'}</Button>
						<Button onClick={handleCreate} variant='contained' disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
							{t('create') || 'Create'}
						</Button>
					</DialogActions>
				</Dialog>

				{/* Edit Dialog */}
				<Dialog open={editDialogOpen} onClose={handleEditDialogClose} maxWidth='md' fullWidth>
					<DialogTitle>{t('editDeliverable') || 'Edit Deliverable'}</DialogTitle>
					<DialogContent>
						<Box sx={{ pt: 1 }}>
							<TextField fullWidth label={t('title') || 'Title'} value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} margin='normal' required />
							<TextField fullWidth label={t('description') || 'Description'} value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} margin='normal' multiline rows={3} />
							<TextField fullWidth label={t('link') || 'Link'} value={formData.link} onChange={e => setFormData(prev => ({ ...prev, link: e.target.value }))} margin='normal' placeholder='https://...' />
							<TextField fullWidth label={t('role') || 'Role'} value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} margin='normal' placeholder='frontend developer, designer, UI/UX' />
							<TextField fullWidth label={t('codeLink') || 'Code link'} value={formData.codeLink} onChange={e => setFormData(prev => ({ ...prev, codeLink: e.target.value }))} margin='normal' placeholder='https://github.com/...' />

							{/* File Upload for Edit */}
							<Box sx={{ mt: 2 }}>
								<input ref={fileInputRef} type='file' multiple accept='image/*' onChange={handleFileSelect} style={{ display: 'none' }} />
								<Button variant='outlined' startIcon={<PhotoCameraIcon />} onClick={() => fileInputRef.current?.click()} fullWidth sx={{ mb: 2 }}>
									{selectedFiles.length > 0 ? `${t('addMoreImages') || 'Add More Images'} (${selectedFiles.length})` : t('replaceImages') || 'Add Images'}
								</Button>

								{/* Current Images */}
								{(() => {
									const images = currentDeliverable?.image_urls || currentDeliverable?.files || []
									return (
										images.length > 0 && (
											<Box sx={{ mb: 2 }}>
												<Typography variant='subtitle2' gutterBottom>
													{t('currentImages') || 'Current Images'}
												</Typography>
												<Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
													<Button
														size='small'
														onClick={() => {
															const imgs = currentDeliverable?.image_urls || currentDeliverable?.files || []
															setRemoveUrls(imgs)
														}}
													>
														{t('removeAll') || 'Mark all for removal'}
													</Button>
													<Button size='small' onClick={() => setRemoveUrls([])}>
														{t('undoRemoveAll') || 'Unmark all'}
													</Button>
												</Box>
												<ImageList cols={3} gap={8}>
													{images.map((url, index) => (
														<ImageListItem key={index} sx={{ position: 'relative' }}>
															<img
																src={url}
																alt={`Current ${index + 1}`}
																style={{
																	width: '100%',
																	height: 100,
																	objectFit: 'cover',
																	borderRadius: 4,
																	opacity: removeUrls.includes(url) ? 0.4 : 1,
																	outline: removeUrls.includes(url) ? '2px solid #d32f2f' : 'none',
																}}
															/>
															<Tooltip title={removeUrls.includes(url) ? t('unmarkRemoval') || 'Unmark removal' : t('markForRemoval') || 'Mark for removal'}>
																<IconButton
																	size='small'
																	onClick={() => toggleRemoveUrl(url)}
																	sx={{
																		position: 'absolute',
																		top: 4,
																		right: 4,
																		bgcolor: 'rgba(255,255,255,0.85)',
																	}}
																>
																	<DeleteIcon fontSize='small' color={removeUrls.includes(url) ? 'error' : 'action'} />
																</IconButton>
															</Tooltip>
															{removeUrls.includes(url) && (
																<Box
																	component='span'
																	sx={{
																		position: 'absolute',
																		bottom: 4,
																		left: 4,
																		backgroundColor: 'rgba(211,47,47,0.9)',
																		color: 'white',
																		px: 1,
																		py: 0.25,
																		borderRadius: 1,
																		fontSize: '0.75rem',
																	}}
																>
																	{t('markedForRemoval') || 'Will remove'}
																</Box>
															)}
														</ImageListItem>
													))}
												</ImageList>
											</Box>
										)
									)
								})()}

								{/* New Image Previews */}
								{previewUrls.length > 0 && (
									<Box>
										<Typography variant='subtitle2' gutterBottom>
											{t('newImages') || 'New Images'}:
										</Typography>
										<ImageList cols={3} gap={8}>
											{previewUrls.map((url, index) => (
												<ImageListItem key={index} sx={{ position: 'relative' }}>
													<img
														src={url}
														alt={`Preview ${index + 1}`}
														style={{
															width: '100%',
															height: 100,
															objectFit: 'cover',
															borderRadius: 4,
														}}
													/>
													<IconButton
														size='small'
														sx={{
															position: 'absolute',
															top: 4,
															right: 4,
															bgcolor: 'rgba(255,255,255,0.8)',
															'&:hover': {
																bgcolor: 'rgba(255,255,255,0.9)',
															},
														}}
														onClick={() => removeImage(index)}
													>
														<CloseIcon fontSize='small' />
													</IconButton>
												</ImageListItem>
											))}
										</ImageList>
									</Box>
								)}
							</Box>
						</Box>
					</DialogContent>
					<DialogActions>
						<Button onClick={handleEditDialogClose}>{t('cancel') || 'Cancel'}</Button>
						<Button onClick={handleUpdate} variant='contained' disabled={loading} startIcon={loading ? <CircularProgress size={20} /> : null}>
							{t('update') || 'Update'}
						</Button>
					</DialogActions>
				</Dialog>

				{/* View Modal with Image Carousel */}
				<Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} maxWidth='lg' fullWidth>
					<DialogTitle
						sx={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<Typography variant='h6'>{currentDeliverable?.title}</Typography>
						<IconButton onClick={() => setViewModalOpen(false)}>
							<CloseIcon />
						</IconButton>
					</DialogTitle>
					<DialogContent>
						{currentDeliverable && (
							<Box>
								{/* Image Carousel */}
								{(() => {
									const images = currentDeliverable.image_urls || currentDeliverable.files || []
									return (
										images.length > 0 && (
											<Box sx={{ position: 'relative', mb: 3 }}>
												<img
													src={images[currentImageIndex]}
													alt={`${currentDeliverable.title} - Image ${currentImageIndex + 1}`}
													style={{
														width: '100%',
														maxHeight: '400px',
														objectFit: 'contain',
														borderRadius: 8,
													}}
												/>

												{/* Navigation Arrows */}
												{images.length > 1 && (
													<>
														<IconButton
															onClick={handlePrevImage}
															sx={{
																position: 'absolute',
																left: 8,
																top: '50%',
																transform: 'translateY(-50%)',
																backgroundColor: 'rgba(0,0,0,0.5)',
																color: 'white',
																'&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
															}}
														>
															<NavigateBeforeIcon />
														</IconButton>
														<IconButton
															onClick={handleNextImage}
															sx={{
																position: 'absolute',
																right: 8,
																top: '50%',
																transform: 'translateY(-50%)',
																backgroundColor: 'rgba(0,0,0,0.5)',
																color: 'white',
																'&:hover': { backgroundColor: 'rgba(0,0,0,0.7)' },
															}}
														>
															<NavigateNextIcon />
														</IconButton>
													</>
												)}

												{/* Image Counter */}
												{images.length > 1 && (
													<Box
														sx={{
															position: 'absolute',
															bottom: 8,
															right: 8,
															backgroundColor: 'rgba(0,0,0,0.5)',
															color: 'white',
															px: 1,
															py: 0.5,
															borderRadius: 1,
															fontSize: '0.875rem',
														}}
													>
														{currentImageIndex + 1} / {images.length}
													</Box>
												)}
											</Box>
										)
									)
								})()}

								{/* Description */}
								{currentDeliverable.description && (
									<Typography variant='body1' paragraph>
										{currentDeliverable.description}
									</Typography>
								)}

								{/* Code Link */}
								{hasNonEmpty(currentDeliverable.codeLink) && (
									<Box sx={{ mt: 2 }}>
										<Typography variant='body2' sx={{ fontWeight: 'bold', mb: 1 }}>
											Code Repository:
										</Typography>
										<Button variant='outlined' startIcon={<CodeIcon />} onClick={() => handleOpenLink(currentDeliverable.codeLink)} size='small'>
											{t('openCodeLink') || 'Open Code Link'}
										</Button>
									</Box>
								)}

								{/* Role */}
								{currentDeliverable.role && Array.isArray(currentDeliverable.role) && currentDeliverable.role.length > 0 && (
									<Box sx={{ mt: 2 }}>
										<Typography variant='body2' sx={{ fontWeight: 'bold', mb: 1 }}>
											Role:
										</Typography>
										<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
											{currentDeliverable.role.map((item, ind) => (
												<Chip key={ind} label={item.trim()} size='small' variant='outlined' />
											))}
										</Box>
									</Box>
								)}

								{/* Link */}
								{hasNonEmpty(currentDeliverable.link) && (
									<Button variant='outlined' startIcon={<LaunchIcon />} onClick={() => handleOpenLink(currentDeliverable.link)} sx={{ mt: 2, mr: 1 }}>
										{t('openLink') || 'Open Link'}
									</Button>
								)}

								{/* Image Grid for Quick Navigation */}
								{(() => {
									const images = currentDeliverable.image_urls || currentDeliverable.files || []
									return (
										images.length > 1 && (
											<Box sx={{ mt: 3 }}>
												<Typography variant='subtitle2' gutterBottom>
													{t('allImages') || 'All Images'}:
												</Typography>
												<ImageList cols={4} gap={8}>
													{images.map((url, index) => (
														<ImageListItem key={index}>
															<img
																src={url}
																alt={`Thumbnail ${index + 1}`}
																style={{
																	width: '100%',
																	height: 80,
																	objectFit: 'cover',
																	borderRadius: 4,
																	cursor: 'pointer',
																	border: index === currentImageIndex ? '2px solid #5627DB' : 'none',
																}}
																onClick={() => setCurrentImageIndex(index)}
															/>
														</ImageListItem>
													))}
												</ImageList>
											</Box>
										)
									)
								})()}
							</Box>
						)}
					</DialogContent>
				</Dialog>
			</div>
		</Box>
	)
}

Deliverables.propTypes = {
	data: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
	editData: PropTypes.object,
	editMode: PropTypes.bool,
	updateEditData: PropTypes.func,
	keyName: PropTypes.string,
	updateEditMode: PropTypes.func,
	onImageUpload: PropTypes.func,
	resetPreviews: PropTypes.bool,
	isChanged: PropTypes.bool,
	studentId: PropTypes.string,
}

export default Deliverables
