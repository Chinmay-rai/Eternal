
/* =====================================================
   ETERNAL ALERTS — LIVE API DATA
===================================================== */

let alerts = [];
let filteredAlerts = [];
let currentPage = 1;
const alertsPerPage = 8;
let selectedAlert = null;

/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody = document.getElementById("alerts-table-body");
const alertCount = document.getElementById("alert-count");

const searchInput = document.getElementById("alert-search");
const severityFilter = document.getElementById("severity-filter");
const alertTypeFilter = document.getElementById("alert-type-filter");
const agentFilter = document.getElementById("agent-filter");
const statusFilter = document.getElementById("status-filter");

const resetButton = document.getElementById("reset-filters");
const refreshButton = document.getElementById("refresh-alerts");

const drawer = document.getElementById("alert-drawer");
const drawerClose = document.getElementById("drawer-close");
const drawerTitle = document.getElementById("drawer-title");
const drawerSeverity = document.getElementById("drawer-severity");
const drawerStatus = document.getElementById("drawer-status");
const drawerDescription = document.getElementById("drawer-description");

const detailId = document.getElementById("detail-id");
const detailRule = document.getElementById("detail-rule");
const detailAgent = document.getElementById("detail-agent");
const detailIP = document.getElementById("detail-ip");
const detailFirstSeen = document.getElementById("detail-first-seen");
const detailLastSeen = document.getElementById("detail-last-seen");
const detailEvents = document.getElementById("detail-events");
const detectionLogic = document.getElementById("detection-logic");

const investigateButton = document.getElementById("investigate-btn");
const resolveButton = document.getElementById("resolve-btn");

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

function formatStatus(value) {
    const status = String(value || "New").toLowerCase();

    if (status === "investigating") return "Investigating";
    if (status === "resolved") return "Resolved";

    return "New";
}

function formatTimestamp(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString();
}

function formatTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleTimeString();
}

/* =====================================================
   LOAD ALERTS FROM FLASK
===================================================== */

async function loadAlerts() {
    try {
        const response = await fetch("/api/alerts");

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Invalid alert data received");
        }

        alerts = data.map(alert => {
            const timestamp = alert.timestamp || "";

            return {
                id: `ALT-${String(alert.id).padStart(6, "0")}`,
                databaseId: alert.id,
                time: formatTime(timestamp),
                timestamp: formatTimestamp(timestamp),
                title: alert.alert_type || alert.rule_name || "Security Alert",
                rule: alert.rule_name || "Unknown Rule",
                agent: alert.agent || "Unknown",
                sourceIP: "—",
                severity: formatSeverity(alert.severity),
                status: formatStatus(alert.status),
                firstSeen: formatTimestamp(timestamp),
                lastSeen: formatTimestamp(timestamp),
                relatedEvents: "—",
                description: alert.description || "No description available.",
                detectionLogic: alert.description || "No detection details available."
            };
        });

        updateFilterOptions();

        filteredAlerts = [...alerts];
        currentPage = 1;
        selectedAlert = null;

        closeAlertDrawer();
        renderAlerts();

    } catch (error) {
        console.error("Failed to load alerts:", error);

        tableBody.innerHTML = `
            <tr>
                <td colspan="8">
                    Unable to load alerts. Check that Flask is running.
                </td>
            </tr>
        `;

        alertCount.textContent = "Unable to load alerts";
        updatePagination();
    }
}

/* =====================================================
   DYNAMIC FILTER OPTIONS
===================================================== */

function updateFilterOptions() {
    const previousType = alertTypeFilter.value;
    const previousAgent = agentFilter.value;

    const types = [...new Set(alerts.map(alert => alert.title))].sort();
    const agents = [...new Set(alerts.map(alert => alert.agent))].sort();

    alertTypeFilter.innerHTML =
        '<option value="">All Alert Types</option>';

    types.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        alertTypeFilter.appendChild(option);
    });

    agentFilter.innerHTML =
        '<option value="">All Agents</option>';

    agents.forEach(agent => {
        const option = document.createElement("option");
        option.value = agent;
        option.textContent = agent;
        agentFilter.appendChild(option);
    });

    if (types.includes(previousType)) {
        alertTypeFilter.value = previousType;
    }

    if (agents.includes(previousAgent)) {
        agentFilter.value = previousAgent;
    }
}

/* =====================================================
   RENDER ALERTS
===================================================== */

function renderAlerts() {
    tableBody.innerHTML = "";

    const start = (currentPage - 1) * alertsPerPage;
    const pageAlerts = filteredAlerts.slice(
        start,
        start + alertsPerPage
    );

    if (pageAlerts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8">No alerts found.</td>
            </tr>
        `;

        updateAlertCount();
        updatePagination();
        return;
    }

    pageAlerts.forEach(alert => {
        const row = document.createElement("tr");
        row.classList.add("alert-row");

        if (selectedAlert && selectedAlert.id === alert.id) {
            row.classList.add("selected");
        }

        row.innerHTML = `
            <td>${escapeHTML(alert.time)}</td>

            <td>
                <span class="alert-name">
                    ${escapeHTML(alert.title)}
                </span>
            </td>

            <td>
                <span class="rule-code">
                    ${escapeHTML(alert.rule)}
                </span>
            </td>

            <td>${escapeHTML(alert.agent)}</td>

            <td>${escapeHTML(alert.sourceIP)}</td>

            <td>
                <span class="severity ${alert.severity.toLowerCase()}">
                    ${escapeHTML(alert.severity)}
                </span>
            </td>

            <td>
                <span class="status-badge ${alert.status.toLowerCase()}">
                    ${escapeHTML(alert.status)}
                </span>
            </td>

            <td class="alert-arrow">›</td>
        `;

        row.addEventListener("click", () => {
            selectedAlert = alert;
            renderAlerts();
            openAlertDrawer(alert);
        });

        tableBody.appendChild(row);
    });

    updateAlertCount();
    updatePagination();
}

/* =====================================================
   ALERT COUNT
===================================================== */

function updateAlertCount() {
    alertCount.textContent = `${filteredAlerts.length} alerts`;
}

/* =====================================================
   FILTERING
===================================================== */

function filterAlerts() {
    const search = searchInput.value.toLowerCase().trim();
    const severity = severityFilter.value;
    const type = alertTypeFilter.value;
    const agent = agentFilter.value;
    const status = statusFilter.value;

    filteredAlerts = alerts.filter(alert => {
        const searchableText = [
            alert.id,
            alert.title,
            alert.rule,
            alert.agent,
            alert.sourceIP,
            alert.description
        ].join(" ").toLowerCase();

        return (
            (!search || searchableText.includes(search)) &&
            (!severity || alert.severity === severity) &&
            (!type || alert.title === type) &&
            (!agent || alert.agent === agent) &&
            (!status || alert.status === status)
        );
    });

    currentPage = 1;
    selectedAlert = null;

    closeAlertDrawer();
    renderAlerts();
}

/* =====================================================
   PAGINATION
===================================================== */

function updatePagination() {
    const totalPages = Math.max(
        1,
        Math.ceil(filteredAlerts.length / alertsPerPage)
    );

    if (currentPage > totalPages) {
        currentPage = totalPages;
    }

    const start = filteredAlerts.length === 0
        ? 0
        : (currentPage - 1) * alertsPerPage + 1;

    const end = Math.min(
        currentPage * alertsPerPage,
        filteredAlerts.length
    );

    const paginationInfo = document.getElementById("pagination-info");
    const paginationButtons = document.getElementById("pagination-buttons");

    if (!paginationInfo || !paginationButtons) return;

    paginationInfo.textContent =
        `Showing ${start}–${end} of ${filteredAlerts.length} alerts`;

    paginationButtons.innerHTML = "";

    const previousButton = document.createElement("button");
    previousButton.textContent = "‹";
    previousButton.disabled = currentPage === 1;

    previousButton.addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            renderAlerts();
        }
    });

    paginationButtons.appendChild(previousButton);

    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement("button");
        button.textContent = i;

        if (i === currentPage) {
            button.classList.add("active");
        }

        button.addEventListener("click", () => {
            currentPage = i;
            renderAlerts();
        });

        paginationButtons.appendChild(button);
    }

    const nextButton = document.createElement("button");
    nextButton.textContent = "›";
    nextButton.disabled = currentPage === totalPages;

    nextButton.addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderAlerts();
        }
    });

    paginationButtons.appendChild(nextButton);
}

/* =====================================================
   ALERT DETAIL DRAWER
===================================================== */

function openAlertDrawer(alert) {
    drawerTitle.textContent = alert.title;

    drawerSeverity.textContent = alert.severity;
    drawerSeverity.className =
        `severity ${alert.severity.toLowerCase()}`;

    drawerStatus.textContent = alert.status;
    drawerStatus.className =
        `status-badge ${alert.status.toLowerCase()}`;

    drawerDescription.textContent = alert.description;

    detailId.textContent = alert.id;
    detailRule.textContent = alert.rule;
    detailAgent.textContent = alert.agent;
    detailIP.textContent = alert.sourceIP;
    detailFirstSeen.textContent = alert.firstSeen;
    detailLastSeen.textContent = alert.lastSeen;
    detailEvents.textContent =
        alert.relatedEvents === "—"
            ? "Not available"
            : `${alert.relatedEvents} events`;

    detectionLogic.textContent = alert.detectionLogic;

    drawer.classList.add("open");
}

function closeAlertDrawer() {
    if (drawer) {
        drawer.classList.remove("open");
    }
}

/* =====================================================
   LOCAL STATUS ACTIONS
   These changes are temporary until a status API exists.
===================================================== */

function updateSelectedAlertStatus(status) {
    if (!selectedAlert) return;

    selectedAlert.status = status;

    openAlertDrawer(selectedAlert);
    renderAlerts();
}

drawerClose.addEventListener("click", () => {
    closeAlertDrawer();
    selectedAlert = null;
    renderAlerts();
});

investigateButton.addEventListener("click", () => {
    updateSelectedAlertStatus("Investigating");
});

resolveButton.addEventListener("click", () => {
    updateSelectedAlertStatus("Resolved");
});

/* =====================================================
   SEARCH AND FILTER LISTENERS
===================================================== */

searchInput.addEventListener("input", filterAlerts);
severityFilter.addEventListener("change", filterAlerts);
alertTypeFilter.addEventListener("change", filterAlerts);
agentFilter.addEventListener("change", filterAlerts);
statusFilter.addEventListener("change", filterAlerts);

/* =====================================================
   RESET FILTERS
===================================================== */

resetButton.addEventListener("click", () => {
    searchInput.value = "";
    severityFilter.value = "";
    alertTypeFilter.value = "";
    agentFilter.value = "";
    statusFilter.value = "";

    currentPage = 1;
    selectedAlert = null;

    closeAlertDrawer();
    filterAlerts();
});

/* =====================================================
   REFRESH
===================================================== */

refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;

    const originalText = refreshButton.textContent;
    refreshButton.textContent = "↻ Refreshing...";

    try {
        await loadAlerts();
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = originalText;
    }
});

/* =====================================================
   INITIAL LOAD
===================================================== */

loadAlerts();
