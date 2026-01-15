import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import WarningIcon from '@mui/icons-material/Warning'
import CloseIcon from '@mui/icons-material/Close'
import { Button } from '@mui/material'
import Cookies from 'js-cookie'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/logo.png'
import universityImage from '../../assets/university.png'
import LanguageSelectionModal from '../../components/LanguageSelectionModal/LanguageSelectionModal'
import { LanguageSelect } from '../../components/languageSelector/LanguageSelect'
import { UserContext } from '../../contexts/UserContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import styles from './Login.module.css'

const Login = () => {
	const savedLanguage = localStorage.getItem('language') || 'ja'
	const [language] = useState(savedLanguage)
	const t = key => translations[language][key] || key
	const navigate = useNavigate()
	const { updateUser } = useContext(UserContext)

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [error, setError] = useState('')
	const [info, setInfo] = useState('')
	const [loginMode, setLoginMode] = useState(true)
	const [showLanguageModal, setShowLanguageModal] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [isCoolingDown, setIsCoolingDown] = useState(false)
	const cooldownTimerRef = useRef(null)
	const [announcement, setAnnouncement] = useState(null)
	const [showAnnouncement, setShowAnnouncement] = useState(true)

	// Fetch active announcement
	useEffect(() => {
		const fetchAnnouncement = async () => {
			try {
				const response = await axios.get('/api/maintenance/active')
				if (response.data) {
					setAnnouncement(response.data)
				}
			} catch (error) {
				console.error('Error fetching announcement:', error)
			}
		}
		fetchAnnouncement()
	}, [])

	// Clear timers on unmount
	useEffect(() => {
		return () => {
			if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
		}
	}, [])

	const handleLogin = async e => {
		e.preventDefault()
		setError('')

		try {
			const response = await axios.post('/api/auth/login', { email, password })

			const { userType, userData } = response.data
			const token = Cookies.get('token')
			// Set token and userType as cookies (ensure these are set properly)
			// const expiresAt = new Date();
			// expiresAt.setTime(expiresAt.getTime() + (1 * 60 * 60 * 1000)); //expires at 1h
			// Cookies.set('token', token, { expires: expiresAt, secure: true, sameSite: 'Strict' });
			// Cookies.set('userType', userType, { expires: expiresAt, secure: true, sameSite: 'Strict' });

			sessionStorage.setItem('token', token)
			sessionStorage.setItem('role', userType)
			sessionStorage.setItem('loginUser', JSON.stringify(userData))
			updateUser()

			// Check if user has selected a language before
			const hasSelectedLanguage = localStorage.getItem('hasSelectedLanguage')
			if (!hasSelectedLanguage) {
				setShowLanguageModal(true)
			} else {
				navigate('/')
			}
		} catch (err) {
			setError((err.response?.status === 400 && 'login_failed') || 'Login failed')
		}
	}

	const handleForgotPassword = async e => {
		e.preventDefault()
		setError('')
		setInfo('')

		// Client-side cooldown to avoid repeated server calls
		try {
			const raw = localStorage.getItem('forgotCooldowns')
			const map = raw ? JSON.parse(raw) : {}
			const emailKey = String(email || '')
				.toLowerCase()
				.trim()
			const until = map[emailKey]
			const now = Date.now()
			if (until && now < until) {
				setInfo('If an account exists, a password has already been sent recently.')
				setIsCoolingDown(true)
				const ms = until - now
				if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
				cooldownTimerRef.current = setTimeout(() => setIsCoolingDown(false), ms)
				return
			}
		} catch (_) {}

		setIsSubmitting(true)
		try {
			const response = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email }),
			})

			if (!response.ok) {
				throw new Error('Failed to send password reset email')
			}

			let payload = {}
			try {
				payload = await response.json()
			} catch (_) {}

			const retryAfterSec = Number(payload?.retryAfter) || 60

			// Persist cooldown
			try {
				const raw = localStorage.getItem('forgotCooldowns')
				const map = raw ? JSON.parse(raw) : {}
				const emailKey = String(email || '')
					.toLowerCase()
					.trim()
				map[emailKey] = Date.now() + retryAfterSec * 1000
				localStorage.setItem('forgotCooldowns', JSON.stringify(map))
			} catch (_) {}

			if (payload?.rateLimited) {
				setInfo('If an account exists, a password has already been sent recently.')
				setIsCoolingDown(true)
				if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current)
				cooldownTimerRef.current = setTimeout(() => setIsCoolingDown(false), retryAfterSec * 1000)
			} else {
				// Show UX feedback and navigate back to login
				setInfo('If an account exists, a new password has been sent to your email.')
				setTimeout(() => {
					setLoginMode(true)
				}, 1500)
			}
		} catch (err) {
			setError(err.message)
		} finally {
			setIsSubmitting(false)
		}
	}

	const togglePasswordVisibility = () => {
		setShowPassword(!showPassword)
	}

	return (
		<div className={styles['login-container']}>
			<div className={styles['login-form']}>
				<div className={styles['header-container']}>
					<img src={logo} alt='Logo' width={80} height={80} />
					<div className={styles['text-container']}>
						<h2 style={{ textWrap: 'wrap', textAlign: 'center' }}>{loginMode ? t('welcome') : t('forgotPassword')}</h2>
						{!loginMode && <p>{t('resetPassword2')}</p>}
					</div>
				</div>
				{announcement && showAnnouncement && (
					<div
						style={{
							backgroundColor: '#fef3c7',
							border: '1px solid #f59e0b',
							borderRadius: '8px',
							padding: '16px',
							marginBottom: '20px',
							position: 'relative',
							boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
							display: 'flex',
							alignItems: 'flex-start',
							gap: '12px',
						}}
					>
						<div
							style={{
								backgroundColor: '#f59e0b',
								borderRadius: '50%',
								width: '24px',
								height: '24px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
								marginTop: '2px',
							}}
						>
							<WarningIcon style={{ color: '#fff', fontSize: '16px' }} />
						</div>
						<div style={{ flex: 1 }}>
							<div
								style={{
									fontWeight: 'bold',
									color: '#92400e',
									marginBottom: '4px',
									fontSize: '14px',
								}}
							>
								{t('warning') || 'Warning'}
							</div>
							<div
								style={{
									color: '#92400e',
									fontSize: '14px',
									lineHeight: '1.5',
								}}
							>
								{announcement.message}
							</div>
						</div>
						<button
							onClick={() => setShowAnnouncement(false)}
							style={{
								position: 'absolute',
								top: '8px',
								right: '8px',
								background: 'transparent',
								border: 'none',
								cursor: 'pointer',
								color: '#92400e',
								padding: '4px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								borderRadius: '4px',
								transition: 'background-color 0.2s',
							}}
							onMouseEnter={e => {
								e.currentTarget.style.backgroundColor = 'rgba(146, 64, 14, 0.1)'
							}}
							onMouseLeave={e => {
								e.currentTarget.style.backgroundColor = 'transparent'
							}}
						>
							<CloseIcon style={{ fontSize: '18px' }} />
						</button>
					</div>
				)}
				{error && <p style={{ color: 'red' }}>{t(error) || 'Login failed!'}</p>}
				{info && <p style={{ color: 'green' }}>{info}</p>}
				{loginMode ? (
					<form onSubmit={handleLogin}>
						<div className={styles['input-group']}>
							<div className={styles['language']}>
								<div style={{ fontWeight: 700 }}>{t('email')}</div>
								<LanguageSelect style={{ padding: '2px' }} />
							</div>
							<div className={styles['input-icon']}>
								<EmailOutlinedIcon />
								<input type='email' placeholder={t('enterYourLogin')} value={email} onChange={e => setEmail(e.target.value)} required />
							</div>
						</div>
						<div className={styles['input-group']}>
							<label>{t('current_password')}</label>
							<div className={styles['input-icon']}>
								<LockOutlinedIcon />
								<input type={showPassword ? 'text' : 'password'} placeholder={t('enterYourPassword')} value={password} onChange={e => setPassword(e.target.value)} required />
								{password && (
									<span onClick={togglePasswordVisibility} className={styles['visibility-icon']}>
										{showPassword ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
									</span>
								)}
							</div>
						</div>
						<div className={styles['remember-me-container']}>
							<div className={styles['remember-me']}>
								<input type='checkbox' id='remember' name='remember' />
								<label htmlFor='remember'>{t('save')}</label>
							</div>
							<div className={styles['forgot-password']}>
								<button
									type='button'
									onClick={() => {
										setLoginMode(false)
										setError('')
										setInfo('')
									}}
									className={styles['forgot-password-button']}
								>
									{t('forgotPassword')}
								</button>
							</div>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
							<Button type='submit' variant='contained' style={{ width: '100%' }} disabled={isSubmitting}>
								{t('loginLabel')}
							</Button>
							<Button
								variant='outlined'
								type='button'
								style={{ width: '100%', fontSize: '14px' }}
								onClick={() => {
									window.location.href = '/api/auth/google'
								}}
							>
								<img src='/google-icon.webp' alt='google-icon' width={25} />
								Googleでログイン
							</Button>
						</div>
					</form>
				) : (
					// Forgot Password mode
					<form onSubmit={handleForgotPassword}>
						<div className={styles['input-group']}>
							<label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
								{t('email')}
								<LanguageSelect />
							</label>
							<div className={styles['input-icon']}>
								<input type='email' placeholder={t('enterYourLogin')} value={email} onChange={e => setEmail(e.target.value)} required />
							</div>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
							<Button variant='contained' type='submit' disabled={isSubmitting || isCoolingDown} style={{ width: '100%' }}>
								{isSubmitting ? t('loading') : t('send')}
							</Button>
							<Button
								type='button'
								variant='outlined'
								style={{ width: '100%' }}
								onClick={() => {
									setLoginMode(true)
									setError('')
									setInfo('')
								}}
							>
								{t('back')}
							</Button>
						</div>
					</form>
				)}
			</div>
			<div className={styles['login-image']}>
				<img src={universityImage} alt='University' />
			</div>
			<LanguageSelectionModal
				open={showLanguageModal}
				onClose={() => {
					setShowLanguageModal(false)
					navigate('/')
				}}
			/>
		</div>
	)
}

export default Login
