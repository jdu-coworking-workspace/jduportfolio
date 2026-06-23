import { useState } from 'react'
import PropTypes from 'prop-types'

/* ─── tiny helpers ─────────────────────────────────────────── */
const parseArray = data => {
	if (!data) return []
	if (Array.isArray(data)) return data.filter(Boolean)
	if (typeof data === 'string') {
		try {
			const p = JSON.parse(data)
			return Array.isArray(p) ? p.filter(Boolean) : []
		} catch {
			return []
		}
	}
	return []
}

const isNullLikeString = value => {
	if (typeof value !== 'string') return false
	const normalized = value.trim().toLowerCase()
	return normalized === '' || normalized === 'null' || normalized === 'undefined'
}

const hasMeaningfulValue = value => {
	if (value === null || value === undefined) return false
	if (typeof value === 'string') return !isNullLikeString(value)
	return true
}

const getSkillName = s => (typeof s === 'string' ? s : (s?.name ?? ''))

const calcAge = dob => {
	if (!dob) return null
	const today = new Date()
	const b = new Date(dob)
	let age = today.getFullYear() - b.getFullYear()
	if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
	return age
}

/* Returns an object keyed by proficiency level, e.g. { 上級: [{name,color}], 中級: [...], 初級: [...] }
   Returns null when the data is not in object form (falls back to flat array handling). */
const parseSkillsObject = data => {
	if (!data) return null
	let obj = data
	if (typeof data === 'string') {
		try {
			obj = JSON.parse(data)
		} catch {
			return null
		}
	}
	if (typeof obj !== 'object' || Array.isArray(obj)) return null
	return obj
}

const parseObject = data => {
	if (!data) return null
	if (typeof data === 'object') return data
	if (typeof data === 'string') {
		try {
			const parsed = JSON.parse(data)
			return typeof parsed === 'object' && parsed !== null ? parsed : null
		} catch {
			return null
		}
	}
	return null
}

const formatCertificationValue = (value, labels = PUBLIC_LABELS.ja) => {
	if (!hasMeaningfulValue(value)) return ''
	const parsed = parseObject(value)
	if (!parsed) return value

	const highest = parsed.highest ? `${labels.highest}: ${parsed.highest}` : null
	const historyKey = ['jlptlist', 'ieltslist', 'list', 'history'].find(key => Array.isArray(parsed[key]))
	const history = historyKey
		? parsed[historyKey]
				.filter(item => item && (item.level || item.date))
				.map(item => `${item.level || '-'}${item.date ? ` (${item.date})` : ''}`)
				.join(', ')
		: null

	if (highest && history) return `${highest} | ${history}`
	if (highest) return highest
	if (history) return history
	return typeof value === 'string' ? value : JSON.stringify(parsed)
}

const isUrl = value => typeof value === 'string' && /^https?:\/\//i.test(value.trim())

const isLikelyImageUrl = value => isUrl(value) && /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(value.trim())

const normalizeList = value => {
	if (!value) return []
	const stringifyItem = item => {
		if (!item) return ''
		if (typeof item === 'string') return item.trim()
		if (typeof item === 'number') return String(item)
		if (typeof item === 'object') return firstString([item.name, item.title, item.label, item.value, item.role, item.technology])
		return ''
	}
	if (Array.isArray(value)) return value.map(stringifyItem).filter(Boolean)
	if (typeof value === 'string') {
		try {
			const parsed = JSON.parse(value)
			if (Array.isArray(parsed)) return parsed.map(stringifyItem).filter(Boolean)
		} catch {
			return value
				.split(/[,;\n]/)
				.map(item => item.trim())
				.filter(Boolean)
		}
	}
	return []
}

const firstString = values => values.find(v => typeof v === 'string' && v.trim())?.trim() || ''

const normalizeProjectLinks = (item, imageUrls) => {
	const imageUrlSet = new Set(imageUrls)
	const candidates = [
		{ type: 'demo', value: item.link || item.demoLink || item.liveLink || item.projectUrl || item.project_url || item.website || item.siteUrl },
		{ type: 'github', value: item.github || item.githubLink || item.github_url || item.repoUrl || item.repository || item.sourceCode || item.codeLink },
		{ type: 'link', value: item.url },
	]

	const seen = new Set()
	return candidates
		.filter(({ value }) => isUrl(value) && !imageUrlSet.has(value.trim()))
		.map(({ type, value }) => ({ type, url: value.trim() }))
		.filter(link => {
			if (seen.has(link.url)) return false
			seen.add(link.url)
			return true
		})
}

const normalizeProjectItem = item => {
	if (!item || typeof item !== 'object') return null

	const title = firstString([item.title, item.name, item.project_name, item.projectTitle])
	const description = firstString([item.description, item.text, item.summary, item.content])

	// image_urls is an array; fall back to legacy single-url fields
	const imageCandidates = [...normalizeList(item.image_urls), ...normalizeList(item.imageLinks), ...normalizeList(item.images), ...normalizeList(item.screenshots), item.imageLink, item.image_url, item.imageUrl, item.file_url, item.fileUrl, isLikelyImageUrl(item.url) ? item.url : null].filter(v => typeof v === 'string' && v.trim())
	const allImages = [...new Set(imageCandidates.map(v => v.trim()))]
	const url = allImages[0] || ''
	const projectLinks = normalizeProjectLinks(item, allImages)
	const roles = normalizeList(item.roles || item.role || item.responsibilities || item.responsibility)
	const technologies = normalizeList(item.technologies || item.techStack || item.tech_stack || item.stack || item.tools)

	if (!title && !description && !url && !projectLinks.length && !roles.length && !technologies.length) return null

	return {
		...item,
		title,
		description,
		url,
		allImages,
		projectLinks,
		roles,
		technologies,
	}
}

const initials = (first, last) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase()

/* ─── sub-components ───────────────────────────────────────── */
const Chip = ({ label, color = 'blue' }) => {
	const map = {
		blue: { bg: '#EFF6FF', text: '#1d4ed8', border: '#bfdbfe' },
		purple: { bg: '#F5F3FF', text: '#6d28d9', border: '#ddd6fe' },
		rose: { bg: '#FFF1F2', text: '#be123c', border: '#fecdd3' },
		teal: { bg: '#F0FDFA', text: '#0f766e', border: '#99f6e4' },
		amber: { bg: '#FFFBEB', text: '#92400e', border: '#fde68a' },
	}
	const c = map[color] ?? map.blue
	return (
		<span
			style={{
				padding: '5px 14px',
				borderRadius: 100,
				fontSize: '.82rem',
				fontWeight: 500,
				background: c.bg,
				color: c.text,
				border: `1px solid ${c.border}`,
				display: 'inline-flex',
				alignItems: 'center',
			}}
		>
			{label}
		</span>
	)
}

Chip.propTypes = {
	label: PropTypes.string.isRequired,
	color: PropTypes.string,
}

const SectionLabel = ({ children }) => (
	<p
		style={{
			fontSize: '.7rem',
			fontWeight: 600,
			letterSpacing: 2,
			textTransform: 'uppercase',
			color: '#aaa',
			marginBottom: 20,
		}}
	>
		{children}
	</p>
)

SectionLabel.propTypes = {
	children: PropTypes.node.isRequired,
}

const AboutCard = ({ label, value }) => {
	const [hovered, setHovered] = useState(false)
	return (
		<div
			style={{
				background: '#fafafa',
				border: '1px solid #f0f0f0',
				borderRadius: 12,
				padding: '16px 18px',
				height: 140,
				display: 'flex',
				flexDirection: 'column',
				position: 'relative',
				cursor: 'default',
			}}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 6, flexShrink: 0 }}>{label}</p>
			<p
				style={{
					fontSize: '.95rem',
					fontWeight: 600,
					color: '#111',
					lineHeight: 1.45,
					display: '-webkit-box',
					WebkitLineClamp: 4,
					WebkitBoxOrient: 'vertical',
					overflow: 'hidden',
				}}
			>
				{value}
			</p>
			{hovered && (
				<div
					style={{
						position: 'absolute',
						bottom: 'calc(100% + 6px)',
						left: 0,
						minWidth: '100%',
						maxWidth: 280,
						background: '#fff',
						border: '1px solid #e0e0e0',
						borderRadius: 10,
						padding: '12px 14px',
						zIndex: 9999,
						boxShadow: '0 8px 24px rgba(0,0,0,.12)',
						pointerEvents: 'none',
					}}
				>
					<p style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 4 }}>{label}</p>
					<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#111', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</p>
				</div>
			)}
		</div>
	)
}

AboutCard.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
}

/* ── IT Skills levels config ─────────────────────────────── */
const LEVEL_CONFIG = {
	上級: { key: 'advanced', gradient: 'linear-gradient(135deg,#0f766e,#0d9488)', dot: '#0d9488', chipBg: '#F0FDFA', chipText: '#0f766e', chipBorder: '#99f6e4' },
	中級: { key: 'intermediate', gradient: 'linear-gradient(135deg,#302b63,#6d28d9)', dot: '#6d28d9', chipBg: '#F5F3FF', chipText: '#5b21b6', chipBorder: '#ddd6fe' },
	初級: { key: 'beginner', gradient: 'linear-gradient(135deg,#374151,#6b7280)', dot: '#6b7280', chipBg: '#F9FAFB', chipText: '#374151', chipBorder: '#e5e7eb' },
}
const LEVEL_ORDER = ['上級', '中級', '初級']

const ItSkillsGrouped = ({ skillsObj, labels }) => {
	const levels = LEVEL_ORDER.filter(lv => Array.isArray(skillsObj[lv]) && skillsObj[lv].length > 0)
	if (!levels.length) return null
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			{levels.map(lv => {
				const cfg = LEVEL_CONFIG[lv] || LEVEL_CONFIG['初級']
				const levelLabel = labels.skillLevels?.[cfg.key] || { label: lv, sublabel: '' }
				const skills = skillsObj[lv]
				return (
					<div
						key={lv}
						style={{
							background: '#fafafa',
							border: '1px solid #f0f0f0',
							borderRadius: 14,
							overflow: 'hidden',
						}}
					>
						{/* level header */}
						<div
							style={{
								background: cfg.gradient,
								padding: '12px 20px',
								display: 'flex',
								alignItems: 'center',
								gap: 10,
							}}
						>
							<span
								style={{
									fontSize: '1rem',
									fontWeight: 700,
									color: '#fff',
									letterSpacing: 0.5,
								}}
							>
								{levelLabel.label}
							</span>
							<span
								style={{
									fontSize: '.7rem',
									color: 'rgba(255,255,255,.7)',
									background: 'rgba(255,255,255,.15)',
									padding: '2px 10px',
									borderRadius: 100,
									fontWeight: 500,
								}}
							>
								{levelLabel.sublabel}
							</span>
							<span
								style={{
									marginLeft: 'auto',
									fontSize: '.72rem',
									color: 'rgba(255,255,255,.6)',
									fontWeight: 500,
								}}
							>
								{skills.length} {labels.skillsCount}
							</span>
						</div>
						{/* skills chips */}
						<div style={{ padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
							{skills.map((s, i) => {
								const skillName = getSkillName(s)
								return (
									<span
										key={i}
										style={{
											padding: '6px 16px',
											borderRadius: 100,
											fontSize: '.83rem',
											fontWeight: 600,
											background: cfg.chipBg,
											color: cfg.chipText,
											border: `1px solid ${cfg.chipBorder}`,
											display: 'inline-flex',
											alignItems: 'center',
											gap: 6,
										}}
									>
										<span
											style={{
												width: 6,
												height: 6,
												borderRadius: '50%',
												background: cfg.dot,
												flexShrink: 0,
											}}
										/>
										{skillName}
									</span>
								)
							})}
						</div>
					</div>
				)
			})}
		</div>
	)
}

ItSkillsGrouped.propTypes = {
	skillsObj: PropTypes.object.isRequired,
	labels: PropTypes.object.isRequired,
}

const ExpCard = ({ position, company, period, description }) => (
	<div
		style={{
			background: '#fff',
			border: '1px solid #f0f0f0',
			borderLeft: '3px solid #302b63',
			borderRadius: 12,
			padding: '18px 20px',
		}}
	>
		<p style={{ fontSize: '.95rem', fontWeight: 700, color: '#111', marginBottom: 3 }}>{position}</p>
		<p style={{ fontSize: '.82rem', color: '#888', marginBottom: description ? 10 : 0 }}>
			{company}
			{period ? ` • ${period}` : ''}
		</p>
		{description && <p style={{ fontSize: '.875rem', color: '#555', lineHeight: 1.6 }}>{description}</p>}
	</div>
)

ExpCard.propTypes = {
	position: PropTypes.string.isRequired,
	company: PropTypes.string.isRequired,
	period: PropTypes.string,
	description: PropTypes.string,
}

const projectItemPropType = PropTypes.shape({
	title: PropTypes.string,
	description: PropTypes.string,
	url: PropTypes.string,
	allImages: PropTypes.array,
	projectLinks: PropTypes.array,
	roles: PropTypes.array,
	technologies: PropTypes.array,
})

const getProjectLinkLabel = (type, labels) => {
	if (type === 'github') return labels.github
	if (type === 'demo') return labels.liveDemo
	return labels.openLink
}

const ProjectLinks = ({ links = [], labels }) => {
	if (!links.length) return null
	return (
		<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
			{links.map((link, i) => (
				<a
					key={`${link.url}-${i}`}
					href={link.url}
					target='_blank'
					rel='noreferrer'
					onClick={e => e.stopPropagation()}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						padding: '7px 10px',
						borderRadius: 8,
						border: '1px solid #e6e6ef',
						background: '#fff',
						color: '#302b63',
						fontSize: '.75rem',
						fontWeight: 700,
						textDecoration: 'none',
					}}
				>
					{link.type === 'github' ? 'GitHub' : '↗'} {getProjectLinkLabel(link.type, labels)}
				</a>
			))}
		</div>
	)
}

ProjectLinks.propTypes = {
	links: PropTypes.array,
	labels: PropTypes.object.isRequired,
}

const ProjectMeta = ({ label, values = [] }) => {
	if (!values.length) return null
	return (
		<div>
			<p style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 7 }}>{label}</p>
			<div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
				{values.map((value, i) => (
					<span
						key={`${value}-${i}`}
						style={{
							padding: '5px 10px',
							borderRadius: 100,
							fontSize: '.74rem',
							fontWeight: 600,
							color: '#374151',
							background: '#f9fafb',
							border: '1px solid #e5e7eb',
						}}
					>
						{value}
					</span>
				))}
			</div>
		</div>
	)
}

ProjectMeta.propTypes = {
	label: PropTypes.string.isRequired,
	values: PropTypes.array,
}

const GalleryCard = ({ item, onClick, labels }) => (
	<div
		onClick={() => onClick(item)}
		style={{
			borderRadius: 12,
			overflow: 'hidden',
			border: '1px solid #f0f0f0',
			cursor: 'pointer',
			transition: 'transform .2s, box-shadow .2s',
			background: '#fff',
		}}
		onMouseEnter={e => {
			e.currentTarget.style.transform = 'translateY(-4px)'
			e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.1)'
		}}
		onMouseLeave={e => {
			e.currentTarget.style.transform = ''
			e.currentTarget.style.boxShadow = ''
		}}
	>
		{item.url ? <img src={item.url} alt={item.title} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 170, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 14 }}>{labels.noImage}</div>}
		<div style={{ padding: 16 }}>
			<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#111', marginBottom: 4 }}>{item.title || labels.project}</p>
			{item.description && <p style={{ fontSize: '.8rem', color: '#888', lineHeight: 1.5, marginBottom: item.projectLinks?.length ? 12 : 0 }}>{item.description.length > 100 ? `${item.description.slice(0, 100)}…` : item.description}</p>}
			<ProjectLinks links={item.projectLinks} labels={labels} />
		</div>
	</div>
)

GalleryCard.propTypes = {
	item: projectItemPropType.isRequired,
	onClick: PropTypes.func.isRequired,
	labels: PropTypes.object.isRequired,
}

const Modal = ({ item, onClose, labels }) => {
	if (!item) return null
	return (
		<div
			onClick={onClose}
			style={{
				position: 'fixed',
				inset: 0,
				background: 'rgba(0,0,0,.6)',
				zIndex: 9999,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 24,
			}}
		>
			<div
				onClick={e => e.stopPropagation()}
				style={{
					background: '#fff',
					borderRadius: 16,
					maxWidth: 680,
					width: '100%',
					maxHeight: '90vh',
					overflow: 'auto',
				}}
			>
				{item.url && <img src={item.url} alt={item.title} style={{ width: '100%', maxHeight: 360, objectFit: 'contain', borderRadius: '16px 16px 0 0', background: '#f5f5f5' }} />}
				<div style={{ padding: '24px 28px' }}>
					<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
						<p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111' }}>{item.title || labels.project}</p>
						<button
							onClick={onClose}
							style={{
								background: '#f0f0f0',
								border: 'none',
								borderRadius: '50%',
								width: 32,
								height: 32,
								cursor: 'pointer',
								fontSize: 16,
								color: '#555',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							✕
						</button>
					</div>
					<p style={{ fontSize: '.9rem', color: '#555', lineHeight: 1.7, marginBottom: 18 }}>{item.description || labels.noDescription}</p>
					<div style={{ display: 'grid', gap: 16 }}>
						<ProjectLinks links={item.projectLinks} labels={labels} />
						<ProjectMeta label={labels.role} values={item.roles} />
						<ProjectMeta label={labels.technologies} values={item.technologies} />
						{item.allImages?.length > 1 && (
							<div>
								<p style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 8 }}>{labels.images}</p>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 8 }}>
									{item.allImages.map((image, i) => (
										<img key={`${image}-${i}`} src={image} alt={`${item.title || labels.project} ${i + 1}`} style={{ width: '100%', height: 78, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee', background: '#f5f5f5' }} />
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

Modal.propTypes = {
	item: projectItemPropType,
	onClose: PropTypes.func.isRequired,
	labels: PropTypes.object.isRequired,
}

/* ─── public link labels ───────────────────────────────────── */
const PUBLIC_LABELS = {
	ja: {
		about: '概要',
		skills: 'スキル',
		experience: '経験',
		education: '学歴',
		portfolio: 'ポートフォリオ',
		overview: '概要',
		major: '専攻',
		careerFocus: '希望職種',
		interests: '趣味',
		age: '年齢',
		ageValue: age => `${age}歳`,
		semester: '学期',
		semesterValue: semester => `${semester}学期`,
		graduationMonth: 'JDU卒業予定月',
		affiliatedUniversity: '所属大学',
		contactMe: '連絡する',
		technicalSkills: 'ITスキル',
		languages: '言語',
		certifications: '資格',
		otherCompetencies: 'その他のスキル',
		professionalExperience: '職務経験',
		partTimeWork: 'アルバイト',
		academicBackground: '学歴',
		graduation: '卒業',
		projects: '制作物・成果物',
		workTogether: '一緒に働きましょう',
		opportunities: 'インターン、アルバイト、正社員の機会を探しています',
		email: 'メール',
		phone: '電話',
		location: '住所',
		sendMessage: 'メッセージを送る',
		noImage: '画像なし',
		project: 'プロジェクト',
		position: '役職',
		role: '担当',
		company: '会社',
		technologies: '技術',
		images: '画像',
		liveDemo: 'リンク',
		github: 'GitHub',
		openLink: 'リンクを開く',
		skillsCount: 'スキル',
		skillLevels: {
			advanced: { label: '上級', sublabel: '3年以上' },
			intermediate: { label: '中級', sublabel: '3年未満' },
			beginner: { label: '初級', sublabel: '1年未満' },
		},
		noDescription: '説明はありません。',
		highest: '最高',
	},
	en: {
		about: 'About',
		skills: 'Skills',
		experience: 'Experience',
		education: 'Education',
		portfolio: 'Portfolio',
		overview: 'Overview',
		major: 'Major',
		careerFocus: 'Career focus',
		interests: 'Interests',
		age: 'Age',
		ageValue: age => `${age} years old`,
		semester: 'Semester',
		semesterValue: semester => `Semester ${semester}`,
		graduationMonth: 'JDU graduation month',
		affiliatedUniversity: 'Affiliated university',
		contactMe: 'Contact me',
		technicalSkills: 'Technical skills',
		languages: 'Languages',
		certifications: 'Certifications',
		otherCompetencies: 'Other competencies',
		professionalExperience: 'Professional experience',
		partTimeWork: 'Part-time work',
		academicBackground: 'Academic background',
		graduation: 'Graduation',
		projects: 'Projects & deliverables',
		workTogether: "Let's work together",
		opportunities: 'Open to internships, part-time, and full-time opportunities',
		email: 'Email',
		phone: 'Phone',
		location: 'Location',
		sendMessage: 'Send a message',
		noImage: 'No image',
		project: 'Project',
		position: 'Position',
		role: 'Role',
		company: 'Company',
		technologies: 'Technologies',
		images: 'Images',
		liveDemo: 'Live link',
		github: 'GitHub',
		openLink: 'Open link',
		skillsCount: 'skills',
		skillLevels: {
			advanced: { label: 'Advanced', sublabel: '3+ years' },
			intermediate: { label: 'Intermediate', sublabel: 'Under 3 years' },
			beginner: { label: 'Beginner', sublabel: 'Under 1 year' },
		},
		noDescription: 'No description provided.',
		highest: 'Highest',
	},
	uz: {
		about: 'Haqida',
		skills: "Ko'nikmalar",
		experience: 'Tajriba',
		education: "Ta'lim",
		portfolio: 'Portfolio',
		overview: 'Umumiy',
		major: 'Mutaxassislik',
		careerFocus: "Kasbiy yo'nalish",
		interests: 'Qiziqishlar',
		age: 'Yosh',
		ageValue: age => `${age} yosh`,
		semester: 'Semestr',
		semesterValue: semester => `${semester}-semestr`,
		graduationMonth: 'JDU bitiruv oyi',
		affiliatedUniversity: 'Hamkor universitet',
		contactMe: "Bog'lanish",
		technicalSkills: "Texnik ko'nikmalar",
		languages: 'Tillar',
		certifications: 'Sertifikatlar',
		otherCompetencies: "Boshqa ko'nikmalar",
		professionalExperience: 'Ish tajribasi',
		partTimeWork: 'Yarim stavkali ish',
		academicBackground: "Ta'lim tarixi",
		graduation: 'Bitiruv',
		projects: 'Loyihalar va ishlar',
		workTogether: 'Birga ishlaymiz',
		opportunities: "Amaliyot, yarim stavkali va to'liq stavkali imkoniyatlarga ochiq",
		email: 'Email',
		phone: 'Telefon',
		location: 'Manzil',
		sendMessage: 'Xabar yuborish',
		noImage: "Rasm yo'q",
		project: 'Loyiha',
		position: 'Lavozim',
		role: 'Rol',
		company: 'Kompaniya',
		technologies: 'Texnologiyalar',
		images: 'Rasmlar',
		liveDemo: 'Loyiha linki',
		github: 'GitHub',
		openLink: 'Linkni ochish',
		skillsCount: "ko'nikma",
		skillLevels: {
			advanced: { label: 'Yuqori', sublabel: '3+ yil' },
			intermediate: { label: "O'rta", sublabel: '3 yildan kam' },
			beginner: { label: "Boshlang'ich", sublabel: '1 yildan kam' },
		},
		noDescription: "Tavsif yo'q.",
		highest: 'Eng yuqori',
	},
	ru: {
		about: 'О себе',
		skills: 'Навыки',
		experience: 'Опыт',
		education: 'Образование',
		portfolio: 'Портфолио',
		overview: 'Обзор',
		major: 'Специальность',
		careerFocus: 'Карьерный фокус',
		interests: 'Интересы',
		age: 'Возраст',
		ageValue: age => `${age} лет`,
		semester: 'Семестр',
		semesterValue: semester => `${semester} семестр`,
		graduationMonth: 'Месяц выпуска JDU',
		affiliatedUniversity: 'Партнерский университет',
		contactMe: 'Связаться',
		technicalSkills: 'Технические навыки',
		languages: 'Языки',
		certifications: 'Сертификаты',
		otherCompetencies: 'Другие навыки',
		professionalExperience: 'Профессиональный опыт',
		partTimeWork: 'Подработка',
		academicBackground: 'Образование',
		graduation: 'Выпуск',
		projects: 'Проекты и работы',
		workTogether: 'Давайте работать вместе',
		opportunities: 'Открыт к стажировкам, подработке и полной занятости',
		email: 'Email',
		phone: 'Телефон',
		location: 'Адрес',
		sendMessage: 'Отправить сообщение',
		noImage: 'Нет изображения',
		project: 'Проект',
		position: 'Должность',
		role: 'Роль',
		company: 'Компания',
		technologies: 'Технологии',
		images: 'Изображения',
		liveDemo: 'Ссылка на проект',
		github: 'GitHub',
		openLink: 'Открыть ссылку',
		skillsCount: 'навыков',
		skillLevels: {
			advanced: { label: 'Продвинутый', sublabel: '3+ года' },
			intermediate: { label: 'Средний', sublabel: 'Менее 3 лет' },
			beginner: { label: 'Начальный', sublabel: 'Менее 1 года' },
		},
		noDescription: 'Описание не указано.',
		highest: 'Лучший результат',
	},
}

const getPublicLabels = language => PUBLIC_LABELS[language] || PUBLIC_LABELS.ja

/* ─── nav tabs ─────────────────────────────────────────────── */
const TABS = ['about', 'skills', 'experience', 'education', 'portfolio']

/* ─── main component ───────────────────────────────────────── */
const GuestPortfolioView = ({ student, language = 'ja' }) => {
	const labels = getPublicLabels(language)
	const [activeTab, setActiveTab] = useState('about')
	const [expandedProject, setExpandedProject] = useState(null)

	if (!student) return null

	const age = calcAge(student.date_of_birth)
	const itSkillsObj = parseSkillsObject(student.it_skills)
	const itSkills = itSkillsObj ? Object.values(itSkillsObj).flat().filter(Boolean) : parseArray(student.it_skills)
	const languageSkills = parseArray(student.language_skills)
	const otherSkills = parseArray(student.other_skills)
	const workExp = parseArray(student.work_experience)
	const arubaito = parseArray(student.arubaito)
	const gallery = parseArray(student.gallery).map(normalizeProjectItem).filter(Boolean)
	const deliverables = parseArray(student.deliverables).map(normalizeProjectItem).filter(Boolean)
	const allProjects = [...gallery, ...deliverables]
	const graduationText = student.graduation_year && student.graduation_season ? `${student.graduation_year}年${student.graduation_season}` : null
	const jlptValue = formatCertificationValue(student.jlpt, labels)
	const ieltsValue = formatCertificationValue(student.ielts, labels)
	const jduCertValue = formatCertificationValue(student.jdu_japanese_certification, labels)

	const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
	const ini = initials(student.first_name, student.last_name)

	/* tab visibility */
	const tabs = TABS.filter(t => {
		if (t === 'skills') return itSkills.length || languageSkills.length || otherSkills.length || hasMeaningfulValue(jlptValue) || hasMeaningfulValue(ieltsValue) || hasMeaningfulValue(jduCertValue)
		if (t === 'experience') return workExp.length || arubaito.length
		if (t === 'education') return student.partner_university
		if (t === 'portfolio') return allProjects.length
		return true
	})

	/* ── shared styles ── */
	const section = { marginBottom: 56 }
	const sectionGrid = { display: 'grid', gap: 12 }

	return (
		<div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", color: '#111' }}>
			{/* ── HERO ── */}
			<div
				style={{
					background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 60%,#24243e 100%)',
					color: '#fff',
					padding: '64px 32px',
					position: 'relative',
					overflow: 'hidden',
				}}
			>
				{/* bg circles */}
				{[
					{ top: -200, right: -150, size: 500, op: 0.04 },
					{ bottom: -120, left: -80, size: 300, op: 0.03 },
				].map((c, i) => (
					<div
						key={i}
						style={{
							position: 'absolute',
							borderRadius: '50%',
							width: c.size,
							height: c.size,
							background: `rgba(255,255,255,${c.op})`,
							top: c.top,
							bottom: c.bottom,
							left: c.left,
							right: c.right,
							pointerEvents: 'none',
						}}
					/>
				))}

				<div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', gap: 48, alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
					{/* avatar */}
					{student.photo ? (
						<img src={student.photo} alt={name} style={{ width: 142, height: 142, borderRadius: '50%', border: '3px solid rgba(255,255,255,.25)', objectFit: 'cover', flexShrink: 0 }} />
					) : ini ? (
						<div
							style={{
								width: 142,
								height: 142,
								borderRadius: '50%',
								border: '3px solid rgba(255,255,255,.25)',
								background: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 42,
								fontWeight: 600,
								color: '#fff',
								flexShrink: 0,
								letterSpacing: -1,
							}}
						>
							{ini}
						</div>
					) : null}

					<div style={{ flex: 1, minWidth: 260 }}>
						{name && <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 12 }}>{name}</h1>}
						{student.self_introduction && <p style={{ fontSize: '.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,.82)', maxWidth: 520, marginBottom: 14 }}>{student.self_introduction}</p>}
						{(student.major || student.job_type) && (
							<p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.6)', marginBottom: 20 }}>
								{student.major}
								{student.major && student.job_type ? ' • ' : ''}
								{student.job_type}
							</p>
						)}

						{/* private fields like student ID are intentionally hidden */}
						<div style={{ display: 'grid', gap: 6, marginBottom: 22 }}>
							{age && (
								<p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>
									{labels.age}: {age}
								</p>
							)}
							{graduationText && (
								<p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>
									{labels.graduationMonth}: {graduationText}
								</p>
							)}
							{student.partner_university && (
								<p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>
									{labels.affiliatedUniversity}: {student.partner_university}
								</p>
							)}
						</div>

						{/* CTA buttons */}
						<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
							{student.email && (
								<a href={`mailto:${student.email}`} style={btnPrimary}>
									✉ {labels.contactMe}
								</a>
							)}
							{student.phone && (
								<a href={`tel:${student.phone}`} style={btnOutline}>
									{student.phone}
								</a>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* ── NAV TABS ── */}
			<div style={{ borderBottom: '1px solid #f0f0f0', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
				<div style={{ maxWidth: 900, margin: '0 auto', padding: '0 32px', display: 'flex', gap: 0, overflowX: 'auto' }}>
					{tabs.map(t => (
						<button
							key={t}
							onClick={() => setActiveTab(t)}
							style={{
								padding: '15px 20px',
								fontSize: '.875rem',
								fontWeight: 500,
								color: activeTab === t ? '#302b63' : '#888',
								background: 'transparent',
								border: 'none',
								borderBottom: activeTab === t ? '2px solid #302b63' : '2px solid transparent',
								cursor: 'pointer',
								whiteSpace: 'nowrap',
								transition: 'all .2s',
							}}
						>
							{labels[t]}
						</button>
					))}
				</div>
			</div>

			{/* ── MAIN ── */}
			<div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
				{/* ABOUT */}
				{activeTab === 'about' && (
					<div style={section}>
						<SectionLabel>{labels.overview}</SectionLabel>
						<div style={{ ...sectionGrid, gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
							{student.major && <AboutCard label={labels.major} value={student.major} />}
							{student.job_type && <AboutCard label={labels.careerFocus} value={student.job_type} />}
							{student.hobbies && <AboutCard label={labels.interests} value={student.hobbies} />}
							{age && <AboutCard label={labels.age} value={labels.ageValue(age)} />}
							{student.semester && <AboutCard label={labels.semester} value={labels.semesterValue(student.semester)} />}
						</div>
					</div>
				)}

				{/* SKILLS */}
				{activeTab === 'skills' && (
					<div>
						{itSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>{labels.technicalSkills}</SectionLabel>
								{itSkillsObj ? (
									/* Grouped by proficiency level */
									<ItSkillsGrouped skillsObj={itSkillsObj} labels={labels} />
								) : (
									/* Flat fallback */
									<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
										{itSkills.map((s, i) => (
											<Chip key={i} label={getSkillName(s)} color='blue' />
										))}
									</div>
								)}
							</div>
						)}

						{languageSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>{labels.languages}</SectionLabel>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
									{languageSkills.map((l, i) => (
										<Chip key={i} label={typeof l === 'string' ? l : (l?.name ?? labels.languages)} color='purple' />
									))}
								</div>
							</div>
						)}

						{(hasMeaningfulValue(jlptValue) || hasMeaningfulValue(ieltsValue) || hasMeaningfulValue(jduCertValue)) && (
							<div style={section}>
								<SectionLabel>{labels.certifications}</SectionLabel>
								<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
									{hasMeaningfulValue(jlptValue) && <CertBadge label='JLPT' value={jlptValue} color='amber' />}
									{hasMeaningfulValue(ieltsValue) && <CertBadge label='IELTS' value={ieltsValue} color='blue' />}
									{hasMeaningfulValue(jduCertValue) && <CertBadge label='JDU Cert.' value={jduCertValue} color='purple' />}
								</div>
							</div>
						)}

						{otherSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>{labels.otherCompetencies}</SectionLabel>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
									{otherSkills.map((s, i) => (
										<Chip key={i} label={getSkillName(s)} color='rose' />
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* EXPERIENCE */}
				{activeTab === 'experience' && (
					<div>
						{workExp.length > 0 && (
							<div style={section}>
								<SectionLabel>{labels.professionalExperience}</SectionLabel>
								<div style={{ position: 'relative', paddingLeft: 28 }}>
									<div style={{ position: 'absolute', left: 0, top: 8, bottom: 0, width: 1.5, background: 'linear-gradient(to bottom,#302b63,#e0e0e0)' }} />
									{workExp.map((exp, i) => (
										<div key={i} style={{ position: 'relative', marginBottom: 24 }}>
											<div
												style={{
													position: 'absolute',
													left: -35,
													top: 10,
													width: 14,
													height: 14,
													borderRadius: '50%',
													background: '#fff',
													border: '2.5px solid #302b63',
													boxShadow: '0 0 0 4px rgba(48,43,99,.1)',
												}}
											/>
											<ExpCard position={exp.position || exp.title || labels.position} company={exp.company || exp.organization || labels.company} period={exp.period} description={exp.description} />
										</div>
									))}
								</div>
							</div>
						)}

						{arubaito.length > 0 && (
							<div style={section}>
								<SectionLabel>{labels.partTimeWork}</SectionLabel>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
									{arubaito.map((job, i) => (
										<ExpCard key={i} position={job.role || labels.position} company={job.company || labels.company} period={job.period} description={job.description} />
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* EDUCATION */}
				{activeTab === 'education' && student.partner_university && (
					<div style={section}>
						<SectionLabel>{labels.academicBackground}</SectionLabel>
						<div
							style={{
								background: '#fafafa',
								border: '1px solid #f0f0f0',
								borderRadius: 14,
								padding: 28,
								display: 'flex',
								gap: 20,
								alignItems: 'flex-start',
								flexWrap: 'wrap',
							}}
						>
							<div
								style={{
									width: 48,
									height: 48,
									borderRadius: 10,
									flexShrink: 0,
									background: 'linear-gradient(135deg,#0f0c29,#302b63)',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									fontSize: 22,
								}}
							>
								🎓
							</div>
							<div style={{ flex: 1, minWidth: 200 }}>
								<p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#111', marginBottom: 4 }}>{student.partner_university}</p>
								{(student.faculty || student.department) && <p style={{ fontSize: '.875rem', color: '#666', marginBottom: 18 }}>{[student.faculty, student.department].filter(Boolean).join(' • ')}</p>}
								<div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
									{student.graduation_year && (
										<div>
											<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 3 }}>{labels.graduation}</p>
											<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#333' }}>
												{student.graduation_year}
												{student.graduation_season ? ` (${student.graduation_season})` : ''}
											</p>
										</div>
									)}
									{student.semester && (
										<div>
											<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 3 }}>{labels.semester}</p>
											<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#333' }}>{labels.semesterValue(student.semester)}</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* PORTFOLIO */}
				{activeTab === 'portfolio' && allProjects.length > 0 && (
					<div style={section}>
						<SectionLabel>{labels.projects}</SectionLabel>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
							{allProjects.map((item, i) => (
								<GalleryCard key={i} item={item} onClick={setExpandedProject} labels={labels} />
							))}
						</div>
					</div>
				)}
			</div>

			{/* ── CONTACT FOOTER ── */}
			{(student.email || student.phone || student.address) && (
				<div
					style={{
						background: 'linear-gradient(135deg,#0f0c29 0%,#302b63 100%)',
						color: '#fff',
						padding: '56px 32px',
						textAlign: 'center',
						position: 'relative',
						overflow: 'hidden',
					}}
				>
					<div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,.04)', top: -180, right: -120, pointerEvents: 'none' }} />
					<div style={{ position: 'relative', zIndex: 1 }}>
						<p style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>{labels.workTogether}</p>
						<p style={{ color: 'rgba(255,255,255,.55)', fontSize: '.9rem', marginBottom: 32 }}>{labels.opportunities}</p>
						<div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', marginBottom: 36 }}>
							{student.email && <ContactItem icon='✉' label={labels.email} value={student.email} />}
							{student.phone && <ContactItem icon='📞' label={labels.phone} value={student.phone} />}
							{student.address && <ContactItem icon='📍' label={labels.location} value={student.address} />}
						</div>
						{student.email && (
							<a
								href={`mailto:${student.email}`}
								style={{
									display: 'inline-block',
									padding: '12px 32px',
									background: '#fff',
									color: '#302b63',
									fontWeight: 700,
									fontSize: '.95rem',
									borderRadius: 8,
									textDecoration: 'none',
								}}
							>
								{labels.sendMessage} →
							</a>
						)}
					</div>
				</div>
			)}

			{/* ── PROJECT MODAL ── */}
			<Modal item={expandedProject} onClose={() => setExpandedProject(null)} labels={labels} />
		</div>
	)
}

/* ─── tiny inline helpers ──────────────────────────────────── */
const btnPrimary = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 6,
	padding: '10px 22px',
	background: '#fff',
	color: '#302b63',
	fontWeight: 600,
	fontSize: '.9rem',
	borderRadius: 8,
	textDecoration: 'none',
	border: 'none',
	cursor: 'pointer',
}

const btnOutline = {
	display: 'inline-flex',
	alignItems: 'center',
	padding: '10px 22px',
	background: 'transparent',
	color: '#fff',
	fontWeight: 500,
	fontSize: '.9rem',
	borderRadius: 8,
	border: '1px solid rgba(255,255,255,.35)',
	textDecoration: 'none',
	cursor: 'pointer',
}

const CertBadge = ({ label, value, color }) => {
	const map = {
		amber: { bg: '#FFFBEB', border: '#fde68a', lc: '#92400e', vc: '#78350f' },
		blue: { bg: '#EFF6FF', border: '#bfdbfe', lc: '#1e40af', vc: '#1e3a8a' },
		purple: { bg: '#F5F3FF', border: '#ddd6fe', lc: '#5b21b6', vc: '#4c1d95' },
	}
	const c = map[color] ?? map.blue
	return (
		<div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 20px', minWidth: 90, maxWidth: '100%' }}>
			<p style={{ fontSize: '.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: c.lc, marginBottom: 4 }}>{label}</p>
			<p style={{ fontSize: '.95rem', fontWeight: 700, color: c.vc, lineHeight: 1.45, wordBreak: 'break-word' }}>{value}</p>
		</div>
	)
}

CertBadge.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]).isRequired,
	color: PropTypes.string,
}

const ContactItem = ({ icon, label, value }) => (
	<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
		<div
			style={{
				width: 36,
				height: 36,
				borderRadius: '50%',
				background: 'rgba(255,255,255,.12)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 15,
				marginBottom: 4,
			}}
		>
			{icon}
		</div>
		<p style={{ fontSize: '.7rem', color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</p>
		<p style={{ fontSize: '.9rem', fontWeight: 500, color: '#fff' }}>{value}</p>
	</div>
)

ContactItem.propTypes = {
	icon: PropTypes.node.isRequired,
	label: PropTypes.string.isRequired,
	value: PropTypes.string.isRequired,
}

GuestPortfolioView.propTypes = {
	student: PropTypes.shape({
		first_name: PropTypes.string,
		last_name: PropTypes.string,
		photo: PropTypes.string,
		major: PropTypes.string,
		job_type: PropTypes.string,
		self_introduction: PropTypes.string,
		email: PropTypes.string,
		phone: PropTypes.string,
		hobbies: PropTypes.string,
		address: PropTypes.string,
		date_of_birth: PropTypes.string,
		it_skills: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		language_skills: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		other_skills: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		jlpt: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		ielts: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		jdu_japanese_certification: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		work_experience: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		arubaito: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		gallery: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		deliverables: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
		partner_university: PropTypes.string,
		faculty: PropTypes.string,
		department: PropTypes.string,
		graduation_year: PropTypes.string,
		graduation_season: PropTypes.string,
		semester: PropTypes.string,
		japanese_employment_credits: PropTypes.number,
		business_skills_credits: PropTypes.number,
	}).isRequired,
	language: PropTypes.string,
}

export default GuestPortfolioView
