export default function manifest() {
  return {
    name: 'AI Keşif Platformu',
    short_name: 'AI Keşif',
    description: 'Her İhtiyaca Yönelik En İyi Yapay Zeka Araçları Dizini',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7F00FF',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
