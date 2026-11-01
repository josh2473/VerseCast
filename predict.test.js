// Run: node predict.test.js
const assert = require("assert");
global.window = global;
require("./kjv.js");
const { buildIndex, predict } = require("./predict.js");
const { label } = require("./parse.js");

const t0 = Date.now();
const index = buildIndex(window.KJV);
const built = Date.now() - t0;

const top = text => predict(index, text).map(p => label(p.ref));
const cases = [
  // [spoken text, verse that must be in the suggestions]
  ["the preacher said all is vanity", "Ecclesiastes 1:2"],
  ["for God so loved the world that he gave", "John 3:16"],
  ["the Lord is my shepherd I shall not want", "Psalm 23:1"],
  ["I can do all things through Christ", "Philippians 4:13"],
  ["in the beginning was the word", "John 1:1"],
  ["Jesus wept", null],                                    // only 2 words: too short to call
  ["and the Lord said unto Moses", null],                  // hundreds of verses say this
  ["good morning church please be seated", null],
];

for (const [text, want] of cases) {
  const got = top(text);
  if (want) assert.ok(got.includes(want), `${text} -> ${got}`);
  else assert.deepStrictEqual(got, [], `${text} -> ${got}`);
}
const t1 = Date.now();
for (let i = 0; i < 50; i++) predict(index, "brethren we know that all things work together for good to them that love God");
console.log(`ok ${cases.length} cases, index ${built}ms, ${(Date.now() - t1) / 50}ms per phrase`);
