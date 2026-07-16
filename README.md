# HBO Max Cookie Login

A Chrome extension to instantly log into **HBO Max / Max** accounts using an exported session cookie — no password needed. Paste the full cookie or pick a file, and the extension finds the `st` token by itself and injects it into `api.hbomax.com`. Supports bulk switching between accounts from a folder of cookie files.

> Made by **Telegram [@PKBTV](https://t.me/PKBTV)** · **[@sackion](https://t.me/sackion)**

---

## What It Does

HBO Max authenticates every backend call with a single JWT cookie named **`st`** sent to `api.hbomax.com`. This extension:

1. Reads a **full cookie** you paste/drop/select (any common format), or a bare `st` token.
2. **Extracts the `st` token automatically** — you don't need to isolate it yourself.
3. Uses `declarativeNetRequest` to inject `Cookie: st=<token>` on every `api.hbomax.com` request.
4. Opens `play.hbomax.com` — the site loads straight into the account.

Because the whole session lives in that one header, injecting it is more reliable than writing browser cookies (which the site's host-only scoping and CSP often reject).

---

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `hbomax-login-ext` folder
6. The extension icon appears in your toolbar — pin it for easy access. Clicking it opens the panel in a tab.

---

## Cookie Formats Accepted

You can give it the **full cookie** in any of these — it locates `st` on its own:

### JSON (Cookie-Editor export)
```json
[
  { "name": "st", "value": "eyJhbGciOi...", "domain": ".hbomax.com", "path": "/" },
  { "name": "...", "value": "..." }
]
```
Export from the [Cookie-Editor](https://cookie-editor.com/) browser extension.

### Netscape / cookies.txt
```
.hbomax.com	TRUE	/	TRUE	0	st	eyJhbGciOi...
```
Standard format exported by most cookie tools.

### Raw / bare token
```
st: eyJhbGciOi...
```
or just paste the JWT on its own:
```
eyJhbGciOi...
```

A valid `st` token is a 3-segment JWT that starts with `eyJ`.

---

## How to Use

### Method 1 — Paste the full cookie
1. Click the extension icon to open the panel
2. Paste the **entire cookie** (JSON / Netscape / raw) into the textarea — you don't have to pull out the `st` value yourself
3. Click **Login to HBO Max**

### Method 2 — Drop / browse a file
1. Drag a `.txt` or `.json` cookie file onto the **drop zone** (or click it to browse)
2. The extension extracts `st`, injects it, and opens Max automatically

### Method 3 — Folder (bulk switching)
Best for switching between many accounts quickly.
1. In the **Cookie Folder** section, click **Load**
2. Select the folder containing your cookie files (`.txt` / `.json`)
3. The file list loads, sorted alphabetically
4. Click any file to log into that account instantly — scroll position is saved between clicks

To unload the folder, click **Clear**.

> **Note:** the file list stays loaded while the panel tab is open. If you close and reopen the tab, click **Load** again to re-pick the folder (browsers don't allow re-reading a folder without a fresh pick).

---

## Switching Between Accounts

Each login **replaces** the active `st` rule with the new token, so there's no session bleed — the previous account's token is overwritten. To stop injecting entirely (log out), click **Clear active token**.

The active token is remembered across browser restarts, so your last login stays working until you switch or clear it.

---

## Cookie File Naming (Optional)

If you use the companion checker script, premium files are named like:
```
Premium_User_Ultimate_2026-09-01_US_Monthly_CARD.txt
```
The extension works with any filename — the naming is just for your own organisation.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "No st token found in that cookie" | The file/paste has no `st` JWT. Make sure it contains the full HBO Max cookie or a bare `eyJ…` token |
| Loads but shows "signed out" | The `st` token is expired — grab a fresh cookie |
| Wrong region / can't play | The account is region-locked; use an IP in the account's country |
| "Injection failed" | Reload the extension in `chrome://extensions`, then try again |
| List clears when clicking a file | The panel is a persistent tab — don't close it while switching; click **Load** to re-pick |
| Extension not loading | Ensure Developer Mode is on in `chrome://extensions` |

---

## Permissions Used

| Permission | Reason |
|---|---|
| `declarativeNetRequest` | Inject the `Cookie: st=…` header on `api.hbomax.com` requests |
| `declarativeNetRequestWithHostAccess` | Allow the header rule to run on the HBO Max hosts |
| `storage` | Remember the active token + the loaded folder file list |
| `tabs` | Open / focus the HBO Max tab and the panel |

Host access is limited to `*.hbomax.com`, `*.max.com`, and `*.hbo.com`.

---

## License

Licensed under **GPL-3.0**. You are free to use, modify, and redistribute this project — but you must:

- Keep the original author credits in all copies and modified versions
- Distribute any modified version under the same GPL-3.0 license
- Make your modified source code publicly available

**Original author credits must be preserved:**
> Telegram [@PKBTV](https://t.me/PKBTV) · [@sackion](https://t.me/sackion)

See [LICENSE](./LICENSE) for full terms.
