import CncTool from "./cnc-tool";
import styles from "./wood.module.css";

export default function WoodCncPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={`${styles.eyebrow} mono`}>wood + cnc venture</span>
        <h1 className={styles.title}>Feeds &amp; Speeds</h1>
        <p className={styles.lede}>
          Bit, material, and cut parameters in — feed rate, plunge rate, and chip-thinning-compensated numbers out.
        </p>
      </header>
      <CncTool />
    </div>
  );
}
