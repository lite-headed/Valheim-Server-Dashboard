// Register the DataLabels plugin with Chart.js
Chart.register(ChartDataLabels);

/**
 * Variables for CPU, memory, and disk charts.
 */
let cpuChart, memoryChart, diskChart;

/**
 * Helper functions to get CSS variables from the document's root.
 * @returns {string} The value of the CSS variable.
 */
const errorColor = () => getComputedStyle(document.documentElement).getPropertyValue('--error-color');
const dataLabelFontSize = () => getComputedStyle(document.documentElement).getPropertyValue('--data-label-font-size');
const axisFontSize = () => getComputedStyle(document.documentElement).getPropertyValue('--axisFontSize');
const cardColor = () => getComputedStyle(document.documentElement).getPropertyValue('--card-color');
const textColor = () => getComputedStyle(document.documentElement).getPropertyValue('--text-color');

/**
 * Load server status and update the status card.
 * Fetches data from the server's status endpoint and updates the DOM.
 */
export async function loadStatus() {
    const statusCard = document.getElementById('statusCard');
    const lastUpdateElement = document.getElementById('last-update');
    statusCard.style.backgroundColor = `${cardColor()}`;

    try {
        const response = await fetch('status.json');
        const data = await response.json();
        const lastUpdate = new Date(data.last_status_update).toLocaleTimeString();

        if (data.error) {
            // Server startup or error state
            statusCard.innerHTML = `
                <p><b>Status:</b> Server is starting up...</p>
                <p>The server is not ready yet - please wait or check back later</p>
            `;
            statusCard.style.backgroundColor = `${errorColor()}`;
            return;
        }

        statusCard.innerHTML = `
            <p><b>Status:</b> Online</p>
            <p><b>Server Name:</b> ${data.server_name}</p>
            <p><b>Password Protected:</b> ${data.password_protected ? 'Yes' : 'No'}</p>
            <p><b>Server Port:</b> ${data.port}</p>
            <p><b>Steam ID:</b> ${data.steam_id}</p>
        `;

        // Trigger the fade-out effect for the current text
        lastUpdateElement.classList.add('last-update-fade-out');
        // Wait for the fade-out to complete (0.5s), then change the text and apply the fade-in
        setTimeout(() => {
            lastUpdateElement.textContent = `Last Update: ${lastUpdate}`;
            lastUpdateElement.classList.remove('last-update-fade-out');
            lastUpdateElement.classList.add('last-update-fade-in');
            setTimeout(() => lastUpdateElement.classList.remove('last-update-fade-in'), 600);
        }, 500);

    } catch (error) {
        console.error(error);
        statusCard.innerHTML = `
            <p><b>Status:</b> Error fetching server status</p>
            <p>Check the server logs for more information</p>
        `;
        statusCard.style.backgroundColor = `${errorColor()}`;
    }

}

/**
 * Convert UTC time to local time and return the time component.
 * @param {string} utcTime - The UTC time to convert.
 * @returns {string} The local time.
 */
function formatLocalTime(utcTime) {
    const date = new Date(`${utcTime} UTC`).toLocaleString();
    return date.split(',')[1].trim();  // Return only the time component
}

/**
 * Calculate the duration a player has been connected based on connection time.
 * @param {string} connectionTime - The player's connection time in UTC.
 * @returns {string} A formatted duration string.
 */
function calculateDuration(connectionTime) {
    const now = new Date();
    const connectedAt = new Date(`${connectionTime} UTC`);
    const durationMs = now - connectedAt;

    const hours = Math.floor(durationMs / 1000 / 60 / 60);
    const minutes = Math.floor((durationMs / 1000 / 60) % 60);
    const seconds = Math.floor((durationMs / 1000) % 60);

    const timeValues = [];
    if (hours > 0) timeValues.push(`${hours}h`);
    if (minutes > 0) timeValues.push(`${minutes}m`);
    if (seconds > 0) timeValues.push(`${seconds}s`);

    return timeValues.join(' ');
}

/**
 * Load player data and update the players card.
 * Fetches data from the server's player data endpoint and updates the DOM.
 */
export async function loadPlayers() {
    const playersCard = document.getElementById('playersCard');
    playersCard.style.backgroundColor = `${cardColor()}`;

    try {
        const response = await fetch('player_data.json');
        const players = await response.json();

        playersCard.innerHTML = '';

        if (Object.keys(players).length > 0) {
            for (const [name, info] of Object.entries(players)) {
                const localTime = formatLocalTime(info.connection_time);
                const duration = calculateDuration(info.connection_time);
                const deathText = info.death_count === 1 ? 'death' : 'deaths';

                playersCard.innerHTML += `
                    <div class="player-text">
                        <strong>${name}:</strong> ${localTime} (${duration}) ${info.death_count} ${deathText}
                    </div>
                `;
            }
        } else {
            playersCard.innerHTML = `<div class="player-text"><p>No Players Connected</p></div>`;
        }
    } catch (error) {
        console.error(error);
        playersCard.innerHTML = `
            <p><b>Error fetching player data</b></p>
            <p>Check the server logs for more information</p>
        `;
        playersCard.style.backgroundColor = `${errorColor()}`;
    }
}

/**
 * Load system metrics (CPU, memory, disk) and update corresponding charts.
 * Fetches data from the server's metrics endpoint and updates the charts.
 * In case of a fetch error, fallback data is used to update the charts,
 * and canvas elements are styled with an error class.
 */
export async function loadMetrics() {
    let data = {};
    let isFallbackData = false;
    try {
        const response = await fetch('metrics.json');
        data = await response.json();
    } catch (error) {
        console.error(error);
        data = getFallbackMetricsData();
        isFallbackData = true;
    }

    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => canvas.classList.toggle('error-canvas', isFallbackData));

    updateCpuChart(data.cpu);
    updateDiskChart(data.disk);
    updateMemoryChart(data.memory);
}

/**
 * Fallback metrics data in case of a fetch error.
 * @returns {Object} Fallback data structure for CPU, disk, and memory.
 */
function getFallbackMetricsData() {
    return {
        cpu: { per_core_percent: [0, 0] },
        disk: {
            unknown_1: { percent: 0, used_bytes: 0, total_bytes: 0 },
            unknown_2: { percent: 0, used_bytes: 0, total_bytes: 0 },
            unknown_3: { percent: 0, used_bytes: 0, total_bytes: 0 }
        },
        memory: { total_bytes: 0, used_bytes: 0 }
    };
}

/**
 * Tooltip plugin configuration for Chart.js charts.
 * @returns {Object} A configuration object for Chart.js tooltips.
 */
function getToolTipPlugin() {
    return {
        enabled: true,
        mode: 'nearest',
        padding: 10,
        bodyFont: { size: 16 },
        titleFont: { size: 18 }
    }
}

/**
 * Updates the CPU chart with the provided data.
 * @param {Object} cpuData - The data for CPU usage per core.
 */
function updateCpuChart(cpuData) {
    const cpuDataValues = [...cpuData.per_core_percent, 100];

    // Update or initialize CPU chart
    if (cpuChart) {
        const currentCpuValues = cpuChart.data.datasets[0].data.slice(0, -1);
        const hasChanged = cpuDataValues.some((value, i) => value !== currentCpuValues[i]);

        if (hasChanged) {
            cpuChart.data.datasets[0].data = [...cpuDataValues, 100];
            cpuChart.update();
        }
    } else {
        const chartData = {
            labels: cpuData.per_core_percent.map((_, i) => `Core ${i + 1}`),
            datasets: [
                {
                    label: 'CPU Usage (%)',
                    data: cpuDataValues,
                    backgroundColor: '#42a5f5',
                    borderColor: '#1e88e5',
                    borderWidth: 1,
                }
            ]
        };

        let cpuTooltipPlugin = getToolTipPlugin();
        cpuTooltipPlugin.callbacks = {
            label: (context) => {
                //const label = context.chart.data.labels[context.dataIndex];
                const value = context.parsed.x;
                if (value === 0) return '';

                return ` ${value}% Usage`;
            }
        };

        let barChartOptions = getBarChartOptions();
        barChartOptions.plugins.tooltip = cpuTooltipPlugin;

        cpuChart = new Chart(document.getElementById('cpuChart'), {
            type: 'bar',
            data: chartData,
            options: barChartOptions
        });
    }
}

/**
 * Updates the Disk chart with the provided data.
 * @param {Object} diskData - The data for disk usage.
 */
function updateDiskChart(diskData) {
    const diskDataValues = [...Object.keys(diskData).map(disk => diskData[disk].percent), 100];

    if (diskChart) {
        const currentDiskValues = diskChart.data.datasets[0].data.slice(0, -1);
        const hasChanged = diskDataValues.some((value, i) => value !== currentDiskValues[i]);

        if (hasChanged) {
            diskChart.data.datasets[0].data = [...diskDataValues, 100];
            diskChart.update();
        }
    } else {
        const diskLabels = Object.keys(diskData);
        const diskChartData = {
            labels: diskLabels,
            datasets: [
                {
                    label: 'Disk Usage (%)',
                    data: diskDataValues,
                    backgroundColor: '#ab47bc'
                }
            ]
        };

        let diskTooltipPlugin = getToolTipPlugin();
        diskTooltipPlugin.callbacks = {
            label: (context) => {
                // const label = context.chart.data.labels[context.dataIndex];
                const usedGB = context.parsed.x.toFixed(2);
                const index = context.dataIndex;

                const totalMemoryGB = (diskData[diskLabels[index]].total_bytes / (1024 ** 3)).toFixed(2);
                const percent = diskData[diskLabels[index]].percent.toFixed(2);

                return ` ${usedGB}GB of ${totalMemoryGB}GB (${percent}%)`;
            }
        };

        let barChartOptions = getBarChartOptions();
        barChartOptions.plugins.tooltip = diskTooltipPlugin;

        diskChart = new Chart(document.getElementById('diskChart'), {
            type: 'bar',
            data: diskChartData,
            options: barChartOptions
        });
    }
}

/**
 * Updates the Memory chart with the provided data.
 * @param {Object} memoryData - The data for memory usage.
 */
function updateMemoryChart(memoryData) {
    const totalMemoryGB = (memoryData.total_bytes / (1024 ** 3)).toFixed(2);
    const usedMemoryGB = (memoryData.used_bytes / (1024 ** 3)).toFixed(2);
    const memoryDataValues = [totalMemoryGB - usedMemoryGB, usedMemoryGB];

    if (memoryChart) {
        if (memoryChart.data.datasets[0].data[1] !== usedMemoryGB) {
            memoryChart.data.datasets[0].data = memoryDataValues;
            memoryChart.update();
        }
    } else {
        const memoryChartData = {
            labels: ['Available (GB)', 'Used (GB)'],
            datasets: [
                {
                    data: memoryDataValues,
                    backgroundColor: ['#32de84', 'rgb(255, 99, 132)'],
                    hoverOffset: -10,
                    borderColor: '#333'
                }
            ]
        };

        let memoryTooltipPlugin = getToolTipPlugin();
        memoryTooltipPlugin.callbacks = {
            label: (context) => {
                const label = context.chart.data.labels[context.dataIndex];
                const usedGB = context.parsed.toFixed(2);

                return ` ${usedGB}GB of ${totalMemoryGB}GB (${((context.parsed / totalMemoryGB) * 100).toFixed(2)}%)`;
            }
        }

        memoryChart = new Chart(document.getElementById('memoryChart'), {
            type: 'doughnut',
            data: memoryChartData,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: textColor(),
                            font: { size: axisFontSize() }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: 'white',
                        font: { size: dataLabelFontSize() },
                        formatter: (value, context) => {
                            const formattedValue = Math.round(value * 100) / 100;
                            const totalMemory = parseFloat(totalMemoryGB);
                            return `${formattedValue}GB\n(${((value / totalMemory) * 100).toFixed(2)}%)`;
                        }
                    },
                    tooltip: memoryTooltipPlugin,
                }
            }
        });
    }
}

/**
 * General chart options for bar charts (used by CPU and Disk).
 * @returns {Object} A configuration object for Chart.js.
 */
function getBarChartOptions() {
    return {
        indexAxis: 'y',
        responsive: true,
        scales: {
            x: {
                ticks: {
                    beginAtZero: true,
                    color: textColor(),
                    font: { size: axisFontSize() }
                }
            },
            y: {
                ticks: {
                    color: textColor(),
                    font: { size: axisFontSize() }
                }
            }
        },
        plugins: {
            legend: { display: false },
            datalabels: {
                display: true,
                color: 'white',
                font: { size: dataLabelFontSize() },
                formatter: (value) => {
                	if(value === 100 || value === 0) return '';

                	return value;
                }
            },
            tooltip: getToolTipPlugin(),
        }
    };
}

/**
 * Load status, player, and metrics data at a regular interval.
 */
export const load = () => {
    loadStatus();
    loadPlayers();
    loadMetrics();
};

document.addEventListener("DOMContentLoaded", () => {
    load();
    setInterval(load, 10000);  // Refresh data every 10 seconds
});
