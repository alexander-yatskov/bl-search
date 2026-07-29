"use strict";

const elements = {
  addForm: document.querySelector("#add-company-form"),
  cloudConnected: document.querySelector("#cloud-connected"),
  cloudDisconnected: document.querySelector("#cloud-disconnected"),
  companyList: document.querySelector("#company-list"),
  companyName: document.querySelector("#company-name"),
  connectedEndpoint: document.querySelector("#connected-endpoint"),
  createVault: document.querySelector("#create-vault"),
  connectVault: document.querySelector("#connect-vault"),
  currentRecoveryCode: document.querySelector("#current-recovery-code"),
  dedupEnabled: document.querySelector("#dedup-enabled"),
  deleteVault: document.querySelector("#delete-vault"),
  disconnectVault: document.querySelector("#disconnect-vault"),
  emptyBlocklist: document.querySelector("#empty-blocklist"),
  lastSync: document.querySelector("#last-sync"),
  recoveryCode: document.querySelector("#recovery-code"),
  status: document.querySelector("#status"),
  syncNow: document.querySelector("#sync-now"),
  toggleRecoveryCode: document.querySelector("#toggle-recovery-code")
};

let statusTimer;

function showStatus(message, isError = false) {
  window.clearTimeout(statusTimer);
  elements.status.textContent = message;
  elements.status.classList.toggle("error", isError);
  elements.status.hidden = false;
  statusTimer = window.setTimeout(() => {
    elements.status.hidden = true;
  }, isError ? 6000 : 3000);
}

function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Cloud operation failed"));
        return;
      }
      resolve(response);
    });
  });
}

function endpointOriginPattern() {
  const url = new URL(BLSearchConfig.API_ENDPOINT);
  if (url.protocol !== "https:" &&
      !(url.protocol === "http:" &&
        (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) {
    throw new Error("Use HTTPS, or HTTP only for localhost");
  }
  return `${url.origin}/*`;
}

async function requestEndpointAccess() {
  const origins = [endpointOriginPattern()];
  const granted = await chrome.permissions.request({ origins });
  if (!granted) {
    throw new Error("Browser permission for the sync API was not granted");
  }
}

async function removeEndpointAccess(endpoint) {
  await chrome.permissions.remove({
    origins: [`${new URL(endpoint).origin}/*`]
  });
}

async function renderCompanies() {
  const records = await BLSearchStorage.loadRecords();
  const companies = Object.entries(BLSearchStorage.activeCompanies(records))
    .sort(([, left], [, right]) => left.localeCompare(right));

  elements.companyList.replaceChildren();
  elements.emptyBlocklist.hidden = companies.length > 0;

  for (const [key, name] of companies) {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = name;

    const remove = document.createElement("button");
    remove.className = "secondary small";
    remove.type = "button";
    remove.textContent = "Remove";
    remove.addEventListener("click", async () => {
      await BLSearchStorage.removeCompany(key);
      await renderCompanies();
      showStatus(`${name} removed from the blocklist`);
    });

    item.append(label, remove);
    elements.companyList.append(item);
  }
}

async function renderCloud() {
  const response = await sendMessage({ action: "cloudStatus" });
  const { config } = response;
  const connected = Boolean(config);

  elements.cloudConnected.hidden = !connected;
  elements.cloudDisconnected.hidden = connected;
  if (!connected) {
    return;
  }

  elements.connectedEndpoint.textContent = config.apiEndpoint;
  elements.lastSync.textContent = config.lastSyncAt
    ? new Date(config.lastSyncAt).toLocaleString()
    : "Never";
  elements.currentRecoveryCode.value = response.recoveryCode;
}

async function initialize() {
  const stored = await chrome.storage.local.get({ dedupEnabled: true });
  elements.dedupEnabled.checked = stored.dedupEnabled;
  await renderCompanies();
  await renderCloud();
}

elements.dedupEnabled.addEventListener("change", async () => {
  await chrome.storage.local.set({
    dedupEnabled: elements.dedupEnabled.checked
  });
  showStatus("Search settings saved");
});

elements.addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = elements.companyName.value.trim();
  if (!name) {
    return;
  }
  await BLSearchStorage.blockCompany(name);
  elements.companyName.value = "";
  await renderCompanies();
  showStatus(`${name} added to the blocklist`);
});

elements.createVault.addEventListener("click", async () => {
  try {
    await requestEndpointAccess();
    const response = await sendMessage({ action: "createVault" });
    await renderCloud();
    await navigator.clipboard.writeText(response.recoveryCode);
    showStatus("Cloud vault created; recovery code copied");
  } catch (error) {
    showStatus(error.message, true);
  }
});

elements.connectVault.addEventListener("click", async () => {
  try {
    await requestEndpointAccess();
    await sendMessage({
      action: "connectVault",
      recoveryCode: elements.recoveryCode.value.trim()
    });
    elements.recoveryCode.value = "";
    await Promise.all([renderCompanies(), renderCloud()]);
    showStatus("Cloud vault connected and merged");
  } catch (error) {
    showStatus(error.message, true);
  }
});

elements.syncNow.addEventListener("click", async () => {
  try {
    await sendMessage({ action: "syncNow" });
    await Promise.all([renderCompanies(), renderCloud()]);
    showStatus("Sync completed");
  } catch (error) {
    showStatus(error.message, true);
  }
});

elements.disconnectVault.addEventListener("click", async () => {
  try {
    const response = await sendMessage({ action: "disconnectVault" });
    await removeEndpointAccess(response.apiEndpoint);
    elements.currentRecoveryCode.type = "password";
    await renderCloud();
    showStatus("Cloud vault disconnected; local blocklist kept");
  } catch (error) {
    showStatus(error.message, true);
  }
});

elements.deleteVault.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Delete the encrypted cloud vault? Local blocked companies will be kept."
  );
  if (!confirmed) {
    return;
  }
  try {
    const response = await sendMessage({ action: "deleteVault" });
    await removeEndpointAccess(response.apiEndpoint);
    elements.currentRecoveryCode.type = "password";
    await renderCloud();
    showStatus("Cloud vault deleted; local blocklist kept");
  } catch (error) {
    showStatus(error.message, true);
  }
});

elements.toggleRecoveryCode.addEventListener("click", () => {
  const visible = elements.currentRecoveryCode.type === "text";
  elements.currentRecoveryCode.type = visible ? "password" : "text";
  elements.toggleRecoveryCode.textContent = visible ? "Show" : "Hide";
});

document.querySelector("#copy-recovery-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(elements.currentRecoveryCode.value);
  showStatus("Recovery code copied");
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[BLSearchStorage.RECORDS_KEY]) {
    renderCompanies().catch(console.error);
  }
});

initialize().catch((error) => showStatus(error.message, true));
