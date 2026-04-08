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

const getSkillName = s => (typeof s === 'string' ? s : (s?.name ?? ''))

const calcAge = dob => {
	if (!dob) return null
	const today = new Date()
	const b = new Date(dob)
	let age = today.getFullYear() - b.getFullYear()
	if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--
	return age
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

const formatCertificationValue = value => {
	const parsed = parseObject(value)
	if (!parsed) return value

	const highest = parsed.highest ? `Highest: ${parsed.highest}` : null
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

const AboutCard = ({ label, value }) => (
	<div
		style={{
			background: '#fafafa',
			border: '1px solid #f0f0f0',
			borderRadius: 12,
			padding: '16px 18px',
		}}
	>
		<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#aaa', marginBottom: 6 }}>{label}</p>
		<p style={{ fontSize: '.95rem', fontWeight: 600, color: '#111', lineHeight: 1.4 }}>{value}</p>
	</div>
)

AboutCard.propTypes = {
	label: PropTypes.string.isRequired,
	value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
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
})

const GalleryCard = ({ item, onClick }) => (
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
		{item.url ? <img src={item.url} alt={item.title} style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} /> : <div style={{ height: 170, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 14 }}>No image</div>}
		<div style={{ padding: 16 }}>
			<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#111', marginBottom: 4 }}>{item.title || 'Project'}</p>
			{item.description && <p style={{ fontSize: '.8rem', color: '#888', lineHeight: 1.5 }}>{item.description.length > 80 ? `${item.description.slice(0, 80)}…` : item.description}</p>}
		</div>
	</div>
)

GalleryCard.propTypes = {
	item: projectItemPropType.isRequired,
	onClick: PropTypes.func.isRequired,
}

const Modal = ({ item, onClose }) => {
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
						<p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#111' }}>{item.title || 'Project'}</p>
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
					<p style={{ fontSize: '.9rem', color: '#555', lineHeight: 1.7 }}>{item.description || 'No description provided.'}</p>
				</div>
			</div>
		</div>
	)
}

Modal.propTypes = {
	item: projectItemPropType,
	onClose: PropTypes.func.isRequired,
}

/* ─── nav tabs ─────────────────────────────────────────────── */
const TABS = ['About', 'Skills', 'Experience', 'Education', 'Portfolio']

/* ─── main component ───────────────────────────────────────── */
const GuestPortfolioView = ({ student }) => {
	const [activeTab, setActiveTab] = useState('About')
	const [expandedProject, setExpandedProject] = useState(null)

	if (!student) return null

	const age = calcAge(student.date_of_birth)
	const itSkills = parseArray(student.it_skills)
	const languageSkills = parseArray(student.language_skills)
	const otherSkills = parseArray(student.other_skills)
	const workExp = parseArray(student.work_experience)
	const arubaito = parseArray(student.arubaito)
	const gallery = parseArray(student.gallery)
	const deliverables = parseArray(student.deliverables)
	const allProjects = [...gallery, ...deliverables]
	const graduationText = student.graduation_year && student.graduation_season ? `${student.graduation_year}年${student.graduation_season}` : null
	const jlptValue = formatCertificationValue(student.jlpt)
	const ieltsValue = formatCertificationValue(student.ielts)
	const jduCertValue = formatCertificationValue(student.jdu_japanese_certification)

	const name = `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
	const ini = initials(student.first_name, student.last_name)

	/* tab visibility */
	const tabs = TABS.filter(t => {
		if (t === 'Skills') return itSkills.length || languageSkills.length || otherSkills.length || student.jlpt || student.ielts || student.jdu_japanese_certification
		if (t === 'Experience') return workExp.length || arubaito.length
		if (t === 'Education') return student.partner_university
		if (t === 'Portfolio') return allProjects.length
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
						<img src={student.photo} alt={name} style={{ width: 110, height: 110, borderRadius: '50%', border: '3px solid rgba(255,255,255,.25)', objectFit: 'cover', flexShrink: 0 }} />
					) : ini ? (
						<div
							style={{
								width: 110,
								height: 110,
								borderRadius: '50%',
								border: '3px solid rgba(255,255,255,.25)',
								background: 'linear-gradient(135deg,#6c63ff,#a78bfa)',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								fontSize: 36,
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
						{name && <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 6 }}>{name}</h1>}
						{(student.major || student.job_type) && (
							<p style={{ fontSize: '1rem', color: 'rgba(255,255,255,.6)', marginBottom: 14 }}>
								{student.major}
								{student.major && student.job_type ? ' • ' : ''}
								{student.job_type}
							</p>
						)}
						{student.self_introduction && <p style={{ fontSize: '.95rem', lineHeight: 1.7, color: 'rgba(255,255,255,.82)', maxWidth: 520, marginBottom: 20 }}>{student.self_introduction}</p>}

						{/* private fields like student ID are intentionally hidden */}
						<div style={{ display: 'grid', gap: 6, marginBottom: 22 }}>
							{age && <p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>年: {age}</p>}
							{graduationText && <p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>JDU graduation month: {graduationText}</p>}
							{student.partner_university && <p style={{ fontSize: '.98rem', color: 'rgba(255,255,255,.92)' }}>Affiliated university: {student.partner_university}</p>}
						</div>

						{/* CTA buttons */}
						<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
							{student.email && (
								<a href={`mailto:${student.email}`} style={btnPrimary}>
									✉ Contact me
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
							{t}
						</button>
					))}
				</div>
			</div>

			{/* ── MAIN ── */}
			<div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
				{/* ABOUT */}
				{activeTab === 'About' && (
					<div style={section}>
						<SectionLabel>Overview</SectionLabel>
						<div style={{ ...sectionGrid, gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
							{student.major && <AboutCard label='Major' value={student.major} />}
							{student.job_type && <AboutCard label='Career focus' value={student.job_type} />}
							{student.hobbies && <AboutCard label='Interests' value={student.hobbies} />}
							{age && <AboutCard label='Age' value={`${age} years old`} />}
							{student.semester && <AboutCard label='Semester' value={`Semester ${student.semester}`} />}
						</div>
					</div>
				)}

				{/* SKILLS */}
				{activeTab === 'Skills' && (
					<div>
						{itSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>Technical skills</SectionLabel>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
									{itSkills.map((s, i) => (
										<Chip key={i} label={getSkillName(s)} color='blue' />
									))}
								</div>
							</div>
						)}

						{languageSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>Languages</SectionLabel>
								<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
									{languageSkills.map((l, i) => (
										<Chip key={i} label={typeof l === 'string' ? l : (l?.name ?? 'Language')} color='purple' />
									))}
								</div>
							</div>
						)}

						{(student.jlpt || student.ielts || student.jdu_japanese_certification) && (
							<div style={section}>
								<SectionLabel>Certifications</SectionLabel>
								<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
									{student.jlpt && <CertBadge label='JLPT' value={jlptValue} color='amber' />}
									{student.ielts && <CertBadge label='IELTS' value={ieltsValue} color='blue' />}
									{student.jdu_japanese_certification && <CertBadge label='JDU Cert.' value={jduCertValue} color='purple' />}
								</div>
							</div>
						)}

						{otherSkills.length > 0 && (
							<div style={section}>
								<SectionLabel>Other competencies</SectionLabel>
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
				{activeTab === 'Experience' && (
					<div>
						{workExp.length > 0 && (
							<div style={section}>
								<SectionLabel>Professional experience</SectionLabel>
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
											<ExpCard position={exp.position || exp.title || 'Position'} company={exp.company || exp.organization || 'Company'} period={exp.period} description={exp.description} />
										</div>
									))}
								</div>
							</div>
						)}

						{arubaito.length > 0 && (
							<div style={section}>
								<SectionLabel>Part-time work</SectionLabel>
								<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
									{arubaito.map((job, i) => (
										<ExpCard key={i} position={job.role || 'Position'} company={job.company || 'Company'} period={job.period} description={job.description} />
									))}
								</div>
							</div>
						)}
					</div>
				)}

				{/* EDUCATION */}
				{activeTab === 'Education' && student.partner_university && (
					<div style={section}>
						<SectionLabel>Academic background</SectionLabel>
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
											<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 3 }}>Graduation</p>
											<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#333' }}>
												{student.graduation_year}
												{student.graduation_season ? ` (${student.graduation_season})` : ''}
											</p>
										</div>
									)}
									{student.semester && (
										<div>
											<p style={{ fontSize: '.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#aaa', marginBottom: 3 }}>Semester</p>
											<p style={{ fontSize: '.9rem', fontWeight: 600, color: '#333' }}>Semester {student.semester}</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				)}

				{/* PORTFOLIO */}
				{activeTab === 'Portfolio' && allProjects.length > 0 && (
					<div style={section}>
						<SectionLabel>Projects & deliverables</SectionLabel>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
							{allProjects.map((item, i) => (
								<GalleryCard key={i} item={item} onClick={setExpandedProject} />
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
						<p style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8 }}>Let&apos;s work together</p>
						<p style={{ color: 'rgba(255,255,255,.55)', fontSize: '.9rem', marginBottom: 32 }}>Open to internships, part-time, and full-time opportunities</p>
						<div style={{ display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap', marginBottom: 36 }}>
							{student.email && <ContactItem icon='✉' label='Email' value={student.email} />}
							{student.phone && <ContactItem icon='📞' label='Phone' value={student.phone} />}
							{student.address && <ContactItem icon='📍' label='Location' value={student.address} />}
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
								Send a message →
							</a>
						)}
					</div>
				</div>
			)}

			{/* ── PROJECT MODAL ── */}
			<Modal item={expandedProject} onClose={() => setExpandedProject(null)} />
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
		jlpt: PropTypes.string,
		ielts: PropTypes.string,
		jdu_japanese_certification: PropTypes.string,
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
}

export default GuestPortfolioView
