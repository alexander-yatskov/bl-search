import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const contentScript = await readFile(
  new URL("../content.js", import.meta.url),
  "utf8"
);

test("processes jobs after an SPA transition from another LinkedIn page", async () => {
  let mutationCallback;
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
      setTimeout
    }
  };

  vm.runInNewContext(contentScript, context);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(queryCount, 0);

  location.pathname = "/jobs/search/";
  mutationCallback();
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.equal(queryCount, 1);
});
