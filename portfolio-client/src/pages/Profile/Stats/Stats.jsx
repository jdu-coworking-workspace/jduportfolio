import { useState, useEffect, useContext } from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'
import { useLanguage } from '../../../contexts/LanguageContext'
import translations from '../../../locales/translations'
import axios from '../../../utils/axiosUtils'
import certificateColors from '../../../utils/certificates'
import { Box, Tabs, Tab, Snackbar, Alert } from '@mui/material'
import CreditsProgressBar from '../../../components/CreditsProgressBar/CreditsProgressBar'
import SkillSelector from '../../../components/SkillSelector/SkillSelector'
import styles from './Stats.module.css'

const Stats = () => {
	const { language } = useLanguage()
	const t = key => (translations[language] || translations.en)[key] || key
	// Helper function to safely parse JSON data
	const safeParseJSON = (jsonString, fallback = { highest: '未提出', list: [] }) => {
		try {
			if (!jsonString || jsonString === 'null' || jsonString === 'undefined') return fallback
			const parsed = JSON.parse(jsonString)
			return parsed || fallback
		} catch (error) {
			return fallback
		}
	}
	let id
	const { studentId } = useParams()
	const location = useLocation()
	const { userId } = location.state || {}

	if (userId != 0 && userId) {
		id = userId
	} else {
		id = studentId
	}

	const [student, setStudent] = useState(null)
	const [kintoneData, setKintoneData] = useState({})
	const [editData] = useState({})
	const [certificates, setCertificates] = useState({})
	const [subTabIndex, setSubTabIndex] = useState(0)
	const [alert, setAlert] = useState({
		open: false,
		message: '',
		severity: '',
	})

	useEffect(() => {
		const fetchStudentData = async () => {
			try {
				const studentResponse = await axios.get(`/api/students/${id}`)
				const studentData = studentResponse.data

				const kintoneResponse = await axios.post(`/api/kintone/getby`, {
					table: 'student_credits',
					col: 'studentId',
					val: studentData.student_id,
				})

				if (kintoneResponse.data.records.length > 0) {
					setKintoneData(kintoneResponse.data.records[0])
				}

				const fetchCertificates = async () => {
					setCertificateData('main', 'JLPT', safeParseJSON(studentData.jlpt))
					setCertificateData('main', 'JDU_JLPT', safeParseJSON(studentData.jdu_japanese_certification))
					setCertificateData('other', '日本語弁論大会学内', safeParseJSON(studentData.japanese_speech_contest))
					setCertificateData('other', 'ITコンテスト学内', safeParseJSON(studentData.it_contest))

					setStudent(studentData)
				}

				await fetchCertificates()
			} catch (error) {}
		}

		if (id) {
			fetchStudentData()
		} else {
		}
	}, [id])

	const setCertificateData = (key, type, data) => {
		let temp = []
		if (key == 'main') {
			data?.list?.forEach(x => {
				let obj = {
					name: x.level,
					// date: x.date.slice(0, 7),
					color: certificateColors[type][x.level],
				}
				temp.push(obj)
			})
		} else {
			data?.list?.forEach(x => {
				let obj = {
					name: x.level,
					// date: x.date.slice(0, 7),
					color: certificateColors[key][x.level],
				}
				temp.push(obj)
			})
		}
		setCertificates(prevCertificates => ({
			...prevCertificates,
			[key]: {
				...prevCertificates[key],
				[type]: temp,
			},
		}))
	}

	const handleSubTabChange = (event, newIndex) => {
		setSubTabIndex(newIndex)
	}

	const openCreditDetails = event => {
		event.preventDefault()
		// Use student_id as the URL parameter for CreditDetails route
		window.open(`/credit-details/${student.student_id}`, '_blank', 'width=600,height=400')
	}

	const handleCloseAlert = () => {
		setAlert({ open: false, message: '', severity: '' })
	}

	if (!student) {
		return <div>{t('loading')}</div>
	}

	const breakpoints = [
		{ label: '入学', point: 0 },
		{ label: '', point: 19 },
		{ label: '', point: 38 },
		{ label: '', point: 57 },
		{ label: '卒業', point: 76 },
	]

	const breakpoints2 = [
		{ label: '入学', point: 0 },
		{ label: '', point: 31 },
		{ label: '', point: 62 },
		{ label: '', point: 93 },
		{ label: '卒業', point: 124 },
	]

	return (
		<Box my={2}>
			{/* Credit section hidden - temporarily disabled
			<Tabs
				className={styles.Tabs}
				value={subTabIndex}
				onChange={handleSubTabChange}
			>
				<Tab label='JDU' />
				<Tab label={student.partner_university} />
			</Tabs>
			{subTabIndex === 0 && (
				<Box my={2}>
					JDU
					<CreditsProgressBar
						studentId={student.student_id}
						student={{
							totalCredits: JSON.stringify(kintoneData) !== '{}'
								? Number(kintoneData.businessSkillsCredits?.value) +
									Number(kintoneData.japaneseEmploymentCredits?.value)
								: 0,
							semester: JSON.stringify(kintoneData) !== '{}'
								? kintoneData.semester?.value
								: '',
							university: 'JDU'
						}}
					/>
				</Box>
			)}
			{subTabIndex === 1 && (
				<Box my={2}>
					{student.partner_university}
					<CreditsProgressBar
						studentId={student.student_id}
						student={{
							totalCredits: JSON.stringify(kintoneData) !== '{}'
								? Number(kintoneData.partnerUniversityCredits?.value)
								: 0,
							semester: JSON.stringify(kintoneData) !== '{}'
								? kintoneData.semester?.value
								: '',
							university: student.partner_university
						}}
					/>
				</Box>
			)}
			<Link
				href='#'
				underline='hover'
				color='primary'
				style={{ fontWeight: 800 }}
				onClick={openCreditDetails}
			>
				詳細はこちらへ
			</Link>
			*/}
			<Box my={2}>
				<SkillSelector
					title='資格'
					headers={{
						JLPT: '',
						JDU_JLPT: '',
					}}
					data={certificates}
					editData={editData}
					showAutocomplete={true}
					showHeaders={false}
					showEmptyAsNotSubmitted={true}
					keyName='main'
				/>
				<SkillSelector
					title='その他'
					headers={{
						上級: '3年間以上',
						中級: '1年間〜1年間半',
						初級: '基礎',
					}}
					data={certificates}
					editData={editData}
					showAutocomplete={false}
					showHeaders={false}
					keyName='other'
				/>
			</Box>
			<Snackbar open={alert.open} autoHideDuration={6000} onClose={handleCloseAlert} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
				<Alert onClose={handleCloseAlert} severity={alert.severity} sx={{ width: '100%' }}>
					{alert.message}
				</Alert>
			</Snackbar>
		</Box>
	)
}

export default Stats
