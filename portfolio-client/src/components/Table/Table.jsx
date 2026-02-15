import PropTypes from 'prop-types'
import { useCallback, useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from '../../utils/axiosUtils'

import CancelIcon from '@mui/icons-material/Cancel'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import PendingIcon from '@mui/icons-material/Pending'
import { Box, Button, Grid, IconButton, LinearProgress, Menu, MenuItem, Modal, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { atom, useAtom } from 'jotai'
import AwardIcon from '../../assets/icons/award-line.svg'
import DeleteIcon from '../../assets/icons/delete-bin-3-line.svg'
import GraduationCapIcon from '../../assets/icons/graduation-cap-line.svg'
import SchoolIcon from '../../assets/icons/school-line.svg'
import { useLanguage } from '../../contexts/LanguageContext'
import translations from '../../locales/translations'
import ChangedFieldsModal from '../ChangedFieldsModal/ChangedFieldsModal'
import UserAvatar from './Avatar/UserAvatar'
import { getComparator, stableSort } from './TableUtils'
import { tableScrollPositionAtom } from '../../atoms/store'
// localStorage dan qiymat o'qish yoki default qiymat
const getInitialRowsPerPage = () => {
	try {
		const saved = localStorage.getItem('tableRowsPerPage')
		return saved ? parseInt(saved, 10) : 50
	} catch (error) {
		return 50
	}
}

// Create an atom to store rows per page preference
const rowsPerPageAtom = atom(getInitialRowsPerPage())

const EnhancedTable = ({ tableProps, updatedBookmark, viewMode = 'table' }) => {
	const studentTableRef = useRef(null)
	const { language } = useLanguage()
	const t = key => translations[language][key] || key

	const role = sessionStorage.getItem('role')

	const [searchParams, setSearchParams] = useSearchParams()

	// Initialize state from URL params or defaults
	const [order, setOrder] = useState(searchParams.get('order') || 'asc')
	const [orderBy, setOrderBy] = useState(searchParams.get('orderBy') || '')
	const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || '')
	const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || '')

	// Initialize from URL params on mount if they exist
	useEffect(() => {
		const urlSortBy = searchParams.get('sortBy')
		const urlSortOrder = searchParams.get('sortOrder')
		const urlOrderBy = searchParams.get('orderBy')
		const urlOrder = searchParams.get('order')

		if (urlSortBy && urlSortBy !== sortBy) {
			setSortBy(urlSortBy)
		}
		if (urlSortOrder && urlSortOrder !== sortOrder) {
			setSortOrder(urlSortOrder)
		}
		if (urlOrderBy && urlOrderBy !== orderBy) {
			setOrderBy(urlOrderBy)
		}
		if (urlOrder && urlOrder !== order) {
			setOrder(urlOrder)
		}
	}, []) // Only run on mount
	const [selected, _setSelected] = useState([])
	const [page, setPage] = useState(parseInt(searchParams.get('page') || '0', 10))
	const [rowsPerPage, setRowsPerPage] = useAtom(rowsPerPageAtom)
	const [tableScrollPosition, setTableScrollPosition] = useAtom(tableScrollPositionAtom)
	const [rows, setRows] = useState([])
	const [totalCount, setTotalCount] = useState(0) // Server-side pagination uchun
	const [loading, setLoading] = useState(true)
	const [_refresher, setRefresher] = useState(0)
	const [anchorEls, setAnchorEls] = useState({})
	const [deleteModal, setDeleteModal] = useState({
		open: false,
		itemId: null,
		deleteAction: null,
	})
	const [selectedChangedFields, setSelectedChangedFields] = useState(null)
	const [headerFilterAnchor, setHeaderFilterAnchor] = useState({ field: null, element: null })

	// localStorage ga saqlash
	useEffect(() => {
		try {
			localStorage.setItem('tableRowsPerPage', rowsPerPage.toString())
		} catch (error) {
			// Silently fail if localStorage is not available
		}
	}, [rowsPerPage])

	// Sync sortBy/sortOrder (backend) with order/orderBy (frontend) - keep them in sync
	useEffect(() => {
		if (sortBy) {
			// Map backend sort field names to frontend column IDs
			const reverseMap = {
				name: 'first_name',
				student_id: 'student_id',
				age: 'age',
				graduation_year: 'graduation_year',
				email: 'email',
			}
			const mappedOrderBy = reverseMap[sortBy]
			if (mappedOrderBy && mappedOrderBy !== orderBy) {
				setOrderBy(mappedOrderBy)
			}
			const mappedOrder = sortOrder?.toLowerCase() || 'asc'
			if (mappedOrder !== order) {
				setOrder(mappedOrder)
			}
		}
	}, [sortBy, sortOrder])

	// Sync state to URL params
	useEffect(() => {
		const params = {}
		if (page > 0) params.page = page.toString()
		if (sortBy) params.sortBy = sortBy
		if (sortOrder) params.sortOrder = sortOrder
		if (orderBy) params.orderBy = orderBy
		if (order && order !== 'asc') params.order = order

		setSearchParams(params, { replace: true })
	}, [page, sortBy, sortOrder, orderBy, order, setSearchParams])

	// Handler for header filter dropdown
	const handleHeaderFilterClick = (event, headerId, anchorElement = null) => {
		event.stopPropagation()
		// Use provided anchor element or fall back to currentTarget
		const anchor = anchorElement || event.currentTarget
		setHeaderFilterAnchor({ field: headerId, element: anchor })
	}

	const handleHeaderFilterClose = () => {
		setHeaderFilterAnchor({ field: null, element: null })
	}

	const handleHeaderFilterChange = (headerId, value) => {
		if (!tableProps.onFilterChange) return

		const currentFilter = { ...tableProps.filter }

		if (value === 'all' || value === '') {
			// Remove filter for this field
			if (Array.isArray(currentFilter[headerId])) {
				delete currentFilter[headerId]
			} else {
				delete currentFilter[headerId]
			}
		} else {
			// Set filter - for jlpt, partner_university, graduation_year, use array format
			if (headerId === 'jlpt' || headerId === 'partner_university' || headerId === 'graduation_year') {
				currentFilter[headerId] = [value]
			} else {
				currentFilter[headerId] = value
			}
		}

		tableProps.onFilterChange(currentFilter)
		handleHeaderFilterClose()
	}

	// Sort handler function
	const handleSort = header => {
		// Check if the header is sortable
		if (!header.isSort) {
			return
		}

		// Define mapping from header id to API sort field names
		const sortMapping = {
			first_name: 'name',
			student_id: 'student_id',
			age: 'age',
			email: 'email',
			graduation_year: 'graduation_year',
		}

		const apiSortField = sortMapping[header.id]
		if (!apiSortField) {
			return
		}

		let newOrder = 'ASC'

		// If clicking on the same column, toggle the order
		if (sortBy === apiSortField) {
			newOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC'
		}

		setSortBy(apiSortField)
		setSortOrder(newOrder)
		setOrderBy(header.id)
		setOrder(newOrder.toLowerCase())
		setPage(0) // Reset to first page when sorting
	}

	const handleClick = (event, rowId) => {
		setAnchorEls(prev => ({
			...prev,
			[rowId]: event.currentTarget,
		}))
	}
	const handleClose = async (id, action) => {
		let res = false
		res = await action(id)

		if (res == undefined) {
			setRefresher(prev => prev + 1)
		}

		setAnchorEls(prev => ({
			...prev,
			[id]: null,
		}))
	}

	const getUniqueKey = header => {
		return header.keyIdentifier || `${header.id}${header.subkey || ''}`
	}

	const fetchUserData = useCallback(
		signal => {
			setLoading(true)

			const params = {
				filter: tableProps.filter, // Let axios handle serialization
				recruiterId: tableProps.recruiterId,
				onlyBookmarked: tableProps.OnlyBookmarked,
				// Server-side pagination parametrlari
				page: page + 1, // MUI 0-indexed, backend 1-indexed
				limit: rowsPerPage,
			}

			// Add sorting parameters if they exist
			if (sortBy && sortOrder) {
				params.sortBy = sortBy
				params.sortOrder = sortOrder
			}

			// ✅ CRITICAL FIX: Use abort signal to cancel outdated requests
			// Stringify filter to ensure proper serialization for backend
			const serializedParams = {
				...params,
				filter: typeof params.filter === 'object' ? JSON.stringify(params.filter) : params.filter,
			}
			axios
				.get(tableProps.dataLink, {
					params: serializedParams,
					signal, // ✅ Pass abort signal
				})
				.then(response => {
					// Server-side pagination: yangi format { data: [], pagination: {} }
					// Backward compatible: eski format [] ham qo'llab-quvvatlanadi
					const students = Array.isArray(response.data) ? response.data : response.data.data
					const total = Array.isArray(response.data) ? response.data.length : response.data.pagination?.total || 0

					// Preserve isCurrent for back-navigation scroll restoration (don't wipe it on refetch)
					const prevIds = (() => {
						try {
							return JSON.parse(localStorage.getItem('visibleRowsStudentIds') || '[]')
						} catch {
							return []
						}
					})()
					const previousCurrentStudentId = prevIds.find(s => s.isCurrent)?.student_id

					const filteredRows = students.map(r => ({
						student_id: r.student_id,
						id: r.id,
						isCurrent: previousCurrentStudentId != null && r.student_id === previousCurrentStudentId,
					}))
					localStorage.setItem('visibleRowsStudentIds', JSON.stringify(filteredRows))
					setRows(students)
					setTotalCount(total)
					setLoading(false)
				})
				.catch(error => {
					// Ignore aborted requests (expected behavior)
					// CRITICAL: Do NOT set loading=false for aborted requests,
					// because a new request is always in flight after an abort.
					// Setting loading=false here would cause a brief "no data found" flash.
					if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
						console.error('Error fetching students:', error)
						setLoading(false)
					}
				})
		},
		[tableProps.dataLink, tableProps.filter, tableProps.recruiterId, tableProps.OnlyBookmarked, sortBy, sortOrder, page, rowsPerPage]
	)

	useEffect(() => {
		// ✅ Create AbortController for this effect
		const controller = new AbortController()

		// ✅ Call fetchUserData with abort signal
		fetchUserData(controller.signal)

		// ✅ Cleanup: abort request when component unmounts or dependencies change
		return () => {
			controller.abort()
		}
	}, [
		fetchUserData,
		tableProps.filter, // ✅ CRITICAL: Include filter in dependencies to trigger refetch when filter changes
		tableProps.refreshTrigger,
		page, // Server-side pagination uchun
		rowsPerPage, // Server-side pagination uchun
	])

	useEffect(() => {
		if (updatedBookmark?.studentId) {
			setRows(prevData => prevData.map(data => (data.id === updatedBookmark.studentId ? { ...data, isBookmarked: !data.isBookmarked } : data)))
		}
	}, [updatedBookmark])

	// Filter o'zgarganda page'ni 0 ga reset qilish
	// Bu mavjud bo'lmagan page so'rashdan saqlaydi
	const prevFilterRef = useRef(tableProps.filter)
	useEffect(() => {
		// Filter o'zgarganini tekshirish
		if (JSON.stringify(prevFilterRef.current) !== JSON.stringify(tableProps.filter)) {
			setPage(0)
			setLoading(true) // Immediately show loading to prevent "no data found" flash
			prevFilterRef.current = tableProps.filter
		}
	}, [tableProps.filter])

	const handleChangePage = (event, newPage) => {
		setPage(newPage)
	}

	const handleChangeRowsPerPage = event => {
		const newRowsPerPage = parseInt(event.target.value, 10)
		setRowsPerPage(newRowsPerPage)
		setPage(0) // Reset to first page
	}

	const isSelected = id => selected.indexOf(id) !== -1

	// Server-side pagination: backend allaqachon pagination qilgan, frontend sorting kerak emas
	// Backend already sorts data based on sortBy/sortOrder, no need to sort again on frontend
	const visibleRows = rows

	// Scroll to specific student row instead of just position
	useEffect(() => {
		if (visibleRows.length <= 0 || viewMode !== 'table') return

		// Capture current container reference once for this effect run
		const container = studentTableRef.current
		if (!container) return

		// Try to scroll to the current student if marked in localStorage
		const currentStudentIds = JSON.parse(localStorage.getItem('visibleRowsStudentIds') || '[]')
		const currentStudent = currentStudentIds.find(s => s.isCurrent)

		if (currentStudent) {
			// Small delay to ensure DOM is fully rendered
			setTimeout(() => {
				const rowElement = document.querySelector(`[data-student-id="${currentStudent.student_id}"]`)
				if (rowElement) {
					rowElement.scrollIntoView({ behavior: 'auto', block: 'center' })
				} else if (tableScrollPosition != null) {
					// Fallback to scroll position if student row not found
					container.scrollTop = parseFloat(tableScrollPosition)
				}
			}, 100)
		} else if (tableScrollPosition != null) {
			// No current student marked, use saved scroll position
			container.scrollTop = parseFloat(tableScrollPosition)
		}

		return () => {
			if (container) {
				setTableScrollPosition(container.scrollTop)
			}
		}
		// Intentionally omit tableScrollPosition from deps:
		// we only want to restore once on mount / data load, not on every scroll
	}, [visibleRows.length, viewMode, setTableScrollPosition])

	// Grid view da bookmark click handler
	const handleBookmarkClickInGrid = row => {
		const bookmarkHeader = tableProps.headers.find(h => h.type === 'bookmark')
		if (bookmarkHeader && bookmarkHeader.onClickAction) {
			bookmarkHeader.onClickAction(row)
		}
	}

	// Grid view da profile click handler
	const handleProfileClickInGrid = row => {
		// Mark current student in localStorage
		const studentIds = localStorage.getItem('visibleRowsStudentIds')
		if (studentIds) {
			const parsedIds = JSON.parse(studentIds)
			localStorage.setItem(
				'visibleRowsStudentIds',
				JSON.stringify(
					parsedIds.map(item => ({
						...item,
						isCurrent: item.student_id === row.student_id,
					}))
				)
			)
		}

		const avatarHeader = tableProps.headers.find(h => h.type === 'avatar')
		if (avatarHeader && avatarHeader.onClickAction) {
			// Pass current pagination and sorting state to navigation handler
			avatarHeader.onClickAction(row, page, sortBy, sortOrder)
		}
	}

	// Grid view uchun card component
	const renderGridView = () => (
		<Grid container spacing={2.5}>
			{visibleRows.map(row => (
				<Grid item xs={12} sm={6} md={4} key={row.id}>
					<Box
						sx={{
							width: '100%',
							minHeight: '160px',
							borderRadius: '12px',
							border: '1px solid #f0f0f0',
							backgroundColor: '#fff',
							position: 'relative',
							cursor: 'pointer',
							transition: 'all 0.2s ease',
							p: 2,
							'&:hover': {
								boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
								transform: 'translateY(-2px)',
							},
						}}
					>
						{/* Top row: Avatar, Bookmark */}
						<Box
							sx={{
								display: 'flex',
								alignItems: 'flex-start',
								mb: 2,
								padding: viewMode === 'grid' ? '0px' : '10px 16px',
							}}
						>
							{/* Avatar va Age */}
							<Box sx={{ mr: 1.5, cursor: 'pointer', flex: 1 }} onClick={() => handleProfileClickInGrid(row)}>
								<UserAvatar
									photo={row.photo}
									name={row.first_name + ' ' + row.last_name}
									studentId={row.first_name_furigana || row.last_name_furigana ? `${row.last_name_furigana || ''} ${row.first_name_furigana || ''}`.trim() : row.kana_name || null}
									age={row.age}
									isGridMode={viewMode === 'grid'}
									style={{
										width: '56px',
										height: '56px',
									}}
								/>
							</Box>

							{/* Bookmark */}
							{role === 'Recruiter' && (
								<Box sx={{ cursor: 'pointer', p: 0.5 }} onClick={() => handleBookmarkClickInGrid(row)}>
									{row.isBookmarked ? (
										<svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
											<path d='M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z' fill='#FFD700' stroke='#FFD700' />
										</svg>
									) : (
										<svg width='24' height='24' viewBox='0 0 24 24' fill='none'>
											<path d='M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z' stroke='#ccc' strokeWidth='1.5' />
										</svg>
									)}
								</Box>
							)}
						</Box>

						{/* Bottom section: 3 rows of icon + value */}
						<Box
							sx={{
								mt: 1,
								display: 'flex',
								flexDirection: 'row',
								justifyContent: 'space-between',
								borderTop: '1px solid #f0f0f0',
								paddingTop: '8px',
							}}
						>
							{/* JLPT row */}
							<Box
								sx={{
									display: 'flex',
									mb: 1,
								}}
							>
								<img
									src={AwardIcon}
									alt='JLPT'
									style={{
										width: '20px',
										height: '20px',
										marginRight: '12px',
									}}
								/>
								<Typography
									variant='body2'
									sx={{
										fontSize: '15px',
										fontWeight: 500,
										color: '#333',
									}}
								>
									{(() => {
										if (row.jlpt) {
											try {
												const jlptData = JSON.parse(row.jlpt)
												return jlptData?.highest || '未提出'
											} catch {
												return row.jlpt
											}
										}
										return '未提出'
									})()}
								</Typography>
							</Box>

							{/* University row */}
							<Box sx={{ display: 'flex', mb: 1 }}>
								<img
									src={SchoolIcon}
									alt='University'
									style={{
										width: '20px',
										height: '20px',
										marginRight: '12px',
									}}
								/>
								<Typography
									variant='body2'
									sx={{
										fontSize: '15px',
										fontWeight: 500,
										color: '#333',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
										whiteSpace: 'nowrap',
										flex: 1,
									}}
								>
									{row.partner_university === '40単位モデル' ? 'なし' : row.partner_university || 'N/A'}
								</Typography>
							</Box>

							{/* Graduation row */}
							<Box sx={{ display: 'flex' }}>
								<img
									src={GraduationCapIcon}
									alt='Graduation'
									style={{
										width: '20px',
										height: '20px',
										marginRight: '12px',
									}}
								/>
								<Typography
									variant='body2'
									sx={{
										fontSize: '15px',
										fontWeight: 500,
										color: '#333',
									}}
								>
									{(() => {
										// Format graduation_year from date format to Japanese format
										// Input: "2026-03-30" -> Output: "2026年03月"
										if (row.graduation_year) {
											const match = String(row.graduation_year).match(/^(\d{4})-(\d{2})/)
											if (match) {
												const [, year, month] = match
												return `${year}年${month}月`
											}
											return row.graduation_year
										}
										return 'N/A'
									})()}
								</Typography>
							</Box>
						</Box>
					</Box>
				</Grid>
			))}
		</Grid>
	)

	// Clamp page to valid range so we never pass out-of-range page to MUI (e.g. when returning from profile with saved page)
	const count = totalCount || rows.length
	const maxPage = Math.max(0, Math.ceil(count / rowsPerPage) - 1)
	const clampedPage = Math.min(Math.max(0, page), maxPage)
	// Sync clamped page when totalCount is known and current page is out of range
	useEffect(() => {
		if (page !== clampedPage && (totalCount > 0 || rows.length > 0)) {
			setPage(clampedPage)
		}
	}, [clampedPage, page, totalCount, rows.length])

	// Reusable pagination component edited for both views
	const PaginationControls = () => (
		<TablePagination
			rowsPerPageOptions={[5, 10, 25, 50, 100]}
			component='div'
			count={count}
			rowsPerPage={rowsPerPage}
			page={clampedPage}
			onPageChange={handleChangePage}
			onRowsPerPageChange={handleChangeRowsPerPage}
			labelRowsPerPage={t('rows_per_page')}
			sx={{
				backgroundColor: viewMode === 'grid' ? 'transparent' : '#fff',
				'& .MuiToolbar-root': {
					display: 'flex',
					alignItems: 'center',
					padding: { xs: 0, sm: 0, md: '8px 16px' }, // kichiklarda 0, kattalarda odatiy
					gap: { xs: 0, sm: 0, md: '16px' },
				},
				// Chap taraf container
				'& .MuiTablePagination-selectLabel, & .MuiTablePagination-select': {
					flex: '0 1 auto', // Fixed size, chap tarafda
				},
				// O'rtada bo'sh joy
				'& .MuiTablePagination-spacer': {
					flex: '0 0 auto', // Barcha bo'sh joyni egallash
				},
				// O'ng taraf container
				'& .MuiTablePagination-displayedRows': {
					flex: '10 0 auto', // Fixed size, o'ng tarafda
					order: 999,
					textAlign: 'right',
				},
				'& .MuiTablePagination-actions': {
					flex: '0 0 auto', // Fixed size, o'ng tarafda
					order: 1000,
					marginLeft: { xs: 0, sm: 0, md: '8px' },
				},
				//ong tomondigi strelkala
				'& .MuiButtonBase-root': {
					paddingInline: { xs: 0, sm: 0, md: '8px' },
				},
				whiteSpace: 'nowrap',
			}}
		/>
	)

	// Filtered headers for easier processing
	const visibleHeaders = tableProps.headers.filter(header => (header.role == undefined || header.role == role) && (header.visibleTo ? header.visibleTo.includes(role) : true))

	return (
		<Box sx={{ width: '100%' }}>
			{loading ? (
				<Box sx={{ padding: 2 }}>
					<LinearProgress />
				</Box>
			) : viewMode === 'grid' ? (
				renderGridView()
			) : (
				<Box
					sx={{
						border: '1px solid #e0e0e0',
						borderRadius: '12px',
						overflow: 'hidden',
						backgroundColor: '#ffffff',
						boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
					}}
				>
					<TableContainer
						ref={studentTableRef}
						onScroll={event => {
							setTableScrollPosition(event.target.scrollTop)
						}}
						sx={{
							minHeight: visibleRows.length > 0 ? 'auto' : '300px',
							maxHeight: {
								xs: 'auto', // Mobile
								sm: 'calc(100vh - 300px)', // Tablet
								md: 'calc(100vh - 280px)', // Desktop
							},
							overflowY: 'auto',
							overflowX: 'auto',
							// Custom scrollbar styling
							'&::-webkit-scrollbar': {
								width: '8px',
								height: '8px',
							},
							'&::-webkit-scrollbar-track': {
								background: '#f1f1f1',
								borderRadius: '4px',
							},
							'&::-webkit-scrollbar-thumb': {
								background: '#c1c1c1',
								borderRadius: '4px',
								'&:hover': {
									background: '#a8a8a8',
								},
							},
						}}
					>
						<Table
							sx={{
								backgroundColor: '#ffffff',
							}}
							size='medium'
							stickyHeader
						>
							<TableHead>
								<TableRow>
									{visibleHeaders.map((header, index) => {
										const isSortable = header.isSort === true
										const isActiveSortColumn = orderBy === header.id
										const isFilterable = ['jlpt', 'partner_university', 'graduation_year'].includes(header.id)
										const isFilterOpen = headerFilterAnchor.field === header.id
										const currentFilterValue = tableProps.filter?.[header.id]
										const filterOptions = tableProps.filterOptions?.[header.id] || []
										const formatFunction = tableProps.filterOptions?.[`${header.id}_format`]

										// Get current selected value for display
										let selectedValue = 'all'
										if (currentFilterValue) {
											if (Array.isArray(currentFilterValue) && currentFilterValue.length > 0) {
												selectedValue = currentFilterValue[0]
											} else if (typeof currentFilterValue === 'string') {
												selectedValue = currentFilterValue
											}
										}

										return (
											<TableCell
												ref={el => {
													// Store reference for menu anchoring
													if (isFilterable && el) {
														el._headerId = header.id
													}
												}}
												sx={{
													backgroundColor: '#f7fafc',
													borderBottom: '1px solid #e0e0e0',
													borderRight: 'none',
													position: 'sticky',
													top: 0,
													zIndex: 10,
													cursor: isSortable || isFilterable ? 'pointer' : 'default',
													userSelect: 'none',
													'&:hover':
														isSortable || isFilterable
															? {
																	backgroundColor: '#edf2f7',
																}
															: {},
													...(index === 0 && {
														borderTopLeftRadius: '10px',
													}),
													...(index === visibleHeaders.length - 1 && {
														borderTopRightRadius: '10px',
													}),
												}}
												key={`data${getUniqueKey(header)}_${header.id}`}
												align='center'
												padding={'normal'}
												sortDirection={orderBy === header.id ? order : false}
												onClick={e => {
													if (isFilterable) {
														// Ensure we use the TableCell as anchor, not child elements
														const cellElement = e.currentTarget
														handleHeaderFilterClick(e, header.id, cellElement)
													} else if (isSortable) {
														handleSort(header)
													}
												}}
											>
												<Box
													sx={{
														display: 'flex',
														alignItems: 'center',
														justifyContent: { sm: 'start', md: 'center' },
														gap: '4px',
													}}
												>
													{header.label}
													{isSortable && !isFilterable && (
														<Box
															sx={{
																display: 'flex',
																flexDirection: 'column',
																alignItems: 'center',
																opacity: isActiveSortColumn ? 1 : 0.3,
															}}
														>
															{isActiveSortColumn && order === 'asc' ? <KeyboardArrowUpIcon sx={{ fontSize: '16px', color: '#2563eb' }} /> : isActiveSortColumn && order === 'desc' ? <KeyboardArrowDownIcon sx={{ fontSize: '16px', color: '#2563eb' }} /> : <KeyboardArrowUpIcon sx={{ fontSize: '16px' }} />}
														</Box>
													)}
													{isFilterable && <KeyboardArrowDownIcon sx={{ fontSize: '16px', opacity: 0.5 }} />}
												</Box>
											</TableCell>
										)
									})}
								</TableRow>
							</TableHead>
							<TableBody>
								{visibleRows.length > 0 ? (
									visibleRows.map((row, rowIndex) => (
										<TableRow
											hover
											role='checkbox'
											aria-checked={isSelected(row.id)}
											tabIndex={-1}
											key={row.id}
											selected={isSelected(row.id)}
											data-student-id={row.student_id}
											sx={{
												cursor: 'pointer',
												backgroundColor: '#ffffff',
												'&:hover': {
													backgroundColor: '#f9fafb !important',
												},
											}}
										>
											{visibleHeaders.map((header, cellIndex) => (
												<TableCell
													key={`data${getUniqueKey(header)}_${header.id}`}
													align={header.type === 'avatar' ? 'left' : 'center'}
													padding={header.disablePadding ? 'none' : 'normal'}
													onClick={() => {
														// Don't trigger profile navigation for delete icon
														if (header.type === 'delete_icon') {
															return
														}
														const studentIds = localStorage.getItem('visibleRowsStudentIds')
														if (studentIds) {
															const parsedIds = JSON.parse(studentIds)
															// Update isCurrent flags
															localStorage.setItem(
																'visibleRowsStudentIds',
																JSON.stringify(
																	parsedIds.map(item => ({
																		...item,
																		isCurrent: item.student_id === row.student_id,
																	}))
																)
															)
														}
														// Find the avatar header to get the profile navigation function
														const avatarHeader = tableProps.headers.find(h => h.type === 'avatar')
														if (avatarHeader && avatarHeader.onClickAction) {
															// Pass current pagination and sorting state to navigation handler
															avatarHeader.onClickAction(row, page, sortBy, sortOrder)
														} else if (header.onClickAction) {
															header.onClickAction(row, page, sortBy, sortOrder)
														}
													}}
													sx={{
														minWidth: (() => {
															// Set specific minWidth based on column label
															switch (header.label) {
																case '年齢':
																	return '82px'
																case '申請回数':
																	return '90px'
																case '承認状況':
																	return '135px'
																case '公開状況':
																	return '120px'
																default:
																	return header.minWidth
															}
														})(),
														padding: header.type === 'avatar' ? '4px' : '12px 16px',
														borderRight: 'none',
														backgroundColor: 'inherit', // Use inherit to take from parent row
														cursor: header.type === 'delete_icon' ? 'default' : 'pointer',
														...(rowIndex === visibleRows.length - 1 &&
															cellIndex === 0 && {
																borderBottom: 'none',
															}),
														...(rowIndex === visibleRows.length - 1 &&
															cellIndex === visibleHeaders.length - 1 && {
																borderBottom: 'none',
															}),
														...(header.type === 'action'
															? {
																	position: 'sticky',
																	right: 0,
																	background: 'inherit', // Use inherit instead of white
																	zIndex: 5,
																	width: '20px',
																	borderLeft: 'none',
																}
															: {}),
													}}
												>
													{/* Table cell content - same as before */}
													{header.type === 'bookmark' ? (
														<div onClick={e => e.stopPropagation()}>
															{row.isBookmarked ? (
																<svg width='19' height='18' viewBox='0 0 19 18' fill='none' xmlns='http://www.w3.org/2000/svg' onClick={() => header.onClickAction && header.onClickAction(row)} style={{ cursor: 'pointer' }}>
																	<path d='M9.3275 14.1233L4.18417 16.8275L5.16667 11.1L1 7.04417L6.75 6.21083L9.32167 1L11.8933 6.21083L17.6433 7.04417L13.4767 11.1L14.4592 16.8275L9.3275 14.1233Z' fill='#F7C02F' stroke='#F7C02F' strokeLinecap='round' strokeLinejoin='round' />
																</svg>
															) : (
																<svg width='18' height='17' viewBox='0 0 18 17' fill='none' xmlns='http://www.w3.org/2000/svg' onClick={() => header.onClickAction && header.onClickAction(row)} style={{ cursor: 'pointer' }}>
																	<path d='M9.00035 13.7913L3.85702 16.4955L4.83952 10.768L0.672852 6.71214L6.42285 5.8788L8.99452 0.667969L11.5662 5.8788L17.3162 6.71214L13.1495 10.768L14.132 16.4955L9.00035 13.7913Z' stroke='#ccc' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
																</svg>
															)}
														</div>
													) : header.type === 'avatar' ? (
														<UserAvatar photo={row.photo} name={row.first_name + ' ' + row.last_name} studentId={row.first_name_furigana || row.last_name_furigana ? `${row.last_name_furigana || ''} ${row.first_name_furigana || ''}`.trim() : row.kana_name || null} age={row.age} />
													) : header.type === 'status' ? (
														<div
															style={{
																textAlign: 'center',
																fontSize: '16px',
															}}
														>
															{row[header.id] ? '公開' : '非公開'}
														</div>
													) : header.type === 'email' ? (
														<a href={`mailto:${row[header.id]}`}>{row[header.id]}</a>
													) : header.type === 'date' ? (
														header.subkey ? (
															row[header.id] ? (
																row[header.id][header.subkey].split('T')[0]
															) : (
																'N/A'
															)
														) : row[header.id] ? (
															row[header.id].split('T')[0]
														) : (
															'N/A'
														)
													) : header.type === 'status_icon' ? (
														<div
															style={{
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																gap: '6px',
																padding: '4px 8px',
																borderRadius: '8px',
															}}
														>
															{(() => {
																const status = header.subkey ? (row[header.id] ? row[header.id][header.subkey] : '') : row[header.id]
																const statusConfig = header.statusMap[status]

																if (!statusConfig) return 'N/A'

																const reviewer = row[header.id]?.reviewer
																const showReviewer = status === 'checking' && reviewer

																return (
																	<div
																		style={{
																			display: 'flex',
																			flexDirection: 'column',
																			alignItems: 'center',
																			gap: '4px',
																		}}
																	>
																		<div
																			style={{
																				display: 'flex',
																				alignItems: 'center',
																				gap: '4px',
																				backgroundColor: `${statusConfig.color}15`,
																				padding: '4px 8px',
																				borderRadius: '12px',
																			}}
																		>
																			{statusConfig.icon === 'approved' && (
																				<CheckCircleIcon
																					sx={{
																						color: statusConfig.color,
																						fontSize: '16px',
																					}}
																				/>
																			)}
																			{statusConfig.icon === 'rejected' && (
																				<CancelIcon
																					sx={{
																						color: statusConfig.color,
																						fontSize: '16px',
																					}}
																				/>
																			)}
																			{statusConfig.icon === 'pending' && (
																				<PendingIcon
																					sx={{
																						color: statusConfig.color,
																						fontSize: '16px',
																					}}
																				/>
																			)}
																			<span
																				style={{
																					color: statusConfig.color,
																					fontSize: '12px',
																					fontWeight: '500',
																				}}
																			>
																				{statusConfig.text}
																			</span>
																		</div>
																		{showReviewer && (
																			<kbd
																				style={{
																					fontSize: '9px',
																					padding: '1px 4px',
																					backgroundColor: '#f5f5f5',
																					border: 'none',
																					borderRadius: '3px',
																					color: '#666',
																					fontFamily: 'monospace',
																					cursor: 'pointer',
																					userSelect: 'none',
																				}}
																				onClick={e => {
																					e.stopPropagation()
																					if (header.onReviewerClick) {
																						header.onReviewerClick(reviewer.id)
																					}
																				}}
																				title={`${reviewer.first_name} ${reviewer.last_name} (${reviewer.email})`}
																			>
																				{reviewer.first_name} {reviewer.last_name}
																			</kbd>
																		)}
																	</div>
																)
															})()}
														</div>
													) : header.type === 'changed_fields' ? (
														<div>
															{(() => {
																const changedFields = header.subkey ? (row[header.id] ? row[header.id][header.subkey] : []) : row[header.id] || []
																if (!changedFields || changedFields.length === 0) {
																	return (
																		<span
																			style={{
																				color: '#999',
																				fontSize: '12px',
																			}}
																		>
																			変更なし
																		</span>
																	)
																}

																return (
																	<Button
																		size='small'
																		variant='text'
																		onClick={e => {
																			e.stopPropagation()
																			setSelectedChangedFields({
																				fields: changedFields,
																				studentName: `${row.first_name} ${row.last_name}`,
																				studentId: row.student_id,
																			})
																		}}
																		sx={{
																			textTransform: 'none',
																			padding: '4px 8px',
																			fontSize: '12px',
																			color: '#1976d2',
																			'&:hover': {
																				backgroundColor: '#e3f2fd',
																			},
																		}}
																	>
																		{changedFields.length}件の変更
																	</Button>
																)
															})()}
														</div>
													) : header.type === 'visibility_toggle' ? (
														<div
															style={{
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																gap: '8px',
															}}
															onClick={e => e.stopPropagation()}
														>
															<Switch
																checked={row[header.id] || false}
																disabled={header.disabled || false}
																onChange={async e => {
																	const newValue = e.target.checked
																	const previousValue = row[header.id]

																	// Optimistically update UI immediately
																	setRows(prevRows => {
																		const newRows = prevRows.map(prevRow => (prevRow.id === row.id ? { ...prevRow, [header.id]: newValue } : prevRow))
																		return newRows
																	})

																	// Then call backend
																	if (header.onToggle) {
																		try {
																			let success
																			// Check if onToggle expects (row, newValue) or just (id, newValue)
																			if (header.onToggle.length === 2) {
																				// New signature: (row, newValue)
																				success = await header.onToggle(row, newValue)
																			} else {
																				// Legacy signature: (id, newValue)
																				success = await header.onToggle(row.id, newValue)
																			}

																			if (!success) {
																				// Revert to previous state if backend call failed
																				setRows(prevRows => {
																					const revertedRows = prevRows.map(prevRow =>
																						prevRow.id === row.id
																							? {
																									...prevRow,
																									[header.id]: previousValue,
																								}
																							: prevRow
																					)
																					return revertedRows
																				})
																			}
																		} catch (error) {
																			// Revert to previous state on error
																			setRows(prevRows => {
																				const revertedRows = prevRows.map(prevRow =>
																					prevRow.id === row.id
																						? {
																								...prevRow,
																								[header.id]: previousValue,
																							}
																						: prevRow
																				)
																				return revertedRows
																			})
																		}
																	}
																}}
																size='small'
																sx={{
																	'& .MuiSwitch-switchBase': {
																		color: '#fff',
																		'&.Mui-checked': {
																			color: '#fff',
																			'& + .MuiSwitch-track': {
																				backgroundColor: '#4caf50',
																				opacity: 1,
																			},
																		},
																	},
																	'& .MuiSwitch-track': {
																		backgroundColor: '#ccc',
																		opacity: 1,
																		borderRadius: '20px',
																	},
																	'& .MuiSwitch-thumb': {
																		backgroundColor: '#fff',
																		width: '16px',
																		height: '16px',
																		boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
																	},
																}}
															/>
															<span
																style={{
																	fontSize: '12px',
																	fontWeight: '500',
																	color: row[header.id] ? '#4caf50' : '#666',
																}}
															>
																{row[header.id] ? '公開' : '非公開'}
															</span>
														</div>
													) : header.type === 'toggle_switch' ? (
														<div
															style={{
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
															}}
															onClick={e => e.stopPropagation()}
														>
															<Switch
																checked={row[header.id] || false}
																disabled={header.disabled || false}
																onChange={async e => {
																	const newValue = e.target.checked
																	const previousValue = row[header.id]

																	// Optimistically update UI immediately
																	setRows(prevRows => {
																		const newRows = prevRows.map(prevRow => (prevRow.id === row.id ? { ...prevRow, [header.id]: newValue } : prevRow))
																		return newRows
																	})

																	// Then call backend
																	if (header.onToggle) {
																		try {
																			const success = await header.onToggle(row.id, newValue)

																			if (!success) {
																				// Revert to previous state if backend call failed
																				setRows(prevRows => {
																					const revertedRows = prevRows.map(prevRow =>
																						prevRow.id === row.id
																							? {
																									...prevRow,
																									[header.id]: previousValue,
																								}
																							: prevRow
																					)
																					return revertedRows
																				})
																			}
																		} catch (error) {
																			// Revert to previous state on error
																			setRows(prevRows => {
																				const revertedRows = prevRows.map(prevRow =>
																					prevRow.id === row.id
																						? {
																								...prevRow,
																								[header.id]: previousValue,
																							}
																						: prevRow
																				)
																				return revertedRows
																			})
																		}
																	}
																}}
																size='small'
																sx={{
																	'& .MuiSwitch-switchBase': {
																		color: '#fff',
																		'&.Mui-checked': {
																			color: '#fff',
																			'& + .MuiSwitch-track': {
																				backgroundColor: '#4caf50',
																				opacity: 1,
																			},
																		},
																	},
																	'& .MuiSwitch-track': {
																		backgroundColor: '#ccc',
																		opacity: 1,
																		borderRadius: '20px',
																	},
																	'& .MuiSwitch-thumb': {
																		backgroundColor: '#fff',
																		width: '16px',
																		height: '16px',
																		boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
																	},
																}}
															/>
														</div>
													) : header.type === 'delete_icon' ? (
														<div
															style={{
																display: 'flex',
																alignItems: 'center',
																justifyContent: 'center',
																cursor: 'pointer',
																padding: '8px',
															}}
															onClick={e => {
																e.stopPropagation() // Prevent row click
																if (header.onClickAction) {
																	setDeleteModal({
																		open: true,
																		itemId: row.id,
																		deleteAction: header.onClickAction,
																	})
																}
															}}
														>
															<img
																src={DeleteIcon}
																alt='Delete'
																style={{
																	width: '16px',
																	height: '16px',
																	filter: 'invert(16%) sepia(10%) saturate(100%) hue-rotate(0deg) brightness(30%) contrast(100%)', // Dark gray color
																	transition: 'filter 0.2s ease',
																}}
																onMouseEnter={e => {
																	e.target.style.filter = 'invert(16%) sepia(88%) saturate(6400%) hue-rotate(357deg) brightness(95%) contrast(98%)' // Red color on hover
																}}
																onMouseLeave={e => {
																	e.target.style.filter = 'invert(16%) sepia(10%) saturate(100%) hue-rotate(0deg) brightness(30%) contrast(100%)' // Back to dark gray
																}}
															/>
														</div>
													) : header.type === 'mapped' ? (
														header.subkey ? (
															header.map[row[header.id] ? row[header.id][header.subkey] : '']
														) : (
															header.map[row[header.id] ? row[header.id] : '']
														)
													) : header.type === 'company_summary' ? (
														<Box
															sx={{
																display: 'flex',
																alignItems: 'flex-start',
																gap: 2,
																width: '100%',
																textAlign: 'left',
															}}
														>
															<div
																style={{
																	flex: '0 0 auto',
																	minWidth: '220px',
																	fontSize: '16px',
																	fontWeight: 600,
																	color: '#111827',
																	wordBreak: 'break-word',
																}}
															>
																{row.company_name || ''}
																<div
																	style={{
																		width: 'fit-content',
																		flex: '1 1 auto',
																		color: '#4b5563',
																		fontSize: '14px',
																		lineHeight: 1.6,
																		whiteSpace: 'pre-wrap',
																		wordBreak: 'break-word',
																	}}
																>
																	{row.tagline || ''}
																</div>
															</div>
														</Box>
													) : header.type === 'action' ? (
														<div
															style={{
																display: 'flex',
																justifyContent: 'flex-end',
															}}
															onClick={e => e.stopPropagation()}
														>
															<IconButton aria-label='more' id={'icon-button-' + row.id} aria-controls={open ? 'long-menu' : undefined} aria-expanded={open ? 'true' : undefined} aria-haspopup='true' onClick={e => handleClick(e, row.id)}>
																<MoreVertIcon />
															</IconButton>
															<Menu
																id={'long-menu' + row.id}
																MenuListProps={{
																	'aria-labelledby': 'long-button',
																}}
																anchorOrigin={{
																	vertical: 'bottom',
																	horizontal: 'right',
																}}
																transformOrigin={{
																	vertical: 'top',
																	horizontal: 'right',
																}}
																anchorEl={anchorEls[row.id] || null}
																open={Boolean(anchorEls[row.id])}
																onClose={() => {
																	setAnchorEls(prev => ({
																		...prev,
																		[row.id]: null,
																	}))
																}}
															>
																{header.options?.map((option, key) => {
																	const shouldBeVisible = option.visibleTo === role && (!option.shouldShow || option.shouldShow(row))

																	return (
																		<MenuItem key={`${option.label}-${row.id}-${key}`} onClick={() => handleClose(option.visibleTo === 'Admin' ? row.id : row.draft?.id || row.id, option.action)} sx={shouldBeVisible ? {} : { display: 'none' }}>
																			{option.label}
																		</MenuItem>
																	)
																})}
															</Menu>
														</div>
													) : header.isJSON ? (
														(() => {
															const rawValue = row[header.id]
															if (!rawValue || rawValue === 'null') return '未提出'

															// If value already looks like JSON, try to parse; otherwise treat as plain text (e.g. 'N1')
															let parsed = rawValue
															if (typeof rawValue === 'string' && /^[\[{]/.test(rawValue.trim())) {
																try {
																	parsed = JSON.parse(rawValue)
																} catch (e) {
																	// Fallback to raw string if JSON.parse fails
																	return rawValue === 'null' ? '未提出' : rawValue || '未提出'
																}
															}

															// When parsed is an object with "highest", use it; otherwise return the value or fallback text
															if (parsed && typeof parsed === 'object' && 'highest' in parsed) {
																return parsed.highest === 'null' ? '未提出' : parsed.highest || '未提出'
															}

															return parsed === 'null' ? '未提出' : parsed || '未提出'
														})()
													) : header.id === 'graduation_year' ? (
														// Format graduation_year from date format to Japanese format
														// Input: "2026-03-30" -> Output: "2026年03月"
														(() => {
															if (row[header.id]) {
																const match = String(row[header.id]).match(/^(\d{4})-(\d{2})/)
																if (match) {
																	const [, year, month] = match
																	return `${year}年${month}月`
																}
																return row[header.id]
															}
															return 'N/A'
														})()
													) : row[header.id] ? (
														<>
															{header.subkey ? (row[header.id] ? row[header.id][header.subkey] : 'N/A') : header.id === 'partner_university' && row[header.id] === '40単位モデル' ? 'なし' : row[header.id] ? row[header.id] : 'N/A'}
															{header.suffix ? header.suffix : ''}
														</>
													) : (
														'N/A'
													)}
												</TableCell>
											))}
										</TableRow>
									))
								) : (
									<TableRow>
										<TableCell
											colSpan={visibleHeaders.length}
											align='center'
											sx={{
												borderBottom: 'none',
												verticalAlign: 'middle', // 🔥 asosiy qism
												height: '220px', // ixtiyoriy: bo‘sh joy berish
											}}
										>
											{t('no_data_found')}
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					</TableContainer>
				</Box>
			)}

			{/* Pagination */}
			<PaginationControls />

			{/* Delete Confirmation Modal */}
			<Modal
				open={deleteModal.open}
				onClose={() => setDeleteModal({ open: false, itemId: null, deleteAction: null })}
				sx={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					backdropFilter: 'blur(4px)',
				}}
			>
				<Box
					sx={{
						width: '455px',
						height: '263px',
						backgroundColor: '#ffffff',
						borderRadius: '12px',
						padding: '32px',
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
						outline: 'none',
					}}
				>
					<Typography
						variant='h6'
						sx={{
							fontSize: '18px',
							fontWeight: 600,
							color: '#1f2937',
							textAlign: 'center',
							marginBottom: '32px',
							lineHeight: 1.5,
						}}
					>
						この採用担当者を削除しますか？
					</Typography>

					<Box
						sx={{
							display: 'flex',
							gap: '16px',
							width: '100%',
							justifyContent: 'center',
						}}
					>
						<Button
							onClick={async () => {
								if (deleteModal.deleteAction && deleteModal.itemId) {
									await deleteModal.deleteAction(deleteModal.itemId)
								}
								setDeleteModal({
									open: false,
									itemId: null,
									deleteAction: null,
								})
							}}
							sx={{
								color: 'rgba(239, 68, 68, 1)',
								backgroundColor: 'transparent',
								border: 'none',
								padding: '12px 24px',
								borderRadius: '8px',
								fontSize: '14px',
								fontWeight: 600,
								textTransform: 'none',
								minWidth: '140px',
								'&:hover': {
									backgroundColor: 'transparent',
									color: 'rgba(220, 38, 38, 1)',
								},
							}}
						>
							はい、削除する
						</Button>

						<Button
							onClick={() =>
								setDeleteModal({
									open: false,
									itemId: null,
									deleteAction: null,
								})
							}
							sx={{
								color: 'rgba(86, 39, 219, 1)',
								backgroundColor: 'transparent',
								border: 'none',
								padding: '12px 24px',
								borderRadius: '8px',
								fontSize: '14px',
								fontWeight: 600,
								textTransform: 'none',
								minWidth: '140px',
								'&:hover': {
									backgroundColor: 'transparent',
									color: 'rgba(76, 29, 209, 1)',
								},
							}}
						>
							キャンセル
						</Button>
					</Box>
				</Box>
			</Modal>

			{/* Changed Fields Modal */}
			<ChangedFieldsModal open={Boolean(selectedChangedFields)} onClose={() => setSelectedChangedFields(null)} data={selectedChangedFields} />

			{/* Header Filter Menu - Single menu for all filterable headers */}
			{headerFilterAnchor.field &&
				headerFilterAnchor.element &&
				(() => {
					const headerId = headerFilterAnchor.field
					const currentFilterValue = tableProps.filter?.[headerId]
					const filterOptions = tableProps.filterOptions?.[headerId] || []
					const formatFunction = tableProps.filterOptions?.[`${headerId}_format`]

					// Get current selected value for display
					let selectedValue = 'all'
					if (currentFilterValue) {
						if (Array.isArray(currentFilterValue) && currentFilterValue.length > 0) {
							selectedValue = currentFilterValue[0]
						} else if (typeof currentFilterValue === 'string') {
							selectedValue = currentFilterValue
						}
					}

					return (
						<Menu
							anchorEl={headerFilterAnchor.element}
							open={Boolean(headerFilterAnchor.element)}
							onClose={handleHeaderFilterClose}
							anchorOrigin={{
								vertical: 'bottom',
								horizontal: 'left',
							}}
							transformOrigin={{
								vertical: 'top',
								horizontal: 'left',
							}}
						>
							<MenuItem selected={selectedValue === 'all'} onClick={() => handleHeaderFilterChange(headerId, 'all')}>
								{t('all') || '全て'}
							</MenuItem>
							{filterOptions.map(option => {
								const displayValue = formatFunction ? formatFunction(option) : option
								const isSelected = selectedValue === option
								return (
									<MenuItem key={option} selected={isSelected} onClick={() => handleHeaderFilterChange(headerId, option)}>
										{displayValue}
									</MenuItem>
								)
							})}
						</Menu>
					)
				})()}
		</Box>
	)
}

EnhancedTable.propTypes = {
	tableProps: PropTypes.shape({
		dataLink: PropTypes.string.isRequired,
		headers: PropTypes.arrayOf(
			PropTypes.shape({
				id: PropTypes.string.isRequired,
				subquery: PropTypes.string,
				label: PropTypes.string.isRequired,
				numeric: PropTypes.bool,
				disablePadding: PropTypes.bool,
				type: PropTypes.string,
				role: PropTypes.string,
				visibleTo: PropTypes.array,
				keyIdentifier: PropTypes.string,
			})
		).isRequired,
		filter: PropTypes.object.isRequired,
		recruiterId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
		OnlyBookmarked: PropTypes.bool,
		refreshTrigger: PropTypes.number,
	}).isRequired,
	updatedBookmark: PropTypes.object,
	viewMode: PropTypes.oneOf(['table', 'grid']),
}

export default EnhancedTable
