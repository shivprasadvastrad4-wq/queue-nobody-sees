const $ = id => document.getElementById(id);
let currentState = null;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function render(data) {
  currentState = data;
  $("waitingCount").textContent = data.waiting;
  $("servedCount").textContent = data.servedCount;
  $("averageWait").textContent = data.averageEstimatedWait;
  $("activeCounters").textContent = `${data.counters.filter(c => c.active).length}/${data.counters.length}`;

  const maxLoad = Math.max(1, ...data.counters.map(c => c.estimatedLoad));
  $("counterList").innerHTML = data.counters.map(counter => {
    const loadPercent = Math.round(counter.estimatedLoad / maxLoad * 100);
    const next = counter.queue[0];
    return `<article class="counter-card">
      <div class="counter-top">
        <div><div class="counter-name">${escapeHTML(counter.name)}</div>
        <div class="counter-meta">${counter.queue.length} waiting · ${counter.serviceMinutes} min average service</div></div>
        <div class="counter-actions">
          <span class="counter-status ${counter.active ? "" : "off"}">${counter.active ? "● ACTIVE" : "○ PAUSED"}</span>
          <button class="mini-button" onclick="toggleCounter(${counter.id},${!counter.active})">${counter.active ? "Pause" : "Activate"}</button>
          <button class="mini-button" onclick="serveNext(${counter.id})" ${counter.queue.length ? "" : "disabled"}>Serve next</button>
        </div>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${loadPercent}%"></div></div>
      <div class="counter-bottom"><span>${next ? `Next: #${next.token} · ${escapeHTML(next.name)}` : "No customers waiting"}</span><span>${counter.estimatedLoad} min workload</span></div>
    </article>`;
  }).join("");

  const busiest = [...data.counters].sort((a,b) => b.estimatedLoad - a.estimatedLoad)[0];
  const fastest = [...data.counters].filter(c => c.active).sort((a,b) => a.estimatedLoad - b.estimatedLoad)[0];
  if (!data.waiting) {
    $("insight").innerHTML = "All clear — there are no customers waiting. New visitors will be assigned to the active counter with the lowest estimated workload.";
  } else {
    $("insight").innerHTML = `<b>${escapeHTML(busiest.name)}</b> has the highest workload at <b>${busiest.estimatedLoad} minutes</b>. ${fastest ? `<b>${escapeHTML(fastest.name)}</b> currently has the lowest workload (${fastest.estimatedLoad} minutes).` : ""} New tokens are automatically assigned to the least-loaded active counter.`;
  }

  $("historyList").innerHTML = data.servedHistory.length ? data.servedHistory.map(item =>
    `<div class="history-item"><div><b>#${item.token} · ${escapeHTML(item.name)}</b><br><small>${escapeHTML(item.counter)}</small></div><small>${new Date(item.servedAt).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</small></div>`
  ).join("") : '<div class="empty-state">No customers served yet.</div>';
}

async function refresh() {
  try { render(await api("/api/state")); }
  catch (error) { showToast(error.message); }
}

async function serveNext(id) {
  try {
    const result = await api(`/api/counters/${id}/serve`, { method: "POST" });
    render(result.state);
    showToast(`Token #${result.served.token} served successfully.`);
  } catch (error) { showToast(error.message); }
}

async function toggleCounter(id, active) {
  try { render(await api(`/api/counters/${id}/active`, { method: "POST", body: JSON.stringify({active}) })); }
  catch (error) { showToast(error.message); }
}

$("tokenForm").addEventListener("submit", async event => {
  event.preventDefault();
  const name = $("customerName").value.trim();
  if (!name) return;
  try {
    const result = await api("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name, priority: $("priority").checked })
    });
    render(result.state);
    $("tokenResult").classList.remove("hidden");
    $("tokenResult").innerHTML = `Your token is <strong>#${result.customer.token}</strong>Assigned to ${escapeHTML(result.counter)} · Estimated wait: ${result.state.counters.flatMap(c => c.queue).find(c => c.token === result.customer.token).estimatedWait} min`;
    $("customerName").value = "";
    $("priority").checked = false;
    showToast("Your token has been generated.");
  } catch (error) { showToast(error.message); }
});

$("refreshBtn").addEventListener("click", refresh);
refresh();
setInterval(refresh, 7000);
