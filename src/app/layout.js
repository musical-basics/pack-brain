import "./globals.css";

export const metadata = {
  title: "PackBrain — Smart Packing Dashboard",
  description: "Never forget what to pack again. AI-powered packing phases.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
