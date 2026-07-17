# Sandbox d'exécution — L'Atelier

Images Docker éphémères et jailées pour exécuter du code utilisateur (JS/Python) dans L'Atelier.

## Images

- `caverne-sandbox-node:latest` — Node 22 Alpine, user non-root, réseau désactivé.
- `caverne-sandbox-python:latest` — Python 3.12 Alpine, même durcissement.

## Build

```bash
npm run sandbox:build
```

> **Docker non installé ?** L'Atelier bascule automatiquement en fallback `spawn` pour le JS (réseau bloqué via flags Node + net neutralizer). Le Python nécessite Docker.

## Durcissement (HostConfig Docker)

- `NetworkMode: none`
- `ReadonlyRootfs: true`
- `Tmpfs` limité à 16 Mo
- `Memory: 128m`, `NanoCpus: 0.5`
- `PidsLimit: 64`
- `CapDrop: ALL`, `no-new-privileges`
- User `1000:1000`

## Fallback

Si Docker n'est pas disponible : processus `node` isolé avec flags de restriction, `env` vide, tmpdir jetable, require de modules réseau/child_process bloqué. En production sans Docker, l'exécution est refusée.
