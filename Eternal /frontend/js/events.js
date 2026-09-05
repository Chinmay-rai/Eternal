/* =====================================================
   ETERNAL EVENTS
===================================================== */


/* =====================================================
   DUMMY EVENT DATA
===================================================== */

const events = [

    {
        id: "EVT-00248",
        time: "22:42:17",
        timestamp: "2026-09-05 22:42:17",
        type: "SSH_LOGIN_FAILED",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.103",
        username: "root",
        severity: "High",
        description: "Failed SSH authentication attempt for user 'root' from 192.168.56.103."
    },

    {
        id: "EVT-00247",
        time: "22:41:53",
        timestamp: "2026-09-05 22:41:53",
        type: "SSH_LOGIN_FAILED",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.103",
        username: "admin",
        severity: "High",
        description: "Failed SSH authentication attempt for user 'admin'."
    },

    {
        id: "EVT-00246",
        time: "22:40:31",
        timestamp: "2026-09-05 22:40:31",
        type: "FILE_MODIFIED",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.101",
        username: "chinmay",
        severity: "Medium",
        description: "A monitored file was modified on the endpoint."
    },

    {
        id: "EVT-00245",
        time: "22:38:12",
        timestamp: "2026-09-05 22:38:12",
        type: "PROCESS_EXECUTION",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.101",
        username: "root",
        severity: "Low",
        description: "A process was executed on the monitored endpoint."
    },

    {
        id: "EVT-00244",
        time: "22:35:47",
        timestamp: "2026-09-05 22:35:47",
        type: "SSH_LOGIN_SUCCESS",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.103",
        username: "root",
        severity: "Medium",
        description: "Successful SSH authentication."
    },

    {
        id: "EVT-00243",
        time: "22:32:16",
        timestamp: "2026-09-05 22:32:16",
        type: "NETWORK_CONNECTION",
        agent: "Linux-VM-01",
        sourceIP: "10.0.2.15",
        username: "ubuntu",
        severity: "Low",
        description: "Network connection detected from the monitored endpoint."
    },

    {
        id: "EVT-00242",
        time: "22:28:03",
        timestamp: "2026-09-05 22:28:03",
        type: "SERVICE_STARTED",
        agent: "Linux-VM-01",
        sourceIP: "—",
        username: "root",
        severity: "Low",
        description: "A system service was started."
    },

    {
        id: "EVT-00241",
        time: "22:24:19",
        timestamp: "2026-09-05 22:24:19",
        type: "USER_CREATED",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.101",
        username: "admin",
        severity: "Medium",
        description: "A new user account was created."
    },

    {
        id: "EVT-00240",
        time: "22:22:11",
        timestamp: "2026-09-05 22:22:11",
        type: "SUDO_USAGE",
        agent: "Linux-VM-01",
        sourceIP: "192.168.56.109",
        username: "admin",
        severity: "Medium",
        description: "Sudo command execution detected."
    },

    {
        id: "EVT-00239",
        time: "22:20:03",
        timestamp: "2026-09-05 22:20:03",
        type: "FILE_DELETED",
        agent: "Linux-VM-01",
        sourceIP: "—",
        username: "root",
        severity: "High",
        description: "A monitored file was deleted."
    }

];


/* =====================================================
   STATE
===================================================== */

let filteredEvents = [...events];

let currentPage = 1;

const eventsPerPage = 10;

let selectedEvent = null;


/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody =
    document.getElementById("eventsTableBody");

const eventCount =
    document.getElementById("eventCount");

const searchInput =
    document.getElementById("eventSearch");

const typeFilter =
    document.getElementById("eventTypeFilter");

const severityFilter =
    document.getElementById("severityFilter");

const agentFilter =
    document.getElementById("agentFilter");

const timeFilter =
    document.getElementById("timeFilter");

const resetBtn =
    document.getElementById("resetBtn");

const refreshBtn =
    document.getElementById("refreshBtn");

const prevPage =
    document.getElementById("prevPage");

const nextPage =
    document.getElementById("nextPage");

const pageNumbers =
    document.getElementById("pageNumbers");

const paginationInfo =
    document.getElementById("paginationInfo");

const drawer =
    document.getElementById("eventDrawer");

const drawerContent =
    document.getElementById("drawerContent");

const closeDrawer =
    document.getElementById("closeDrawer");

const drawerOverlay =
    document.getElementById("drawerOverlay");


/* =====================================================
   RENDER EVENTS
===================================================== */

function renderEvents() {

    tableBody.innerHTML = "";

    const start =
        (currentPage - 1) * eventsPerPage;

    const end =
        start + eventsPerPage;

    const pageEvents =
        filteredEvents.slice(start, end);


    pageEvents.forEach(event => {

        const row =
            document.createElement("tr");

        if (
            selectedEvent &&
            selectedEvent.id === event.id
        ) {
            row.classList.add("selected");
        }


        row.innerHTML = `

            <td>${event.time}</td>

            <td>
                <strong>${event.type}</strong>
            </td>

            <td>${event.agent}</td>

            <td>${event.sourceIP}</td>

            <td>${event.username}</td>

            <td>
                <span class="severity ${event.severity.toLowerCase()}">
                    ${event.severity}
                </span>
            </td>

            <td>
                <span class="row-arrow">›</span>
            </td>

        `;


        row.addEventListener("click", () => {

            selectedEvent = event;

            renderEvents();

            openDrawer(event);

        });


        tableBody.appendChild(row);

    });


    updatePagination();

    updateEventCount();

}


/* =====================================================
   EVENT COUNT
===================================================== */

function updateEventCount() {

    eventCount.textContent =
        `${filteredEvents.length} events found`;

}


/* =====================================================
   FILTERING
===================================================== */

function filterEvents() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const type =
        typeFilter.value;

    const severity =
        severityFilter.value;

    const agent =
        agentFilter.value;


    filteredEvents =
        events.filter(event => {

            const matchesSearch =
                !search ||
                event.type.toLowerCase().includes(search) ||
                event.sourceIP.toLowerCase().includes(search) ||
                event.username.toLowerCase().includes(search) ||
                event.description.toLowerCase().includes(search) ||
                event.id.toLowerCase().includes(search);


            const matchesType =
                type === "all" ||
                event.type === type;


            const matchesSeverity =
                severity === "all" ||
                event.severity === severity;


            const matchesAgent =
                agent === "all" ||
                event.agent === agent;


            return (
                matchesSearch &&
                matchesType &&
                matchesSeverity &&
                matchesAgent
            );

        });


    currentPage = 1;

    selectedEvent = null;

    renderEvents();

}


/* =====================================================
   PAGINATION
===================================================== */

function updatePagination() {

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                filteredEvents.length /
                eventsPerPage
            )
        );


    if (currentPage > totalPages) {
        currentPage = totalPages;
    }


    const start =
        filteredEvents.length === 0
            ? 0
            : (currentPage - 1) * eventsPerPage + 1;


    const end =
        Math.min(
            currentPage * eventsPerPage,
            filteredEvents.length
        );


    paginationInfo.textContent =
        `Showing ${start}–${end} of ${filteredEvents.length}`;


    prevPage.disabled =
        currentPage === 1;

    nextPage.disabled =
        currentPage === totalPages;


    pageNumbers.innerHTML = "";


    for (
        let i = 1;
        i <= totalPages;
        i++
    ) {

        const button =
            document.createElement("button");

        button.className =
            "page-number";

        button.textContent = i;


        if (i === currentPage) {
            button.classList.add("active");
        }


        button.addEventListener(
            "click",
            () => {

                currentPage = i;

                renderEvents();

            }
        );


        pageNumbers.appendChild(button);

    }

}


/* =====================================================
   PREVIOUS / NEXT
===================================================== */

prevPage.addEventListener(
    "click",
    () => {

        if (currentPage > 1) {

            currentPage--;

            renderEvents();

        }

    }
);


nextPage.addEventListener(
    "click",
    () => {

        const totalPages =
            Math.ceil(
                filteredEvents.length /
                eventsPerPage
            );


        if (currentPage < totalPages) {

            currentPage++;

            renderEvents();

        }

    }
);


/* =====================================================
   DRAWER
===================================================== */

function openDrawer(event) {

    drawerContent.innerHTML = `

        <div class="drawer-event-type">
            ${event.type}
        </div>

        <span class="severity ${event.severity.toLowerCase()}">
            ${event.severity}
        </span>

        <div class="drawer-description">
            ${event.description}
        </div>


        <div class="detail-item">

            <div class="detail-label">
                Event ID
            </div>

            <div class="detail-value">
                ${event.id}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Timestamp
            </div>

            <div class="detail-value">
                ${event.timestamp}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Agent
            </div>

            <div class="detail-value">
                ${event.agent}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Source IP
            </div>

            <div class="detail-value">
                ${event.sourceIP}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Username
            </div>

            <div class="detail-value">
                ${event.username}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Event Type
            </div>

            <div class="detail-value">
                ${event.type}
            </div>

        </div>


        <div class="detail-item">

            <div class="detail-label">
                Severity
            </div>

            <div class="detail-value">
                ${event.severity}
            </div>

        </div>


        <div class="raw-data-title">
            Raw Event Data
        </div>

        <div class="raw-data">
${JSON.stringify(event, null, 2)}
        </div>

    `;


    drawer.classList.add("open");

    drawerOverlay.classList.add("active");

}


/* =====================================================
   CLOSE DRAWER
===================================================== */

function closeEventDrawer() {

    drawer.classList.remove("open");

    drawerOverlay.classList.remove("active");

    selectedEvent = null;

    renderEvents();

}


closeDrawer.addEventListener(
    "click",
    closeEventDrawer
);


drawerOverlay.addEventListener(
    "click",
    closeEventDrawer
);


/* =====================================================
   SEARCH + FILTER EVENTS
===================================================== */

searchInput.addEventListener(
    "input",
    filterEvents
);

typeFilter.addEventListener(
    "change",
    filterEvents
);

severityFilter.addEventListener(
    "change",
    filterEvents
);

agentFilter.addEventListener(
    "change",
    filterEvents
);

timeFilter.addEventListener(
    "change",
    filterEvents
);


/* =====================================================
   RESET
===================================================== */

resetBtn.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        typeFilter.value = "all";

        severityFilter.value = "all";

        agentFilter.value = "all";

        timeFilter.value = "24h";

        filteredEvents = [...events];

        currentPage = 1;

        selectedEvent = null;

        renderEvents();

    }
);


/* =====================================================
   REFRESH
===================================================== */

refreshBtn.addEventListener(
    "click",
    () => {

        refreshBtn.disabled = true;

        refreshBtn.querySelector("span").textContent = "⟳";

        setTimeout(() => {

            refreshBtn.disabled = false;

            refreshBtn.querySelector("span").textContent = "↻";

            renderEvents();

        }, 500);

    }
);


/* =====================================================
   INITIAL LOAD
===================================================== */

renderEvents();