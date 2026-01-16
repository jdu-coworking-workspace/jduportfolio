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
	if (cvData.photo) {
		try {
			// Rasmni fetch qilish
			const imgRes = await fetch(cvData.photo)
			const buffer = await imgRes.arrayBuffer()

			// Formatni URL dan aniqlash
			const ext = cvData.photo.endsWith('.png') ? 'png' : cvData.photo.endsWith('.jpg') || cvData.photo.endsWith('.jpeg') ? 'jpeg' : 'png'
			const imageId = workbook.addImage({
				buffer,
				extension: ext,
			})

			// Rasm joylashuvi (G3)
			sheet.addImage(imageId, {
				tl: { col: 6, row: 2 },
				br: { col: 7, row: 6 },
				editAs: 'oneCell',
			})
		} catch (error) {
			console.log('Image add error:', error)
			sheet.getCell('G3').value = '写真エラー：画像を貼れませんでした。'
		}
	} else {
		sheet.getCell('G3').value = `　写真を貼る位置
写真を貼る必要がある場合
1．縦  36～40mm　横  24～30mm
2.本人単身胸から上
3.裏面のりづけ
4 裏面に氏名記入`
	}

	// MANZIL FURIGANA (C7)
	sheet.getCell('C7').value = cvData.additional_info.additionalAddressFurigana

	// tel nomer (G7)
	sheet.getCell('G7').value = `電話：${cvData.phone}`

	// gmail  (G9)
	sheet.getCell('G9').value = cvData.email

	// INDEKS (B8)
	sheet.getCell('B8').value = `現住所 （〒　　　${cvData.additional_info.indeks}　　　　　　）`
	// addres
	sheet.getCell('B9').value = cvData.additional_info.additionalAddress
	// additional tel nomer (G11)
	sheet.getCell('G11').value = `電話：${cvData.additional_info.additionalPhone}`

	// additional gmail  (G13)
	sheet.getCell('G13').value = cvData.additional_info.additionalEmail

	// additional INDEKS (B8)
	sheet.getCell('B12').value = `連絡先 （〒　　　${cvData.additional_info.additionalIndeks}　　　　　　）`
	// additional addres
	sheet.getCell('B13').value = cvData.additional_info.additionalAddress === cvData.address ? '同上' : cvData.additional_info.additionalAddress
	// EDUCATION (B9)
	if (cvData.education.length > 0) {
		cvData.education.map((item, index) => {
			sheet.getCell(`B${17 + index}`).value = item.year
			sheet.getCell(`C${17 + index}`).value = item.month
			sheet.getCell(`D${17 + index}`).value = item.institution
			sheet.getCell(`G${17 + index}`).value = item.status
		})
	}
	// workExperience (B9)
	if (cvData.work_experience.length > 0) {
		cvData.work_experience.map((item, index) => {
			sheet.getCell(`B${23 + index}`).value = new Date(item.from).getFullYear()
			sheet.getCell(`C${23 + index}`).value = new Date(item.from).getMonth() + 1
			sheet.getCell(`D${23 + index}`).value = `${item.company} ${item.details}`
		})
	} else {
		sheet.getCell('D23').value = 'なし'
		sheet.getCell('D24').value = `                    以上`
	}
	// certificatess
	if (cvData.licenses.length > 0) {
		cvData.licenses.map((item, index) => {
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

	//  kuniga necha soat ishlashi(J26)
	// sheet.getCell('J26').value = `約　` + cvData.additional_info.commuteTime + `　時間　　　`
	// //   Boquvda bo‘lgan oila a’zolari (turmush o‘rtog‘idan tashqari) (L26)
	// sheet.getCell('L26').value = cvData.additional_info.numDependents + `人　　　　`

	// //  is married (M26)
	// sheet.getCell('M26').value = cvData.additional_info.isMarried ? '有' : '無'
	// //turmush ortogini boqish majburiyati aliment (N26)
	// sheet.getCell('N26').value = cvData.additional_info.spousalSupportObligation ? '有' : '無'
	// // 本人希望記入欄 (J28)
	// sheet.getCell('J28').value = cvData.additional_info.hopes

	// 2 sheet boshlandi ------------------------------------------------------------------------------->

	// ism familiya (D5)
	sheet2.getCell('D5').value = `氏名 ${cvData.first_name} ${cvData.last_name}`
	// bugungi sana (A4)
	sheet2.getCell('A4').value = `${today.getFullYear()}年 ${today.getMonth() + 1}月 ${today.getDate()}日  現在`
	// projekt deliverables (A8)
	if (cvData.draft.deliverables.length > 0) {
		cvData.draft.deliverables.map((item, index) => {
			const offset = index * 2

			sheet2.getCell(`A${8 + offset}`).value = `✖✖年✖月～✖✖年✖月 ／${item.title}`
			sheet2.getCell(`A${9 + offset}`).value = item.description

			sheet2.getCell(`E${9 + offset}`).value = `役割　${item.role.join(', ')}`
		})
	}
	// arubaito (A20)
	if (cvData.arubaito.length > 0) {
		cvData.arubaito.map((item, index) => {
			sheet2.getCell(`A${20 + index}`).value = item.company
			sheet2.getCell(`B${20 + index}`).value = item.role

			sheet2.getCell(`C${20 + index}`).value = item.period
		})
	}
	// ■資格など (A33)
	if (cvData.licenses.length > 0) {
		cvData.licenses.map((item, index) => {
			sheet2.getCell(`A${33 + index}`).value = item.year
			sheet2.getCell(`B${33 + index}`).value = item.month
			sheet2.getCell(`C${33 + index}`).value = item.certifacateName
		})
	}

	// fileni yozib olish va saqlash
	const buffer = await workbook.xlsx.writeBuffer()
	saveAs(new Blob([buffer]), `${cvData.first_name}-CV.xlsx`)
}
