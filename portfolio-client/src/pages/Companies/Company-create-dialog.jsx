import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'

const CompanyCreateDialog = ({ open, onClose, onCreate, saving, serverError }) => {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({ defaultValues: { company_name: '', isPartner: false } })
	const { language } = useLanguage() // Get current language from context
	const t = key => translations[language][key] || key
	const close = () => {
		reset()
		onClose()
	}

	const submit = values => onCreate(values)

	return (
		<Dialog open={open} onClose={close} fullWidth maxWidth='xs'>
			<DialogTitle>{t('new_company')}</DialogTitle>
			<Box component='form' onSubmit={handleSubmit(submit)}>
				<DialogContent>
					<Stack spacing={2}>
						<TextField autoFocus label={t('company_name')} fullWidth {...register('company_name', { required: t('company_name_required') })} error={!!errors.company_name} helperText={errors.company_name?.message} />
						<TextField label={t('company_representative')} fullWidth {...register('company_representative', { required: t('company_representative_required') })} error={!!errors.company_representative} helperText={errors.company_representative?.message} />
						<FormControlLabel control={<Switch {...register('isPartner')} />} label={t('is_partner')} />
						{serverError && <Box sx={{ color: 'error.main', fontSize: 14 }}>{serverError}</Box>}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={close}>{t('cancel')}</Button>
					<Button type='submit' variant='contained' disabled={saving}>
						{t('create_company')}
					</Button>
				</DialogActions>
			</Box>
		</Dialog>
	)
}

CompanyCreateDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onCreate: PropTypes.func.isRequired,
	saving: PropTypes.bool,
	serverError: PropTypes.string,
}

export default CompanyCreateDialog
