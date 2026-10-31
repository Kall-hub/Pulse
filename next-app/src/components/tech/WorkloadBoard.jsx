'use client';
import { INTERNAL_CONTRACTORS, workload, LOAD_WARNING_CARDS } from '../../lib/tech/jobs.mjs';
import styles from './tech.module.css';
export default function WorkloadBoard({ jobs, today, onSelect }) {
  return <section className={styles.workloadBoard} aria-label="Contractor workload"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>PLAN WITH THE TEAM</p><h2>Who has room for more work?</h2></div><span className={styles.datePill}>{today} · SAST</span></div>
    <div className={styles.workloadGrid}>{INTERNAL_CONTRACTORS.map(name => {
      const load = workload(jobs, name, today);
      const content = <><div className={styles.workloadName}><strong>{name}</strong><span className={styles.badge} data-warning={load.high}>{load.high ? 'Review capacity' : 'Open workload'}</span></div><div className={styles.workloadNumbers}><div><b>{load.open}</b><span>open cards</span></div><div><b>{load.today}</b><span>today</span></div><div><b>{load.aged}</b><span>5+ days old</span></div></div><p>{load.repairs} repair items need completion / evidence · {load.unscheduled} unscheduled</p>{onSelect && <span className={styles.openLink}>Open job cards →</span>}</>;
      return onSelect ? <button className={styles.workloadCard} data-warning={load.high} onClick={() => onSelect(name)} key={name}>{content}</button> : <article className={styles.workloadCard} data-warning={load.high} key={name}>{content}</article>;
    })}</div><p className={styles.help}>Capacity review starts at {LOAD_WARNING_CARDS} open job cards. Review the job size, promised dates and available time together; this is a planning warning, not proof of contractor fault.</p>
  </section>;
}
