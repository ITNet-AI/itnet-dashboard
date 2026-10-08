import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "ITNET AI", template: "%s – ITNET AI" },
  description: "Projects, tasks, clients and spend for the itnet team.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`}>
      <body className="min-h-dvh">
        <div aria-hidden="true" className="brand-strip fixed inset-x-0 bottom-0 z-30" />
        {children}
      </body>
    </html>
  );
}
