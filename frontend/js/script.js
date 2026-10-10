/* =========================================================
   ETERNAL — DATABASE-BACKED DASHBOARD
   ========================================================= */

const statValues = document.querySelectorAll(
    ".stats-grid .stat-value"
);

const severityLabels = document.querySelectorAll(
    ".severity-legend .legend-item strong"
);

const eventsTableBody = document.getElementById(
    "events-table-body"
);

const eventRange = document.getElementById("event-range");

const severityOrder = ["critical", "high", "medium", "low"];

const severityColors = {
    critical: "#ef4444",
    high: "#f97316",
    medium: "#eab308",
    low: "#60a5fa"
};


/* =========================
   LIVE DATE AND CLOCK
   ========================= */

function updateDate() {
    const dateElement = document.getElementById("current-date");

    if (!dateElement) return;

    const now = new Date();

    const date = now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });

    const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    dateElement.textContent = `${date} · ${time}`;
}

updateDate();

// Keep the clock current on every page using this shared script.
setInterval(updateDate, 1000);


/* =========================
   GLOBAL SEARCH
   ========================= */

function initializeGlobalSearch() {
    const searchInput = document.getElementById("global-search");

    if (!searchInput) return;

    const searchContainer = searchInput.closest(".search");

    if (!searchContainer) return;

    // Create the dropdown automatically; no extra HTML is required.
    const resultsContainer = document.createElement("div");

    resultsContainer.className = "search-results";
    resultsContainer.id = "global-search-results";
    resultsContainer.hidden = true;
    resultsContainer.setAttribute("role", "listbox");
    resultsContainer.setAttribute("aria-label", "Search results");

    searchContainer.appendChild(resultsContainer);

    searchInput.setAttribute("autocomplete", "off");
    searchInput.setAttribute("aria-controls", resultsContainer.id);
    searchInput.setAttribute("aria-expanded", "false");

    let debounceTimer;
    let requestNumber = 0;
    let activeController = null;

    const categoryOrder = [
        "agents",
        "events",
        "alerts",
        "incidents"
    ];

    const categoryLabels = {
        agents: "Agents",
        events: "Events",
        alerts: "Alerts",
        incidents: "Incidents"
    };

    function showMessage(message) {
        resultsContainer.replaceChildren();

        const messageElement = document.createElement("div");
        messageElement.className = "search-empty";
        messageElement.textContent = message;

        resultsContainer.appendChild(messageElement);
        resultsContainer.hidden = false;
        searchInput.setAttribute("aria-expanded", "true");
    }

    function closeResults() {
        resultsContainer.hidden = true;
        searchInput.setAttribute("aria-expanded", "false");
    }

    function getCategory(result) {
        const type = String(
            result.type || result.category || ""
        ).toLowerCase();

        if (categoryOrder.includes(type)) return type;

        return "events";
    }

    function renderResults(results) {
        resultsContainer.replaceChildren();

        if (!Array.isArray(results) || results.length === 0) {
            showMessage("No matching results found.");
            return;
        }

        const groupedResults = {};

        categoryOrder.forEach(category => {
            groupedResults[category] = [];
        });

        results.forEach(result => {
            const category = getCategory(result);
            groupedResults[category].push(result);
        });

        let hasResults = false;

        categoryOrder.forEach(category => {
            const items = groupedResults[category];

            if (!items.length) return;

            hasResults = true;

            const heading = document.createElement("div");
            heading.className = "search-group-title";
            heading.textContent = categoryLabels[category];

            resultsContainer.appendChild(heading);

            items.forEach(result => {
                const item = document.createElement("button");

                item.type = "button";
                item.className = "search-result-item";
                item.setAttribute("role", "option");

                const content = document.createElement("div");
                content.className = "search-result-content";

                const title = document.createElement("div");
                title.className = "search-result-title";
                title.textContent =
                    result.title ||
                    result.name ||
                    result.description ||
                    "Untitled result";

                const subtitle = document.createElement("div");
                subtitle.className = "search-result-subtitle";
                subtitle.textContent =
                    result.subtitle ||
                    result.description ||
                    result.ip_address ||
                    result.source_ip ||
                    result.status ||
                    "";

                content.appendChild(title);

                if (subtitle.textContent) {
                    content.appendChild(subtitle);
                }

                const categoryBadge = document.createElement("span");
                categoryBadge.className = "search-result-category";
                categoryBadge.textContent = categoryLabels[category];

                item.appendChild(content);
                item.appendChild(categoryBadge);

                item.addEventListener("click", () => {
                    const url = result.url || result.href;

                    if (typeof url === "string" && url.trim()) {
                        window.location.href = url;
                    } else {
                        // Fallback destinations if the API omits a URL.
                        const destinations = {
                            agents: "/agents",
                            events: "/events",
                            alerts: "/alerts",
                            incidents: "/incidents"
                        };

                        window.location.href = destinations[category];
                    }
                });

                resultsContainer.appendChild(item);
            });
        });

        if (!hasResults) {
            showMessage("No matching results found.");
            return;
        }

        resultsContainer.hidden = false;
        searchInput.setAttribute("aria-expanded", "true");
    }

    async function performSearch(query) {
        const currentRequest = ++requestNumber;

        if (activeController) {
            activeController.abort();
            activeController = null;
        }

        if (query.length < 2) {
            closeResults();
            return;
        }

        activeController = new AbortController();

        showMessage("Searching ETERNAL...");

        try {
            const response = await fetch(
                `/api/search?q=${encodeURIComponent(query)}`,
                {
                    method: "GET",
                    headers: {
                        "Accept": "application/json"
                    },
                    signal: activeController.signal
                }
            );

            if (!response.ok) {
                throw new Error(`Search API returned ${response.status}`);
            }

            const data = await response.json();

            // Ignore responses belonging to older queries.
            if (currentRequest !== requestNumber) return;

            renderResults(data.results || []);

        } catch (error) {
            if (error.name === "AbortError") return;

            if (currentRequest === requestNumber) {
                console.error("ETERNAL search failed:", error);
                showMessage("Search is temporarily unavailable.");
            }
        }
    }

    searchInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);

        const query = searchInput.value.trim();

        if (query.length < 2) {
            requestNumber++;

            if (activeController) {
                activeController.abort();
                activeController = null;
            }

            closeResults();
            return;
        }

        debounceTimer = setTimeout(() => {
            performSearch(query);
        }, 250);
    });

    searchInput.addEventListener("focus", () => {
        if (searchInput.value.trim().length >= 2) {
            performSearch(searchInput.value.trim());
        }
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeResults();
            searchInput.blur();
        }

        if (
            event.key === "ArrowDown" &&
            !resultsContainer.hidden
        ) {
            const firstResult = resultsContainer.querySelector(
                ".search-result-item"
            );

            if (firstResult) {
                event.preventDefault();
                firstResult.focus();
            }
        }
    });

    // Close the dropdown when clicking outside the search box.
    document.addEventListener("click", event => {
        if (!searchContainer.contains(event.target)) {
            closeResults();
        }
    });
}

initializeGlobalSearch();




// Highlight the current sidebar navigation item
document.addEventListener("DOMContentLoaded", () => {
    const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

    document.querySelectorAll(".sidebar-nav .nav-item, .sidebar-bottom .nav-item")
        .forEach(link => {
            const linkPath = new URL(link.href).pathname.replace(/\/$/, "") || "/";

            link.classList.toggle("active", linkPath === currentPath);
        });
});


/* =========================
   EVENTS CHART
   ========================= */

const eventsCanvas = document.getElementById("events-chart");

let eventsChart = null;

if (eventsCanvas && typeof Chart !== "undefined") {
    eventsChart = new Chart(eventsCanvas, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Events",
                data: [],
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                borderWidth: 2,
                fill: true,
                tension: 0.35,
                pointRadius: 0,
                pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: "index",
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: "#8a94a6",
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: "#eef0f4" },
                    ticks: {
                        color: "#8a94a6",
                        precision: 0,
                        font: { size: 11 }
                    }
                }
            },
            interaction: {
                mode: "nearest",
                axis: "x",
                intersect: false
            }
        }
    });
}


/* =========================
   SEVERITY CHART
   ========================= */

const severityCanvas = document.getElementById("severity-chart");

let severityChart = null;

if (severityCanvas && typeof Chart !== "undefined") {
    severityChart = new Chart(severityCanvas, {
        type: "doughnut",
        data: {
            labels: ["Critical", "High", "Medium", "Low"],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: severityOrder.map(
                    severity => severityColors[severity]
                ),
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.label}: ${context.raw}`
                    }
                }
            }
        }
    });
}


/* =========================
   RECENT EVENTS TABLE
   ========================= */

function formatTime(timestamp) {
    if (!timestamp) return "—";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }

    return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value || "—";
    return cell;
}

function renderRecentEvents(events) {
    if (!eventsTableBody) return;

    eventsTableBody.replaceChildren();

    if (!events.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.textContent = "No security events recorded yet.";

        row.appendChild(cell);
        eventsTableBody.appendChild(row);
        return;
    }

    events.forEach(event => {
        const row = document.createElement("tr");

        row.appendChild(createCell(formatTime(event.timestamp)));
        row.appendChild(createCell(event.event_type));
        row.appendChild(createCell(event.source_ip));
        row.appendChild(createCell(event.username));

        const severityCell = document.createElement("td");
        const badge = document.createElement("span");

        const severity = (event.severity || "low").toLowerCase();

        badge.className = `severity-badge ${
            severityColors[severity] ? severity : "low"
        }`;

        badge.textContent =
            severity.charAt(0).toUpperCase() + severity.slice(1);

        severityCell.appendChild(badge);
        row.appendChild(severityCell);

        eventsTableBody.appendChild(row);
    });
}


/* =========================
   LOAD DASHBOARD DATA
   ========================= */

async function loadDashboard() {
    // Other pages use this shared script but have no dashboard widgets.
    if (!eventsChart || !severityChart) return;

    const range = eventRange ? eventRange.value : "24h";

    try {
        const response = await fetch(
            `/api/dashboard?range=${encodeURIComponent(range)}`
        );

        if (!response.ok) {
            throw new Error(`Dashboard API returned ${response.status}`);
        }

        const data = await response.json();

        // KPI cards, in the same order as index.html.
        const kpis = [
            data.total_events,
            data.open_alerts,
            data.active_agents,
            data.critical_threats
        ];

        statValues.forEach((element, index) => {
            if (kpis[index] !== undefined) {
                element.textContent =
                    Number(kpis[index]).toLocaleString();
            }
        });

        // Events over time.
        eventsChart.data.labels = data.events_chart.labels;
        eventsChart.data.datasets[0].data = data.events_chart.data;
        eventsChart.update();

        // Alert severity doughnut and legend.
        const severityCounts = severityOrder.map(
            severity => data.severity_counts[severity] || 0
        );

        severityChart.data.datasets[0].data = severityCounts;
        severityChart.update();

        severityLabels.forEach((element, index) => {
            element.textContent =
                severityCounts[index].toLocaleString();
        });

        // Latest five events.
        renderRecentEvents(data.recent_events || []);

    } catch (error) {
        console.error("Failed to load ETERNAL dashboard:", error);
    }
}


/* =========================
   RANGE SELECTOR & REFRESH
   ========================= */

if (eventRange) {
    eventRange.addEventListener("change", loadDashboard);
}

loadDashboard();

// Refresh database-backed dashboard values every 15 seconds.
setInterval(loadDashboard, 15000);