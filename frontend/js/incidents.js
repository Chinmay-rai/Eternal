const API_URL = "/api/incidents";

let incidents = [];
let filteredIncidents = [];
let selectedIncident = null;

const tableBody = document.getElementById("incidents-table-body");
const incidentCount = document.getElementById("incident-count");

const searchInput = document.getElementById("incident-search");
const severityFilter = document.getElementById("severity-filter");
const statusFilter = document.getElementById("status-filter");

const resetButton = document.getElementById("reset-filters");
const refreshButton = document.getElementById("refresh-incidents");

const drawer = document.getElementById("incident-drawer");
const drawerClose = document.getElementById("drawer-close");

const drawerTitle = document.getElementById("drawer-title");
const drawerId = document.getElementById("drawer-id");
const drawerSeverity = document.getElementById("drawer-severity");
const drawerStatus = document.getElementById("drawer-status");
const drawerAgent = document.getElementById("drawer-agent");
const drawerFirstSeen = document.getElementById("drawer-first-seen");
const drawerLastSeen = document.getElementById("drawer-last-seen");
const drawerDescription = document.getElementById("drawer-description");

const relatedAlerts = document.getElementById("related-alerts");
const incidentTimeline = document.getElementById("incident-timeline");

const investigateButton = document.getElementById("investigate-button");
const resolveButton = document.getElementById("resolve-button");


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function displayId(id) {
    return `INC-${String(id).padStart(3, "0")}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function severityClass(value) {
    return `severity-${String(value || "medium").toLowerCase()}`;
}

function statusClass(value) {
    return `status-${String(value || "open").toLowerCase()}`;
}


// --------------------------------------------------
// Load incidents from the real API
// --------------------------------------------------

async function loadIncidents() {
    if (refreshButton) {
        refreshButton.disabled = true;
    }

    try {
        const response = await fetch(API_URL, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`API returned HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("The incidents API did not return a list.");
        }

        incidents = data.map(item => ({
            ...item,
            id: Number(item.id),
            displayId: displayId(item.id),
            name: item.name || "Unnamed Incident",
            severity: item.severity || "Medium",
            status: item.status || "Open",
            agent: item.agent || "Unknown Agent",
            alerts: Number(item.alert_count || 0),
            firstSeen: item.first_seen,
            lastSeen: item.last_seen,
            description: item.description || "No description available."
        }));

        applyFilters();

        // Refresh the open drawer with the updated record.
        if (selectedIncident) {
            const updated = incidents.find(
                item => item.id === selectedIncident.id
            );

            if (updated) {
                selectedIncident = updated;
                renderDrawer(updated);
            } else {
                closeDrawer();
            }
        }
    } catch (error) {
        console.error("Failed to load incidents:", error);

        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="7">
                        Could not load incidents. Check that Flask is running
                        and /api/incidents is available.
                    </td>
                </tr>
            `;
        }

        if (incidentCount) {
            incidentCount.textContent = "Unable to load incidents";
        }
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}


// --------------------------------------------------
// Render incidents table
// --------------------------------------------------

function renderIncidents() {
    if (!tableBody || !incidentCount) return;

    tableBody.innerHTML = "";

    incidentCount.textContent =
        `${filteredIncidents.length} incident` +
        `${filteredIncidents.length !== 1 ? "s" : ""}`;

    if (filteredIncidents.length === 0) {
        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No incidents found</td>
            </tr>
        `;
        return;
    }

    filteredIncidents.forEach(incident => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(formatDate(incident.lastSeen))}</td>

            <td>
                <span class="incident-name">
                    ${escapeHTML(incident.name)}
                </span>
                <small>${escapeHTML(incident.displayId)}</small>
            </td>

            <td>
                <span class="severity ${severityClass(incident.severity)}">
                    ${escapeHTML(incident.severity)}
                </span>
            </td>

            <td>${escapeHTML(incident.agent)}</td>

            <td>
                <span class="alert-count">${incident.alerts}</span>
            </td>

            <td>
                <span class="status ${statusClass(incident.status)}">
                    ${escapeHTML(incident.status)}
                </span>
            </td>

            <td><span class="row-arrow">›</span></td>
        `;

        row.addEventListener("click", () => openDrawer(incident));
        tableBody.appendChild(row);
    });
}


// --------------------------------------------------
// Search and filters
// --------------------------------------------------

function applyFilters() {
    const searchTerm = (searchInput?.value || "")
        .toLowerCase()
        .trim();

    const severity = severityFilter?.value || "";
    const status = statusFilter?.value || "";

    filteredIncidents = incidents.filter(incident => {
        const matchesSearch = [
            incident.name,
            incident.displayId,
            incident.agent,
            incident.description
        ].some(value =>
            String(value || "").toLowerCase().includes(searchTerm)
        );

        const matchesSeverity =
            !severity ||
            incident.severity.toLowerCase() === severity.toLowerCase();

        const matchesStatus =
            !status ||
            incident.status.toLowerCase() === status.toLowerCase();

        return matchesSearch && matchesSeverity && matchesStatus;
    });

    renderIncidents();
}


// --------------------------------------------------
// Incident details drawer
// --------------------------------------------------

function openDrawer(incident) {
    selectedIncident = incident;

    renderDrawer(incident);

    if (drawer) {
        drawer.classList.add("open");
    }
}

function renderDrawer(incident) {
    if (!incident) return;

    if (drawerTitle) drawerTitle.textContent = incident.name;
    if (drawerId) drawerId.textContent = incident.displayId;
    if (drawerSeverity) drawerSeverity.textContent = incident.severity;
    if (drawerStatus) drawerStatus.textContent = incident.status;
    if (drawerAgent) drawerAgent.textContent = incident.agent;

    if (drawerFirstSeen) {
        drawerFirstSeen.textContent = formatDate(incident.firstSeen);
    }

    if (drawerLastSeen) {
        drawerLastSeen.textContent = formatDate(incident.lastSeen);
    }

    if (drawerDescription) {
        drawerDescription.textContent = incident.description;
    }

    // The current API provides an alert count, not individual alert details.
    if (relatedAlerts) {
        relatedAlerts.innerHTML = "";

        const message = document.createElement("div");
        message.className = "related-alert";

        message.textContent = incident.alerts
            ? `${incident.alerts} linked alert(s). Individual alert details are not provided by this API yet.`
            : "No linked alerts.";

        relatedAlerts.appendChild(message);
    }

    // Show the real incident timestamps rather than a fabricated timeline.
    if (incidentTimeline) {
        incidentTimeline.innerHTML = "";

        const entries = [
            ["First seen", incident.firstSeen],
            ["Last seen", incident.lastSeen]
        ];

        entries.forEach(([label, timestamp]) => {
            const element = document.createElement("div");
            element.className = "timeline-item";

            const time = document.createElement("span");
            time.className = "timeline-time";
            time.textContent = formatDate(timestamp);

            const event = document.createElement("span");
            event.className = "timeline-event";
            event.textContent = label;

            element.append(time, event);
            incidentTimeline.appendChild(element);
        });
    }

    updateActionButtons();
}

function closeDrawer() {
    if (drawer) {
        drawer.classList.remove("open");
    }

    selectedIncident = null;
}


// --------------------------------------------------
// Persist status changes through Flask
// --------------------------------------------------

async function changeIncidentStatus(newStatus) {
    if (!selectedIncident) return;

    const incident = selectedIncident;

    if (investigateButton) investigateButton.disabled = true;
    if (resolveButton) resolveButton.disabled = true;

    try {
        const response = await fetch(
            `${API_URL}/${incident.id}/status`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: newStatus })
            }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                result.error || `HTTP ${response.status}`
            );
        }

        // Reload from the database after the server confirms the update.
        await loadIncidents();

        const updated = incidents.find(item => item.id === incident.id);

        if (updated) {
            selectedIncident = updated;
            renderDrawer(updated);
        }
    } catch (error) {
        console.error("Failed to update incident:", error);
        alert(`Could not update incident status: ${error.message}`);
    } finally {
        if (investigateButton) investigateButton.disabled = false;
        if (resolveButton) resolveButton.disabled = false;
    }
}

function updateActionButtons() {
    if (!selectedIncident) return;

    if (investigateButton) {
        if (selectedIncident.status === "Open") {
            investigateButton.style.display = "block";
            investigateButton.textContent = "Mark Investigating";
        } else if (selectedIncident.status === "Investigating") {
            investigateButton.style.display = "block";
            investigateButton.textContent = "Mark Open";
        } else {
            investigateButton.style.display = "none";
        }
    }

    if (resolveButton) {
        resolveButton.style.display =
            selectedIncident.status === "Resolved" ? "none" : "block";
    }
}


// --------------------------------------------------
// Event listeners
// --------------------------------------------------

if (investigateButton) {
    investigateButton.addEventListener("click", () => {
        if (!selectedIncident) return;

        const nextStatus =
            selectedIncident.status === "Open"
                ? "Investigating"
                : "Open";

        changeIncidentStatus(nextStatus);
    });
}

if (resolveButton) {
    resolveButton.addEventListener("click", () => {
        changeIncidentStatus("Resolved");
    });
}

if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
}

if (severityFilter) {
    severityFilter.addEventListener("change", applyFilters);
}

if (statusFilter) {
    statusFilter.addEventListener("change", applyFilters);
}

if (resetButton) {
    resetButton.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (severityFilter) severityFilter.value = "";
        if (statusFilter) statusFilter.value = "";

        applyFilters();
    });
}

if (refreshButton) {
    refreshButton.addEventListener("click", loadIncidents);
}

if (drawerClose) {
    drawerClose.addEventListener("click", closeDrawer);
}


// --------------------------------------------------
// Initial load
// --------------------------------------------------

loadIncidents();