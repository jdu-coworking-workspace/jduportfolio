import { useState, useEffect } from 'react'
import { Box, Button, Card, CardContent, TextField, Typography, Switch, FormControlLabel, Alert } from '@mui/material'
import axios from '../../utils/axiosUtils'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import { useAlert } from '../../contexts/AlertContext'

const Maintenance = () => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key
	const showAlert = useAlert()

	const [message, setMessage] = useState('')
	const [isPublic, setIsPublic] = useState(false)
	const [loading, setLoading] = useState(false)
	const [currentAnnouncement, setCurrentAnnouncement] = useState(null)

	// Fetch current announcement on mount
	useEffect(() => {
		fetchAnnouncement()
	}, [])

	const fetchAnnouncement = async () => {
		try {
			const response = await axios.get('/api/maintenance-admin')
			if (response.data && response.data.length > 0) {
				const announcement = response.data[0] // Get the most recent one
				setCurrentAnnouncement(announcement)
				setMessage(announcement.message || '')
				setIsPublic(announcement.is_public || false)
			}
		} catch (error) {
			console.error('Error fetching announcement:', error)
		}
	}

	const handleUpdate = async () => {
		if (!message.trim()) {
			showAlert(t('message_required') || 'Message is required', 'error')
			return
		}

		setLoading(true)
		try {
			await axios.post('/api/maintenance-admin', {
				message,
				is_public: isPublic,
			})
			showAlert(t('announcement_updated') || 'Announcement updated successfully', 'success')
			await fetchAnnouncement() // Refresh data
		} catch (error) {
			console.error('Error updating announcement:', error)
			showAlert(t('error_updating_announcement') || 'Error updating announcement', 'error')
		} finally {
			setLoading(false)
		}
	}

	const handleTogglePublic = async () => {
		if (!currentAnnouncement) {
			showAlert(t('please_update_announcement_first') || 'Please update announcement first', 'error')
			return
		}

		try {
			const response = await axios.put(`/api/maintenance-admin/${currentAnnouncement.id}/toggle`)
			setIsPublic(response.data.is_public)
			setCurrentAnnouncement(response.data)
			showAlert(response.data.is_public ? t('announcement_made_public') || 'Announcement is now visible to all users' : t('announcement_made_private') || 'Announcement is now hidden from users', 'success')
		} catch (error) {
			console.error('Error toggling public status:', error)
			showAlert(t('error_toggling_status') || 'Error toggling status', 'error')
		}
	}

	return (
		<Box sx={{ padding: 3, maxWidth: 1200, margin: '0 auto' }}>
			<Typography variant='h4' sx={{ mb: 3 }}>
				{t('maintenance_announcement') || 'Maintenance Announcement'}
			</Typography>

			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant='h6' sx={{ mb: 2 }}>
						{t('announcement_settings') || 'Announcement Settings'}
					</Typography>

					<TextField fullWidth multiline rows={6} label={t('message') || 'Message'} value={message} onChange={e => setMessage(e.target.value)} sx={{ mb: 3 }} placeholder={t('enter_announcement_message') || 'Enter announcement message...'} />

					<Button variant='contained' onClick={handleUpdate} disabled={loading} sx={{ mb: 3 }}>
						{t('update') || 'Update'}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardContent>
					<Typography variant='h6' sx={{ mb: 2 }}>
						{t('visibility_settings') || 'Visibility Settings'}
					</Typography>

					<FormControlLabel control={<Switch checked={isPublic} onChange={handleTogglePublic} disabled={!currentAnnouncement} />} label={t('make_public') || 'Make announcement visible to all users on login page'} sx={{ mb: 2 }} />

					{currentAnnouncement && (
						<Alert severity={isPublic ? 'warning' : 'info'} sx={{ mt: 2 }}>
							{isPublic ? t('announcement_visible_to_all_users') || 'This announcement is currently visible to all users on the login page.' : t('announcement_hidden_from_users') || 'This announcement is currently hidden from users.'}
						</Alert>
					)}

					{currentAnnouncement && (
						<Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
							<Typography variant='body2' color='text.secondary'>
								<strong>{t('created_at') || 'Created'}:</strong> {new Date(currentAnnouncement.createdAt).toLocaleString()}
							</Typography>
							<Typography variant='body2' color='text.secondary'>
								<strong>{t('last_updated') || 'Last Updated'}:</strong> {new Date(currentAnnouncement.updatedAt).toLocaleString()}
							</Typography>
						</Box>
					)}
				</CardContent>
			</Card>
		</Box>
	)
}

export default Maintenance
