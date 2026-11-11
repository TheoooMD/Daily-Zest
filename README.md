# Daily Zest

**Learn corporate finance by running a pixel-art lemonade stand**, by **Minh-Duc Theo HO**

Every slider you move (foot traffic, prices, wages, capex, debt, cost of capital) flows through a live
income statement, cash flow statement and balance sheet, then into a DCF valuation. Click any formula
to see it computed with your own numbers and its most sensitive drivers. No backend, no install.

👉 **Live demo:** https://theooomd.github.io/daily-zest/

---

## What you can do

- **Run the stand.** 55 sliders across traffic, product menu, cost of goods, staff, seating, fixed costs,
  capex, working capital, tax, debt and cost of capital. Up to 3 stands and 5 products.
- **Read the formulas.** 25 metrics (revenue to net income, FCF / FCFF / FCFE, WACC, EV, equity value,
  NPV, ROIC, restaurant KPIs), each shown with its formula, your numbers and a ±10% sensitivity tornado.
- **Watch the three statements move.** Income statement, balance sheet and cash flow statement update
  live, with the change from your last move.
- **Play four guided challenges.** Capacity, break-even, expansion NPV and optimal leverage.
- **Export to Excel.** A branded, formula-driven workbook in English or French: dashboard with native
  charts, the three statements, valuation with sensitivity table, KPIs, and a simulator sheet whose
  scroll bars recalculate the whole model inside Excel.

## Model conventions

The model is built to hold up to a finance reviewer:

- **Statements tie.** Opening and closing balance sheets balance by construction; the change in cash
  equals the cash flow statement; the change in equity equals net income.
- **Opening financing.** Debt funds initial capex and opening working capital first; any surplus stays
  as non-interest-bearing cash, and shareholders contribute the rest. Negative closing cash is shown as
  a bank overdraft, not as a negative asset.
- **Tax.** No tax refunds or loss carryforwards. The interest tax shield only counts up to this year's
  taxable profit, and that effective rate drives after-tax Kd, Hamada and WACC.
- **Valuation.** Opening-date Gordon growth: this year's FCFF is the first cash flow. Net debt = debt −
  excess cash. D/V = net debt ÷ EV and Hamada uses net debt ÷ equity, which gives a closed-form EV with
  no circular reference. A stand that burns cash is worth 0, and equity value never goes below 0
  (limited liability).
- **Value creation.** NPV = EV − initial investment (capex + opening working capital); ROIC uses
  steady-state invested capital.
- **Not modeled:** financial distress costs, interest on overdraft, multi-year forecasts.

## Tech

Plain HTML, CSS and JavaScript. Three.js for the 3D pixel island, a WebGL liquid-glass library for the
panels, ExcelJS and JSZip for the workbook (native charts and form controls are written into the file
directly). English and French.

To run it locally, serve the folder with any static server and open `index.html`.

## License

Copyright (c) 2026 Minh-Duc Theo HO. All rights reserved. See [LICENSE](LICENSE).
