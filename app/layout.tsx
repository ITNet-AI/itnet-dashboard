import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, type Theme } from "@/components/ui/theme-toggle";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], axes: ["opsz"] });

export const metadata: Metadata = {
  title: { default: "ITNET AI", template: "%s – ITNET AI" },
  description: "Projects, tasks, clients and spend for the itnet team.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  const chosen: Theme | undefined = theme === "light" || theme === "dark" ? theme : undefined;
  return (
    <html lang="en" className={`${inter.variable} ${bricolage.variable}`} data-theme={chosen}>
      <body className="min-h-dvh">
        <div aria-hidden="true" className="brand-strip fixed inset-x-0 bottom-0 z-30" />
        {children}
      </body>
    </html>
  );
}
