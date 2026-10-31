'use client';
import { ageDays, appointmentGroup, pendingRepairs } from '../../lib/tech/jobs.mjs';
import styles from './tech.module.css';
import { appointmentLabel } from '../../lib/maintenance/schedule.mjs';
export default function TechJobCard({ job, today, open }) {
  const age = ageDays(job, today), group = appointmentGroup(job, today), remaining = pendingRepairs(job);
  const total = job.tasks?.length || 0, complete = job.status === 'completed';
  return <button onClick={() => open(job.id)} className={styles.jobCard}>
    <div className={styles.jobCardTop}><span>{job.displayId || 'Job card'}</span><span className={styles.badge} data-warning={!complete && group === 'overdue'}>{complete ? 'Completed' : group === 'today' ? 'Today' : group === 'overdue' ? 'Date passed' : group === 'unscheduled' ? 'Needs a date' : 'Upcoming'}</span></div>
    <h3>{job.unit || 'Property not set'}</h3><p className={styles.jobDate}>{job.appointmentDate ? 'Appointment · ' + job.appointmentDate + ' · ' + appointmentLabel(job) : 'Office to confirm an appointment'}</p>
    <div className={styles.jobProgress}><span style={{ width: (complete ? 100 : total ? (total - remaining) / total * 100 : 0) + '%' }}/></div>
    <div className={styles.jobCardBottom}><span>{complete ? total + ' repairs recorded' : remaining + ' of ' + total + ' repair items remaining'}</span><strong>{complete ? 'Review' : 'Open job'}</strong></div>
    {!complete && age >= 5 && <p className={styles.ageFlag}>{age} days open · coordinator review needed</p>}
    {!complete && job.tasks?.some(task => task.done && (!task.images || !task.images.length)) && <p className={styles.help}>A previously ticked item still needs photo evidence.</p>}
  </button>;
}
