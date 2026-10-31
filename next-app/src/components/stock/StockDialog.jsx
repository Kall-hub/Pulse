'use client';
import { useEffect, useId, useRef } from 'react';
import { FaTimes, FaArrowRight } from 'react-icons/fa';
import ApartmentAutocomplete from '../../app/components/ApartmentAutocomplete';
import { MEASURES, ENTRY_UNITS, measureOf, formatQuantity, money, packPurchase, restock, consumeStock, stocktake } from '../../lib/stock/domain.mjs';
import { CATEGORIES } from './CategoryArt';
import styles from './stock.module.css';
function Field({ label, value, onChange, type = 'text', required = false, step = 'any', ...props }) {
  const id = useId();
  return <label className={styles.field} htmlFor={id}>
    <span>
      {label}
    </span>
    <input id={id} type={type} value={value} required={required} onChange={e => onChange(e.target.value)} {...(type === 'number' ? { min: 0, step } : {})} {...props}/>
  </label>;
}
function Select({ label, value, onChange, children }) {
  return <label className={styles.field}>
    <span>
      {label}
    </span>
    <select value={value} onChange={e => onChange(e.target.value)}>
      {children}
    </select>
  </label>;
}
const titles = { add: 'Add to your shelves', use: 'Record stock usage', restock: 'Bring stock in', adjust: 'Count what is actually there' };
function preview(dialog, item, form) {
  try {
    if (dialog === 'add' || dialog === 'restock') {
      const measure = item ? measureOf(item) : form.measure;
      if (dialog === 'add' && form.quantity === '0') return 'Opening quantity: 0 ' + measure + '. You can restock later.';
      const purchase = packPurchase(form.quantity, form.packSize, form.unitCost, measure);
      return formatQuantity(purchase.quantity, measure) + ' added · ' + money(purchase.totalCost) + ' purchase cost' + (item ? ' · new average ' + money(restock(item, purchase).unitCost) + ' / ' + measure : ' · ' + money(purchase.unitCost) + ' / ' + measure);
    }
    if (dialog === 'use') {
      const result = consumeStock(item, form.quantity, form.entryUnit);
      return formatQuantity(result.used, result.measure) + ' used · ' + money(result.totalCost) + ' job cost · ' + formatQuantity(result.quantity, result.measure) + ' remaining';
    }
    if (dialog === 'adjust') {
      const result = stocktake(item, form.quantity);
      return (result.difference > 0 ? '+' : '') + formatQuantity(result.difference, measureOf(item)) + ' adjustment · value change ' + money(result.totalCost);
    }
  } catch { return ''; }
}
export default function StockDialog({ store }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector('button, input, select')?.focus();
    return () => previous?.focus();
  }, []);
  const { dialog, form, change, selected, busy, error, close, save, items, jobs } = store;
  const item = selected ? items.find(entry => entry.id === selected.id) || selected : null;
  const measure = item ? measureOf(item) : form.measure;
  const purchase = dialog === 'add' || dialog === 'restock';
  const hint = preview(dialog, item, form);
  const matches = jobs.filter(job => !form.unit || (job.unit || '').toLowerCase().includes(form.unit.trim().toLowerCase())).slice(0, 30);
  const set = key => value => change(key, value);
  return <div className={styles.backdrop}>
    <section ref={dialogRef} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const elements = [...event.currentTarget.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(element => !element.disabled);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="stock-dialog-title">
      <header className={styles.dialogHeader}>
        <div>
          <p className={styles.eyebrow}>
            THE STOREROOM
          </p>
          <h2 id="stock-dialog-title">
            {titles[dialog]}
          </h2>
          <p>
            {item?.name || 'Give every material a place and a measure.'}
          </p>
        </div>
        <button aria-label="Close dialog" disabled={busy} onClick={close}>
          <FaTimes/>
        </button>
      </header>
      <form onSubmit={e => { e.preventDefault(); save(); }}>
        <fieldset className={styles.dialogFields} disabled={busy}>
          {error && <p role="alert" className={styles.error}>
            {error}
          </p>}
          {item && <div className={styles.available}>
            <span>
              Currently available
            </span>
            <strong>
              {formatQuantity(item.quantity, measure)}
            </strong>
            <span>
              {money(item.unitCost)}
              {' '}
              /
              {' '}
              {measure}
              {' '}
              · average cost
            </span>
          </div>}
          {dialog === 'add' && <>
            <div className={styles.formGrid}>
              <Field label="Item name" required value={form.name} onChange={set('name')} placeholder="e.g. White wall paint" maxLength={150}/>
              <Select label="Category" value={form.category} onChange={set('category')}>
                {CATEGORIES.map(category => <option key={category}>
                  {category}
                </option>)}
              </Select>
              <Select label="Measure stock in" value={form.measure} onChange={set('measure')}>
                {Object.entries(MEASURES).map(([value, label]) => <option key={value} value={value}>
                  {label}
                  {' '}
                  (
                  {value}
                  )
                </option>)}
              </Select>
              <Field label="Shelf / bin location" value={form.location} onChange={set('location')} placeholder="Shelf B · Bin 3" maxLength={100}/>
              <Field label="Description / specification" value={form.size} onChange={set('size')} placeholder="White satin · 5 L tin" maxLength={200}/>
              <Field label={'Low stock alert at (' + measure + ')'} required type="number" step={measure === 'each' ? '1' : 'any'} value={form.minQuantity} onChange={set('minQuantity')}/>
            </div>
            <p className={styles.help}>
              Choose litres for liquids, metres for cable or cut pipe, kilograms for powders, and each for individual items. Existing stock keeps its original quantities.
            </p>
          </>}
          {purchase && <>
            <h3 className={styles.formHeading}>
              What are you putting on the shelf?
            </h3>
            <div className={styles.formGrid}>
              <Field label={dialog === 'add' ? 'Starting packs / containers' : 'Packs / containers received'} required type="number" step="1" value={form.quantity} onChange={set('quantity')}/>
              <Field label={'Quantity per pack (' + measure + ')'} required type="number" step={measure === 'each' ? '1' : 'any'} value={form.packSize} onChange={set('packSize')}/>
              <Field label="Purchase price per pack (R)" required type="number" value={form.unitCost} onChange={set('unitCost')} placeholder="400.00"/>
            </div>
            <p className={styles.help}>
              For two 5-litre tins at R400 each: enter 2 packs, 5 L per pack, R400 per pack. For loose items, use a pack size of 1.
            </p>
          </>}
          {dialog === 'use' && <>
            <div className={styles.formGrid}>
              <Field label="Quantity used" required type="number" step={measure === 'each' ? '1' : 'any'} value={form.quantity} onChange={set('quantity')} placeholder={form.entryUnit === 'mL' ? 'e.g. 750' : measure === 'L' ? 'e.g. 0.75' : 'e.g. 2'}/>
              <Select label="Measurement" value={form.entryUnit} onChange={set('entryUnit')}>
                {ENTRY_UNITS[measure].map(unit => <option key={unit}>
                  {unit}
                </option>)}
              </Select>
            </div>
            <div className={styles.field}>
              <span>
                Property / apartment used at
              </span>
              <ApartmentAutocomplete value={form.unit} onChange={set('unit')} placeholder="Select or type a property / apartment" autoFocus={false} disabled={busy}/>
            </div>
            <Select label="Link a job card (optional)" value={form.jobId} onChange={value => {
          const job = jobs.find(entry => entry.id === value); change('jobId', value); if (job?.unit) change('unit', job.unit);
        }}>
              <option value="">
                No linked job card
              </option>
              {matches.map(job => <option key={job.id} value={job.id}>
                {job.displayId || job.id}
                {' '}
                ·
                {' '}
                {job.unit || 'No property'}
              </option>)}
            </Select>
            <Field label="Usage date (SAST)" type="date" required value={form.date} onChange={set('date')}/>
            <p className={styles.help}>
              Measure what you actually use. For example, 750 mL reduces liquid stock by 0.75 L. The app calculates the remainder from your entries.
            </p>
          </>}
          {dialog === 'adjust' && <>
            <Field label={'Actual quantity counted / measured (' + measure + ')'} required type="number" step={measure === 'each' ? '1' : 'any'} value={form.quantity} onChange={set('quantity')}/>
            <p className={styles.help}>
              Record a physical count, spillage or wastage. This changes the balance and keeps an adjustment in history.
            </p>
          </>}
          {dialog !== 'add' && <label className={styles.field}>
            <span>
              {dialog === 'adjust' ? 'Reason (required)' : 'Note / supplier (optional)'}
            </span>
            <textarea required={dialog === 'adjust'} value={form.note} maxLength={1000} onChange={e => change('note', e.target.value)} placeholder={dialog === 'adjust' ? 'e.g. Measured remaining paint after a spill' : 'Add a note for the next person'}/>
          </label>}
          {hint && <p className={styles.preview} aria-live="polite">
            {hint}
          </p>}
        </fieldset>
        <footer className={styles.dialogFooter}>
          <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>
            Cancel
          </button>
          <button className={styles.primaryButton} disabled={busy}>
            {busy ? 'Saving...' : dialog === 'add' ? 'Add item' : dialog === 'use' ? 'Record usage' : dialog === 'adjust' ? 'Save adjustment' : 'Receive stock'}
            <FaArrowRight/>
          </button>
        </footer>
      </form>
    </section>
  </div>;
}
