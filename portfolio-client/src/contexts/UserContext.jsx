import { createContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import Cookies from 'js-cookie'

export const UserContext = createContext()

const readSessionUser = () => {
	try {
		const raw = sessionStorage.getItem('loginUser')
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

export const UserProvider = ({ children }) => {
	const [role, setRole] = useState(() => sessionStorage.getItem('role') || Cookies.get('userType') || null)
	const [userId, setUserId] = useState(() => readSessionUser()?.id ?? null)
	const [activeUser, setActiveUser] = useState(readSessionUser)
	const [language, setLanguage] = useState(localStorage.getItem('language') || 'ja')
	const [isInitializing, setIsInitializing] = useState(() => {
		return !sessionStorage.getItem('role') && !!Cookies.get('token')
	})

	const fetchAndSetUser = async () => {
		const userRole = sessionStorage.getItem('role')
		const loginUser = sessionStorage.getItem('loginUser')

		// If sessionStorage is empty but cookies exist, sync from backend
		if ((!userRole || !loginUser) && Cookies.get('token') && Cookies.get('userType')) {
			try {
				const response = await fetch('/api/auth/me', {
					credentials: 'include',
				})
				if (response.ok) {
					const userData = await response.json()
					const cookieUserType = Cookies.get('userType')

					sessionStorage.setItem('role', cookieUserType)
					sessionStorage.setItem('loginUser', JSON.stringify(userData))
					sessionStorage.setItem('token', Cookies.get('token'))

					setRole(cookieUserType)
					setUserId(userData.id)
					setActiveUser(userData)
					setIsInitializing(false)
					return userData
				}
			} catch (error) {
				console.error('Failed to sync user from cookies:', error)
			}
		}

		const parsedUser = loginUser ? JSON.parse(loginUser) : null
		const parsedUserId = parsedUser ? parsedUser.id : null
		setActiveUser(parsedUser)
		setRole(userRole)
		setUserId(parsedUserId)
		setIsInitializing(false)
		return parsedUser
	}

	useEffect(() => {
		if (isInitializing) {
			fetchAndSetUser()
		}
	}, [])

	const updateUser = () => {
		return fetchAndSetUser()
	}

	const changeLanguage = lang => {
		setLanguage(lang)
		localStorage.setItem('language', lang)
	}

	return <UserContext.Provider value={{ role, userId, activeUser, updateUser, language, changeLanguage, isInitializing }}>{children}</UserContext.Provider>
}

UserProvider.propTypes = {
	children: PropTypes.node.isRequired,
}
