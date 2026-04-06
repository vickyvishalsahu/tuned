# Global Conventions

## Git Workflow
- All projects use `dev` (working) + `main` (release) branches
- Never commit directly to `main` — use the release script
- Commit messages follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`

## Package Manager
- Use **pnpm**, not npm

## New Project Setup
- Run `/init-project` to bootstrap a new project with the standard release script, branch structure, and pre-push hook
