import { Avatar, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, TextField, Typography } from '@mui/material'
import { debounce } from 'lodash'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import { searchRecruiters } from '../../lib/api/companies-api'

const RecruiterAssignDialog = ({ open, onClose, onAssign, assigning, currentCompanyId }) => {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState([])
	const [loading, setLoading] = useState(false)

	const runSearch = useMemo(
		() =>
			debounce(async value => {
				if (!value.trim()) {
					setResults([])
					return
				}
				setLoading(true)
				try {
					const data = await searchRecruiters(value)
					const list = Array.isArray(data) ? data : data?.items || []
					// Boshqa kompaniyaga biriktirilganlarni ham ko'rsatamiz (qayta biriktirish mumkin),
					// faqat allaqachon shu kompaniyada bo'lganlarni yashiramiz.
					setResults(list.filter(r => r.companyId !== currentCompanyId))
				} catch {
					setResults([])
				} finally {
					setLoading(false)
				}
			}, 350),
		[currentCompanyId]
	)

	const handleChange = e => {
		const value = e.target.value
		setQuery(value)
		runSearch(value)
	}

	const close = () => {
		setQuery('')
		setResults([])
		onClose()
	}

	return (
		<Dialog open={open} onClose={close} fullWidth maxWidth='sm'>
			<DialogTitle>Recruiter biriktirish</DialogTitle>
			<DialogContent>
				<TextField autoFocus fullWidth placeholder="Ism, email yoki telefon bo'yicha qidirish..." value={query} onChange={handleChange} sx={{ mb: 2 }} />
				{loading && <CircularProgress size={20} />}
				{!loading && query && results.length === 0 && (
					<Typography color='text.secondary' fontSize={14}>
						Hech narsa topilmadi
					</Typography>
				)}
				<List dense>
					{results.map(r => (
						<ListItem key={r.id} disablePadding>
							<ListItemButton disabled={assigning} onClick={() => onAssign(r.id)}>
								<ListItemAvatar>
									<Avatar src={r.photo || undefined}>{r.first_name?.[0] || '?'}</Avatar>
								</ListItemAvatar>
								<ListItemText primary={`${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email} secondary={r.company?.company_name ? `${r.email} — hozir: ${r.company.company_name}` : r.email} />
							</ListItemButton>
						</ListItem>
					))}
				</List>
			</DialogContent>
			<DialogActions>
				<Button onClick={close}>Yopish</Button>
			</DialogActions>
		</Dialog>
	)
}

RecruiterAssignDialog.propTypes = {
	open: PropTypes.bool.isRequired,
	onClose: PropTypes.func.isRequired,
	onAssign: PropTypes.func.isRequired,
	assigning: PropTypes.bool,
	currentCompanyId: PropTypes.number,
}

export default RecruiterAssignDialog
