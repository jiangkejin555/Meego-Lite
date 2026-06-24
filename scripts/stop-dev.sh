#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"

if ! command -v lsof >/dev/null 2>&1; then
  echo "lsof not found."
  exit 1
fi

PIDS="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"

if [[ -z "${PIDS}" ]]; then
  echo "No dev server found on port ${PORT}."
  exit 0
fi

kill -TERM ${PIDS} 2>/dev/null || true

for _ in {1..10}; do
  sleep 0.2
  STILL="$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)"
  if [[ -z "${STILL}" ]]; then
    echo "Stopped dev server on port ${PORT}."
    exit 0
  fi
done

kill -KILL ${PIDS} 2>/dev/null || true
echo "Force stopped dev server on port ${PORT}."
