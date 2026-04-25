# Real Repo Case Study: ethereum/web3.py v6.20.3

This report documents a reproducible migration run of this codemod against a real open-source repository.

## Target Repository

- Repository: `https://github.com/ethereum/web3.py`
- Tag: `v6.20.3`
- Commit: `02acb874a35162b9a774baff2307c236dbf082fd`
- Validation date: 2026-04-23

## Environment

- OS: macOS (darwin)
- Runner: local shell + `npx codemod workflow run`
- Workflow: `workflow.yaml` from this repository

## Reproduction Commands

```bash
# 1) clone target repo
git clone --depth 1 --branch v6.20.3 https://github.com/ethereum/web3.py.git ./web3py-v6.20.3-metrics

# 2) run codemod
npx codemod workflow run -w workflow.yaml -t ./web3py-v6.20.3-metrics --allow-dirty --no-interactive

# 3) inspect changed files
git -C ./web3py-v6.20.3-metrics diff --name-only | wc -l
git -C ./web3py-v6.20.3-metrics diff --stat

# 4) syntax smoke check
python3 -m compileall -q ./web3py-v6.20.3-metrics/web3

# 5) project test attempt (environment evidence)
python3 -m pytest -q ./web3py-v6.20.3-metrics/tests
```

## Observed Results

- Codemod execution: PASS
- Changed files: `12`
- Diff summary: `12 files changed, 31 insertions(+), 30 deletions(-)`
- Post-migration syntax check (`python3 -m compileall`): PASS
- Project test run (`python3 -m pytest -q`): FAILED in current runner due local `pytest` environment conflict (`AttributeError: __spec__` from `py/_apipkg.py` before test collection)

## Pattern Counts (Workflow-Scoped File Set)

Count scope follows `workflow.yaml` include/exclude rules (`**/*.py` with test/venv/node_modules exclusions).  
Metrics were captured from:

- `.evidence/metrics_before.json`
- `.evidence/metrics_after.json`

### Before

- Included files: `230`
- Total tracked pattern occurrences (`N_occurrence`): `98`

### After

- Included files: `230`
- Remaining tracked old-pattern occurrences (`FN_occurrence`): `68`
- Occurrence-level delta (`auto_occurrence`): `30`

## Accuracy / Coverage Interpretation

### Accuracy (FP)

- No incorrect deterministic rewrites were observed in this run's changed files (`12` files).
- This is an observed result for this sampled run, not a universal guarantee for all repositories.

### Coverage

Two coverage views are reported:

1. **Checklist-category deterministic coverage (submission metric)**  
   - Total scored deterministic categories (`N`): `10`  
   - Automatically migrated categories (`A`): `8`  
   - Coverage: `A / N = 8 / 10 = 80%`

2. **Raw occurrence delta on this target repo (diagnostic metric)**  
   - `30 / 98 = 30.6%` occurrences removed  
   - This repo is the framework source itself; many remaining occurrences are internal/test/definition contexts and intentionally conservative non-rewrites.

## AI vs Manual Boundary

- Deterministic codemod handles high-confidence structural renames.
- Ambiguous/unsafe contexts are intentionally flagged via TODO comments.
- Manual or AI follow-up is reserved for flagged edge cases rather than forcing unsafe rewrites.

## Caveats

- Occurrence-level metrics are sensitive to repository type (framework source vs application codebase).
- `geth.miner` in control-flow contexts is TODO-flagged (not auto-rewritten) by design to prioritize zero unsafe rewrites.
