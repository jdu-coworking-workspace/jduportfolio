import CheckIcon from '@mui/icons-material/Check'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { Box, IconButton, Tooltip, Typography } from '@mui/material'
import PropTypes from 'prop-types'
import { useMemo, useState } from 'react'
import generateStudentProfileMarkdown from '../../../utils/generateStudentProfileMarkdown'
import styles from './StudentProfile.module.css'

const copyToClipboard = async text => {
	if (!text) return false

	if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
		try {
			await navigator.clipboard.writeText(text)
			return true
		} catch (_error) {
			// Fallback to legacy copy method
		}
	}

	if (typeof document === 'undefined') {
		return false
	}

	const textArea = document.createElement('textarea')
	textArea.value = text
	textArea.setAttribute('readonly', '')
	textArea.style.position = 'absolute'
	textArea.style.left = '-9999px'
	document.body.appendChild(textArea)
	const selection = document.getSelection()
	const selectedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

	textArea.select()
	let copied = false
	try {
		copied = document.execCommand('copy')
	} catch (_error) {
		copied = false
	} finally {
		document.body.removeChild(textArea)
		if (selectedRange && selection) {
			selection.removeAllRanges()
			selection.addRange(selectedRange)
		}
	}

	return copied
}

const ProfileMarkdownBlock = ({ student }) => {
	const markdown = useMemo(() => generateStudentProfileMarkdown(student), [student])
	const [copied, setCopied] = useState(false)

	if (!markdown) {
		return null
	}

	const handleCopy = async () => {
		const success = await copyToClipboard(markdown)
		if (success) {
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	return (
		<Box className={styles.markdownContainer}>
			<Box className={styles.markdownHeader}>
				<Typography component='span' className={styles.markdownTitle}>
					Markdown profile snapshot
				</Typography>
				<Tooltip title={copied ? 'Copied!' : 'Copy Markdown'} placement='left'>
					<IconButton aria-label='Copy profile as Markdown' onClick={handleCopy} size='small'>
						{copied ? <CheckIcon fontSize='small' /> : <ContentCopyIcon fontSize='small' />}
					</IconButton>
				</Tooltip>
			</Box>
			<pre className={styles.markdownBody}>
				<code>{markdown}</code>
			</pre>
		</Box>
	)
}

ProfileMarkdownBlock.propTypes = {
	student: PropTypes.shape({}),
}

export default ProfileMarkdownBlock
