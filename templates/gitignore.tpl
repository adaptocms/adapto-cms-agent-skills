# ───────── Adapto CMS ─────────
# Appended by adapto:scaffold / adapto:retrofit. Skills must add these if missing
# (CLAUDE.md §8: "Never commit .env; add to .gitignore if missing").

# Secrets — never commit. Holds the public read key (and any local overrides).
.env
.env.*
!.env.example

# Local agent state — machine-local & regenerable, do not commit:
.adapto/sessions/      # rollback manifests of created item IDs (CLAUDE.md §3.7)
.adapto/project.md     # read-only cache of _adapto_project_config (§3.4)
.adapto/glossary.md    # read-only cache of _adapto_glossary (§3.4)

# Keep TRACKED (do not ignore): .adapto/skills.lock — version pinning (§3.1).
