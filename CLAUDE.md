# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository deploys n8n (workflow automation platform) to a Kubernetes cluster using Kube-Hetzner with GitOps through ArgoCD. The setup includes Postgres database, External Secrets Operator (ESO) for secret management, and Traefik ingress with automatic TLS via cert-manager.

## Common Development Commands

### Building and Deploying
```bash
# Trigger n8n image build via GitHub Actions (manual workflow dispatch)
# Go to Actions tab > "Build and Push n8n (multi-arch)" > Run workflow
# Provide n8n_ref (e.g., "stable", "master", or version tag)

# Deploy via ArgoCD (after secrets are configured)
kubectl apply -f argocd/application.yaml

# Check deployment status
kubectl -n n8n get rollout n8n-rollout
kubectl -n n8n get pods
```

### Testing
```bash
# Install test dependencies
npm ci

# Run E2E tests (requires BASE_URL and auth credentials)
BASE_URL=https://n8n.quotennica.com \
  BASIC_AUTH_USER=admin \
  BASIC_AUTH_PASSWORD=password \
  npm run test:e2e

# Run specific browser tests
npx playwright test --project=chromium

# View test report
npm run test:e2e:report

# Optional test gates
RUN_WORKFLOW_CRUD=1 npm run test:e2e  # Run workflow CRUD tests
WEBHOOK_TEST_URL=https://... npm run test:e2e  # Test specific webhook
```

### Secret Management
```bash
# Create ESO source secrets (required before deployment)
kubectl create ns eso-secrets

kubectl -n eso-secrets create secret generic n8n \
  --from-literal=N8N_BASIC_AUTH_USER=admin \
  --from-literal=N8N_BASIC_AUTH_PASSWORD=change-me \
  --from-literal=N8N_ENCRYPTION_KEY=hex-key-here \
  --from-literal=N8N_WEBHOOK_SECRET=webhook-secret

kubectl -n eso-secrets create secret generic postgres \
  --from-literal=POSTGRES_DB=n8n \
  --from-literal=POSTGRES_USER=n8n \
  --from-literal=POSTGRES_PASSWORD=db-password

# For private GHCR images
kubectl -n n8n create secret docker-registry ghcr-creds \
  --docker-server=ghcr.io \
  --docker-username=GITHUB_USERNAME \
  --docker-password=GHCR_READ_TOKEN
```

### DNS Configuration
```bash
# Get Traefik LoadBalancer IP
kubectl -n kube-system get svc traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Update DNS record via Vercel
VERCEL_TOKEN=xxxxx ./dns/vercel-ensure-dns.sh quotennica.com n8n <LB_IP>
```

## Architecture

### Directory Structure
- `/kubernetes/base/` - Kubernetes manifests (Kustomize base)
  - `namespace.yaml` - n8n namespace definition
  - `external-secrets/` - ESO SecretStore and ExternalSecrets
  - `postgres/` - StatefulSet for Postgres database
  - `n8n/` - Rollout, ConfigMap, Service, Ingress for n8n
- `/argocd/` - ArgoCD Application manifest
- `/tests/e2e/` - Playwright E2E test suites
- `/.github/workflows/` - GitHub Actions for building n8n and running tests
- `/dns/` - Helper script for Vercel DNS management

### Key Components
1. **n8n Application**: Deployed as ArgoRollout with canary deployment strategy, single replica, uses PVC for `/home/node/.n8n`
2. **Postgres Database**: StatefulSet with Hetzner CSI volumes (10Gi PVC)
3. **External Secrets**: Pulls secrets from `eso-secrets` namespace via Kubernetes provider
4. **Ingress**: Traefik with cert-manager for automatic TLS (ClusterIssuer `letsencrypt`)
5. **Image Registry**: GHCR (ghcr.io) with multi-arch support (amd64, arm64)

### Configuration Points
- **n8n hostname**: Set in `kubernetes/base/n8n/configmap.yaml` (currently `n8n.quotennica.com`)
- **Image version**: Updated in `kubernetes/base/n8n/rollout.yaml` (line with `image:`)
- **Resource limits**: Defined in rollout.yaml (CPU/memory requests and limits)
- **Storage sizes**: PVCs in `n8n/pvc.yaml` and `postgres/statefulset.yaml`

### Testing Architecture
- Playwright E2E tests with multiple browser support (Chrome, Firefox, Safari, Mobile)
- Test categories:
  - `n8n.spec.ts` - Core functionality tests
  - `ui-smoke.spec.ts` - UI smoke tests
  - `security.spec.ts` - Security checks (redirects, headers)
  - `api.spec.ts` - API endpoint tests
  - `webhook.spec.ts` - Webhook functionality (opt-in)
  - `workflow-crud.spec.ts` - Workflow CRUD operations (opt-in)

## CI/CD Pipeline
1. **Image Build**: GitHub Actions workflow builds n8n from upstream repo, creates multi-arch image, pushes to GHCR
2. **GitOps Sync**: ArgoCD monitors this repo and auto-syncs Kubernetes manifests
3. **Rollout Strategy**: Argo Rollouts manages canary deployment with automated progression
4. **E2E Testing**: Manual workflow dispatch for running Playwright tests against deployed instance

## Dependencies and Prerequisites
- Kubernetes cluster with: Traefik, cert-manager, Hetzner CSI, ESO, ArgoCD, Argo Rollouts
- CLI tools: `kubectl`, `hcloud`, `vercel`, `gh`
- Node.js 20+ for running E2E tests
- Access to `.env.master` file (not in repo) for secret values