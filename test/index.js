const path = require("path");
const fs = require("fs");
const assert = require("assert");
const babel = require("babel-core");
const plugin = require("../src/index");

function trim(str) {
  return str.replace(/^\s+|\s+$/, "");
}

function run(directory) {
  const fixturesDir = path.join(__dirname, directory);

  fs.readdirSync(fixturesDir).map((caseName) => {
    if (caseName === '.babelrc') {
      return;
    }

    it(caseName.split("-").join(" "), () => {
      const fixtureDir = path.join(fixturesDir, caseName);

      const actual = babel.transformFileSync(
        path.join(fixtureDir, "actual.js")
      ).code;
      const expected = fs.readFileSync(
        path.join(fixtureDir, "expected.js")
      ).toString();

      assert.equal(trim(actual), trim(expected));
    });
  });
}

describe("fixtures", () => run("fixtures"));
describe("fixtures (default props)", () => run("fixtures-default-props"));
describe("fixtures (hoist default props)", () => run("fixtures-hoist-default-props"));
describe("fixtures (pure components)", () => run("fixtures-pure-components"));
