const getFrontendBaseUrl = () => {
	const url = process.env.FRONTEND_URL_PROD || 'https://portfolio.jdu.uz'
	return String(url).replace(/\/$/, '')
}

const escapeHtml = value =>
	String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const stripTags = value =>
	String(value ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

const excerpt = (value, max = 200) => {
	const text = stripTags(value)
	if (text.length <= max) return text
	return `${text.slice(0, max).trim()}…`
}

/**
 * Admin news published — Japanese email for a single recipient.
 */
const formatNewsPublishedEmail = ({ email, recipientName, title, description, newsId }) => {
	const name = stripTags(recipientName) || 'ユーザー'
	const safeTitle = stripTags(title) || 'お知らせ'
	const safeExcerpt = excerpt(description)
	const newsUrl = `${getFrontendBaseUrl()}/news/${newsId}`
	const headerColor = '#1565C0'

	const subject = '【JDU】新しいお知らせが公開されました'
	const text = `${name} 様

JDUポートフォリオに新しいお知らせが公開されました。

タイトル：${safeTitle}

${safeExcerpt}

詳細は下記のリンクからご確認ください。
${newsUrl}

JDUチーム`

	const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Helvetica Neue',Arial,sans-serif;">
	<div style="max-width:600px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;">
		<div style="background:${headerColor};padding:28px 24px;text-align:center;">
			<h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">新しいお知らせ</h1>
		</div>
		<div style="padding:28px 24px;">
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 12px;">${escapeHtml(name)} 様</p>
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 16px;">JDUポートフォリオに新しいお知らせが公開されました。</p>
			<p style="color:#333;font-size:15px;line-height:1.7;margin:0 0 8px;"><strong>タイトル：</strong>${escapeHtml(safeTitle)}</p>
			${safeExcerpt ? `<p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 16px;">${escapeHtml(safeExcerpt)}</p>` : ''}
			<div style="text-align:center;margin:24px 0;">
				<a href="${escapeHtml(newsUrl)}" style="display:inline-block;background:${headerColor};color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:15px;font-weight:600;">お知らせを見る</a>
			</div>
		</div>
		<div style="background:#f8f9fa;padding:16px 24px;text-align:center;border-top:1px solid #eee;">
			<p style="margin:0;color:#999;font-size:12px;">&copy; ${new Date().getFullYear()} JDU Portfolio System</p>
		</div>
	</div>
</body>
</html>`

	return { to: email, subject, text, html }
}

module.exports = {
	formatNewsPublishedEmail,
	getFrontendBaseUrl,
}
