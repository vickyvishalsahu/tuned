---
description: Commit staged and unstaged changes with a conventional commit message
disable-model-invocation: true
---

# /commit - Smart Conventional Commit

Analyze all current changes and create a well-crafted conventional commit.

## Commit philosophy

**One logical change per commit.** Before doing anything, ask: do these changes belong together, or are they two separate things that happen to be edited at the same time?

Signs a changeset should be split:
- You'd describe it with "and" ("move files and add new feature")
- Two different commit types apply (e.g. `ref` + `feat`)
- Rolling back one part without the other would make sense

If it should be split, stage and commit each part separately — do not bundle them.

**Messages must be minimal and clean:**
- Subject line ≤ 50 chars (hard cap 72)
- No filler: "update", "changes", "misc", "stuff", "various fixes" are banned
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
