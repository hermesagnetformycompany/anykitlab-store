import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AnyKit Lab — Templates for brands that move',
    short_name: 'AnyKit Lab',
    description:
      'Editable Canva template kits for ambitious small brands, creators, founders and service providers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#e95717',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/assets/anykitlab-logo.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/assets/anykitlab-logo.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
    categories: ['shopping', 'business', 'design'],
  };
}