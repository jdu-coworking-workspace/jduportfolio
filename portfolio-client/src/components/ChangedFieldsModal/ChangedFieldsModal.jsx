import React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Chip, IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PropTypes from 'prop-types'

// Backend sends qa:category:key (e.g. qa:学生成績:q1); map Japanese category name to translation key
const QA_CATEGORY_TO_LABEL_KEY = {
	学生成績: 'student_grades',
	専門知識: 'specialized_knowledge',
	個性: 'personality',
	実務経験: 'work_experience',
	キャリア目標: 'career_goals',
}

const ChangedFieldsModal = ({ open, onClose, data, t = key => key }) => {
	// Map field key (backend) to translation key for t()
	const fieldToLabelKey = {
		self_introduction: 'selfIntroduction',
		hobbies: 'hobbies',
		skills: 'skills',
		it_skills: 'itSkills',
		gallery: 'gallery',
		deliverables: 'deliverables',
		other_information: 'other',
		address: 'origin',
		address_furigana: 'address_furigana',
		major: 'major',
		job_type: 'jobType',
		jlpt: 'jlpt',
		jdu_japanese_certification: 'jdu_certification',
		japanese_speech_contest: 'japaneseSpeechContest',
		it_contest: 'itContest',
		hobbies_description: 'hobbies_description',
		special_skills_description: 'special_skills_description',
		special_skills: 'specialSkills',
		language_skills: 'languageSkills',
		other_skills: 'otherSkills',
		licenses: 'licenses',
		education: 'education',
		work_experience: 'work_experience',
		arubaito: 'arubaito',
		qa: 'qa',
	}

	const getFieldName = field => {
		if (field === 'qa') return t('qa')
		if (field.startsWith('qa:')) {
			const parts = field.split(':')
			const categoryJa = parts[1]
			const labelKey = QA_CATEGORY_TO_LABEL_KEY[categoryJa]
			return labelKey ? t(labelKey) : categoryJa
		}
		const labelKey = fieldToLabelKey[field]
		return labelKey ? t(labelKey) : field
	}

	// Field kategoriyalarini guruhlash (backend sends qa:category:key, not qa.category)
	const categorizeFields = fields => {
		const categories = {
			basic: {
				nameKey: 'category_basic_info',
				fields: ['self_introduction', 'address', 'address_furigana', 'major', 'job_type'],
			},
			skills: {
				nameKey: 'category_skills_abilities',
				fields: ['skills', 'it_skills', 'special_skills', 'special_skills_description'],
			},
			interests: {
				nameKey: 'category_interests',
				fields: ['hobbies', 'hobbies_description'],
			},
			certifications: {
				nameKey: 'category_certifications',
				fields: ['jlpt', 'jdu_japanese_certification', 'japanese_speech_contest', 'it_contest'],
			},
			portfolio: {
				nameKey: 'category_portfolio',
				fields: ['gallery', 'deliverables'],
			},
			qa: {
				nameKey: 'category_qa',
				fields: fields.filter(f => f === 'qa' || f.startsWith('qa:')),
			},
			other: {
				nameKey: 'category_other',
				fields: ['other_information', 'education', 'work_experience', 'arubaito', 'licenses', 'language_skills', 'other_skills'],
			},
		}

		const groupedFields = {}

		fields.forEach(field => {
			let placed = false
			for (const [key, category] of Object.entries(categories)) {
				if (category.fields.includes(field) || (key === 'qa' && (field === 'qa' || field.startsWith('qa:')))) {
					if (!groupedFields[key]) {
						groupedFields[key] = {
							name: t(category.nameKey),
							fields: [],
						}
					}
					groupedFields[key].fields.push(field)
					placed = true
					break
				}
			}
			if (!placed) {
				if (!groupedFields.other) {
					groupedFields.other = {
						name: t('category_other'),
						fields: [],
					}
				}
				groupedFields.other.fields.push(field)
			}
		})

		return groupedFields
	}

	if (!data || !data.fields) return null

	const categorizedFields = categorizeFields(data.fields)

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth='sm'
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 2,
				},
			}}
		>
			<DialogTitle
				sx={{
					m: 0,
					p: 2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
				}}
			>
				<Box>
					<Typography variant='h6' component='div'>
						{t('changed_elements_list')}
					</Typography>
					<Typography variant='caption' color='text.secondary'>
						{data.studentName} ({data.studentId})
					</Typography>
				</Box>
				<IconButton
					aria-label='close'
					onClick={onClose}
					sx={{
						color: theme => theme.palette.grey[500],
					}}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>

			<DialogContent dividers sx={{ p: 3 }}>
				<Box sx={{ mb: 2 }}>
					<Typography variant='body2' color='text.secondary' gutterBottom>
						{t('changes_count_message').replace('%d', data.fields.length)}
					</Typography>
				</Box>

				{Object.entries(categorizedFields).map(([categoryKey, category]) => (
					<Box key={categoryKey} sx={{ mb: 3 }}>
						<Typography variant='subtitle2' color='primary' sx={{ mb: 1, fontWeight: 600 }}>
							{category.name}
						</Typography>
						<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
							{category.fields.map((field, index) => (
								<Chip
									key={index}
									label={getFieldName(field)}
									size='small'
									sx={{
										backgroundColor: '#e3f2fd',
										color: '#1976d2',
										'& .MuiChip-label': {
											fontSize: '13px',
											fontWeight: 500,
										},
									}}
								/>
							))}
						</Box>
					</Box>
				))}
			</DialogContent>

			<DialogActions sx={{ p: 2 }}>
				<Button onClick={onClose} variant='outlined' size='small'>
					{t('close')}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

ChangedFieldsModal.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	data: PropTypes.shape({
		fields: PropTypes.arrayOf(PropTypes.string),
		studentName: PropTypes.string,
		studentId: PropTypes.string,
	}),
	t: PropTypes.func,
}

export default ChangedFieldsModal
