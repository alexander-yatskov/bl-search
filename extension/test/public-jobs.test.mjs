import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const contentScript = await readFile(
  new URL("../content.js", import.meta.url),
  "utf8"
);

test("adds controls to a public LinkedIn job card on cold start", async () => {
  const classes = new Set(["base-search-card"]);
  let controls = null;
  let blockedName = null;

  const values = new Map([
    [".base-search-card__title", "Back-End Engineer"],
    [".base-search-card__subtitle", "LotusFlare"],
    [".job-search-card__location", "Belgrade, Serbia"]
  ]);
  const textElement = (textContent) => ({ textContent });
  const link = {
    href: "https://rs.linkedin.com/jobs/view/back-end-engineer-at-lotusflare-4416337118",
    textContent: "Back-End Engineer",
    closest() {
      return card;
    },
    getAttribute() {
      return null;
    }
  };
  const card = {
    attributes: new Map(),
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, enabled) {
        enabled ? classes.add(name) : classes.delete(name);
      }
    },
    append(element) {
      controls = element;
    },
    getAttribute(name) {
      return this.attributes.get(name) || null;
    },
    querySelector(selector) {
      if (selector === 'a[href*="/jobs/view/"]') return link;
      if (selector === ".bl-search-controls") return controls;
      if (selector === ".bl-search-duplicate-summary") return null;
      return values.has(selector) ? textElement(values.get(selector)) : null;
    },
    setAttribute(name, value) {
      this.attributes.set(name, value);
    }
  };

  const created = [];
  const document = {
    body: { append() {} },
    createElement(tagName) {
      const element = {
        children: [],
        listeners: new Map(),
        className: "",
        textContent: "",
        append(...children) { this.children.push(...children); },
        addEventListener(type, listener) { this.listeners.set(type, listener); },
        remove() {}
      };
      created.push({ element, tagName });
      return element;
    },
    querySelector() { return null; },
    querySelectorAll(selector) {
      return selector === 'a[href*="/jobs/view/"]' ? [link] : [];
    }
  };

  const context = {
    BLSearchStorage: {
      BLOCKED_KEY: "blockedCompanies",
      blockCompany: async (name) => { blockedName = name; },
      loadRecords: async () => ({})
    },
    MutationObserver: class { observe() {} },
    URL,
    chrome: {
      storage: {
        local: { get: async (defaults) => defaults },
        onChanged: { addListener() {} }
      }
    },
    console,
    document,
    location: {
      origin: "https://www.linkedin.com",
      pathname: "/jobs/search/"
    },
    window: {
      clearInterval() {},
      clearTimeout,
      setInterval() { return 1; },
      setTimeout
    }
  };

  vm.runInNewContext(contentScript, context);
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.ok(controls, "the public card should receive extension controls");
  const button = created.find(({ tagName }) => tagName === "button")?.element;
  assert.equal(button?.textContent, "Block company");
  assert.equal(classes.has("bl-search-hidden"), false);

  await button.listeners.get("click")({
    preventDefault() {},
    stopPropagation() {}
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(blockedName, "LotusFlare");
  assert.equal(classes.has("bl-search-hidden"), true);
});
