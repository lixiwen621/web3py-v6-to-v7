# Real Repo Validation Template (web3.py v6 -> v7)

Use this template to document a reproducible, reviewer-friendly migration run on a real open-source repository.

---

## 1) Target Repository

- Repository name:
- Repository URL:
- Commit SHA / Tag tested:
- Project language/runtime:
- Why this repo is representative:

## 2) Environment

- Date:
- OS:
- Node version:
- Python version:
- Codemod command version (if pinned):

## 3) Baseline State

- Build command:
- Test command:
- Baseline build result: PASS / FAIL
- Baseline test result: PASS / FAIL
- Notes:

## 4) Migration Execution

### 4.1 Dry Run

```bash
npx codemod workflow run -w <workflow_path_or_url> -t <target_repo_path> --dry-run
```

- Dry-run summary (files touched / key patterns):
- Any suspicious diff lines:

### 4.2 Apply Run

```bash
npx codemod workflow run -w <workflow_path_or_url> -t <target_repo_path>
```

- Applied summary (files touched):
- Deterministic transformations observed:
  - [ ] middleware rename
  - [ ] websocket provider rename
  - [ ] API/type rename
  - [ ] namespace/module removal comments

## 5) Post-Migration Validation

- Build command + result:
- Test command + result:
- Lint/type checks (if any):
- Runtime smoke check (optional):

## 6) Accuracy Review

### False Positives (incorrect changes)

- Count:
- Details (file + why incorrect):

### False Negatives (missed expected changes)

- Count:
- Details (file + why missed):

## 7) AI vs Manual Follow-up

- Deterministic codemod coverage estimate (%):
- AI-assisted follow-up items:
- Manual-only fixes:
- Time spent:
  - Codemod run:
  - AI follow-up:
  - Manual follow-up:

## 8) Final Metrics (for DoraHacks write-up)

- Total candidate patterns found:
- Automatically migrated patterns:
- Coverage = auto / total:
- FP count:
- FN count:
- Final build/tests status:

## 9) Artifacts

- Link to migration diff/PR:
- Command logs/snippets:
- Before/after code excerpts:
- Notes for reproducibility:
