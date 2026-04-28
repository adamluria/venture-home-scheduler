#!/usr/bin/env bash
#
# deploy.sh — one-shot ship script for venture-home-scheduler
#
# Usage:
#   ./deploy.sh                          # commits with auto-message, pushes, deploys
#   ./deploy.sh "fix territory mapping"  # commits with your message, pushes, deploys
#   ./deploy.sh --no-commit              # skip git, just deploy current source
#   ./deploy.sh --dry-run                # show what would happen, don't run
#
# What it does:
#   1. Verifies gcloud + git are installed
#   2. Verifies you're on a sane branch with the right remote
#   3. git add -A, commit, push (unless --no-commit)
#   4. gcloud run deploy to us-east1
#
# Safe defaults:
#   - Exits on any error (set -e)
#   - Won't deploy if git push fails
#   - Won't commit if there's nothing to commit (skips silently to push)

set -euo pipefail

# ── Config ───────────────────────────────────────────────────────────
PROJECT_ID="venture-home-scheduler"
SERVICE_NAME="venture-home-scheduler"
REGION="us-east1"
EXPECTED_REMOTE="adamluria/venture-home-scheduler"

# ── Colors (auto-disable if not a TTY) ───────────────────────────────
if [[ -t 1 ]]; then
  BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GRN=$'\033[32m'
  YEL=$'\033[33m'; BLU=$'\033[34m'; RST=$'\033[0m'
else
  BOLD=""; DIM=""; RED=""; GRN=""; YEL=""; BLU=""; RST=""
fi

step()  { echo "${BLU}${BOLD}▶${RST} ${BOLD}$*${RST}"; }
ok()    { echo "${GRN}✓${RST} $*"; }
warn()  { echo "${YEL}!${RST} $*"; }
fail()  { echo "${RED}✗ $*${RST}" >&2; exit 1; }

# ── Args ─────────────────────────────────────────────────────────────
COMMIT_MSG=""
SKIP_GIT=false
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --no-commit) SKIP_GIT=true ;;
    --dry-run)   DRY_RUN=true ;;
    -h|--help)
      sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) COMMIT_MSG="$arg" ;;
  esac
done

run() {
  if $DRY_RUN; then
    echo "${DIM}[dry-run]${RST} $*"
  else
    eval "$@"
  fi
}

# ── Pre-flight ───────────────────────────────────────────────────────
step "Checking tools…"
command -v git    >/dev/null || fail "git not installed"
command -v gcloud >/dev/null || fail "gcloud not installed (https://cloud.google.com/sdk/docs/install)"
ok "git $(git --version | awk '{print $3}'), gcloud $(gcloud --version 2>/dev/null | head -1 | awk '{print $4}')"

step "Checking repo state…"
cd "$(git rev-parse --show-toplevel)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE="$(git remote get-url origin 2>/dev/null || true)"
if [[ "$REMOTE" != *"$EXPECTED_REMOTE"* ]]; then
  warn "Remote doesn't match $EXPECTED_REMOTE — got: $REMOTE"
fi
ok "branch=$BRANCH"

# Clean up stale .git/index.lock (left over when a prior git command was
# interrupted — harmless once no git process is running). pgrep returns
# non-zero if no process matches, hence the explicit check.
if [[ -f .git/index.lock ]]; then
  if pgrep -f "git " >/dev/null 2>&1; then
    fail "Found .git/index.lock and an active git process — wait for it to finish."
  else
    warn "Removing stale .git/index.lock (no active git process detected)."
    rm -f .git/index.lock
  fi
fi

# ── Git: stage / commit / push ───────────────────────────────────────
if ! $SKIP_GIT; then
  step "Staging changes…"
  run "git add -A"

  if [[ -z "$(git diff --cached --name-only)" ]]; then
    warn "No staged changes — skipping commit, will still push to make sure remote is current."
  else
    if [[ -z "$COMMIT_MSG" ]]; then
      COMMIT_MSG="Deploy $(date '+%Y-%m-%d %H:%M')"
    fi
    step "Committing: ${BOLD}$COMMIT_MSG${RST}"
    run "git commit -m \"$COMMIT_MSG\""
  fi

  step "Pushing to origin/$BRANCH…"
  run "git push origin $BRANCH"
  ok "Pushed."
else
  warn "Skipping git (--no-commit)."
fi

# ── Cloud Run deploy ─────────────────────────────────────────────────
step "Deploying to Cloud Run ($PROJECT_ID / $REGION)…"
run "gcloud run deploy $SERVICE_NAME \
  --source . \
  --region $REGION \
  --project $PROJECT_ID"

ok "Deploy complete."
echo "${BOLD}Service URL:${RST} https://${SERVICE_NAME}-9110064509.${REGION}.run.app"
