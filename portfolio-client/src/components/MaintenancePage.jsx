import { Box, Typography } from '@mui/material'

/**
 * Modern maintenance page displayed when the system is under maintenance
 * This component has NO dependencies on context providers (Language, Alert, etc.)
 * so it can be rendered at any level of the component tree
 */
const MaintenancePage = ({ message, messageEn, messageUz }) => {
	// Detect browser language for simple localization
	const browserLang = navigator.language?.slice(0, 2) || 'en'

	// Choose appropriate message based on browser language
	const displayMessage = (() => {
		if (browserLang === 'ja' && message) return message
		if (browserLang === 'uz' && messageUz) return messageUz
		if (messageEn) return messageEn
		if (message) return message
		return "We're preparing to serve you better."
	})()

	// Localized text
	const text = (() => {
		if (browserLang === 'ja') {
			return {
				title: 'まもなく復旧します',
				subtitle: 'メンテナンス中',
			}
		}
		if (browserLang === 'uz') {
			return {
				title: 'Tez orada qaytamiz',
				subtitle: 'Texnik xizmat',
			}
		}
		return {
			title: "We'll Be Back Soon",
			subtitle: 'Under Maintenance',
		}
	})()

	return (
		<Box
			sx={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#f8fafc',
				padding: 3,
				position: 'relative',
				overflow: 'hidden',
			}}
		>
			{/* Subtle background decoration */}
			<Box
				sx={{
					position: 'absolute',
					top: '-20%',
					right: '-10%',
					width: '500px',
					height: '500px',
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(59, 130, 246, 0.06) 0%, transparent 70%)',
					pointerEvents: 'none',
				}}
			/>
			<Box
				sx={{
					position: 'absolute',
					bottom: '-15%',
					left: '-10%',
					width: '400px',
					height: '400px',
					borderRadius: '50%',
					background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)',
					pointerEvents: 'none',
				}}
			/>

			{/* Main content */}
			<Box
				sx={{
					textAlign: 'center',
					maxWidth: '580px',
					zIndex: 1,
				}}
			>
				{/* Plug illustration */}
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						mb: 5,
						position: 'relative',
					}}
				>
					{/* Left plug */}
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<svg width='64' height='64' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'>
							<circle cx='32' cy='32' r='28' fill='#e0f2fe' />
							<rect x='8' y='26' width='20' height='12' rx='2' fill='#0284c7' />
							<rect x='28' y='22' width='4' height='8' rx='1' fill='#0284c7' />
							<rect x='28' y='34' width='4' height='8' rx='1' fill='#0284c7' />
							<rect x='32' y='29' width='12' height='6' fill='#0284c7' />
						</svg>
					</Box>

					{/* Connection line with gap */}
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							mx: 1,
						}}
					>
						<Box
							sx={{
								width: '40px',
								height: '3px',
								background: '#0284c7',
								borderRadius: '2px',
							}}
						/>
						<Box
							sx={{
								width: '24px',
								height: '3px',
								background: 'transparent',
								position: 'relative',
								'&::before': {
									content: '""',
									position: 'absolute',
									left: '4px',
									top: '-4px',
									width: '4px',
									height: '4px',
									borderRadius: '50%',
									background: '#0284c7',
									animation: 'blink 1.5s ease-in-out infinite',
								},
								'&::after': {
									content: '""',
									position: 'absolute',
									right: '4px',
									top: '-4px',
									width: '4px',
									height: '4px',
									borderRadius: '50%',
									background: '#0284c7',
									animation: 'blink 1.5s ease-in-out infinite 0.5s',
								},
								'@keyframes blink': {
									'0%, 100%': { opacity: 0.3 },
									'50%': { opacity: 1 },
								},
							}}
						/>
						<Box
							sx={{
								width: '40px',
								height: '3px',
								background: '#0284c7',
								borderRadius: '2px',
							}}
						/>
					</Box>

					{/* Right socket */}
					<Box sx={{ display: 'flex', alignItems: 'center' }}>
						<svg width='64' height='64' viewBox='0 0 64 64' fill='none' xmlns='http://www.w3.org/2000/svg'>
							<circle cx='32' cy='32' r='28' fill='#e0f2fe' />
							<rect x='20' y='29' width='12' height='6' fill='#0284c7' />
							<rect x='32' y='22' width='4' height='8' rx='1' fill='#0284c7' />
							<rect x='32' y='34' width='4' height='8' rx='1' fill='#0284c7' />
							<rect x='36' y='26' width='20' height='12' rx='2' fill='#0284c7' />
							<circle cx='42' cy='30' r='2' fill='#e0f2fe' />
							<circle cx='50' cy='30' r='2' fill='#e0f2fe' />
							<circle cx='42' cy='34' r='2' fill='#e0f2fe' />
							<circle cx='50' cy='34' r='2' fill='#e0f2fe' />
						</svg>
					</Box>
				</Box>

				{/* Title */}
				<Typography
					sx={{
						fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
						fontWeight: 700,
						color: '#1e293b',
						mb: 2,
						letterSpacing: '-0.02em',
						lineHeight: 1.2,
					}}
				>
					{text.title}
				</Typography>

				{/* Subtitle badge */}
				<Box
					sx={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 1,
						background: '#fef3c7',
						color: '#92400e',
						px: 2,
						py: 0.75,
						borderRadius: '20px',
						fontSize: '0.875rem',
						fontWeight: 600,
						mb: 3,
					}}
				>
					<Box
						sx={{
							width: '8px',
							height: '8px',
							borderRadius: '50%',
							background: '#f59e0b',
							animation: 'pulse 2s ease-in-out infinite',
							'@keyframes pulse': {
								'0%, 100%': { transform: 'scale(1)', opacity: 1 },
								'50%': { transform: 'scale(1.2)', opacity: 0.7 },
							},
						}}
					/>
					{text.subtitle}
				</Box>

				{/* Message */}
				<Typography
					sx={{
						fontSize: '1.125rem',
						color: '#64748b',
						lineHeight: 1.7,
						maxWidth: '440px',
						mx: 'auto',
						whiteSpace: 'pre-line',
					}}
				>
					{displayMessage}
				</Typography>

				{/* Decorative dots */}
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'center',
						gap: 1,
						mt: 5,
					}}
				>
					{[0, 1, 2].map(i => (
						<Box
							key={i}
							sx={{
								width: '8px',
								height: '8px',
								borderRadius: '50%',
								background: '#cbd5e1',
								animation: 'bounce 1.4s ease-in-out infinite',
								animationDelay: `${i * 0.2}s`,
								'@keyframes bounce': {
									'0%, 80%, 100%': { transform: 'translateY(0)' },
									'40%': { transform: 'translateY(-6px)' },
								},
							}}
						/>
					))}
				</Box>
			</Box>
		</Box>
	)
}

export default MaintenancePage
