import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Typography } from '@mui/material'
import PropTypes from 'prop-types'
import React from 'react'
import { useLanguage } from '../../contexts/LanguageContext.jsx'
import translations from '../../locales/translations.js'

function ConfirmationDialog({ open, onClose, onConfirm }) {
	const [checked, setChecked] = React.useState(false)
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	return (
		// <Dialog
		// 	open={open}
		// 	onClose={onClose}
		// 	fullWidth
		// 	maxWidth='sm'
		// 	closeAfterTransition={false}
		// >
		// 	{/* Large Title */}
		// 	<DialogTitle sx={{ fontWeight: '100' }}>{t('profile_publish_request')}</DialogTitle>
		//
		// 	<DialogContent dividers>
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Main content */}
		// 		<Typography variant='body2' sx={{ whiteSpace: 'pre-line', mt: 1 }}>
		// 			{t('profile_publish_explanation')}
		// 		</Typography>
		//
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Prohibited actions section */}
		// 		<Typography variant='body2' sx={{ fontWeight: 'bold', mt: 1 }}>
		// 			{t('prohibited_actions')}
		// 		</Typography>
		// 		<Typography variant='body2' sx={{ whiteSpace: 'pre-line' }}>
		// 			{t('prohibited_actions_content')}
		// 		</Typography>
		//
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Agreement checkbox */}
		// 		<Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
		// 			<Checkbox
		// 				checked={checked}
		// 				onChange={e => setChecked(e.target.checked)}
		// 			/>
		// 			<Typography>{t('confirm_no_prohibited_actions')}</Typography>
		// 		</Box>
		// 	</DialogContent>
		// 	<DialogContent dividers>
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Main content */}
		// 		<Typography variant='body2' className='profileExplanation' sx={{ mt: 1 }}>
		// 			{t('profile_publish_explanation')}
		// 		</Typography>
		//
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Prohibited actions section */}
		// 		<Typography variant='body2' className='prohibitedActionsTitle' sx={{ mt: 1 }}>
		// 			{t('prohibited_actions')}
		// 		</Typography>
		// 		<Typography variant='body2' className='prohibitedActionsContent'>
		// 			{t('prohibited_actions_content')}
		// 		</Typography>
		//
		// 		<Divider sx={{ my: 1 }} />
		//
		// 		{/* Agreement checkbox */}
		// 		<Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
		// 			<Checkbox
		// 				checked={checked}
		// 				onChange={e => setChecked(e.target.checked)}
		// 			/>
		// 			<Typography>{t('confirm_no_prohibited_actions')}</Typography>
		// 		</Box>
		// 	</DialogContent>
		// 	<DialogActions sx={{ pr: 3, pb: 2 }}>
		// 		<Button
		// 			variant='outlined'
		// 			color='error'
		// 			onClick={onClose}
		// 			sx={{ mr: 2 }}
		// 		>
		// 			{t('no_button')}
		// 		</Button>
		//
		// 		<Button
		// 			variant='contained'
		// 			color='primary'
		// 			onClick={onConfirm}
		// 			disabled={!checked}
		// 		>
		// 			{t('apply_button')}
		// 		</Button>
		// 	</DialogActions>
		// </Dialog>
		<Dialog
			open={open}
			onClose={onClose}
			fullWidth
			maxWidth='sm'
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
				{t('profile_publish_request')}
			</DialogTitle>

			<DialogContent dividers sx={{ backgroundColor: '#fafafa', borderRadius: 2 }}>
				{/* Main content */}
				<Typography variant='body2' className='profileExplanation' sx={{ mt: 1 }}>
					{t('profile_publish_explanation')}
				</Typography>

				<Divider sx={{ my: 2 }} />

				{/* Prohibited actions section */}
				<Typography variant='body2' className='prohibitedActionsTitle' sx={{ mt: 1, textAlign: 'center', fontSize: '1.25rem' }}>
					{t('prohibited_actions')}
				</Typography>
				{/*<Typography variant='body2' className='prohibitedActionsContent'>*/}
				{/*	{t('prohibited_actions_content')}*/}
				{/*</Typography>*/}
				<Box component='ul' sx={{ pl: 3, mt: 1, mb: 2, listStyle: 'none' }} className='prohibitedActionsContent'>
					{t('prohibited_actions_content')
						.split(/\n(?=\d+\.)/)
						.map((item, index) => (
							<Typography
								variant='body2'
								className='prohibitedActionsContent'
								component='div'
								key={index}
								dangerouslySetInnerHTML={{
									__html: t('prohibited_actions_content'),
								}}
							/>
						))}
				</Box>

				<Divider sx={{ my: 2 }} />

				{/* Agreement checkbox */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						mt: 1,
						pl: 0.5,
					}}
				>
					<Checkbox checked={checked} onChange={e => setChecked(e.target.checked)} sx={{ mr: 1 }} />
					<Typography>{t('confirm_no_prohibited_actions')}</Typography>
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

				<Button variant='contained' color='primary' onClick={onConfirm} disabled={!checked} sx={{ width: 120 }}>
					{t('apply_button')}
				</Button>
			</DialogActions>
		</Dialog>
	)
}

ConfirmationDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onConfirm: PropTypes.func.isRequired,
}

export default ConfirmationDialog
