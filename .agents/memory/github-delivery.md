---
name: GitHub delivery verification
description: Authorized GitHub API access can work when command-line authentication fails; verify content independently of commit IDs
---
Command-line Git authentication and the authorized GitHub App connection can have different availability. A rejected CLI push does not establish that the already-authorized App cannot write the repository.

**Why:** CLI push rejected its credentials while the existing GitHub App connection successfully wrote the same repository.

**How to apply:** Use the authorized connection when appropriate instead of requesting raw credentials. For API-based Git delivery, compare complete tree hashes to prove source fidelity; identical trees can have different commit hashes because commit metadata is not identical. Never claim identical commit IDs without checking them.
