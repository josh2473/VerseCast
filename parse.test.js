// Run: node parse.test.js
const assert = require("assert");
const { findRefs, label } = require("./parse.js");

const cases = [
  ["turn with me to John 3:16", ["John 3:16"]],
  ["John chapter three verse sixteen", ["John 3:16"]],
  ["John three sixteen", ["John 3:16"]],
  ["first John one nine", ["1 John 1:9"]],
  ["1st Corinthians 13 verses 4 to 7", ["1 Corinthians 13:4-7"]],
  ["Psalms one hundred and nineteen verse one hundred and five", ["Psalm 119:105"]],
  ["Psalm 23, 1", ["Psalm 23:1"]],
  ["Romans 8:28 and also Philippians 4:13", ["Romans 8:28", "Philippians 4:13"]],
  ["song of songs two four", ["Song Of Solomon 2:4"]],
  ["revelations twenty one four", ["Revelation 21:4"]],
  ["second Timothy chapter three verses sixteen through seventeen", ["2 Timothy 3:16-17"]],
  ["Roman's 8 28", ["Romans 8:28"]],
  ["Hebrew eleven one", ["Hebrews 11:1"]],
  ["first Corinthian thirteen four", ["1 Corinthians 13:4"]],
  ["acts of the apostles two thirty eight", ["Acts 2:38"]],
  ["John said he was the light", []],
  ["in Mark four the parable", []],
];

for (const [input, want] of cases) {
  assert.deepStrictEqual(findRefs(input).map(label), want, input);
}
console.log(`ok ${cases.length} cases`);
