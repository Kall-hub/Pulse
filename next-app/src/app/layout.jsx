import { Geist, Geist_Mono } from "next/font/google";
import PulseCheckInSmart from "./components/PulseCheckInSmart";
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
  title: "The Pulse",
  description: "Welcome to my personal website where I share my projects and services.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <div className="print:hidden">
          <PulseCheckInSmart />
        </div>
        {children}
      </body>
    </html>
  );
}
