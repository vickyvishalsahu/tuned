---
description: Commit staged and unstaged changes with a conventional commit message
disable-model-invocation: true
---

# /commit - Smart Conventional Commit

Analyze all current changes and create a well-crafted conventional commit.

## Commit philosophy — non-negotiable

**One file or one logical unit, committed immediately when it works.**

- Max ~40 changed lines per commit (generated files like lock files are exempt)
- Commit as you go — the moment a piece compiles or a fix works, commit it
- Never build multiple things then commit at the end of a session
- If you'd describe the commit using "and" → it must be split

This rule exists because it has been violated repeatedly. It is not a guideline.

**Messages must be minimal and clean:**
- Subject line ≤ 50 chars (hard cap 72)
- No filler words: "update", "changes", "misc", "stuff", "various fixes" are banned
- No body unless the *why* is genuinely non-obvious from the diff
- Never mention Claude, AI, tools, or assistants in any part of the message

## Instructions

### Phase 1: Analyze Changes

Run in parallel:
- `git status` — all changed, staged, and untracked files
- `git diff` — unstaged changes
- `git diff --cached` — staged changes
- `git log --oneline -10` — recent commit style

Identify relevant files:
- Exclude `.env`, `credentials.json`, secrets — warn the user if staged
- Check if changes form one logical unit or should be split (see philosophy above)

### Phase 2: Determine Commit Type

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `ref` | Restructuring with no behavior change |
| `test` | Tests only |
| `docs` | Documentation only |
| `chore` | Deps, config, tooling |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |

Rules:
- If changes span multiple types → split the commit, or use the most impactful type only if splitting is truly impractical
- Tests accompanying a feature → `feat`; accompanying a fix → `fix`
- Use `ref` not `refactor` (project convention)

### Phase 3: Craft Commit Message

Subject line formula: `<type>: <imperative verb> <what>`

Requirements:
- Imperative mood: "add" not "added", "fix" not "fixes"
- Specific: "add sort by date to property list" not "update list"
- No period at end
- No capitalisation after the colon (lowercase)
- ≤ 50 chars preferred, hard cap 72

Body (only when needed):
- Explain *why*, not *what* — the diff already shows what
- Wrap at 72 chars
- Separated from subject by a blank line

**Never add:**
- Co-Authored-By trailers
- Any mention of Claude, AI, or Anthropic
- Vague filler words

### Phase 4: Stage and Commit

1. Stage specific files by name — avoid `git add .` or `git add -A`
2. Commit via HEREDOC:
   ```bash
   git commit -m "$(cat <<'EOF'
   <type>: <description>

   <optional body>
   EOF
   )"
   ```
3. Run `git status` to confirm clean working tree
4. Show the commit hash and subject to the user

### Phase 5: Handle Failures

- Pre-commit hook fails → fix the issue, create a **new** commit (never amend)
- Nothing to commit → say so
- Hook modifies files → re-stage modified files, commit again

## Examples

Good — focused, specific:
```
feat: add energy-arc nudge to scoring engine
fix: prevent localhost leaking into OAuth redirect URLs
ref: move Next.js app into apps/web-ui for monorepo
chore: approve Prisma build scripts at workspace root
```

Bad — vague or bundled:
```
feat: various updates and fixes          ← vague
feat: add backend and restructure repo   ← two things
update code                              ← no type, no specifics
```

## Arguments

- `/commit` — auto-analyze and commit
- `/commit <message>` — use provided message (still validates type prefix)
