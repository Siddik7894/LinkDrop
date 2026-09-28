import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "LinkDrop | Secure Ephemeral File & Link Sharing",
  description:
    "Send files that self-destruct after reading or upon expiration. Zero-trace, password-protected, encrypted file sharing with QR codes.",
  keywords: [
    "file sharing",
    "ephemeral file sharing",
    "burn after reading",
    "secure file transfer",
    "temporary file upload",
  ],
  authors: [{ name: "LinkDrop" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark antialiased`}
    >
      <body className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
        {children}
      </body>
    </html>
  );
}
