// Run: node songs.test.js
const assert = require("assert");
const { parseShow } = require("./songs.js");

// shape of a FreeShow .show file: layout order, parent + children slides, a background image item, a disabled slide
const show = ["x", {
  name: "Test Hymn", category: "song", meta: { number: "12" }, settings: { activeLayout: "L" },
  layouts: { L: { slides: [{ id: "a" }, { id: "b", children: { b2: { disabled: true } } }, { id: "c", disabled: true }] } },
  slides: {
    a: { group: "Verse", children: ["a1"], items: [{ type: "media", src: "bg.png" }, { lines: [{ text: [{ value: "Line one" }] }, { text: [{ value: "Line " }, { value: "two" }] }] }] },
    a1: { group: null, items: [{ lines: [{ text: [{ value: "Child&nbsp;slide<br>next" }] }] }] },
    b: { group: "Chorus", children: ["b1", "b2"], items: [{ lines: [{ text: [{ value: "Chorus" }] }] }] },
    b1: { items: [{ lines: [{ text: [{ value: "Chorus 2" }] }] }] },
    b2: { items: [{ lines: [{ text: [{ value: "hidden" }] }] }] },
    c: { group: "Ending", items: [{ lines: [{ text: [{ value: "skipped" }] }] }] },
  },
}];

const s = parseShow(JSON.stringify(show));
assert.strictEqual(s.name, "Test Hymn");
assert.strictEqual(s.number, "12");
assert.deepStrictEqual(s.slides, [
  { group: "Verse", text: "Line one\nLine two" },
  { group: "Verse", text: "Child slide\nnext" },
  { group: "Chorus", text: "Chorus" },
  { group: "Chorus", text: "Chorus 2" },
]);
console.log("ok songs");
