const incidents = [
    {
        id: "INC-001",
        time: "23:41:05",
        name: "SSH Brute Force Attack",
        severity: "High",
        agent: "Linux-VM-01",
        alerts: 2,
        status: "Investigating",

        firstSeen: "23:38:12",
        lastSeen: "23:41:05",

        description:
            "Multiple failed SSH authentication attempts were detected from the same source within a short time window.",

        relatedAlerts: [
            "Repeated SSH Authentication Failures",
            "Successful Login After Failures"
        ],

        timeline: [
            {
                time: "23:38:12",
                event: "SSH login failed from 192.168.1.50"
            },
            {
                time: "23:39:04",
                event: "SSH login failed from 192.168.1.50"
            },
            {
                time: "23:40:18",
                event: "SSH login failed from 192.168.1.50"
            },
            {
                time: "23:41:02",
                event: "Detection rule triggered: 10 failed attempts within 60 seconds"
            },
            {
                time: "23:41:05",
                event: "Successful SSH login detected from 192.168.1.50"
            }
        ]
    },

    {
        id: "INC-002",
        time: "21:18:42",
        name: "Suspicious Privileged Activity",
        severity: "Medium",
        agent: "Linux-VM-01",
        alerts: 1,
        status: "Open",

        firstSeen: "21:18:20",
        lastSeen: "21:18:42",

        description:
            "A suspicious command was executed with elevated privileges on the monitored system.",

        relatedAlerts: [
            "Suspicious Privileged Command"
        ],

        timeline: [
            {
                time: "21:18:20",
                event: "User switched to elevated privileges"
            },
            {
                time: "21:18:35",
                event: "Suspicious command execution detected"
            },
            {
                time: "21:18:42",
                event: "Detection rule triggered"
            }
        ]
    },

    {
        id: "INC-003",
        time: "18:52:10",
        name: "Network Port Scan",
        severity: "Medium",
        agent: "Linux-VM-02",
        alerts: 1,
        status: "Resolved",

        firstSeen: "18:51:44",
        lastSeen: "18:52:10",

        description:
            "Multiple connection attempts were detected against different network ports.",

        relatedAlerts: [
            "Port Scan Detected"
        ],

        timeline: [
            {
                time: "18:51:44",
                event: "Connection attempt detected on port 22"
            },
            {
                time: "18:51:51",
                event: "Connection attempts detected across multiple ports"
            },
            {
                time: "18:52:10",
                event: "Port scan detection rule triggered"
            }
        ]
    }
];


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


let filteredIncidents = [...incidents];
let selectedIncident = null;


/* Render Table */

function renderIncidents() {

    tableBody.innerHTML = "";

    incidentCount.textContent =
        `${filteredIncidents.length} incident${filteredIncidents.length !== 1 ? "s" : ""}`;


    if (filteredIncidents.length === 0) {

        tableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    No incidents found
                </td>
            </tr>
        `;

        return;
    }


    filteredIncidents.forEach(incident => {

        const row = document.createElement("tr");

        const severityClass =
            `severity-${incident.severity.toLowerCase()}`;

        const statusClass =
            `status-${incident.status.toLowerCase()}`;


        row.innerHTML = `
            <td>${incident.time}</td>

            <td>
                <span class="incident-name">
                    ${incident.name}
                </span>
            </td>

            <td>
                <span class="severity ${severityClass}">
                    ${incident.severity}
                </span>
            </td>

            <td>${incident.agent}</td>

            <td>
                <span class="alert-count">
                    ${incident.alerts}
                </span>
            </td>

            <td>
                <span class="status ${statusClass}">
                    ${incident.status}
                </span>
            </td>

            <td>
                <span class="row-arrow">›</span>
            </td>
        `;


        row.addEventListener("click", () => {
            openDrawer(incident);
        });


        tableBody.appendChild(row);

    });
}


/* Filtering */

function applyFilters() {

    const searchTerm =
        searchInput.value.toLowerCase().trim();

    const severity =
        severityFilter.value;

    const status =
        statusFilter.value;


    filteredIncidents = incidents.filter(incident => {

        const matchesSearch =
            incident.name.toLowerCase().includes(searchTerm) ||
            incident.id.toLowerCase().includes(searchTerm) ||
            incident.agent.toLowerCase().includes(searchTerm);

        const matchesSeverity =
            !severity ||
            incident.severity === severity;

        const matchesStatus =
            !status ||
            incident.status === status;


        return (
            matchesSearch &&
            matchesSeverity &&
            matchesStatus
        );

    });


    renderIncidents();
}


/* Drawer */

function openDrawer(incident) {

    selectedIncident = incident;


    drawerTitle.textContent = incident.name;
    drawerId.textContent = incident.id;
    drawerSeverity.textContent = incident.severity;
    drawerStatus.textContent = incident.status;
    drawerAgent.textContent = incident.agent;
    drawerFirstSeen.textContent = incident.firstSeen;
    drawerLastSeen.textContent = incident.lastSeen;

    drawerDescription.textContent =
        incident.description;


    relatedAlerts.innerHTML = "";

    incident.relatedAlerts.forEach(alert => {

        const element = document.createElement("div");

        element.className = "related-alert";
        element.textContent = alert;

        relatedAlerts.appendChild(element);

    });


    incidentTimeline.innerHTML = "";

    incident.timeline.forEach(item => {

        const element = document.createElement("div");

        element.className = "timeline-item";

        element.innerHTML = `
            <span class="timeline-time">
                ${item.time}
            </span>

            <span class="timeline-event">
                ${item.event}
            </span>
        `;

        incidentTimeline.appendChild(element);

    });


    drawer.classList.add("open");

    updateActionButtons();
}


function closeDrawer() {

    drawer.classList.remove("open");

    selectedIncident = null;
}


/* Incident Actions */

function updateActionButtons() {

    if (!selectedIncident) {
        return;
    }


    if (selectedIncident.status === "Open") {

        investigateButton.style.display = "block";
        investigateButton.textContent = "Mark Investigating";

    }

    else if (selectedIncident.status === "Investigating") {

        investigateButton.style.display = "block";
        investigateButton.textContent = "Mark Open";

    }

    else {

        investigateButton.style.display = "none";

    }


    if (selectedIncident.status === "Resolved") {

        resolveButton.style.display = "none";

    }

    else {

        resolveButton.style.display = "block";

    }

}


/* Mark Investigating */

investigateButton.addEventListener("click", () => {

    if (!selectedIncident) {
        return;
    }


    if (selectedIncident.status === "Open") {

        selectedIncident.status = "Investigating";

    } else {

        selectedIncident.status = "Open";

    }


    drawerStatus.textContent =
        selectedIncident.status;

    applyFilters();
    updateActionButtons();

});


/* Resolve */

resolveButton.addEventListener("click", () => {

    if (!selectedIncident) {
        return;
    }


    selectedIncident.status = "Resolved";

    drawerStatus.textContent = "Resolved";

    applyFilters();
    updateActionButtons();

});


/* Search / Filters */

searchInput.addEventListener("input", applyFilters);

severityFilter.addEventListener("change", applyFilters);

statusFilter.addEventListener("change", applyFilters);


/* Reset */

resetButton.addEventListener("click", () => {

    searchInput.value = "";
    severityFilter.value = "";
    statusFilter.value = "";

    applyFilters();

});


/* Refresh */

refreshButton.addEventListener("click", () => {

    renderIncidents();

});


/* Close Drawer */

drawerClose.addEventListener("click", closeDrawer);


/* Initial Render */

renderIncidents();