const startScanButton = document.getElementById("start-scan");
const targetInput = document.getElementById("target-ip");
const portRangeInput = document.getElementById("port-range");

const scanStatus = document.getElementById("scan-status");
const scanResultsBody = document.getElementById("scan-results-body");
const resultCount = document.getElementById("result-count");


// Dummy results for frontend testing
const dummyResults = [
    {
        port: 22,
        state: "Open",
        service: "SSH"
    },
    {
        port: 80,
        state: "Open",
        service: "HTTP"
    },
    {
        port: 443,
        state: "Open",
        service: "HTTPS"
    }
];


function renderResults(results) {

    scanResultsBody.innerHTML = "";

    if (results.length === 0) {

        scanResultsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    No open ports found
                </td>
            </tr>
        `;

        resultCount.textContent = "0 results";
        return;
    }


    results.forEach(result => {

        const row = document.createElement("tr");

        const stateClass =
            result.state.toLowerCase() === "open"
                ? "port-open"
                : "port-closed";

        row.innerHTML = `
            <td>${result.port}</td>
            <td class="${stateClass}">${result.state}</td>
            <td>${result.service}</td>
        `;

        scanResultsBody.appendChild(row);

    });

    resultCount.textContent =
        `${results.length} result${results.length !== 1 ? "s" : ""}`;
}


startScanButton.addEventListener("click", () => {

    const target = targetInput.value.trim();
    const portRange = portRangeInput.value.trim();


    if (!target || !portRange) {

        scanStatus.textContent =
            "Enter a target and port range.";

        return;
    }


    startScanButton.disabled = true;
    startScanButton.textContent = "Scanning...";

    scanStatus.textContent =
        `Scanning ${target} on ports ${portRange}...`;


    // Temporary frontend simulation
    setTimeout(() => {

        renderResults(dummyResults);

        scanStatus.textContent =
            `Scan completed for ${target}.`;

        startScanButton.disabled = false;
        startScanButton.textContent = "Start Scan";

    }, 1200);

});