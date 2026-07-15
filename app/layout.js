export const metadata = {
  title: 'Prickle - Mobile Eczema Tracking App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}