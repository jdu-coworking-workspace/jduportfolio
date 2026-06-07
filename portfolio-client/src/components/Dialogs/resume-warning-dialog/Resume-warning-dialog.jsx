import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../../contexts/LanguageContext.jsx'
import translations from '../../../locales/translations.js'

function ResumeWarningDialog({ open, onClose, onConfirm }) {
	const [checked, setChecked] = useState(false)
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	useEffect(() => {
		if (!open) {
			setChecked(false)
		}
	}, [open])

	return (
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth='md'
			closeAfterTransition={false}
			PaperProps={{
				sx: {
					borderRadius: 3,
					p: 2,
				},
			}}
		>
			<DialogTitle
				sx={{
					fontWeight: 500,
					fontSize: '1.25rem',
					textAlign: 'center',
					mb: 1,
				}}
			>
				{t('warning') || 'Warning'}
			</DialogTitle>

			<DialogContent dividers sx={{ backgroundColor: '#fafafa', borderRadius: 2 }}>
				<Typography variant='body2' sx={{ mt: 1, whiteSpace: 'pre-line' }}>
					{t('resumeDownloadWarning')}
				</Typography>

				<Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
					<Checkbox checked={checked} onChange={e => setChecked(e.target.checked)} />
					<Typography variant='body2'>{t('confirm_to_download_cv') || "O'qib chiqdim"}</Typography>
				</Box>
			</DialogContent>

			<DialogActions
				sx={{
					justifyContent: 'center',
					gap: 2,
					pt: 2,
					pb: 3,
				}}
			>
				<Button variant='outlined' color='error' onClick={onClose} sx={{ width: 120 }}>
					{t('no_button')}
				</Button>

				<Button variant='contained' color='primary' onClick={onConfirm} disabled={!checked}>
					{t('download_cv')}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

ResumeWarningDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
}

export default ResumeWarningDialog
