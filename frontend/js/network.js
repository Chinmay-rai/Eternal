const startScanButton = document.getElementById("start-scan");
const targetInput = document.getElementById("target-ip");
const portRangeInput = document.getElementById("port-range");

const scanStatus = document.getElementById("scan-status");
const scanResultsBody = document.getElementById("scan-results-body");
const resultCount = document.getElementById("result-count");

function renderResults(results) {
    scanResultsBody.innerHTML = "";

    if (!results.length) {
        scanResultsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">No open TCP ports found</td>
            </tr>
        `;

        resultCount.textContent = "0 open ports";
        return;
    }

    results.forEach(result => {
        const row = document.createElement("tr");

        const portCell = document.createElement("td");
        portCell.textContent = result.port;

        const stateCell = document.createElement("td");
        stateCell.textContent = result.state;
        stateCell.className =
            result.state.toLowerCase() === "open"
                ? "port-open"
                : "port-closed";

        const serviceCell = document.createElement("td");
        serviceCell.textContent = result.service;

        row.append(portCell, stateCell, serviceCell);
        scanResultsBody.appendChild(row);
    });

    resultCount.textContent =
        `${results.length} open port${results.length !== 1 ? "s" : ""}`;
}

startScanButton.addEventListener("click", async () => {
    const target = targetInput.value.trim();
    const portRange = portRangeInput.value;

    if (!target) {
        scanStatus.textContent = "Enter a target IP address.";
        targetInput.focus();
        return;
    }

    startScanButton.disabled = true;
    startScanButton.textContent = "Scanning...";
    scanStatus.textContent = `Starting scan of ${target} (${portRange})...`;

    scanResultsBody.innerHTML = `
        <tr class="empty-row">
            <td colspan="3">Scan in progress...</td>
        </tr>
    `;
    resultCount.textContent = "Scanning...";

    try {
        const response = await fetch("/api/network/scan", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                target: target,
                port_range: portRange
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "The scan request was rejected."
            );
        }

        renderResults(data.results || []);

        scanStatus.textContent =
            `Scan completed for ${data.target}. Checked ${data.scanned_ports} TCP ports.`;

    } catch (error) {
        scanResultsBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">Scan could not be completed</td>
            </tr>
        `;

        resultCount.textContent = "Scan failed";
        scanStatus.textContent =
            error.message || "Could not connect to the scanning API.";

    } finally {
        startScanButton.disabled = false;
        startScanButton.textContent = "Start Scan";
    }
});