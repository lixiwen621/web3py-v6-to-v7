# web3py-v6-to-v7 Codemod

Automated migration codemod for upgrading Python projects from [web3.py](https://github.com/ethereum/web3.py) **v6** to **v7**. Built for the [Boring AI Hackathon](https://dorahacks.io/hackathon/boring-ai) on DoraHacks.

## Evaluation Snapshot

- **Accuracy (sample-observed)**: no incorrect deterministic rewrites observed in reviewed changed files across two real-repo runs.
- **Coverage (score-aligned, occurrence N)**: `N=110`, `FP=0`, `FN=69`, auto-covered occurrences `=41`, so observed occurrence coverage is `41 / 110 = 37.3%`.
- **Reliability**: fixture suite passes and two reproducible real-repo case studies are provided.

## Real Evidence

- Filled case study #1: `docs/case-study-web3py-v6.20.3.md`
- Target repo #1: `ethereum/web3.py@v6.20.3` (`02acb874a35162b9a774baff2307c236dbf082fd`)
- Filled case study #2: `docs/case-study-web3-ethereum-defi-main.md`
- Target repo #2: `tradingstrategy-ai/web3-ethereum-defi@d5d184d042a8ddb8cb86d49a018f2492e6fb0ac8`
- Repro command:

```bash
npx codemod workflow run -w workflow.yaml -t /path/to/web3.py --allow-dirty --no-interactive
```

## Coverage Formula (Reproducible)

### Checklist-category deterministic coverage (primary metric)

- Scored deterministic categories (`N_category`): `11` (added `pythonic_middleware` → `PythonicMiddleware`)
- Automatically migrated categories (`A_category`): `9`
- TODO/manual follow-up categories (`M_category`): `2`
- Coverage (category): `9 / 11 = 81.8%`

### Raw occurrence delta (diagnostic metric)

- Total tracked old-pattern occurrences across real-repo samples (`N_occurrence`): `110` (`98 + 12`)
- Remaining old-pattern occurrences after codemod (`FN_occurrence`): `69` (`68 + 1`)
- Observed false positives in reviewed changed files (`FP_occurrence`): `0`
- Auto-covered occurrences: `N_occurrence - FN_occurrence = 41`
- Coverage (occurrence): `41 / 110 = 37.3%`

> **Why 37.3% looks low:** The target repo (`ethereum/web3.py`) is the framework source itself, not an application codebase. The 69 unmigrated occurrences are mostly internal definitions, test fixtures, type annotations, and documentation — contexts where auto-rewrites would be unsafe. In typical application codebases that *consume* web3.py (rather than *are* web3.py), the effective coverage is significantly higher.

## What It Migrates

| Category | v6 Pattern | v7 Pattern |
|---|---|---|
| Middleware rename | `pythonic_middleware` | `PythonicMiddleware` |
| Middleware rename | `attrdict_middleware` | `AttrDictMiddleware` |
| Middleware rename | `name_to_address_middleware` | `ENSNameToAddressMiddleware` |
| Middleware rename | `geth_poa_middleware` | `ExtraDataToPOAMiddleware` |
| WebSocket | `WebsocketProviderV2` | `WebSocketProvider` |
| WebSocket | `WebsocketProvider` | `LegacyWebSocketProvider` |
| WebSocket API | `AsyncWeb3.persistent_websocket(...)` | `AsyncWeb3(...)` |
| WebSocket API | `w3.ws.process_subscriptions()` | `w3.socket.process_subscriptions()` |
| Type rename | `CallOverride` | `StateOverride` |
| API rename | `encodeABI()` | `encode_abi()` |
| Exception rename | `SolidityError` | `ContractLogicError` |
| Attribute rename | `w3.middlewares` | `w3.middleware` |
| Kwarg rename | `fromBlock` / `toBlock` / `blockHash` | `from_block` / `to_block` / `block_hash` |
| Middleware builder | `construct_sign_and_send_raw_middleware(...)` | `SignAndSendRawMiddlewareBuilder.build(...)` |
| Removed namespace | `w3.geth.miner.*` | TODO/comment flag |
| Removed namespace | `w3.geth.personal.*` | TODO/comment flag |
| Removed middleware | `abi_middleware`, `*_cache_middleware`, `result_generator_middleware`, `http_retry_request_middleware`, `normalize_request_parameters` | TODO/comment flag |
| Removed module | `web3.pm`, `web3.ethpm`, `w3.pm`, `EthPM(...)` | TODO/comment flag |

## Usage

```bash
# run migration
npx codemod workflow run -w workflow.yaml -t /path/to/your/project

# dry-run preview
npx codemod workflow run -w workflow.yaml -t /path/to/your/project --dry-run
```

The workflow targets `**/*.py` and excludes tests/venv/node_modules (see `workflow.yaml`).

## Verification

```bash
bash scripts/verify_fixtures.sh
```

This runs all `tests/*/input/example.py` fixtures through the workflow and diffs against `expected`.

## Known Limitations

- `hasWeb3Context` relies on import/symbol heuristics (`web3` imports + `w3.middleware_onion`), not full type-semantic analysis.
- `geth.miner` in control-flow contexts is TODO-flagged instead of auto-rewritten to avoid unsafe structural edits.
- Occurrence-level counts can include non-callsite/internal framework references; see case-study caveats.
- "No false positives" in this README is sample-observed for audited runs, not a universal guarantee for every repository.

## Submission Assets

- Real case study (filled): `docs/case-study-web3py-v6.20.3.md`
- Real case study (filled): `docs/case-study-web3-ethereum-defi-main.md`
- Validation template: `docs/real_repo_validation_template.md`
- Submission draft: `docs/dorahacks_submission_draft.md`

## License

MIT
