#!/usr/bin/env node
// Test script: obtain an access token from a service account and call Gemini (Vertex AI) predict
// Usage: set GOOGLE_APPLICATION_CREDENTIALS, GEMINI_PROJECT, GEMINI_LOCATION, GEMINI_MODEL (or use defaults in .env.local)

const {GoogleAuth} = require('google-auth-library');

async function main() {
  const project = process.env.GEMINI_PROJECT;
  const location = process.env.GEMINI_LOCATION || 'us-central1';
  const model = process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_NAME || 'gemini-1.0';
  const endpoint = process.env.GEMINI_ENDPOINT || 'https://us-central1-aiplatform.googleapis.com/v1';

  if (!project) {
    console.error('Error: set GEMINI_PROJECT env var (your GCP project id)');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Error: set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON file');
    process.exit(1);
  }

  const auth = new GoogleAuth({scopes: ['https://www.googleapis.com/auth/cloud-platform']});
  const client = await auth.getClient();
  const res = await client.getAccessToken();
  const token = res.token || res; // google-auth-library may return string or object

  if (!token) {
    console.error('Failed to obtain access token');
    process.exit(1);
  }

  const url = `${endpoint}/projects/${project}/locations/${location}/models/${model}:predict`;

  const body = {
    instances: [{content: 'Teste l authentification et réponds en français: salut'}],
    parameters: {temperature: 0.2}
  };

  const fetch = global.fetch || (await import('node-fetch')).default;

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await r.text();
  console.log('Status:', r.status);
  try {
    console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
  } catch (e) {
    console.log('Response text:', data);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
