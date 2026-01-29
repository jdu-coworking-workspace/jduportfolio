import { useState, useEffect } from 'react'
import axios from '../../utils/axiosUtils'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import { Container, Typography, Box, Button, TextField, Card, CardContent, Chip, Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert, Snackbar, InputAdornment, CircularProgress, Paper, Tooltip, List, ListItem, ListItemText, Divider } from '@mui/material'
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon, Palette as PaletteIcon, Code as CodeIcon, FormatListBulleted as FormatListBulletedIcon, Window as WindowIcon } from '@mui/icons-material'
import './CreateSkill.css'

// Helper function to get initial view mode from localStorage
const getInitialViewMode = key => {
	try {
		const saved = localStorage.getItem(key)
		return saved || 'card'
	} catch (error) {
		return 'card'
	}
}

export const CreateSkill = () => {
	//TABS
	const [tabsIndex, SetTabsIndex] = useState('it_skills')

	// Translation setup
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	// State management
	const [skills, setSkills] = useState([])
	const [languageSkills, setLanguageSkills] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [filteredSkills, setFilteredSkills] = useState([])
	const [filteredLanguageSkills, setFilteredLanguageSkills] = useState([])

	// View mode states
	const [itSkillsViewMode, setItSkillsViewMode] = useState(() => getInitialViewMode('adminItSkillsViewMode'))
	const [languageSkillsViewMode, setLanguageSkillsViewMode] = useState(() => getInitialViewMode('adminLanguageSkillsViewMode'))

	// Form states
	const [formData, setFormData] = useState({ name: '', color: '#4caf50' })
	const [editingSkill, setEditingSkill] = useState(null)
	const [isModalOpen, setIsModalOpen] = useState(false)

	// UI states
	const [snackbar, setSnackbar] = useState({
		open: false,
		message: '',
		severity: 'success',
	})
	const [deleteConfirm, setDeleteConfirm] = useState({
		open: false,
		skillId: null,
	})

	// Predefined colors for skills
	const colorOptions = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0', '#3f51b5', '#00bcd4', '#ff5722', '#795548', '#607d8b', '#e91e63', '#cddc39', '#ffeb3b', '#009688', '#8bc34a']

	// Fetch skills from API
	const fetchSkills = async (search = '') => {
		try {
			setLoading(true)
			// const response = await axios.get(`/api/itskills${search ? `?search=${search}` : ''}`)
			const response = await axios.get(`/api/itskills/`)
			setSkills(response.data)
			setFilteredSkills(response.data)
		} catch (error) {
			console.error('Error fetching skills:', error)
			showSnackbar(t('failed_fetch_skills'), 'error')
		} finally {
			setLoading(false)
		}
	}

	// Fetch language skills from API
	const fetchLanguageSkills = async (search = '') => {
		try {
			setLoading(true)
			const response = await axios.get(`/api/skills/`)
			setLanguageSkills(response.data)
			setFilteredLanguageSkills(response.data)
		} catch (error) {
			console.error('Error fetching language skills:', error)
			showSnackbar(t('failed_fetch_skills'), 'error')
		} finally {
			setLoading(false)
		}
	}

	// Filter skills based on search term
	useEffect(() => {
		if (searchTerm) {
			const filtered = skills.filter(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()))
			setFilteredSkills(filtered)

			const filteredLang = languageSkills.filter(skill => skill.name.toLowerCase().includes(searchTerm.toLowerCase()))
			setFilteredLanguageSkills(filteredLang)
		} else {
			setFilteredSkills(skills)
			setFilteredLanguageSkills(languageSkills)
		}
	}, [searchTerm, skills, languageSkills])

	// Save IT Skills view mode to localStorage
	useEffect(() => {
		try {
			localStorage.setItem('adminItSkillsViewMode', itSkillsViewMode)
		} catch (error) {
			console.error('Error saving itSkillsViewMode to localStorage:', error)
		}
	}, [itSkillsViewMode])

	// Save Language Skills view mode to localStorage
	useEffect(() => {
		try {
			localStorage.setItem('adminLanguageSkillsViewMode', languageSkillsViewMode)
		} catch (error) {
			console.error('Error saving languageSkillsViewMode to localStorage:', error)
		}
	}, [languageSkillsViewMode])

	// Initial load
	useEffect(() => {
		fetchSkills()
		fetchLanguageSkills()
	}, [])

	// Show snackbar notification
	const showSnackbar = (message, severity = 'success') => {
		setSnackbar({ open: true, message, severity })
	}

	// Handle form submission
	const handleSubmit = async e => {
		e.preventDefault()

		if (!formData.name.trim()) {
			showSnackbar(t('skill_name_required'), 'error')
			return
		}

		try {
			if (editingSkill) {
				// Update existing skill
				if (tabsIndex === 'it_skills') {
					await axios.patch(`/api/itskills/${editingSkill.id}`, formData)
				} else {
					await axios.patch(`/api/skills/${editingSkill.id}`, {
						name: formData.name,
					})
				}
				showSnackbar(t('skill_updated_success'), 'success')
			} else {
				// Create new skill
				if (tabsIndex === 'it_skills') {
					await axios.post('/api/itskills', formData)
				} else {
					await axios.post('/api/skills', { name: formData.name })
				}
				showSnackbar(t('skill_created_success'), 'success')
			}

			// Reset form and refresh data
			resetForm()
			if (tabsIndex === 'it_skills') {
				fetchSkills()
			} else {
				fetchLanguageSkills()
			}
		} catch (error) {
			console.error('Error saving skill:', error)
			const errorMessage = error.response?.data?.error || t('failed_save_skill')
			showSnackbar(errorMessage, 'error')
		}
	}

	// Handle delete skill
	const handleDelete = async skillId => {
		try {
			if (tabsIndex === 'it_skills') {
				await axios.delete(`/api/itskills/${skillId}`)
			} else {
				await axios.delete(`/api/skills/${skillId}`)
			}
			showSnackbar(t('skill_deleted_success'), 'warning')
			if (tabsIndex === 'it_skills') {
				fetchSkills()
			} else {
				fetchLanguageSkills()
			}
		} catch (error) {
			console.error('Error deleting skill:', error)
			showSnackbar(t('failed_delete_skill'), 'error')
		}
		setDeleteConfirm({ open: false, skillId: null })
	}

	// Start editing a skill
	const startEdit = skill => {
		if (tabsIndex === 'it_skills') {
			setFormData({ name: skill.name, color: skill.color })
		} else {
			setFormData({ name: skill.name, color: '#4caf50' })
		}
		setEditingSkill(skill)
		setIsModalOpen(true)
	}

	// Reset form
	const resetForm = () => {
		setFormData({ name: '', color: '#4caf50' })
		setEditingSkill(null)
		setIsModalOpen(false)
	}

	// Handle search with API call
	const handleSearch = async () => {
		if (tabsIndex === 'it_skills') {
			await fetchSkills(searchTerm)
		} else {
			await fetchLanguageSkills(searchTerm)
		}
	}

	return (
		<Container maxWidth='lg' sx={{ py: 4 }}>
			{/* Header */}
			<Box sx={{ mb: 4 }}>
				<Typography
					variant='h3'
					component='h3'
					gutterBottom
					sx={{
						fontWeight: 'bold',
						color: '#333',
						mb: 2,
						alignItems: 'center',
						justifyContent: 'center',
						display: 'flex',
						// Responsive font size for small devices
						fontSize: { xs: '1.4rem', sm: '1.8rem', md: '2.125rem' },
						lineHeight: 1.2,
						textAlign: 'center',
					}}
				>
					<CodeIcon sx={{ fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }, mr: 2, color: '#5627DC' }} />
					{t('it_skills_manager')}
				</Typography>
			</Box>

			{/* Action Bar */}
			<Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
				<Grid container spacing={2} alignItems='center'>
					<Grid item xs={12} md={8}>
						<TextField
							fullWidth
							placeholder={t('search_skills')}
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							onKeyPress={e => e.key === 'Enter' && handleSearch()}
							InputProps={{
								startAdornment: (
									<InputAdornment position='start'>
										<SearchIcon color='action' />
									</InputAdornment>
								),
								endAdornment: searchTerm && (
									<InputAdornment position='end'>
										<Button size='small' onClick={handleSearch} sx={{ minWidth: 'auto' }}>
											{t('search')}
										</Button>
									</InputAdornment>
								),
							}}
							sx={{
								'& .MuiOutlinedInput-root': {
									borderRadius: 2,
									backgroundColor: '#fafafa',
								},
							}}
						/>
					</Grid>
					<Grid item xs={12} md={4}>
						<Button
							variant='contained'
							startIcon={<AddIcon />}
							onClick={() => setIsModalOpen(true)}
							fullWidth
							sx={{
								bgcolor: '#5627DC',
								py: 1.5,
								borderRadius: 2,
								textTransform: 'none',
								fontSize: '1rem',
								fontWeight: 600,
								'&:hover': {
									bgcolor: '#4520b8',
								},
							}}
						>
							{t('add_new_skill')}
						</Button>
					</Grid>
				</Grid>
			</Paper>

			<Box
				sx={{
					width: '100%',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 3,
				}}
			>
				<Button
					variant={tabsIndex === 'it_skills' ? 'contained' : 'outlined'}
					onClick={() => {
						SetTabsIndex('it_skills')
					}}
				>
					{t('itSkills')}
				</Button>
				<Button
					variant={tabsIndex === 'lang_skills' ? 'contained' : 'outlined'}
					onClick={() => {
						SetTabsIndex('lang_skills')
					}}
				>
					{t('languageSkills')}
				</Button>
			</Box>
			{tabsIndex === 'it_skills' ? (
				<Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
						<Typography variant='h5' sx={{ fontWeight: 600 }}>
							{t('itSkills')} ({filteredSkills.length})
						</Typography>
						<Box sx={{ display: 'flex', gap: 0.5 }}>
							<Tooltip title={itSkillsViewMode === 'list' ? t('currentView') || 'List View' : t('switchToList') || 'Switch to List View'}>
								<IconButton
									onClick={() => setItSkillsViewMode('list')}
									sx={{
										color: itSkillsViewMode === 'list' ? '#5627DB' : 'gray',
										'&:hover': { color: '#5627DB' },
									}}
								>
									<FormatListBulletedIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={itSkillsViewMode === 'card' ? t('currentView') || 'Card View' : t('switchToCard') || 'Switch to Card View'}>
								<IconButton
									onClick={() => setItSkillsViewMode('card')}
									sx={{
										color: itSkillsViewMode === 'card' ? '#5627DB' : 'gray',
										'&:hover': { color: '#5627DB' },
									}}
								>
									<WindowIcon />
								</IconButton>
							</Tooltip>
						</Box>
					</Box>

					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
							<CircularProgress size={60} sx={{ color: '#5627DC' }} />
						</Box>
					) : filteredSkills.length === 0 ? (
						<Paper elevation={1} sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
							<CodeIcon sx={{ fontSize: '4rem', color: '#ccc', mb: 2 }} />
							<Typography variant='h6' color='text.secondary' gutterBottom>
								{searchTerm ? t('no_skills_found') : t('no_skills_available')}
							</Typography>
							<Typography color='text.secondary'>{searchTerm ? t('try_adjusting_search') : t('start_adding_skill')}</Typography>
						</Paper>
					) : itSkillsViewMode === 'list' ? (
						<Paper elevation={2} sx={{ borderRadius: 2 }}>
							<List>
								{filteredSkills.map((skill, index) => (
									<Box key={skill.id}>
										<ListItem
											sx={{
												py: 2,
												px: 3,
												'&:hover': {
													bgcolor: '#f5f5f5',
												},
											}}
										>
											<Box
												sx={{
													width: 16,
													height: 16,
													borderRadius: '50%',
													backgroundColor: skill.color,
													mr: 2,
													flexShrink: 0,
												}}
											/>
											<ListItemText
												primary={skill.name}
												secondary={skill.color}
												primaryTypographyProps={{
													fontWeight: 600,
													fontSize: '1rem',
												}}
												secondaryTypographyProps={{
													fontFamily: 'monospace',
													color: skill.color,
												}}
											/>
											<Box sx={{ display: 'flex', gap: 1 }}>
												<IconButton
													size='small'
													onClick={() => startEdit(skill)}
													sx={{
														bgcolor: '#e3f2fd',
														color: '#1976d2',
														'&:hover': { bgcolor: '#bbdefb' },
													}}
												>
													<EditIcon fontSize='small' />
												</IconButton>
												<IconButton
													size='small'
													onClick={() => setDeleteConfirm({ open: true, skillId: skill.id })}
													sx={{
														bgcolor: '#ffebee',
														color: '#d32f2f',
														'&:hover': { bgcolor: '#ffcdd2' },
													}}
												>
													<DeleteIcon fontSize='small' />
												</IconButton>
											</Box>
										</ListItem>
										{index < filteredSkills.length - 1 && <Divider />}
									</Box>
								))}
							</List>
						</Paper>
					) : (
						<Grid container spacing={2}>
							{filteredSkills.map(skill => (
								<Grid item xs={12} sm={6} md={4} lg={3} key={skill.id}>
									<Card
										elevation={3}
										sx={{
											borderRadius: 2,
											transition: 'all 0.3s ease',
											'&:hover': {
												transform: 'translateY(-4px)',
												boxShadow: 6,
											},
										}}
									>
										<CardContent sx={{ p: 3 }}>
											<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
												<Box
													sx={{
														width: 16,
														height: 16,
														borderRadius: '50%',
														backgroundColor: skill.color,
														mr: 1.5,
														flexShrink: 0,
													}}
												/>
												<Typography
													variant='h6'
													sx={{
														fontWeight: 600,
														fontSize: '1.1rem',
														wordBreak: 'break-word',
													}}
												>
													{skill.name}
												</Typography>
											</Box>

											<Chip
												label={skill.color}
												size='small'
												sx={{
													bgcolor: skill.color + '20',
													color: skill.color,
													fontFamily: 'monospace',
													mb: 2,
												}}
											/>

											<Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
												<IconButton
													size='small'
													onClick={() => startEdit(skill)}
													sx={{
														bgcolor: '#e3f2fd',
														color: '#1976d2',
														'&:hover': { bgcolor: '#bbdefb' },
													}}
												>
													<EditIcon fontSize='small' />
												</IconButton>
												<IconButton
													size='small'
													onClick={() => setDeleteConfirm({ open: true, skillId: skill.id })}
													sx={{
														bgcolor: '#ffebee',
														color: '#d32f2f',
														'&:hover': { bgcolor: '#ffcdd2' },
													}}
												>
													<DeleteIcon fontSize='small' />
												</IconButton>
											</Box>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					)}
				</Box>
			) : (
				<Box>
					<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
						<Typography variant='h5' sx={{ fontWeight: 600 }}>
							{t('languageSkills')} ({filteredLanguageSkills.length})
						</Typography>
						<Box sx={{ display: 'flex', gap: 0.5 }}>
							<Tooltip title={languageSkillsViewMode === 'list' ? t('currentView') || 'List View' : t('switchToList') || 'Switch to List View'}>
								<IconButton
									onClick={() => setLanguageSkillsViewMode('list')}
									sx={{
										color: languageSkillsViewMode === 'list' ? '#5627DB' : 'gray',
										'&:hover': { color: '#5627DB' },
									}}
								>
									<FormatListBulletedIcon />
								</IconButton>
							</Tooltip>
							<Tooltip title={languageSkillsViewMode === 'card' ? t('currentView') || 'Card View' : t('switchToCard') || 'Switch to Card View'}>
								<IconButton
									onClick={() => setLanguageSkillsViewMode('card')}
									sx={{
										color: languageSkillsViewMode === 'card' ? '#5627DB' : 'gray',
										'&:hover': { color: '#5627DB' },
									}}
								>
									<WindowIcon />
								</IconButton>
							</Tooltip>
						</Box>
					</Box>

					{loading ? (
						<Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
							<CircularProgress size={60} sx={{ color: '#5627DC' }} />
						</Box>
					) : filteredLanguageSkills.length === 0 ? (
						<Paper elevation={1} sx={{ p: 8, textAlign: 'center', borderRadius: 2 }}>
							<CodeIcon sx={{ fontSize: '4rem', color: '#ccc', mb: 2 }} />
							<Typography variant='h6' color='text.secondary' gutterBottom>
								{searchTerm ? t('no_skills_found') : t('no_skills_available')}
							</Typography>
							<Typography color='text.secondary'>{searchTerm ? t('try_adjusting_search') : t('start_adding_language_skill')}</Typography>
						</Paper>
					) : languageSkillsViewMode === 'list' ? (
						<Paper elevation={2} sx={{ borderRadius: 2 }}>
							<List>
								{filteredLanguageSkills.map((skill, index) => (
									<Box key={skill.id}>
										<ListItem
											sx={{
												py: 2,
												px: 3,
												'&:hover': {
													bgcolor: '#f5f5f5',
												},
											}}
										>
											<ListItemText
												primary={skill.name}
												primaryTypographyProps={{
													fontWeight: 600,
													fontSize: '1rem',
												}}
											/>
											<Box sx={{ display: 'flex', gap: 1 }}>
												<IconButton
													size='small'
													onClick={() => startEdit(skill)}
													sx={{
														bgcolor: '#e3f2fd',
														color: '#1976d2',
														'&:hover': { bgcolor: '#bbdefb' },
													}}
												>
													<EditIcon fontSize='small' />
												</IconButton>
												<IconButton
													size='small'
													onClick={() => setDeleteConfirm({ open: true, skillId: skill.id })}
													sx={{
														bgcolor: '#ffebee',
														color: '#d32f2f',
														'&:hover': { bgcolor: '#ffcdd2' },
													}}
												>
													<DeleteIcon fontSize='small' />
												</IconButton>
											</Box>
										</ListItem>
										{index < filteredLanguageSkills.length - 1 && <Divider />}
									</Box>
								))}
							</List>
						</Paper>
					) : (
						<Grid container spacing={2}>
							{filteredLanguageSkills.map(skill => (
								<Grid item xs={12} sm={6} md={4} lg={3} key={skill.id}>
									<Card
										elevation={3}
										sx={{
											borderRadius: 2,
											transition: 'all 0.3s ease',
											'&:hover': {
												transform: 'translateY(-4px)',
												boxShadow: 6,
											},
										}}
									>
										<CardContent sx={{ p: 3 }}>
											<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
												<Typography
													variant='h6'
													sx={{
														fontWeight: 600,
														fontSize: '1.1rem',
														wordBreak: 'break-word',
													}}
												>
													{skill.name}
												</Typography>
											</Box>

											<Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
												<IconButton
													size='small'
													onClick={() => startEdit(skill)}
													sx={{
														bgcolor: '#e3f2fd',
														color: '#1976d2',
														'&:hover': { bgcolor: '#bbdefb' },
													}}
												>
													<EditIcon fontSize='small' />
												</IconButton>
												<IconButton
													size='small'
													onClick={() => setDeleteConfirm({ open: true, skillId: skill.id })}
													sx={{
														bgcolor: '#ffebee',
														color: '#d32f2f',
														'&:hover': { bgcolor: '#ffcdd2' },
													}}
												>
													<DeleteIcon fontSize='small' />
												</IconButton>
											</Box>
										</CardContent>
									</Card>
								</Grid>
							))}
						</Grid>
					)}
				</Box>
			)}

			{/* Skills List */}

			{/* Add/Edit Modal */}
			<Dialog
				open={isModalOpen}
				onClose={resetForm}
				maxWidth='sm'
				fullWidth
				PaperProps={{
					sx: { borderRadius: 2 },
				}}
			>
				<DialogTitle
					sx={{
						bgcolor: '#5627DC',
						color: 'white',
						display: 'flex',
						alignItems: 'center',
						gap: 1,
					}}
				>
					<PaletteIcon />
					{editingSkill ? t('edit_skill') : t('add_new_skill')}
				</DialogTitle>
				<form onSubmit={handleSubmit}>
					<DialogContent sx={{ p: 3 }}>
						<TextField autoFocus margin='normal' label={t('skill_name')} fullWidth required value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} sx={{ mb: 3 }} />

						{tabsIndex === 'it_skills' && (
							<>
								<Typography variant='subtitle1' sx={{ mb: 2, fontWeight: 600 }}>
									{t('choose_color')}
								</Typography>

								{/* Color Preview */}
								<Box
									sx={{
										display: 'flex',
										alignItems: 'center',
										gap: 2,
										mb: 3,
										p: 2,
										bgcolor: '#f5f5f5',
										borderRadius: 1,
									}}
								>
									<Box
										sx={{
											width: 32,
											height: 32,
											borderRadius: '50%',
											backgroundColor: formData.color,
											border: '2px solid #ddd',
										}}
									/>
									<TextField label={t('color_code')} value={formData.color} onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))} size='small' sx={{ flexGrow: 1 }} />
								</Box>

								{/* Color Options */}
								<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
									{colorOptions.map(color => (
										<Box
											key={color}
											onClick={() => setFormData(prev => ({ ...prev, color }))}
											sx={{
												width: 40,
												height: 40,
												borderRadius: '50%',
												backgroundColor: color,
												cursor: 'pointer',
												border: formData.color === color ? '3px solid #333' : '2px solid #ddd',
												transition: 'all 0.2s ease',
												'&:hover': {
													transform: 'scale(1.1)',
													boxShadow: 2,
												},
											}}
										/>
									))}
								</Box>
							</>
						)}
					</DialogContent>
					<DialogActions sx={{ p: 3, gap: 1 }}>
						<Button onClick={resetForm} variant='outlined' sx={{ borderRadius: 2 }}>
							{t('cancel')}
						</Button>
						<Button
							type='submit'
							variant='contained'
							sx={{
								bgcolor: '#5627DC',
								borderRadius: 2,
								'&:hover': { bgcolor: '#4520b8' },
							}}
						>
							{editingSkill ? t('update') : t('create')} {t('skill')}
						</Button>
					</DialogActions>
				</form>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, skillId: null })} PaperProps={{ sx: { borderRadius: 2 } }}>
				<DialogTitle sx={{ color: '#d32f2f' }}>{t('confirm_delete')}</DialogTitle>
				<DialogContent>
					<Typography>{t('delete_skill_confirmation')}</Typography>
				</DialogContent>
				<DialogActions sx={{ p: 3, gap: 1 }}>
					<Button onClick={() => setDeleteConfirm({ open: false, skillId: null })} variant='outlined' sx={{ borderRadius: 2 }}>
						Cancel
					</Button>
					<Button onClick={() => handleDelete(deleteConfirm.skillId)} variant='contained' color='error' sx={{ borderRadius: 2 }}>
						{t('delete')}
					</Button>
				</DialogActions>
			</Dialog>

			{/* Snackbar Notifications */}
			<Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
				<Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ borderRadius: 2 }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Container>
	)
}
