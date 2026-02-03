import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
function formatJapaneseDateWithAge(birthdayStr) {
	const birthday = new Date(birthdayStr)
	const today = new Date()

	// Bugungi sana (yaponcha format)
	const y = today.getFullYear()
	const m = String(today.getMonth() + 1).padStart(2, '0')
	const d = String(today.getDate()).padStart(2, '0')

	// Yoshni hisoblash
	let age = y - birthday.getFullYear()

	const hasNotBirthdayYet = today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())

	if (hasNotBirthdayYet) {
		age--
	}

	return `${birthday.getFullYear()}年 ${birthday.getMonth() + 1}月 ${birthday.getDate()}日 （満 ${age} 歳）`
}
export const downloadCV = async cvData => {
	// Normalize array-like fields to avoid runtime errors when they are null/undefined
	const education = Array.isArray(cvData.education) ? cvData.education : cvData.education ? [cvData.education] : []
	const work_experience = Array.isArray(cvData.work_experience) ? cvData.work_experience : cvData.work_experience ? [cvData.work_experience] : []
	const licenses = Array.isArray(cvData.licenses) ? cvData.licenses : cvData.licenses ? [cvData.licenses] : []
	const arubaito = Array.isArray(cvData.arubaito) ? cvData.arubaito : cvData.arubaito ? [cvData.arubaito] : []

	const response = await fetch('/resume-template.xlsx')
	const arrayBuffer = await response.arrayBuffer()
	const workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(arrayBuffer)
	const sheet = workbook.getWorksheet(1)
	const sheet2 = workbook.getWorksheet(2)

	const today = new Date()

	// SANA (E2)
	sheet.getCell('E2').value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`

	// FURIGANA ISM (C3)
	sheet.getCell('C3').value = `${cvData.first_name_furigana} ${cvData.last_name_furigana}`

	// ISM FAMILIYA (C4)
	sheet.getCell('C4').value = `${cvData.first_name} ${cvData.last_name}`

	// Jinsi erkak yoki urgochi
	sheet.getCell('F3').value = cvData.gender === 'Male' ? '男' : '女'

	// TUG'ILGAN SANA (C6)
	const jpFormatted = formatJapaneseDateWithAge(cvData.date_of_birth)
	sheet.getCell('C6').value = jpFormatted

	// Photo (G3) - Add image if available
	sheet.getCell('G3').value = `写真を貼る位置
写真を貼る必要がある場合
1．縦  36～40mm　横  24～30mm
2.本人単身胸から上
3.裏面のりづけ
4 裏面に氏名記入`

	// Additional address furigana (C7) - Row 7: Additional address (フリガナ)
	sheet.getCell('C7').value = cvData.additional_info?.additionalAddressFurigana || ''

	// tel nomer (G7)
	sheet.getCell('G7').value = `電話：${cvData.additional_info?.additionalPhone || ''}`

	// Additional address email (G9) - Row 9: Additional address email
	sheet.getCell('G9').value = cvData.additional_info?.additionalEmail || ''

	// Additional address index (B8) - Row 7: Additional address
	// Prefer "indeks" but fall back to "additionalIndeks" so Settings updates are reflected
	const additionalIndex = cvData.additional_info?.indeks || cvData.additional_info?.additionalIndeks || ''
	sheet.getCell('B8').value = `現住所 （〒　　　${additionalIndex}　　　　　　）`
	// Additional address (B9) - Row 7: Additional address
	sheet.getCell('B9').value = cvData.additional_info?.additionalAddress || ''
	// additional tel nomer (G11)
	sheet.getCell('G11').value = `電話：${cvData.phone}`

	// 連絡先 email (G13) - Row 13: 連絡先 email (student's main email)
	sheet.getCell('G13').value = cvData.email || ''

	// 連絡先 furigana (C11) - Row 11: 連絡先 (フリガナ) (from 出身地 フリガナ) - Students table
	const contactAddressFurigana = cvData.address_furigana || ''
	sheet.getCell('C11').value = contactAddressFurigana
	// 連絡先 index (B12) - Row 11: 連絡先 (from 出身地 postal_code) - Students table
	const contactPostalCode = cvData.postal_code || ''
	sheet.getCell('B12').value = `連絡先 （〒　　　${contactPostalCode}　　　　　　）`
	// 連絡先 address (B13) - Row 13: 連絡先 (from 出身地) - Students table
	const contactAddress = cvData.address || ''
	sheet.getCell('B13').value = contactAddress
	// EDUCATION (B9)
	if (education.length > 0) {
		education.map((item, index) => {
			sheet.getCell(`B${17 + index}`).value = item.year
			sheet.getCell(`C${17 + index}`).value = item.month
			sheet.getCell(`D${17 + index}`).value = item.institution
			sheet.getCell(`G${17 + index}`).value = item.status
		})
	}
	// workExperience (B9)
	if (work_experience.length > 0) {
		work_experience.map((item, index) => {
			sheet.getCell(`B${23 + index}`).value = new Date(item.from).getFullYear()
			sheet.getCell(`C${23 + index}`).value = new Date(item.from).getMonth() + 1
			sheet.getCell(`D${23 + index}`).value = `${item.company} ${item.details}`
		})
	} else {
		sheet.getCell('D23').value = 'なし'
		sheet.getCell('D24').value = `                    以上`
	}
	// certificatess
	if (licenses.length > 0) {
		licenses.map((item, index) => {
			sheet.getCell(`J${4 + index}`).value = item.year
			sheet.getCell(`K${4 + index}`).value = item.month

			let certificateValue = item.certifacateName

			// IELTS max score formatlash
			if (certificateValue.startsWith('IELTS')) {
				const jsonPart = certificateValue.slice(5).trim()
				try {
					const obj = JSON.parse(jsonPart)
					const latestTest = obj.ieltslist[0]
					certificateValue = `IELTS ${latestTest.level}`
				} catch (e) {}
			}

			sheet.getCell(`L${4 + index}`).value = certificateValue
		})
	}

	// 自己PR (B8)
	sheet.getCell('J12').value = cvData.self_introduction

	// 2 sheet boshlandi ------------------------------------------------------------------------------->

	// ism familiya (D5)
	sheet2.getCell('D5').value = `氏名 ${cvData.first_name} ${cvData.last_name}`
	// bugungi sana (A4)
	sheet2.getCell('A4').value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`
	// projekt deliverables (A8) - Students table
	if (cvData.deliverables && cvData.deliverables.length > 0) {
		cvData.deliverables.map((item, index) => {
			const offset = index * 2

			sheet2.getCell(`A${8 + offset}`).value = `✖✖年✖月～✖✖年✖月 ／${item.title}`
			sheet2.getCell(`A${9 + offset}`).value = item.description

			const descCell = sheet2.getCell(`A${9 + offset}`)
			descCell.value = item.description
			descCell.alignment = { wrapText: true, vertical: 'top' }

			const roleCell = sheet2.getCell(`E${9 + offset}`)
			roleCell.value = `役割　${item.role.join(', ')}`
			roleCell.alignment = {
				wrapText: true,
				vertical: 'top',
				horizontal: 'left',
			}
		})
	}
	// arubaito (A20)
	if (arubaito.length > 0) {
		arubaito.map((item, index) => {
			sheet2.getCell(`A${20 + index}`).value = item.company
			sheet2.getCell(`B${20 + index}`).value = item.role

			sheet2.getCell(`C${20 + index}`).value = item.period
		})
	}
	// ■資格など (A33)
	const rightRegularStyle = {
		alignment: {
			horizontal: 'right',
			vertical: 'middle',
			wrapText: true,
		},
		font: {
			bold: false,
			size: 11,
			name: 'Calibri',
		},
	}
	if (cvData.licenses.length > 0) {
		cvData.licenses.map((item, index) => {
			const yearCell = sheet2.getCell(`A${33 + index}`)
			yearCell.value = item.year
			yearCell.alignment = rightRegularStyle.alignment
			yearCell.font = rightRegularStyle.font

			const monthCell = sheet2.getCell(`B${33 + index}`)
			monthCell.value = item.month
			monthCell.alignment = rightRegularStyle.alignment
			monthCell.font = rightRegularStyle.font

			const certCell = sheet2.getCell(`C${33 + index}`)
			certCell.value = item.certifacateName
			certCell.alignment = rightRegularStyle.alignment
			certCell.font = rightRegularStyle.font
		})
	}

	// fileni yozib olish va saqlash
	const buffer = await workbook.xlsx.writeBuffer()
	saveAs(new Blob([buffer]), `${cvData.first_name}-CV.xlsx`)
}
