// utils/emailToStudent.js

const { sendEmail } = require('./emailService') // Asosiy jo'natuvchi servisni import qilamiz

/**
 * 1. Email KONTENTINI FORMATLASH uchun funksiya.
 * Bu funksiya faqat email ma'lumotlarini tayyorlab, ob'ekt sifatida qaytaradi.
 * Ommaviy jo'natish uchun ishlatiladi.
 */
const formatStudentWelcomeEmail = (email, password, firstName, lastName) => {
	const to = email
	const subject = 'Welcome to JDU'
	const text = `Dear ${firstName} ${lastName},\n\nWelcome to JDU Portfolio System! Your account has been created.\n\nYour login details are as follows:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease keep this information secure and do not share it with anyone.\n\nAdditionally, please log into the portfolio and fill in your information on the "自己PR" and "Q&A" pages.\n\nBest regards,\nJDU Team`
	const html = `
         <!DOCTYPE html>
      <html lang="ja">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>アカウント情報</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  margin: 0;
                  padding: 0;
              }
              .email-container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: #ffffff;
                  padding: 20px;
                  border: 1px solid #e1e1e1;
                  border-radius: 10px;
              }
              .header {
                  text-align: center;
                  padding: 10px 0;
                  background-color: #4CAF50;
                  color: #ffffff;
                  border-radius: 10px 10px 0 0;
              }
              .content {
                  padding: 20px;
                  line-height: 1.6;
              }
              .content p {
                  margin: 0 0 10px;
              }
              .content a {
                  color: #4CAF50;
                  text-decoration: none;
              }
              .content a:hover {
                  text-decoration: underline;
              }
              .footer {
                  text-align: center;
                  padding: 10px;
                  background-color: #f4f4f4;
                  color: #666666;
                  border-radius: 0 0 10px 10px;
              }
          </style>
      </head>
      <body>
          <div class="email-container">
              <div class="header">
                  <h1>JDUへようこそ</h1>
              </div>
              <div class="content">
                  <p>${firstName} ${lastName} 様,</p>
                  <p>私たちのチームに加わっていただき、ありがとうございます！以下があなたのアカウント情報です。</p>
                  <p><strong>メールアドレス:</strong> ${email}</p>
                  <p><strong>パスワード:</strong> ${password}</p>
                  <p>この情報は安全に保管し、他の人と共有しないでください。</p>
                  <p>下記のリンクをクリックしてアカウントにログインできます：</p>
                  <p><a href="https://portfolio.jdu.uz/login">アカウントにログインする</a></p>
                  <p>また、ポートフォリオにログインし、「自己PR」および「Q&A」ページにあなたの情報を入力してください。</p>
                  <p>ご質問がある場合やサポートが必要な場合は、いつでもサポートチームまでご連絡ください。</p>
                  <p>よろしくお願いいたします。</p>
                  <p>JDUチーム</p>
              </div>
              <div class="footer">
                  <p>&copy; ${new Date().getFullYear()} JDU. All rights reserved.</p>
                  <p>JDU住所</p>
              </div>
          </div>
      </body>
      </html>
    `
	return { to, subject, text, html }
}

/**
 * 2. Tayyor shablonni YAKKA TARTIBDA JO'NATISH uchun funksiya.
 * Bu funksiya formatlash funksiyasini chaqiradi va darhol jo'natadi.
 * Webhook kabi yakka hodisalar uchun ishlatiladi.
 */
const sendStudentWelcomeEmail = async (email, password, firstName, lastName) => {
	// Yuqoridagi formatlash funksiyasidan foydalanamiz
	const mailData = formatStudentWelcomeEmail(email, password, firstName, lastName)

	try {
		await sendEmail(mailData) // Asosiy servis orqali jo'natamiz
		return 'Email sent successfully'
	} catch (error) {
		console.error(`Talabaga yakka tartibda email jo'natishda xatolik (${email}): `, error)
		throw error
	}
}

// ============================================================
// 3. STUDENT NOTIFICATION EMAILLARI
//    Draft status o'zgarganda va profil koukai bo'lganda
//    studentga jo'natiladigan email template'lar
// ============================================================

/**
 * Umumiy email strukturasini yaratuvchi yordamchi funksiya.
 * Barcha student notification email'lari uchun umumiy layout.
 */
const _buildStudentNotificationHtml = ({ headerColor, headerIcon, headerTitle, studentName, bodyJA, commentSection, ctaUrl, ctaText, bodyEN, bodyUZ, bodyRU }) => {
	return `
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
	<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
		<div style="background:${headerColor};padding:28px 24px;text-align:center;">
			<div style="font-size:40px;margin-bottom:8px;">${headerIcon}</div>
			<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">${headerTitle}</h1>
		</div>
		<div style="padding:28px 24px;">
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 12px;">${studentName} 様,</p>
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 12px;">${bodyJA}</p>
			${commentSection || ''}
			<div style="text-align:center;margin:24px 0;">
				<a href="${ctaUrl}" style="display:inline-block;background:${headerColor};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">${ctaText}</a>
			</div>
			<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 6px;">🇬🇧 ${bodyEN}</p>
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 6px;">🇺🇿 ${bodyUZ}</p>
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0;">🇷🇺 ${bodyRU}</p>
		</div>
		<div style="background:#f8f9fa;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
			<p style="margin:0;color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} JDU Portfolio System</p>
		</div>
	</div>
</body>
</html>`
}

/**
 * Staff izohini styled block sifatida formatlash
 */
const _buildCommentSection = (comments, accentColor) => {
	if (!comments) return ''
	return `<div style="background-color:#f9f9f9;border-left:4px solid ${accentColor};padding:12px 16px;margin:16px 0;border-radius:4px;">
		<p style="margin:0 0 6px;font-weight:bold;color:#333;">📝 スタッフコメント / Staff Comment:</p>
		<p style="margin:0;color:#555;white-space:pre-wrap;">${comments}</p>
	</div>`
}

/**
 * Draft TASDIQLANGAN (approved) bo'lganda studentga email formatlash
 * @param {string} email - Student email manzili
 * @param {string} studentName - Student to'liq ismi
 * @param {string} staffName - Staff to'liq ismi
 * @param {string|null} comments - Staff izohi
 * @param {string} studentId - Student ID
 * @returns {{ to, subject, text, html }}
 */
const formatStudentDraftApprovedEmail = (email, studentName, staffName, comments, studentId) => {
	const profileUrl = `https://portfolio.jdu.uz/profile/top`
	const headerColor = '#4CAF50'

	const bodyJA = `おめでとうございます！あなたのプロフィール情報が<strong>${staffName}</strong>によって承認されました。更新内容が正式に反映されています。`
	const bodyEN = `Congratulations! Your profile has been <strong>approved</strong> by ${staffName}. Your updates are now live.`
	const bodyUZ = `Tabriklaymiz! Sizning profilingiz ${staffName} tomonidan <strong>tasdiqlandi</strong>. O'zgarishlaringiz endi faol.`
	const bodyRU = `Поздравляем! Ваш профиль был <strong>одобрен</strong> сотрудником ${staffName}. Ваши обновления теперь активны.`

	return {
		to: email,
		subject: '🎉 プロフィールが承認されました — JDU Portfolio',
		text: `${studentName} 様\n\n${bodyJA.replace(/<[^>]*>/g, '')}\n\n${bodyEN.replace(/<[^>]*>/g, '')}\n\n${bodyUZ.replace(/<[^>]*>/g, '')}\n\n${bodyRU.replace(/<[^>]*>/g, '')}${comments ? `\n\nコメント: ${comments}` : ''}`,
		html: _buildStudentNotificationHtml({
			headerColor,
			headerIcon: '✅',
			headerTitle: 'プロフィール承認のお知らせ',
			studentName,
			bodyJA,
			commentSection: _buildCommentSection(comments, headerColor),
			ctaUrl: profileUrl,
			ctaText: 'プロフィールを確認する',
			bodyEN,
			bodyUZ,
			bodyRU,
		}),
	}
}

/**
 * Draft SASHI-MODOSHI (disapproved / 差し戻し) bo'lganda studentga email formatlash
 * @param {string} email - Student email manzili
 * @param {string} studentName - Student to'liq ismi
 * @param {string} staffName - Staff to'liq ismi
 * @param {string|null} comments - Staff izohi
 * @param {string} studentId - Student ID
 * @returns {{ to, subject, text, html }}
 */
const formatStudentDraftDisapprovedEmail = (email, studentName, staffName, comments, studentId) => {
	const profileUrl = `https://portfolio.jdu.uz/profile/top`
	const headerColor = '#f44336'

	const bodyJA = `あなたのプロフィール情報が<strong>${staffName}</strong>によって差し戻されました。スタッフのコメントを確認し、内容を修正して再提出してください。`
	const bodyEN = `Your profile has been <strong>returned</strong> by ${staffName}. Please review the staff comments, make corrections, and resubmit.`
	const bodyUZ = `Sizning profilingiz ${staffName} tomonidan <strong>qaytarildi</strong>. Xodim izohlarini ko'rib chiqing, tuzating va qayta yuboring.`
	const bodyRU = `Ваш профиль был <strong>возвращён</strong> сотрудником ${staffName}. Пожалуйста, ознакомьтесь с комментариями, внесите исправления и отправьте повторно.`

	return {
		to: email,
		subject: '📋 プロフィールが差し戻されました — JDU Portfolio',
		text: `${studentName} 様\n\n${bodyJA.replace(/<[^>]*>/g, '')}\n\n${bodyEN.replace(/<[^>]*>/g, '')}\n\n${bodyUZ.replace(/<[^>]*>/g, '')}\n\n${bodyRU.replace(/<[^>]*>/g, '')}${comments ? `\n\nコメント: ${comments}` : ''}`,
		html: _buildStudentNotificationHtml({
			headerColor,
			headerIcon: '🔄',
			headerTitle: 'プロフィール差し戻しのお知らせ',
			studentName,
			bodyJA,
			commentSection: _buildCommentSection(comments, headerColor),
			ctaUrl: profileUrl,
			ctaText: 'プロフィールを修正する',
			bodyEN,
			bodyUZ,
			bodyRU,
		}),
	}
}

/**
 * Draft QAYTA TOPSHIRISH TALAB ETILGANDA (resubmission_required) studentga email formatlash
 * @param {string} email - Student email manzili
 * @param {string} studentName - Student to'liq ismi
 * @param {string} staffName - Staff to'liq ismi
 * @param {string|null} comments - Staff izohi
 * @param {string} studentId - Student ID
 * @returns {{ to, subject, text, html }}
 */
const formatStudentDraftResubmissionEmail = (email, studentName, staffName, comments, studentId) => {
	const profileUrl = `https://portfolio.jdu.uz/profile/top`
	const headerColor = '#FF9800'

	const bodyJA = `あなたのプロフィール情報について、<strong>${staffName}</strong>より修正が求められています。コメントを確認の上、修正して再提出をお願いいたします。`
	const bodyEN = `Your profile requires <strong>corrections</strong> as requested by ${staffName}. Please review the comments and resubmit.`
	const bodyUZ = `Sizning profilingizga ${staffName} tomonidan <strong>tuzatish</strong> talab qilinmoqda. Izohlarni ko'rib chiqing va qayta yuboring.`
	const bodyRU = `Требуются <strong>исправления</strong> в вашем профиле по запросу ${staffName}. Ознакомьтесь с комментариями и отправьте повторно.`

	return {
		to: email,
		subject: '✏️ プロフィールの修正が必要です — JDU Portfolio',
		text: `${studentName} 様\n\n${bodyJA.replace(/<[^>]*>/g, '')}\n\n${bodyEN.replace(/<[^>]*>/g, '')}\n\n${bodyUZ.replace(/<[^>]*>/g, '')}\n\n${bodyRU.replace(/<[^>]*>/g, '')}${comments ? `\n\nコメント: ${comments}` : ''}`,
		html: _buildStudentNotificationHtml({
			headerColor,
			headerIcon: '⚠️',
			headerTitle: '要修正：プロフィール情報',
			studentName,
			bodyJA,
			commentSection: _buildCommentSection(comments, headerColor),
			ctaUrl: profileUrl,
			ctaText: 'プロフィールを修正する',
			bodyEN,
			bodyUZ,
			bodyRU,
		}),
	}
}

/**
 * Profil KOUKAI (公開 / public) bo'lganda studentga email formatlash
 * @param {string} email - Student email manzili
 * @param {string} studentName - Student to'liq ismi
 * @param {string} studentId - Student ID
 * @returns {{ to, subject, text, html }}
 */
const formatStudentProfilePublicEmail = (email, studentName, studentId) => {
	const profileUrl = `https://portfolio.jdu.uz/profile/top`
	const headerColor = 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'

	const bodyJA = `🎊 おめでとうございます！あなたのプロフィールが<strong>公開</strong>されました。`
	const bodyEN = `Congratulations! Your profile is now <strong>public</strong> and visible to recruiters. This is a great step towards your career!`
	const bodyUZ = `Tabriklaymiz! Sizning profilingiz endi <strong>ommaviy</strong> va recruiterlar ko'ra oladi. Bu karyerangiz uchun ajoyib qadam!`
	const bodyRU = `Поздравляем! Ваш профиль теперь <strong>публичен</strong> и доступен рекрутерам. Это отличный шаг в вашей карьере!`

	return {
		to: email,
		subject: '🌐 プロフィールが公開されました — JDU Portfolio',
		text: `${studentName} 様\n\nおめでとうございます！あなたのプロフィールが公開されました。企業の採用担当者があなたのプロフィールを閲覧できるようになりました。\n\nCongratulations! Your profile is now public and visible to recruiters.\n\nTabriklaymiz! Sizning profilingiz endi ommaviy va recruiterlar ko'ra oladi.\n\nПоздравляем! Ваш профиль теперь публичен и доступен рекрутерам.`,
		html: `
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
	<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
		<div style="background:${headerColor};padding:28px 24px;text-align:center;">
			<div style="font-size:40px;margin-bottom:8px;">🌐</div>
			<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">プロフィール公開のお知らせ</h1>
		</div>
		<div style="padding:28px 24px;">
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 12px;">${studentName} 様,</p>
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 12px;">${bodyJA}</p>
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">企業の採用担当者があなたのプロフィールを閲覧できるようになりました。素晴らしいキャリアの第一歩です！</p>
			<div style="text-align:center;margin:24px 0;">
				<a href="${profileUrl}" style="display:inline-block;background:${headerColor};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">公開プロフィールを見る</a>
			</div>
			<hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 6px;">🇬🇧 ${bodyEN}</p>
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0 0 6px;">🇺🇿 ${bodyUZ}</p>
			<p style="color:#888;font-size:13px;line-height:1.6;margin:0;">🇷🇺 ${bodyRU}</p>
		</div>
		<div style="background:#f8f9fa;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
			<p style="margin:0;color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} JDU Portfolio System</p>
		</div>
	</div>
</body>
</html>`,
	}
}

// Endi barcha funksiyalarni export qilamiz
module.exports = {
	formatStudentWelcomeEmail,
	sendStudentWelcomeEmail,
	formatStudentDraftApprovedEmail,
	formatStudentDraftDisapprovedEmail,
	formatStudentDraftResubmissionEmail,
	formatStudentProfilePublicEmail,
}
