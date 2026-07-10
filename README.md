# J Webb Inc — Life Safety Systems

Marketing site + self-serve project portfolio for J Webb Inc (fire alarm
/ life-safety contractor, Lawrence, KS).

**Live site:** https://bwuh21.github.io/JWebbWebsite/

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Home (the chosen design; variations 1/3/4 kept for reference) |
| `projects.html` | Full project portfolio with category filters |
| `admin.html` | Owner logs in to add/edit/feature/delete projects |

## How data works

`assets/store.js` is the only file that knows where data lives. It runs
in one of two modes, picked automatically:

- **Demo** (default): projects live in the browser's localStorage.
  Zero setup; admin passcode is shown on the login screen.
- **Live**: fill in `assets/config.js` with a Supabase project URL +
  anon key, and projects live in Supabase (Postgres + photo storage),
  with real email/password admin login.

## Going live (one-time, ~5 minutes)

1. In your Supabase project: **SQL Editor → New query**, paste all of
   `supabase-setup.sql`, **Run**. (Creates the table, security policies,
   photo bucket, and starter projects.)
2. **Authentication → Users → Add user** — create the admin email +
   password (check *Auto Confirm*).
3. **Project Settings → API** — copy the *Project URL* and *anon public*
   key into `assets/config.js`.
4. Commit + push. The site switches to live mode by itself.

The anon key is safe to publish — writes are blocked by Row Level
Security unless someone is signed in as the admin user.
