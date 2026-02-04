import React from 'react'
import PropTypes from 'prop-types'
import { TextField as MuiTextField } from '@mui/material'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import styles from './TextField.module.css'

const TextField = ({
	title,
	data,
	editData,
	editMode,
	updateEditData,
	keyName,
	parentKey,
	icon: Icon,
	iconColor = '#7049e1',
	imageUrl,
	details = null,
	isChanged = false,
	maxLength, // optional: limit input length
	showCounter = false, // optional: show character counter
	imageVersion, // optional: cache-busting version string
	stackOnSmall = false, // optional: stack image above text on small screens
	placeholder, // optional: placeholder text for input
}) => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const handleChange = e => {
		updateEditData(keyName, e.target.value)
	}

	return (
		<div
			className={`${styles.container} ${stackOnSmall ? styles.stackSmall : ''}`}
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
						top: -10,
						right: 10,
						backgroundColor: '#ffc107',
						color: '#fff',
						padding: '2px 8px',
						borderRadius: '4px',
						fontSize: '12px',
						fontWeight: 'bold',
					}}
				>
					{t('changed') || 'Changed'}
				</div>
			)}
			<div className={styles.title}>
				{Icon && <Icon sx={{ color: iconColor }} />}
				{title}
			</div>
			<div className={styles.row}>
				{imageUrl ? (
					<img
						src={imageVersion ? `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}v=${encodeURIComponent(imageVersion)}` : imageUrl}
						alt={imageUrl}
						className={styles.image}
						style={{
							borderRadius: 12,
							imageRendering: 'high-quality',
							width: 'clamp(96px, 25vw, 200px)',
							height: 'clamp(96px, 25vw, 200px)',
							objectFit: 'cover',
							objectPosition: 'center',
						}}
					/>
				) : (
					''
				)}
				<div className={styles.data}>{editMode ? <MuiTextField value={(parentKey ? editData[parentKey]?.[keyName] : editData[keyName]) || ''} onChange={handleChange} variant='outlined' sx={{ width: '100%' }} multiline placeholder={placeholder} inputProps={maxLength ? { maxLength } : undefined} helperText={showCounter && maxLength ? `${((parentKey ? editData[parentKey]?.[keyName] : editData[keyName]) || '').length}/${maxLength}` : undefined} /> : <div className={styles.displayValue}>{data ? data : t('notEntered') || 'Not entered'}</div>}</div>
			</div>
			{details ? (
				<div style={{ display: 'flex', gap: 8 }}>
					{details.map((item, ind) => (
						<div key={ind} className={styles.detail}>
							{item}
						</div>
					))}
				</div>
			) : (
				''
			)}
		</div>
	)
}

export default TextField

TextField.propTypes = {
	title: PropTypes.string.isRequired,
	data: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
	editData: PropTypes.object,
	editMode: PropTypes.bool,
	updateEditData: PropTypes.func,
	keyName: PropTypes.string,
	parentKey: PropTypes.string,
	icon: PropTypes.oneOfType([PropTypes.func, PropTypes.object]),
	iconColor: PropTypes.string,
	imageUrl: PropTypes.string,
	details: PropTypes.array,
	isChanged: PropTypes.bool,
	maxLength: PropTypes.number,
	showCounter: PropTypes.bool,
	imageVersion: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
	stackOnSmall: PropTypes.bool,
}
