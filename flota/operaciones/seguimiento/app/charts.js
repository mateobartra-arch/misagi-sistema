// ============================================================
// MISASI S.A.C. - Charts Configuration (Chart.js)
// ============================================================

// Chart.js global defaults
Chart.defaults.color = '#8b95a8';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyleWidth = 12;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.scale.grid.color = 'rgba(255,255,255,0.04)';
Chart.defaults.scale.border.color = 'rgba(255,255,255,0.06)';

const chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

// ==================== CHART 1: Dona de distribución de estados ====================
function renderDonutEstados(canvasId, metricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const data = {
        labels: ['Días en Ruta', 'Días Parados', 'Mantenimiento', 'Sin Asignar'],
        datasets: [{
            data: [
                metricas.totales.diasRuta,
                metricas.totales.diasParados,
                metricas.totales.diasMantenimiento,
                metricas.totales.diasSinAsignar,
            ],
            backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(249, 115, 22, 0.8)',
                'rgba(239, 68, 68, 0.8)',
                'rgba(107, 114, 128, 0.4)',
            ],
            borderColor: 'transparent',
            borderWidth: 0,
            hoverOffset: 8,
        }]
    };

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, font: { size: 11 } }
                },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function (context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((context.raw / total) * 100).toFixed(1);
                            return ` ${context.label}: ${context.raw} días (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ==================== CHART 2: Barras de vueltas por unidad ====================
function renderBarrasVueltas(canvasId, metricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = metricas.unidades.map(u => u.tracto.split(',')[0]);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'HUDBAY',
                    data: metricas.unidades.map(u => u.vueltasHudbay),
                    backgroundColor: 'rgba(41, 128, 185, 0.8)',
                    borderColor: 'rgba(41, 128, 185, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'SOUTHERN',
                    data: metricas.unidades.map(u => u.vueltasSouthern),
                    backgroundColor: 'rgba(39, 174, 96, 0.8)',
                    borderColor: 'rgba(39, 174, 96, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'HIERRO',
                    data: metricas.unidades.map(u => u.vueltasHierro),
                    backgroundColor: 'rgba(243, 156, 18, 0.8)',
                    borderColor: 'rgba(243, 156, 18, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    ticks: { stepSize: 1 },
                }
            },
            barPercentage: 0.8,
            maxBarThickness: 40
        }
    });
}

// ==================== CHART 3: Barras apiladas por tipo de día ====================
function renderBarrasApiladas(canvasId, metricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = metricas.unidades.map(u => u.tracto.split(',')[0]);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'En Ruta',
                    data: metricas.unidades.map(u => u.diasRuta),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderRadius: 2,
                },
                {
                    label: 'Parado (Sin Conductor)',
                    data: metricas.unidades.map(u => u.diasParados),
                    backgroundColor: 'rgba(249, 115, 22, 0.8)',
                    borderRadius: 2,
                },
                {
                    label: 'Mantenimiento/Taller',
                    data: metricas.unidades.map(u => u.diasMantenimiento),
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderRadius: 2,
                },
                {
                    label: 'Sin Asignar',
                    data: metricas.unidades.map(u => u.diasSinAsignar),
                    backgroundColor: 'rgba(107, 114, 128, 0.3)',
                    borderRadius: 2,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true, min: 0 }
            },
            barPercentage: 0.8
        }
    });
}

// ==================== CHART 4: Operatividad Gauge ====================
function renderOperatividad(canvasId, metricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = metricas.unidades.map(u => u.tracto.split(',')[0]);

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '% Operatividad',
                data: metricas.unidades.map(u => parseFloat(u.operatividad.toFixed(1))),
                backgroundColor: metricas.unidades.map(u => {
                    if (u.operatividad >= 80) return 'rgba(16, 185, 129, 0.8)';
                    if (u.operatividad >= 60) return 'rgba(245, 158, 11, 0.8)';
                    return 'rgba(239, 68, 68, 0.8)';
                }),
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: ctx => ` Operatividad: ${ctx.raw}%`
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { callback: v => v + '%' }
                }
            }
        }
    });
}

// ==================== CHART 5: Comparativa Mensual ====================
function renderComparativaMensual(canvasId, todasMetricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = todasMetricas.map(m => m.mes.substring(0, 3).toUpperCase());

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Vueltas',
                    data: todasMetricas.map(m => m.totales.totalVueltas),
                    backgroundColor: 'rgba(139, 92, 246, 0.8)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Días en Ruta',
                    data: todasMetricas.map(m => m.totales.diasRuta),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                },
                {
                    label: 'Días Parados',
                    data: todasMetricas.map(m => m.totales.diasParados),
                    backgroundColor: 'rgba(249, 115, 22, 0.6)',
                    borderColor: 'rgba(249, 115, 22, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==================== CHART 6: Línea de tendencia mensual ====================
function renderTendenciaMensual(canvasId, todasMetricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = todasMetricas.map(m => m.mes.substring(0, 3).toUpperCase());

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Vueltas HUDBAY',
                    data: todasMetricas.map(m => m.totales.vueltasHudbay),
                    borderColor: 'rgba(41, 128, 185, 1)',
                    backgroundColor: 'rgba(41, 128, 185, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(41, 128, 185, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Vueltas SOUTHERN',
                    data: todasMetricas.map(m => m.totales.vueltasSouthern),
                    borderColor: 'rgba(39, 174, 96, 1)',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(39, 174, 96, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                },
                {
                    label: 'Vueltas HIERRO',
                    data: todasMetricas.map(m => m.totales.vueltasHierro),
                    borderColor: 'rgba(243, 156, 18, 1)',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: 'rgba(243, 156, 18, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: '#1a2236',
                    titleColor: '#e8ecf4',
                    bodyColor: '#8b95a8',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 2 } }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// ==================== CHART 7: Radar por unidad ====================
function renderRadarUnidad(canvasId, metricas) {
    destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const colors = [
        'rgba(59, 130, 246, 0.7)',
        'rgba(16, 185, 129, 0.7)',
        'rgba(245, 158, 11, 0.7)',
        'rgba(239, 68, 68, 0.7)',
        'rgba(139, 92, 246, 0.7)',
        'rgba(6, 182, 212, 0.7)',
    ];

    const datasets = metricas.unidades.map((u, i) => ({
        label: u.tracto.split(',')[0],
        data: [u.vueltasHudbay, u.vueltasSouthern, u.vueltasHierro, u.operatividad / 10, u.totalVueltas],
        borderColor: colors[i],
        backgroundColor: colors[i].replace('0.7', '0.1'),
        pointBackgroundColor: colors[i],
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
    }));

    chartInstances[canvasId] = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Vueltas HUDBAY', 'Vueltas SOUTHERN', 'Vueltas HIERRO', 'Operatividad (x10)', 'Total Vueltas'],
            datasets: datasets,
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 10 } } },
            },
            scales: {
                r: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    angleLines: { color: 'rgba(255,255,255,0.05)' },
                    pointLabels: { font: { size: 10 }, color: '#8b95a8' },
                    ticks: { display: false },
                }
            }
        }
    });
}
