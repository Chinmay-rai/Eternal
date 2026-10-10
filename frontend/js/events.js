
/* =====================================================
   ETERNAL EVENTS — LIVE API DATA
===================================================== */

let events = [];
let filteredEvents = [];
let currentPage = 1;
const eventsPerPage = 6;
let selectedEvent = null;

/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody = document.getElementById("events-table-body");
const eventCount = document.getElementById("event-count");

const searchInput = document.getElementById("event-search");
const typeFilter = document.getElementById("event-type-filter");
const severityFilter = document.getElementById("severity-filter");
const agentFilter = document.getElementById("agent-filter");
const timeFilter = document.getElementById("time-filter");

const resetBtn = document.getElementById("reset-filters");
const refreshBtn = document.getElementById("refresh-events");

const drawer = document.getElementById("event-drawer");
const drawerClose = document.getElementById("drawer-close");
const drawerContent = document.querySelector(".drawer-content");

/* =====================================================
   HELPERS
===================================================== */

function escapeHTML(value) {
    return String(value ?? "—").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatSeverity(value) {
    const severity = String(value || "Low").toLowerCase();

    if (severity === "critical") return "Critical";
    if (severity === "high") return "High";
    if (severity === "medium") return "Medium";

    return "Low";
}

function formatTimestamp(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function formatTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleTimeString();
}

/* =====================================================
   LOAD EVENTS FROM FLASK
===================================================== */

async function loadEvents() {
    try {
        const response = await fetch("/api/events");

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid event data received");
        }

        events = data.map(event => ({
            id: `EVT-${String(event.id).padStart(5, "0")}`,
            databaseId: event.id,
            time: formatTime(event.timestamp),
            timestamp: event.timestamp || "—",
            type: String(event.event_type || "unknown")
                .toUpperCase()
                .replaceAll("_", " "),
            agent: event.agent || "Unknown",
            sourceIP: event.source_ip || "—",
            username: event.username || "Unknown",
            severity: formatSeverity(event.severity),
            description: event.description || "No description available",
            windowsEventId: event.windows_event_id ?? "—",
            windowsRecordId: event.windows_record_id ?? "—"
        }));

        updateFilterOptions();

        filteredEvents = [...events];
        currentPage = 1;
        selectedEvent = null;

        closeDrawer();
        filterEvents();

    } catch (error) {
        console.error("Failed to load events:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    Unable to load events. Check that Flask is running.
                </td>
            </tr>
        `;

        eventCount.textContent = "Unable to load events";
        updatePagination();
    }
}

/* =====================================================
   UPDATE FILTER OPTIONS FROM REAL DATA
===================================================== */

function updateFilterOptions() {
    const currentType = typeFilter.value;
    const currentAgent = agentFilter.value;

    const types = [...new Set(events.map(event => event.type))].sort();
    const agents = [...new Set(events.map(event => event.agent))].sort();

    typeFilter.innerHTML = '<option value="">All Event Types</option>';

    types.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeFilter.appendChild(option);
    });

    agentFilter.innerHTML = '<option value="">All Agents</option>';

    agents.forEach(agent => {
        const option = document.createElement("option");
        option.value = agent;
        option.textContent = agent;
        agentFilter.appendChild(option);
    });

    if (types.includes(currentType)) {
        typeFilter.value = currentType;
    }

    if (agents.includes(currentAgent)) {
        agentFilter.value = currentAgent;
    }
}

/* =====================================================
   RENDER EVENTS
===================================================== */

function renderEvents() {
    tableBody.innerHTML = "";

    const start = (currentPage - 1) * eventsPerPage;
    const pageEvents = filteredEvents.slice(start, start + eventsPerPage);

    if (pageEvents.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">No events found.</td>
            </tr>
        `;

        updateEventCount();
        updatePagination();
        return;
    }

    pageEvents.forEach(event => {
        const row = document.createElement("tr");
        row.classList.add("event-row");

        if (selectedEvent && selectedEvent.id === event.id) {
            row.classList.add("selected");
        }

        const severityClass = event.severity.toLowerCase();

        row.innerHTML = `
            <td>${escapeHTML(event.time)}</td>
            <td>
                <span class="event-type">${escapeHTML(event.type)}</span>
            </td>
            <td>${escapeHTML(event.agent)}</td>
            <td>${escapeHTML(event.sourceIP)}</td>
            <td>${escapeHTML(event.username)}</td>
            <td>
                <span class="severity ${severityClass}">
                    ${escapeHTML(event.severity)}
                </span>
            </td>
            <td class="row-arrow">›</td>
        `;

        row.addEventListener("click", () => {
            selectedEvent = event;
            renderEvents();
            openDrawer(event);
        });

        tableBody.appendChild(row);
    });

    updateEventCount();
    updatePagination();
}

/* =====================================================
   EVENT COUNT
===================================================== */

function updateEventCount() {
    eventCount.textContent = `${filteredEvents.length} events`;
}

/* =====================================================
   FILTERING
===================================================== */

function filterEvents() {
    const search = searchInput.value.toLowerCase().trim();
    const type = typeFilter.value;
    const severity = severityFilter.value;
    const agent = agentFilter.value;
    const timeRange = timeFilter.value;

    const now = Date.now();

    filteredEvents = events.filter(event => {
        const searchableText = [
            event.id,
            event.type,
            event.agent,
            event.sourceIP,
            event.username,
            event.description,
            event.timestamp
        ].join(" ").toLowerCase();

        const matchesSearch = !search || searchableText.includes(search);
        const matchesType = !type || event.type === type;
        const matchesSeverity = !severity || event.severity === severity;
        const matchesAgent = !agent || event.agent === agent;

        let matchesTime = true;

        if (timeRange) {
            const eventTime = new Date(event.timestamp).getTime();
            const age = now - eventTime;

            if (!Number.isNaN(eventTime)) {
                if (["1h", "1hour"].includes(timeRange)) {
                    matchesTime = age >= 0 && age <= 60 * 60 * 1000;
                } else if (["24h", "24hours"].includes(timeRange)) {
                    matchesTime = age >= 0 && age <= 24 * 60 * 60 * 1000;
                } else if (["7d", "7days"].includes(timeRange)) {
                    matchesTime = age >= 0 && age <= 7 * 24 * 60 * 60 * 1000;
                } else if (timeRange === "today") {
                    const date = new Date(eventTime);
                    const today = new Date();

                    matchesTime =
                        date.getFullYear() === today.getFullYear() &&
                        date.getMonth() === today.getMonth() &&
                        date.getDate() === today.getDate();
                }
            }
        }

        return (
            matchesSearch &&
            matchesType &&
            matchesSeverity &&
            matchesAgent &&
            matchesTime
        );
    });

    currentPage = 1;
    selectedEvent = null;

    closeDrawer();
    renderEvents();
}

/* =====================================================
   PAGINATION
===================================================== */

function updatePagination() {
    const totalPages = Math.max(
        1,
        Math.ceil(filteredEvents.length / eventsPerPage)
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const paginationInfo = document.querySelector(".pagination-info");
    const paginationButtons = document.querySelector(".pagination-buttons");

    if (!paginationInfo || !paginationButtons) return;

    const start = filteredEvents.length === 0
        ? 0
        : (currentPage - 1) * eventsPerPage + 1;

    const end = Math.min(
        currentPage * eventsPerPage,
        filteredEvents.length
    );

    paginationInfo.textContent =
        `Showing ${start}–${end} of ${filteredEvents.length} events`;

    paginationButtons.innerHTML = "";

    const previousButton = document.createElement("button");
    previousButton.textContent = "‹";
    previousButton.disabled = currentPage === 1;

    previousButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderEvents();
        }
    });

    paginationButtons.appendChild(previousButton);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;

        if (i === currentPage) {
            button.classList.add("current-page");
        }

        button.addEventListener("click", () => {
            currentPage = i;
            renderEvents();
        });

        paginationButtons.appendChild(button);
    }

    const nextButton = document.createElement("button");
    nextButton.textContent = "›";
    nextButton.disabled = currentPage === totalPages;

    nextButton.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderEvents();
        }
    });

    paginationButtons.appendChild(nextButton);
}

/* =====================================================
   EVENT DETAIL DRAWER
===================================================== */

function openDrawer(event) {
    drawerContent.innerHTML = `
        <div class="drawer-severity">
            <span class="severity ${event.severity.toLowerCase()}">
                ${escapeHTML(event.severity)}
            </span>
        </div>

        <div class="event-description">
            ${escapeHTML(event.description)}
        </div>

        <div class="detail-grid">
            <div class="detail-item">
                <span>Event ID</span>
                <strong>${escapeHTML(event.id)}</strong>
            </div>

            <div class="detail-item">
                <span>Timestamp</span>
                <strong>${escapeHTML(event.timestamp)}</strong>
            </div>

            <div class="detail-item">
                <span>Agent</span>
                <strong>${escapeHTML(event.agent)}</strong>
            </div>

            <div class="detail-item">
                <span>Source IP</span>
                <strong>${escapeHTML(event.sourceIP)}</strong>
            </div>

            <div class="detail-item">
                <span>Username</span>
                <strong>${escapeHTML(event.username)}</strong>
            </div>

            <div class="detail-item">
                <span>Event Type</span>
                <strong>${escapeHTML(event.type)}</strong>
            </div>

            <div class="detail-item">
                <span>Windows Event ID</span>
                <strong>${escapeHTML(event.windowsEventId)}</strong>
            </div>

            <div class="detail-item">
                <span>Windows Record ID</span>
                <strong>${escapeHTML(event.windowsRecordId)}</strong>
            </div>
        </div>

        <div class="raw-event">
            <div class="raw-event-header">Event Data</div>
            <pre>${escapeHTML(JSON.stringify(event, null, 2))}</pre>
        </div>
    `;

    drawer.classList.add("open");
}

function closeDrawer() {
    if (drawer) {
        drawer.classList.remove("open");
    }
}

/* =====================================================
   EVENT LISTENERS
===================================================== */

if (drawerClose) {
    drawerClose.addEventListener("click", closeDrawer);
}

searchInput.addEventListener("input", filterEvents);
typeFilter.addEventListener("change", filterEvents);
severityFilter.addEventListener("change", filterEvents);
agentFilter.addEventListener("change", filterEvents);
timeFilter.addEventListener("change", filterEvents);

resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    typeFilter.value = "";
    severityFilter.value = "";
    agentFilter.value = "";
    timeFilter.value = "";

    selectedEvent = null;
    currentPage = 1;

    closeDrawer();
    filterEvents();
});

refreshBtn.addEventListener("click", async () => {
    refreshBtn.disabled = true;

    const originalText = refreshBtn.textContent;
    refreshBtn.textContent = "↻ Refreshing...";

    try {
        await loadEvents();
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = originalText;
    }
});

/* =====================================================
   INITIAL LOAD
===================================================== */

loadEvents();
