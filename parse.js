// Finds Bible references ("John 3:16", "first John chapter one verse nine") in spoken text.
(function (root) {
  const BOOKS = ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalm","Proverbs","Ecclesiastes","Song Of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi","Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"];

  // spoken/written name -> book key
  const NAMES = {};
  for (const b of BOOKS) NAMES[b.toLowerCase()] = b;
  Object.assign(NAMES, {
    "psalms": "Psalm", "song of songs": "Song Of Solomon", "songs of solomon": "Song Of Solomon",
    "revelations": "Revelation", "the revelation": "Revelation", "acts of the apostles": "Acts",
    "ecclesiastic": "Ecclesiastes", "lamentation": "Lamentations", "song of solomon": "Song Of Solomon",
    // speech engines often drop the plural "s"
    "roman": "Romans", "hebrew": "Hebrews", "proverb": "Proverbs", "galatian": "Galatians", "ephesian": "Ephesians",
    "philippian": "Philippians", "colossian": "Colossians",
    "1 corinthian": "1 Corinthians", "2 corinthian": "2 Corinthians", "1 thessalonian": "1 Thessalonians",
    "2 thessalonian": "2 Thessalonians", "1 chronicle": "1 Chronicles", "2 chronicle": "2 Chronicles",
  });
  const namePattern = Object.keys(NAMES).sort((a, b) => b.length - a.length)
    .map(n => n.replace(/ /g, "\\s+")).join("|");
  const REF = new RegExp("\\b(" + namePattern + ")\\s+(\\d{1,3})\\s*(?::|\\.|\\s)\\s*(\\d{1,3})(?:\\s*-\\s*(\\d{1,3}))?", "g");

  const UNITS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  const TEENS = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
  const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

  // "three sixteen" -> "3 16", "one hundred and nineteen" -> "119"
  function wordsToNumbers(text) {
    const out = [];
    let cur = null;
    const flush = () => { if (cur !== null) out.push(String(cur)); cur = null; };
    const words = text.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (w in UNITS) {
        if (cur !== null && cur % 10 !== 0) flush();
        if (cur !== null && cur % 100 >= 10 && cur % 100 < 20) flush();
        cur = (cur || 0) + UNITS[w];
      } else if (w in TEENS || w in TENS) {
        if (cur !== null && cur % 100 !== 0) flush();
        cur = (cur || 0) + (TEENS[w] || TENS[w]);
      } else if (w === "hundred" && cur !== null && cur < 10) {
        cur *= 100;
      } else if (w === "and" && cur !== null && cur % 100 === 0 && cur > 0 && /^[a-z]+$/.test(words[i + 1] || "") &&
                 (words[i + 1] in UNITS || words[i + 1] in TEENS || words[i + 1] in TENS)) {
        // "hundred and nineteen": keep building the same number
      } else {
        flush();
        out.push(w);
      }
    }
    flush();
    return out.join(" ");
  }

  function normalize(text) {
    let t = " " + text.toLowerCase().replace(/[,;!?]/g, " ").replace(/['’]/g, "").replace(/[–—]/g, "-") + " ";
    t = t.replace(/\b(first|1st|i)\s+(?=(samuel|kings|chronicles?|corinthians?|thessalonians?|timothy|peter|john)\b)/g, "1 ")
         .replace(/\b(second|2nd|ii)\s+(?=(samuel|kings|chronicles?|corinthians?|thessalonians?|timothy|peter|john)\b)/g, "2 ")
         .replace(/\b(third|3rd|iii)\s+(?=john\b)/g, "3 ");
    t = wordsToNumbers(t);
    t = t.replace(/\bchapter\s+/g, "")
         .replace(/\s*\b(verses?|vs|v)\b\.?\s*/g, ":")
         .replace(/(\d)\s+(to|through|thru)\s+(\d)/g, "$1-$3");
    return t;
  }

  // Returns [{book, chapter, verse, verseEnd}] in the order they appear.
  function findRefs(text) {
    const t = normalize(text);
    const refs = [];
    for (const m of t.matchAll(REF)) {
      const verse = +m[3];
      const verseEnd = m[4] ? Math.max(+m[4], verse) : verse;
      refs.push({ book: NAMES[m[1].replace(/\s+/g, " ")], chapter: +m[2], verse, verseEnd });
    }
    return refs;
  }

  function label(r) {
    return `${r.book} ${r.chapter}:${r.verse}${r.verseEnd > r.verse ? "-" + r.verseEnd : ""}`;
  }

  // Looks the reference up in a {book:{chapter:{verse:text}}} bible; null if it doesn't exist.
  function lookup(bible, r) {
    const ch = bible[r.book] && bible[r.book][r.chapter];
    if (!ch || !ch[r.verse]) return null;
    const lines = [];
    for (let v = r.verse; v <= r.verseEnd && ch[v]; v++) lines.push({ v, text: ch[v] });
    return lines;
  }

  const api = { findRefs, label, lookup, normalize };
  if (typeof module !== "undefined") module.exports = api; else root.Parse = api;
})(this);
