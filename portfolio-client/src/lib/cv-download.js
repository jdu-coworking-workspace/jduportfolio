import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

function formatJapaneseDateWithAge(birthdayStr) {
	const birthday = new Date(birthdayStr)
	const today = new Date()

	const y = today.getFullYear()
	const m = String(today.getMonth() + 1).padStart(2, '0')
	const d = String(today.getDate()).padStart(2, '0')

	let age = y - birthday.getFullYear()

	const hasNotBirthdayYet = today.getMonth() < birthday.getMonth() || (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())

	if (hasNotBirthdayYet) {
		age--
	}

	return `${birthday.getFullYear()}年 ${birthday.getMonth() + 1}月 ${birthday.getDate()}日 （満 ${age} 歳）`
}

// ─── Global font helper ───────────────────────────────────────────────────────
// All cells use ＭＳ ゴシック. bold defaults to false (light).
const msGothic = (size = 11, bold = false) => ({ name: 'ＭＳ ゴシック', size, bold })

// Apply font + optional alignment to a cell
const applyStyle = (cell, { size = 11, bold = false } = {}, alignment = null) => {
	cell.font = msGothic(size, bold)
	if (alignment) cell.alignment = alignment
}

export const downloadCV = async cvData => {
	// Normalize array-like fields
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
	const sheet4 = workbook.getWorksheet(4)
	if (sheet4) {
		for (let row = 17; row <= 20; row++) {
			sheet4.getRow(row).eachCell({ includeEmpty: true }, cell => {
				cell.alignment = {
					...cell.alignment,
					wrapText: false,
					shrinkToFit: false,
				}
			})
			sheet4.getRow(row).height = 14.25
		}

		// A ustunining kengligi
		sheet4.getColumn('A').width = 18.65
	}
	const today = new Date()

	// ── Common alignments ──────────────────────────────────────────────────────
	const centerMiddle = { vertical: 'middle', horizontal: 'center' }
	const leftMiddle = { vertical: 'middle', horizontal: 'left' }
	const rightMiddle = { vertical: 'middle', horizontal: 'right', wrapText: true }

	// ── Sheet 1 ────────────────────────────────────────────────────────────────

	// E2 — current date
	const e2 = sheet.getCell('E2')
	e2.value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`
	applyStyle(e2, {}, leftMiddle)

	// C3 — furigana name
	const c3 = sheet.getCell('C3')
	c3.value = `${cvData.first_name_furigana} ${cvData.last_name_furigana}`
	applyStyle(c3)

	// C4 — full name
	const c4 = sheet.getCell('C4')
	c4.value = `${cvData.first_name} ${cvData.last_name}`
	applyStyle(c4)

	// F3 — gender
	const f3 = sheet.getCell('F3')
	const isMale = cvData.gender === 'Male' || cvData.gender === '男'
	f3.value = isMale ? '男' : '女'
	applyStyle(f3, {}, centerMiddle)

	// C6 — date of birth (centered)
	const c6 = sheet.getCell('C6')
	c6.value = formatJapaneseDateWithAge(cvData.date_of_birth)
	applyStyle(c6, {}, centerMiddle)

	// G3 — photo placeholder
	const g3 = sheet.getCell('G3')
	g3.value = `写真を貼る位置\n写真を貼る必要がある場合\n1．縦  36～40mm　横  24～30mm\n2.本人単身胸から上\n3.裏面のりづけ\n4 裏面に氏名記入`
	applyStyle(g3, { size: 9 })

	// C7 — additional address furigana
	const c7 = sheet.getCell('C7')
	c7.value = cvData.additional_info?.additionalAddressFurigana || ''
	applyStyle(c7)

	// G7 — additional phone
	const g7 = sheet.getCell('G7')
	g7.value = `電話：${cvData.additional_info?.additionalPhone || ''}`
	applyStyle(g7)

	// G9 — additional email
	const g9 = sheet.getCell('G9')
	g9.value = cvData.email || ''
	applyStyle(g9)

	// B8 — additional address index
	const additionalIndex = cvData.additional_info?.indeks || cvData.additional_info?.additionalIndeks || ''
	const b8 = sheet.getCell('B8')
	b8.value = `現住所 （〒　　　${additionalIndex}　　　　　　）`
	applyStyle(b8)

	// B9 — additional address
	const b9 = sheet.getCell('B9')
	b9.value = cvData.additional_info?.additionalAddress || ''
	applyStyle(b9)

	// G11 — main phone
	const g11 = sheet.getCell('G11')
	g11.value = `電話：${cvData.phone}`
	applyStyle(g11)

	// G13 — main email
	const g13 = sheet.getCell('G13')
	g13.value = cvData.additional_info?.additionalEmail || ''
	applyStyle(g13)

	// C11 — contact address furigana
	const c11 = sheet.getCell('C11')
	c11.value = cvData.address_furigana || ''
	applyStyle(c11)

	// B12 — contact postal code
	const b12 = sheet.getCell('B12')
	b12.value = `連絡先 （〒　　　${cvData.postal_code || ''}　　　　　　）`
	applyStyle(b12)

	// B13 — contact address
	const b13 = sheet.getCell('B13')
	b13.value = cvData.address || ''
	applyStyle(b13)

	// ── Education (学歴) — font weight identical to work_experience ────────────
	if (education.length > 0) {
		education.forEach((item, index) => {
			const row = 17 + index

			const yearCell = sheet.getCell(`B${row}`)
			yearCell.value = item.year
			applyStyle(yearCell, {}, centerMiddle)

			const monthCell = sheet.getCell(`C${row}`)
			monthCell.value = item.month
			applyStyle(monthCell, {}, centerMiddle)

			const institutionCell = sheet.getCell(`D${row}`)
			institutionCell.value = item.institution
			applyStyle(institutionCell, {}, leftMiddle)

			const statusCell = sheet.getCell(`G${row}`)
			statusCell.value = item.status
			applyStyle(statusCell, {}, leftMiddle)
		})
	}

	// ── Work Experience (職歴) ─────────────────────────────────────────────────
	if (work_experience.length > 0) {
		work_experience.forEach((item, index) => {
			const row = 23 + index

			const yearCell = sheet.getCell(`B${row}`)
			yearCell.value = new Date(item.from).getFullYear()
			applyStyle(yearCell, {}, centerMiddle)

			const monthCell = sheet.getCell(`C${row}`)
			monthCell.value = new Date(item.from).getMonth() + 1
			applyStyle(monthCell, {}, centerMiddle)

			const detailCell = sheet.getCell(`D${row}`)
			detailCell.value = `${item.company} ${item.details}`
			applyStyle(detailCell, {}, leftMiddle)
		})
	} else {
		const d23 = sheet.getCell('D23')
		d23.value = 'なし'
		applyStyle(d23, {}, leftMiddle)

		const d24 = sheet.getCell('D24')
		d24.value = `                    以上`
		applyStyle(d24, {}, leftMiddle)
	}

	// ── Licenses / Certificates — Sheet 1 right side ──────────────────────────
	if (licenses.length > 0) {
		licenses.forEach((item, index) => {
			const jCell = sheet.getCell(`J${4 + index}`)
			jCell.value = item.year
			applyStyle(jCell, {}, centerMiddle)

			const kCell = sheet.getCell(`K${4 + index}`)
			kCell.value = item.month
			applyStyle(kCell, {}, centerMiddle)

			let certificateValue = item.certifacateName
			if (certificateValue.startsWith('IELTS')) {
				const jsonPart = certificateValue.slice(5).trim()
				try {
					const obj = JSON.parse(jsonPart)
					const latestTest = obj.ieltslist[0]
					certificateValue = `IELTS ${latestTest.level}`
				} catch (e) {}
			}

			const lCell = sheet.getCell(`L${4 + index}`)
			lCell.value = certificateValue
			applyStyle(lCell, {}, leftMiddle)
		})
	}

	// J12 — self introduction
	const j12 = sheet.getCell('J12')
	j12.value = cvData.self_introduction
	applyStyle(j12, {}, { wrapText: true, vertical: 'top' })

	// ── Sheet 2 ────────────────────────────────────────────────────────────────

	// D5 — name
	const d5 = sheet2.getCell('D5')
	d5.value = `氏名 ${cvData.first_name} ${cvData.last_name}`
	applyStyle(d5)

	// A4 — current date
	const a4 = sheet2.getCell('A4')
	a4.value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`
	applyStyle(a4)

	// Deliverables
	if (cvData.deliverables && cvData.deliverables.length > 0) {
		cvData.deliverables.forEach((item, index) => {
			const offset = index * 2

			const titleCell = sheet2.getCell(`A${8 + offset}`)
			titleCell.value = `✖✖年✖月～✖✖年✖月 ／${item.title}`
			applyStyle(titleCell, {}, leftMiddle)

			const descCell = sheet2.getCell(`A${9 + offset}`)
			descCell.value = item.description
			applyStyle(descCell, {}, { wrapText: true, vertical: 'top' })

			const roleCell = sheet2.getCell(`E${9 + offset}`)
			roleCell.value = `役割　${item.role.join(', ')}`
			applyStyle(roleCell, {}, { wrapText: true, vertical: 'top', horizontal: 'left' })
		})
	}

	// Arubaito
	if (arubaito.length > 0) {
		arubaito.slice(0, 2).forEach((item, index) => {
			const row = 20 + index
			sheet2.mergeCells(`A${row}:D${row}`)
			const cell = sheet2.getCell(`A${row}`)
			cell.value = `${item.period}  ${item.role}  ${item.company}`
			applyStyle(cell, {}, { vertical: 'middle', horizontal: 'left', wrapText: true })
			// Merged range ichidagi barcha celllarga alignment majburlash
			sheet2.getRow(row).eachCell({ includeEmpty: true }, c => {
				c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
			})
		})
	}

	// ■ Licenses — Sheet 2 (A33+)
	if (cvData.licenses.length > 0) {
		cvData.licenses.forEach((item, index) => {
			const row = 35 + index

			const yearCell = sheet2.getCell(`A${row}`)
			yearCell.value = item.year
			applyStyle(yearCell, {}, leftMiddle)

			const monthCell = sheet2.getCell(`B${row}`)
			monthCell.value = item.month
			applyStyle(monthCell, {}, leftMiddle)

			sheet2.mergeCells(`C${row}:D${row}`)
			const certCell = sheet2.getCell(`C${row}`)
			certCell.value = item.certifacateName
			applyStyle(certCell, {}, { horizontal: 'left', vertical: 'middle', wrapText: true })
			// Merged celllar uchun barcha ustunlarga alignment berish
			sheet2.getRow(row).eachCell({ includeEmpty: true }, cell => {
				cell.alignment = { ...cell.alignment, horizontal: 'left' }
			})
		})
	}

	// Save
	const buffer = await workbook.xlsx.writeBuffer()
	saveAs(new Blob([buffer]), `${cvData.first_name}-CV.xlsx`)
}
