'use client';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../app/Config/firebaseConfig';
import { contractorName } from '../lib/tech/jobs.mjs';
export default function useTechJobs(name, historyOpen) {
  const [team, setTeam] = useState([]), [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true), [historyLoading, setHistoryLoading] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setLoading(true); setError('');
    return onSnapshot(query(collection(db, 'maintenance'), where('status', '==', 'active')), snapshot => {
      setTeam(snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }))); setLoading(false);
    }, () => { setError('Unable to load active jobs. Check your connection or ask the office to check access.'); setLoading(false); });
  }, [attempt]);
  useEffect(() => {
    setHistory([]);
    if (!name || !historyOpen) return;
    setHistoryLoading(true);
    const aliases = name === 'Derrick' ? ['Derrick', 'Derick', 'Drerick'] : [name];
    const requests = [query(collection(db, 'maintenance'), where('contractor', 'in', aliases), where('status', '==', 'completed'))];
    if (name === 'Chris' || name === 'Derrick') requests.push(query(collection(db, 'maintenance'), where('contractor', '==', 'External'), where('externalContractor', 'in', aliases), where('status', '==', 'completed')));
    const results = requests.map(() => null);
    const unsubscribes = requests.map((request, index) => onSnapshot(request, snapshot => {
      results[index] = snapshot.docs.map(entry => ({ ...entry.data(), id: entry.id }));
      if (results.every(Boolean)) { setHistory([...new Map(results.flat().map(job => [job.id, job])).values()]); setHistoryLoading(false); }
    }, () => { setError('Unable to load completed jobs. Please retry or ask the office to check access.'); setHistoryLoading(false); }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [name, historyOpen, attempt]);
  return { team, jobs: team.filter(job => contractorName(job) === name), history, loading, historyLoading, error, retry: () => { setError(''); setAttempt(value => value + 1); } };
}
