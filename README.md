# Queue Nobody Sees — Smart Queue Management System

A beginner-friendly full-stack DSA mini project for a 3rd-semester assignment.

## Features
- Generate customer tokens.
- Automatically assign each token to the active counter with the lowest estimated workload.
- Priority queue behavior: priority customers move ahead of regular customers.
- Serve the next customer at each counter.
- Pause and activate counters.
- Estimate waiting time and display bottleneck insights.
- Save queue state in `data/store.json`, so data survives server restarts.

## DSA concepts demonstrated
1. **Queue (FIFO):** each counter stores customers in arrival order; serving uses `shift()`.
2. **Priority Queue:** `insertByPriority()` inserts priority customers before regular customers while preserving order within each group.
3. **Searching:** token cancellation searches each counter queue for the matching token.
4. **Sorting:** dashboard insights sort counters by estimated workload.
5. **Arrays:** queues and counter collections are represented using JavaScript arrays.

> This is an educational simulation. Waiting-time estimates use a simple average service-time model, not live real-world measurements.

## Requirements
- Node.js (LTS)
- Visual Studio Code

## Run on macOS
1. Install Node.js LTS from https://nodejs.org/ if it is not already installed.
2. Unzip the project.
3. Open the `queue-nobody-sees` folder in VS Code.
4. In VS Code, choose **Terminal → New Terminal**.
5. Run:

   ```bash
   npm install
   npm start
   ```

6. Open http://localhost:3000 in your browser.

To stop the server, click the terminal and press `Control + C`.

## Test the project
1. Enter a name and click **Generate my token**.
2. Generate a few more tokens to see automatic counter assignment.
3. Tick **Priority request** and generate another token to see priority handling.
4. Click **Serve next** on a counter.
5. Pause a counter and generate another token to see it excluded from auto-assignment.
6. Refresh the page. Queue data remains saved.

## Project structure
```text
queue-nobody-sees/
├── server.js
├── package.json
├── README.md
├── data/
│   └── store.json
└── public/
    ├── index.html
    ├── style.css
    └── app.js
```

## API routes
- `GET /api/state` — current queue and counter information
- `POST /api/tokens` — generate a token (`{ "name": "Alex", "priority": false }`)
- `POST /api/counters/:id/serve` — serve the next customer
- `POST /api/counters/:id/active` — activate or pause a counter (`{ "active": true }`)
- `DELETE /api/tokens/:token` — remove a waiting token
- `POST /api/reset` — reset the simulation

## Viva explanation
**Why use a queue?** Customers normally wait in first-in-first-out order.

**Why use a priority queue?** Some customers, such as emergency cases, may need to be served before regular customers.

**How is the counter selected?** The system calculates each active counter's workload (`queue length × average service minutes`) and chooses the smallest.

**How is waiting time estimated?** For a customer at position `p`, estimated wait = `p × counter average service minutes`.

**Limitations / future scope:** Add real login, a database, real-time WebSockets, configurable service times and more accurate wait-time prediction.
