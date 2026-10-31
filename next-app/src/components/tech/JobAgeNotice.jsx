'use client';
import { ageDays, AGE_WARNING_DAYS, appointmentGroup } from '../../lib/tech/jobs.mjs';
import styles from './tech.module.css';
export default function JobAgeNotice({ job, contractor, today }) {
  const age = ageDays(job, today), aged = job.status === 'active' && age != null && age >= AGE_WARNING_DAYS;
  const overdue = job.status === 'active' && appointmentGroup(job, today) === 'overdue';
  if (!aged && !overdue) return null;
  return <aside className={styles.ageNotice} role="status"><strong>{aged ? 'Work piling up, ' + contractor + '?' : 'Scheduled date has passed'}</strong><p>{job.displayId || job.unit}{aged ? ' has been open for ' + age + ' days.' : ' was booked for ' + job.appointmentDate + '.'} Please refer this job to your maintenance coordinator to agree the next action and a realistic completion date.</p>{aged && appointmentGroup(job, today) === 'upcoming' && <p>This job has a future appointment ({job.appointmentDate}); its age does not mean that appointment is overdue.</p>}</aside>;
}
