import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Predictor — Tesla",
  description: "Learn traffic signal cycles from your own drives and predict the next green.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
