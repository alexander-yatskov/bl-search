(() => {
  "use strict";

  const BLOCKED_KEY = "blockedCompanies";
  const RECORDS_KEY = "companyRecords";

  function normalize(value) {
    return (value || "")
      .normalize("NFKC")
      .toLocaleLowerCase()
      .replace(/\b(incorporated|corporation|company|limited|inc|corp|ltd|llc)\b\.?/gu, " ")
      .replace(/[^\p{L}\p{N}+#]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function eventTime(record) {
    return Math.max(record?.blockedAt || 0, record?.removedAt || 0);
  }

  function activeCompanies(records) {
    return Object.fromEntries(
      Object.entries(records)
        .filter(([, record]) =>
          (record.blockedAt || 0) > (record.removedAt || 0)
        )
        .map(([key, record]) => [key, record.name])
    );
  }

  async function saveRecords(records) {
    await chrome.storage.local.set({
      [RECORDS_KEY]: records,
      [BLOCKED_KEY]: activeCompanies(records)
    });
  }

  async function loadRecords() {
    const stored = await chrome.storage.local.get({
      [BLOCKED_KEY]: {},
      [RECORDS_KEY]: null
    });
    if (stored[RECORDS_KEY]) {
      return stored[RECORDS_KEY];
    }

    const now = Date.now();
    const migrated = Object.fromEntries(
      Object.entries(stored[BLOCKED_KEY]).map(([key, name]) => [
        key,
        { name, blockedAt: now, removedAt: 0 }
      ])
    );
    await saveRecords(migrated);
    return migrated;
  }

  async function blockCompany(name) {
    const key = normalize(name);
    if (!key) {
      throw new Error("Company name is empty");
    }
    const records = await loadRecords();
    records[key] = {
      name: name.trim(),
      blockedAt: Date.now(),
      removedAt: records[key]?.removedAt || 0
    };
    await saveRecords(records);
  }

  async function removeCompany(key) {
    const records = await loadRecords();
    const existing = records[key];
    if (!existing) {
      return;
    }
    records[key] = {
      ...existing,
      removedAt: Date.now()
    };
    await saveRecords(records);
  }

  function mergeRecords(local, remote) {
    const merged = structuredClone(local);
    for (const [key, remoteRecord] of Object.entries(remote)) {
      if (!merged[key] || eventTime(remoteRecord) > eventTime(merged[key])) {
        merged[key] = remoteRecord;
      }
    }
    return merged;
  }

  globalThis.BLSearchStorage = {
    BLOCKED_KEY,
    RECORDS_KEY,
    activeCompanies,
    blockCompany,
    loadRecords,
    mergeRecords,
    normalize,
    removeCompany,
    saveRecords
  };
})();
