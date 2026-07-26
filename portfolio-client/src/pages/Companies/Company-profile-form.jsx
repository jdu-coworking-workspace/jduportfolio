import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, Grid, IconButton, Stack, TextField, Typography } from '@mui/material'
import PropTypes from 'prop-types'
import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { COMPANY_SECTIONS } from './company-fields'

const MAX_INTRO_LINKS = 4

/**
 * Kompaniya profili formasi (doc 2.4: PUT /api/recruiters/:id dagi `company` obyekti
 * bilan bir xil maydonlar, shu jumladan PUT /api/companies/:id uchun ham ishlatiladi).
 *
 * onSubmit(values) — faqat profil maydonlarini (company_name/isPartner'siz) qaytaradi.
 */
const CompanyProfileForm = ({ defaultValues, onSubmit, saving, submitLabel }) => {
	const [expanded, setExpanded] = useState(COMPANY_SECTIONS[0].key)

	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { isDirty },
	} = useForm({
		defaultValues: {
			...defaultValues,
			intro_page_links: defaultValues?.intro_page_links?.length > 0 ? defaultValues.intro_page_links : [{ title: '', url: '' }],
		},
	})

	const { fields, append, remove } = useFieldArray({ control, name: 'intro_page_links' })

	useEffect(() => {
		reset({
			...defaultValues,
			intro_page_links: defaultValues?.intro_page_links?.length > 0 ? defaultValues.intro_page_links : [{ title: '', url: '' }],
		})
	}, [defaultValues, reset])

	const submit = values => {
		const cleanedLinks = (values.intro_page_links || []).filter(l => l.title || l.url)
		onSubmit({ ...values, intro_page_links: cleanedLinks })
	}

	return (
		<Box component='form' onSubmit={handleSubmit(submit)}>
			{COMPANY_SECTIONS.map(section => (
				<Accordion key={section.key} expanded={expanded === section.key} onChange={() => setExpanded(expanded === section.key ? false : section.key)} disableGutters>
					<AccordionSummary expandIcon={<ExpandMoreIcon />}>
						<Typography fontWeight={600}>{section.title}</Typography>
					</AccordionSummary>
					<AccordionDetails>
						<Grid container spacing={2}>
							{section.fields.map(field => (
								<Grid item xs={12} sm={field.multiline ? 12 : 6} key={field.name}>
									<TextField {...register(field.name)} label={field.label} type={field.type === 'date' ? 'date' : 'text'} fullWidth multiline={field.multiline} minRows={field.multiline ? 3 : undefined} InputLabelProps={field.type === 'date' ? { shrink: true } : undefined} size='small' />
								</Grid>
							))}
						</Grid>
					</AccordionDetails>
				</Accordion>
			))}

			<Accordion expanded={expanded === 'links'} onChange={() => setExpanded(expanded === 'links' ? false : 'links')} disableGutters>
				<AccordionSummary expandIcon={<ExpandMoreIcon />}>
					<Typography fontWeight={600}>Intro sahifa havolalari (maks. 4)</Typography>
				</AccordionSummary>
				<AccordionDetails>
					<Stack spacing={2}>
						{fields.map((item, index) => (
							<Stack direction='row' spacing={1} alignItems='center' key={item.id}>
								<TextField {...register(`intro_page_links.${index}.title`)} label='Sarlavha' size='small' sx={{ flex: 1 }} />
								<TextField {...register(`intro_page_links.${index}.url`)} label='URL' size='small' sx={{ flex: 2 }} />
								<IconButton aria-label="Havolani o'chirish" onClick={() => remove(index)} disabled={fields.length === 1}>
									<DeleteOutlineIcon fontSize='small' />
								</IconButton>
							</Stack>
						))}
						<Button startIcon={<AddIcon />} onClick={() => append({ title: '', url: '' })} disabled={fields.length >= MAX_INTRO_LINKS} sx={{ alignSelf: 'flex-start' }}>
							Havola qo&apos;shish
						</Button>
					</Stack>
				</AccordionDetails>
			</Accordion>

			<Stack direction='row' justifyContent='flex-end' sx={{ mt: 2 }}>
				<Button type='submit' variant='contained' disabled={!isDirty || saving}>
					{submitLabel || 'Saqlash'}
				</Button>
			</Stack>
		</Box>
	)
}

CompanyProfileForm.propTypes = {
	defaultValues: PropTypes.object,
	onSubmit: PropTypes.func.isRequired,
	saving: PropTypes.bool,
	submitLabel: PropTypes.string,
}

export default CompanyProfileForm
