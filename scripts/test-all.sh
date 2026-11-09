#!/usr/bin/env bash
# Build each example, start its production server, run the conformance suite against it, stop it.
# Build the shared packages first (`pnpm build`).
#
#   scripts/test-all.sh                 # every example
#   scripts/test-all.sh nuxt astro      # just these
#   DEV=1 scripts/test-all.sh nuxt      # against the dev server instead
set -uo pipefail
cd "$(dirname "$0")/.."

port_for() {
  case "$1" in
    node) echo 3000 ;; next) echo 3001 ;; nuxt) echo 3002 ;; astro) echo 3003 ;; sveltekit) echo 3004 ;;
    solid-start) echo 3005 ;; react-router) echo 3006 ;; angular) echo 3007 ;;
    tanstack-start) echo 3008 ;; eleventy) echo 3009 ;;
    *) echo "no port for $1 - add it to CONTRACT.md and here" >&2; return 1 ;;
  esac
}

stop_port() { lsof -ti "tcp:$1" -sTCP:LISTEN | xargs kill 2>/dev/null; sleep 1; }

examples=("$@")
if [ ${#examples[@]} -eq 0 ]; then
  for d in examples/*/; do examples+=("$(basename "$d")"); done
fi

mkdir -p test-results
failed=()
for name in "${examples[@]}"; do
  port=$(port_for "$name") || { failed+=("$name"); continue; }
  pkg="@ssr-examples/example-$name"
  log="test-results/$name.log"
  echo "==> $name on :$port"
  stop_port "$port"
  if [ -z "${DEV:-}" ] && grep -q '"build"' "examples/$name/package.json"; then
    if ! pnpm --filter "$pkg" build >"$log" 2>&1; then
      echo "build failed - see $log"; failed+=("$name"); continue
    fi
  fi
  script=start; [ -n "${DEV:-}" ] && grep -q '"dev"' "examples/$name/package.json" && script=dev
  pnpm --filter "$pkg" "$script" >>"$log" 2>&1 &
  for _ in $(seq 1 120); do curl -sf "http://localhost:$port/health" >/dev/null && break; sleep 1; done
  # warm up dev servers, whose first request compiles the page
  curl -s -o /dev/null "http://localhost:$port/"
  if ! (cd tests/conformance && EXAMPLE="$name" BASE_URL="http://localhost:$port" npx playwright test); then
    failed+=("$name")
  fi
  stop_port "$port"
done

if [ ${#failed[@]} -gt 0 ]; then
  echo "FAILED: ${failed[*]}"
  exit 1
fi
echo "all passed: ${examples[*]}"
