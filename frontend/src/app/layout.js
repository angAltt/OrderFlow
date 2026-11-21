import '@fontsource-variable/archivo/wdth.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@/styles/globals.scss';
import Providers from './providers';

export const metadata = {
  title: {
    default: 'OrderFlow',
    template: '%s | OrderFlow',
  },
  description:
    'Inventory and order management dashboard built with Next.js, Redux Toolkit and Node.js.',
};

export const viewport = {
  themeColor: '#17283a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
