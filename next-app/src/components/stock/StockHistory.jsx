'use client';
import { FaArrowDown, FaArrowUp, FaUndoAlt, FaSlidersH } from 'react-icons/fa';
import { formatQuantity, money } from '../../lib/stock/domain.mjs';
import styles from './stock.module.css';
const labels = { usage: 'Used', restock: 'Restocked', opening: 'Opening stock', adjustment: 'Stocktake', reversal: 'Usage reversed' };
export default function StockHistory({ movements, undo, busy }) {
  return <div className={styles.history}>
    {movements.map(movement => {
    const usage = movement.type === 'usage', reversed = Boolean(movement.reversalId || movement.reversedAt);
    const Icon = usage ? FaArrowDown : movement.type === 'reversal' ? FaUndoAlt : movement.type === 'adjustment' ? FaSlidersH : FaArrowUp;
    return <article className={styles.historyCard} key={movement.id}>
      <div className={styles.movementIcon} data-type={movement.type}>
        <Icon/>
      </div>
      <div className={styles.historyContent}>
        <p className={styles.eyebrow}>
          {labels[movement.type] || movement.type}
          {reversed ? ' · reversed' : ''}
        </p>
        <h3>
          {movement.itemName}
        </h3>
        <p>
          {formatQuantity(movement.quantity, movement.measure || 'each')}
          {usage && movement.unit ? ' · ' + movement.unit : ''}
        </p>
        {movement.type === 'adjustment' && <p>
          {'Counted ' + movement.after + ' · previously ' + movement.before}
        </p>}
        {movement.jobCardDisplayId && <p>
          {'Job card: ' + movement.jobCardDisplayId}
        </p>}
        {movement.note && <p className={styles.muted}>
          {movement.note}
        </p>}
        {usage && !reversed && movement.unitCost != null && <button disabled={busy} onClick={() => undo(movement)} className={styles.textButton}>
          <FaUndoAlt/>
          Reverse usage
        </button>}
      </div>
      <div className={styles.historyValue}>
        <time>
          {movement.usageDate || 'Date unavailable'}
        </time>
        <strong>
          {movement.totalCost != null ? money(movement.totalCost) : 'Cost not recorded'}
        </strong>
        <span className={styles.smallLabel}>
          {movement.unitCost != null ? money(movement.unitCost) + ' / ' + (movement.measure || 'each') : 'Legacy entry'}
        </span>
      </div>
    </article>;
  })}
  </div>;
}
