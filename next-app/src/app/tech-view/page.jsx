'use client';
import { useState } from 'react';
import { FaArrowLeft, FaCamera, FaCheckCircle, FaSearch } from 'react-icons/fa';
import TechAccessPanel from '../../components/tech/TechAccessPanel';
import JobHandout from '../../components/tech/JobHandout';
import WorkloadBoard from '../../components/tech/WorkloadBoard';
import JobAgeNotice from '../../components/tech/JobAgeNotice';
import TechJobCard from '../../components/tech/TechJobCard';
import RepairPhotoDialog from '../../components/tech/RepairPhotoDialog';
import useTechJobs from '../../hooks/useTechJobs';
import useSastDay from '../../hooks/useSastDay';
import { appointmentGroup, ageDays, taskComplete, workload, EXTERNAL_CONTRACTORS } from '../../lib/tech/jobs.mjs';
import styles from '../../components/tech/tech.module.css';
import { appointmentLabel } from '../../lib/maintenance/schedule.mjs';

export default function TechPortalPage() {
  const [name, setName] = useState(''), [view, setView] = useState('today'), [search, setSearch] = useState('');
  const [jobId, setJobId] = useState(null), [photoTask, setPhotoTask] = useState(null), [notice, setNotice] = useState('');
  const today = useSastDay(), store = useTechJobs(name, view === 'history');
  const load = workload(store.jobs, name, today);
  const selectedJob = [...store.jobs, ...store.history].find(job => job.id === jobId);
  const tabs = [ ['today', 'Today', load.today], ['all', 'All open', load.open], ['overdue', 'Date passed', load.overdue], ['upcoming', 'Upcoming', store.jobs.filter(job => appointmentGroup(job, today) === 'upcoming').length], ['unscheduled', 'No date', load.unscheduled], ['aged', '5+ days', load.aged], ['history', 'History', null] ];
  const matching = (view === 'history' ? store.history : store.jobs).filter(job => {
    const matchesDay = view === 'all' || view === 'history' || (view === 'aged' ? (ageDays(job, today) ?? -1) >= 5 : appointmentGroup(job, today) === view);
    return matchesDay && [job.unit, job.displayId, ...(job.tasks || []).map(task => task.desc)].filter(Boolean).some(text => String(text).toLowerCase().includes(search.toLowerCase().trim()));
  }).sort((a, b) => (a.appointmentDate || '9999').localeCompare(b.appointmentDate || '9999') || (a.appointmentTime || '99').localeCompare(b.appointmentTime || '99') || (a.issueDate || '').localeCompare(b.issueDate || ''));
  const choose = person => { setName(person); setView('today'); setJobId(null); setSearch(''); setNotice(''); };
  return <><TechAccessPanel/><main className={styles.portal}>
    {store.error && <div role="alert" className={styles.error}><p>{store.error}</p><button onClick={store.retry}>Try again</button></div>}
    {notice && <p role="status" className={styles.success}>{notice}</p>}
    {!name ? <>
      <header className={styles.hero}><p className={styles.eyebrow}>PULSE TECH</p><h1>Your work. Clear and ready.</h1><p>Choose your name to see today’s assigned job cards. Each repair needs a photo before it can be marked done.</p></header>
      {store.loading ? <p role="status">Loading your team...</p> : <><WorkloadBoard jobs={store.team} today={today} onSelect={choose}/><section aria-label="External contractor access"><div className={styles.sectionHeading}><h2>External contractor job cards</h2></div><div className={styles.detailMeta}>{EXTERNAL_CONTRACTORS.map(person => <button key={person} className={styles.textButton} onClick={() => choose(person)}>Open {person}’s jobs →</button>)}</div></section></>}
    </> : selectedJob ? <>
      <button onClick={() => { setJobId(null); setPhotoTask(null); }} className={styles.textButton}><FaArrowLeft/>Back to my jobs</button>
      <section className={styles.detailHeader}><p className={styles.eyebrow}>{selectedJob.displayId || 'JOB CARD'} · {name}</p><h1>{selectedJob.unit}</h1><div className={styles.detailMeta}><span>{selectedJob.status === 'completed' ? 'Completed job' : 'Active job'}</span><span>{selectedJob.appointmentDate ? 'Appointment: ' + selectedJob.appointmentDate + ' · ' + appointmentLabel(selectedJob) : 'No appointment date set'}</span><span>Issued: {selectedJob.issueDate || 'Date not recorded'}</span></div></section>
      <JobAgeNotice job={selectedJob} contractor={name} today={today}/>
      <JobHandout job={selectedJob} contractor={name}/>
      <div className={styles.sectionHeading}><h2>Repair checklist</h2><span className={styles.datePill}>1–2 photos per item</span></div>
      <div className={styles.repairList}>{(selectedJob.tasks || []).map(task => {
        const verified = taskComplete(task), actionable = selectedJob.status === 'active' && !verified;
        return <article className={styles.repairItem} data-done={verified} key={task.id}>
          <div className={styles.repairHeading}><div><p className={styles.eyebrow}>{task.area || 'General'}</p><h3>{task.desc}</h3></div>{verified && <FaCheckCircle className={styles.doneIcon}/>}</div>
          <p className={styles.help}>{verified ? 'Done · photo evidence saved' : selectedJob.status === 'completed' ? 'Historical completion record' : task.done ? 'Previously ticked · photo evidence still required' : 'Open repair · photo required to finish'}</p>
          {task.completedAt && <p className={styles.help}>Recorded: {task.completedAt}</p>}
          {task.images?.length > 0 && <div className={styles.savedPhotos}>{task.images.map((url, index) => <a href={url} target="_blank" rel="noopener noreferrer" key={url}><img loading="lazy" decoding="async" src={url} alt={'Repair evidence ' + (index + 1)}/></a>)}</div>}
          {actionable && <button className={styles.primaryButton} onClick={() => setPhotoTask(task)}><FaCamera/>{task.done ? 'Add required photo' : 'Take photo & finish item'}</button>}
        </article>;
      })}</div>
    </> : <>
      <header className={styles.hero}><div className={styles.heroTop}><p className={styles.eyebrow}>PULSE TECH · {name}</p><button className={styles.textButton} onClick={() => choose('')}>Switch contractor</button></div><h1>Today’s work, {name}.</h1><p>{today} · South Africa time · live job cards</p></header>
      <div className={styles.personalStats}><div><strong>{load.today}</strong><span>booked today</span></div><div><strong>{load.open}</strong><span>open job cards</span></div><div><strong>{load.repairs}</strong><span>items remaining</span></div><div data-warning={load.aged > 0}><strong>{load.aged}</strong><span>cards open 5+ days</span></div></div>
      {(load.high || load.aged > 0) && <aside className={styles.ageNotice}><strong>{load.high ? 'A full workload needs a plan.' : 'Some jobs need a follow-up.'}</strong><p>{name}, you have {load.open} open job cards, {load.today} booked today and {load.aged} open for at least five days. Please review these jobs with your maintenance coordinator before accepting more work.</p><button className={styles.textButton} onClick={() => setView(load.aged ? 'aged' : 'all')}>Review these jobs</button></aside>}
      <nav className={styles.jobTabs} aria-label="Filter job cards">{tabs.map(([key, label, count]) => <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}{count != null && <span>{count}</span>}</button>)}</nav>
      <label className={styles.search}><FaSearch/><input aria-label="Find a job card or property" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a job card, property or repair..."/></label>
      <div className={styles.sectionHeading}><h2>{tabs.find(tab => tab[0] === view)?.[1]} job cards</h2><span className={styles.help}>{matching.length} matching</span></div>
      {store.loading || (view === 'history' && store.historyLoading) ? <p role="status">Loading jobs...</p> : matching.length ? <div className={styles.jobGrid}>{matching.map(job => <TechJobCard key={job.id} job={job} today={today} open={id => { setJobId(id); setNotice(''); }}/>)}</div> : <section className={styles.empty}><h3>{view === 'today' ? 'No jobs booked for today' : 'No matching job cards'}</h3><p>{view === 'today' && load.unscheduled ? load.unscheduled + ' open cards still need an appointment date from the office.' : 'Try another view or clear your search.'}</p><button className={styles.textButton} onClick={() => { setView('all'); setSearch(''); }}>See all my open jobs</button></section>}
    </>}
    {photoTask && selectedJob && <RepairPhotoDialog job={selectedJob} task={photoTask} contractor={name} close={() => setPhotoTask(null)} saved={patch => { setPhotoTask(null); setNotice('Photo evidence and repair completion saved.'); if (patch.status === 'completed') { setJobId(null); setNotice('All repair items have photo evidence. Job card completed.'); } }}/>}
  </main></>;
}
