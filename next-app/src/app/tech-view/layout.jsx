export const metadata = {
  title: 'Pulse Tech',
  description: 'Your assigned maintenance jobs in Pulse.',
  manifest: '/tech-view.webmanifest',
  appleWebApp: { capable: true, title: 'Pulse Tech', statusBarStyle: 'default' },
  icons: { icon: '/tech-icons/icon-192.png', apple: '/tech-icons/icon-180.png' }
};
export const viewport = { themeColor: '#20384b', width: 'device-width', initialScale: 1 };
export default function TechLayout({ children }) { return children; }
