import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <span className={`${styles.eyebrow} mono`}>account</span>
      <h1 className={styles.title}>Log in</h1>
      <p className={styles.lede}>
        Accounts are not wired up yet — this is a placeholder for the shared portal login that
        will eventually work across every venture.
      </p>

      <form className={styles.form}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Email</span>
          <input className={`${styles.fieldInput} mono`} type="email" placeholder="you@example.com" disabled />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Password</span>
          <input className={`${styles.fieldInput} mono`} type="password" placeholder="********" disabled />
        </label>
        <button type="button" className={`${styles.submit} mono`} disabled>
          Not yet available
        </button>
      </form>
    </div>
  );
}
