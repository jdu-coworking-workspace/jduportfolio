import { useContext } from 'react'
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import GuestLayout from './components/GuestLayout/GuestLayout'
import Layout from './components/Layout/Layout'
import ProtectedLayout from './components/ProtectedLayout'
import { UserContext } from './contexts/UserContext'

import LogOut from './components/LogOut'
import ChekProfile from './pages/ChekProfile/ChekProfile'
import { Companies } from './pages/Companies/Companies.jsx'
import CompanyDetailPage from './pages/Companies/Company-detail-page.jsx'
import { CreateSkill } from './pages/CreateSkill/CreateSkill.jsx'
import CreditDetails from './pages/CreditDetails/CreditDetails'
import FAQ from './pages/FAQ/FAQ'
import FirstLoginPage from './pages/FirstLoginPage/FirstLoginPage'
import GoogleAuthCallback from './pages/GoogleAuthCallback.jsx'
import Home from './pages/Home/Home'
import LinkExpired from './pages/LinkExpired/LinkExpired'
import Login from './pages/Login/Login'
import MailService from './pages/MailService/MailService.jsx'
import Maintenance from './pages/Maintenance/Maintenance.jsx'
import { News } from './pages/news/News.jsx'
import NewsDetail from './pages/news/NewsDetail.jsx'
import NotFound from './pages/NotFound/NotFound'
import CompanyProfile from './pages/Profile/CompanyProfile/CompanyProfile'
import QA from './pages/Profile/QA/QA'
import Stats from './pages/Profile/Stats/Stats'
import StudentProfile from './pages/Profile/StudentProfile/StudentProfile'
import Top from './pages/Profile/Top/Top'
import Recruiter from './pages/Recruiter/Recruiter'
import Setting from './pages/Setting/Setting'
import Staff from './pages/Staff/Staff'
import Student from './pages/Student/Student'
import Unauthorized from './pages/Unauthorized/Unauthorized'

const AppRoutes = () => {
	const { role, userId, updateUser, language } = useContext(UserContext)

	return (
		<Router>
			<Routes>
				{/* ── Authenticated routes (with sidebar/header) ── */}
				<Route path='/' element={<Layout />}>
					<Route element={<ProtectedLayout />}>
						<Route index element={role === 'Student' ? <Navigate to={`/profile`} /> : <Home />} />

						{/* Student list */}
						<Route path='/student' element={<ProtectedLayout allowedRoles={['Admin', 'Staff', 'Recruiter']} />}>
							<Route index element={<Student key='students' />} />
							<Route path='profile/:studentId/*' element={<StudentProfile />}>
								<Route index element={<Navigate to='top' />} />
								<Route path='top' element={<Top />} />
								<Route path='qa' element={<QA />} />
								<Route path='stats' element={<Stats />} />
							</Route>
						</Route>

						{/* Check profile */}
						<Route path='/checkprofile' element={<ProtectedLayout allowedRoles={['Admin', 'Staff']} />}>
							<Route index element={<ChekProfile key='checkprofile' />} />
							<Route path='profile/:studentId/*' element={<StudentProfile />}>
								<Route index element={<Navigate to='top' />} />
								<Route path='top' element={<Top />} />
								<Route path='qa' element={<QA />} />
								<Route path='stats' element={<Stats />} />
							</Route>
						</Route>

						<Route path='/recruiter' element={<ProtectedLayout allowedRoles={['Admin', 'Staff', 'Student']} />}>
							<Route index element={<Recruiter />} />
						</Route>
						<Route path='/companies' element={<ProtectedLayout allowedRoles={['Admin']} />}>
							<Route index element={<Companies />} />
							<Route path=':id' element={<CompanyDetailPage />} />
						</Route>

						<Route path='/create-skill' element={<ProtectedLayout allowedRoles={['Admin', 'Staff']} />}>
							<Route index element={<CreateSkill />} />
						</Route>

						<Route path='/news' element={<ProtectedLayout allowedRoles={['Admin', 'Staff', 'Recruiter', 'Student']} />}>
							<Route index element={<News />} />
							<Route path=':id' element={<NewsDetail />} />
						</Route>

						<Route path='/companyprofile' element={<ProtectedLayout allowedRoles={['Admin', 'Staff', 'Recruiter', 'Student']} />}>
							<Route index element={<CompanyProfile userId={role === 'Recruiter' ? userId : 0} />} />
						</Route>
						<Route path='/companyprofile/:id' element={<ProtectedLayout allowedRoles={['Admin', 'Staff', 'Recruiter', 'Student']} />}>
							<Route index element={<CompanyProfile userId={0} />} />
						</Route>

						{/* Student's own profile */}
						<Route path='/profile' element={<ProtectedLayout allowedRoles={['Student']} />}>
							<Route path='*' element={<StudentProfile userId={userId} />}>
								<Route index element={<Navigate to='top' state={{ userId: userId }} />} />
								<Route path='top' element={<Top />} />
								<Route path='qa' element={<QA />} />
								<Route path='stats' element={<Stats />} />
							</Route>
						</Route>

						<Route path='/staff' element={<ProtectedLayout allowedRoles={['Admin']} />}>
							<Route index element={<Staff />} />
						</Route>

						<Route path='/student-qa' element={<ProtectedLayout allowedRoles={['Admin']} />}>
							<Route index element={<QA />} />
						</Route>

						<Route path='/mail-service' element={<ProtectedLayout allowedRoles={['Admin', 'Staff']} />}>
							<Route index element={<MailService />} />
						</Route>

						<Route path='/maintenance' element={<ProtectedLayout allowedRoles={['Admin']} />}>
							<Route index element={<Maintenance />} />
						</Route>

						{/* Bookmarked students (Recruiter) */}
						<Route path='/bookmarked' element={<ProtectedLayout allowedRoles={['Recruiter']} />}>
							<Route index element={<Student key='bookmarked' OnlyBookmarked={true} />} />
							<Route path='profile/:studentId/*' element={<StudentProfile />}>
								<Route index element={<Navigate to='top' />} />
								<Route path='top' element={<Top />} />
								<Route path='qa' element={<QA />} />
								<Route path='stats' element={<Stats />} />
							</Route>
						</Route>

						<Route path='/settings' element={<Setting />} />
						<Route path='/help' element={<FAQ />} />
					</Route>

					<Route path='/unauthorized' element={<Unauthorized />} />
				</Route>

				{/* ── Public / Guest share routes (no sidebar, no auth) ── */}
				<Route path='/student/share/:uuid' element={<GuestLayout />}>
					<Route element={<StudentProfile isPublic={true} />}>
						<Route index element={<Navigate to='top' />} />
						<Route path='top' element={<Top />} />
						<Route path='qa' element={<QA />} />
						<Route path='stats' element={<Stats />} />
					</Route>
				</Route>

				{/* ── Standalone routes ── */}
				<Route path='/credit-details/:studentId' element={<CreditDetails />} />
				<Route path='/link-expired' element={<LinkExpired />} />
				<Route path='*' element={<NotFound lang={language} />} />
				<Route path='/login' element={<Login />} />
				<Route path='/logout' element={<LogOut updateUser={updateUser} />} />
				<Route path='/FirstloginPage' element={<FirstLoginPage />} />
				<Route path='/google/callback' element={<GoogleAuthCallback />} />
			</Routes>
		</Router>
	)
}

export default AppRoutes
