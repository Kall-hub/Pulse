import test from 'node:test';
import assert from 'node:assert/strict';
import { baseQuantity, packPurchase, restock, consumeStock, stocktake, restoreUsage, measureOf, quantityTotals } from '../../src/lib/stock/domain.mjs';
const paint = { quantity: 5, unitCost: 80, measure: 'L' };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, actual + ' != ' + expected);

test('pack pricing converts two 5 L tins into 10 L at R80 per litre', () => {
  assert.deepEqual(packPurchase('2', '5', '400', 'L'), { quantity: 10, unitCost: 80, totalCost: 800, packSize: 5 });
  assert.deepEqual(packPurchase('3', '10', '100', 'each'), { quantity: 30, unitCost: 10, totalCost: 300, packSize: 10 });
});
test('750 mL usage leaves 4.25 L and records R60 at the current cost', () => {
  assert.deepEqual(consumeStock(paint, 750, 'mL'), { quantity: 4.25, used: 0.75, unitCost: 80, totalCost: 60, measure: 'L' });
});
test('compatible unit conversions support litres, metres and kilograms', () => {
  assert.equal(baseQuantity(250, 'mL', 'L'), 0.25);
  assert.equal(baseQuantity(250, 'cm', 'm'), 2.5);
  assert.equal(baseQuantity(750, 'g', 'kg'), 0.75);
  assert.throws(() => baseQuantity(2, 'kg', 'L'), /compatible/);
  assert.throws(() => baseQuantity(0.5, 'each', 'each'), /whole/);
});
test('restock uses weighted value, including repeated averages without premature rounding', () => {
  let result = restock(paint, packPurchase(1, 5, 500, 'L'));
  assert.deepEqual(result, { quantity: 10, unitCost: 90 });
  result = restock({ ...result, measure: 'L' }, packPurchase(1, 5, 400, 'L'));
  near(result.quantity * result.unitCost, 1300);
  result = restock({ ...result, measure: 'L' }, packPurchase(1, 5, 400, 'L'));
  near(result.quantity * result.unitCost, 1700);
});
test('usage value stays fixed after a later purchase', () => {
  const used = consumeStock(paint, 750, 'mL');
  const next = restock({ ...paint, quantity: used.quantity }, packPurchase(1, 5, 600, 'L'));
  assert.equal(used.totalCost, 60);
  near(next.quantity * next.unitCost, 940);
});
test('transactions can refuse overdraw and arithmetic avoids fractional remainder drift', () => {
  assert.throws(() => consumeStock(paint, 5001, 'mL'), /Only 5 L/);
  assert.equal(consumeStock({ ...paint, quantity: 0.3 }, 0.1, 'L').quantity, 0.2);
  assert.equal(consumeStock(paint, 5, 'L').quantity, 0);
});
test('invalid and non-finite inputs cannot enter quantity or cost calculations', () => {
  for (const value of ['', ' ', -1, Infinity, NaN, 'invalid']) {
    assert.throws(() => packPurchase(value, 5, 400, 'L'));
    assert.throws(() => packPurchase(1, value, 400, 'L'));
    assert.throws(() => packPurchase(1, 5, value, 'L'));
  }
  assert.throws(() => packPurchase(0.5, 5, 400, 'L'), /whole/);
  assert.throws(() => packPurchase(1, 0.5, 400, 'each'), /whole/);
  assert.equal(packPurchase(1, 5, 0, 'L').totalCost, 0);
});
test('stocktake allows a measured zero and records signed value differences', () => {
  assert.deepEqual(stocktake(paint, 4.25), { quantity: 4.25, before: 5, difference: -0.75, unitCost: 80, totalCost: -60 });
  assert.equal(stocktake(paint, 0).difference, -5);
  assert.equal(stocktake(paint, 6).difference, 1);
  assert.throws(() => stocktake(paint, 5), /No adjustment/);
});
test('reversing usage restores its historical value after a price change', () => {
  const item = { quantity: 9.25, unitCost: 940 / 9.25, measure: 'L' };
  const movement = { quantity: 0.75, unitCost: 80, totalCost: 60, measure: 'L' };
  const returned = restoreUsage(item, movement);
  assert.equal(returned.quantity, 10);
  near(returned.quantity * returned.unitCost, 1000);
  assert.throws(() => restoreUsage(item, { ...movement, reversalId: 'already-returned' }), /already/);
  assert.throws(() => restoreUsage(item, { ...movement, unitCost: undefined }), /no recorded cost/);
  assert.throws(() => restoreUsage(item, { ...movement, measure: 'each' }), /measurement has changed/);
});
test('legacy records stay each and totals do not mix different measures', () => {
  assert.equal(measureOf({ size: '5 L tin', quantity: 2 }), 'each');
  assert.deepEqual(quantityTotals([{ quantity: 2 }, { quantity: 5, measure: 'L' }, { quantity: 3, measure: 'L' }, { quantity: 2.5, measure: 'm' }]), { each: 2, L: 8, m: 2.5 });
});
