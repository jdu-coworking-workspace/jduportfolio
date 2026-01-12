import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'
import svgr from '@svgr/rollup'

dotenv.config()

export default defineConfig({
	optimizeDeps: {
		include: ['@emotion/react', '@emotion/styled', '@mui/material/Tooltip'],
	},
	plugins: [
		react({
			jsxImportSource: '@emotion/react',
			babel: {
				plugins: ['@emotion/babel-plugin'],
			},
		}),
		svgr(),
	],
	server: {
		hmr: {
			overlay: false,
		},
		proxy: {
			'/api': {
				// eslint-disable-next-line no-undef
				target: process.env.VITE_API_URL || 'http://localhost:8000',
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true,
			},
		},
	},
})
