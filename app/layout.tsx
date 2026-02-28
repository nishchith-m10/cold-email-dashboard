import type { Metadata } from 'next';
import './globals.css';
import { LayoutWrapper } from '@/components/layout/layout-wrapper';
import { ClerkThemeProvider } from '@/components/providers/clerk-theme-provider';
import { Toaster } from '@/components/ui/toaster';

export const metadata: Metadata = {
  title: 'Cold Email Analytics Dashboard',
  description: 'Real-time analytics for your cold email campaigns',
};

/**
 * RootLayout - Server component with Clerk authentication
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking theme script — prevents flash of wrong theme on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.className='light'}else{document.documentElement.className='dark'}}catch(e){document.documentElement.className='dark'}})()`,
          }}
        />
        {/* Google Fonts - Inter & JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        <ClerkThemeProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
          <Toaster />
        </ClerkThemeProvider>
      </body>
    </html>
  );
}
