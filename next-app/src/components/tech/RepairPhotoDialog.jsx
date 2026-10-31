'use client';
import { useEffect, useRef, useState } from 'react';
import { doc, runTransaction, serverTimestamp, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../app/Config/firebaseConfig';
import { completeRepair } from '../../lib/tech/jobs.mjs';
import { compressRepairPhoto } from '../../lib/tech/photos';
import styles from './tech.module.css';
export default function RepairPhotoDialog({ job, task, contractor, close, saved }) {
  const [photos, setPhotos] = useState([]), [preparing, setPreparing] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const busy = useRef(false), previews = useRef([]), dialog = useRef(null), uploads = useRef(new Map());
  useEffect(() => {
    const previous = document.activeElement, urls = previews.current;
    dialog.current?.focus();
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); previous?.focus(); };
  }, []);
  const takePhoto = async event => {
    const files = [...(event.target.files || [])]; event.target.value = '';
    if (!files.length || busy.current) return;
    if (photos.length + files.length > 2) { setError('Only two photos are allowed for each repair item.'); return; }
    busy.current = true; setPreparing(true); setError('');
    const next = [];
    try {
      for (const source of files) {
        const file = await compressRepairPhoto(source), preview = URL.createObjectURL(file);
        previews.current.push(preview); next.push({ file, preview });
      }
      setPhotos(previous => [...previous, ...next]);
    } catch (e) { next.forEach(photo => URL.revokeObjectURL(photo.preview)); setError(e.message); }
    finally { busy.current = false; setPreparing(false); }
  };
  const complete = async () => {
    if (busy.current) return;
    if (photos.length < 1 || photos.length > 2) { setError('Take at least one photo before marking this item done.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      const urls = [];
      for (const photo of photos) {
        let url = uploads.current.get(photo.preview);
        if (!url) {
          const location = ref(storage, 'maintenance/' + job.id + '/' + task.id + '_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg');
          await uploadBytes(location, photo.file, { contentType: 'image/jpeg' });
          url = await getDownloadURL(location); uploads.current.set(photo.preview, url);
        }
        urls.push(url);
      }
      const jobRef = doc(db, 'maintenance', job.id), eventRef = doc(collection(jobRef, 'events'));
      const result = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(jobRef);
        if (!snapshot.exists()) throw new Error('This job no longer exists.');
        const patch = completeRepair(snapshot.data(), task.id, urls, contractor, new Date(), { desc: task.desc, area: task.area });
        transaction.update(jobRef, { ...patch, updatedAt: serverTimestamp() });
        transaction.set(eventRef, { action: 'repair-completed-with-photos', taskId: task.id, photoCount: urls.length, actorName: contractor, actorUid: auth.currentUser?.uid || null, createdAt: serverTimestamp() });
        return patch;
      });
      saved(result);
    } catch (e) {
      // Keep uploaded evidence on an ambiguous network failure; deleting it could damage a committed repair.
      setError(e.message || 'Photos could not be saved. This item has not been marked done. Please retry.');
    } finally { busy.current = false; setSaving(false); }
  };
  const locked = saving || preparing;
  return <div className={styles.backdrop}><section ref={dialog} tabIndex={-1} className={styles.photoDialog} role="dialog" aria-modal="true" aria-labelledby="photo-title" onKeyDown={event => {
    if (event.key === 'Escape' && !locked) close();
    if (event.key === 'Tab') {
      const targets = [...event.currentTarget.querySelectorAll('button, input, [tabindex="0"]')].filter(element => !element.disabled);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <p className={styles.eyebrow}>{job.displayId} · {task.area || 'Repair'}</p><h2 id="photo-title">Show the finished repair</h2><p>{task.desc}</p>
    <div className={styles.photoRule}>At least 1 photo is required. Maximum 2 per repair item.</div>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <div className={styles.photoGrid}>{photos.map((photo, index) => <div key={photo.preview}><img src={photo.preview} alt={'Repair photo ' + (index + 1)}/><button disabled={locked} onClick={() => { URL.revokeObjectURL(photo.preview); setPhotos(previous => previous.filter(entry => entry !== photo)); }}>Remove photo {index + 1}</button></div>)}</div>
    {photos.length < 2 && <label className={styles.cameraButton} aria-disabled={locked}>{preparing ? 'Preparing photo...' : 'Take photo (' + photos.length + '/2)'}<input type="file" accept="image/*" capture="environment" disabled={locked} onChange={takePhoto}/></label>}
    <button className={styles.primaryButton} onClick={complete} disabled={locked || photos.length === 0}>{saving ? 'Uploading and saving...' : 'Mark this item done'}</button>
    <p className={styles.help}>{photos.length === 0 ? 'The Done button unlocks after you add a photo.' : 'Work is marked done only after the photos and job update are saved.'}</p>
    <button className={styles.textButton} disabled={locked} onClick={close}>Go back · keep item open</button>
  </section></div>;
}
