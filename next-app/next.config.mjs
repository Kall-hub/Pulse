/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  const development = phase === 'phase-development-server';
  return {
    ...(development ? {} : { output: 'export' }),
    images: { unoptimized: true },
    ...(development ? {
      async rewrites() {
        return [{
          source: '/.netlify/functions/:path*',
          destination: `http://127.0.0.1:${process.env.VIEWINGS_API_PORT || 8890}/.netlify/functions/:path*`,
        }];
      },
    } : {}),
  };
}
