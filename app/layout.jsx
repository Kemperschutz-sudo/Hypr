// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "Hypr",
  description: "Share moments with people you follow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
