
/* =====================================================
   ETERNAL AGENTS — LIVE DATABASE DATA
===================================================== */


/* =====================================================
   STATE
===================================================== */

let agents = [];
let filteredAgents = [];
let selectedAgent = null;


/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody = document.getElementById("agents-table-body");
const agentCount = document.getElementById("agent-count");
const searchInput = document.getElementById("agent-search");
const statusFilter = document.getElementById("status-filter");
const resetButton = document.getElementById("reset-filters");
const refreshButton = document.getElementById("refresh-agents");

const drawer = document.getElementById("agent-drawer");
const drawerClose = document.getElementById("drawer-close");
const drawerAgentName = document.getElementById("drawer-agent-name");
const drawerStatus = document.getElementById("drawer-status");
const drawerStatusDot = document.getElementById("drawer-status-dot");

const detailName = document.getElementById("detail-name");
const detailIP = document.getElementById("detail-ip");
const detailLastCommunication =
    document.getElementById("detail-last-communication");
const detailEvents = document.getElementById("detail-events");


/* =====================================================
   HELPERS
===================================================== */

function formatLastCommunication(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function createCell(value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = value ?? "—";

    if (className) {
        cell.className = className;
    }

    return cell;
}


/* =====================================================
   RENDER AGENTS
===================================================== */

function renderAgents() {
    tableBody.replaceChildren();

    if (filteredAgents.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent = agents.length
            ? "No agents match your filters."
            : "No registered agents found.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        updateAgentCount();
        return;
    }

    filteredAgents.forEach(agent => {
        const row = document.createElement("tr");
        row.classList.add("agent-row");

        if (selectedAgent?.name === agent.name) {
            row.classList.add("selected");
        }

        const statusClass = (agent.status || "unknown").toLowerCase();

        // Agent name
        row.appendChild(createCell(agent.name, "agent-name"));

        // Status badge
        const statusCell = document.createElement("td");
        const statusBadge = document.createElement("span");

        statusBadge.className =
            `agent-status-badge ${statusClass}`;

        const statusDot = document.createElement("span");
        statusDot.className = "status-dot";

        const statusText = document.createElement("span");
        statusText.className = "status-text";
        statusText.textContent = agent.status || "Unknown";

        statusBadge.append(statusDot, statusText);
        statusCell.appendChild(statusBadge);
        row.appendChild(statusCell);

        // IP address
        row.appendChild(createCell(agent.ip));

        // Last communication
        row.appendChild(
            createCell(formatLastCommunication(agent.lastCommunication))
        );

        // Event count
        row.appendChild(
            createCell(
                Number(agent.events || 0).toLocaleString(),
                "event-count"
            )
        );

        // Row arrow
        row.appendChild(createCell("›", "agent-arrow"));

        row.addEventListener("click", () => {
            selectedAgent = agent;
            renderAgents();
            openAgentDrawer(agent);
        });

        tableBody.appendChild(row);
    });

    updateAgentCount();
}


/* =====================================================
   AGENT COUNT
===================================================== */

function updateAgentCount() {
    const count = filteredAgents.length;

    agentCount.textContent =
        `${count} ${count === 1 ? "agent" : "agents"}`;
}


/* =====================================================
   SEARCH AND FILTERS
===================================================== */

function filterAgents() {
    const search = searchInput.value.toLowerCase().trim();
    const status = statusFilter.value;

    filteredAgents = agents.filter(agent => {
        const name = (agent.name || "").toLowerCase();
        const ip = (agent.ip || "").toLowerCase();

        const matchesSearch =
            !search ||
            name.includes(search) ||
            ip.includes(search);

        const matchesStatus =
            !status || agent.status === status;

        return matchesSearch && matchesStatus;
    });

    if (
        selectedAgent &&
        !filteredAgents.some(agent => agent.name === selectedAgent.name)
    ) {
        selectedAgent = null;
        closeAgentDrawer();
    }

    renderAgents();
}

searchInput.addEventListener("input", filterAgents);
statusFilter.addEventListener("change", filterAgents);


/* =====================================================
   AGENT DETAILS DRAWER
===================================================== */

function openAgentDrawer(agent) {
    drawerAgentName.textContent = agent.name || "Unknown agent";
    drawerStatus.textContent = agent.status || "Unknown";

    drawerStatusDot.className = "status-dot";

    if ((agent.status || "").toLowerCase() !== "active") {
        drawerStatusDot.classList.add("offline");
    }

    detailName.textContent = agent.name || "—";
    detailIP.textContent = agent.ip || "—";

    detailLastCommunication.textContent =
        formatLastCommunication(agent.lastCommunication);

    detailEvents.textContent =
        Number(agent.events || 0).toLocaleString();

    drawer.classList.add("open");
}

function closeAgentDrawer() {
    drawer.classList.remove("open");
}

drawerClose.addEventListener("click", () => {
    closeAgentDrawer();
    selectedAgent = null;
    renderAgents();
});


/* =====================================================
   RESET FILTERS
===================================================== */

resetButton.addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    selectedAgent = null;

    closeAgentDrawer();
    filterAgents();
});


/* =====================================================
   FETCH REAL AGENT DATA
===================================================== */

async function loadAgents() {
    refreshButton.disabled = true;
    refreshButton.textContent = "↻ Refreshing...";

    try {
        const response = await fetch("/api/agents");

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response from agents API");
        }

        agents = data;

        // Keep the drawer selection synced with refreshed data.
        if (selectedAgent) {
            selectedAgent =
                agents.find(agent => agent.name === selectedAgent.name) || null;

            if (selectedAgent) {
                openAgentDrawer(selectedAgent);
            } else {
                closeAgentDrawer();
            }
        }

        filterAgents();

    } catch (error) {
        console.error("Failed to load agents:", error);

        tableBody.replaceChildren();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 6;
        cell.textContent =
            "Unable to load agents. Check the Flask API and try refreshing.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        agentCount.textContent = "Unable to load agents";

    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ Refresh";
    }
}


/* =====================================================
   REFRESH BUTTON
===================================================== */

refreshButton.addEventListener("click", loadAgents);


/* =====================================================
   INITIAL LOAD
===================================================== */

loadAgents();

// Refresh data every 15 seconds.
setInterval(loadAgents, 15000);
