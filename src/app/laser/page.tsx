import BoxTool from "./box-tool";
import styles from "./laser.module.css";

export default function LaserPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={`${styles.eyebrow} mono`}>laser venture</span>
        <h1 className={styles.title}>Shape Generator</h1>
        <p className={styles.lede}>
          Dimensions in, cut-ready panels out. Boxes (finger, dovetail, rabbet, or mortise/tenon
          joints, lid styles, dividers), cylinders (a rolled wall with tabs that notch into the
          top/bottom discs), divider trays, wall-mounted pegboard panels, slot-together stands, and
          wall-mount storage bins — every dimension derives from material thickness, not a fixed
          millimeter value, and kerf is a separate, tunable offset you calibrate against your own
          machine.
        </p>
      </header>
      <BoxTool />
    </div>
  );
}
