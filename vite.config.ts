import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeBase = (value: string): string => {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const configuredPagesBase = normalizeBase(process.env.GITHUB_PAGES_BASE_PATH ?? 'wwit')

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : configuredPagesBase,
}))
