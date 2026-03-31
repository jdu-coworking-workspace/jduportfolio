import { Box, Container, Button } from '@mui/material'
import { useContext } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { UserContext } from '../../contexts/UserContext'
import translations from '../../locales/translations'
import style from './GuestLayout.module.css'
import logo from '/src/assets/logo40.png'

const GuestLayout = () => {
	const { language } = useContext(UserContext)
	const t = key => translations[language][key] || key

	return (
		<Box sx={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
			{/* Minimal Header */}
			<Box sx={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #ddd', p: 2 }}>
				<Container maxWidth='lg'>
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
						<img src={logo} alt='Logo' style={{ height: '40px' }} />
						<Button component={NavLink} to='/' variant='text' sx={{ textTransform: 'none', fontSize: '16px' }}>
							{t('home')}
						</Button>
					</Box>
				</Container>
			</Box>

			{/* Main Content - No Sidebar */}
			<Box sx={{ flex: 1, p: 2 }}>
				<Container maxWidth='lg'>
					<Outlet />
				</Container>
			</Box>
		</Box>
	)
}

export default GuestLayout
