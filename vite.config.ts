import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",  // Force IPv4
    port: 5173,
    strictPort: true,   // Avoid fallback to other ports
    allowedHosts: ['cardcapture.sphinxworldbiz.net','cardcaptureapi.sphinxworldbiz.net']
  },
  define: {
    // Define environment variables for the client
    'import.meta.env.VITE_BASE_URL': JSON.stringify('https://cardcapture.sphinxworldbiz.net'),
  }
 
})