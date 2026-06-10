// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "Hypr",
  description: "Share moments with people you follow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('contextmenu', function(e) {
            var el = e.target;
            while (el) {
              if (el.hasAttribute && el.hasAttribute('data-allow-context')) return;
              el = el.parentElement;
            }
            e.preventDefault();
          });
        `}} />
        {children}
      </body>
    </html>
  );
}