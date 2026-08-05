import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const contentScript = await readFile(
  new URL("../content.js", import.meta.url),
  "utf8"
);

test("discovers an obfuscated card through its dismiss control", async () => {
  const dismissSelector =
    'button[aria-label^="Dismiss "][aria-label$=" job"]';
  const jobLinkSelector = [
    'a[href*="/jobs/view/"]',
    'a[href*="currentJobId="]'
  ].join(", ");
  const classes = new Set();
  let controls = null;
  let controlsHost = null;

  const card = {
    innerText: [
      "Selected, Software Engineer III (Python) (Verified job)",
      "Software Engineer III (Python)",
      "EasyPost",
      "United States (Remote)",
      "$130K/yr - $170K/yr",
      "Posted 1 month ago"
    ].join("\n"),
    parentElement: null,
    scrollHeight: 120,
    getBoundingClientRect() { return { height: 120, width: 600 }; },
    attributes: new Map(),
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      toggle(name, enabled) {
        enabled ? classes.add(name) : classes.delete(name);
      }
    },
    append(element) { controls = element; controlsHost = card; },
    getAttribute(name) { return this.attributes.get(name) || null; },
    querySelector(selector) {
      if (selector === dismissSelector) return dismissButton;
      if (selector === ".bl-search-controls") return controls;
      return null;
    },
    querySelectorAll(selector) {
      return selector === dismissSelector ? [dismissButton] : [];
    },
    setAttribute(name, value) { this.attributes.set(name, value); }
  };
  const visualCard = {
    ...card,
    attributes: new Map(),
    scrollHeight: 180,
    getBoundingClientRect() { return { height: 180, width: 650 }; },
    contains(element) { return element === card || element === buttonWrapper; },
    append(element) { controls = element; controlsHost = visualCard; },
    getAttribute(name) { return this.attributes.get(name) || null; },
    setAttribute(name, value) { this.attributes.set(name, value); }
  };
  const infiniteScrollHost = {
    ...visualCard,
    innerText: visualCard.innerText,
    parentElement: null,
    scrollHeight: 5000,
    getBoundingClientRect() { return { height: 700, width: 700 }; },
    querySelectorAll(selector) {
      return selector === dismissSelector ? [dismissButton] : [];
    }
  };
  visualCard.parentElement = infiniteScrollHost;
  card.parentElement = visualCard;
  const buttonWrapper = {
    innerText: "",
    parentElement: card,
    querySelectorAll(selector) {
      return selector === dismissSelector ? [dismissButton] : [];
    }
  };
  const dismissButton = {
    parentElement: buttonWrapper,
    getAttribute(name) {
      return name === "aria-label"
        ? "Dismiss Software Engineer III (Python) job"
        : null;
    }
  };
  const classicLink = {
    href: "https://www.linkedin.com/jobs/view/4434901694",
    closest() { return card; }
  };

  const created = [];
  const document = {
    body: { append() {} },
    createElement(tagName) {
      const element = {
        children: [],
        listeners: new Map(),
        append(...children) { this.children.push(...children); },
        prepend(...children) { this.children.unshift(...children); },
        addEventListener(type, listener) { this.listeners.set(type, listener); },
        remove() {}
      };
      created.push({ element, tagName });
      return element;
    },
    querySelector() { return null; },
    querySelectorAll(selector) {
      if (selector === jobLinkSelector) return [classicLink];
      return selector === dismissSelector ? [dismissButton] : [];
    }
  };

  const context = {
    BLSearchStorage: {
      BLOCKED_KEY: "blockedCompanies",
      blockCompany: async () => {},
      loadRecords: async () => ({})
    },
    MutationObserver: class { observe() {} },
    URL,
    chrome: {
      runtime: { getURL: (path) => `chrome-extension://test/${path}` },
      storage: {
        local: { get: async (defaults) => defaults },
        onChanged: { addListener() {} }
      }
    },
    console,
    document,
    location: {
      href: "https://www.linkedin.com/jobs/search-results/?currentJobId=4434901694",
      origin: "https://www.linkedin.com",
      pathname: "/jobs/search-results/",
      search: "?currentJobId=4434901694"
    },
    window: {
      clearInterval() {},
      clearTimeout,
      innerHeight: 800,
      setInterval() { return 1; },
      setTimeout
    }
  };

  vm.runInNewContext(contentScript, context);
  await new Promise((resolve) => setTimeout(resolve, 200));

  assert.ok(controls, "the obfuscated card should receive controls");
  assert.equal(controlsHost, visualCard);
  const button = created.find(({ tagName }) => tagName === "button")?.element;
  assert.equal(button?.textContent, "Block");
  assert.equal(button?.title, "Hide all loaded jobs from EasyPost");
  assert.equal(created.filter(({ tagName }) => tagName === "button").length, 1);

  await button.listeners.get("click")({
    preventDefault() {},
    stopPropagation() {}
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(classes.has("bl-search-hidden"), true);
});
