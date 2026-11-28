function bindCameraSetup() {
  const details = document.getElementById("camera-setup-manual");
  const row = document.getElementById("camera-setup-command-row");
  const command = document.getElementById("camera-setup-command");
  const status = document.getElementById("camera-setup-status");
  const copy = document.getElementById("camera-setup-copy");
  const renew = document.getElementById("camera-setup-renew");
  let expiresAt = 0;
  let loading = false;

  async function loadCommand() {
    if (loading) return;
    loading = true;
    row.hidden = true;
    status.textContent = "Preparing a setup command…";
    try {
      const response = await fetch("/api/camera/setup", { method: "POST", signal: AbortSignal.timeout(4000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      const { origin, token } = data;
      const installer = '"$HOME/tt-beamer-pi-setup.sh"';
      command.value = `curl -fsS '${origin}/scripts/setup-pi-output.sh' -o ${installer} && bash ${installer} '${origin}' '${token}'`;
      expiresAt = data.expiresAt;
      row.hidden = false;
      status.textContent = "Run the command within five minutes. In Chromium, choose Allow while visiting the site. Output opens in fullscreen when the first image arrives.";
    } catch (error) {
      expiresAt = 0;
      status.textContent = error.message || "Camera setup is unavailable. Close and reopen the setup to try again.";
    } finally {
      loading = false;
    }
  }

  details.addEventListener("toggle", () => {
    if (details.open && Date.now() >= expiresAt) void loadCommand();
  });
  renew.addEventListener("click", loadCommand);
  copy.addEventListener("click", async () => {
    if (Date.now() >= expiresAt) await loadCommand();
    if (row.hidden) return;
    try {
      await navigator.clipboard.writeText(command.value);
      status.textContent = "Copied. Paste the command into the Pi terminal and allow camera access in Chromium.";
    } catch {
      command.focus();
      command.select();
      status.textContent = "The command is selected. Copy it and paste it into the Pi terminal.";
    }
  });
}

function bindPiOutput(dialog, trigger) {
  const find = document.getElementById("pi-output-find");
  const options = document.getElementById("pi-output-device-options");
  const device = document.getElementById("pi-output-device");
  const discovered = document.getElementById("pi-output-discovered");
  const list = document.getElementById("pi-output-list");
  const address = document.getElementById("pi-output-address");
  const login = document.getElementById("pi-output-login");
  const identity = document.getElementById("pi-output-identity");
  const username = document.getElementById("pi-output-user");
  const password = document.getElementById("pi-output-password");
  const submit = document.getElementById("pi-output-submit");
  const status = document.getElementById("pi-output-status");
  let selected;
  let busy = false;

  async function request(data, timeout = 6500) {
    const response = await fetch("/api/camera/pi-output", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data), signal: AbortSignal.timeout(timeout),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result) throw new Error(result?.error || `Pi output request failed (${response.status}).`);
    return result;
  }

  async function act(callback) {
    if (busy) return;
    busy = true;
    const controls = [find, device.querySelector("button"), discovered.querySelector("button"), list, submit];
    for (const control of controls) control.disabled = true;
    try { await callback(); }
    catch (error) {
      status.textContent = error.name === "TimeoutError" ? "The Pi took too long to respond. Try again." : error.message;
    } finally {
      busy = false;
      for (const control of controls) control.disabled = false;
    }
  }

  function clearIdentity() {
    login.hidden = true;
    password.value = "";
    selected = undefined;
  }

  function showLogin(value, result) {
    clearIdentity();
    selected = { address: value, fingerprint: result.fingerprint };
    username.value = result.username ?? "";
    identity.textContent = result.trusted ? `Raspberry Pi at ${value}` : `First connection to ${value} · ${result.fingerprint}`;
    submit.textContent = result.trusted ? "Start fullscreen" : "Trust device and start fullscreen";
    options.open = false;
    login.hidden = false;
    status.textContent = "";
    (result.username ? password : username).focus();
  }

  async function launch(fields) {
    status.textContent = "Starting fullscreen output on the Pi…";
    const response = await request({ action: "start", ...fields }, 30000);
    login.hidden = true;
    const name = response.hostname ? `${response.hostname} · ` : "";
    status.textContent = response.display ? `${name}Fullscreen output running on ${response.display} · ${response.address}`
      : "Fullscreen browser started. Turn on the projector and start the output again to enable HDMI.";
  }

  async function identify(value, known) {
    clearIdentity();
    status.textContent = "Reading the Pi’s SSH identity…";
    const result = known?.trusted ? known : await request({ action: "identify", address: value });
    if (result.autoStart) {
      try {
        await launch({ address: value, fingerprint: result.fingerprint });
        return;
      } catch (error) {
        showLogin(value, result);
        status.textContent = `${error.message} Sign in to set up automatic launch again.`;
        return;
      }
    }
    showLogin(value, result);
  }

  let choices = [];
  async function search(reopen = false) {
    clearIdentity();
    discovered.hidden = true;
    status.textContent = "Looking for Raspberry Pi on the local network…";
    const result = await request({ action: "find" }, 23000).catch(error => {
      options.open = true;
      throw error;
    });
    const pis = result.devices.filter(item => item.raspberry);
    choices = result.devices;
    function optionGroup(label, devices) {
      const group = document.createElement("optgroup");
      group.label = label;
      group.append(...devices.map(({ address, hostname, trusted }) => new Option(
        `${hostname ? hostname + " · " : ""}${address}${trusted ? " · Paired" : ""}`, address,
      )));
      return group;
    }
    const groups = [];
    if (pis.length) groups.push(optionGroup("Raspberry Pi", pis));
    const otherDevices = choices.filter(item => !item.raspberry);
    if (otherDevices.length) groups.push(optionGroup("Other SSH devices", otherDevices));
    list.replaceChildren(...groups);
    discovered.hidden = !choices.length;
    if (reopen && pis.length === 1 && pis[0].autoStart) {
      await identify(pis[0].address, pis[0]);
    } else if (!choices.length) {
      options.open = true;
      status.textContent = "No Pi found. Check that SSH is enabled or enter its IPv4 address.";
      address.focus();
    } else {
      status.textContent = pis.length ? "Select the Raspberry Pi that is connected to the projector."
        : "Select the Raspberry Pi from the SSH devices found.";
      list.focus();
    }
  }

  trigger.addEventListener("click", () => {
    dialog.showModal();
    void act(() => search(true));
  });
  find.addEventListener("click", () => void act(() => search()));
  discovered.addEventListener("submit", event => {
    event.preventDefault();
    const choice = choices.find(item => item.address === list.value);
    if (choice) void act(() => identify(choice.address, choice));
  });
  device.addEventListener("submit", event => {
    event.preventDefault();
    const value = address.value.trim();
    if (!value) {
      status.textContent = "Enter the Raspberry Pi’s IPv4 address.";
      address.focus();
      return;
    }
    void act(() => identify(value));
  });
  address.addEventListener("input", clearIdentity);
  login.addEventListener("submit", event => {
    event.preventDefault();
    if (busy) return;
    if (!selected) {
      status.textContent = "Find the Raspberry Pi before signing in.";
      options.open = true;
      return;
    }
    const user = username.value.trim();
    if (!/^[a-z0-9_][a-z0-9_.-]{0,31}$/i.test(user)) {
      status.textContent = "Enter the SSH user name for the Raspberry Pi.";
      username.focus();
      return;
    }
    if (!password.value) {
      status.textContent = "Enter the SSH password for the Raspberry Pi.";
      password.focus();
      return;
    }
    void act(async () => {
      const pending = launch({ ...selected, username: user, password: password.value });
      password.value = "";
      await pending;
    });
  });
  dialog.addEventListener("close", () => { password.value = ""; });
  trigger.hidden = false;
}

if (location.pathname.replace(/\/$/, "") !== "/ssr" && document.body.dataset.outputRole !== "final-output") {
  const dialog = document.getElementById("pi-output-dialog");
  const trigger = document.getElementById("pi-output-open");
  if (dialog && trigger) {
    bindPiOutput(dialog, trigger);
    bindCameraSetup();
  }
}
