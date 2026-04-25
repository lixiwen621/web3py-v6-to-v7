# Real Repo Case Study: tradingstrategy-ai/web3-ethereum-defi

This report documents a reproducible migration run of this codemod against a second real open-source repository.

## Target Repository

- Repository: `https://github.com/tradingstrategy-ai/web3-ethereum-defi`
- Branch: `main`
- Commit: `d5d184d042a8ddb8cb86d49a018f2492e6fb0ac8`
- Validation date: 2026-04-25

## Environment

- OS: macOS (darwin)
- Runner: local shell + `npx codemod workflow run`
- Workflow: `workflow.yaml` from this repository

## Reproduction Commands

```bash
# 1) clone target repo
git clone --depth 1 https://github.com/tradingstrategy-ai/web3-ethereum-defi.git ./web3-ethereum-defi-main

# 2) run codemod
npx codemod workflow run -w workflow.yaml -t ./web3-ethereum-defi-main --allow-dirty --no-interactive

# 3) inspect changed files
git -C ./web3-ethereum-defi-main diff --name-only | wc -l
git -C ./web3-ethereum-defi-main diff --stat

# 4) syntax smoke check
python3 -m compileall -q ./web3-ethereum-defi-main/eth_defi

# 5) project test attempt (environment evidence)
python3 -m pytest -q ./web3-ethereum-defi-main/tests
```

## Observed Results

- Codemod execution: PASS
- Changed files: `6`
- Diff summary: `6 files changed, 11 insertions(+), 11 deletions(-)`
- Post-migration syntax check (`python3 -m compileall`): PASS
- Project test run (`python3 -m pytest -q`): FAILED in current runner due local `pytest` environment conflict (`AttributeError: __spec__` from `py/_apipkg.py` before test collection)

Changed files:

- `eth_defi/chain.py`
- `eth_defi/compat.py`
- `scripts/bnb-chain-get-logs-test.py`
- `scripts/pancakeswap-live-price.py`
- `scripts/trader-joe-test.py`
- `scripts/uniswap-v3-live-price.py`

## Pattern Counts (Workflow-Scoped File Set)

Count scope follows `workflow.yaml` include/exclude rules (`**/*.py` with test/venv/node_modules exclusions).  
Metrics were captured from:

- `.evidence/metrics_before_web3_ethereum_defi.json`
- `.evidence/metrics_after_web3_ethereum_defi.json`

### Before

- Included files: `724`
- Total tracked pattern occurrences (`N_occurrence`): `12`

### After

- Included files: `724`
- Remaining tracked old-pattern occurrences (`FN_occurrence`): `1`
- Occurrence-level delta (`auto_occurrence`): `11`

## Accuracy / Coverage Interpretation

### Accuracy (FP)

- No incorrect deterministic rewrites were observed in this run's changed files (`6` files).
- This is an observed result for this sampled run, not a universal guarantee for all repositories.

### Coverage

Two coverage views are reported:

1. **Raw occurrence delta on this target repo (primary score-aligned view)**  
   - `11 / 12 = 91.7%` occurrences removed.

2. **Deterministic category capability view (repo-independent)**  
   - The workflow still covers `8 / 10 = 80%` deterministic migration categories in this project.

## AI vs Manual Boundary

- Deterministic codemod handles high-confidence structural renames.
- Ambiguous/unsafe contexts are intentionally flagged via TODO comments.
- Manual or AI follow-up is reserved for flagged edge cases rather than forcing unsafe rewrites.

## Caveats

- One remaining `.middlewares` occurrence after migration is intentionally conservative and should be reviewed manually.
- Occurrence-level metrics are repository-sensitive and should be interpreted together with changed-file review.
