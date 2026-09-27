# YT Mini

A YouTube Music desktop app for Windows with its own interface, themes, and two mini players:
a modern one that shrinks to a thin strip, and a classic Winamp 2 player that loads real `.wsz` skins
and shows album art.

## Run

```
npm install
npm start          # build the UI, then launch
npm run dev        # Vite dev server + Electron with hot reload
npm test           # unit tests
npm run dist       # Windows installer in dist/
```

## How it works

- **Engine:** a hidden window runs music.youtube.com. It handles sign-in, playback, Premium and the
  queue exactly as the website does. `src/preload/engine.js` reads player state from the page and carries
  out commands through YouTube's own player API.
- **Data:** `src/main/ytmusic.js` fetches home, explore, library, search, albums, artists, playlists and
  lyrics with [youtubei.js](https://github.com/LuanRT/YouTube.js), using the engine's signed-in cookies.
  `src/main/ytm-map.js` turns the responses into plain data for the UI.
- **Interface:** Svelte app in `src/renderer/app`. Themes are CSS variable sets (`styles/app.css`).
- **Mini players:** `src/renderer/mini-modern` (resizable, album art) and `src/renderer/mini-classic`
  ([Webamp](https://github.com/captbaritone/webamp) wired to the engine, with EQ and visualizer).

## Themes

Midnight, Daylight, Adaptive (colours from the current album art) and Classic match (colours from your
Winamp skin). To make your own, put a `.css` file in `%APPDATA%\ytmini\themes` that overrides the variables
on `:root`, for example:

```css
/* name: Ocean */
:root {
  --bg: #0b1d2a; --bg-elev: #12293a; --bg-elev-2: #1a3549; --bg-hover: #23445c; --line: #1e3a4f;
  --text: #e6f1f7; --text-dim: #9db7c7; --text-faint: #6a8799;
  --accent: #4fd1c5; --accent-ink: #062320;
}
```

Then choose it under **Themes and settings** (use **Reload themes** after editing).

## Winamp skins

Download skins from the [Winamp Skin Museum](https://skins.webamp.org/) and load the `.wsz` file from
**Themes and settings**, from the classic player's right-click menu, or by dropping it onto the classic player.
Skins are stored in `%APPDATA%\ytmini\skins`.

## Keyboard

| Keys | Action |
| --- | --- |
| Space | Play / pause |
| Ctrl+← / Ctrl+→ | Previous / next |
| Ctrl+L | Like |
| Ctrl+K | Search |
| Ctrl+Shift+M | Toggle the mini player |
| Alt+← / Alt+→ | Back / forward |

## Testing against your account

With YT Mini closed:

```
npx electron scripts/capture-fixtures.cjs   # saves real responses to test/fixtures/live (git-ignored)
npm run build && npx electron scripts/smoke.cjs
```

`smoke.cjs` plays a track with the audio muted and checks the UI, mini players, EQ, visualizer and themes.
Open the UI with saved data in the Vite dev server at `http://localhost:5173/app/index.html?fixtures`.
