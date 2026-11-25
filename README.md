# Hospitality POS

An educational point-of-sale workspace for learning common restaurant and hotel operations. It provides a general practice environment rather than representing a specific business or case study.

## Practice workflows

- Enter table orders and follow them through kitchen preparation.
- Route drink items to a Bar Manager for approval; beverage stock is deducted only after approval.
- Let managers and administrators add food and drinks to the waiter menu and add rooms to housekeeping.
- Add and restock products in the appropriate food or beverage categories; accountants review kitchen supply requests before the matching storekeeper issues stock.
- Show low-stock alerts to the accountant and the storekeeper responsible for that inventory category.
- Track inventory movements, housekeeping room status, payments, reports, staff roles and team activity.

## Run locally

```sh
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run lint` to check the source.

This educational version is frontend-only. Practice accounts and operational data are stored in the browser's local storage; no backend is connected. Use **Reset training data** in Settings to restore the starter data.
