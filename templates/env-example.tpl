# Adapto CMS — frontend (read) environment.
# Copy this to `.env` (which is gitignored) and fill in the value.
#
# Public READ key only. The tenant ID is parsed from the key (key.split('.')[1]),
# so there is NO ADAPTO_TENANT_ID here. Get the key in the Adapto backoffice:
#   Settings → API Keys.
# Do NOT put the write-side ADAPTO_TOKEN / ADAPTO_TENANT_ID in this file — those
# belong to the CLI, stored in ~/.config/adapto/credentials.json (see CLAUDE.md §3.5).

ADAPTO_API_URL=https://public-api.adaptocms.com/v1
ADAPTO_API_KEY=your_api_key_here
