export const MEASURES = { each: 'Each', L: 'Litres', m: 'Metres', kg: 'Kilograms' };
export const ENTRY_UNITS = { each: ['each'], L: ['L', 'mL'], m: ['m', 'cm'], kg: ['kg', 'g'] };
const FACTORS = { each: 1, L: 1, mL: 0.001, m: 1, cm: 0.01, kg: 1, g: 0.001 };
export const roundQuantity = value => Math.round((value + Number.EPSILON) * 1e6) / 1e6;
export const money = value => new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value || 0));
export const measureOf = item => Object.hasOwn(MEASURES, item?.measure) ? item.measure : 'each';
export function number(value, label, { positive = false, whole = false } = {}) {
  if (value === '' || value == null || (typeof value === 'string' && !value.trim())) throw new Error(label + ' is required.');
  const result = Number(value);
  if (!Number.isFinite(result) || result > Number.MAX_SAFE_INTEGER || (positive ? result <= 0 : result < 0)) throw new Error('Enter a valid ' + label.toLowerCase() + (positive ? ' greater than zero.' : ' of zero or more.'));
  if (whole && !Number.isInteger(result)) throw new Error(label + ' must be a whole number for items counted individually.');
  return result;
}
export function baseQuantity(value, entryUnit, measure) {
  if (!ENTRY_UNITS[measure]?.includes(entryUnit)) throw new Error('Choose a compatible measurement unit.');
  const amount = number(value, 'Quantity', { positive: true, whole: measure === 'each' });
  const result = roundQuantity(amount * FACTORS[entryUnit]);
  if (result <= 0) throw new Error('Quantity is too small.');
  return result;
}
export function packPurchase(packs, packSize, packCost, measure) {
  if (!Object.hasOwn(MEASURES, measure)) throw new Error('Choose a measurement unit.');
  const count = number(packs, 'Number of packs', { positive: true, whole: true });
  const size = number(packSize, 'Pack size', { positive: true, whole: measure === 'each' });
  const price = number(packCost, 'Price per pack');
  return { quantity: number(roundQuantity(count * size), 'Total quantity', { positive: true }), unitCost: price / size, totalCost: number(count * price, 'Total purchase cost'), packSize: size };
}
export function restock(item, purchase) {
  const current = number(item.quantity ?? 0, 'Current quantity');
  const cost = number(item.unitCost ?? 0, 'Current cost');
  const added = number(purchase.quantity, 'Added quantity', { positive: true, whole: measureOf(item) === 'each' });
  const totalCost = number(purchase.totalCost, 'Purchase cost');
  const quantity = roundQuantity(current + added);
  return { quantity, unitCost: (current * cost + totalCost) / quantity };
}
export function consumeStock(item, value, entryUnit) {
  const measure = measureOf(item), used = baseQuantity(value, entryUnit, measure);
  const current = number(item.quantity ?? 0, 'Current quantity');
  const unitCost = number(item.unitCost ?? 0, 'Current cost');
  if (used > current) throw new Error('Only ' + formatQuantity(current, measure) + ' left in stock.');
  return { quantity: roundQuantity(current - used), used, unitCost, totalCost: used * unitCost, measure };
}
export function stocktake(item, value) {
  const quantity = number(value, 'Measured quantity', { whole: measureOf(item) === 'each' });
  const before = number(item.quantity ?? 0, 'Current quantity');
  const unitCost = number(item.unitCost ?? 0, 'Current cost');
  const difference = roundQuantity(quantity - before);
  if (!difference) throw new Error('The measured quantity matches the recorded stock. No adjustment is needed.');
  return { quantity, before, difference, unitCost, totalCost: difference * unitCost };
}
export function restoreUsage(item, movement) {
  if (movement.reversedAt || movement.reversalId) throw new Error('This usage has already been reversed.');
  if (movement.measure && movement.measure !== measureOf(item)) throw new Error('The item measurement has changed. Use a stocktake adjustment instead.');
  const quantity = number(movement.quantity, 'Returned quantity', { positive: true, whole: measureOf(item) === 'each' });
  const recordedCost = movement.unitCost;
  if (recordedCost == null || recordedCost === '') throw new Error('This old usage has no recorded cost. Use a stocktake adjustment to restore it.');
  const unitCost = number(recordedCost, 'Recorded usage cost');
  const value = quantity * unitCost;
  return { ...restock(item, { quantity, totalCost: value }), returned: quantity, returnedValue: value };
}
export function formatQuantity(value, measure = 'each') {
  const amount = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 6 }).format(Number(value || 0));
  return amount + ' ' + measure;
}
export function quantityTotals(items) {
  return items.reduce((totals, item) => {
    const key = measureOf(item);
    totals[key] = roundQuantity((totals[key] || 0) + Number(item.quantity || 0));
    return totals;
  }, {});
}
