// app/layout.jsx
import "./globals.css";

export const metadata = {
  title: "Hypr",
  description: "Share moments with people you follow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
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
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              window.location.reload();
            });
          }
        `}} />
        {children}
      </body>
    </html>
  );
}