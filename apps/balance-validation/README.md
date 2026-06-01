# Balance Validation App

Offline scoring, historical-style backtesting, weight search, and shadow reporting for synthetic live-commerce balance validation data.

Run the whole demo:

```bash
npm run demo:balance
```

Or run the split stages:

```bash
npm run balance:build -- --out-dir outputs
npm run balance:backtest -- --out-dir outputs
npm run balance:report -- --out-dir outputs
```

V0 produces shadow recommendations only. It does not perform automatic budget allocation and does not claim causal uplift.
