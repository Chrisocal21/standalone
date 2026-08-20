import Link from "next/link";
import styles from "./page.module.css";

const ventures = [
  {
    slug: "laser",
    href: "/laser",
    name: "Laser",
    status: "live" as const,
    description:
      "Jointed shape generator. Rectangular boxes (finger, dovetail, rabbet, or mortise/tenon, with lids and dividers) or cylinders — set dimensions and material thickness, get a kerf-compensated SVG ready to cut.",
  },
  {
    slug: "3d-printing",
    href: "/3d-printing",
    name: "3D Printing",
    status: "soon" as const,
    description: "STL/mesh generation and slicing presets. Different engine, different hardware.",
  },
  {
    slug: "wood-cnc",
    href: "/wood-cnc",
    name: "Wood + CNC",
    status: "soon" as const,
    description: "Scope still open — material types and process to be defined.",
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <span className={`${styles.eyebrow} mono`}>fabrication portal</span>
        <h1 className={styles.title}>Standalone</h1>
        <p className={styles.lede}>
          One account, multiple fabrication ventures. Start with laser-cut, jointed
          boxes — parametric controls for makers who know what they want, generated from
          material thickness up rather than guessed in millimeters.
        </p>
      </section>

      <section className={styles.ventures} aria-label="Ventures">
        {ventures.map((venture) => {
          const card = (
            <>
              <div className={styles.cardHead}>
                <h2 className={styles.cardName}>{venture.name}</h2>
                <span className={`${styles.badge} ${venture.status === "live" ? styles.badgeLive : styles.badgeSoon} mono`}>
                  {venture.status === "live" ? "live" : "coming soon"}
                </span>
              </div>
              <p className={styles.cardDescription}>{venture.description}</p>
              {venture.status === "live" && <span className={`${styles.cardCta} mono`}>Open tool &rarr;</span>}
            </>
          );
          return venture.status === "live" ? (
            <Link key={venture.slug} href={venture.href} className={`${styles.card} ${styles.cardLive}`}>
              {card}
            </Link>
          ) : (
            <div key={venture.slug} className={`${styles.card} ${styles.cardSoon}`} aria-disabled="true">
              {card}
            </div>
          );
        })}
      </section>

      <section className={styles.status}>
        <span className={`${styles.statusLabel} mono`}>status</span>
        <p className={styles.statusText}>
          The laser venture&rsquo;s geometry engine is running here for preview and iteration.
          Real cut files are validated separately, on hardware, before dimensions are trusted.
        </p>
      </section>
    </div>
  );
}
