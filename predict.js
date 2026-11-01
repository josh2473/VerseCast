// Guesses which verse is being quoted ("all is vanity" -> Ecclesiastes 1:2) by finding the
// longest run of the preacher's words that appears word-for-word in a KJV verse.
(function (root) {
  const tokens = s => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

  function buildIndex(bible) {
    const verses = [], postings = new Map();
    for (const book in bible) for (const ch in bible[book]) for (const v in bible[book][ch]) {
      const t = tokens(bible[book][ch][v]), id = verses.length;
      verses.push({ book, chapter: +ch, verse: +v, tokens: t });
      for (const w of new Set(t)) (postings.get(w) || postings.set(w, []).get(w)).push(id);
    }
    const idf = new Map();
    for (const [w, ids] of postings) idf.set(w, Math.log(verses.length / ids.length));
    return { verses, postings, idf };
  }

  const MIN_WORDS = 3;      // a quote is at least 3 consecutive matching words
  const MIN_SCORE = 8;      // ...and they can't all be common words ("and the lord said")
  const MAX_TIES = 8;       // if more verses than this match equally well, the phrase isn't distinctive
  const RARE = 1500;        // only look at verses sharing a word used in fewer verses than this

  // Returns up to `limit` [{ref, score}] best first, or [] when nothing is confidently quoted.
  function predict(index, text, limit = 3) {
    const q = tokens(text).slice(-40);
    const cands = new Set();
    for (const w of q) {
      const ids = index.postings.get(w);
      if (ids && ids.length < RARE) ids.forEach(id => cands.add(id));
    }
    const hits = [];
    for (const id of cands) {
      const t = index.verses[id].tokens;
      let best = 0, bestLen = 0;
      for (let i = 0; i < q.length; i++) for (let j = 0; j < t.length; j++) {
        let k = 0, s = 0;
        while (i + k < q.length && j + k < t.length && q[i + k] === t[j + k]) s += index.idf.get(q[i + k]), k++;
        if (k >= MIN_WORDS && s > best) best = s, bestLen = k;
      }
      if (best >= MIN_SCORE) hits.push({ id, score: best });
    }
    if (!hits.length) return [];
    hits.sort((a, b) => b.score - a.score || index.verses[a.id].tokens.length - index.verses[b.id].tokens.length);
    if (hits.filter(h => h.score >= hits[0].score - 1e-9).length > MAX_TIES) return [];
    return hits.slice(0, limit).map(h => {
      const v = index.verses[h.id];
      return { ref: { book: v.book, chapter: v.chapter, verse: v.verse, verseEnd: v.verse }, score: h.score };
    });
  }

  const api = { buildIndex, predict };
  if (typeof module !== "undefined") module.exports = api; else root.Predict = api;
})(this);
