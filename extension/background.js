"use strict";

importScripts("config.js", "storage.js");

const CLOUD_CONFIG_KEY = "cloudConfig";
const API_ENDPOINT = normalizeEndpoint(BLSearchConfig.API_ENDPOINT);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
let syncInProgress = null;

function encodeBase64URL(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64URL(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length));
}

function normalizeEndpoint(value) {
  const url = new URL(value);
  const localHTTP = url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localHTTP) {
    throw new Error("The cloud endpoint must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("The cloud endpoint must not contain credentials or parameters");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/u, "")}`;
}

async function deriveKeys(secret) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    secret,
    "HKDF",
    false,
    ["deriveBits", "deriveKey"]
  );
  const salt = encoder.encode("bl-search-v1");
  const encryptionKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: encoder.encode("encryption")
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const authenticationBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: encoder.encode("authentication")
    },
    keyMaterial,
    256
  );
  return {
    authenticationToken: encodeBase64URL(new Uint8Array(authenticationBits)),
    encryptionKey
  };
}

async function encryptRecords(records, secret) {
  const { encryptionKey } = await deriveKeys(secret);
  const initializationVector = randomBytes(12);
  const plaintext = encoder.encode(JSON.stringify({
    schemaVersion: 1,
    records
  }));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    encryptionKey,
    plaintext
  );
  const envelope = new Uint8Array(
    initializationVector.length + encrypted.byteLength
  );
  envelope.set(initializationVector);
  envelope.set(new Uint8Array(encrypted), initializationVector.length);
  return encodeBase64URL(envelope);
}

async function decryptRecords(ciphertext, secret) {
  const envelope = decodeBase64URL(ciphertext);
  if (envelope.length <= 28) {
    throw new Error("The cloud vault is corrupted");
  }
  const { encryptionKey } = await deriveKeys(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: envelope.slice(0, 12) },
    encryptionKey,
    envelope.slice(12)
  );
  const payload = JSON.parse(decoder.decode(plaintext));
  if (payload.schemaVersion !== 1) {
    throw new Error("Unsupported cloud vault format");
  }
  return validateRecords(payload.records);
}

function recoveryCode(config) {
  return `bls1.${config.vaultId}.${config.masterSecret}`;
}

function parseRecoveryCode(value) {
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "bls1") {
    throw new Error("Invalid recovery code");
  }
  const secret = decodeBase64URL(parts[2]);
  if (!/^[A-Za-z0-9_-]{20,128}$/u.test(parts[1]) || secret.length !== 32) {
    throw new Error("Invalid recovery code");
  }
  return { vaultId: parts[1], masterSecret: parts[2] };
}

function validateRecords(records) {
  if (!records || Array.isArray(records) || typeof records !== "object") {
    throw new Error("The cloud vault is corrupted");
  }
  const validated = {};
  for (const [key, record] of Object.entries(records)) {
    if (!/^[\p{L}\p{N}+#](?:[\p{L}\p{N}+# ]{0,254})$/u.test(key) ||
        !record || Array.isArray(record) || typeof record !== "object" ||
        typeof record.name !== "string" || !record.name.trim() ||
        record.name.length > 255 ||
        !Number.isSafeInteger(record.blockedAt) || record.blockedAt < 0 ||
        !Number.isSafeInteger(record.removedAt) || record.removedAt < 0) {
      throw new Error("The cloud vault is corrupted");
    }
    validated[key] = {
      name: record.name.trim(),
      blockedAt: record.blockedAt,
      removedAt: record.removedAt
    };
  }
  return validated;
}

async function apiRequest(config, method, path, body, revision) {
  const secret = decodeBase64URL(config.masterSecret);
  const { authenticationToken } = await deriveKeys(secret);
  const headers = {
    authorization: `Bearer ${authenticationToken}`
  };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }
  if (revision !== undefined) {
    headers["if-match"] = String(revision);
  }

  const response = await fetch(`${config.apiEndpoint}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = response.status === 204
    ? null
    : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(
      payload?.error || `Cloud API returned ${response.status}`
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function getConfig() {
  const stored = await chrome.storage.local.get({ [CLOUD_CONFIG_KEY]: null });
  return stored[CLOUD_CONFIG_KEY];
}

async function createVault() {
  const config = {
    apiEndpoint: API_ENDPOINT,
    vaultId: encodeBase64URL(randomBytes(18)),
    masterSecret: encodeBase64URL(randomBytes(32)),
    revision: 0,
    lastSyncAt: null
  };
  const records = await BLSearchStorage.loadRecords();
  const ciphertext = await encryptRecords(
    records,
    decodeBase64URL(config.masterSecret)
  );
  const result = await apiRequest(config, "POST", "/v1/vaults", {
    vaultId: config.vaultId,
    ciphertext
  });
  config.revision = result.revision;
  config.lastSyncAt = Date.now();
  await chrome.storage.local.set({ [CLOUD_CONFIG_KEY]: config });
  return { config, recoveryCode: recoveryCode(config) };
}

async function connectVault(code) {
  const parsed = parseRecoveryCode(code);
  const config = {
    apiEndpoint: API_ENDPOINT,
    ...parsed,
    revision: 0,
    lastSyncAt: null
  };
  const remote = await apiRequest(
    config,
    "GET",
    `/v1/vaults/${config.vaultId}`
  );
  const secret = decodeBase64URL(config.masterSecret);
  const remoteRecords = await decryptRecords(remote.ciphertext, secret);
  const localRecords = await BLSearchStorage.loadRecords();
  const merged = BLSearchStorage.mergeRecords(localRecords, remoteRecords);

  config.revision = remote.revision;
  if (JSON.stringify(merged) !== JSON.stringify(remoteRecords)) {
    const ciphertext = await encryptRecords(merged, secret);
    const updated = await apiRequest(
      config,
      "PUT",
      `/v1/vaults/${config.vaultId}`,
      { ciphertext },
      config.revision
    );
    config.revision = updated.revision;
  }
  config.lastSyncAt = Date.now();
  await BLSearchStorage.saveRecords(merged);
  await chrome.storage.local.set({ [CLOUD_CONFIG_KEY]: config });
  return config;
}

async function synchronize() {
  if (syncInProgress) {
    return syncInProgress;
  }
  syncInProgress = performSync().finally(() => {
    syncInProgress = null;
  });
  return syncInProgress;
}

async function performSync() {
  const config = await getConfig();
  if (!config) {
    return null;
  }
  const remote = await apiRequest(
    config,
    "GET",
    `/v1/vaults/${config.vaultId}`
  );
  const secret = decodeBase64URL(config.masterSecret);
  const remoteRecords = await decryptRecords(remote.ciphertext, secret);
  const localRecords = await BLSearchStorage.loadRecords();
  const merged = BLSearchStorage.mergeRecords(localRecords, remoteRecords);

  let revision = remote.revision;
  if (JSON.stringify(merged) !== JSON.stringify(remoteRecords)) {
    const ciphertext = await encryptRecords(merged, secret);
    const updated = await apiRequest(
      config,
      "PUT",
      `/v1/vaults/${config.vaultId}`,
      { ciphertext },
      remote.revision
    );
    revision = updated.revision;
  }
  if (JSON.stringify(merged) !== JSON.stringify(localRecords)) {
    await BLSearchStorage.saveRecords(merged);
  }
  const updatedConfig = {
    ...config,
    revision,
    lastSyncAt: Date.now()
  };
  await chrome.storage.local.set({ [CLOUD_CONFIG_KEY]: updatedConfig });
  return updatedConfig;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[BLSearchStorage.RECORDS_KEY]) {
    synchronize().catch((error) => {
      console.error("BL Search automatic sync failed", error);
    });
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handle = async () => {
    switch (message.action) {
    case "cloudStatus": {
      const config = await getConfig();
      return {
        config,
        recoveryCode: config ? recoveryCode(config) : null
      };
    }
    case "createVault":
      return createVault();
    case "connectVault":
      return {
        config: await connectVault(
          message.recoveryCode
        )
      };
    case "syncNow":
      return { config: await synchronize() };
    case "disconnectVault":
    {
      const config = await getConfig();
      await chrome.storage.local.remove(CLOUD_CONFIG_KEY);
      return { apiEndpoint: config?.apiEndpoint };
    }
    case "deleteVault":
    {
      const config = await getConfig();
      if (!config) {
        throw new Error("No cloud vault is connected");
      }
      await apiRequest(
        config,
        "DELETE",
        `/v1/vaults/${config.vaultId}`
      );
      await chrome.storage.local.remove(CLOUD_CONFIG_KEY);
      return { apiEndpoint: config.apiEndpoint };
    }
    default:
      throw new Error("Unknown extension action");
    }
  };

  handle()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
