import { useState, useEffect } from 'react'
import { TextField as MuiTextField, IconButton, Box, Switch, Chip } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import PropTypes from 'prop-types'
import styles from './QATextField.module.css'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'

const QATextField = ({ category, question: _question, keyName, editData, updateEditData, DeleteQA, aEdit = false, qEdit = false }) => {
	const { language } = useLanguage()
	const t = key => translations[language]?.[key] ?? key
	const [localEditData, setLocalEditData] = useState('')
	const [localEditQuestion, setLocalQuestion] = useState('')
	const [localRequired, setLocalRequired] = useState(false)

	useEffect(() => {
		if (category == false) {
			setLocalEditData(editData[keyName]?.answer || '')
			setLocalQuestion(editData[keyName]?.question || '')
			setLocalRequired(!!editData[keyName]?.required)
		} else {
			setLocalEditData(editData[category]?.[keyName]?.answer || '')
			setLocalQuestion(editData[category]?.[keyName]?.question || '')
			setLocalRequired(!!editData[category]?.[keyName]?.required)
		}
	}, [editData, category, keyName])

	const handleChange = (e, fieldType) => {
		const updatedValue = e.target.value

		if (category == false) {
			if (fieldType === 'question') {
				setLocalQuestion(updatedValue)
			} else if (fieldType === 'answer') {
				setLocalEditData(updatedValue)
			} else if (fieldType === 'required') {
				setLocalRequired(!!updatedValue)
			}
			updateEditData(keyName, updatedValue, fieldType)
		} else {
			if (fieldType === 'question') {
				setLocalQuestion(updatedValue)
			} else if (fieldType === 'answer') {
				setLocalEditData(updatedValue)
			} else if (fieldType === 'required') {
				setLocalRequired(!!updatedValue)
			}
			updateEditData(category, keyName, updatedValue, fieldType)
		}
	}

	return (
		<div className={styles.container}>
			<div className={styles.title}>
				{aEdit ? (
					<Box display={'flex'} alignItems={'center'} gap={1}>
						<MuiTextField value={localEditQuestion} onChange={e => handleChange(e, 'question')} variant='outlined' fullWidth multiline />
						<Chip size='small' color={localRequired ? 'warning' : 'default'} label={localRequired ? t('filter_required') : t('filter_optional')} />
						<Switch checked={localRequired} onChange={e => handleChange({ target: { value: e.target.checked } }, 'required')} inputProps={{ 'aria-label': 'required-toggle' }} />
						{aEdit && (
							<IconButton
								aria-label={t('delete_aria')}
								onClick={() => DeleteQA(keyName)}
								sx={{
									color: 'red',
								}}
							>
								<DeleteIcon />
							</IconButton>
						)}
					</Box>
				) : (
					<div>
						{localEditQuestion}
						{localRequired && <Chip size='small' color='warning' label={t('filter_required')} sx={{ ml: 1, mb: '2px' }} />}
					</div>
				)}
			</div>
			<div className={styles.data}>{qEdit ? <MuiTextField value={localEditData} onChange={e => handleChange(e, 'answer')} variant='outlined' fullWidth multiline /> : <>{!aEdit && <div>{localEditData}</div>}</>}</div>
		</div>
	)
}

QATextField.propTypes = {
	category: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
	question: PropTypes.string,
	keyName: PropTypes.string.isRequired,
	editData: PropTypes.object.isRequired,
	updateEditData: PropTypes.func.isRequired,
	DeleteQA: PropTypes.func.isRequired,
	aEdit: PropTypes.bool,
	qEdit: PropTypes.bool,
}

export default QATextField
