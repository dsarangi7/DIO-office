# Dibya’s Intelligence Office (live pixel floor)

Animated floor view of DIO agents. Idle agents walk to the **bottom-right café** (coffee bar, round table, bistro, corner sofa). At most **3** agents may be in the café at once. A 4th idle agent stays at their desk and shows **Café full (3/3)**. Working / reviewing / blocked stay at desks with short activity bubbles. Core / Content / Fix Loop rooms light up “In session” when members are non-idle there.

## Public URL

**https://dsarangi7.github.io/DIO-office/**

This is the only live URL. The path is case-sensitive: bookmark **capital `DIO-office`**. `https://dsarangi7.github.io/dio-office/` (lowercase) is a permanent GitHub Pages 404 — do not rename the repo to “fix” it.

Deploy this folder to the `dsarangi7/DIO-office` GitHub Pages site (project pages, base path `/DIO-office/`). All assets use relative URLs so local open still works.

See [HOME-SCREEN.md](./HOME-SCREEN.md) for phone + laptop Add-to-Home-Screen steps.

## Open it (pick one)

### A — Public (anytime from home)

Open **https://dsarangi7.github.io/DIO-office/** — capital **DIO**. The lowercase `/dio-office` URL 404s. Or use the home-screen / installed app shortcut saved from that exact URL.

### B — Live refresh locally

From this folder:

```bash
node sync-status.mjs
python3 -m http.server 8765
```

Then open **http://localhost:8765/** in a browser.

- Loads `./status.json` over HTTP.
- Auto-refreshes every **45 seconds**.
- Click **Refresh** to re-fetch immediately.

Or use the helper:

```bash
./open.sh
```

### C — Double-click / `file://`

Open `index.html` directly. Uses the **embedded** status snapshot (updated whenever you run `node sync-status.mjs`). No network polling.

## Sync status → push to Pages

```bash
node sync-status.mjs
# then commit + push this folder to the DIO-office Pages repo (capital DIO)
# (or a future routine that syncs and deploys)
```

Reads `/workspace/docs/dio-portfolio-board.md` → section **Who’s working (live)** → writes `status.json` and refreshes the embedded JSON in `index.html`.

Safe if the table is missing: keeps the last `status.json` (or sensible defaults).

Until automation lands: **sync → git push** is the one-tap path that updates what the public URL shows.

## Files

| File | Role |
|---|---|
| `index.html` | Pixel office UI |
| `status.json` | Live agent status |
| `sync-status.mjs` | Board → status.json |
| `manifest.webmanifest` | PWA / install metadata |
| `icon-192.png` / `icon-512.png` | App icons |
| `.nojekyll` | GitHub Pages: skip Jekyll |
| `HOME-SCREEN.md` | Install / bookmark steps |
| `office.png` | Reference art |
| `open.sh` | sync + local server |

## Status mapping

| Board status | Office |
|---|---|
| In flight / Active / Working | `working` (desk bubble) |
| Waiting (+ blocker) | `blocked` |
| Waiting (no blocker) | `idle` (café) |
| Done | `idle` with `Done: …` |
| Idle | `idle` (café) |

**Kai** and **Nova** are on the floor with the other agents. Anyone not in that roster shows up in the **Office feed** only.

## What you should see

- **Working:** God in the corner office; Chan at desk with a one-line bubble (e.g. “Streak UI chrome”).
- **Idle:** Up to 3 agents walk to the bottom-right café — sit, raise a mug, chat in pairs with tiny talk ticks. A 4th idle agent stays at their desk with a **Café full (3/3)** bubble. Agents still at their desks do not count toward the cap.
- **Rooms:** “In session” when a non-idle agent has `room` = `core` | `content` | `fixloop`.

Demo mode and Night theme still work from the top bar.
