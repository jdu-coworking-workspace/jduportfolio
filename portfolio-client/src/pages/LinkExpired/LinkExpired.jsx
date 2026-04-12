const LinkExpired = () => {
	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#f9f9fb',
				fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
			}}
		>
			<div
				style={{
					background: '#fff',
					borderRadius: 16,
					padding: '48px 40px',
					maxWidth: 420,
					width: '90%',
					textAlign: 'center',
					boxShadow: '0 4px 24px rgba(0,0,0,.07)',
					border: '1px solid #f0f0f0',
				}}
			>
				<div style={{ fontSize: 56, marginBottom: 16 }}>🔗</div>
				<h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#111', marginBottom: 8 }}>Link expired or removed</h1>
				<p style={{ fontSize: '.95rem', color: '#666', lineHeight: 1.7 }}>This shareable link is no longer active. It may have expired or been removed by the owner.</p>
			</div>
		</div>
	)
}

export default LinkExpired
