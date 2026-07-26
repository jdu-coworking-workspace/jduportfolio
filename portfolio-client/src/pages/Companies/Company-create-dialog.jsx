import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Switch, TextField } from '@mui/material'
import PropTypes from 'prop-types'
import { useForm } from 'react-hook-form'

const CompanyCreateDialog = ({ open, onClose, onCreate, saving, serverError }) => {
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm({ defaultValues: { company_name: '', isPartner: false } })

	const close = () => {
		reset()
		onClose()
	}

	const submit = values => onCreate(values)

	return (
		<Dialog open={open} onClose={close} fullWidth maxWidth='xs'>
			<DialogTitle>Yangi kompaniya</DialogTitle>
			<Box component='form' onSubmit={handleSubmit(submit)}>
				<DialogContent>
					<Stack spacing={2}>
						<TextField autoFocus label='Kompaniya nomi' fullWidth {...register('company_name', { required: 'Kompaniya nomi majburiy' })} error={!!errors.company_name} helperText={errors.company_name?.message} />
						<FormControlLabel control={<Switch {...register('isPartner')} />} label='Hamkor kompaniya (isPartner)' />
						{serverError && <Box sx={{ color: 'error.main', fontSize: 14 }}>{serverError}</Box>}
					</Stack>
				</DialogContent>
				<DialogActions>
					<Button onClick={close}>Bekor qilish</Button>
					<Button type='submit' variant='contained' disabled={saving}>
						Yaratish
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
