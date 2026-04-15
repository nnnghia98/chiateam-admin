# Agent Guide

## Git Commit Convention

### Commit Message Format

```
[type]([scope]): [short description]
```

#### Types

- `feat` — new feature
- `fix` — bug fix
- `chore` — maintenance, dependencies, config
- `refactor` — code restructuring without behavior change
- `docs` — documentation changes
- `style` — formatting, missing semicolons, etc.
- `test` — adding or updating tests

#### Scopes

- `admin` — changes in the `src/` directory
- `root` — root-level config files (package.json, next.config.ts, tailwind config, etc.)

#### Short Description

- Summarize the major changes included in this commit
- Use imperative mood ("add", "fix", "update", not "added", "fixed")
- Keep it concise (under 72 characters)

#### Examples

```
feat(admin): add next-match drag and drop reorder
fix(admin): correct proxy auth header forwarding
docs(root): update deployment setup
refactor(admin): extract matches table into component
```

---

## Trigger: "commit code"

When the user says **"commit code"**, follow these steps exactly:

1. Check which files have been changed using `git status`
2. Stage all relevant changed files with `git add`
3. Compose a commit message following the format above based on the changes
4. Run `git commit -m "[type]([scope]): [short description]"`
5. Confirm the commit was successful

### STRICT RULES

- **NEVER run `git push`** under any circumstances
- **NEVER run `git push --force`** or any push variant
- Only `git add` and `git commit` are permitted
- If multiple scopes are affected, use the most significant scope or list them: `feat(admin, root): ...`
