'use client';
import { FaArrowDown, FaPlus, FaMapMarkerAlt, FaSlidersH } from 'react-icons/fa';
import CategoryArt from './CategoryArt';
import { measureOf, formatQuantity, money } from '../../lib/stock/domain.mjs';
import styles from './stock.module.css';
export default function StockCard({ item, open }) {
  const measure = measureOf(item), quantity = Number(item.quantity || 0);
  const empty = quantity === 0, low = quantity <= Number(item.minQuantity || 0);
  return <article className={styles.itemCard}>
    <div className={styles.itemArt}>
      <CategoryArt category={item.category || 'Maintenance'} compact/>
      <span className={styles.stockBadge} data-low={low}>
        {empty ? 'Out of stock' : low ? 'Running low' : 'In stock'}
      </span>
    </div>
    <div className={styles.itemBody}>
      <p className={styles.eyebrow}>
        {item.category || 'Maintenance'}
      </p>
      <h3>
        {item.name}
      </h3>
      <p className={styles.itemSpec}>
        {item.size || 'General supplies'}
      </p>
      <p className={styles.location}>
        <FaMapMarkerAlt/>
        {item.location || 'Shelf not assigned'}
      </p>
      <div className={styles.quantityRow}>
        <div>
          <span className={styles.smallLabel}>
            Available
          </span>
          <strong>
            {formatQuantity(quantity, measure)}
          </strong>
        </div>
        <span className={styles.smallLabel}>
          {'Low at ' + formatQuantity(item.minQuantity || 0, measure)}
        </span>
      </div>
      <div className={styles.itemMetrics}>
        <div>
          <span>
            {'Average cost / ' + measure}
          </span>
          <b>
            {money(item.unitCost)}
          </b>
        </div>
        <div>
          <span>
            Stock value
          </span>
          <b>
            {money(quantity * Number(item.unitCost || 0))}
          </b>
        </div>
      </div>
      <div className={styles.cardActions}>
        <button className={styles.useButton} disabled={empty} onClick={() => open('use', item)}>
          <FaArrowDown/>
          Use stock
        </button>
        <button className={styles.restockButton} onClick={() => open('restock', item)}>
          <FaPlus/>
          Restock
        </button>
      </div>
      <button className={styles.adjustButton} onClick={() => open('adjust', item)}>
        <FaSlidersH/>
        Stocktake / adjust quantity
      </button>
    </div>
  </article>;
}
