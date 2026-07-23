# CLAUDE.md

Permanent rules for working in this repository.

- The authoritative product requirements are in `docs/MASTER_SPEC.md`.
- Work one implementation phase at a time.
- Use strict TypeScript.
- Never fake functionality.
- Never fake body measurements or AI accuracy.
- Never expose secrets or privileged API keys client-side.
- Safety rules must override AI-generated recommendations.
- Important domain logic must be tested.
- Significant programme changes must be auditable.
- Never silently remove or ignore a requirement.
- Deferred requirements must be recorded in `docs/DEFERRED.md`.
- Before declaring work complete, run type checking, linting and relevant tests.
- Do not build later phases unless explicitly instructed.
