import { useEffect, useState } from 'react'
import { Box, Tab, Tabs, Switch, TextField, Button, CircularProgress, FormControl, InputLabel, Select, MenuItem, Alert, Snackbar } from '@mui/material'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import styles from './MailService.module.css'

/**
 * Period options for periodic email (Tab 1):
 * 1 month, 3 months, 6 months, 1 year
 */
const PERIODIC_OPTIONS = [
	{ value: 30, labelKey: 'ms_1_month' },
	{ value: 90, labelKey: 'ms_3_months' },
	{ value: 180, labelKey: 'ms_6_months' },
	{ value: 365, labelKey: 'ms_1_year_plus' },
]

/**
 * Search period options for inactive student search (Tab 2):
 * 1 week, 2 weeks, 1 month, 3 months, 6 months
 */
const INACTIVE_SEARCH_OPTIONS = [
	{ value: 7, labelKey: 'ms_1_week' },
	{ value: 14, labelKey: 'ms_2_weeks' },
	{ value: 30, labelKey: 'ms_1_month' },
	{ value: 90, labelKey: 'ms_3_months' },
	{ value: 180, labelKey: 'ms_6_months_plus' },
]

const MailService = () => {
	const { language } = useLanguage()
	const langKey = language === 'jp' ? 'ja' : language
	const t = key => translations[language]?.[key] || key

	const [activeTab, setActiveTab] = useState('periodic')
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

	// Tab 1 - Periodic Email state
	const [periodicSetting, setPeriodicSetting] = useState(null)

	// Tab 2 - Inactive Student Email state
	const [inactiveSetting, setInactiveSetting] = useState(null)
	const [searchPeriod, setSearchPeriod] = useState('')
	const [inactiveStudents, setInactiveStudents] = useState(null)
	const [searching, setSearching] = useState(false)
	const [sendingInactive, setSendingInactive] = useState(false)
	const [inactiveSubject, setInactiveSubject] = useState('')
	const [inactiveBody, setInactiveBody] = useState('')
	const [sendResult, setSendResult] = useState(null)

	// Tab 2 - Never Active Students state (Condition 2)
	const [neverActiveStudents, setNeverActiveStudents] = useState(null)
	const [searchingNeverActive, setSearchingNeverActive] = useState(false)
	const [sendingNeverActive, setSendingNeverActive] = useState(false)
	const [neverActiveSubject, setNeverActiveSubject] = useState('')
	const [neverActiveBody, setNeverActiveBody] = useState('')
	const [neverActiveMailSetting, setNeverActiveMailSetting] = useState(null)
	const [savingNeverActiveTpl, setSavingNeverActiveTpl] = useState(false)
	const [neverActiveSendResult, setNeverActiveSendResult] = useState(null)

	useEffect(() => {
		fetchSettings()
	}, [])

	const fetchSettings = async () => {
		try {
			setLoading(true)
			const res = await axios.get('/api/mail-service')
			const settings = res.data

			const periodic = settings.find(s => s.key === 'periodic_email')
			const inactive = settings.find(s => s.key === 'inactive_student_email')
			const neverActive = settings.find(s => s.key === 'never_active_student_email')

			if (periodic) setPeriodicSetting(periodic)
			if (inactive) {
				setInactiveSetting(inactive)
				setInactiveSubject(inactive.message_subject || '')
				setInactiveBody(inactive.message_body || '')
			}
			if (neverActive) {
				setNeverActiveMailSetting(neverActive)
				setNeverActiveSubject(neverActive.message_subject || '')
				setNeverActiveBody(neverActive.message_body || '')
			} else if (inactive) {
				setNeverActiveSubject(inactive.message_subject || '')
				setNeverActiveBody(inactive.message_body || '')
			}
		} catch (error) {
			console.error('Error fetching mail service settings:', error)
			showSnackbar(t('ms_error_loading'), 'error')
		} finally {
			setLoading(false)
		}
	}

	const showSnackbar = (message, severity = 'success') => {
		setSnackbar({ open: true, message, severity })
	}

	// Toggle active status (Tab 1 only)
	const handleToggle = async key => {
		try {
			const res = await axios.patch(`/api/mail-service/${key}/toggle`)
			if (key === 'periodic_email') setPeriodicSetting(res.data)
			showSnackbar(t('ms_setting_updated'))
		} catch (error) {
			console.error('Error toggling setting:', error)
			showSnackbar(t('ms_error_updating'), 'error')
		}
	}

	// Save periodic email settings
	const handleSavePeriodic = async () => {
		try {
			setSaving(true)
			const res = await axios.put('/api/mail-service/periodic_email', {
				period_days: periodicSetting.period_days,
				message_subject: periodicSetting.message_subject,
				message_body: periodicSetting.message_body,
			})
			setPeriodicSetting(res.data)
			showSnackbar(t('ms_setting_updated'))
		} catch (error) {
			console.error('Error saving periodic setting:', error)
			showSnackbar(t('ms_error_updating'), 'error')
		} finally {
			setSaving(false)
		}
	}

	// Search for inactive students
	const handleSearchInactive = async () => {
		if (!searchPeriod) return
		try {
			setSearching(true)
			setSendResult(null)
			const res = await axios.get(`/api/mail-service/inactive-students/search?periodDays=${searchPeriod}`)
			setInactiveStudents(res.data)
		} catch (error) {
			console.error('Error searching inactive students:', error)
			showSnackbar(t('ms_error_searching'), 'error')
		} finally {
			setSearching(false)
		}
	}

	// Reset inactive students search
	const handleResetInactive = () => {
		setSearchPeriod('')
		setInactiveStudents(null)
		setSendResult(null)
	}

	// Send emails to inactive students
	const handleSendInactiveEmails = async () => {
		if (!searchPeriod || !inactiveSubject || !inactiveBody) {
			showSnackbar(t('ms_fill_all_fields'), 'error')
			return
		}
		try {
			setSendingInactive(true)
			const res = await axios.post('/api/mail-service/inactive-students/send', {
				periodDays: Number(searchPeriod),
				subject: inactiveSubject,
				body: inactiveBody,
			})
			setSendResult(res.data)
			showSnackbar(`${t('ms_emails_sent')}: ${res.data.successful}/${res.data.total}`, res.data.failed > 0 ? 'warning' : 'success')
		} catch (error) {
			console.error('Error sending inactive student emails:', error)
			showSnackbar(t('ms_error_sending'), 'error')
		} finally {
			setSendingInactive(false)
		}
	}

	// Search for never-active students (Condition 2)
	const handleSearchNeverActive = async () => {
		try {
			setSearchingNeverActive(true)
			setNeverActiveSendResult(null)
			const res = await axios.get('/api/mail-service/never-active-students/search')
			setNeverActiveStudents(res.data)
		} catch (error) {
			console.error('Error searching never-active students:', error)
			showSnackbar(t('ms_error_searching'), 'error')
		} finally {
			setSearchingNeverActive(false)
		}
	}

	// Reset never-active students search
	const handleResetNeverActive = () => {
		setNeverActiveStudents(null)
		setNeverActiveSendResult(null)
	}
	const handleSaveNeverActiveTemplate = async () => {
		if (!neverActiveSubject || !neverActiveBody) {
			showSnackbar(t('ms_fill_all_fields'), 'error')
			return
		}
		try {
			setSavingNeverActiveTpl(true)
			const res = await axios.put('/api/mail-service/never_active_student_email', {
				message_subject: neverActiveSubject,
				message_body: neverActiveBody,
			})
			setNeverActiveMailSetting(res.data)
			showSnackbar(t('ms_setting_updated'))
		} catch (error) {
			console.error('Error saving never-active template:', error)
			showSnackbar(t('ms_error_updating'), 'error')
		} finally {
			setSavingNeverActiveTpl(false)
		}
	}

	const handleSendNeverActiveEmails = async () => {
		if (!neverActiveSubject || !neverActiveBody) {
			showSnackbar(t('ms_fill_all_fields'), 'error')
			return
		}
		try {
			setSendingNeverActive(true)
			const res = await axios.post('/api/mail-service/never-active-students/send', {
				subject: neverActiveSubject,
				body: neverActiveBody,
			})
			setNeverActiveSendResult(res.data)
			showSnackbar(`${t('ms_emails_sent')}: ${res.data.successful}/${res.data.total}`, res.data.failed > 0 ? 'warning' : 'success')
		} catch (error) {
			console.error('Error sending never-active student emails:', error)
			showSnackbar(t('ms_error_sending'), 'error')
		} finally {
			setSendingNeverActive(false)
		}
	}

	const formatUpdatedBy = setting => {
		if (!setting?.updated_by_id) return null
		return `${setting.updated_by_type} #${setting.updated_by_id} — ${new Date(setting.updatedAt).toLocaleString(langKey === 'ja' ? 'ja-JP' : langKey === 'ru' ? 'ru-RU' : langKey === 'uz' ? 'uz-UZ' : 'en-US')}`
	}

	if (loading) {
		return (
			<div className={styles.loadingOverlay}>
				<CircularProgress />
			</div>
		)
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h1>{t('ms_title')}</h1>
			</div>

			<Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
				<Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} textColor='primary' indicatorColor='primary'>
					<Tab label={t('ms_periodic_email')} value='periodic' sx={{ fontWeight: 600 }} />
					<Tab label={t('ms_inactive_student_email')} value='inactive' sx={{ fontWeight: 600 }} />
				</Tabs>
			</Box>

			<div className={styles.tabContent}>
				{/* ====== Tab 1: Periodic Email ====== */}
				{activeTab === 'periodic' && periodicSetting && (
					<div className={styles.section}>
						<div className={styles.sectionHeader}>
							<h3>{t('ms_periodic_email_settings')}</h3>
							<Switch checked={periodicSetting.is_active} onChange={() => handleToggle('periodic_email')} color='primary' />
						</div>

						{formatUpdatedBy(periodicSetting) && (
							<div className={styles.updatedBy}>
								{t('ms_last_updated_by')}: {formatUpdatedBy(periodicSetting)}
							</div>
						)}

						<div className={styles.formGroup}>
							<FormControl fullWidth size='small'>
								<InputLabel>{t('ms_send_period')}</InputLabel>
								<Select
									value={periodicSetting.period_days || ''}
									label={t('ms_send_period')}
									onChange={e =>
										setPeriodicSetting(prev => ({
											...prev,
											period_days: Number(e.target.value),
										}))
									}
								>
									{PERIODIC_OPTIONS.map(opt => (
										<MenuItem key={opt.value} value={opt.value}>
											{t(opt.labelKey)}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						</div>

						<div className={styles.formGroup}>
							<TextField
								fullWidth
								size='small'
								label={t('ms_email_subject')}
								value={periodicSetting.message_subject || ''}
								onChange={e =>
									setPeriodicSetting(prev => ({
										...prev,
										message_subject: e.target.value,
									}))
								}
							/>
						</div>

						<div className={styles.formGroup}>
							<TextField
								fullWidth
								multiline
								rows={6}
								label={t('ms_email_body')}
								value={periodicSetting.message_body || ''}
								onChange={e =>
									setPeriodicSetting(prev => ({
										...prev,
										message_body: e.target.value,
									}))
								}
								helperText={t('ms_plain_text_hint')}
							/>
						</div>

						<div className={styles.actions}>
							<Button variant='contained' onClick={handleSavePeriodic} disabled={saving}>
								{saving ? <CircularProgress size={20} /> : t('ms_save')}
							</Button>
						</div>
					</div>
				)}

				{/* ====== Tab 2: Inactive Student Email ====== */}
				{activeTab === 'inactive' && (
					<div className={styles.section}>
						<h3 style={{ marginBottom: 8 }}>{t('ms_inactive_student_email')}</h3>

						{formatUpdatedBy(inactiveSetting) && (
							<div className={styles.updatedBy} style={{ marginBottom: 20 }}>
								{t('ms_last_updated_by')}: {formatUpdatedBy(inactiveSetting)}
							</div>
						)}

						{/* ── Section 1: Period-based inactive search ── */}
						<div className={styles.subsection}>
							<h4 className={styles.subsectionTitle}>{t('ms_inactive_period_title')}</h4>
							<p className={styles.subsectionDesc}>{t('ms_inactive_description')}</p>

							<div className={styles.selectRow}>
								<FormControl fullWidth size='small'>
									<InputLabel>{t('ms_search_period')}</InputLabel>
									<Select
										value={searchPeriod}
										label={t('ms_search_period')}
										onChange={e => {
											setSearchPeriod(e.target.value)
											setInactiveStudents(null)
											setSendResult(null)
										}}
									>
										{INACTIVE_SEARCH_OPTIONS.map(opt => (
											<MenuItem key={opt.value} value={opt.value}>
												{t(opt.labelKey)}
											</MenuItem>
										))}
									</Select>
								</FormControl>

								<Button variant='outlined' onClick={handleSearchInactive} disabled={!searchPeriod || searching} sx={{ minWidth: 120, height: 40 }}>
									{searching ? <CircularProgress size={20} /> : t('ms_search')}
								</Button>

								<Button variant={inactiveStudents !== null ? 'outlined' : 'text'} color={inactiveStudents !== null ? 'error' : 'inherit'} onClick={handleResetInactive} disabled={!searchPeriod && inactiveStudents === null} sx={{ minWidth: 100, height: 40, ...(inactiveStudents === null ? { color: '#aaa' } : {}) }}>
									{t('ms_reset')}
								</Button>
							</div>

							{/* Period search results */}
							{inactiveStudents !== null && (
								<div className={styles.studentList}>
									{inactiveStudents.count === 0 ? (
										<div className={`${styles.studentCount} ${styles.noStudents}`}>{t('ms_no_students_found')}</div>
									) : (
										<>
											<div className={styles.studentCount}>
												{t('ms_students_found')}: {inactiveStudents.count}
											</div>

											<table className={styles.studentTable}>
												<thead>
													<tr>
														<th>#</th>
														<th>{t('ms_student_id')}</th>
														<th>{t('ms_student_name')}</th>
														<th>{t('ms_email')}</th>
														<th>{t('ms_last_activity')}</th>
													</tr>
												</thead>
												<tbody>
													{inactiveStudents.students.map((student, idx) => (
														<tr key={student.id}>
															<td>{idx + 1}</td>
															<td>{student.student_id}</td>
															<td>{student.name}</td>
															<td>{student.email}</td>
															<td>{student.last_activity ? new Date(student.last_activity).toLocaleDateString(langKey === 'ja' ? 'ja-JP' : 'en-US') : '—'}</td>
														</tr>
													))}
												</tbody>
											</table>

											<div className={styles.formGroup} style={{ marginTop: 20 }}>
												<TextField fullWidth size='small' label={t('ms_email_subject')} value={inactiveSubject} onChange={e => setInactiveSubject(e.target.value)} />
											</div>

											<div className={styles.formGroup}>
												<TextField fullWidth multiline rows={5} label={t('ms_email_body')} value={inactiveBody} onChange={e => setInactiveBody(e.target.value)} helperText={t('ms_plain_text_hint')} />
											</div>

											<div className={styles.actions}>
												<Button variant='contained' color='primary' onClick={handleSendInactiveEmails} disabled={sendingInactive || !inactiveSubject || !inactiveBody}>
													{sendingInactive ? <CircularProgress size={20} /> : `${t('ms_send_email')} (${inactiveStudents.count})`}
												</Button>
											</div>
										</>
									)}
								</div>
							)}

							{sendResult && (
								<div className={`${styles.resultBox} ${sendResult.failed > 0 ? styles.error : styles.success}`}>
									{t('ms_send_result')}: {sendResult.successful}/{sendResult.total} {t('ms_successful')}
									{sendResult.failed > 0 && ` | ${sendResult.failed} ${t('ms_failed')}`}
								</div>
							)}
						</div>

						<hr className={styles.sectionDivider} />

						{/* ── Section 2: Never Active Students ── */}
						<div className={styles.subsection}>
							<h4 className={styles.subsectionTitle}>{t('ms_never_active_title')}</h4>
							<p className={styles.subsectionDesc}>{t('ms_never_active_description')}</p>

							{formatUpdatedBy(neverActiveMailSetting) && (
								<div className={styles.updatedBy} style={{ marginBottom: 16 }}>
									{t('ms_last_updated_by')}: {formatUpdatedBy(neverActiveMailSetting)}
								</div>
							)}

							<div className={styles.formGroup}>
								<TextField fullWidth size='small' label={t('ms_email_subject')} value={neverActiveSubject} onChange={e => setNeverActiveSubject(e.target.value)} />
							</div>
							<div className={styles.formGroup}>
								<TextField fullWidth multiline rows={5} label={t('ms_email_body')} value={neverActiveBody} onChange={e => setNeverActiveBody(e.target.value)} helperText={t('ms_plain_text_hint')} />
							</div>
							<div className={styles.actions} style={{ marginBottom: 20 }}>
								<Button variant='outlined' color='warning' onClick={handleSaveNeverActiveTemplate} disabled={savingNeverActiveTpl || !neverActiveSubject || !neverActiveBody}>
									{savingNeverActiveTpl ? <CircularProgress size={20} /> : t('ms_save')}
								</Button>
							</div>

							<div style={{ display: 'flex', gap: 12 }}>
								<Button variant='outlined' color='warning' onClick={handleSearchNeverActive} disabled={searchingNeverActive} sx={{ minWidth: 120, height: 40 }}>
									{searchingNeverActive ? <CircularProgress size={20} /> : t('ms_search')}
								</Button>

								<Button variant={neverActiveStudents !== null ? 'outlined' : 'text'} color={neverActiveStudents !== null ? 'error' : 'inherit'} onClick={handleResetNeverActive} disabled={neverActiveStudents === null} sx={{ minWidth: 100, height: 40, ...(neverActiveStudents === null ? { color: '#aaa' } : {}) }}>
									{t('ms_reset')}
								</Button>
							</div>

							{/* Never-active results */}
							{neverActiveStudents !== null && (
								<div className={styles.studentList}>
									{neverActiveStudents.count === 0 ? (
										<div className={`${styles.studentCount} ${styles.noStudents}`}>{t('ms_no_students_found')}</div>
									) : (
										<>
											<div className={styles.studentCount}>
												{t('ms_students_found')}: {neverActiveStudents.count}
											</div>

											<table className={styles.studentTable}>
												<thead>
													<tr>
														<th>#</th>
														<th>{t('ms_student_id')}</th>
														<th>{t('ms_student_name')}</th>
														<th>{t('ms_email')}</th>
														<th>{t('ms_registered_at')}</th>
													</tr>
												</thead>
												<tbody>
													{neverActiveStudents.students.map((student, idx) => (
														<tr key={student.id}>
															<td>{idx + 1}</td>
															<td>{student.student_id}</td>
															<td>{student.name}</td>
															<td>{student.email}</td>
															<td>{new Date(student.registered_at).toLocaleDateString(langKey === 'ja' ? 'ja-JP' : 'en-US')}</td>
														</tr>
													))}
												</tbody>
											</table>

											<div className={styles.actions}>
												<Button variant='contained' color='warning' onClick={handleSendNeverActiveEmails} disabled={sendingNeverActive || !neverActiveSubject || !neverActiveBody}>
													{sendingNeverActive ? <CircularProgress size={20} /> : `${t('ms_send_email')} (${neverActiveStudents.count})`}
												</Button>
											</div>
										</>
									)}
								</div>
							)}

							{neverActiveSendResult && (
								<div className={`${styles.resultBox} ${neverActiveSendResult.failed > 0 ? styles.error : styles.success}`}>
									{t('ms_send_result')}: {neverActiveSendResult.successful}/{neverActiveSendResult.total} {t('ms_successful')}
									{neverActiveSendResult.failed > 0 && ` | ${neverActiveSendResult.failed} ${t('ms_failed')}`}
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			<Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
				<Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant='filled' sx={{ width: '100%' }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</div>
	)
}

export default MailService
