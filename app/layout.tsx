import '@/app/ui/global.css';
import SessionWrapper from './components/SessionWrapper';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SessionWrapper may not be needed in this app
    <SessionWrapper>
      <html lang="en">
        <body>{children}</body>
      </html>
    </SessionWrapper>
  );
}
