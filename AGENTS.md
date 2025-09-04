# Repository Guidelines

## Project Structure & Module Organization
- `kubernetes/base/`: Kustomize base with namespace, ExternalSecrets, Postgres, and n8n (PVC, ConfigMap, Rollout, Service, Ingress).
- `argocd/`: Argo CD `Application` pointing to `kubernetes/base`.
- `.github/workflows/`: CI to build multi-arch n8n images and push to GHCR.
- `dns/`: Vercel DNS helper script.
- Top-level `README.md`: end-to-end usage and environment notes.

## Build, Test, and Development Commands
- Render manifests (no cluster needed): `kubectl kustomize kubernetes/base` or `kustomize build kubernetes/base`.
- Dry-run apply: `kubectl apply -k kubernetes/base --dry-run=client -o yaml`.
- Deploy via Argo CD: `kubectl apply -f argocd/application.yaml`.
- DNS update: `VERCEL_TOKEN=... dns/vercel-ensure-dns.sh quotennica.com n8n <LB_IP>`.
- CI image build lives in `.github/workflows/build-n8n.yml` (manually dispatch with `n8n_ref`).

## Coding Style & Naming Conventions
- YAML: 2-space indentation; lowercase file names with hyphens (e.g., `externalsecret-n8n.yaml`).
- Kubernetes labels: prefer `app.kubernetes.io/*` and keep selectors consistent.
- Kustomize: add new resources under `kubernetes/base/kustomization.yaml` in stable, deterministic order.
- Keep secrets external; reference via ESO (`ExternalSecret`) and `envFrom/secretKeyRef` only.

## Testing Guidelines
- Lint/validate: `kubectl kustomize kubernetes/base | kubectl apply --dry-run=client -f -`.
- Optional linters: `yamllint` and `kubeconform` before submitting PRs.
- Prefer testing changes on a disposable cluster (kind/k3d) before Argo sync.

## Commit & Pull Request Guidelines
- Conventional Commits style is used in history: `feat|fix|chore|ci(scope): summary` (e.g., `fix(argocd): render via Kustomize`).
- Keep subject imperative, <= 72 chars; include relevant scope (`n8n`, `argocd`, `postgres`, `ci`).
- PRs must include: purpose + context, what changed, how to validate (commands above), risks/rollout notes; link issues if any.
- For manifest changes, paste `kustomize build` diff or summary and, if possible, Argo sync screenshot.

## Security & Configuration Tips
- Do not commit secrets; seed source secrets in `eso-secrets` and consume via ESO. Keep `.env.master` local.
- For private images, use `ghcr-creds` pull secret as documented; avoid embedding credentials in manifests.
- TLS and hostnames are configured in `n8n/configmap.yaml` and `n8n/ingress.yaml`; update both when changing domains.
