/* =====================================================
   ETERNAL AGENTS
===================================================== */


/* =====================================================
   DUMMY AGENT DATA
===================================================== */

const agents = [

    {
        name: "Linux-VM-01",
        status: "Active",
        ip: "192.168.56.101",
        lastCommunication: "23:42:18",
        events: 248
    },

    {
        name: "Linux-VM-02",
        status: "Active",
        ip: "192.168.56.102",
        lastCommunication: "23:41:52",
        events: 183
    }
    

];


/* =====================================================
   STATE
===================================================== */

let filteredAgents = [...agents];

let selectedAgent = null;


/* =====================================================
   DOM ELEMENTS
===================================================== */

const tableBody =
    document.getElementById("agents-table-body");

const agentCount =
    document.getElementById("agent-count");

const searchInput =
    document.getElementById("agent-search");

const statusFilter =
    document.getElementById("status-filter");

const resetButton =
    document.getElementById("reset-filters");

const refreshButton =
    document.getElementById("refresh-agents");


/* Drawer */

const drawer =
    document.getElementById("agent-drawer");

const drawerClose =
    document.getElementById("drawer-close");

const drawerAgentName =
    document.getElementById("drawer-agent-name");

const drawerStatus =
    document.getElementById("drawer-status");

const drawerStatusDot =
    document.getElementById("drawer-status-dot");

const detailName =
    document.getElementById("detail-name");

const detailIP =
    document.getElementById("detail-ip");

const detailLastCommunication =
    document.getElementById(
        "detail-last-communication"
    );

const detailEvents =
    document.getElementById("detail-events");


/* =====================================================
   RENDER AGENTS
===================================================== */

function renderAgents() {

    tableBody.innerHTML = "";


    filteredAgents.forEach(agent => {

        const row =
            document.createElement("tr");

        row.classList.add("agent-row");


        if (
            selectedAgent &&
            selectedAgent.name === agent.name
        ) {
            row.classList.add("selected");
        }


        const statusClass =
            agent.status.toLowerCase();


        row.innerHTML = `

            <td>
                <span class="agent-name">
                    ${agent.name}
                </span>
            </td>

            <td>

                <span
                    class="agent-status-badge ${statusClass}">

                    <span class="status-dot"></span>

                    <span class="status-text">
                        ${agent.status}
                    </span>

                </span>

            </td>

            <td>
                ${agent.ip}
            </td>

            <td>
                ${agent.lastCommunication}
            </td>

            <td>

                <span class="event-count">
                    ${agent.events}
                </span>

            </td>

            <td class="agent-arrow">
                ›
            </td>

        `;


        row.addEventListener(
            "click",
            () => {

                selectedAgent = agent;

                renderAgents();

                openAgentDrawer(agent);

            }
        );


        tableBody.appendChild(row);

    });


    updateAgentCount();

}


/* =====================================================
   AGENT COUNT
===================================================== */

function updateAgentCount() {

    agentCount.textContent =
        `${filteredAgents.length} agents`;

}


/* =====================================================
   FILTERING
===================================================== */

function filterAgents() {

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const status =
        statusFilter.value;


    filteredAgents =
        agents.filter(agent => {

            const matchesSearch =
                !search ||
                agent.name
                    .toLowerCase()
                    .includes(search) ||
                agent.ip
                    .toLowerCase()
                    .includes(search);


            const matchesStatus =
                !status ||
                agent.status === status;


            return (
                matchesSearch &&
                matchesStatus
            );

        });


    selectedAgent = null;

    closeAgentDrawer();

    renderAgents();

}


/* =====================================================
   OPEN DRAWER
===================================================== */

function openAgentDrawer(agent) {

    drawerAgentName.textContent =
        agent.name;


    drawerStatus.textContent =
        agent.status;


    drawerStatusDot.className =
        "status-dot";


    if (agent.status === "Offline") {

        drawerStatusDot.classList.add(
            "offline"
        );

    }


    detailName.textContent =
        agent.name;


    detailIP.textContent =
        agent.ip;


    detailLastCommunication.textContent =
        agent.lastCommunication;


    detailEvents.textContent =
        agent.events;


    drawer.classList.add("open");

}


/* =====================================================
   CLOSE DRAWER
===================================================== */

function closeAgentDrawer() {

    drawer.classList.remove("open");

}


drawerClose.addEventListener(
    "click",
    () => {

        closeAgentDrawer();

        selectedAgent = null;

        renderAgents();

    }
);


/* =====================================================
   SEARCH + FILTER
===================================================== */

searchInput.addEventListener(
    "input",
    filterAgents
);


statusFilter.addEventListener(
    "change",
    filterAgents
);


/* =====================================================
   RESET
===================================================== */

resetButton.addEventListener(
    "click",
    () => {

        searchInput.value = "";

        statusFilter.value = "";

        filteredAgents =
            [...agents];

        selectedAgent = null;

        closeAgentDrawer();

        renderAgents();

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

            renderAgents();

        }, 500);

    }
);


/* =====================================================
   INITIAL LOAD
===================================================== */

renderAgents();