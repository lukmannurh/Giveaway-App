import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/?utm_source=pwa',
    name: 'Giveaway App',
    short_name: 'Giveaway',
    description: 'Fair, transparent giveaways for your community.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      { src: '/icon.png', sizes: '72x72', type: 'image/png' },
      { src: '/icon.png', sizes: '96x96', type: 'image/png' },
      { src: '/icon.png', sizes: '128x128', type: 'image/png' },
      { src: '/icon.png', sizes: '144x144', type: 'image/png' },
      { src: '/icon.png', sizes: '152x152', type: 'image/png' },
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '384x384', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/Luke.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Luke App Mobile Interface'
      },
      {
        src: '/Luke.png',
        sizes: '512x512',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Luke App Desktop Interface'
      }
    ]
  }
}
