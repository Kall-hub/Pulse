'use client';
import { FaBolt, FaLightbulb, FaPlug, FaFaucet, FaToilet, FaWrench, FaPaintRoller, FaPaintBrush, FaFillDrip, FaPumpSoap, FaSprayCan, FaTint, FaKey, FaHammer, FaScrewdriver, FaToolbox, FaTools, FaBoxOpen } from 'react-icons/fa';
import styles from './stock.module.css';
export const CATEGORIES = ['Electrical', 'Plumbing', 'Paint', 'Cleaning', 'Hardware', 'Maintenance'];
const artwork = {
  Electrical: [FaLightbulb, FaPlug, FaBolt], Plumbing: [FaFaucet, FaToilet, FaWrench],
  Paint: [FaPaintRoller, FaFillDrip, FaPaintBrush], Cleaning: [FaPumpSoap, FaSprayCan, FaTint],
  Hardware: [FaKey, FaHammer, FaScrewdriver], Maintenance: [FaToolbox, FaTools, FaBoxOpen]
};
export default function CategoryArt({ category, compact = false }) {
  const [First, Second, Third] = artwork[category] || artwork.Maintenance;
  return <div className={styles.art + (compact ? ' ' + styles.compactArt : '')} data-category={category} role="img" aria-label={category + ' supplies illustration'}>
    <div className={styles.artHalo} />
    <First className={styles.artFirst}/>
    <Second className={styles.artSecond}/>
    <Third className={styles.artThird}/>
    <span className={styles.artShelf}/>
  </div>;
}
