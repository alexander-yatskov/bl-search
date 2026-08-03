(() => {
  "use strict";

  if (globalThis.__blSearchContentLoaded) {
    return;
  }
  globalThis.__blSearchContentLoaded = true;

  const STORAGE_KEY = BLSearchStorage.BLOCKED_KEY;
  const PROCESSED_ATTRIBUTE = "data-bl-search-processed";
  const JOB_LINK_SELECTOR = 'a[href*="/jobs/view/"]';
  const CARD_SELECTORS = [
    "li[data-occludable-job-id]",
    "li.jobs-search-results__list-item",
    ".job-card-container",
    ".jobs-search-results-list__list-item"
  ];

  let blockedCompanies = new Map();
  let observer = null;
  let processingTimerID = null;
  let routeMonitorID = null;
  let scheduled = false;
  let lastPathname = location.pathname;

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
    return link.closest("li") || link.parentElement;
  }

  function extractPosting(card) {
    const link = card.querySelector(JOB_LINK_SELECTOR);
    if (!link) {
      return null;
    }

    const url = new URL(link.href, location.origin);
    const idMatch = url.pathname.match(/\/jobs\/view\/(?:[^/]*-)?(\d+)/);
    const title =
      link.getAttribute("aria-label")?.trim() ||
      textFrom(card, [
        ".job-card-list__title--link",
        ".job-card-container__link",
        ".job-card-list__title",
        "a[href*='/jobs/view/'] strong",
        "a[href*='/jobs/view/']"
      ]);
    const company = textFrom(card, [
      ".artdeco-entity-lockup__subtitle",
      ".job-card-container__primary-description",
      ".job-card-container__company-name",
      ".job-card-list__company-name"
    ]);
    const locationName = textFrom(card, [
      ".artdeco-entity-lockup__caption",
      ".job-card-container__metadata-item",
      ".job-card-container__metadata-wrapper"
    ]);

    if (!title || !company) {
      return null;
    }

    return {
      card,
      company,
      companyKey: normalize(company),
      dedupKey: `${normalize(company)}::${normalizeTitle(title)}`,
      id: idMatch?.[1] || "",
      location: locationName,
      title,
      url: url.href
    };
  }

  function addControls(posting) {
    if (posting.card.querySelector(".bl-search-controls")) {
      return;
    }

    const controls = document.createElement("div");
    controls.className = "bl-search-controls";

    const hideButton = document.createElement("button");
    hideButton.className = "bl-search-button";
    hideButton.type = "button";
    hideButton.textContent = "Block company";
    hideButton.title = `Hide all loaded jobs from ${posting.company}`;
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

    const { dedupEnabled = true } = await chrome.storage.local.get({
      dedupEnabled: true
    });
    const cards = new Set();
    document.querySelectorAll(JOB_LINK_SELECTOR).forEach((link) => {
      const card = findCard(link);
      if (card) {
        cards.add(card);
      }
    });

    const postings = [];
    for (const card of cards) {
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

    // A LinkedIn route change can happen after its final DOM mutation. Polling
    // the lightweight pathname value makes route detection independent of the
    // page framework and does not touch page content outside Jobs routes.
    routeMonitorID = window.setInterval(() => {
      if (location.pathname === lastPathname) {
        return;
      }
      lastPathname = location.pathname;
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
      scheduleProcessing(true);
    });

    scheduleProcessing(true);
  }

  initialize().catch(handleProcessingError);
})();
