#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   PROJECT=my-gcp-project SA_NAME=gemini-sa ./scripts/create_service_account.sh
# This script enables required APIs, creates a service account, grants roles, and
# generates a key file at ./keys/<sa>-<project>.json.

PROJECT=${PROJECT:-}
SA_NAME=${SA_NAME:-gemini-sa}
KEY_DIR=${KEY_DIR:-./keys}

if [[ -z "$PROJECT" ]]; then
  echo "Error: set PROJECT environment variable to your GCP project id. Example: PROJECT=my-project $0"
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI not found. Install it and authenticate (gcloud auth login)."
  exit 1
fi

echo "Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com iam.googleapis.com --project "$PROJECT"

SA_EMAIL="$SA_NAME@$PROJECT.iam.gserviceaccount.com"

# Create service account if it doesn't exist
if gcloud iam service-accounts list --project "$PROJECT" --format="value(email)" | grep -q "^${SA_EMAIL}$"; then
  echo "Service account $SA_EMAIL already exists"
else
  echo "Creating service account $SA_EMAIL"
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT" --display-name "Service account for Gemini/Vertex AI"
fi

# Grant roles: aiplatform.user and storage.objectViewer (common minimal roles)
echo "Granting roles to $SA_EMAIL"
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA_EMAIL" --role "roles/aiplatform.user" || true
gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$SA_EMAIL" --role "roles/storage.objectViewer" || true

# Create keys directory and generate key
mkdir -p "$KEY_DIR"
KEY_FILE="$KEY_DIR/${SA_NAME}-${PROJECT}.json"

if [[ -f "$KEY_FILE" ]]; then
  echo "Key file already exists at $KEY_FILE"
else
  echo "Creating key and saving to $KEY_FILE"
  gcloud iam service-accounts keys create "$KEY_FILE" --iam-account "$SA_EMAIL" --project "$PROJECT"
fi

cat <<EOF
Done.
Next steps:
  1) Export the credential path in your shell:
     export GOOGLE_APPLICATION_CREDENTIALS=$KEY_FILE
  2) Export the project and other vars used by the test script:
     export GEMINI_PROJECT=$PROJECT
     export GEMINI_LOCATION=us-central1
     export GEMINI_MODEL=gemini-1.0
  3) Run the test script:
     npm run test:gemini

Keep the key file secure. Do NOT commit it to git.
EOF
