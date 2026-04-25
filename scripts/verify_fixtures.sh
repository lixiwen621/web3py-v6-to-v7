#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKFLOW_PATH="$ROOT_DIR/workflow.yaml"
TMP_DIR="$(mktemp -d)"
FAILURES=0

cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Running fixture verification with workflow: $WORKFLOW_PATH"

shopt -s nullglob
input_files=("$ROOT_DIR"/tests/*/input/example.py)

if [[ "${#input_files[@]}" -eq 0 ]]; then
  echo "[ERROR] No fixture input files found under tests/*/input/example.py"
  exit 1
fi

for input_file in "${input_files[@]}"; do
  fixture_dir="$(cd "$(dirname "$input_file")/.." && pwd)"
  case_name="$(basename "$fixture_dir")"
  expected_file="$fixture_dir/expected/example.py"

  if [[ ! -f "$expected_file" ]]; then
    echo "[ERROR] Missing expected fixture: $expected_file"
    FAILURES=$((FAILURES + 1))
    continue
  fi

  case_tmp_dir="$TMP_DIR/$case_name"
  mkdir -p "$case_tmp_dir"
  cp "$input_file" "$case_tmp_dir/example.py"

  echo "-> Verifying: $case_name"
  npx codemod workflow run -w "$WORKFLOW_PATH" -t "$case_tmp_dir" --allow-dirty >/dev/null

  if ! diff -u "$expected_file" "$case_tmp_dir/example.py"; then
    echo "[FAIL] Fixture mismatch: $case_name"
    FAILURES=$((FAILURES + 1))
  else
    echo "[PASS] $case_name"
  fi
done

if [[ "$FAILURES" -gt 0 ]]; then
  echo
  echo "Fixture verification failed: $FAILURES case(s) mismatched."
  exit 1
fi

echo
echo "All fixture cases passed."
