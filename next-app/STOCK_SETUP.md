# Storeroom stock control

The stock page uses the existing Firebase browser connection. It does not use the viewings backend or require new server credentials. Access still follows the deployed Firestore rules for stockItems and stockMovements.

## Measurements and prices

New items have a measure: each, L, m or kg. Enter opening stock and deliveries as whole packs/containers, a quantity per pack, and a purchase price per pack. For loose pieces use pack size 1. Two 5 L tins at R400 each create 10 L with an average cost of R80 per L. Low-stock thresholds use the base measure, not pack counts.

Usage accepts each, L/mL, m/cm or kg/g as appropriate. The stored balance and movement quantity use the base measure. Staff must measure usage; the app cannot sense the contents of a container. Quantity precision is six decimal places. Stocktake can record a physical count, spills or wastage, with a required reason.

Restocking calculates weighted average cost from the current stock value and the incoming purchase value. Unit costs retain precision; rand amounts are rounded for display. Every new movement records its unit cost and total value at the time. Later purchases do not recalculate historical usage costs. Recorded purchase prices should use the same tax-inclusive/exclusive convention consistently; there is no automatic VAT calculation.

## Existing records

Existing items without a measure remain each, keeping quantities and costs unchanged. No automatic conversion is inferred from a description such as 5 L tin. A deliberate data migration is needed if existing container-based balances should become litres. Existing category names are retained and shown alongside the standard category shelves. Category illustrations are local SVG icons and do not rely on external image URLs.

Legacy movement prices that were never saved are displayed as Cost not recorded. Reversal is available for usage with a recorded cost: a transaction marks the original entry reversed and adds an offsetting movement, restoring the original quantity and value. Old usage without a cost can be restored with an explicitly reasoned stocktake adjustment at the current average cost. No existing history is deleted.

## Verification

Run npm run test:stock for pack conversion, fractional usage, weighted costing, inventory value, reversals, invalid values and legacy compatibility. Live acceptance: add two 5 L containers at R400 each; use 750 mL against a property/job; verify 9.25 L and R60 job cost; receive a differently priced container; check the new weighted average; reverse the usage and verify its historical value returns; record a stocktake discrepancy with a reason. Verify simultaneous usage cannot overdraw stock using two sessions. Browser and live Firebase acceptance require the app's normal signed-in account.
