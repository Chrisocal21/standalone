import BoxTool from "./box-tool";
import styles from "./laser.module.css";

export default function LaserPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={`${styles.eyebrow} mono`}>laser venture</span>
        <h1 className={styles.title}>Shape Generator</h1>
        <p className={styles.lede}>Dimensions in, cut-ready panels out — kerf and every measurement calibrate against your own machine.</p>
      </header>
      <BoxTool />
    </div>
  );
}
