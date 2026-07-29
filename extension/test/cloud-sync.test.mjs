import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import vm from "node:vm";

const storageData = {
  blockedCompanies: { acme: "Acme" }
};
const storageListeners = [];
let messageListener;
let installedListener;
const injectedScripts = [];
const insertedStyles = [];
const remoteVaults = new Map();
let context;

const chrome = {
  runtime: {
    onInstalled: {
      addListener(listener) {
        installedListener = listener;
      }
    },
    openOptionsPage() {},
    onMessage: {
      addListener(listener) {
        messageListener = listener;
      }
    }
  },
  action: {
    onClicked: {
      addListener() {}
    }
  },
  tabs: {
    async query() {
      return [{ id: 42 }];
    }
  },
  scripting: {
    async executeScript(details) {
      injectedScripts.push(details);
    },
    async insertCSS(details) {
      insertedStyles.push(details);
    }
  },
  storage: {
    local: {
      async get(defaults) {
        return { ...defaults, ...structuredClone(storageData) };
      },
      async set(values) {
        const changes = {};
        for (const [key, value] of Object.entries(values)) {
          changes[key] = {
            oldValue: structuredClone(storageData[key]),
            newValue: structuredClone(value)
          };
          storageData[key] = structuredClone(value);
        }
        for (const listener of storageListeners) {
          listener(changes, "local");
        }
      },
      async remove(key) {
        delete storageData[key];
      }
    },
    onChanged: {
      addListener(listener) {
        storageListeners.push(listener);
      }
    }
  }
};

async function fakeFetch(rawURL, options) {
  const url = new URL(rawURL);
  const authorization = options.headers.authorization;
  const path = url.pathname;

  if (options.method === "POST" && path === "/v1/vaults") {
    const body = JSON.parse(options.body);
    remoteVaults.set(body.vaultId, {
      authorization,
      ciphertext: body.ciphertext,
      revision: 1
    });
    return Response.json(
      { ciphertext: body.ciphertext, revision: 1 },
      { status: 201 }
    );
  }

  const vaultID = path.split("/").at(-1);
  const remote = remoteVaults.get(vaultID);
  if (!remote || remote.authorization !== authorization) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
  if (options.method === "GET") {
    return Response.json({
      ciphertext: remote.ciphertext,
      revision: remote.revision
    });
  }
  if (options.method === "PUT") {
    if (Number(options.headers["if-match"]) !== remote.revision) {
      return Response.json(
        { error: "revision_conflict" },
        { status: 409 }
      );
    }
    const body = JSON.parse(options.body);
    remote.ciphertext = body.ciphertext;
    remote.revision++;
    return Response.json({
      ciphertext: remote.ciphertext,
      revision: remote.revision
    });
  }
  if (options.method === "DELETE") {
    remoteVaults.delete(vaultID);
    return new Response(null, { status: 204 });
  }
  return Response.json({ error: "not_found" }, { status: 404 });
}

context = vm.createContext({
  URL,
  Response,
  TextDecoder,
  TextEncoder,
  atob,
  btoa,
  chrome,
  clearTimeout,
  console,
  crypto: webcrypto,
  fetch: fakeFetch,
  setTimeout,
  structuredClone
});
context.globalThis = context;
context.importScripts = (...files) => {
  for (const file of files) {
    vm.runInContext(
      readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
      context,
      { filename: file }
    );
  }
};

vm.runInContext(
  readFileSync(new URL("../background.js", import.meta.url), "utf8"),
  context,
  { filename: "background.js" }
);

installedListener({ reason: "update" });
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(structuredClone(insertedStyles), [{
  target: { tabId: 42, allFrames: true },
  files: ["content.css"]
}]);
assert.deepEqual(structuredClone(injectedScripts), [{
  target: { tabId: 42, allFrames: true },
  files: ["config.js", "storage.js", "content.js"]
}]);

function sendMessage(message) {
  return new Promise((resolve) => {
    const keepAlive = messageListener(message, {}, resolve);
    assert.equal(keepAlive, true);
  });
}

const created = await sendMessage({
  action: "createVault"
});
assert.equal(created.ok, true);
assert.match(created.recoveryCode, /^bls1\.[^.]+\.[^.]+$/u);
assert.equal(remoteVaults.size, 1);
assert.equal(
  [...remoteVaults.values()][0].ciphertext.includes("Acme"),
  false,
  "plaintext company name must not be stored remotely"
);

await context.BLSearchStorage.removeCompany("acme");
const synchronized = await sendMessage({ action: "syncNow" });
assert.equal(synchronized.ok, true);
assert.deepEqual(storageData.blockedCompanies, {});

const disconnected = await sendMessage({ action: "disconnectVault" });
assert.equal(disconnected.ok, true);
assert.equal(storageData.cloudConfig, undefined);

await chrome.storage.local.set({
  blockedCompanies: {},
  companyRecords: {}
});
const connected = await sendMessage({
  action: "connectVault",
  recoveryCode: created.recoveryCode
});
assert.equal(connected.ok, true);
assert.deepEqual(storageData.blockedCompanies, {});

const deleted = await sendMessage({ action: "deleteVault" });
assert.equal(deleted.ok, true);
assert.equal(remoteVaults.size, 0);

console.log("cloud sync lifecycle: passed");
