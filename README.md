# Sonora — Music Player

A premium, dark cinematic web music player built with **plain HTML, CSS and JavaScript**.
Task 3 of the ARCH Internship (Web Development).

![status](https://img.shields.io/badge/ARCH%20Internship-Task%203-8b5cf6)

## Features

- **Playlist** with 10 sample tracks across 5 genres
- **Play / Pause**, **Previous / Next (skip)** with smart queue handling
- **Seekable progress bar** with current time and total duration
- **Volume slider** with mute toggle
- **Search** across title, artist, album and genre, with a *no results* state
- **Genre filters**: All, Pop, Rock, Hip-Hop, Chill, Classical (sidebar + chips)
- **Library views**: All Songs, Favorites (persisted), Recently Played (persisted)
- **Shuffle** and **Repeat** (off → all → one)
- Currently playing song is **highlighted** with an animated equalizer
- Contextual **empty states** for search, favorites, history and genres
- **Mobile mini-bar** with persistent transport controls on small screens
- Keyboard shortcuts: `Space` play/pause · `← →` seek · `↑ ↓` volume · `M` mute
- Accessible: ARIA labels/pressed states, live announcements, visible focus rings
- Fully responsive: desktop, laptop, tablet and mobile (no horizontal scrolling)

## Getting started

No build step and no dependencies.

```bash
# just open it
start index.html
```

or serve the folder with any static server:

```bash
npx serve .
```

> The page loads Google Fonts (Inter + Sora) when online; it falls back to system fonts offline.

## Project structure

```
task 3/
├── index.html          # Markup: sidebar, playlist, player rail, mini-bar
├── style.css           # Design system, glass panels, responsive layouts
├── script.js           # All player logic (no libraries)
├── audio/*.wav         # 10 generated sample tracks (~22–27 s each)
├── art/*.svg           # Generated album artwork
└── tools/
    ├── generate-songs.js   # Regenerates the WAV tracks
    ├── generate-art.js     # Regenerates the artwork
    ├── durations.json      # Track durations written by the generator
    └── check.js            # Static sanity check (ids, actions, assets)
```

## Adding your own music

1. Drop your audio files into `audio/` (mp3, wav, ogg, m4a all work).
2. Add an entry to the `TRACKS` array at the top of `script.js`:

```js
{
  id: "my-song",
  title: "My Song",
  artist: "Artist Name",
  album: "Album Name",
  genre: "pop",                      // pop | rock | hiphop | chill | classical
  src: "audio/my-song.mp3",
  art: "art/my-artwork.svg",         // any square image works
  duration: 185                      // shown until metadata loads (mm:ss)
}
```

3. Refresh — search, genres, favorites and playback all pick it up automatically.

## Regenerating the bundled assets (optional)

```bash
node tools/generate-songs.js   # rewrites audio/*.wav + tools/durations.json
node tools/generate-art.js     # rewrites art/*.svg
node tools/check.js            # verifies ids, actions and asset paths
```

The sample tracks are original instrumental loops synthesized in JavaScript
(see `tools/generate-songs.js`), so the project is fully self-contained.

## Credits

Designed and developed by **Abisha Kamran** for the ARCH Internship — Task 3.
Built with HTML, CSS and vanilla JavaScript.
