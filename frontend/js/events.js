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
   RENDER EVENTS
===================================================== */

function renderEvents() {

    tableBody.innerHTML = "";

    const start = (currentPage - 1) * eventsPerPage;

    const end = start + eventsPerPage;

    const pageEvents = filteredEvents.slice(start, end);


    pageEvents.forEach(event => {

        const row = document.createElement("tr");

        row.classList.add("event-row");


        if (selectedEvent && selectedEvent.id === event.id) {
            row.classList.add("selected");
        }


        row.innerHTML = `

            <td>${event.time}</td>

            <td>
                <span class="event-type">${event.type}</span>
            </td>

            <td>${event.agent}</td>

            <td>${event.sourceIP}</td>

            <td>${event.username}</td>

            <td>
                <span class="severity ${event.severity.toLowerCase()}">
                    ${event.severity}
                </span>
            </td>

            <td class="row-arrow">›</td>

        `;


        /* Open drawer */

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

    eventCount.textContent =
        `${filteredEvents.length} events`;

}


/* =====================================================
   FILTERING
===================================================== */

function filterEvents() {

    const search =
        searchInput.value.toLowerCase().trim();

    const type =
        typeFilter.value;

    const severity =
        severityFilter.value;

    const agent =
        agentFilter.value;


    filteredEvents = events.filter(event => {

        const matchesSearch =
            !search ||
            event.type.toLowerCase().includes(search) ||
            event.agent.toLowerCase().includes(search) ||
            event.sourceIP.toLowerCase().includes(search) ||
            event.username.toLowerCase().includes(search) ||
            event.description.toLowerCase().includes(search) ||
            event.id.toLowerCase().includes(search);


        const matchesType =
            !type ||
            event.type === type;


        const matchesSeverity =
            !severity ||
            event.severity === severity;


        const matchesAgent =
            !agent ||
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

    closeDrawer();

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
                filteredEvents.length / eventsPerPage
            )
        );


    const paginationInfo =
        document.querySelector(".pagination-info");


    const paginationButtons =
        document.querySelector(".pagination-buttons");


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
        `Showing ${start}–${end} of ${filteredEvents.length} events`;


    paginationButtons.innerHTML = "";


    /* Previous */

    const previousButton =
        document.createElement("button");

    previousButton.textContent = "‹";

    previousButton.disabled =
        currentPage === 1;


    previousButton.addEventListener("click", () => {

        if (currentPage > 1) {

            currentPage--;

            renderEvents();

        }

    });


    paginationButtons.appendChild(previousButton);


    /* Page numbers */

    for (let i = 1; i <= totalPages; i++) {

        const button =
            document.createElement("button");

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


    /* Next */

    const nextButton =
        document.createElement("button");

    nextButton.textContent = "›";

    nextButton.disabled =
        currentPage === totalPages;


    nextButton.addEventListener("click", () => {

        if (currentPage < totalPages) {

            currentPage++;

            renderEvents();

        }

    });


    paginationButtons.appendChild(nextButton);

}


/* =====================================================
   EVENT DRAWER
===================================================== */

function openDrawer(event) {

    drawerContent.innerHTML = `

        <div class="drawer-severity">

            <span class="severity ${event.severity.toLowerCase()}">
                ${event.severity}
            </span>

        </div>


        <div class="event-description">

            ${event.description}

        </div>


        <div class="detail-grid">

            <div class="detail-item">
                <span>Event ID</span>
                <strong>${event.id}</strong>
            </div>

            <div class="detail-item">
                <span>Timestamp</span>
                <strong>${event.timestamp}</strong>
            </div>

            <div class="detail-item">
                <span>Agent</span>
                <strong>${event.agent}</strong>
            </div>

            <div class="detail-item">
                <span>Source IP</span>
                <strong>${event.sourceIP}</strong>
            </div>

            <div class="detail-item">
                <span>Username</span>
                <strong>${event.username}</strong>
            </div>

            <div class="detail-item">
                <span>Event Type</span>
                <strong>${event.type}</strong>
            </div>

        </div>


        <div class="raw-event">

            <div class="raw-event-header">
                Raw Event Data
            </div>

            <pre>${JSON.stringify(event, null, 2)}</pre>

        </div>

    `;


    drawer.classList.add("open");

}


/* =====================================================
   CLOSE DRAWER
===================================================== */

function closeDrawer() {

    drawer.classList.remove("open");

}


drawerClose.addEventListener(
    "click",
    closeDrawer
);


/* =====================================================
   SEARCH + FILTERS
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


/* =====================================================
   TIME FILTER
===================================================== */

timeFilter.addEventListener(
    "change",
    () => {

        /*
            Dummy data currently uses the same date.
            The actual time-range filtering will be
            implemented when events come from SQLite.
        */

        filterEvents();

    }
);


/* =====================================================
   RESET
===================================================== */

resetBtn.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        typeFilter.value = "";

        severityFilter.value = "";

        agentFilter.value = "";

        timeFilter.value = "";

        filteredEvents = [...events];

        currentPage = 1;

        selectedEvent = null;

        closeDrawer();

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

        const originalText =
            refreshBtn.textContent;

        refreshBtn.textContent = "↻ Refreshing...";


        setTimeout(() => {

            refreshBtn.disabled = false;

            refreshBtn.textContent = originalText;

            renderEvents();

        }, 500);

    }
);


/* =====================================================
   INITIAL LOAD
===================================================== */

renderEvents();