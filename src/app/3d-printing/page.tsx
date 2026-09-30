import PrintTool from "./print-tool";
import styles from "./print.module.css";

export default function PrintPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={`${styles.eyebrow} mono`}>3d-printing venture</span>
        <h1 className={styles.title}>Solid Generator</h1>
        <p className={styles.lede}>Dimensions in, print-ready STL out — enclosures with corner bosses, or plain tubes and spacers.</p>
      </header>
      <PrintTool />
    </div>
  );
}
