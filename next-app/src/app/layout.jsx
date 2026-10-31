import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: { default: "Pulse | Property Operations", template: "%s | Pulse" },
  applicationName: "Pulse",
  description: "Manage maintenance, job cards, contractor schedules, viewings and stock in one place with Pulse.",
  icons: {
    icon: [{ url: "/pulse-icon.svg", type: "image/svg+xml" }, { url: "/pulse-icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: [{ url: "/pulse-icon-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
