const normalizeArray = value => {
	if (Array.isArray(value)) {
		return value.map(item => (typeof item === 'string' ? item.trim() : item)).filter(Boolean)
	}

	if (typeof value === 'string') {
		return value
			.split(/[\n,\u3001]+/)
			.map(item => item.trim())
			.filter(Boolean)
	}

	return []
}

const parseJSONSafe = value => {
	if (typeof value !== 'string') {
		return Array.isArray(value) ? value : []
	}

	try {
		const parsed = JSON.parse(value)
		return Array.isArray(parsed) ? parsed : []
	} catch (_error) {
		return []
	}
}

const formatMultilineText = value => {
	if (!value || typeof value !== 'string') return ''
	return value.replace(/\r\n/g, '\n').trim()
}

const formatSkillGroups = value => {
	const groups =
		typeof value === 'string'
			? (() => {
					try {
						const parsed = JSON.parse(value)
						return parsed && typeof parsed === 'object' ? parsed : {}
					} catch (_error) {
						return {}
					}
				})()
			: value

	if (!groups || typeof groups !== 'object') return []

	return Object.entries(groups)
		.map(([level, items]) => {
			const normalized = normalizeArray(items?.map ? items.map(item => item?.name || item) : items)
			if (normalized.length === 0) return null
			return `**${level}**: ${normalized.join(', ')}`
		})
		.filter(Boolean)
}

const calculateAge = birthDateString => {
	if (!birthDateString) return null
	const today = new Date()
	const birthDate = new Date(birthDateString)
	if (Number.isNaN(birthDate.getTime())) return null

	let age = today.getFullYear() - birthDate.getFullYear()
	const monthDifference = today.getMonth() - birthDate.getMonth()
	if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
		age--
	}

	return age
}

const addSection = (lines, title, content) => {
	if (!content) return
	const normalized = Array.isArray(content) ? content.filter(Boolean) : [content].filter(Boolean)
	if (normalized.length === 0) return
	lines.push('', `## ${title}`, '')
	normalized.forEach(entry => lines.push(entry))
}

const addKeyValueList = (lines, title, entries) => {
	const normalized = entries.filter(([, value]) => {
		if (Array.isArray(value)) return value.length > 0
		return Boolean(value)
	})

	if (normalized.length === 0) return

	lines.push('', `## ${title}`, '')
	normalized.forEach(([label, value]) => {
		if (Array.isArray(value)) {
			lines.push(`- **${label}:** ${value.join(', ')}`)
		} else {
			lines.push(`- **${label}:** ${value}`)
		}
	})
}

const addDeliverables = (lines, deliverables) => {
	if (!Array.isArray(deliverables) || deliverables.length === 0) return

	lines.push('', '## Projects & Deliverables', '')
	deliverables.forEach((deliverable, index) => {
		const title = deliverable?.title || `Deliverable ${index + 1}`
		lines.push(`### ${title}`)

		const description = formatMultilineText(deliverable?.description)
		if (description) {
			lines.push(description)
		}

		const detailLines = []
		const roles = normalizeArray(deliverable?.role)
		if (roles.length > 0) {
			detailLines.push(`**Role:** ${roles.join(', ')}`)
		} else if (typeof deliverable?.role === 'string' && deliverable.role.trim()) {
			detailLines.push(`**Role:** ${deliverable.role.trim()}`)
		}

		if (deliverable?.link) {
			detailLines.push(`[Live Demo](${deliverable.link})`)
		}

		if (deliverable?.codeLink) {
			detailLines.push(`[Source Code](${deliverable.codeLink})`)
		}

		if (detailLines.length > 0) {
			detailLines.forEach(line => {
				lines.push(`- ${line}`)
			})
		}

		lines.push('')
	})
}

const addQASection = (lines, qa) => {
	if (!Array.isArray(qa) || qa.length === 0) return

	const normalized = qa
		.map(entry => {
			if (!entry || typeof entry !== 'object') return null
			const question = entry.question || entry.question_text || entry.title
			const answer = formatMultilineText(entry.answer || entry.response)
			if (!question || !answer) return null
			return { question, answer }
		})
		.filter(Boolean)

	if (normalized.length === 0) return

	lines.push('', '## Q&A Highlights', '')
	normalized.forEach(item => {
		lines.push(`**Q:** ${item.question}`)
		lines.push(`**A:** ${item.answer}`)
		lines.push('')
	})
}

const generateStudentProfileMarkdown = student => {
	if (!student || typeof student !== 'object') return ''

	const lines = []
	const draft = student.draft || {}
	const fullName = [student.first_name, student.last_name].filter(Boolean).join(' ').trim()
	if (fullName) {
		lines.push(`# ${fullName}`)
	} else {
		lines.push('# Student Profile')
	}

	const phonetic = [student.last_name_furigana, student.first_name_furigana]
		.map(part => (typeof part === 'string' ? part.trim() : ''))
		.filter(Boolean)
		.join(' ')
	if (phonetic) {
		lines.push(`_(${phonetic})_`)
	}

	const quickFacts = []
	if (student.student_id) quickFacts.push(['Student ID', student.student_id])
	const age = calculateAge(student.date_of_birth)
	if (typeof age === 'number') quickFacts.push(['Age', `${age}`])
	if (student.expected_graduation_year) quickFacts.push(['Expected Graduation', student.expected_graduation_year])
	if (student.partner_university) {
		const parts = [student.partner_university, student.faculty, student.department].filter(Boolean)
		quickFacts.push(['Partner University', parts.join(' ') || student.partner_university])
	}
	if (student.major) quickFacts.push(['Major', student.major])
	if (student.job_type) quickFacts.push(['Desired Role', student.job_type])
	if (student.email) quickFacts.push(['Email', student.email])

	addKeyValueList(lines, 'Quick Facts', quickFacts)

	addSection(lines, 'Self Introduction', formatMultilineText(draft.self_introduction || student.self_introduction))

	const hobbiesDescription = formatMultilineText(draft.hobbies_description)
	const hobbiesList = normalizeArray(draft.hobbies)
	if (hobbiesDescription || hobbiesList.length) {
		addSection(lines, 'Hobbies & Interests', hobbiesDescription)
		if (hobbiesList.length) {
			lines.push('', '### Favorite Activities', '')
			hobbiesList.forEach(item => lines.push(`- ${item}`))
		}
	}

	const specialDescription = formatMultilineText(draft.special_skills_description)
	const specialList = normalizeArray(draft.other_information)
	if (specialDescription || specialList.length) {
		addSection(lines, 'Special Skills', specialDescription)
		if (specialList.length) {
			lines.push('', '### Skill Highlights', '')
			specialList.forEach(item => lines.push(`- ${item}`))
		}
	}

	addKeyValueList(lines, 'Career Preferences', [
		['Current Location', draft.address || student.address],
		['Preferred Industries', normalizeArray(draft.preferred_industry || draft.preferred_industries)],
		['Preferred Locations', normalizeArray(draft.preferred_location || draft.preferred_locations)],
		['Preferred Job Types', normalizeArray(draft.preferred_jobtype || draft.preferred_jobtypes || draft.job_type)],
		['Internships', formatMultilineText(draft.internship)],
	])

	const techSkills = formatSkillGroups(draft.it_skills)
	const languageSkills = parseJSONSafe(draft.language_skills)
		.map(skill => {
			if (!skill || typeof skill !== 'object') return null
			if (skill.level) {
				return `${skill.name}: ${skill.level}`
			}
			return skill.name || null
		})
		.filter(Boolean)

	if (techSkills.length || languageSkills.length) {
		lines.push('', '## Skills', '')
		if (techSkills.length) {
			lines.push('### Technical Skills', '')
			techSkills.forEach(item => lines.push(`- ${item}`))
			lines.push('')
		}
		if (languageSkills.length) {
			lines.push('### Languages', '')
			languageSkills.forEach(item => lines.push(`- ${item}`))
			lines.push('')
		}
	}

	addDeliverables(lines, draft.deliverables)
	addQASection(lines, draft.qa)

	return lines
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

export default generateStudentProfileMarkdown
