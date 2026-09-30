/* =====================================================
   ETERNAL ALERTS
===================================================== */


/* =====================================================
   DUMMY ALERT DATA
===================================================== */

const alerts = [

    {
        id: "ALT-000124",
        time: "23:41:18",
        timestamp: "Sep 5, 2026 23:41:18",
        title: "SSH Brute Force",
        rule: "AUTH-001",
        agent: "Linux-VM-01",
        sourceIP: "192.168.1.24",
        severity: "High",
        status: "New",
        firstSeen: "Sep 5, 2026 23:32:11",
        lastSeen: "Sep 5, 2026 23:41:18",
        relatedEvents: 7,
        description:
            "Multiple failed SSH authentication attempts were detected from the same source IP. This may indicate a brute force attack.",
        detectionLogic:
            "Triggers when 5 or more failed SSH login attempts are detected from the same source IP within a 2 minute window."
    },

    {
        id: "ALT-000123",
        time: "23:27:04",
        timestamp: "Sep 5, 2026 23:27:04",
        title: "Suspicious File Modification",
        rule: "FIM-002",
        agent: "Linux-VM-01",
        sourceIP: "10.0.0.15",
        severity: "Critical",
        status: "Investigating",
        firstSeen: "Sep 5, 2026 23:26:51",
        lastSeen: "Sep 5, 2026 23:27:04",
        relatedEvents: 3,
        description:
            "A monitored system file was modified unexpectedly on the endpoint.",
        detectionLogic:
            "Triggers when the cryptographic hash of a monitored file changes unexpectedly."
    },

    {
        id: "ALT-000122",
        time: "23:18:33",
        timestamp: "Sep 5, 2026 23:18:33",
        title: "Port Scan Detected",
        rule: "NET-001",
        agent: "Linux-VM-02",
        sourceIP: "203.0.113.45",
        severity: "High",
        status: "New",
        firstSeen: "Sep 5, 2026 23:16:10",
        lastSeen: "Sep 5, 2026 23:18:33",
        relatedEvents: 18,
        description:
            "Multiple connection attempts against different ports were detected from the same source.",
        detectionLogic:
            "Triggers when multiple destination ports are contacted within a short time window."
    },

    {
        id: "ALT-000121",
        time: "22:56:11",
        timestamp: "Sep 5, 2026 22:56:11",
        title: "Privilege Escalation",
        rule: "PRIV-001",
        agent: "Linux-VM-02",
        sourceIP: "192.168.1.31",
        severity: "Medium",
        status: "Resolved",
        firstSeen: "Sep 5, 2026 22:54:22",
        lastSeen: "Sep 5, 2026 22:56:11",
        relatedEvents: 4,
        description:
            "Suspicious privileged activity was detected on the monitored endpoint.",
        detectionLogic:
            "Triggers when privileged commands or unexpected sudo activity match the configured detection conditions."
    },

    {
        id: "ALT-000120",
        time: "22:43:27",
        timestamp: "Sep 5, 2026 22:43:27",
        title: "Malware Execution",
        rule: "MAL-001",
        agent: "Linux-VM-01",
        sourceIP: "192.168.1.24",
        severity: "High",
        status: "New",
        firstSeen: "Sep 5, 2026 22:42:58",
        lastSeen: "Sep 5, 2026 22:43:27",
        relatedEvents: 5,
        description:
            "A suspicious executable was launched on the monitored endpoint.",
        detectionLogic:
            "Triggers when process execution matches configured suspicious command or process patterns."
    },

    {
        id: "ALT-000119",
        time: "22:31:09",
        timestamp: "Sep 5, 2026 22:31:09",
        title: "Multiple Failed Logins",
        rule: "AUTH-001",
        agent: "Linux-VM-02",
        sourceIP: "198.51.100.23",
        severity: "Medium",
        status: "Investigating",
        firstSeen: "Sep 5, 2026 22:28:12",
        lastSeen: "Sep 5, 2026 22:31:09",
        relatedEvents: 6,
        description:
            "Several failed authentication attempts were detected against the endpoint.",
        detectionLogic:
            "Triggers when repeated authentication failures exceed the configured threshold."
    },

    {
        id: "ALT-000118",
        time: "21:54:52",
        timestamp: "Sep 5, 2026 21:54:52",
        title: "Unexpected Process",
        rule: "PROC-001",
        agent: "Linux-VM-01",
        sourceIP: "10.0.0.8",
        severity: "Low",
        status: "Resolved",
        firstSeen: "Sep 5, 2026 21:54:20",
        lastSeen: "Sep 5, 2026 21:54:52",
        relatedEvents: 2,
        description:
            "A process outside the expected activity pattern was detected.",
        detectionLogic:
            "Triggers when a process matches a configured suspicious process pattern."
    },

    {
        id: "ALT-000117",
        time: "21:28:17",
        timestamp: "Sep 5, 2026 21:28:17",
        title: "Outbound Connection",
        rule: "NET-002",
        agent: "Linux-VM-02",
        sourceIP: "185.199.110.42",
        severity: "Medium",
        status: "New",
        firstSeen: "Sep 5, 2026 21:27:44",
        lastSeen: "Sep 5, 2026 21:28:17",
        relatedEvents: 3,
        description:
            "An unexpected outbound network connection was detected.",
        detectionLogic:
            "Triggers when an outbound connection matches configured network monitoring conditions."
    }

];


/* =====================================================
   STATE
===================================================== */

let filteredAlerts = [...alerts];

let currentPage = 1;

const alertsPerPage = 8;

let selectedAlert = null;


/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody =
    document.getElementById("alerts-table-body");

const alertCount =
    document.getElementById("alert-count");

const searchInput =
    document.getElementById("alert-search");

const severityFilter =
    document.getElementById("severity-filter");

const alertTypeFilter =
    document.getElementById("alert-type-filter");

const agentFilter =
    document.getElementById("agent-filter");

const statusFilter =
    document.getElementById("status-filter");

const resetButton =
    document.getElementById("reset-filters");

const refreshButton =
    document.getElementById("refresh-alerts");


/* Drawer */

const drawer =
    document.getElementById("alert-drawer");

const drawerClose =
    document.getElementById("drawer-close");

const drawerTitle =
    document.getElementById("drawer-title");

const drawerSeverity =
    document.getElementById("drawer-severity");

const drawerStatus =
    document.getElementById("drawer-status");

const drawerDescription =
    document.getElementById("drawer-description");

const detailId =
    document.getElementById("detail-id");

const detailRule =
    document.getElementById("detail-rule");

const detailAgent =
    document.getElementById("detail-agent");

const detailIP =
    document.getElementById("detail-ip");

const detailFirstSeen =
    document.getElementById("detail-first-seen");

const detailLastSeen =
    document.getElementById("detail-last-seen");

const detailEvents =
    document.getElementById("detail-events");

const detectionLogic =
    document.getElementById("detection-logic");

const investigateButton =
    document.getElementById("investigate-btn");

const resolveButton =
    document.getElementById("resolve-btn");


/* =====================================================
   RENDER ALERTS
===================================================== */

function renderAlerts() {

    tableBody.innerHTML = "";

    const start =
        (currentPage - 1) * alertsPerPage;

    const end =
        start + alertsPerPage;

    const pageAlerts =
        filteredAlerts.slice(start, end);


    pageAlerts.forEach(alert => {

        const row =
            document.createElement("tr");

        row.classList.add("alert-row");


        if (
            selectedAlert &&
            selectedAlert.id === alert.id
        ) {
            row.classList.add("selected");
        }


        row.innerHTML = `

            <td>${alert.time}</td>

            <td>
                <span class="alert-name">
                    ${alert.title}
                </span>
            </td>

            <td>
                <span class="rule-code">
                    ${alert.rule}
                </span>
            </td>

            <td>${alert.agent}</td>

            <td>${alert.sourceIP}</td>

            <td>
                <span class="severity ${alert.severity.toLowerCase()}">
                    ${alert.severity}
                </span>
            </td>

            <td>
                <span class="status-badge ${alert.status.toLowerCase()}">
                    ${alert.status}
                </span>
            </td>

            <td class="alert-arrow">
                ›
            </td>

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

    alertCount.textContent =
        `${filteredAlerts.length} alerts`;

}


/* =====================================================
   FILTERING
===================================================== */

function filterAlerts() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const severity =
        severityFilter.value;

    const type =
        alertTypeFilter.value;

    const agent =
        agentFilter.value;

    const status =
        statusFilter.value;


    filteredAlerts =
        alerts.filter(alert => {

            const matchesSearch =
                !search ||
                alert.title.toLowerCase().includes(search) ||
                alert.rule.toLowerCase().includes(search) ||
                alert.agent.toLowerCase().includes(search) ||
                alert.sourceIP.toLowerCase().includes(search) ||
                alert.description.toLowerCase().includes(search) ||
                alert.id.toLowerCase().includes(search);


            const matchesSeverity =
                !severity ||
                alert.severity === severity;


            const matchesType =
                !type ||
                alert.title === type;


            const matchesAgent =
                !agent ||
                alert.agent === agent;


            const matchesStatus =
                !status ||
                alert.status === status;


            return (
                matchesSearch &&
                matchesSeverity &&
                matchesType &&
                matchesAgent &&
                matchesStatus
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

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredAlerts.length /
                alertsPerPage
            )
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const start =
        filteredAlerts.length === 0
            ? 0
            : (currentPage - 1) *
              alertsPerPage + 1;


    const end =
        Math.min(
            currentPage * alertsPerPage,
            filteredAlerts.length
        );


    document.getElementById(
        "pagination-info"
    ).textContent =
        `Showing ${start}–${end} of ${filteredAlerts.length} alerts`;


    const paginationButtons =
        document.getElementById(
            "pagination-buttons"
        );


    paginationButtons.innerHTML = "";


    /* Previous */

    const previousButton =
        document.createElement("button");

    previousButton.textContent = "‹";

    previousButton.disabled =
        currentPage === 1;


    previousButton.addEventListener(
        "click",
        () => {

            if (currentPage > 1) {

                currentPage--;

                renderAlerts();

            }

        }
    );


    paginationButtons.appendChild(
        previousButton
    );


    /* Page numbers */

    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        const button =
            document.createElement("button");

        button.textContent = i;


        if (i === currentPage) {

            button.classList.add(
                "active"
            );

        }


        button.addEventListener(
            "click",
            () => {

                currentPage = i;

                renderAlerts();

            }
        );


        paginationButtons.appendChild(
            button
        );

    }


    /* Next */

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "›";

    nextButton.disabled =
        currentPage === totalPages;


    nextButton.addEventListener(
        "click",
        () => {

            if (
                currentPage < totalPages
            ) {

                currentPage++;

                renderAlerts();

            }

        }
    );


    paginationButtons.appendChild(
        nextButton
    );

}


/* =====================================================
   OPEN ALERT DRAWER
===================================================== */

function openAlertDrawer(alert) {

    drawerTitle.textContent =
        alert.title;


    drawerSeverity.textContent =
        alert.severity;

    drawerSeverity.className =
        `severity ${alert.severity.toLowerCase()}`;


    drawerStatus.textContent =
        alert.status;

    drawerStatus.className =
        `status-badge ${alert.status.toLowerCase()}`;


    drawerDescription.textContent =
        alert.description;


    detailId.textContent =
        alert.id;

    detailRule.textContent =
        alert.rule;

    detailAgent.textContent =
        alert.agent;

    detailIP.textContent =
        alert.sourceIP;

    detailFirstSeen.textContent =
        alert.firstSeen;

    detailLastSeen.textContent =
        alert.lastSeen;

    detailEvents.textContent =
        `${alert.relatedEvents} events`;


    detectionLogic.textContent =
        alert.detectionLogic;


    drawer.classList.add("open");

}


/* =====================================================
   CLOSE DRAWER
===================================================== */

function closeAlertDrawer() {

    drawer.classList.remove("open");

}


drawerClose.addEventListener(
    "click",
    () => {

        closeAlertDrawer();

        selectedAlert = null;

        renderAlerts();

    }
);


/* =====================================================
   MARK INVESTIGATING
===================================================== */

investigateButton.addEventListener(
    "click",
    () => {

        if (!selectedAlert) {
            return;
        }


        selectedAlert.status =
            "Investigating";


        openAlertDrawer(selectedAlert);

        renderAlerts();

    }
);


/* =====================================================
   RESOLVE ALERT
===================================================== */

resolveButton.addEventListener(
    "click",
    () => {

        if (!selectedAlert) {
            return;
        }


        selectedAlert.status =
            "Resolved";


        openAlertDrawer(selectedAlert);

        renderAlerts();

    }
);


/* =====================================================
   SEARCH + FILTER EVENTS
===================================================== */

searchInput.addEventListener(
    "input",
    filterAlerts
);


severityFilter.addEventListener(
    "change",
    filterAlerts
);


alertTypeFilter.addEventListener(
    "change",
    filterAlerts
);


agentFilter.addEventListener(
    "change",
    filterAlerts
);


statusFilter.addEventListener(
    "change",
    filterAlerts
);


/* =====================================================
   RESET
===================================================== */

resetButton.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        severityFilter.value = "";

        alertTypeFilter.value = "";

        agentFilter.value = "";

        statusFilter.value = "";

        filteredAlerts =
            [...alerts];

        currentPage = 1;

        selectedAlert = null;

        closeAlertDrawer();

        renderAlerts();

    }
);


/* =====================================================
   REFRESH
===================================================== */

refreshButton.addEventListener(
    "click",
    () => {

        refreshButton.disabled = true;

        refreshButton.textContent =
            "↻ Refreshing...";


        setTimeout(() => {

            refreshButton.disabled = false;

            refreshButton.textContent =
                "↻ Refresh";

            renderAlerts();

        }, 500);

    }
);


/* =====================================================
   INITIAL LOAD
===================================================== */

renderAlerts();