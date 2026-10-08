import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) {
              return 'vendor-react';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2') || id.includes('recharts')) {
              return 'vendor-charts';
            }
            if (id.includes('leaflet') || id.includes('react-leaflet') || id.includes('@googlemaps')) {
              return 'vendor-maps';
            }
            if (id.includes('jspdf') || id.includes('jspdf-autotable') || id.includes('html2canvas') || id.includes('purify')) {
              return 'vendor-pdf';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('lucide-react') || id.includes('@fortawesome') || id.includes('react-icons')) {
              return 'vendor-icons';
            }
            return 'vendor';
          }
        },
      },
    },
  },
})

