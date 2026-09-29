#!/usr/bin/env bash
# One-time Google Cloud setup for the Travels app (Firebase project travela-emre).
# Run it in Google Cloud Shell, signed in with the account that owns the project:
#   curl -sL https://raw.githubusercontent.com/mrshn/travel-app-website/main/scripts/setup-google-cloud.sh | bash
# Safe to run again: every step skips what already exists.
set -uo pipefail

P=travela-emre            # Firebase / Google Cloud project id
N=954018683436            # its project number
REPO=mrshn/travel-app-website
MAPS_KEY=AIzaSyCzkWA20wqmrvdgPwTtM0gpPWLK_FZa-P4
SA=github-deploy@$P.iam.gserviceaccount.com
SITES="https://mrshn.github.io/*,https://$P.firebaseapp.com/*,https://$P.web.app/*,http://localhost:3000/*"

say() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
ok() { printf '   \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '   \033[33m!\033[0m %s\n' "$1"; }

gcloud config set project "$P" >/dev/null 2>&1
TOKEN=$(gcloud auth print-access-token)
api() { curl -s -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $P" -H "Content-Type: application/json" "$@"; }

say "Turning on the Google services the app uses"
if gcloud services enable firestore.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com \
  firebasestorage.googleapis.com identitytoolkit.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  apikeys.googleapis.com tile.googleapis.com routes.googleapis.com cloudbilling.googleapis.com billingbudgets.googleapis.com >/dev/null 2>&1; then
  ok "Services on"
else
  warn "Some services need billing (map tiles, routes). The rest continues."
  gcloud services enable firestore.googleapis.com firebasehosting.googleapis.com firebaserules.googleapis.com \
    firebasestorage.googleapis.com identitytoolkit.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
    apikeys.googleapis.com cloudbilling.googleapis.com >/dev/null 2>&1 && ok "Core services on"
fi

say "Database (Firestore, Europe)"
if gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  ok "Already there"
elif gcloud firestore databases create --location=eur3 --quiet >/dev/null 2>&1; then
  ok "Created in eur3"
else
  warn "Could not create it; create it in the Firebase console: Firestore Database > Create database (production mode)"
fi

say "Website on Firebase Hosting"
R=$(api -X POST "https://firebasehosting.googleapis.com/v1beta1/projects/$P/sites?siteId=$P" -d '{}')
if echo "$R" | grep -q '"defaultUrl"\|ALREADY_EXISTS\|already exists'; then ok "https://$P.web.app and https://$P.firebaseapp.com"; else warn "$(echo "$R" | tr -d '\n' | cut -c1-200)"; fi

say "Google sign-in from the GitHub Pages address"
CONF=$(api "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config")
if echo "$CONF" | grep -q '"authorizedDomains"'; then
  BODY=$(echo "$CONF" | python3 -c 'import sys,json
d=json.load(sys.stdin).get("authorizedDomains",[])
for x in ["mrshn.github.io"]:
    d.append(x) if x not in d else None
print(json.dumps({"authorizedDomains":d}))')
  api -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/config?updateMask=authorizedDomains" -d "$BODY" >/dev/null && ok "mrshn.github.io allowed"
  if echo "$CONF" | grep -q '"google.com"' || api "https://identitytoolkit.googleapis.com/admin/v2/projects/$P/defaultSupportedIdpConfigs/google.com" | grep -q '"enabled": true'; then
    ok "Google sign-in is on"
  else
    warn "Turn on Google sign-in: Firebase console > Authentication > Sign-in method > Google > Enable"
  fi
else
  warn "Authentication isn't set up yet: Firebase console > Authentication > Get started > Google > Enable. Then run this script again."
fi

say "GitHub can publish the site (no passwords or keys stored anywhere)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub" --quiet >/dev/null 2>&1
gcloud iam workload-identity-pools providers describe github-repo --location=global --workload-identity-pool=github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github-repo --location=global --workload-identity-pool=github \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository=='$REPO'" --quiet >/dev/null 2>&1
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create github-deploy --display-name="GitHub deploy ($REPO)" --quiet >/dev/null 2>&1
sleep 5
for R in firebasehosting.admin firebaserules.admin firebasestorage.admin firebase.viewer datastore.viewer \
  serviceusage.serviceUsageConsumer serviceusage.serviceUsageViewer; do
  gcloud projects add-iam-policy-binding "$P" --member="serviceAccount:$SA" --role="roles/$R" --condition=None --quiet >/dev/null 2>&1
done
if gcloud iam service-accounts add-iam-policy-binding "$SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$N/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" \
  --quiet >/dev/null 2>&1; then ok "Only $REPO can publish"; else warn "Could not grant GitHub access; run the script again in a minute"; fi

say "Google Maps key: only your sites, only the map and route services"
KEYNAME=$(gcloud services api-keys lookup "$MAPS_KEY" --format='value(name)' 2>/dev/null)
if [ -n "$KEYNAME" ]; then
  KP=$(echo "$KEYNAME" | cut -d/ -f2)
  [ "$KP" != "$N" ] && gcloud services enable tile.googleapis.com routes.googleapis.com --project="$KP" >/dev/null 2>&1
  if gcloud services api-keys update "$KEYNAME" --allowed-referrers="$SITES" \
    --api-target=service=tile.googleapis.com --api-target=service=routes.googleapis.com --quiet >/dev/null 2>&1; then
    ok "Key locked to your sites"
  else
    warn "Could not update the key; in Google Cloud > APIs & Services > Credentials, restrict it to websites $SITES and to Map Tiles API + Routes API"
  fi
else
  warn "That Maps key isn't in a project this account can see"
fi

say "Billing and a spending alert"
BA=$(gcloud billing projects describe "$P" --format='value(billingAccountName)' 2>/dev/null)
if [ -n "$BA" ]; then
  ID=${BA#billingAccounts/}
  CUR=$(gcloud billing accounts describe "$ID" --format='value(currencyCode)' 2>/dev/null)
  case "$CUR" in TRY) AMT=200 ;; JPY) AMT=800 ;; *) AMT=5 ;; esac
  if gcloud billing budgets list --billing-account="$ID" --format='value(displayName)' 2>/dev/null | grep -q '^Travels app$'; then
    ok "Spending alert already set"
  elif gcloud billing budgets create --billing-account="$ID" --display-name="Travels app" --budget-amount="${AMT}${CUR}" \
    --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
    --filter-projects="projects/$P" --quiet >/dev/null 2>&1; then
    ok "Email alert if this project ever spends ${AMT} ${CUR} in a month"
  else
    warn "Set an alert yourself: Billing > Budgets & alerts > Create budget"
  fi
else
  warn "No billing on this project: sign-in and the database work for free; for photo backup and Google maps, upgrade to the Blaze plan in the Firebase console, then run this again"
fi

say "Photo storage"
B=$(api "https://firebasestorage.googleapis.com/v1beta/projects/$P/buckets" | grep -o '"name": *"[^"]*"' | head -1)
if [ -n "$B" ]; then ok "Ready ($B)"; else warn "Not set up: Firebase console > Storage > Get started (needs the Blaze plan). Photos then back up automatically."; fi

printf '\n\033[1mDone.\033[0m Tell Claude "done" (and paste anything marked with !).\n\n'
