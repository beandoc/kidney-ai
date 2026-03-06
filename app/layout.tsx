import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Nirogyam ChatBot | Kidney Health AI",
  description: "Professional automated healthcare assistant for Kidney prevention, care, diet, and clinical queries. Chat in English, Hindi, and Marathi.",
  openGraph: {
    title: "Nirogyam ChatBot | Kidney Health AI",
    description: "Your professional health assistant for kidney care, prevention, and diet. Chat with our AI in English, Hindi, and Marathi.",
    type: "website",
    siteName: "Nirogyam Kidney AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nirogyam ChatBot | Kidney Health AI",
    description: "Professional medical assistant specializing in Kidney Health. Chat in English, Hindi, or Marathi.",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
