Overview

This repo provides a production-ready setup to run n8n on a Kube-Hetzner (k3s) cluster using:
- Docker Buildx (multi-arch) building from the official n8n repo.
- Argo CD GitOps to deploy Kubernetes manifests.
- External Secrets Operator (ESO) for secret material.
- Traefik Ingress + cert-manager (ClusterIssuer `letsencrypt`).
- Hetzner CSI for persistent volumes.

What’s included
- GitHub Actions workflow to build/push multi-arch n8n images to GHCR.
- Kubernetes manifests for Postgres + n8n (with PVCs, probes, resources).
- ESO wiring to source secrets from a dedicated namespace.
- Argo CD `Application` to sync this repo.
- Helper script to manage DNS with the Vercel CLI.

Requirements
- Cluster from Kube-Hetzner with: Traefik, cert-manager (ClusterIssuer `letsencrypt`), Hetzner CSI, ESO, Argo CD, Argo Rollouts.
- CLI access: `hcloud`, `kubectl`, `vercel`, `gh`.
- Access to `.env.master` (not committed) to source values.

Image build and registry
- Workflow: `.github/workflows/build-n8n.yml` builds from `n8n-io/n8n` using Docker Buildx for `linux/amd64,linux/arm64` and pushes to `ghcr.io/<owner>/n8n`.
- Trigger: run the workflow manually and provide an upstream ref (e.g. `stable` or a version tag) or push a `release-*` tag here.
- Tags: `latest`, resolved n8n version, and the requested ref.
- Visibility: In GHCR, mark the `n8n` package public, or create an imagePullSecret in the `n8n` namespace and reference it on the Rollout.

Secrets with ESO
This setup uses ESO’s `kubernetes` provider to read source secrets from a dedicated namespace (`eso-secrets`). Create two source secrets:

1) Source secret for n8n
Namespace: `eso-secrets`
Name: `n8n`
Keys (example values come from your `.env.master`):
- `N8N_BASIC_AUTH_USER`
- `N8N_BASIC_AUTH_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `N8N_WEBHOOK_SECRET`

2) Source secret for Postgres
Namespace: `eso-secrets`
Name: `postgres`
Keys:
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Commands to create the source secrets (example):
kubectl create ns eso-secrets || true
kubectl -n eso-secrets create secret generic n8n \
  --from-literal=N8N_BASIC_AUTH_USER=admin \
  --from-literal=N8N_BASIC_AUTH_PASSWORD=change-me \
  --from-literal=N8N_ENCRYPTION_KEY=replace-with-hex-key \
  --from-literal=N8N_WEBHOOK_SECRET=change-me

kubectl -n eso-secrets create secret generic postgres \
  --from-literal=POSTGRES_DB=n8n \
  --from-literal=POSTGRES_USER=n8n \
  --from-literal=POSTGRES_PASSWORD=strong-db-pass

Note: If your ESO controller uses a different service account/namespace, update `kubernetes/base/external-secrets/secretstore.yaml` accordingly.

Kubernetes deployment
Manifests live under `kubernetes/base` and include:
- Namespace: `n8n`
- Postgres: StatefulSet + PVC (SC `hcloud-volumes`), Service
- n8n: Rollout (single replica) + PVC, ConfigMap, Service, Ingress (Traefik + cert-manager)
- ESO: ClusterSecretStore and two ExternalSecrets (n8n, postgres)

Key tunables
- n8n hostname and base URL are set in `n8n/configmap.yaml` for `n8n.quotennica.com`.
- Persistent storage: `n8n` uses a PVC at `/home/node/.n8n`; `postgres` uses a 10Gi PVC.
- Resources and probes are set with conservative defaults; adjust for workload.

Argo CD
- Apply the Argo CD `Application` to let Argo reconcile resources:
  kubectl apply -f argocd/application.yaml

DNS with Vercel
Use `dns/vercel-ensure-dns.sh` to point `n8n.quotennica.com` to your Traefik LoadBalancer IP.
1) Retrieve LB IP (examples):
   kubectl -n kube-system get svc traefik -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
   # or via Hetzner LB as configured by your Kube-Hetzner module
2) Create/update DNS A record:
   VERCEL_TOKEN=xxxxx ./dns/vercel-ensure-dns.sh quotennica.com n8n <LB_IP>

End-to-end bring-up
1) Build and push image
   - Run the GitHub Actions workflow "Build and Push n8n (multi-arch)" with `n8n_ref=stable` (or a tag).
   - Make the GHCR package public (or add an imagePullSecret to the Rollout).

2) Seed ESO source secrets
   - Create `eso-secrets` namespace and the two source secrets as shown above.

3) Deploy via Argo CD
   - `kubectl apply -f argocd/application.yaml`
   - Wait for Argo to sync; confirm Postgres and n8n become healthy.

4) DNS and TLS
   - Point `n8n.quotennica.com` to the Traefik LB IP using the helper script.
   - cert-manager (ClusterIssuer `letsencrypt`) provisions TLS (`secretName: n8n-tls`).

5) Access
   - Visit `https://n8n.quotennica.com` and authenticate with the basic auth credentials.

Notes
- Argo Rollouts: The provided canary steps work as a basic progressive rollout. For true traffic-splitting, integrate a supported traffic router (e.g., Istio, NGINX Ingress controller with Rollouts plugin).
- Backups: Consider snapshotting the Hetzner CSI volumes or using an operator for Postgres backups.
- Monitoring: Prometheus/Grafana are assumed present; add scrape annotations as needed.
- Security: Keep `.env.master` out of Git. Migrate to a cloud secret manager (e.g., Vault, 1Password, AWS SM) with ESO in production.

