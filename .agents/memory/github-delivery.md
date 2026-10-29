---
name: GitHub delivery verification
description: Authorized GitHub API access can work when command-line authentication fails; verify content independently of commit IDs
---
Command-line Git authentication and the authorized GitHub App connection can have different availability. A rejected CLI push does not establish that the already-authorized App cannot write the repository.

**Why:** CLI push rejected its credentials while the existing GitHub App connection successfully wrote the same repository.

**How to apply:** Use the authorized connection when appropriate instead of requesting raw credentials. For API-based Git delivery, compare complete tree hashes to prove source fidelity; identical trees can have different commit hashes because commit metadata is not identical. Never claim identical commit IDs without checking them.

Workflow-file writes can be rejected with 404 while ordinary Git blobs and trees remain writable. Isolate the failing path before diagnosing the entire connection as broken. Existing workflow entry points can call extended package scripts without weakening their checks.

**Why:** A complete tree write failed until the workflow-file modification was excluded; a minimal unchanged tree and the remaining source tree both succeeded. Parallel blob uploads also hit the proxy's RPS limit.

**How to apply:** Keep workflow protections intact, use existing script entry points where suitable, throttle bulk writes and honor 429 retry delays.
