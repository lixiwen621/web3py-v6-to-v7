# DoraHacks Submission Draft

## Project

**web3.py v6 -> v7 Migration Codemod**

- Repository: <YOUR_REPO_URL>
- Workflow file: `workflow.yaml`
- Main transformer: `scripts/web3py_v6_to_v7.ts`

## Problem

Upgrading from `web3.py` v6 to v7 introduces multiple breaking changes (renamed APIs/types, provider updates, removed namespaces/modules).  
Doing this manually is slow and error-prone across large codebases.

## Solution

This project provides a deterministic codemod workflow built with Codemod JSSG (`js-ast-grep`) that automates core migration patterns and flags removals with explicit comments for follow-up.

Automated transformations include:

- Middleware renames:
  - `name_to_address_middleware` -> `ENSNameToAddressMiddleware`
  - `geth_poa_middleware` -> `ExtraDataToPOAMiddleware`
- Provider/type/API renames:
  - `WebsocketProviderV2` -> `WebSocketProvider`
  - `WebsocketProvider` -> `LegacyWebSocketProvider`
  - `CallOverride` -> `StateOverride`
  - `encodeABI` -> `encode_abi`
  - `SolidityError` -> `ContractLogicError`
- Attribute rename:
  - `w3.middlewares` -> `w3.middleware`
- Removal handling (deterministic flagging):
  - `w3.geth.miner.*` lines replaced with removal comments
  - `EthPM` import usage and related module references flagged

## Why This Is Production-Oriented

- Deterministic AST/structural matching for repeatability
- Reproducible fixture test suite (`tests/*/input` -> `tests/*/expected`)
- Verifier script to validate all fixtures in one command:

```bash
bash scripts/verify_fixtures.sh
```

- Clear AI/manual boundary for non-trivial removals

## Validation on Real Repositories

Use this process for case-study evidence:

1. Run dry-run on a real open-source repository
2. Inspect generated diff
3. Apply migration
4. Run target repo build/tests
5. Record FP/FN and residual manual fixes

Template:

- `docs/real_repo_validation_template.md`
- Filled example #1: `docs/case-study-web3py-v6.20.3.md`
- Filled example #2: `docs/case-study-web3-ethereum-defi-main.md`

## Evaluation Criteria Mapping

### Accuracy

- Deterministic rules for core rename patterns
- Fixture verification required to pass before release
- Real-repo validation flow includes explicit FP review

### Coverage

- Core documented v6->v7 breaking changes are automated
- Removed/ambiguous patterns are consistently flagged for follow-up

### Reliability

- Workflow operates across all `*.py` files with practical excludes
- Repeatable command path for dry-run and apply-run
- Fixtures and verification script provide regression safety

## Reported Metrics (From Current Validation Run)

- Score-aligned occurrence coverage across two real repos: `41 / 110 = 37.3%`
- Workflow-scoped occurrence count (`N_occurrence`): `110` (`98 + 12`)
- Auto-reduced occurrences: `41` (`30 + 11`)
- Remaining occurrences (`FN_occurrence`, diagnostic): `69` (`68 + 1`)
- Observed false positives in changed files: `0` (sample-observed)
- Real repo changed files: `12` + `6`
- Syntax smoke checks (`python -m compileall`): PASS in both case studies
- Project test attempts (`python -m pytest -q`): blocked by runner-local `pytest` environment conflict (`AttributeError: __spec__`)

## Impact

This codemod turns a risky migration into a repeatable upgrade workflow:

- Fast deterministic automation for high-frequency changes
- Lower manual burden on engineering teams
- Clear handoff for edge cases where automation should not guess

It is intended to be a practical migration path teams can run in real repositories, not just synthetic examples.
