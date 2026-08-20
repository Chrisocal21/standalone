import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import styles from "./layout.module.css";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Standalone",
  description: "Parametric fabrication tools, starting with laser-cut boxes.",
};

const ventures = [
  { href: "/laser", label: "Laser", live: true },
  { href: "/3d-printing", label: "3D Printing", live: false },
  { href: "/wood-cnc", label: "Wood + CNC", live: false },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <header className={styles.header}>
          <Link href="/" className={`${styles.brand} mono`}>
            STANDALONE
          </Link>
          <nav className={styles.nav}>
            {ventures.map((venture) =>
              venture.live ? (
                <Link key={venture.href} href={venture.href} className={`${styles.navLink} mono`}>
                  {venture.label}
                </Link>
              ) : (
                <span key={venture.href} className={`${styles.navLink} ${styles.navLinkDisabled} mono`}>
                  {venture.label}
                </span>
              )
            )}
            <Link href="/login" className={`${styles.navLink} ${styles.navLinkLogin} mono`}>
              Log in
            </Link>
          </nav>
        </header>
        <main className={styles.main}>{children}</main>
        <footer className={styles.footer}>
          <span className="mono">standalone / step zero</span>
          <span className="mono">geometry engine v0.1.0</span>
        </footer>
      </body>
    </html>
  );
}
