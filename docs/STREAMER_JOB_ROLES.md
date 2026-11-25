# Streamer job roles: Discord Bot → Google Sheets → ADD:ON Portal

This feature uses the existing live stream API unchanged. The Discord Bot
writes job role labels in `streamers.roles`, and a separate scheduled GitHub
Action publishes only that safe, public subset as `data/streamer-roles.json`.

## Sheet columns

`streamers`: `enabled | name | platform | id | roles`

Example for one streamer:
`TRUE | Player Name | twitch | twitch_login | 警察,救急隊`

`settings` is a `key | value` sheet. Add these rows:

| key | value example |
| --- | --- |
| rolesEnabled | TRUE |
| rolesSourceSpreadsheetUrl | https://docs.google.com/spreadsheets/d/YOUR_SOURCE_ID/edit |
| rolesSourceSheetName | ZERO |
| rolesSourceNameColumn | B |
| rolesSourceDiscordColumn | D |
| rolesSourceDiscordLookup | username |\n| rolesSourceHeaderRow | 1 |
| rolesGuildId | YOUR_DISCORD_GUILD_ID |
| rolesRoleIds | JOB_ROLE_ID_1,JOB_ROLE_ID_2 |

For the current ADD:ON participant info sheet, column D is a Discord **username**, not a numerical user ID. Use `rolesSourceDiscordLookup=username` and enable the Discord `GuildMembers` intent in both the Bot and Developer Portal. Leave `rolesEnabled=FALSE` until guild ID, role IDs and credentials have been configured. The supplied
integration module must be installed in an already-running discord.js v14 Bot;
the Bot needs a Google service account with READ permission for the source
sheet and EDIT permission for the sheet containing `streamers`/`settings`.

Do not store Discord Bot tokens or service-account keys in a Google Sheet.

## Site publishing setup

1. In this repository's GitHub Actions secrets, set `STREAMERS_CSV_URL` to
   the HTTPS CSV export/published URL of **only the streamers tab**.
   The streamers tab must contain no private email addresses or Discord user IDs.
2. Run the `Publish streamer job roles` workflow manually in GitHub Actions.
   The workflow also checks automatically every 10 minutes (not a guaranteed
   real-time interval). If the secret is absent, it skips safely.
3. The workflow updates `data/streamer-roles.json` only if role labels changed.
   Cloudflare Pages redeploys after the commit. The browser rechecks this JSON
   about every 90 seconds and merges it by `name + platform` with the existing
   stream API response.
4. Rows without a job role display a regular stream card with no badge.

## Important: existing Apps Script importer

If another Apps Script periodically recreates `streamers`, ensure it updates
only the `enabled/name/platform/id` columns (typically A:D) and does **not**
clear the `roles` column (typically E). Otherwise the Bot's values will be
lost after each import and badge visibility will fluctuate.

Without a connected target sheet or the existing Bot source, the Bot itself
cannot be deployed or its credentials configured by this repository update.
