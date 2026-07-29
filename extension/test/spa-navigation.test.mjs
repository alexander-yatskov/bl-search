import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const contentScript = await readFile(
  new URL("../content.js", import.meta.url),
  "utf8"
);

test("processes jobs rendered in LinkedIn's SPA preload document", async () => {
  let mutationCallback;
  let intervalCallback;
  let queryCount = 0;
  const location = {
    origin: "https://www.linkedin.com",
    pathname: "/feed/"
  };

  const context = {
    BLSearchStorage: {
      BLOCKED_KEY: "blockedCompanies",
      loadRecords: async () => ({})
    },
    MutationObserver: class {
      constructor(callback) {
        mutationCallback = callback;
      }

      observe() {}
    },
    chrome: {
      storage: {
        local: {
          get: async (defaults) => defaults
        },
        onChanged: {
          addListener() {}
        }
      }
    },
    console,
    document: {
      body: {},
      querySelector() {
        return null;
      },
      querySelectorAll() {
        queryCount += 1;
        return [];
      }
    },
    location,
    URL,
    window: {
      clearInterval() {},
      clearTimeout,
      setInterval(callback) {
        intervalCallback = callback;
      },
      setTimeout
    }
  };

  vm.runInNewContext(contentScript, context);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(queryCount, 0);

  location.pathname = "/preload/";
  intervalCallback();
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.equal(queryCount, 1);
  assert.equal(typeof mutationCallback, "function");
});
