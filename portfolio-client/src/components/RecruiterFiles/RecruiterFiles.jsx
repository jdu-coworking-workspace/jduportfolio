import AttachFileIcon from '@mui/icons-material/AttachFile'
import { Box, Paper, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import axios from '../../utils/axiosUtils'
import RecruiterFileList from './RecruiterFileList'
import RecruiterFileUpload from './RecruiterFileUpload'

const RecruiterFiles = ({ editMode = false, companyId, currentRole }) => {
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	const [files, setFiles] = useState([])
	const [totalSize, setTotalSize] = useState(0)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		fetchFiles()
	}, [companyId])

	const fetchFiles = async () => {
		try {
			setLoading(true)
			// For non-recruiters, send companyId as query param
			const url = `/api/company/details?companyId=${companyId}`
			const response = await axios.get(url)
			setFiles(response.data.files) // Handle both old and new response format
			setTotalSize(response.data.totalSize || 0)
			console.log('files:', files)
			console.log('response.data:', response.data)
			console.log('response.files:', response.files)
		} catch (error) {
			console.error('Error fetching files:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleUploadSuccess = uploadedFiles => {
		// Refresh the files list to get updated total size
		fetchFiles()
	}

	const handleFileDeleted = fileId => {
		// Refresh the files list to get updated total size
		fetchFiles()
	}

	// Don't render if no files exist and not in edit mode for Recruiters
	if (!loading && files.length === 0 && !(editMode && currentRole === 'Recruiter')) {
		return null
	}

	return (
		<Paper elevation={1} sx={{ p: 3, mb: 3 }}>
			<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
				<AttachFileIcon sx={{ mr: 1, color: 'primary.main' }} />
				<Typography variant='h6' component='h2' sx={{ fontWeight: 600 }}>
					{t('company_documents')}
				</Typography>
			</Box>

			{/* Only Recruiters can upload files */}
			{currentRole === 'Recruiter' && <RecruiterFileUpload onUploadSuccess={handleUploadSuccess} existingFilesCount={files.length} existingFilesSize={totalSize} editMode={editMode} />}

			<RecruiterFileList files={files} onFileDeleted={handleFileDeleted} loading={loading} editMode={editMode && currentRole === 'Recruiter'} currentRole={currentRole} />
		</Paper>
	)
}

export default RecruiterFiles
