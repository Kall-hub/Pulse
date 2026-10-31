'use client';
import { useEffect, useMemo, useState } from 'react';
import { FaBars, FaPlus, FaSearch, FaBoxes, FaArrowRight, FaExclamationTriangle, FaWarehouse } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import useStockStore from '../../hooks/useStock';
import CategoryArt, { CATEGORIES } from '../../components/stock/CategoryArt';
import StockCard from '../../components/stock/StockCard';
import StockDialog from '../../components/stock/StockDialog';
import StockHistory from '../../components/stock/StockHistory';
import { formatQuantity, money, quantityTotals } from '../../lib/stock/domain.mjs';
import styles from '../../components/stock/stock.module.css';

export default function StockPage() {
  const store = useStockStore();
  const [isOpen, setIsOpen] = useState(true), [tab, setTab] = useState('shelves');
  const [category, setCategory] = useState('All'), [search, setSearch] = useState(''), [lowOnly, setLowOnly] = useState(false);
  useEffect(() => {
    const resize = () => setIsOpen(window.innerWidth >= 768);
    resize(); window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const { items, movements, loading, error } = store;
  const stats = useMemo(() => ({
    value: items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0),
    low: items.filter(item => Number(item.quantity || 0) <= Number(item.minQuantity || 0)).length,
    totals: quantityTotals(items)
  }), [items]);
  const categories = [...new Set([...CATEGORIES, ...items.map(item => item.category || 'Maintenance')])];
  const needle = search.trim().toLowerCase();
  const filtered = items.filter(item => (category === 'All' || (item.category || 'Maintenance') === category)
    && (!lowOnly || Number(item.quantity || 0) <= Number(item.minQuantity || 0))
    && [item.name, item.category, item.size, item.location].filter(Boolean).some(value => String(value).toLowerCase().includes(needle)));
  const history = movements.filter(movement => [movement.itemName, movement.unit, movement.type, movement.jobCardDisplayId, movement.note].filter(Boolean).some(value => String(value).toLowerCase().includes(needle)));
  return <div className={styles.root}>
    <Sidebar isOpen={isOpen} setIsOpen={setIsOpen}/>
    <main className={styles.main} style={{ '--sidebar-width': isOpen ? '256px' : '80px' }}>
      <header className={styles.pageHeader}>
        <div className={styles.titleRow}>
          <button className={styles.mobileMenu} aria-label="Toggle navigation" onClick={() => setIsOpen(!isOpen)}>
            <FaBars/>
          </button>
          <div>
            <p className={styles.eyebrow}>
              PULSE / MATERIALS & SUPPLIES
            </p>
            <h1>
              The storeroom
              <span>
                .
              </span>
            </h1>
            <p className={styles.subtitle}>
              A place for everything. Every litre, fitting and last little bit.
            </p>
          </div>
        </div>
        <button className={styles.primaryButton} onClick={() => store.open('add')}>
          <FaPlus/>
          Add stock item
        </button>
      </header>
      {error && !store.dialog && <p role="alert" className={styles.error}>
        {error}
      </p>}
      <section className={styles.summary} aria-label="Stock summary">
        <div className={styles.valueSummary}>
          <span className={styles.smallLabel}>
            ON YOUR SHELVES
          </span>
          <strong>
            {money(stats.value)}
          </strong>
          <span>
            Stock value at average purchase cost
          </span>
        </div>
        <div className={styles.summaryCell}>
          <FaBoxes/>
          <strong>
            {items.length}
          </strong>
          <span>
            Different items
          </span>
        </div>
        <button className={styles.lowSummary} aria-pressed={lowOnly} onClick={() => { setLowOnly(!lowOnly); setTab('shelves'); }}>
          <FaExclamationTriangle/>
          <strong>
            {stats.low}
          </strong>
          <span>
            {lowOnly ? 'Showing low stock · clear' : 'Items to replenish'}
          </span>
        </button>
        <div className={styles.unitSummary}>
          <span className={styles.smallLabel}>
            QUANTITIES BY MEASURE
          </span>
          <div>
            {Object.entries(stats.totals).map(([unit, quantity]) => <span key={unit}>
              {formatQuantity(quantity, unit)}
            </span>)}
          </div>
          {!items.length && <span>
            No stock recorded yet
          </span>}
        </div>
      </section>
      <section className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label="Stock view">
          <button aria-pressed={tab === 'shelves'} className={tab === 'shelves' ? styles.activeTab : ''} onClick={() => setTab('shelves')}>
            Browse shelves
          </button>
          <button aria-pressed={tab === 'history'} className={tab === 'history' ? styles.activeTab : ''} onClick={() => setTab('history')}>
            Movement history
          </button>
        </div>
        <label className={styles.search}>
          <FaSearch/>
          <span className={styles.srOnly}>
            Search stock or history
          </span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={tab === 'shelves' ? 'Find an item, shelf or category...' : 'Find an item, property or job card...'}/>
        </label>
      </section>
      {loading ? <p role="status" className={styles.empty}>
        Opening the storeroom...
      </p> : tab === 'shelves' ? <>
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>
              FIND YOUR AISLE
            </p>
            <h2>
              Browse by category
            </h2>
          </div>
          <button className={styles.textButton} onClick={() => { setCategory('All'); setLowOnly(false); setSearch(''); }}>
            View all supplies
            <FaArrowRight/>
          </button>
        </div>
        <div className={styles.categoryGrid}>
          {categories.map(name => {
            const count = items.filter(item => (item.category || 'Maintenance') === name).length;
            return <button className={styles.categoryCard} aria-pressed={category === name} key={name} onClick={() => setCategory(category === name ? 'All' : name)}>
              <CategoryArt category={name}/>
              <div>
                <strong>
                  {name}
                </strong>
                <span>
                  {count}
                  {' '}
                  {count === 1 ? 'item' : 'items'}
                  <FaArrowRight/>
                </span>
              </div>
            </button>;
          })}
        </div>
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>
              THE SHELVES
            </p>
            <h2>
              {lowOnly ? 'Time to replenish' : category === 'All' ? 'Everything in its place' : category + ' supplies'}
            </h2>
          </div>
          <span className={styles.muted}>
            {filtered.length}
            {' '}
            {filtered.length === 1 ? 'item' : 'items'}
            {lowOnly ? ' · low stock filter' : ''}
          </span>
        </div>
        {filtered.length ? categories.filter(name => filtered.some(item => (item.category || 'Maintenance') === name)).map(name => <section className={styles.shelfSection} key={name} aria-label={name + ' shelf'}>
          <div className={styles.shelfLabel}>
            <span>
              {name}
            </span>
            <span>
              {filtered.filter(item => (item.category || 'Maintenance') === name).length + ' on shelf'}
            </span>
          </div>
          <div className={styles.shelfGrid}>
            {filtered.filter(item => (item.category || 'Maintenance') === name).map(item => <StockCard key={item.id} item={item} open={store.open}/>)}
          </div>
        </section>) : <div className={styles.empty}>
          <FaWarehouse/>
          <h3>
            {items.length ? 'Nothing on this shelf matches' : 'Your shelves are ready'}
          </h3>
          <p>
            {items.length ? 'Try another category or clear your filters.' : 'Add your first supplies to start tracking quantities, usage and costs.'}
          </p>
          <button className={styles.textButton} onClick={() => { if (items.length) { setSearch(''); setCategory('All'); setLowOnly(false); } else store.open('add'); }}>
            {items.length ? 'Clear filters' : 'Add your first item'}
            <FaArrowRight/>
          </button>
        </div>}
      </> : <>
        <div className={styles.sectionTitle}>
          <div>
            <p className={styles.eyebrow}>
              EVERY MOVEMENT ACCOUNTED FOR
            </p>
            <h2>
              From delivery to the job
            </h2>
          </div>
          <span className={styles.muted}>
            {history.length}
            {' '}
            entries
          </span>
        </div>
        {history.length ? <StockHistory movements={history} undo={store.undo} busy={store.busy}/> : <div className={styles.empty}>
          <h3>
            No movements found
          </h3>
          <p>
            Opening stock, deliveries, usage and stocktake adjustments appear here.
          </p>
        </div>}
      </>}
    </main>
    {store.dialog && <StockDialog store={store}/>}
  </div>;
}
