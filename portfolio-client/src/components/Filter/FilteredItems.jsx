import { Box, Chip, Stack } from '@mui/material'
import { useLanguage } from '../../contexts/LanguageContext'
import { formatGraduationMonth } from '../../utils/formatGraduationMonth'
import translations from '../../locales/translations'
import { formatPartnerUniversity } from '../../utils/formatPartnerUniversity'

export const FilteredItems = ({ tempFilterState, setTempFilterState, onFilterChange }) => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	const handleDelete = (key, value) => {
		const prev = tempFilterState
		let newState

		if (Array.isArray(prev[key])) {
			newState = {
				...prev,
				[key]: prev[key].filter(item => item !== value),
			}
		} else {
			newState = {
				...prev,
				[key]: '',
			}
		}

		setTempFilterState(newState)
	}
	return (
		<Box sx={{ my: 2 }}>
			<Stack direction='row' sx={{ flexWrap: 'wrap', rowGap: '5px' }} spacing={'5px'}>
				{tempFilterState.jlpt &&
					tempFilterState.jlpt.map(level => (
						<Chip
							label={level}
							variant='outlined'
							key={level}
							onDelete={() => {
								handleDelete('jlpt', level)
							}}
						/>
					))}
				{tempFilterState.jdu_japanese_certification &&
					tempFilterState.jdu_japanese_certification.map(level => (
						<Chip
							label={level}
							variant='outlined'
							key={level}
							onDelete={() => {
								handleDelete('jdu_japanese_certification', level)
							}}
						/>
					))}
				{tempFilterState.it_skills &&
					tempFilterState.it_skills.map(level => (
						<Chip
							label={level}
							variant='outlined'
							key={level}
							onDelete={() => {
								handleDelete('it_skills', level)
							}}
						/>
					))}
				{tempFilterState.it_skills_match === 'all' && <Chip label='all' variant='outlined' onDelete={() => handleDelete('it_skills_match', 'all')} />}
				{tempFilterState.other_information === 'all' && <Chip label='all' variant='outlined' onDelete={() => handleDelete('other_information', 'all')} />}
				{tempFilterState.partner_university &&
					tempFilterState.partner_university.map(level => (
						<Chip
							variant='outlined'
							key={level}
							label={formatPartnerUniversity(level, t)}
							onDelete={() => {
								handleDelete('partner_university', level)
							}}
						/>
					))}
				{tempFilterState.graduation_year &&
					tempFilterState.graduation_year.map(yearValue => (
						<Chip
							variant='outlined'
							key={yearValue}
							label={formatGraduationMonth(yearValue, language)}
							onDelete={() => {
								handleDelete('graduation_year', yearValue)
							}}
						/>
					))}
			</Stack>
		</Box>
	)
}
