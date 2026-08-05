(() => {
  "use strict";

  if (globalThis.__blSearchContentLoaded) {
    return;
  }
  globalThis.__blSearchContentLoaded = true;

  const STORAGE_KEY = BLSearchStorage.BLOCKED_KEY;
  const PROCESSED_ATTRIBUTE = "data-bl-search-processed";
  const JOB_LINK_SELECTOR = [
    'a[href*="/jobs/view/"]',
    'a[href*="currentJobId="]'
  ].join(", ");
  const DISMISS_BUTTON_SELECTOR =
    'button[aria-label^="Dismiss "][aria-label$=" job"]';
  const CARD_SELECTORS = [
    "li[data-occludable-job-id]",
    "li[data-job-id]",
    "[data-occludable-job-id]",
    "[data-entity-urn*='jobPosting']",
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".job-card-job-posting-card-wrapper",
    ".jobs-search-results-list__list-item",
    ".base-search-card"
  ];

  let blockedCompanies = new Map();
  let dedupEnabled = true;
  let observer = null;
  let processingTimerID = null;
  let routeMonitorID = null;
  let scheduled = false;
  let lastRoute = currentRoute();

  function handleProcessingError(error) {
    if (error?.message?.includes("Extension context invalidated")) {
      observer?.disconnect();
      if (routeMonitorID !== null) {
        window.clearInterval(routeMonitorID);
      }
      scheduled = false;
      processingTimerID = null;
      return;
    }
    console.error("BL Search failed to process job cards", error);
  }

  function isJobContentRoute() {
    return location.pathname === "/jobs" ||
      location.pathname.startsWith("/jobs/") ||
      location.pathname === "/preload" ||
      location.pathname.startsWith("/preload/");
  }

  function currentRoute() {
    return `${location.pathname}${location.search || ""}`;
  }

  function normalize(value) {
    return (value || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/\b(incorporated|corporation|company|limited|inc|corp|ltd|llc)\b\.?/gu, " ")
      .replace(/[^\p{L}\p{N}+#]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function normalizeTitle(value) {
    return normalize(value)
      .replace(/\b(m f d|f m d|all genders|remote|hybrid|on site|onsite)\b/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function textFrom(element, selectors) {
    for (const selector of selectors) {
      const candidate = element.querySelector(selector);
      const value = candidate?.textContent?.trim();
      if (value) {
        return value;
      }
    }
    return "";
  }

  function findCard(link) {
    for (const selector of CARD_SELECTORS) {
      const card = link.closest(selector);
      if (card) {
        return card;
      }
    }
    const listItem = link.closest("li");
    if (listItem) {
      return listItem;
    }
    return link.href.includes("/jobs/view/") ? link.parentElement : null;
  }

  function titleFromDismissButton(button) {
    return button?.getAttribute("aria-label")
      ?.replace(/^Dismiss /u, "")
      .replace(/ job$/u, "")
      .trim() || "";
  }

  function meaningfulLines(element) {
    return (element?.innerText || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function hasCardSizedBox(element) {
    const rectangle = element.getBoundingClientRect();
    const maxHeight = Math.min(window.innerHeight * 0.8, 600);
    const scrollHeight = element.scrollHeight || rectangle.height;
    return rectangle.width >= 200 &&
      rectangle.height >= 48 &&
      rectangle.height <= maxHeight &&
      scrollHeight <= rectangle.height + 100;
  }

  function findDismissCard(button) {
    const title = titleFromDismissButton(button);
    if (!title) {
      return null;
    }

    let element = button.parentElement;
    let candidate = null;
    while (element && element !== document.body) {
      const dismissCount = element.querySelectorAll(
        DISMISS_BUTTON_SELECTOR
      ).length;
      if (dismissCount > 1) {
        break;
      }
      const lines = meaningfulLines(element);
      const textPosting = textPostingFromDismissCard(element, title);
      if (dismissCount === 1 && lines.some((line) => line === title) &&
          textPosting.company && hasCardSizedBox(element)) {
        candidate = element;
      }
      element = element.parentElement;
    }
    return candidate;
  }

  function outermostCards(cards) {
    const result = [];
    for (const card of cards) {
      if (result.some((existing) => existing.contains?.(card))) {
        continue;
      }
      for (let index = result.length - 1; index >= 0; index--) {
        if (card.contains?.(result[index])) {
          result.splice(index, 1);
        }
      }
      result.push(card);
    }
    return result;
  }

  function textPostingFromDismissCard(card, title) {
    const lines = meaningfulLines(card);
    const titleIndex = lines.findIndex((line) => line === title);
    if (titleIndex < 0) {
      return { company: "", locationName: "" };
    }
    const details = lines.slice(titleIndex + 1).filter((line) =>
      line !== title &&
      !line.startsWith("Selected, ") &&
      !line.startsWith("Posted ") &&
      !/^\d+ (?:minute|hour|day|week|month)s? ago$/u.test(line)
    );
    return {
      company: details[0] || "",
      locationName: details[1] || ""
    };
  }

  function extractPosting(card) {
    const link = card.querySelector(JOB_LINK_SELECTOR);
    const dismissButton = card.querySelector(DISMISS_BUTTON_SELECTOR);
    if (!link && !dismissButton) {
      return null;
    }

    const url = new URL(link?.href || location.href, location.origin);
    const idMatch = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/);
    const id = idMatch?.[1] ||
      url.searchParams.get("currentJobId") ||
      card.getAttribute("data-occludable-job-id") ||
      card.getAttribute("data-job-id") ||
      card.getAttribute("data-entity-urn")?.match(/jobPosting:(\d+)/u)?.[1] ||
      "";
    const dismissTitle = titleFromDismissButton(dismissButton);
    const title = dismissTitle ||
      link?.getAttribute("aria-label")?.trim() ||
      textFrom(card, [
        ".job-card-list__title--link",
        ".job-card-container__link",
        ".job-card-list__title",
        ".job-card-job-posting-card-wrapper__title",
        ".artdeco-entity-lockup__title",
        ".base-search-card__title",
        "a[href*='/jobs/view/'] strong",
        "a[href*='/jobs/view/']"
      ]);
    let company = textFrom(card, [
      ".artdeco-entity-lockup__subtitle",
      ".job-card-container__primary-description",
      ".job-card-container__company-name",
      ".job-card-list__company-name",
      ".job-card-job-posting-card-wrapper__company-name",
      ".base-search-card__subtitle"
    ]);
    let locationName = textFrom(card, [
      ".artdeco-entity-lockup__caption",
      ".job-card-container__metadata-item",
      ".job-card-container__metadata-wrapper",
      ".job-search-card__location"
    ]);

    if (dismissTitle && (!company || !locationName)) {
      const textPosting = textPostingFromDismissCard(card, dismissTitle);
      company ||= textPosting.company;
      locationName ||= textPosting.locationName;
    }

    if (!title || !company) {
      return null;
    }

    return {
      card,
      company,
      companyKey: normalize(company),
      dedupKey: `${normalize(company)}::${normalizeTitle(title)}`,
      id,
      location: locationName,
      title,
      url: url.href
    };
  }

  function addControls(posting) {
    if (posting.card.querySelector(".bl-search-controls")) {
      return;
    }

    posting.card.classList.add("bl-search-card-host");
    const controls = document.createElement("div");
    controls.className = "bl-search-controls";

    const hideButton = document.createElement("button");
    hideButton.className = "bl-search-button";
    hideButton.type = "button";
    hideButton.textContent = "Block";
    hideButton.title = `Hide all loaded jobs from ${posting.company}`;

    const icon = document.createElement("img");
    icon.alt = "";
    icon.className = "bl-search-button-icon";
    icon.src = chrome.runtime.getURL("icons/icon16.png");
    hideButton.prepend(icon);
    hideButton.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await BLSearchStorage.blockCompany(posting.company);
      blockedCompanies.set(posting.companyKey, posting.company);
      processCards(true);
      showToast(`${posting.company} added to the blocklist`);
    });

    controls.append(hideButton);
    posting.card.append(controls);
  }

  function updateDuplicateSummary(primary, duplicates) {
    let summary = primary.card.querySelector(".bl-search-duplicate-summary");
    if (!summary) {
      summary = document.createElement("span");
      summary.className = "bl-search-duplicate-summary";
      primary.card.querySelector(".bl-search-controls")?.append(summary);
    }

    const locations = [...new Set(
      [primary, ...duplicates].map((posting) => posting.location).filter(Boolean)
    )];
    const locationText = locations.length ? ` · ${locations.join(" · ")}` : "";
    const text = `${duplicates.length + 1} similar postings${locationText}`;
    const title =
      "Grouped locally by normalized company and title. Open options to disable grouping.";
    if (summary.textContent !== text) {
      summary.textContent = text;
    }
    if (summary.title !== title) {
      summary.title = title;
    }
  }

  function showToast(message) {
    document.querySelector(".bl-search-toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "bl-search-toast";
    toast.textContent = message;
    document.body.append(toast);
    window.setTimeout(() => toast.remove(), 2500);
  }

  async function processCards(force = false) {
    scheduled = false;
    processingTimerID = null;

    if (!isJobContentRoute()) {
      return;
    }

    const cards = new Set();
    document.querySelectorAll(JOB_LINK_SELECTOR).forEach((link) => {
      const card = findCard(link);
      if (card) {
        cards.add(card);
      }
    });
    document.querySelectorAll(DISMISS_BUTTON_SELECTOR).forEach((button) => {
      const card = findDismissCard(button);
      if (card) {
        cards.add(card);
      }
    });

    const postings = [];
    for (const card of outermostCards(cards)) {
      if (!force && card.getAttribute(PROCESSED_ATTRIBUTE) === "true") {
        const posting = extractPosting(card);
        if (posting) {
          postings.push(posting);
        }
        continue;
      }

      card.setAttribute(PROCESSED_ATTRIBUTE, "true");
      card.classList.remove("bl-search-hidden");
      card.querySelector(".bl-search-duplicate-summary")?.remove();

      const posting = extractPosting(card);
      if (!posting) {
        continue;
      }

      addControls(posting);
      postings.push(posting);
    }

    for (const posting of postings) {
      posting.card.classList.toggle(
        "bl-search-hidden",
        blockedCompanies.has(posting.companyKey)
      );
    }

    if (!dedupEnabled) {
      return;
    }

    const groups = new Map();
    for (const posting of postings) {
      if (blockedCompanies.has(posting.companyKey)) {
        continue;
      }
      const group = groups.get(posting.dedupKey) || [];
      group.push(posting);
      groups.set(posting.dedupKey, group);
    }

    for (const group of groups.values()) {
      if (group.length < 2) {
        continue;
      }
      const [primary, ...duplicates] = group;
      duplicates.forEach(({ card }) => card.classList.add("bl-search-hidden"));
      updateDuplicateSummary(primary, duplicates);
    }
  }

  function scheduleProcessing(force = false) {
    if (!isJobContentRoute()) {
      return;
    }
    if (scheduled && !force) {
      return;
    }
    if (processingTimerID !== null) {
      window.clearTimeout(processingTimerID);
    }
    scheduled = true;
    processingTimerID = window.setTimeout(() => {
      processCards(force).catch(handleProcessingError);
    }, 150);
  }

  async function initialize() {
    await BLSearchStorage.loadRecords();
    const stored = await chrome.storage.local.get({
      [STORAGE_KEY]: {},
      dedupEnabled: true
    });
    blockedCompanies = new Map(Object.entries(stored[STORAGE_KEY]));
    dedupEnabled = stored.dedupEnabled;

    // LinkedIn navigates between sections without loading a new document. The
    // observer stays active outside Jobs routes so it can catch the first DOM
    // update after an SPA transition into the jobs section or preload frame.
    observer = new MutationObserver((mutations) => {
      const hasPageMutation = mutations.some(({ target }) =>
        !target.parentElement?.closest(
          ".bl-search-controls, .bl-search-toast"
        )
      );
      if (hasPageMutation) {
        scheduleProcessing();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // A LinkedIn route change can happen after its final DOM mutation. Jobs
    // navigation can change only currentJobId in the query string, so monitor
    // the complete path and query rather than pathname alone.
    routeMonitorID = window.setInterval(() => {
      const route = currentRoute();
      if (route === lastRoute) {
        return;
      }
      lastRoute = route;
      scheduleProcessing(true);
    }, 250);

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }
      if (changes[STORAGE_KEY]) {
        blockedCompanies = new Map(
          Object.entries(changes[STORAGE_KEY].newValue || {})
        );
      }
      if (changes.dedupEnabled) {
        dedupEnabled = changes.dedupEnabled.newValue !== false;
      }
      scheduleProcessing(true);
    });

    scheduleProcessing(true);
  }

  initialize().catch(handleProcessingError);
})();
