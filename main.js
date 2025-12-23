// State Management
let transactions = [];
let charts = {
    main: null,
    category: null
};

// DOM Elements
const csvInput = document.getElementById('csv-upload');
const totalIncomeEl = document.getElementById('total-income');
const totalExpensesEl = document.getElementById('total-expenses');
const netProfitEl = document.getElementById('net-profit');
const profitMarginEl = document.getElementById('profit-margin');
const aiInsightsEl = document.getElementById('ai-insights');
const tableBody = document.querySelector('#transactions-table tbody');
const categoryFilter = document.getElementById('category-filter');
const incomeSlider = document.getElementById('income-slider');
const expenseSlider = document.getElementById('expense-slider');
const incomeSimVal = document.getElementById('income-sim-val');
const expenseSimVal = document.getElementById('expense-sim-val');
const projectedProfitEl = document.getElementById('projected-profit');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('finanzly_data');
    if (savedData) {
        try {
            transactions = JSON.parse(savedData);
            updateDashboard();
        } catch (e) {
            console.error("Error parsing saved data", e);
        }
    }
});

// CSV Import Logic
csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        processCSV(text);
    };
    reader.readAsText(file);
});

function processCSV(csvText) {
    try {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return;

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/["]+/g, ''));

        // Column Index Mapping
        const idx = {
            fecha: headers.findIndex(h => h.includes('fecha')),
            tipo: headers.findIndex(h => h.includes('tipo')),
            categoria: headers.findIndex(h => h.includes('categoría') || h.includes('categoria')),
            cantidad: headers.findIndex(h => h.includes('cantidad'))
        };

        if (idx.fecha === -1 || idx.tipo === -1 || idx.categoria === -1 || idx.cantidad === -1) {
            alert("El CSV debe tener las columnas: Fecha, Tipo, Categoría, Cantidad");
            return;
        }

        transactions = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/["]+/g, ''));
            return {
                fecha: values[idx.fecha],
                tipo: values[idx.tipo],
                categoria: values[idx.categoria],
                cantidad: parseFloat(values[idx.cantidad]) || 0
            };
        }).filter(t => t.fecha && t.tipo && t.categoria);

        localStorage.setItem('finanzly_data', JSON.stringify(transactions));
        updateDashboard();
    } catch (err) {
        console.error("Error processing CSV", err);
        alert("Error al procesar el archivo CSV.");
    }
}

// Analytics Logic
function updateDashboard() {
    calculateMetrics();
    renderAIInsights();
    renderCharts();
    renderTable();
    updateSimulator();
    populateFilters();
}

function calculateMetrics() {
    const income = transactions
        .filter(t => t.tipo.toLowerCase().includes('ingreso'))
        .reduce((sum, t) => sum + t.cantidad, 0);

    const expenses = transactions
        .filter(t => t.tipo.toLowerCase().includes('gasto'))
        .reduce((sum, t) => sum + t.cantidad, 0);

    const profit = income - expenses;
    const margin = income > 0 ? (profit / income) * 100 : 0;

    totalIncomeEl.textContent = formatCurrency(income);
    totalExpensesEl.textContent = formatCurrency(expenses);
    netProfitEl.textContent = formatCurrency(profit);
    profitMarginEl.textContent = `${margin.toFixed(1)}%`;
}

function renderAIInsights() {
    if (transactions.length === 0) return;

    const insights = [];

    // Monthly Data
    const monthlyData = getMonthlyData();
    const months = Object.keys(monthlyData);

    if (months.length > 0) {
        // Best Month
        const bestMonth = months.reduce((a, b) =>
            (monthlyData[a].income - monthlyData[a].expenses) > (monthlyData[b].income - monthlyData[b].expenses) ? a : b
        );
        insights.push({
            title: "Mejor Mes",
            desc: `Tu mejor mes fue ${bestMonth} con un beneficio de ${formatCurrency(monthlyData[bestMonth].income - monthlyData[bestMonth].expenses)}`,
            icon: 'award'
        });

        // Most Profitable Category
        const categoryStats = {};
        transactions.forEach(t => {
            if (t.tipo.toLowerCase().includes('ingreso')) {
                categoryStats[t.categoria] = (categoryStats[t.categoria] || 0) + t.cantidad;
            }
        });
        const catKeys = Object.keys(categoryStats);
        if (catKeys.length > 0) {
            const bestCat = catKeys.reduce((a, b) => categoryStats[a] > categoryStats[b] ? a : b);
            insights.push({
                title: "Categoría Estrella",
                desc: `La categoría con más ingresos es ${bestCat}`,
                icon: 'gem'
            });
        }

        // Ratio Gasto/Ingreso
        const totalInc = transactions.filter(t => t.tipo.toLowerCase().includes('ingreso')).reduce((a, b) => a + b.cantidad, 0);
        const totalExp = transactions.filter(t => t.tipo.toLowerCase().includes('gasto')).reduce((a, b) => a + b.cantidad, 0);
        const ratio = totalInc > 0 ? (totalExp / totalInc * 100).toFixed(1) : 0;
        insights.push({
            title: "Ratio Gasto/Ingreso",
            desc: `Tus gastos representan el ${ratio}% de tus ingresos.`,
            icon: 'pie-chart'
        });

        // ROI
        const roi = totalExp > 0 ? (totalInc / totalExp).toFixed(2) : 0;
        insights.push({
            title: "Retorno de Inversión",
            desc: `Por cada 1€ que gastas, generas ${roi}€.`,
            icon: 'trending-up'
        });
    }

    aiInsightsEl.innerHTML = insights.map(i => `
        <div class="insight-item fade-in">
            <i data-lucide="${i.icon}" style="color: var(--accent-blue);"></i>
            <div class="insight-content">
                <h4>${i.title}</h4>
                <p>${i.desc}</p>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

function renderTable(filter = 'all') {
    const filtered = filter === 'all'
        ? transactions
        : transactions.filter(t => t.categoria === filter);

    tableBody.innerHTML = filtered.map(t => `
        <tr>
            <td>${t.fecha}</td>
            <td><span class="badge ${t.tipo.toLowerCase().includes('ingreso') ? 'badge-income' : 'badge-expense'}">${t.tipo}</span></td>
            <td>${t.categoria}</td>
            <td style="color: ${t.tipo.toLowerCase().includes('ingreso') ? 'var(--accent-green)' : 'var(--accent-red)'}">
                ${t.tipo.toLowerCase().includes('ingreso') ? '+' : '-'}${formatCurrency(t.cantidad)}
            </td>
        </tr>
    `).join('');
}

function populateFilters() {
    const categories = [...new Set(transactions.map(t => t.categoria))];
    categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>' +
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

categoryFilter.addEventListener('change', (e) => renderTable(e.target.value));

// Simulation Logic
[incomeSlider, expenseSlider].forEach(slider => {
    slider.addEventListener('input', () => {
        incomeSimVal.textContent = `+${incomeSlider.value}%`;
        expenseSimVal.textContent = `-${expenseSlider.value}%`;
        updateSimulator();
    });
});

function updateSimulator() {
    const income = transactions.filter(t => t.tipo.toLowerCase().includes('ingreso')).reduce((a, b) => a + b.cantidad, 0);
    const expenses = transactions.filter(t => t.tipo.toLowerCase().includes('gasto')).reduce((a, b) => a + b.cantidad, 0);

    const simulatedIncome = income * (1 + (incomeSlider.value / 100));
    const simulatedExpenses = expenses * (1 - (expenseSlider.value / 100));
    const simulatedProfit = simulatedIncome - simulatedExpenses;

    projectedProfitEl.textContent = formatCurrency(simulatedProfit);
}

// Charts Logic
function renderCharts() {
    const monthlyData = getMonthlyData();
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
        const [ma, ya] = a.split(' ');
        const [mb, yb] = b.split(' ');
        return new Date(`${ma} 1, 20${ya}`) - new Date(`${mb} 1, 20${yb}`);
    });

    const labels = sortedMonths;
    const incomes = labels.map(l => monthlyData[l].income);
    const expenses = labels.map(l => monthlyData[l].expenses);
    const profits = labels.map(l => monthlyData[l].income - monthlyData[l].expenses);

    // Main Chart
    const ctx = document.getElementById('mainChart').getContext('2d');
    if (charts.main) charts.main.destroy();
    charts.main = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomes,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Gastos',
                    data: expenses,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Beneficio',
                    data: profits,
                    borderColor: '#3b82f6',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: chartOptions
    });

    // Category Chart
    const cats = {};
    transactions.filter(t => t.tipo.toLowerCase().includes('gasto')).forEach(t => {
        cats[t.categoria] = (cats[t.categoria] || 0) + t.cantidad;
    });

    const ctx2 = document.getElementById('categoryChart').getContext('2d');
    if (charts.category) charts.category.destroy();
    charts.category = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(cats),
            datasets: [{
                data: Object.values(cats),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { size: 10 } }
                }
            }
        }
    });
}

function getMonthlyData() {
    const monthly = {};
    transactions.forEach(t => {
        const date = new Date(t.fecha);
        if (isNaN(date)) return;

        const monthKey = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });

        if (!monthly[monthKey]) {
            monthly[monthKey] = { income: 0, expenses: 0 };
        }

        if (t.tipo.toLowerCase().includes('ingreso')) monthly[monthKey].income += t.cantidad;
        else monthly[monthKey].expenses += t.cantidad;
    });
    return monthly;
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(val);
}

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#94a3b8' }
        },
        x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
        }
    },
    plugins: {
        legend: {
            labels: { color: '#94a3b8' }
        }
    }
};

// Navigation between screens - Execute when page fully loads
window.addEventListener('load', () => {document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const screen = e.target.getAttribute('data-screen');
        
        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        // Add active to clicked nav item
        e.target.classList.add('active');
        
        // Hide all screens
        document.querySelectorAll('.screen').forEach(scr => scr.classList.remove('active'));
        // Show selected screen
        document.getElementById('screen-' + screen).classList.add('active');
    });
});
});
