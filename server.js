const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data", "store.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const initialState = {
  nextToken: 101,
  servedCount: 0,
  counters: [
    { id: 1, name: "Counter 01", serviceMinutes: 4, active: true, queue: [] },
    { id: 2, name: "Counter 02", serviceMinutes: 3, active: true, queue: [] },
    { id: 3, name: "Counter 03", serviceMinutes: 5, active: true, queue: [] }
  ],
  servedHistory: []
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (error) {
    console.error("Could not read saved data. Starting fresh.", error.message);
  }
  return structuredClone(initialState);
}
let state = loadState();

function saveState() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2));
}

// DSA: Priority Queue behavior is implemented by keeping priority customers
// ahead of regular customers while preserving arrival order within each group.
function insertByPriority(queue, customer) {
  if (!customer.priority) {
    queue.push(customer);
    return;
  }
  const firstRegular = queue.findIndex(item => !item.priority);
  if (firstRegular === -1) queue.push(customer);
  else queue.splice(firstRegular, 0, customer);
}

// DSA: choose the active counter with the smallest estimated workload.
function findShortestCounter() {
  const active = state.counters.filter(counter => counter.active);
  if (!active.length) return null;
  return active.reduce((best, current) => {
    const bestLoad = best.queue.length * best.serviceMinutes;
    const currentLoad = current.queue.length * current.serviceMinutes;
    return currentLoad < bestLoad ? current : best;
  });
}

function estimateWait(counter, index) {
  return (index + 1) * counter.serviceMinutes;
}

function snapshot() {
  const counters = state.counters.map(counter => ({
    ...counter,
    queue: counter.queue.map((customer, index) => ({
      ...customer,
      position: index + 1,
      estimatedWait: estimateWait(counter, index)
    })),
    estimatedLoad: counter.queue.length * counter.serviceMinutes
  }));
  const waiting = counters.reduce((sum, counter) => sum + counter.queue.length, 0);
  const totalWait = counters.reduce((sum, counter) =>
    sum + counter.queue.reduce((n, _, index) => n + estimateWait(counter, index), 0), 0);
  return {
    nextToken: state.nextToken,
    servedCount: state.servedCount,
    waiting,
    counters,
    servedHistory: state.servedHistory.slice(-8).reverse(),
    averageEstimatedWait: waiting ? Math.round(totalWait / waiting) : 0
  };
}

app.get("/api/state", (req, res) => res.json(snapshot()));

app.post("/api/tokens", (req, res) => {
  const name = String(req.body.name || "Guest").trim().slice(0, 40) || "Guest";
  const priority = Boolean(req.body.priority);
  const counter = findShortestCounter();
  if (!counter) return res.status(400).json({ error: "No active counters are available." });

  const customer = {
    token: state.nextToken++,
    name,
    priority,
    createdAt: new Date().toISOString()
  };
  insertByPriority(counter.queue, customer);
  saveState();
  res.status(201).json({ customer, counter: counter.name, state: snapshot() });
});

app.post("/api/counters/:id/serve", (req, res) => {
  const counter = state.counters.find(item => item.id === Number(req.params.id));
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  if (!counter.queue.length) return res.status(400).json({ error: "This queue is empty." });

  const customer = counter.queue.shift();
  state.servedCount++;
  state.servedHistory.push({
    token: customer.token,
    name: customer.name,
    counter: counter.name,
    servedAt: new Date().toISOString()
  });
  saveState();
  res.json({ served: customer, state: snapshot() });
});

app.post("/api/counters/:id/active", (req, res) => {
  const counter = state.counters.find(item => item.id === Number(req.params.id));
  if (!counter) return res.status(404).json({ error: "Counter not found." });
  counter.active = Boolean(req.body.active);
  saveState();
  res.json(snapshot());
});

app.delete("/api/tokens/:token", (req, res) => {
  const token = Number(req.params.token);
  for (const counter of state.counters) {
    const index = counter.queue.findIndex(customer => customer.token === token);
    if (index !== -1) {
      counter.queue.splice(index, 1);
      saveState();
      return res.json(snapshot());
    }
  }
  res.status(404).json({ error: "Token not found in a waiting queue." });
});

app.post("/api/reset", (req, res) => {
  state = structuredClone(initialState);
  saveState();
  res.json(snapshot());
});

app.listen(PORT, () => {
  console.log(`Queue Nobody Sees is running at http://localhost:${PORT}`);
});