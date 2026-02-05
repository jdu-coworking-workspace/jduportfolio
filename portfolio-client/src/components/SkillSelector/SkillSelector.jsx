import { useState, useEffect, useRef } from 'react'
import { Autocomplete, TextField, Chip, Box, MenuItem, Select, FormControl, InputLabel, IconButton } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import styles from './SkillSelector.module.css'
import skills from '../../utils/skills'
import axios from '../../utils/axiosUtils'
import PropTypes from 'prop-types'

import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import { useAlert } from '../../contexts/AlertContext'

const SkillSelector = ({ title, data, editData, editMode, headers, updateEditData, keyName, parentKey = 'draft', showAutocomplete, showHeaders, icon, isChanged = false, showEmptyAsNotSubmitted = false }) => {
	const [selectedSkill, setSelectedSkill] = useState(null)
	const [selectedLevel, setSelectedLevel] = useState('初級')
	const [databaseSkills, setDatabaseSkills] = useState([])
	const [inputValue, setInputValue] = useState('')
	const [loadingSkills, setLoadingSkills] = useState(false)
	const debounceRef = useRef(null)

	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const showAlert = useAlert()

	// Fetch skills from database when showAutocomplete is true
	useEffect(() => {
		if (showAutocomplete) {
			fetchSkillsFromDatabase()
		}
	}, [showAutocomplete])

	useEffect(() => {
		if (!showAutocomplete) return
		if (debounceRef.current) clearTimeout(debounceRef.current)
		debounceRef.current = setTimeout(() => {
			fetchSkillsFromDatabase(inputValue)
		}, 350)
		return () => debounceRef.current && clearTimeout(debounceRef.current)
	}, [inputValue, showAutocomplete])

	const fetchSkillsFromDatabase = async (search = '') => {
		try {
			setLoadingSkills(true)
			const url = search ? `/api/itskills?search=${encodeURIComponent(search)}` : '/api/itskills'
			const response = await axios.get(url)
			setDatabaseSkills(response.data || [])
		} catch (error) {
			// Fallback to local skills if database fails
			setDatabaseSkills([])
		} finally {
			setLoadingSkills(false)
		}
	}

	// Get skills to use in autocomplete (database skills if available, otherwise local skills)
	const getSkillsForAutocomplete = () => {
		if (showAutocomplete && databaseSkills.length > 0) {
			return databaseSkills
		}
		return skills
	}

	// Get the current skills data
	const getCurrentSkillsData = () => {
		if (editMode && editData && editData[parentKey]) {
			return editData[parentKey][keyName] || {}
		}
		return data?.[keyName] || {}
	}

	const handleAddSkill = () => {
		// Validation
		if (!selectedSkill?.name?.trim() || !selectedLevel) {
			return
		}

		const skillName = selectedSkill.name.trim()
		const currentSkillsData = getCurrentSkillsData()

		// Check for duplicates
		const isDuplicate = Object.values(currentSkillsData).some(levelSkills => Array.isArray(levelSkills) && levelSkills.some(skill => skill.name?.toLowerCase() === skillName.toLowerCase()))

		if (isDuplicate) {
			showAlert(t('skillExists'), 'warning')
			return
		}

		// Create updated skills object
		const updatedSkills = {
			...currentSkillsData,
			[selectedLevel]: [
				...(currentSkillsData[selectedLevel] || []),
				{
					name: skillName,
					color: selectedSkill.color || '#5627DB',
				},
			],
		}

		// Update the data
		try {
			updateEditData(keyName, updatedSkills, parentKey)

			// Reset form
			setSelectedSkill(null)
			setSelectedLevel('初級')
			setInputValue('')
		} catch (error) {
			console.error('Error updating skills:', error)
		}
	}

	const handleDeleteSkill = (skillToDelete, level) => {
		const currentSkillsData = getCurrentSkillsData()
		const updatedSkills = {
			...currentSkillsData,
			[level]: (currentSkillsData[level] || []).filter(skill => skill.name !== skillToDelete.name),
		}

		try {
			updateEditData(keyName, updatedSkills, parentKey)
		} catch (error) {
			console.error('Error deleting skill:', error)
		}
	}

	const skillsToDisplay = getCurrentSkillsData()
	// Stable level order regardless of insertion
	const DEFAULT_LEVEL_ORDER = ['上級', '中級', '初級']
	const levelOrder = headers ? Object.keys(headers) : DEFAULT_LEVEL_ORDER

	// Decide which keys to render: when showing empty rows as "未提出",
	// prefer headers ordering; otherwise render only non-empty entries and sort by levelOrder
	const keysToRender = (() => {
		if (showEmptyAsNotSubmitted && headers) return levelOrder
		const keys = Object.entries(skillsToDisplay)
			.filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
			.map(([k]) => k)
		// sort by defined order; unknown keys go last preserving their order
		return keys.sort((a, b) => {
			const ia = levelOrder.indexOf(a)
			const ib = levelOrder.indexOf(b)
			return (ia === -1 ? Number.MAX_SAFE_INTEGER : ia) - (ib === -1 ? Number.MAX_SAFE_INTEGER : ib)
		})
	})()

	return (
		<div
			className={styles.container}
			style={{
				backgroundColor: isChanged ? '#fff3cd' : '#ffffff',
				border: isChanged ? '2px solid #ffc107' : '1px solid #f0f0f0',
				borderRadius: isChanged ? '8px' : '12px',
				padding: isChanged ? '28px' : '20px',
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
						borderRadius: '4px',
						fontSize: '12px',
						fontWeight: 600,
					}}
				>
					{t('changed') || 'Changed'}
				</div>
			)}
			<div className={styles.title} style={icon ? { display: 'flex', alignItems: 'center', gap: 8 } : {}}>
				{icon}
				{title}
			</div>

			{showHeaders && (
				<div className={styles.description}>
					{Object.entries(headers).map(([level, description]) => (
						<div key={level}>
							<span style={{ fontWeight: 800 }}>{t('levels')[level]}</span>: {description}
						</div>
					))}
				</div>
			)}

			{editMode && (
				<Box display='flex' alignItems='center' mb={2} mt={2} gap={2} className={styles.addSkillForm} sx={{ flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' }, width: '100%' }}>
					{showAutocomplete ? (
						<Autocomplete
							options={getSkillsForAutocomplete()}
							getOptionLabel={option => option.name || ''}
							value={selectedSkill}
							onChange={(event, newValue) => {
								setSelectedSkill(newValue)
							}}
							inputValue={inputValue}
							onInputChange={(event, newInputValue) => {
								setInputValue(newInputValue || '')
							}}
							onOpen={() => {
								// Ensure full list appears when opening without a search term
								if (!inputValue) {
									fetchSkillsFromDatabase('')
								}
							}}
							loading={loadingSkills}
							sx={{ width: { xs: '100%', sm: 220 }, minWidth: 0 }}
							renderInput={params => <TextField {...params} label={t('selectSkill')} variant='outlined' size='small' />}
						/>
					) : (
						<TextField
							value={selectedSkill?.name || ''}
							onChange={event => {
								setSelectedSkill({ name: event.target.value })
							}}
							onKeyPress={event => {
								if (event.key === 'Enter') {
									event.preventDefault()
									handleAddSkill()
								}
							}}
							label={t('skill')}
							variant='outlined'
							size='small'
							sx={{ width: { xs: '100%', sm: 220 }, minWidth: 0 }}
						/>
					)}

					<FormControl variant='outlined' size='small' sx={{ width: { xs: '100%', sm: 160 }, minWidth: 0 }}>
						<InputLabel>{t('level')}</InputLabel>
						<Select
							value={selectedLevel}
							onChange={event => {
								setSelectedLevel(event.target.value)
							}}
							label='Level'
						>
							{Object.keys(headers || {}).map(key => (
								<MenuItem key={key} value={key}>
									{t('levels')[key]}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<IconButton
						onClick={handleAddSkill}
						color='primary'
						disabled={!selectedSkill?.name?.trim() || !selectedLevel}
						sx={{
							backgroundColor: '#5627DB',
							color: 'white',
							'&:hover': { backgroundColor: '#4520A6' },
							'&:disabled': { backgroundColor: '#cccccc', color: '#666666' },
							height: { xs: 36, sm: 40 },
						}}
					>
						<AddIcon />
					</IconButton>
				</Box>
			)}

			<div className={styles.data}>
				<table>
					<tbody>
						{keysToRender.map(level => {
							const levelSkills = skillsToDisplay[level] || []
							const hasSkills = Array.isArray(levelSkills) && levelSkills.length > 0
							return (
								<tr key={level}>
									<td
										style={{
											fontSize: 14,
											width: '120px',
											verticalAlign: 'top',
											paddingRight: '12px',
										}}
									>
										{t('levels')[level] || level}
									</td>
									<td style={{ width: 'auto' }}>
										{hasSkills ? (
											<div className={styles.skillChipContainer}>
												{levelSkills.map((skill, index) => (
													<Chip
														key={`${level}-${index}-${skill.name}`}
														label={skill.name + (skill.date ? `\n${skill.date}` : '')}
														variant='filled'
														style={{
															color: skill.date ? skill.color : level === '上級' ? '#ffffff' : level === '中級' ? '#FFFFFF' : '#5627db',
															backgroundColor: skill.date ? skill.color + '16' : level === '上級' ? '#5627DB' : level === '中級' ? '#7852e2' : '#efeafc',
															fontWeight: 500,
															fontSize: 13,
															borderRadius: '16px',
														}}
														sx={{
															height: 'auto',
															'& .MuiChip-label': {
																display: 'block',
																whiteSpace: 'pre-wrap',
																padding: '6px 12px',
															},
														}}
														onDelete={editMode ? () => handleDeleteSkill(skill, level) : undefined}
													/>
												))}
											</div>
										) : (
											// Show not submitted when explicitly requested
											showEmptyAsNotSubmitted && <div style={{ color: '#666', fontSize: 14 }}>{t('none')}</div>
										)}
									</td>
								</tr>
							)
						})}
						{keysToRender.length === 0 && (
							<tr>
								<td
									colSpan='2'
									style={{
										textAlign: 'center',
										padding: '20px',
										color: '#999',
									}}
								>
									{t('notEntered')}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}

SkillSelector.propTypes = {
	title: PropTypes.string.isRequired,
	data: PropTypes.object,
	editData: PropTypes.object,
	editMode: PropTypes.bool,
	headers: PropTypes.object,
	updateEditData: PropTypes.func,
	keyName: PropTypes.string.isRequired,
	parentKey: PropTypes.string,
	showAutocomplete: PropTypes.bool,
	showHeaders: PropTypes.bool,
	icon: PropTypes.node,
	isChanged: PropTypes.bool,
	showEmptyAsNotSubmitted: PropTypes.bool,
}

export default SkillSelector
