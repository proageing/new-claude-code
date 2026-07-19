import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from GitHub Pages at /new-claude-code/ (repo-scoped Pages URL,
// since this isn't a <user>.github.io root repo) — base must match so
// asset paths resolve correctly.
// https://vite.dev/config/
export default defineConfig({
  base: '/new-claude-code/',
  plugins: [react()],
})
