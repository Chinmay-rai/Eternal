/* =========================================================
   ETERNAL — DASHBOARD JAVASCRIPT
   ========================================================= */

/* =========================
   DATE
   ========================= */

   const dateElement = document.getElementById("current-date");

const today = new Date();

const formattedDate = today.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
});

dateElement.textContent = formattedDate;

/* =========================
   EVENTS OVER TIME
   ========================= */

const eventsCanvas = document.getElementById("events-chart");

const eventLabels = [
    "00:00",
    "04:00",
    "08:00",
    "12:00",
    "16:00",
    "20:00",
    "24:00"
];

const eventData = [
    850,
    1200,
    980,
    2100,
    1750,
    3200,
    2480
];

const eventsChart = new Chart(eventsCanvas, {
    type: "line",

    data: {
        labels: eventLabels,

        datasets: [
            {
                label: "Events",

                data: eventData,

                borderColor: "#2563eb",

                backgroundColor: "rgba(37, 99, 235, 0.08)",

                borderWidth: 2,

                fill: true,

                tension: 0.35,

                pointRadius: 0,

                pointHoverRadius: 5
            }
        ]
    },

    options: {
        responsive: true,

        maintainAspectRatio: false,

        plugins: {
            legend: {
                display: false
            },

            tooltip: {
                mode: "index",
                intersect: false
            }
        },

        scales: {

            x: {
                grid: {
                    display: false
                },

                ticks: {
                    color: "#8a94a6",
                    font: {
                        size: 11
                    }
                }
            },

            y: {
                beginAtZero: true,

                border: {
                    display: false
                },

                grid: {
                    color: "#eef0f4"
                },

                ticks: {
                    color: "#8a94a6",
                    font: {
                        size: 11
                    }
                }
            }
        },

        interaction: {
            mode: "nearest",
            axis: "x",
            intersect: false
        }
    }
});


/* =========================
   ALERT SEVERITY
   ========================= */

const severityCanvas = document.getElementById("severity-chart");

const severityChart = new Chart(severityCanvas, {

    type: "doughnut",

    data: {

        labels: [
            "Critical",
            "High",
            "Medium",
            "Low"
        ],

        datasets: [
            {
                data: [
                    2,
                    6,
                    18,
                    11
                ],

                backgroundColor: [
                    "#ef4444",
                    "#f97316",
                    "#eab308",
                    "#60a5fa"
                ],

                borderWidth: 0,

                hoverOffset: 4
            }
        ]
    },

    options: {

        responsive: true,

        maintainAspectRatio: false,

        cutout: "72%",

        plugins: {

            legend: {
                display: false
            },

            tooltip: {
                callbacks: {
                    label: function (context) {

                        return `${context.label}: ${context.raw}`;
                    }
                }
            }
        }
    }
});


/* =========================
   EVENT RANGE SELECTOR
   ========================= */

const eventRange = document.getElementById("event-range");

eventRange.addEventListener("change", function () {

    const range = this.value;

    let labels;
    let data;


    if (range === "24h") {

        labels = [
            "00:00",
            "04:00",
            "08:00",
            "12:00",
            "16:00",
            "20:00",
            "24:00"
        ];

        data = [
            850,
            1200,
            980,
            2100,
            1750,
            3200,
            2480
        ];

    }


    else if (range === "7d") {

        labels = [
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
            "Sun"
        ];

        data = [
            6200,
            7100,
            5800,
            8400,
            7600,
            9100,
            8200
        ];

    }


    else if (range === "30d") {

        labels = [
            "Week 1",
            "Week 2",
            "Week 3",
            "Week 4"
        ];

        data = [
            28400,
            31900,
            29700,
            35200
        ];
    }


    eventsChart.data.labels = labels;
    eventsChart.data.datasets[0].data = data;

    eventsChart.update();

});


/* =========================
   CURRENT DATE & TIME
   ========================= */

function updateDateTime() {

    const dateElement = document.querySelector(".date");

    const now = new Date();

    const formattedDate = now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });

    dateElement.textContent = formattedDate;
}


updateDateTime();