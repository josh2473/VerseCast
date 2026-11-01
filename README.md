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

Double-click **Start VerseCast.bat**. It starts a small local server (keep its minimized window open) and opens VerseCast in Edge. If a second screen is connected, the projector opens full screen on it.

Click **Start listening**, allow the microphone, and choose your input and accent from the drop-downs.

| Key / button | What it does |
|---|---|
| ← / → | Previous / next verse |
| Esc | Clear the screen |
| Search box | Type a reference (`Romans 8:28-30`) or words from a verse (`the lord is my shepherd`) |
| Detected references | Click to show. Grey "quoted?" items are guesses from quoted words and are never shown automatically |

## OBS

1. **Tools → Scripts → +** and pick `obs/versecast.lua`.
2. With VerseCast running, click **Add lower third to current scene** (transparent, sits over your camera) or **Add full-screen slide to current scene**.

Or add a **Browser** source yourself, 1920×1080:

- Lower third: `http://localhost:8765/output.html?overlay`
- Full screen: `http://localhost:8765/output.html`

**Control dock:** **Docks → Custom Browser Docks**, name `VerseCast`, URL `http://localhost:8765/?dock`. The dock and the Edge window stay in sync. Listening has to run in the Edge window, because OBS's built-in browser has no speech recognition.

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
