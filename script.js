/* ============================================================
   Sonora — Music Player · ARCH Internship · Task 3
   Vanilla JS: playback, playlist, search, genres, shuffle,
   repeat, favorites, recently-played and responsive controls.
   ============================================================ */

"use strict";

const TRACKS = [
  { id: "midnight-mirage", title: "Midnight Mirage", artist: "Nova Skyline", album: "Chrome Hearts", genre: "pop", tags: "pop rock synthrock upbeat energetic", src: "audio/midnight-mirage.wav", art: "art/midnight-mirage.svg", duration: 26.03 },
  { id: "electric-bloom", title: "Electric Bloom", artist: "Ava Lune", album: "Chromatic", genre: "pop", tags: "pop rock indie pop bright catchy", src: "audio/electric-bloom.wav", art: "art/electric-bloom.svg", duration: 26.03 },
  { id: "asphalt-thunder", title: "Asphalt Thunder", artist: "Iron Vale", album: "Redline", genre: "rock", tags: "rock pop rock hard rock heavy driving", src: "audio/asphalt-thunder.wav", art: "art/asphalt-thunder.svg", duration: 25.55 },
  { id: "broken-compass", title: "Broken Compass", artist: "The Voltage", album: "Northern Static", genre: "rock", tags: "rock pop rock alternative indie rock", src: "audio/broken-compass.wav", art: "art/broken-compass.svg", duration: 25.55 },
  { id: "concrete-dreams", title: "Concrete Dreams", artist: "Kairo Vex", album: "Grid City", genre: "hiphop", tags: "hip hop rap urban beats", src: "audio/concrete-dreams.wav", art: "art/concrete-dreams.svg", duration: 23.53 },
  { id: "velvet-flow", title: "Velvet Flow", artist: "MC Solace", album: "Midnight Tapes", genre: "hiphop", tags: "hip hop rap lofi chill hop", src: "audio/velvet-flow.wav", art: "art/velvet-flow.svg", duration: 23.53 },
  { id: "rain-on-glass", title: "Rain on Glass", artist: "Luna Wave", album: "Soft Focus", genre: "chill", tags: "chill lofi ambient pop soft", src: "audio/rain-on-glass.wav", art: "art/rain-on-glass.svg", duration: 24.53 },
  { id: "slow-orbit", title: "Slow Orbit", artist: "Haze & Ember", album: "Weightless", genre: "chill", tags: "chill ambient downtempo spacey", src: "audio/slow-orbit.wav", art: "art/slow-orbit.svg", duration: 24.53 },
  { id: "nocturne-in-amber", title: "Nocturne in Amber", artist: "Elena Marlowe", album: "Piano Suites", genre: "classical", tags: "classical piano instrumental solo", src: "audio/nocturne-in-amber.wav", art: "art/nocturne-in-amber.svg", duration: 26.65 },
  { id: "glass-aria", title: "Glass Aria", artist: "Ensemble Aria", album: "Strings & Light", genre: "classical", tags: "classical strings ensemble instrumental", src: "audio/glass-aria.wav", art: "art/glass-aria.svg", duration: 26.65 }
];

const GENRES = [
  { key: "all", label: "All" },
  { key: "pop", label: "Pop" },
  { key: "rock", label: "Rock" },
  { key: "hiphop", label: "Hip-Hop" },
  { key: "chill", label: "Chill" },
  { key: "classical", label: "Classical" }
];

const VIEWS = {
  library: { eyebrow: "Your library", title: "All Songs" },
  favorites: { eyebrow: "Saved for later", title: "Your Favorites" },
  recent: { eyebrow: "Your history", title: "Recently Played" }
};

const STORE = { favs: "sonora.favorites", recent: "sonora.recent", vol: "sonora.volume" };

/* ---------------------------------------------------------- */
/*  Helpers                                                    */
/* ---------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (n, min, max) => (n < min ? min : n > max ? max : n);

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    /* storage unavailable */
  }
}

function genreLabel(key) {
  const g = GENRES.find((g) => g.key === key);
  return g ? g.label : "All";
}

function byId(id) {
  return TRACKS.find((t) => t.id === id) || null;
}

function normalize(str) {
  return String(str || "").toLowerCase().trim();
}

/* Case-insensitive, token-based match: every word of the query must
   appear in the title, artist, album, genre or tags of the track.
   e.g. "Pop Rock" matches tracks tagged with both "pop" and "rock". */
function trackMatches(track, query) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalize(
    [track.title, track.artist, track.album, genreLabel(track.genre), track.tags].join(" ")
  );
  return tokens.every((token) => haystack.includes(token));
}

function setFill(rangeEl, pct) {
  rangeEl.style.setProperty("--fill", clamp(pct, 0, 100) + "%");
}

/* ---------------------------------------------------------- */
/*  State                                                      */
/* ---------------------------------------------------------- */

const state = {
  view: "library",
  genre: "all",
  query: "",
  currentId: TRACKS[0].id,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  volume: clamp(Number(readStore(STORE.vol, 0.8)), 0, 1),
  muted: false,
  favorites: new Set(readStore(STORE.favs, [])),
  recent: readStore(STORE.recent, [])
};

if (!Array.isArray(state.recent)) state.recent = [];

/* ---------------------------------------------------------- */
/*  Elements                                                   */
/* ---------------------------------------------------------- */

const app = $("#app");
const audio = $("#audio");
const playlistEl = $("#playlist");
const playlistHead = $(".playlist__head");
const emptyState = $("#emptyState");
const stateIcon = $("#stateIcon");
const stateTitle = $("#stateTitle");
const stateText = $("#stateText");
const stateAction = $("#stateAction");
const searchInput = $("#searchInput");
const searchClear = $("#searchClear");
const searchPanel = $("#searchPanel");
const searchResults = $("#searchResults");
const searchEmpty = $("#searchEmpty");
const resultCount = $("#resultCount");
const viewEyebrow = $("#viewEyebrow");
const viewTitle = $("#viewTitle");
const viewSub = $("#viewSub");
const favCount = $("#favCount");

const artImg = $("#artImg");
const artBadge = $("#artBadge");
const npTitle = $("#npTitle");
const npArtist = $("#npArtist");
const npGenre = $("#npGenre");
const npAlbum = $("#npAlbum");
const likeBtn = $("#likeBtn");
const seekBar = $("#seekBar");
const curTime = $("#curTime");
const durTime = $("#durTime");
const playBtn = $("#playBtn");
const shuffleBtn = $("#shuffleBtn");
const repeatBtn = $("#repeatBtn");
const repeatBadge = $("#repeatBadge");
const muteBtn = $("#muteBtn");
const volBar = $("#volBar");
const queueInfo = $("#queueInfo");

const minibar = $("#minibar");
const miniArt = $("#miniArt");
const miniTitle = $("#miniTitle");
const miniArtist = $("#miniArtist");
const miniPlayBtn = $("#miniPlayBtn");
const miniProgress = $("#miniProgress");

const toastEl = $("#toast");
const liveRegion = $("#liveRegion");

const HEART_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>';

const PLAY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 5.2a1 1 0 0 1 1.5-.9l9 6.8a1 1 0 0 1 0 1.6l-9 6.8a1 1 0 0 1-1.5-.9V5.2z"></path></svg>';

/* ---------------------------------------------------------- */
/*  Toast & announcements                                      */
/* ---------------------------------------------------------- */

let toastTimer = null;

function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add("is-visible"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    setTimeout(() => {
      toastEl.hidden = true;
    }, 320);
  }, 2800);
}

function announce(message) {
  liveRegion.textContent = message;
}

/* ---------------------------------------------------------- */
/*  Filtering & playlist rendering                             */
/* ---------------------------------------------------------- */

function visibleTracks() {
  let list;

  if (state.view === "recent") {
    list = state.recent.map(byId).filter(Boolean);
  } else if (state.view === "favorites") {
    list = TRACKS.filter((t) => state.favorites.has(t.id));
  } else {
    list = TRACKS.slice();
  }

  if (state.genre !== "all") {
    list = list.filter((t) => t.genre === state.genre);
  }

  if (state.query) {
    list = list.filter((t) => trackMatches(t, state.query));
  }

  return list;
}

function rowMarkup(track, index) {
  const active = track.id === state.currentId;
  const liked = state.favorites.has(track.id);
  const anim = state.query ? "animation:none" : `animation-delay:${Math.min(index * 28, 220)}ms`;
  const label = `${active && state.isPlaying ? "Pause" : "Play"} ${track.title} by ${track.artist}`;

  return `
    <li class="row${active ? " is-active" : ""}${active && state.isPlaying ? " is-playing" : ""}"
        data-id="${track.id}" data-title="${track.title}" data-artist="${track.artist}"
        style="${anim}">
      <span class="row__index">
        <span class="row__num">${index + 1}</span>
        <span class="row__play">${PLAY_SVG}</span>
        <span class="row__eq eq"><i></i><i></i><i></i><i></i></span>
      </span>
      <span class="row__art">
        <img src="${track.art}" alt="" width="54" height="54" loading="lazy" />
      </span>
      <button class="row__info" type="button" aria-label="${label}">
        <span class="row__title">${track.title}</span>
        <span class="row__artist">${track.artist}</span>
      </button>
      <span class="row__album">${track.album}</span>
      <span class="row__genre"><span class="genre-tag">${genreLabel(track.genre)}</span></span>
      <button class="row__like${liked ? " is-liked" : ""}" type="button"
              data-action="favorite" data-id="${track.id}"
              aria-pressed="${liked}"
              aria-label="${liked ? "Remove" : "Add"} ${track.title} ${liked ? "from" : "to"} favorites">
        ${HEART_SVG}
      </button>
      <span class="row__time">${fmtTime(track.duration)}</span>
    </li>`;
}

function updateHeading(count) {
  const meta = VIEWS[state.view];
  viewEyebrow.textContent = meta.eyebrow;
  viewTitle.textContent = meta.title;

  let sub = `${count} track${count === 1 ? "" : "s"}`;
  if (state.genre === "all") {
    sub += state.view === "library" ? " across 5 genres" : " in this list";
  } else {
    sub += ` · ${genreLabel(state.genre)}`;
  }
  if (state.query) sub += ` · Results for “${state.query}”`;
  viewSub.textContent = sub;

  resultCount.textContent = `${count} song${count === 1 ? "" : "s"}`;
}

const ICON = {
  search:
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="16.5" y1="16.5" x2="21" y2="21"></line><line x1="8.5" y1="11" x2="13.5" y2="11"></line></svg>',
  heart:
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"></path></svg>',
  history:
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"></path><path d="M3 3v5h5"></path><path d="M12 7v5l3.5 2"></path></svg>',
  music:
    '<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>'
};

function renderEmptyState(count) {
  if (count > 0) {
    emptyState.hidden = true;
    return;
  }

  emptyState.hidden = false;
  stateAction.dataset.action = "reset-filters";

  if (state.query) {
    stateIcon.innerHTML = ICON.search;
    stateTitle.textContent = "No results found";
    stateText.textContent = `Nothing matched “${state.query}”. Check the spelling or try another artist, album or genre.`;
    stateAction.textContent = "Clear search";
  } else if (state.view === "favorites") {
    stateIcon.innerHTML = ICON.heart;
    stateTitle.textContent = "No favorites yet";
    stateText.textContent = "Tap the heart on any song to save it here for later.";
    stateAction.textContent = "Browse all songs";
    stateAction.dataset.action = "go-library";
  } else if (state.view === "recent") {
    stateIcon.innerHTML = ICON.history;
    stateTitle.textContent = "Nothing played yet";
    stateText.textContent = "Songs you play will appear here so you can find them again.";
    stateAction.textContent = "Browse the library";
    stateAction.dataset.action = "go-library";
  } else {
    stateIcon.innerHTML = ICON.music;
    stateTitle.textContent = "No songs in this genre";
    stateText.textContent = "This genre has no tracks in the current view yet.";
    stateAction.textContent = "Show all genres";
  }
}

function renderPlaylist() {
  const list = visibleTracks();

  playlistEl.innerHTML = list.map(rowMarkup).join("");
  playlistEl.hidden = list.length === 0;
  playlistHead.hidden = list.length === 0;

  renderEmptyState(list.length);
  updateHeading(list.length);
  favCount.textContent = state.favorites.size;
}

/* ---------------------------------------------------------- */
/*  Live search results panel                                  */
/* ---------------------------------------------------------- */

const SEARCH_MAX_RESULTS = 6;

function searchResultMarkup(track) {
  const active = track.id === state.currentId;
  return `
    <li class="search__result${active ? " is-active" : ""}" role="option" tabindex="0"
        data-action="pick-result" data-id="${track.id}"
        aria-label="Play ${track.title} by ${track.artist}">
      <img class="search__thumb" src="${track.art}" alt="" width="40" height="40" loading="lazy" />
      <span class="search__rtext">
        <span class="search__rtitle">${track.title}</span>
        <span class="search__rartist">${track.artist} · ${genreLabel(track.genre)}</span>
      </span>
      <span class="search__rplay" aria-hidden="true">${PLAY_SVG}</span>
    </li>`;
}

function renderSearchPanel() {
  const q = state.query;
  if (!q) {
    searchPanel.hidden = true;
    return;
  }

  const matches = TRACKS.filter((t) => trackMatches(t, q));
  const shown = matches.slice(0, SEARCH_MAX_RESULTS);

  searchPanel.hidden = false;
  searchResults.hidden = shown.length === 0;
  searchEmpty.hidden = shown.length > 0;
  searchResults.innerHTML = shown.map(searchResultMarkup).join("");
}

function hideSearchPanel() {
  searchPanel.hidden = true;
}

function updateRowStates() {
  $$(".row", playlistEl).forEach((row) => {
    const active = row.dataset.id === state.currentId;
    row.classList.toggle("is-active", active);
    row.classList.toggle("is-playing", active && state.isPlaying);

    const infoBtn = $(".row__info", row);
    if (infoBtn) {
      infoBtn.setAttribute(
        "aria-label",
        `${active && state.isPlaying ? "Pause" : "Play"} ${row.dataset.title} by ${row.dataset.artist}`
      );
    }
  });
}

function syncFilterControls() {
  $$("[data-view]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === state.view);
  });
  $$("[data-genre]").forEach((btn) => {
    const on = btn.dataset.genre === state.genre;
    btn.classList.toggle("is-active", on);
    if (btn.classList.contains("chip")) btn.setAttribute("aria-pressed", String(on));
  });
}

function syncQueueInfo() {
  queueInfo.textContent = `Playing from ${VIEWS[state.view].title} · ${
    state.genre === "all" ? "All genres" : genreLabel(state.genre)
  }`;
}

/* ---------------------------------------------------------- */
/*  Player UI sync                                             */
/* ---------------------------------------------------------- */

function currentTrack() {
  return byId(state.currentId);
}

function syncPlayButtons() {
  document.body.classList.toggle("is-playing", state.isPlaying);

  [playBtn, miniPlayBtn].forEach((btn) => {
    const iconPlay = $(".i-play", btn);
    const iconPause = $(".i-pause", btn);
    if (iconPlay) iconPlay.hidden = state.isPlaying;
    if (iconPause) iconPause.hidden = !state.isPlaying;
    btn.setAttribute("aria-label", state.isPlaying ? "Pause" : "Play");
  });

  artBadge.classList.toggle("is-visible", state.isPlaying);
  updateRowStates();
}

function syncLikeButton() {
  const track = currentTrack();
  if (!track) return;
  const liked = state.favorites.has(track.id);
  likeBtn.classList.toggle("is-liked", liked);
  likeBtn.setAttribute("aria-pressed", String(liked));
  likeBtn.setAttribute(
    "aria-label",
    `${liked ? "Remove" : "Add"} ${track.title} ${liked ? "from" : "to"} favorites`
  );
}

function syncModeButtons() {
  shuffleBtn.classList.toggle("is-on", state.shuffle);
  shuffleBtn.setAttribute("aria-pressed", String(state.shuffle));
  shuffleBtn.setAttribute("aria-label", `Shuffle ${state.shuffle ? "on" : "off"}`);

  const on = state.repeat !== "off";
  repeatBtn.classList.toggle("is-on", on);
  repeatBtn.setAttribute("aria-pressed", String(on));
  repeatBadge.hidden = state.repeat !== "one";
  const label =
    state.repeat === "off" ? "Repeat off" : state.repeat === "all" ? "Repeat all" : "Repeat one";
  repeatBtn.setAttribute("aria-label", label);
}

function syncVolumeUI() {
  const effective = state.muted ? 0 : state.volume;
  volBar.value = String(Math.round(state.volume * 100));
  setFill(volBar, state.volume * 100);
  volBar.setAttribute("aria-valuetext", `${Math.round(effective * 100)} percent`);

  $(".i-vol", muteBtn).hidden = effective === 0;
  $(".i-vol-mute", muteBtn).hidden = effective !== 0;
  muteBtn.setAttribute("aria-pressed", String(state.muted));
  muteBtn.setAttribute("aria-label", effective === 0 ? "Unmute volume" : "Mute volume");
}

function syncNowPlaying() {
  const track = currentTrack();
  if (!track) return;

  npTitle.textContent = track.title;
  npArtist.textContent = track.artist;
  npGenre.textContent = genreLabel(track.genre);
  npAlbum.textContent = track.album;
  durTime.textContent = fmtTime(audio.duration || track.duration);

  artImg.src = track.art;
  artImg.alt = `Album artwork for ${track.title} by ${track.artist}`;

  miniArt.src = track.art;
  miniTitle.textContent = track.title;
  miniArtist.textContent = track.artist;

  syncLikeButton();
}

function updateProgress() {
  const dur = isFinite(audio.duration) ? audio.duration : 0;
  const cur = audio.currentTime || 0;
  const pct = dur ? (cur / dur) * 100 : 0;

  if (!scrubbing) {
    seekBar.value = String(Math.round(pct * 10));
  }
  setFill(seekBar, pct);
  curTime.textContent = fmtTime(cur);
  miniProgress.style.width = pct + "%";
  seekBar.setAttribute(
    "aria-valuetext",
    `${fmtTime(cur)} of ${fmtTime(dur || currentTrack()?.duration || 0)}`
  );
}

function syncAll() {
  renderPlaylist();
  syncFilterControls();
  syncNowPlaying();
  syncPlayButtons();
  syncModeButtons();
  syncVolumeUI();
  syncQueueInfo();
  updateProgress();
}

/* ---------------------------------------------------------- */
/*  Playback                                                   */
/* ---------------------------------------------------------- */

let scrubbing = false;

function pushRecent(id) {
  state.recent = [id, ...state.recent.filter((x) => x !== id)].slice(0, 12);
  writeStore(STORE.recent, state.recent);
}

function playAudio() {
  const attempt = audio.play();
  if (attempt && typeof attempt.catch === "function") {
    attempt.catch(() => {
      toast("Tap the play button to start audio");
    });
  }
}

function loadTrack(id, autoplay) {
  const track = byId(id);
  if (!track) return;

  const isNew = state.currentId !== id || audio.getAttribute("src") !== track.src;
  state.currentId = id;

  if (isNew) {
    audio.src = track.src;
    audio.load();
    seekBar.value = "0";
    setFill(seekBar, 0);
    curTime.textContent = "0:00";
    miniProgress.style.width = "0%";
  }

  syncNowPlaying();
  syncQueueInfo();
  updateRowStates();

  if (autoplay) {
    pushRecent(id);
    playAudio();
    announce(`Playing ${track.title} by ${track.artist}`);
  }
}

function togglePlay() {
  if (audio.paused) playAudio();
  else audio.pause();
}

function queueList() {
  const visible = visibleTracks();
  return visible.length ? visible : TRACKS.slice();
}

function nextTrack(auto) {
  if (auto && state.repeat === "one") {
    audio.currentTime = 0;
    playAudio();
    return;
  }

  const queue = queueList();
  let target;

  if (state.shuffle && queue.length > 1) {
    do {
      target = queue[Math.floor(Math.random() * queue.length)];
    } while (target.id === state.currentId);
  } else {
    const idx = queue.findIndex((t) => t.id === state.currentId);
    if (idx === -1) {
      target = queue[0];
    } else if (idx === queue.length - 1) {
      if (state.repeat === "all" || !auto) {
        target = queue[0];
      } else {
        audio.pause();
        audio.currentTime = 0;
        updateProgress();
        announce("Playlist finished");
        return;
      }
    } else {
      target = queue[idx + 1];
    }
  }

  if (target) loadTrack(target.id, true);
}

function prevTrack() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    updateProgress();
    return;
  }

  const queue = queueList();
  const idx = queue.findIndex((t) => t.id === state.currentId);
  let target;

  if (state.shuffle && queue.length > 1) {
    do {
      target = queue[Math.floor(Math.random() * queue.length)];
    } while (target.id === state.currentId);
  } else {
    target = idx <= 0 ? queue[queue.length - 1] : queue[idx - 1];
  }

  if (target) loadTrack(target.id, true);
}

function seekBy(seconds) {
  const dur = audio.duration;
  if (!isFinite(dur) || dur <= 0) return;
  audio.currentTime = clamp(audio.currentTime + seconds, 0, dur);
  updateProgress();
}

/* ---------------------------------------------------------- */
/*  Modes, volume, favorites                                   */
/* ---------------------------------------------------------- */

function toggleShuffle() {
  state.shuffle = !state.shuffle;
  syncModeButtons();
  announce(`Shuffle ${state.shuffle ? "on" : "off"}`);
}

function cycleRepeat() {
  state.repeat = state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  syncModeButtons();
  announce(
    state.repeat === "off" ? "Repeat off" : state.repeat === "all" ? "Repeat all" : "Repeat one"
  );
}

function setVolume(value, persist) {
  state.volume = clamp(value, 0, 1);
  if (state.volume > 0) state.muted = false;
  audio.volume = state.volume;
  audio.muted = state.muted;
  if (persist !== false) writeStore(STORE.vol, state.volume);
  syncVolumeUI();
}

function toggleMute() {
  state.muted = !state.muted;
  audio.muted = state.muted;
  syncVolumeUI();
  announce(state.muted ? "Muted" : "Unmuted");
}

function toggleFavorite(id) {
  const track = byId(id);
  if (!track) return;

  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    announce(`${track.title} removed from favorites`);
  } else {
    state.favorites.add(id);
    announce(`${track.title} added to favorites`);
  }

  writeStore(STORE.favs, Array.from(state.favorites));
  favCount.textContent = state.favorites.size;
  syncLikeButton();

  if (state.view === "favorites") renderPlaylist();
  else {
    const btn = $(`.row__like[data-id="${id}"]`, playlistEl);
    const liked = state.favorites.has(id);
    if (btn) {
      btn.classList.toggle("is-liked", liked);
      btn.setAttribute("aria-pressed", String(liked));
      btn.setAttribute(
        "aria-label",
        `${liked ? "Remove" : "Add"} ${track.title} ${liked ? "from" : "to"} favorites`
      );
    }
  }
}

/* ---------------------------------------------------------- */
/*  View / filter actions                                      */
/* ---------------------------------------------------------- */

function setView(view) {
  if (!VIEWS[view]) return;
  state.view = view;
  closeMenu();
  renderPlaylist();
  syncFilterControls();
  syncQueueInfo();
  $("#main").scrollTo?.({ top: 0, behavior: "smooth" });
}

function setGenre(genre) {
  state.genre = genre;
  closeMenu();
  renderPlaylist();
  syncFilterControls();
  syncQueueInfo();
}

function clearSearch(focus) {
  state.query = "";
  searchInput.value = "";
  searchClear.hidden = true;
  hideSearchPanel();
  renderPlaylist();
  if (focus) searchInput.focus();
}

function resetFilters() {
  state.genre = "all";
  searchInput.value = "";
  state.query = "";
  searchClear.hidden = true;
  hideSearchPanel();
  renderPlaylist();
  syncFilterControls();
  syncQueueInfo();
}

function shufflePlay() {
  const list = visibleTracks();
  if (!list.length) {
    toast("No songs to shuffle in this view");
    return;
  }
  state.shuffle = true;
  syncModeButtons();

  let pick = list[Math.floor(Math.random() * list.length)];
  if (list.length > 1) {
    while (pick.id === state.currentId) pick = list[Math.floor(Math.random() * list.length)];
  }
  loadTrack(pick.id, true);
}

function openMenu() {
  app.classList.add("menu-open");
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  app.classList.remove("menu-open");
  document.body.style.overflow = "";
}

/* ---------------------------------------------------------- */
/*  Events                                                     */
/* ---------------------------------------------------------- */

document.addEventListener("click", (e) => {
  if (!e.target.closest(".search")) hideSearchPanel();

  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.dataset.action;

    switch (action) {
      case "toggle-play":
        togglePlay();
        return;
      case "play-on": {
        const track = currentTrack();
        if (!track) {
          toast("Select a song first");
          return;
        }
        loadTrack(track.id, true);
        toast(`Playing “${track.title}” · ${track.artist}`);
        announce(`Play On: playing ${track.title} by ${track.artist}`);
        return;
      }
      case "pick-result": {
        e.stopPropagation();
        const id = actionEl.dataset.id;
        const picked = byId(id);
        if (picked) {
          loadTrack(id, true);
          hideSearchPanel();
          toast(`Playing “${picked.title}” · ${picked.artist}`);
        }
        return;
      }
      case "next":
        nextTrack(false);
        return;
      case "prev":
        prevTrack();
        return;
      case "shuffle":
        toggleShuffle();
        return;
      case "repeat":
        cycleRepeat();
        return;
      case "mute":
        toggleMute();
        return;
      case "favorite":
        e.stopPropagation();
        toggleFavorite(actionEl.dataset.id);
        return;
      case "favorite-current":
        toggleFavorite(state.currentId);
        return;
      case "clear-search":
        clearSearch(true);
        return;
      case "reset-filters":
        resetFilters();
        return;
      case "go-library":
        resetFilters();
        setView("library");
        return;
      case "shuffle-play":
        shufflePlay();
        return;
      case "open-menu":
        openMenu();
        return;
      case "close-menu":
        closeMenu();
        return;
      case "scroll-player":
        $("#player").scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      case "home":
        e.preventDefault();
        resetFilters();
        setView("library");
        $("#main").scrollTo?.({ top: 0, behavior: "smooth" });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
    }
  }

  const viewBtn = e.target.closest("[data-view]");
  if (viewBtn) {
    setView(viewBtn.dataset.view);
    return;
  }

  const genreBtn = e.target.closest("[data-genre]");
  if (genreBtn) {
    setGenre(genreBtn.dataset.genre);
    return;
  }

  const row = e.target.closest(".row");
  if (row && playlistEl.contains(row)) {
    const id = row.dataset.id;
    if (id === state.currentId) togglePlay();
    else loadTrack(id, true);
  }
});

searchInput.addEventListener("input", () => {
  state.query = searchInput.value.trim();
  searchClear.hidden = state.query.length === 0;
  renderPlaylist();
  renderSearchPanel();
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchInput.value) {
    e.stopPropagation();
    clearSearch(true);
  }
});

seekBar.addEventListener("pointerdown", () => {
  scrubbing = true;
});

window.addEventListener("pointerup", () => {
  scrubbing = false;
});

seekBar.addEventListener("input", () => {
  const dur = audio.duration;
  if (isFinite(dur) && dur > 0) {
    audio.currentTime = (Number(seekBar.value) / 1000) * dur;
  }
  setFill(seekBar, Number(seekBar.value) / 10);
  curTime.textContent = fmtTime(audio.currentTime);
  miniProgress.style.width = Number(seekBar.value) / 10 + "%";
});

seekBar.addEventListener("change", () => {
  scrubbing = false;
});

volBar.addEventListener("input", () => {
  setVolume(Number(volBar.value) / 100);
});

audio.addEventListener("play", () => {
  state.isPlaying = true;
  syncPlayButtons();
});

audio.addEventListener("pause", () => {
  state.isPlaying = false;
  syncPlayButtons();
});

audio.addEventListener("timeupdate", updateProgress);

audio.addEventListener("loadedmetadata", () => {
  durTime.textContent = fmtTime(audio.duration);
  updateProgress();
});

audio.addEventListener("ended", () => {
  nextTrack(true);
});

audio.addEventListener("error", () => {
  if (!audio.getAttribute("src")) return;
  state.isPlaying = false;
  syncPlayButtons();
  toast("This track could not be loaded");
});

document.addEventListener("keydown", (e) => {
  const target = e.target;
  const typing =
    target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

  if (typing) return;

  if (e.key === " " && target.tagName === "BUTTON") return;

  switch (e.key) {
    case " ":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowRight":
      e.preventDefault();
      seekBy(5);
      break;
    case "ArrowLeft":
      e.preventDefault();
      seekBy(-5);
      break;
    case "ArrowUp":
      e.preventDefault();
      setVolume(state.volume + 0.05);
      break;
    case "ArrowDown":
      e.preventDefault();
      setVolume(state.volume - 0.05);
      break;
    case "m":
    case "M":
      toggleMute();
      break;
    case "Escape":
      closeMenu();
      hideSearchPanel();
      break;
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1120) closeMenu();
});

/* ---------------------------------------------------------- */
/*  Init                                                       */
/* ---------------------------------------------------------- */

function init() {
  $("#year").textContent = String(new Date().getFullYear());

  audio.volume = state.volume;
  minibar.hidden = false;

  loadTrack(TRACKS[0].id, false);
  syncAll();

  announce("Sonora music player ready");
}

init();
