# VerseCast

Live scripture for church services. VerseCast listens to the preacher, spots Bible references ("John 3:16", "first Corinthians thirteen four") and word-for-word quotes ("all is vanity"), and puts the verse on the projector, in OBS, or out over NDI.

- Free, runs on your own PC, KJV (public domain) built in
- Live speech recognition with English (Ghana / Nigeria / UK / US) accents
- Full-screen projector on the second screen, opened automatically
- OBS lower third or full-screen slide, plus an OBS control dock
- Always-on-top mini controller

## Requirements

- Windows 10 or 11
- [Node.js](https://nodejs.org) (LTS)
- Microsoft Edge (speech recognition needs Edge or Chrome and an internet connection)

## Start

Download: **Code → Download ZIP** at the top of this page, then unzip it anywhere (e.g. your Desktop).

Double-click **Start VerseCast.bat**. It starts a small local server (keep its minimized window open) and opens VerseCast in Edge. Tick **2nd screen** to put the projector full screen on your second screen; untick it if you only use OBS. VerseCast remembers the choice.

Click **Start listening**, allow the microphone, and choose your input and accent from the drop-downs.

| Key / button | What it does |
|---|---|
| ← / → | Previous / next verse |
| Esc | Clear the screen |
| Search box | Type a reference (`Romans 8:28-30`) or words from a verse (`the lord is my shepherd`) |
| Detected references | Click to show. Grey "quoted?" items are guesses from quoted words and are never shown automatically |

## Songs and hymns

Open the **Songs** tab. VerseCast reads your **FreeShow** song library automatically (read-only; it finds FreeShow's Shows folder, including under OneDrive), and **+ New** lets you paste lyrics straight into VerseCast — leave a blank line between slides. Search by title or hymn number, click a slide to show it, ←/→ to move, click the showing slide again to hide it.

Lyrics you add are yours to manage: modern worship songs usually need your church's CCLI (or similar) licence to be projected or streamed.

## OBS

1. **Tools → Scripts → +** and pick `obs/versecast.lua`.
2. With VerseCast running, click **Add lower third to current scene** (transparent, sits over your camera) or **Add full-screen slide to current scene**.

Or add a **Browser** source yourself, 1920×1080:

- Lower third: `http://localhost:8765/output.html?overlay`
- Full screen: `http://localhost:8765/output.html`

**Control dock:** **Docks → Custom Browser Docks**, name `VerseCast`, URL `http://localhost:8765/?dock`. The dock and the Edge window stay in sync. The dock's **Start listening** button works as long as VerseCast is open in Edge (OBS's built-in browser has no speech recognition, so Edge does the listening).

The **Lower third / Full screen** switch changes how verses and songs look in OBS: a lower third over your video, or big centred text over a dimmed picture.

### NDI

With the [DistroAV](https://github.com/DistroAV/DistroAV) plugin, right-click the VerseCast source → **Filters → + → Dedicated NDI output** to send it to other machines as an NDI source.

## Limits

- KJV only. Quote detection needs about 3+ words that match the KJV wording exactly; paraphrases won't match.
- Uses the browser's free speech recognition, so a good microphone or a feed from the sound desk makes a big difference.

## Bible text

`kjv.js` is the King James Version (1769 text, 66 books) from [eBible.org](https://ebible.org/find/details.php?id=eng-kjv), which marks it public domain. Words the translators supplied (printed in italics in print Bibles) appear as plain text. In the United Kingdom the KJV is under Crown letters patent for *printing*; elsewhere it is public domain.

## Licence

MIT, © 2026 BBA Media Team. See [LICENSE](LICENSE).

## Developers

Plain HTML/JS, no build step. `server.js` serves the pages and relays what's on screen. Run the self-tests with:

```
node parse.test.js
node predict.test.js
```
