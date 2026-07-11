# Layout benchmark

Deterministic layout metrics for a few synthetic pages (home row-list, details
hero+rows, poster grid, EPG grid) run through the real `YogaManager` /
`LightningManager`. No renderer, no emulator, no network: it measures layout
work, not perceived smoothness.

## Workflow: baseline, then delta

Absolute numbers vary by machine, so the delta is what matters. Before you start
a fix or feature, snapshot a local baseline at your branch point; after your
change, compare:

```
pnpm --filter @plextv/react-lightning-plugin-flexbox bench:save   # snapshot HEAD (local, gitignored)
# ... make your change ...
pnpm --filter @plextv/react-lightning-plugin-flexbox bench        # delta vs your snapshot
```

`bench:save` writes `.baseline.local.json` (gitignored, per-engineer). Running
`bench` with a snapshot present prints each metric with its delta; without one
it just prints current numbers and tells you to snapshot first.

## Metrics

- `nodeCount` — total layout nodes created over the scenario.
- `layoutPasses` — `render` events emitted (calculateLayout flushes).
- `settles` — `settled` events (one per converged mount/scroll step).
- `maxPassesToSettle` — worst-case passes a single step took to converge.
- `reflows` — a node's computed size changing after its first sizing.
- `textRemeasures` — grow-only text re-measures beyond each node's first (the churn phase 2 should cut).
- `ms` — wall time, reported only, never gated.

## CI gate

`bench.test.ts` asserts the structural counts equal the committed
`baseline.json`. Those counts are algorithmic (a fixed fixture lays out the same
everywhere), so a committed baseline is valid across machines and catches
unintended count changes in review. Only `ms` is machine-dependent, and it is
never gated. If a change moves the counts on purpose (e.g. fewer passes after an
optimization), rerun `bench:update` and commit the new baseline in the same change.

The fixtures are synthetic proxies modeled on the shipped pages' structure, not
their pixels.
