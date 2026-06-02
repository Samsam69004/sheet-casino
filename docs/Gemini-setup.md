Guide rapide — Authentification Gemini / Vertex AI

But: obtenir un compte de service GCP, générer une clé JSON et tester l'appel predict.

Prérequis
- Installer `gcloud` et s'authentifier: `gcloud auth login`
- Avoir les droits pour créer un service account sur le projet GCP

Automatisation (recommandée)
1. Exécutez le script (remplacez `my-project`):

```bash
PROJECT=my-project SA_NAME=gemini-sa ./scripts/create_service_account.sh
```

2. Dans le shell, exportez la clé et variables :

```bash
export GOOGLE_APPLICATION_CREDENTIALS=./keys/gemini-sa-my-project.json
export GEMINI_PROJECT=my-project
export GEMINI_LOCATION=us-central1
export GEMINI_MODEL=gemini-1.0
```

3. Installez les dépendances et lancez le test :

```bash
npm install
npm run test:gemini
```

Manuel (si pas de `gcloud`)
- Allez sur https://console.cloud.google.com/ → sélectionnez le projet
- APIs & Services → Activer l'API "Vertex AI" (aiplatform.googleapis.com)
- IAM & Admin → Service Accounts → Create Service Account → donnez un nom
- After creating, Grant roles: `AI Platform User` (roles/aiplatform.user) and optionally `Storage Object Viewer`
- Create key (JSON) and téléchargez-la, placez-la dans `./keys/` et exportez `GOOGLE_APPLICATION_CREDENTIALS`

Sécurité
- Ne commitez jamais la clé JSON. `.gitignore` du projet ignore déjà `.env*.local` mais ajoutez `keys/` si besoin.

Problèmes courants
- Erreur 403: vérifiez que le service account a bien les rôles requis et que l'API Vertex AI est activée.
- Erreur d'endpoint: assurez-vous que `GEMINI_ENDPOINT` correspond à la localisation du modèle (ex: `https://us-central1-aiplatform.googleapis.com/v1`).
