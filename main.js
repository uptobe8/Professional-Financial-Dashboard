// ==============================
// STATE MANAGEMENT
// ==============================
let transactions = [];
let charts = {
    main: null,
    category: null
};

// ==============================
// DOM ELEMENTS (con seguridad)
// ==============================
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

// ==============================
// INIT APP
// ==============================
document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('finanzly_data');
    if (savedData) {
        try {
            transactions = JSON.parse(savedData);
            updateDashboard();
        } catch (e) {
            console.error('Error parsing saved data', e);
            localStorage.removeItem('finanzly_data');
        }
    }
});

// ==============================
// CSV IMPORT
// ==============================
csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => processCSV(event.target.result);
    reader.readAsText(file, 'UTF-8');
});

function normalizeHeader(text) {
    return text
        .trim()
        .replace(/["]+/g, '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

function processCSV(csvText) {
    try {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 2) {
            alert('El CSV no contiene datos.');
            return;
        }

        const rawHeaders = lines[0].split(',');
        const headers = rawHeaders.map(normalizeHeader);

        const idx = {
            fecha: headers.findIndex(h => h === 'fecha'),
            tipo: headers.findIndex(h => h === 'tipo'),
            categoria: headers.findIndex(h => h === 'categoria'),
            cantidad: headers.findIndex(h => h === 'cantidad' || h === 'monto')
        };

        if (Object.values(idx).some(v => v === -1)) {
            console.error('Headers detectados:', headers);
            alert(
                'CSV inválido.\n' +
                'Debe contener al menos las columnas:\n' +
                'Fecha, Tipo, Categoría, Cantidad'
            );
            return;
        }

        const parsed = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/["]+/g, '').trim());
            if (values.length < headers.length) continue;

            const cantidad = parseFloat(values[idx.cantidad].replace(',', '.')) || 0;

            parsed.push({
                fecha: values[idx.fecha],
                tipo: values[idx.tipo],
                categoria: values[idx.categoria],
                cantidad
            });
        }

        transactions = parsed.filter(t => t.fecha && t.tipo && t.categoria);
        localStorage.setItem('finanzly_data', JSON.stringify(transactions));
        updateDashboard();

    } catch (err) {
        console.error('Error processing CSV', err);
        alert('Error al procesar el archivo CSV.');
    }
}

// ==============================
// DASHBOARD UPDATE
// ==============================
function updateDashboard() {
    calculateMetrics();
    renderAIInsights();
    renderCharts();
    renderTable();
    populateFilters();
    updateSimulator();
}

// ==============================
// METRICS
// ==============================
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

// ==============================
// AI INSIGHTS
// ==============================
function renderAIInsights() {
    if (!transactions.length) {
        aiInsightsEl.innerHTML = '<p>No hay datos suficientes.</p>';
        return;
    }

    const insights = [];
    const monthlyData = getMonthlyData();
    const months = Object.keys(monthlyData);

    if (months.length) {
        const bestMonth = months.reduce((a, b) =>
            (monthlyData[a].income - monthlyData[a].expenses) >
            (monthlyData[b].income - monthlyData[b].expenses) ? a : b
        );

        insights.push({
            title: 'Mejor Mes',
            desc: `Mejor resultado en ${bestMonth}`,
            icon: 'award'
        });
    }

    aiInsightsEl.innerHTML = insights.map(i => `
        <div class="insight-item fade-in">
            <i data-lucide="${i.icon}"></i>
            <div>
                <h4>${i.title}</h4>
                <p>${i.desc}</p>
            </div>
        </div>
    `).join('');

    lucide.createIcons();
}

// ==============================
// TABLE
// ==============================
function renderTable(filter = 'all') {
    const filtered = filter === 'all'
        ? transactions
        : transactions.filter(t => t.categoria === filter);

    tableBody.innerHTML = filtered.map(t => `
        <tr>
            <td>${t.fecha}</td>
            <td>${t.tipo}</td>
            <td>${t.categoria}</td>
            <td>${formatCurrency(t.cantidad)}</td>
        </tr>
    `).join('');
}

function populateFilters() {
    const categories = [...new Set(transactions.map(t => t.categoria))];
    categoryFilter.innerHTML =
        '<option value="all">Todas</option>' +
        categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

categoryFilter.addEventListener('change', e => renderTable(e.target.value));

// ==============================
// SIMULATOR
// ==============================
[incomeSlider, expenseSlider].forEach(slider => {
    slider.addEventListener('input', updateSimulator);
});

function updateSimulator() {
    const income = transactions.filter(t => t.tipo.toLowerCase().includes('ingreso'))
        .reduce((a, b) => a + b.cantidad, 0);

    const expenses = transactions.filter(t => t.tipo.toLowerCase().includes('gasto'))
        .reduce((a, b) => a + b.cantidad, 0);

    const simulated =
        income * (1 + incomeSlider.value / 100) -
        expenses * (1 - expenseSlider.value / 100);

    incomeSimVal.textContent = `+${incomeSlider.value}%`;
    expenseSimVal.textContent = `-${expenseSlider.value}%`;
    projectedProfitEl.textContent = formatCurrency(simulated);
}

// ==============================
// CHARTS
// ==============================
function renderCharts() {
    if (!transactions.length) return;

    const monthlyData = getMonthlyData();
    const labels = Object.keys(monthlyData);
    const incomes = labels.map(l => monthlyData[l].income);
    const expenses = labels.map(l => monthlyData[l].expenses);

    if (charts.main) charts.main.destroy();

    charts.main = new Chart(document.getElementById('mainChart'), {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'Ingresos', data: incomes },
                { label: 'Gastos', data: expenses }
            ]
        }
    });
}

// ==============================
// HELPERS
// ==============================
function getMonthlyData() {
    const data = {};
    transactions.forEach(t => {
        const d = new Date(t.fecha);
        if (isNaN(d)) return;
        const key = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
        if (!data[key]) data[key] = { income: 0, expenses: 0 };
        if (t.tipo.toLowerCase().includes('ingreso')) data[key].income += t.cantidad;
        else data[key].expenses += t.cantidad;
    });
    return data;
}

function formatCurrency(val) {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR'
    }).format(val);
}

// ==============================
// NAVIGATION (FUNCIONA)
// ==============================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
        e.preventDefault();
        const screen = item.dataset.screen;

        document.querySelectorAll('.nav-item')
            .forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.screen')
            .forEach(s => s.classList.remove('active'));

        item.classList.add('active');
        document.getElementById(`screen-${screen}`)?.classList.add('active');
    });
});
