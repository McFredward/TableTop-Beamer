export function bindPiOutput(dialog) {
  const find = document.getElementById("pi-output-find");
  const device = document.getElementById("pi-output-device");
  const addresses = document.getElementById("pi-output-addresses");
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
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }

  async function act(callback) {
    if (busy) return;
    busy = true;
    for (const button of [find, device.querySelector("button"), submit]) button.disabled = true;
    try { await callback(); }
    catch (error) {
      status.textContent = error.name === "TimeoutError" ? "The Pi took too long to respond. Try again." : error.message;
    } finally {
      busy = false;
      for (const button of [find, device.querySelector("button"), submit]) button.disabled = false;
    }
  }

  function clearIdentity() {
    login.hidden = true;
    password.value = "";
    selected = undefined;
  }

  async function identify(value) {
    clearIdentity();
    status.textContent = "Reading the Pi’s SSH identity…";
    const result = await request({ action: "identify", address: value });
    selected = { address: value, fingerprint: result.fingerprint };
    username.value = result.username ?? "";
    identity.textContent = result.username ? `Raspberry Pi at ${value}` : `First connection to ${value} · ${result.fingerprint}`;
    submit.textContent = result.username ? "Start Pi output" : "Trust device and start output";
    login.hidden = false;
    status.textContent = "";
    (result.username ? password : username).focus();
  }

  find.addEventListener("click", () => void act(async () => {
    clearIdentity();
    status.textContent = "Looking for Raspberry Pi on the local network…";
    const result = await request({ action: "find" });
    device.hidden = false;
    addresses.replaceChildren(...result.devices.map(value => new Option(value, value)));
    const suggested = result.preferred ?? (result.devices.length === 1 ? result.devices[0] : null);
    if (suggested) {
      address.value = suggested;
      await identify(suggested);
    } else {
      status.textContent = result.devices.length ? "Choose the Pi’s address from the SSH devices found."
        : "No Pi found. Check that SSH is enabled or enter its IPv4 address.";
      address.focus();
    }
  }));
  device.addEventListener("submit", event => {
    event.preventDefault();
    void act(() => identify(address.value.trim()));
  });
  address.addEventListener("input", clearIdentity);
  login.addEventListener("submit", event => {
    event.preventDefault();
    if (!selected) return;
    void act(async () => {
      const pending = request({ action: "start", ...selected, username: username.value.trim(), password: password.value }, 30000);
      password.value = "";
      status.textContent = "Starting fullscreen output on the Pi…";
      const result = await pending;
      login.hidden = true;
      status.textContent = result.display ? `Fullscreen output running on ${result.display} · ${result.address}`
        : "Fullscreen browser started. Turn on the projector and start the output again to enable HDMI.";
    });
  });
  dialog.addEventListener("close", () => { password.value = ""; });
}
