#!/usr/bin/env bash
# One-time Google Cloud + Firebase setup for the Travels app (Firebase project travela-emre).
#
# Run it in a terminal, on your computer or in Cloud Shell (https://shell.cloud.google.com/?show=terminal):
#   curl -sL https://raw.githubusercontent.com/mrshn/travel-app-website/main/scripts/setup-google-cloud.sh | bash
#
# If the terminal isn't signed in to the Google account that owns the project, it asks you to sign in,
# in a separate gcloud profile ("travels") so the account your other projects use stays as it is.
# Safe to run again: every step skips what's already done.
#
# Answers can also be given up front (for running it from Claude Code or another tool, where nobody
# can type into the prompts):
#   TRAVELS_BILLING_ACCOUNT=<billing account id>   link this billing account (the Blaze plan), or "skip"
#   TRAVELS_LOCK_SIGNUP=yes                        after your first sign-in: no other Google account may sign up
set -o pipefail # (no -u: macOS still ships bash 3.2)

P=travela-emre                                    # Firebase / Google Cloud project id
N=954018683436                                    # its project number
APP_ID=1:954018683436:web:6a47cbcd569f4f82c80f89  # the web app registered in Firebase
REPO=mrshn/travel-app-website                     # the only repository allowed to publish the site
MAPS_KEY=AIzaSyCzkWA20wqmrvdgPwTtM0gpPWLK_FZa-P4   # Google Maps Platform key the app uses (browser key)
SA=github-deploy@$P.iam.gserviceaccount.com
SITES="https://mrshn.github.io/*,https://$P.firebaseapp.com/*,https://$P.web.app/*,http://localhost:3000/*"
ORIGINS="\"https://$P.firebaseapp.com\",\"https://$P.web.app\",\"https://mrshn.github.io\",\"http://localhost:3000\""
DB_LOCATION=eur3            # the database lives in Europe
BUCKET_LOCATION=US-CENTRAL1 # photo storage is free (up to 5 GB) only in a few US regions
TILES_PER_DAY=4000          # hard daily caps on the Maps key's project, below the free tiers
ROUTES_PER_DAY=300

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; D=$'\033[2m'; X=$'\033[0m'
say()  { printf '\n%s== %s%s\n' "$B" "$1" "$X"; }
ok()   { printf '   %s✓%s %s\n' "$G" "$X" "$1"; }
note() { printf '   %s%s%s\n' "$D" "$1" "$X"; }
LEFT=()
todo() { LEFT+=("$1"); printf '   %s!%s %s\n' "$Y" "$X" "$1"; }
lastline() { tr -d '\r' | grep -v '^[[:space:]]*$' | tail -1 | cut -c1-240; }
# Someone is watching this terminal (not a tool capturing the output).
interactive() { [ -t 1 ] && { : </dev/tty; } 2>/dev/null; }
# Asks on the terminal even though the script itself arrives through a pipe; no answer when nobody can type.
ask() { REPLY=''; interactive || return 0; { printf '   %s ' "$1" >/dev/tty && read -r REPLY </dev/tty; } 2>/dev/null || REPLY=''; }

if ! command -v gcloud >/dev/null 2>&1; then
  echo "This needs the Google Cloud CLI (gcloud). Easiest: run the same line in Cloud Shell: https://shell.cloud.google.com/?show=terminal"
  exit 1
fi
export CLOUDSDK_CORE_PROJECT=$P

# ---------------------------------------------------------------------------------------------
say "Google account"
can_open() { gcloud projects describe "$P" --format='value(projectId)' >/dev/null 2>&1; }
if ! can_open; then
  gcloud config configurations describe travels >/dev/null 2>&1 ||
    gcloud config configurations create travels --no-activate >/dev/null 2>&1
  export CLOUDSDK_ACTIVE_CONFIG_NAME=travels
  if ! can_open; then
    note "Sign in with the Google account that owns $P (the one you use in the Firebase console)."
    note "A browser window opens: pick that account and allow access, then come back here."
    if interactive; then gcloud auth login --brief </dev/tty; else gcloud auth login --brief </dev/null; fi
  fi
fi
if ! can_open; then
  echo "   The account $(gcloud config get-value account 2>/dev/null) can't open $P."
  echo "   Run this again and sign in with the account that owns it."
  exit 1
fi
ACCOUNT=$(gcloud config get-value account 2>/dev/null)
ok "Signed in as $ACCOUNT"

TOKEN=$(gcloud auth print-access-token 2>/dev/null)
api() { curl -sS -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $P" -H "Content-Type: application/json" "$@"; }
PY=$(gcloud info --format='value(basic.python_location)' 2>/dev/null)
[ -x "${PY:-}" ] || PY=$(command -v python3 || true)
# Reads JSON from stdin as `d` and runs the given Python.
js() { "$PY" -c "import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
$1"; }
errmsg() { js 'e = d.get("error") or {}; print(e.get("message", "") if isinstance(e, dict) else e)'; }

# ---------------------------------------------------------------------------------------------
say "Google services the app uses"
SERVICES="firebase.googleapis.com firestore.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com
  firebasestorage.googleapis.com storage.googleapis.com identitytoolkit.googleapis.com iam.googleapis.com
  iamcredentials.googleapis.com sts.googleapis.com apikeys.googleapis.com serviceusage.googleapis.com
  cloudresourcemanager.googleapis.com cloudbilling.googleapis.com billingbudgets.googleapis.com"
if OUT=$(gcloud services enable $SERVICES --quiet 2>&1); then
  ok "On"
else
  FAILED=""
  for s in $SERVICES; do gcloud services enable "$s" --quiet >/dev/null 2>&1 || FAILED="$FAILED $s"; done
  if [ -z "$FAILED" ]; then ok "On"; else todo "Could not turn on:$FAILED ($(echo "$OUT" | lastline))"; fi
fi

# ---------------------------------------------------------------------------------------------
say "Billing (the Blaze plan: needed for photo backup and Google Maps)"
billing_on() { [ "$(gcloud billing projects describe "$P" --format='value(billingEnabled)' 2>/dev/null)" = "True" ]; }
if billing_on; then
  ok "On"
else
  LIST=$(gcloud billing accounts list --filter='open=true' --format='value(name,displayName)' 2>/dev/null)
  if [ -z "$LIST" ]; then
    todo "No billing account yet. Add one in the Firebase console (Usage and billing > Modify plan > Blaze, needs a card): https://console.firebase.google.com/project/$P/usage/details then run this again."
  else
    i=0; IDS=()
    while IFS=$'\t' read -r name dn; do
      i=$((i + 1)); IDS+=("${name#billingAccounts/}")
      note "$i) $dn (${name#billingAccounts/})"
    done <<<"$LIST"
    note "Linking one puts $P on the Blaze plan (pay as you go). One person stays inside the free tiers,"
    note "and this script also adds an email alert and daily caps."
    PICK=""
    if [ -n "${TRAVELS_BILLING_ACCOUNT:-}" ]; then
      [ "$TRAVELS_BILLING_ACCOUNT" != skip ] && PICK=$TRAVELS_BILLING_ACCOUNT
    else
      ask "Link which billing account? Type its number, or press Enter to skip:"
      if [[ "$REPLY" =~ ^[0-9]+$ ]] && [ "$REPLY" -ge 1 ] && [ "$REPLY" -le "$i" ]; then PICK=${IDS[$((REPLY - 1))]}; fi
    fi
    if [ -n "$PICK" ]; then
      if OUT=$(gcloud billing projects link "$P" --billing-account="$PICK" --quiet 2>&1); then
        ok "Linked: $P is on the Blaze plan"
      else
        todo "Could not link it: $(echo "$OUT" | lastline)"
      fi
    elif [ -z "${TRAVELS_BILLING_ACCOUNT:-}" ] && ! interactive; then
      todo "Billing not linked yet: run again with TRAVELS_BILLING_ACCOUNT=<one of the ids above> to link it."
    else
      todo "Billing skipped: photo backup stays off until you link a billing account (run this again)."
    fi
  fi
fi
BILLING=no; billing_on && BILLING=yes

# ---------------------------------------------------------------------------------------------
say "Database (Firestore, $DB_LOCATION)"
if gcloud firestore databases describe --database='(default)' --format='value(name)' >/dev/null 2>&1; then
  ok "Ready"
elif OUT=$(gcloud firestore databases create --location="$DB_LOCATION" --quiet 2>&1) || echo "$OUT" | grep -qi 'already exists'; then
  ok "Created"
else
  todo "Could not create it: $(echo "$OUT" | lastline)"
fi

# ---------------------------------------------------------------------------------------------
say "Google sign-in"
google_on() { api "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/defaultSupportedIdpConfigs/google.com" | grep -q '"enabled": *true'; }
if google_on; then
  ok "On"
else
  BODY=$(cat <<EOF
{"appNamespace": "$APP_ID", "parent": "projects/$P", "webInput": {},
 "firebaseAuthInput": {"googleSigninProviderMode": "PROVIDER_ENABLED",
  "googleSigninProviderConfig": {"publicDisplayName": "Travels", "customerSupportEmail": "$ACCOUNT",
   "oauthRedirectUris": ["https://$P.firebaseapp.com/__/auth/handler", "https://$P.web.app/__/auth/handler"]}}}
EOF
  )
  OP=$(api -X POST "https://firebase.googleapis.com/v1alpha/firebase:provisionFirebaseApp" -d "$BODY")
  NAME=$(echo "$OP" | js 'print(d.get("name", ""))')
  ERR=$(echo "$OP" | errmsg)
  if [ -n "$NAME" ]; then
    for _ in $(seq 1 40); do
      R=$(api "https://firebase.googleapis.com/v1beta1/$NAME")
      [ "$(echo "$R" | js 'print(d.get("done", False))')" = "True" ] && break
      sleep 3
    done
    ERR=$(echo "$R" | errmsg)
  fi
  if google_on; then
    ok "Turned on"
  else
    [ -n "$ERR" ] && note "$ERR"
    todo "Turn on Google sign-in in the console: https://console.firebase.google.com/project/$P/authentication/providers (Get started > Google > Enable > Save), then run this again."
  fi
fi
CONF=$(api "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config")
if echo "$CONF" | grep -q '"authorizedDomains"'; then
  if echo "$CONF" | grep -q '"mrshn.github.io"'; then
    ok "The GitHub Pages address may sign in too"
  else
    BODY=$(echo "$CONF" | js 'l = d.get("authorizedDomains", []); l.append("mrshn.github.io"); print(json.dumps({"authorizedDomains": l}))')
    if api -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=authorizedDomains" -d "$BODY" | grep -q '"mrshn.github.io"'; then
      ok "The GitHub Pages address may sign in too"
    else
      todo "Could not add mrshn.github.io to Authentication > Settings > Authorized domains"
    fi
  fi
  # Once you have signed in to the app, nobody else needs an account.
  LOCKED=$(echo "$CONF" | js 'print(((d.get("client") or {}).get("permissions") or {}).get("disabledUserSignup", False))')
  USERS=$(api -X POST "https://identitytoolkit.googleapis.com/v1/projects/$P/accounts:query" -d '{"returnUserInfo": false}' | js 'print(d.get("recordsCount", "0"))')
  if [ "$LOCKED" = "True" ]; then
    ok "Locked to your account (no new sign-ups)"
  elif [ "${USERS:-0}" -ge 1 ] 2>/dev/null; then
    if [ -n "${TRAVELS_LOCK_SIGNUP:-}" ]; then REPLY=$TRAVELS_LOCK_SIGNUP
    elif interactive; then ask "You have signed in to the app. Lock it so no other Google account can sign up? [Y/n]"
    else REPLY=no; note "You've signed in to the app: run again with TRAVELS_LOCK_SIGNUP=yes to lock sign-up to your account."
    fi
    if [[ "$REPLY" =~ ^([Yy]|$) ]]; then
      api -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=client.permissions.disabledUserSignup" \
        -d '{"client": {"permissions": {"disabledUserSignup": true}}}' | grep -q 'disabledUserSignup' && ok "Locked to your account"
    fi
  else
    note "Tip: after you first sign in to the app, run this again to lock sign-in to your account."
  fi
fi

# ---------------------------------------------------------------------------------------------
say "Website (Firebase Hosting)"
if api "https://firebasehosting.googleapis.com/v1beta1/projects/$P/sites" | grep -q 'DEFAULT_SITE'; then
  ok "https://$P.web.app"
else
  R=$(api -X POST "https://firebasehosting.googleapis.com/v1beta1/projects/$P/sites?siteId=$P" -d "{\"appId\": \"$APP_ID\"}")
  if echo "$R" | grep -q '"defaultUrl"'; then ok "Created https://$P.web.app"; else todo "Could not create the site: $(echo "$R" | errmsg)"; fi
fi

# ---------------------------------------------------------------------------------------------
say "Publishing from GitHub (keyless: only $REPO can deploy)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub" --quiet >/dev/null 2>&1
gcloud iam workload-identity-pools providers describe github-repo --location=global --workload-identity-pool=github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github-repo --location=global --workload-identity-pool=github \
    --display-name="$REPO" --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'" --quiet >/dev/null 2>&1
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-deploy --display-name="GitHub deploy ($REPO)" --quiet >/dev/null 2>&1
FAILED=""
for _ in 1 2 3; do
  FAILED=""
  for R in firebasehosting.admin firebaserules.admin firebasestorage.admin firebase.viewer datastore.viewer \
    serviceusage.serviceUsageConsumer serviceusage.serviceUsageViewer; do
    gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA" --role="roles/$R" --condition=None --quiet >/dev/null 2>&1 || FAILED="$FAILED $R"
  done
  gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser --quiet \
    --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" >/dev/null 2>&1 || FAILED="$FAILED workloadIdentityUser"
  [ -z "$FAILED" ] && break
  sleep 10 # a new service account can take a few seconds to show up
done
if [ -z "$FAILED" ]; then ok "Ready"; else todo "Some permissions didn't apply ($FAILED); run this again in a minute."; fi

# ---------------------------------------------------------------------------------------------
say "Google Maps key"
KEYNAME=$(gcloud services api-keys lookup "$MAPS_KEY" --format='value(name)' 2>/dev/null)
if [ -z "$KEYNAME" ]; then
  todo "This account can't see the Maps key. Was it made with another Google account? Then run this there too, or make a new key in $P."
else
  KPN=$(echo "$KEYNAME" | cut -d/ -f2)
  KP=$(gcloud projects describe "$KPN" --format='value(projectId)' 2>/dev/null)
  KP=${KP:-$KPN}
  note "The key belongs to project $KP"
  if [ "$(gcloud billing projects describe "$KP" --format='value(billingEnabled)' 2>/dev/null)" != "True" ]; then
    todo "Project $KP has no billing, so Google Maps won't answer. Link billing to it (run this again after the Blaze step if it's $P)."
  elif OUT=$(gcloud services enable tile.googleapis.com routes.googleapis.com --project="$KP" --quiet 2>&1); then
    ok "Map Tiles API and Routes API on"
  else
    todo "Could not turn on the Maps APIs: $(echo "$OUT" | lastline)"
  fi
  if OUT=$(gcloud services api-keys update "$KEYNAME" --allowed-referrers="$SITES" \
    --api-target=service=tile.googleapis.com --api-target=service=routes.googleapis.com --quiet 2>&1); then
    ok "Key only works from your sites, and only for maps and routes"
  else
    todo "Could not restrict the key: $(echo "$OUT" | lastline)"
  fi
  # Daily caps (where Google offers them), so a copied key can't run up a bill.
  CAPPED=0
  for PAIR in "tile.googleapis.com:$TILES_PER_DAY" "routes.googleapis.com:$ROUTES_PER_DAY"; do
    S=${PAIR%%:*}; V=${PAIR##*:}
    LIMITS=$(api "https://serviceusage.googleapis.com/v1beta1/projects/$KP/services/$S/consumerQuotaMetrics?view=FULL" | js '
for m in d.get("metrics", []):
    for l in m.get("consumerQuotaLimits", []):
        if l.get("unit") == "1/d/{project}":
            o = next((b.get("consumerOverride") for b in l.get("quotaBuckets", []) if b.get("consumerOverride")), None)
            print(l["name"] + "\t" + (o["name"] if o else "") + "\t" + (o.get("overrideValue", "") if o else ""))')
    while IFS=$'\t' read -r LIM OV CUR; do
      [ -z "$LIM" ] && continue
      if [ -n "$OV" ] && [ "$CUR" = "$V" ]; then CAPPED=$((CAPPED + 1)); continue; fi
      if [ -n "$OV" ]; then
        R=$(api -X PATCH "https://serviceusage.googleapis.com/v1beta1/$OV?force=true" -d "{\"overrideValue\": \"$V\"}")
      else
        R=$(api -X POST "https://serviceusage.googleapis.com/v1beta1/$LIM/consumerOverrides?force=true" -d "{\"overrideValue\": \"$V\"}")
      fi
      echo "$R" | grep -q '"name"' && CAPPED=$((CAPPED + 1))
    done <<<"$LIMITS"
  done
  if [ "$CAPPED" -gt 0 ]; then ok "Daily caps set ($TILES_PER_DAY map tiles, $ROUTES_PER_DAY routes)"; else note "No daily caps offered for these APIs; the spending alert below covers them."; fi
fi

# ---------------------------------------------------------------------------------------------
say "Spending alert"
BA=$(gcloud billing projects describe "$P" --format='value(billingAccountName)' 2>/dev/null)
if [ -n "$BA" ]; then
  ID=${BA#billingAccounts/}
  CUR=$(gcloud billing accounts describe "$ID" --format='value(currencyCode)' 2>/dev/null)
  case "$CUR" in TRY) AMT=200 ;; JPY) AMT=800 ;; INR) AMT=400 ;; *) AMT=5 ;; esac
  if gcloud billing budgets list --billing-account="$ID" --billing-project="$P" --format='value(displayName)' 2>/dev/null | grep -q '^Travels app$'; then
    ok "Already set"
  elif OUT=$(gcloud billing budgets create --billing-account="$ID" --billing-project="$P" --display-name="Travels app" \
    --budget-amount="${AMT}${CUR}" --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
    --filter-projects="projects/$P" --quiet 2>&1); then
    ok "You get an email if $P ever costs more than $AMT $CUR in a month"
  else
    todo "Could not add it ($(echo "$OUT" | lastline)). Add one: https://console.cloud.google.com/billing/$ID/budgets"
  fi
else
  note "Comes with billing."
fi

# ---------------------------------------------------------------------------------------------
say "Photo storage"
bucket_of() { js 'print(((d.get("bucket") or {}).get("name") or "").split("/")[-1])'; }
BUCKET=$(api "https://firebasestorage.googleapis.com/v1alpha/projects/$P/defaultBucket" | bucket_of)
if [ -z "$BUCKET" ] && [ "$BILLING" = yes ]; then
  R=$(api -X POST "https://firebasestorage.googleapis.com/v1alpha/projects/$P/defaultBucket" -d "{\"location\": \"$BUCKET_LOCATION\"}")
  BUCKET=$(echo "$R" | bucket_of)
  [ -z "$BUCKET" ] && note "$(echo "$R" | errmsg)"
fi
if [ -n "$BUCKET" ]; then
  ok "Bucket $BUCKET"
  CORS=$(mktemp)
  echo "[{\"origin\": [$ORIGINS], \"method\": [\"GET\"], \"responseHeader\": [\"Content-Type\"], \"maxAgeSeconds\": 3600}]" >"$CORS"
  if gcloud storage buckets update "gs://$BUCKET" --cors-file="$CORS" --quiet >/dev/null 2>&1 || gsutil cors set "$CORS" "gs://$BUCKET" >/dev/null 2>&1; then
    ok "The app may download your photos"
  else
    todo "Could not set CORS on gs://$BUCKET (photos upload fine but won't download on a new device)"
  fi
  rm -f "$CORS"
elif [ "$BILLING" = yes ]; then
  todo "Could not create it; open https://console.firebase.google.com/project/$P/storage and click Get started (location $BUCKET_LOCATION)."
else
  note "Comes with billing."
fi

# ---------------------------------------------------------------------------------------------
say "Summary"
if [ ${#LEFT[@]} -eq 0 ]; then
  ok "All set. Tell Claude \"done\"."
else
  echo "   Still open:"
  for x in "${LEFT[@]}"; do echo "   - $x"; done
  echo "   Paste this summary to Claude."
fi
echo
