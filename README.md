# YT Mini

A YouTube Music desktop app for Windows with a Spotify-style mini player.

The main window is music.youtube.com in its own window (Home, Explore, Library, sign-in all work as on the web).
The mini player is a small frameless, always-on-top window you can resize from a large album-art square
down to a 150×48 strip.

## Run

```
npm install
npm start
```

Build a Windows installer into `dist/`:

```
npm run dist
```

## Using the mini player

- Minimise the main window while a song is loaded, click the mini player button in the YT Music player bar,
  press **Ctrl+Shift+M**, or use the tray icon.
- Drag anywhere to move; drag the edges to resize. Layouts adapt: large square, small square, strip, tiny strip.
- Pin keeps it on top; expand returns to the full window. **Space** play/pause, **←/→** previous/next.
- Size, position and settings are remembered in `%APPDATA%\ytmini\settings.json`.

## Layout

- `src/main.js` — windows, tray, shortcuts, settings, IPC
- `src/preload-ytm.js` — runs in YT Music: reports the current track, executes playback commands
- `src/mini/` — mini player UI
