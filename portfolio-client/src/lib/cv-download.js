import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

// Theme color index → explicit ARGB mapping (from the resume template's theme1.xml).
// ExcelJS does not always preserve theme-indexed colors correctly during a load→save
// roundtrip, which causes a cellXfs count mismatch that makes MS Excel unable to render
// sheets 3 and 4. Converting them to explicit ARGB values before saving prevents this.
const THEME_COLORS = {
	0: 'FFFFFFFF', // lt1
	1: 'FF000000', // dk1
	2: 'FF44546A', // dk2
	3: 'FFE7E6E6', // lt2
	4: 'FF4472C4', // accent1
	5: 'FFED7D31', // accent2
	6: 'FFA5A5A5', // accent3
	7: 'FFFFC000', // accent4
	8: 'FF5B9BD5', // accent5
	9: 'FF70AD47', // accent6
}

function resolveThemeColor(color) {
	if (!color || color.theme === undefined) return color
	return { argb: THEME_COLORS[color.theme] || 'FF000000' }
}

/**
 * Walk every cell on every worksheet and replace theme-indexed font/fill
 * colors with their resolved ARGB equivalents so that MS Excel can render
 * them without triggering a file-repair dialog.
 */
function fixThemeColors(workbook) {
	workbook.worksheets.forEach(ws => {
		// Fix ExcelJS bug where it saves invalid DPI values (4294967295) that crash MS Excel XML parser
		if (ws.pageSetup) {
			delete ws.pageSetup.horizontalDpi
			delete ws.pageSetup.verticalDpi
		}

		// Fix ExcelJS bug where it writes outlinePr out of order in sheetPr, violating OpenXML schema and crashing MS Excel
		if (ws.properties && ws.properties.outlineProperties) {
			delete ws.properties.outlineProperties
		}

		ws.eachRow({ includeEmpty: false }, row => {
			row.eachCell({ includeEmpty: false }, cell => {
				// Font color
				if (cell.font?.color?.theme !== undefined) {
					cell.font = { ...cell.font, color: resolveThemeColor(cell.font.color) }
				}
				// Fill colors
				if (cell.fill) {
					let changed = false
					const newFill = { ...cell.fill }
					if (newFill.fgColor?.theme !== undefined) {
						newFill.fgColor = resolveThemeColor(newFill.fgColor)
						changed = true
					}
					if (newFill.bgColor?.theme !== undefined) {
						newFill.bgColor = resolveThemeColor(newFill.bgColor)
						changed = true
					}
					if (changed) cell.fill = newFill
				}
				// Rich-text runs
				if (cell.value?.richText) {
					cell.value.richText.forEach(rt => {
						if (rt.font?.color?.theme !== undefined) {
							rt.font = { ...rt.font, color: resolveThemeColor(rt.font.color) }
						}
					})
				}
			})
		})
	})
}

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

function toArray(value) {
	if (Array.isArray(value)) return value
	if (value) return [value]
	return []
}

function formatDeliverableRole(role) {
	if (Array.isArray(role)) return role.filter(Boolean).join(', ')
	if (typeof role === 'string') return role.trim()
	return ''
}

/**
 * Estimate the row height needed for wrapped text.
 * ExcelJS does not auto-adjust row heights, so we calculate
 * the approximate number of visual lines the text will occupy.
 *
 * Splits text by explicit line breaks first, then estimates
 * how many wrapped lines each segment occupies based on the
 * column width. This avoids over-counting short segments.
 *
 * @param {string} text  - cell text content
 * @param {number} colWidthHW - column width in half-width character units (merged A-D ≈ 60)
 * @param {number} fontSize - font size in points (default 11)
 * @param {number} minHeight - minimum row height in points
 * @returns {number} estimated row height in points
 */
function estimateRowHeight(text, colWidthHW = 60, fontSize = 11, minHeight = 30) {
	if (!text) return minHeight
	const str = String(text).trim()

	// Split by explicit line breaks and calculate each segment separately.
	const segments = str.split('\n')
	let totalLines = 0

	for (const seg of segments) {
		// Count segment width in half-width character units.
		// Japanese / full-width characters count as ~2 half-width chars.
		let charUnits = 0
		for (const ch of seg) {
			charUnits += ch.charCodeAt(0) > 0x7f ? 2 : 1
		}
		// Each segment occupies at least 1 line (even if empty)
		totalLines += Math.max(1, Math.ceil(charUnits / colWidthHW))
	}

	const lineHeight = fontSize * 1.2 // ~13.2pt per line at size 11 (matches Calibri default)
	return Math.max(minHeight, totalLines * lineHeight)
}

export const downloadCV = async cvData => {
	// Normalize array-like fields to avoid runtime errors when they are null/undefined
	const education = toArray(cvData.education)
	const work_experience = toArray(cvData.work_experience)
	const licenses = toArray(cvData.licenses)
	const arubaito = toArray(cvData.arubaito)
	const deliverables = toArray(cvData.deliverables)

	const response = await fetch('/resume-template.xlsx')
	if (!response.ok) {
		throw new Error(`Failed to load resume template (${response.status})`)
	}
	const arrayBuffer = await response.arrayBuffer()
	const workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(arrayBuffer)

	// Fix theme-indexed colors to prevent MS Excel rendering issues on sheets 3 & 4
	fixThemeColors(workbook)

	const sheet = workbook.getWorksheet(1)
	const sheet2 = workbook.getWorksheet(2)

	const today = new Date()

	// SANA (D2)
	sheet.getCell('D2').value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`

	// FURIGANA ISM (C3)
	sheet.getCell('C3').value = `${cvData.first_name_furigana} ${cvData.last_name_furigana}`

	// ISM FAMILIYA (C4)
	sheet.getCell('C4').value = `${cvData.first_name} ${cvData.last_name}`

	// Jinsi erkak yoki urgochi
	// Support both English ('Male'/'Female') and Japanese ('男'/'女') from Kintone
	const isMale = cvData.gender === 'Male' || cvData.gender === '男'
	sheet.getCell('F3').value = isMale ? '男' : '女'

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
	const furiganaCell = sheet.getCell('C7')
	furiganaCell.value = cvData.additional_info?.additionalAddressFurigana || ''
	furiganaCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

	// tel nomer (G7)
	const phoneCell = sheet.getCell('G7')
	phoneCell.value = `電話：${cvData.additional_info?.additionalPhone || ''}`
	phoneCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

	// Additional address email (G9) - Row 9: Additional address email
	const addEmailCell = sheet.getCell('G9')
	addEmailCell.value = cvData.additional_info?.additionalEmail || ''
	addEmailCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

	// Additional address index (B8) - Row 7: Additional address
	// Prefer "indeks" but fall back to "additionalIndeks" so Settings updates are reflected
	const additionalIndex = cvData.additional_info?.indeks || cvData.additional_info?.additionalIndeks || ''
	sheet.getCell('B8').value = `現住所 （〒　　　${additionalIndex}　　　　　　）`
	// Additional address (B9) - Row 7: Additional address
	const addAddressCell = sheet.getCell('B9')
	addAddressCell.value = cvData.additional_info?.additionalAddress || ''
	addAddressCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
	// additional tel nomer (G11)
	const addPhoneCell = sheet.getCell('G11')
	addPhoneCell.value = `電話：${cvData.phone}`
	addPhoneCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

	// 連絡先 email (G13) - Row 13: 連絡先 email (student's main email)
	const contactEmailCell = sheet.getCell('G13')
	contactEmailCell.value = cvData.email || ''
	contactEmailCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

	// 連絡先 furigana (C11) - Row 11: 連絡先 (フリガナ) (from 出身地 フリガナ) - Students table
	const contactAddressFurigana = cvData.address_furigana || ''
	const contactFuriganaCell = sheet.getCell('C11')
	contactFuriganaCell.value = contactAddressFurigana
	contactFuriganaCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
	// 連絡先 index (B12) - Row 11: 連絡先 (from 出身地 postal_code) - Students table
	const contactPostalCode = cvData.postal_code || ''
	sheet.getCell('B12').value = `連絡先 （〒　　　${contactPostalCode}　　　　　　）`
	// 連絡先 address (B13) - Row 13: 連絡先 (from 出身地) - Students table
	const contactAddress = cvData.address || ''
	const contactAddressCell = sheet.getCell('B13')
	contactAddressCell.value = contactAddress
	contactAddressCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
	// EDUCATION (B9)
	if (education.length > 0) {
		education.map((item, index) => {
			const row = 17 + index

			// Year
			const yearCell = sheet.getCell(`B${row}`)
			yearCell.value = Number(item.year)
			yearCell.font = { size: 11 }
			yearCell.alignment = { vertical: 'middle', horizontal: 'center' }

			// Month
			const monthCell = sheet.getCell(`C${row}`)
			monthCell.value = Number(item.month)
			monthCell.font = { size: 11 }
			monthCell.alignment = { vertical: 'middle', horizontal: 'center' }

			// Institution (wrap text so it doesn't overflow into status column)
			const instCell = sheet.getCell(`D${row}`)
			instCell.value = item.institution
			instCell.font = { size: 11 }
			instCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }

			// Status (卒業, 入学, etc.)
			const statusCell = sheet.getCell(`G${row}`)
			statusCell.value = item.status
			statusCell.font = { size: 11 }
			statusCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
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
			sheet.getCell(`J${4 + index}`).value = Number(item.year)
			sheet.getCell(`K${4 + index}`).value = Number(item.month)

			let certificateValue = item.certifacateName || ''

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
	// Template has 5 project slots (rows 8-17), each project uses 2 rows.
	// If more than 5 projects, we insert extra rows so arubaito/certificates don't overlap.
	const BASE_PROJECT_SLOTS = 5
	const ROWS_PER_PROJECT = 2
	const projectCount = deliverables.length
	const extraProjects = Math.max(0, projectCount - BASE_PROJECT_SLOTS)
	const extraRows = extraProjects * ROWS_PER_PROJECT

	// Insert extra rows if needed (before arubaito section)
	if (extraRows > 0) {
		// Capture formatting from the last template project pair (rows 16-17)
		// so that inserted rows replicate the same borders, fills, fonts & merges.
		const TEMPLATE_TITLE_ROW = 16
		const TEMPLATE_DESC_ROW = 17
		const templatePairRows = [TEMPLATE_TITLE_ROW, TEMPLATE_DESC_ROW]

		// 1. Capture cell styles AND values (borders, font, fill, alignment, labels like 【OS/ 言語/ DB など】)
		// We capture values so template labels are replicated on new rows.
		// The data-writing loop later overwrites cells A (title/desc) and E (role)
		// with actual project data, so template labels in other cells remain intact.
		const captureRowCells = rowNum => {
			const row = sheet2.getRow(rowNum)
			const cells = {}
			for (let col = 1; col <= 10; col++) {
				const cell = row.getCell(col)
				const hasStyle = cell.style && Object.keys(cell.style).length > 0
				const hasValue = cell.value !== null && cell.value !== undefined
				if (hasStyle || hasValue) {
					cells[col] = {
						style: hasStyle ? JSON.parse(JSON.stringify(cell.style)) : null,
						value: hasValue ? (typeof cell.value === 'object' ? JSON.parse(JSON.stringify(cell.value)) : cell.value) : null,
					}
				}
			}
			return { cells, height: row.height }
		}

		const titleTemplate = captureRowCells(TEMPLATE_TITLE_ROW)
		const descTemplate = captureRowCells(TEMPLATE_DESC_ROW)

		// 2. Capture merge ranges that belong to the template pair rows
		const templateMerges = []
		try {
			const sheetMerges = sheet2.model?.merges || []
			const rowSet = new Set(templatePairRows)
			const baseRow = Math.min(...templatePairRows)
			for (const range of sheetMerges) {
				const m = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
				if (!m) continue
				const r1 = parseInt(m[2])
				const r2 = parseInt(m[4])
				if (rowSet.has(r1) || rowSet.has(r2)) {
					templateMerges.push({
						startCol: m[1],
						endCol: m[3],
						startRowOffset: r1 - baseRow,
						endRowOffset: r2 - baseRow,
					})
				}
			}
		} catch (_) {
			/* merge detection failed — rows will still get styles */
		}

		// 3. Insert empty rows after the last template slot (row 18)
		sheet2.insertRows(
			18,
			Array.from({ length: extraRows }, () => [])
		)

		// 4. Apply captured styles, values & merges to each new project pair
		const applyTemplateToCells = (row, templateCells) => {
			Object.entries(templateCells).forEach(([col, data]) => {
				const targetCell = row.getCell(Number(col))
				if (data.style) targetCell.style = JSON.parse(JSON.stringify(data.style))
				if (data.value !== null) targetCell.value = typeof data.value === 'object' ? JSON.parse(JSON.stringify(data.value)) : data.value
			})
		}

		for (let i = 0; i < extraProjects; i++) {
			const newTitleRowNum = 18 + i * 2
			const newDescRowNum = 19 + i * 2

			// — Title row (styles + labels)
			const newTitleRow = sheet2.getRow(newTitleRowNum)
			applyTemplateToCells(newTitleRow, titleTemplate.cells)
			if (titleTemplate.height) newTitleRow.height = titleTemplate.height

			// — Description row (styles + labels)
			const newDescRow = sheet2.getRow(newDescRowNum)
			applyTemplateToCells(newDescRow, descTemplate.cells)
			if (descTemplate.height) newDescRow.height = descTemplate.height

			// — Replicate merge ranges
			const pairBase = newTitleRowNum
			templateMerges.forEach(merge => {
				try {
					const r1 = pairBase + merge.startRowOffset
					const r2 = pairBase + merge.endRowOffset
					sheet2.mergeCells(`${merge.startCol}${r1}:${merge.endCol}${r2}`)
				} catch (_) {
					/* skip if merge conflicts with existing range */
				}
			})
		}
	}

	if (deliverables.length > 0) {
		deliverables.map((item, index) => {
			const offset = index * 2

			// Title row
			const titleCell = sheet2.getCell(`A${8 + offset}`)
			titleCell.value = `✖✖年✖月～✖✖年✖月 ／${item.title}`
			titleCell.alignment = { wrapText: true, vertical: 'top' }
			titleCell.font = { bold: true, size: 11 }

			// Description row
			const descRowNum = 9 + offset
			const descCell = sheet2.getCell(`A${descRowNum}`)
			descCell.value = item.description
			descCell.alignment = { wrapText: true, vertical: 'top' }

			// Auto-adjust row height so long descriptions are fully visible
			const descRow = sheet2.getRow(descRowNum)
			descRow.height = estimateRowHeight(item.description, 60, 11, 30)

			// Role
			const roleCell = sheet2.getCell(`E${9 + offset}`)
			roleCell.value = `役割　${formatDeliverableRole(item.role)}`
			roleCell.alignment = {
				wrapText: true,
				vertical: 'top',
				horizontal: 'left',
			}
		})
	}

	// Dynamic row offsets — arubaito and certificates shift down when extra projects are inserted
	const arubaitoStartRow = 20 + extraRows
	const certificatesStartRow = 33 + extraRows

	// arubaito
	if (arubaito.length > 0) {
		arubaito.map((item, index) => {
			const row = arubaitoStartRow + index
			sheet2.mergeCells(`A${row}:D${row}`)
			sheet2.getCell(`A${row}`).value = `${item.period}  ${item.role}  ${item.company}`
			sheet2.getCell(`A${row}`).alignment = {
				vertical: 'middle',
				horizontal: 'left',
				wrapText: true,
			}
		})
	}
	// ■資格など
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

	if (licenses.length > 0) {
		licenses.map((item, index) => {
			const row = certificatesStartRow + index

			// YEAR
			const yearCell = sheet2.getCell(`A${row}`)
			yearCell.value = `${item.year}年`
			yearCell.alignment = rightRegularStyle.alignment
			yearCell.font = rightRegularStyle.font

			// MONTH
			const monthCell = sheet2.getCell(`B${row}`)
			monthCell.value = `${item.month}月`
			monthCell.alignment = rightRegularStyle.alignment
			monthCell.font = rightRegularStyle.font

			// C–D MERGE
			sheet2.mergeCells(`C${row}:D${row}`)

			const certCell = sheet2.getCell(`C${row}`)
			certCell.value = item.certifacateName
			certCell.alignment = {
				horizontal: 'left',
				vertical: 'middle',
				wrapText: true,
			}
			certCell.font = rightRegularStyle.font
		})
	}

	// Insert empty separator rows between sections on Sheet 2.
	// Insert from bottom → top so that earlier insertions don't shift later targets.
	// Gap 2: empty row before the certificates / ■資格など section
	sheet2.insertRows(certificatesStartRow, [[]])
	// Gap 1: empty row before ■活かせる経験・知識・技術 (skills header at template base row 22)
	// +1 accounts for the gap-2 insertion above having shifted everything below it by 1
	const skillsHeaderRow = 22 + extraRows
	sheet2.insertRows(skillsHeaderRow, [[]])

	// fileni yozib olish va saqlash
	const buffer = await workbook.xlsx.writeBuffer()
	saveAs(new Blob([buffer]), `${cvData.first_name}-CV.xlsx`)
}
