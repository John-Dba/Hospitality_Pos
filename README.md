# Hospitality POS

An educational point-of-sale workspace for learning common restaurant and hotel operations. It provides a general practice environment rather than representing a specific business or case study.

## Practice workflows

- Enter table orders and follow them through kitchen preparation.
- Route drink items to a Bar Manager for approval; beverage stock is deducted only after approval.
- Add and restock products in the appropriate food or beverage categories; accountants review kitchen supply requests before the matching storekeeper issues stock.
- Track inventory movements, housekeeping room status, payments, reports, staff roles and team activity.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run lint` to check the source.

This educational version is frontend-only. Practice accounts and operational data are stored in the browser's local storage; no backend is connected. Use **Reset training data** in Settings to restore the starter data.
