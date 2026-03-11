#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

copy_if_missing() {
  local source="$1"
  local target="$2"

  if [[ ! -f "$source" ]]; then
    echo "Missing template file: $source" >&2
    exit 1
  fi

  if [[ -f "$target" ]]; then
    echo "Skipping existing file: $target"
    return
  fi

  cp "$source" "$target"
  echo "Created $target from template"
}

copy_if_missing "$ROOT_DIR/apps/api/.env.example" "$ROOT_DIR/apps/api/.env"
copy_if_missing "$ROOT_DIR/apps/web/.env.example" "$ROOT_DIR/apps/web/.env"

