// ===== STATE =====
let currentSolution = null;
let implementedSolutions = new Set();
let liveData = {
  voltageA: 238.4, voltageB: 241.8, voltageC: 236.1,
  currentA: 61.2, currentB: 78.6, currentC: 46.6,
  tempA: 62.1, tempB: 78.4, tempC: 58.9,
  pfA: 0.93, pfB: 0.88, pfC: 0.92,
  thdA: 3.2, thdB: 5.8, thdC: 2.9,
  freq: 50.01
};

// ===== CLOCK =====
function updateClock() {
  const now = new Date();
  document.getElementById('clockDisplay').textContent =
    now.toTimeString().slice(0,8);
}
setInterval(updateClock, 1000);
updateClock();

// ===== TABS =====
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

// ===== CHART DATA GENERATORS =====
function genTimeLabels(mode) {
  if (mode === 'daily') return ['00','02','04','06','08','10','12','14','16','18','20','22'].map(h => h+':00');
  if (mode === 'weekly') return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
}

function rnd(base, range, count) {
  return Array.from({length: count}, () => base + (Math.random()-0.5)*range);
}

// ===== CHARTS REGISTRY =====
const charts = {};

function mkChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, config);
  return charts[id];
}

const gridColor = 'rgba(15,42,61,0.8)';
const tickColor = '#3a6680';

function baseOpts(yLabel='') {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    plugins: {
      legend: { labels: { color: '#7eb8d4', font: { family: 'Share Tech Mono', size: 10 }, boxWidth: 12 } },
      tooltip: { backgroundColor: '#0a1520', borderColor: '#0f2a3d', borderWidth: 1, titleColor: '#00e5ff', bodyColor: '#7eb8d4' }
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Share Tech Mono', size: 9 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Share Tech Mono', size: 9 } }, title: { display: !!yLabel, text: yLabel, color: tickColor, font: { size: 9 } } }
    }
  };
}

// ===== INIT ALL CHARTS =====
function initCharts() {
  buildVCChart('daily');
  buildPieChart();
  buildPowerChart('daily');
  buildTempChart('daily');
  buildTHDChart();
  buildPhaseBarChart('daily');
  buildKvarChart('daily');
  buildKvaChart('daily');
  buildDemandChart('daily');
  buildEnergyPieChart();
  buildPfTrendChart('daily');
  buildHarmonicChart();
  buildUnbalChart('daily');
  buildFreqChart('daily');
  buildSagSwellChart();
  buildThermalPhaseChart('daily');
  buildAmbientTempChart('daily');
  buildThermalRiskChart();
  buildEquipTempChart();
  buildCoolingChart('daily');
  buildEnergyHistChart('weekly');
  buildFaultHistChart('monthly');
  buildPeakDemandChart('weekly');
  buildEffScoreChart('weekly');
  buildCostChart('monthly');
  buildAlertFreqChart('daily');
  buildAlertCatChart();
  buildLoadTable();
  buildSparklines();
  buildGauges();
}

function buildVCChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('vcChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A (V)', data: rnd(238,8,labels.length), borderColor: '#ff4d6d', backgroundColor: 'rgba(255,77,109,0.05)', tension: 0.4, pointRadius: 2, borderWidth: 1.5, yAxisID: 'yV' },
        { label: 'Phase B (V)', data: rnd(241,6,labels.length), borderColor: '#ffd60a', backgroundColor: 'rgba(255,214,10,0.05)', tension: 0.4, pointRadius: 2, borderWidth: 1.5, yAxisID: 'yV' },
        { label: 'Phase C (V)', data: rnd(236,7,labels.length), borderColor: '#4a9eff', backgroundColor: 'rgba(74,158,255,0.05)', tension: 0.4, pointRadius: 2, borderWidth: 1.5, yAxisID: 'yV' },
        { label: 'Current A (A)', data: rnd(61,20,labels.length), borderColor: 'rgba(255,77,109,0.4)', tension: 0.4, pointRadius: 2, borderWidth: 1, borderDash: [4,3], yAxisID: 'yI' },
        { label: 'Current B (A)', data: rnd(78,25,labels.length), borderColor: 'rgba(255,214,10,0.4)', tension: 0.4, pointRadius: 2, borderWidth: 1, borderDash: [4,3], yAxisID: 'yI' },
        { label: 'Current C (A)', data: rnd(46,18,labels.length), borderColor: 'rgba(74,158,255,0.4)', tension: 0.4, pointRadius: 2, borderWidth: 1, borderDash: [4,3], yAxisID: 'yI' },
      ]
    },
    options: { ...baseOpts(), scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { family: 'Share Tech Mono', size: 9 } } },
      yV: { position: 'left', grid: { color: gridColor }, ticks: { color: '#ff4d6d', font: { family: 'Share Tech Mono', size: 9 } }, title: { display: true, text: 'Volts', color: '#ff4d6d', font: { size: 9 } } },
      yI: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#4a9eff', font: { family: 'Share Tech Mono', size: 9 } }, title: { display: true, text: 'Amps', color: '#4a9eff', font: { size: 9 } } }
    } }
  });
}

function buildPieChart() {
  mkChart('pieChart', {
    type: 'doughnut',
    data: {
      labels: ['Phase A (L1)', 'Phase B (L2)', 'Phase C (L3)'],
      datasets: [{ data: [34.4, 41.4, 24.2], backgroundColor: ['rgba(255,77,109,0.8)', 'rgba(255,214,10,0.8)', 'rgba(74,158,255,0.8)'], borderColor: ['#ff4d6d','#ffd60a','#4a9eff'], borderWidth: 2, hoverOffset: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#7eb8d4', font: { family: 'Share Tech Mono', size: 9 }, boxWidth: 12 } }, tooltip: { backgroundColor: '#0a1520', borderColor: '#0f2a3d', borderWidth: 1, titleColor: '#00e5ff', bodyColor: '#7eb8d4' } }, cutout: '65%' }
  });
}

function buildPowerChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('powerChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Active (kW)', data: rnd(128,40,labels.length), backgroundColor: 'rgba(255,140,0,0.6)', borderColor: '#ff8c00', borderWidth: 1, borderRadius: 3 },
        { label: 'Reactive (kVAR)', data: rnd(55,15,labels.length), backgroundColor: 'rgba(74,158,255,0.4)', borderColor: '#4a9eff', borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { ...baseOpts('kW / kVAR'), plugins: { ...baseOpts().plugins } }
  });
}

function buildTempChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('tempChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A (°C)', data: rnd(62,8,labels.length), borderColor: '#ff4d6d', tension: 0.4, pointRadius: 2, borderWidth: 1.5, fill: false },
        { label: 'Phase B (°C)', data: rnd(76,6,labels.length), borderColor: '#ffd60a', tension: 0.4, pointRadius: 2, borderWidth: 1.5, fill: false },
        { label: 'Phase C (°C)', data: rnd(59,7,labels.length), borderColor: '#4a9eff', tension: 0.4, pointRadius: 2, borderWidth: 1.5, fill: false },
        { label: 'Limit (75°C)', data: Array(labels.length).fill(75), borderColor: 'rgba(255,45,85,0.4)', borderDash: [6,4], tension: 0, pointRadius: 0, borderWidth: 1 },
      ]
    },
    options: { ...baseOpts('°C') }
  });
}

function buildTHDChart() {
  mkChart('thdChart', {
    type: 'bar',
    data: {
      labels: ['Phase A', 'Phase B', 'Phase C'],
      datasets: [
        { label: 'THD (%)', data: [3.2, 5.8, 2.9], backgroundColor: ['rgba(255,77,109,0.6)','rgba(255,214,10,0.7)','rgba(74,158,255,0.6)'], borderColor: ['#ff4d6d','#ffd60a','#4a9eff'], borderWidth: 1.5, borderRadius: 4 },
        { label: 'IEEE 519 Limit', data: [5,5,5], backgroundColor: 'rgba(255,45,85,0.08)', borderColor: 'rgba(255,45,85,0.4)', borderWidth: 1, borderDash: [6,3] },
      ]
    },
    options: { ...baseOpts('%') }
  });
}

function buildPhaseBarChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('phaseBarChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Phase A (A)', data: rnd(61,20,labels.length), backgroundColor: 'rgba(255,77,109,0.5)', borderColor: '#ff4d6d', borderWidth: 1, borderRadius: 2 },
        { label: 'Phase B (A)', data: rnd(78,22,labels.length), backgroundColor: 'rgba(255,214,10,0.5)', borderColor: '#ffd60a', borderWidth: 1, borderRadius: 2 },
        { label: 'Phase C (A)', data: rnd(47,18,labels.length), backgroundColor: 'rgba(74,158,255,0.5)', borderColor: '#4a9eff', borderWidth: 1, borderRadius: 2 },
      ]
    },
    options: { ...baseOpts('Amps') }
  });
}

function buildKvarChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('kvarChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A', data: rnd(18,5,labels.length), borderColor: '#ff4d6d', tension: 0.4, fill: true, backgroundColor: 'rgba(255,77,109,0.05)', pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase B', data: rnd(25,6,labels.length), borderColor: '#ffd60a', tension: 0.4, fill: true, backgroundColor: 'rgba(255,214,10,0.05)', pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase C', data: rnd(12,4,labels.length), borderColor: '#4a9eff', tension: 0.4, fill: true, backgroundColor: 'rgba(74,158,255,0.05)', pointRadius: 2, borderWidth: 1.5 },
      ]
    },
    options: { ...baseOpts('kVAR') }
  });
}

function buildKvaChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('kvaChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A', data: rnd(52,10,labels.length), borderColor: '#ff4d6d', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase B', data: rnd(68,12,labels.length), borderColor: '#ffd60a', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase C', data: rnd(40,8,labels.length), borderColor: '#4a9eff', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      ]
    },
    options: { ...baseOpts('kVA') }
  });
}

function buildDemandChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('demandChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Demand (kW)', data: rnd(128,50,labels.length).map(v=>Math.max(0,v)), backgroundColor: 'rgba(0,229,255,0.3)', borderColor: '#00e5ff', borderWidth: 1, borderRadius: 3 },
        { label: 'Peak Demand', data: Array(labels.length).fill(180), borderColor: 'rgba(255,45,85,0.5)', borderDash: [5,4], type: 'line', pointRadius: 0 },
      ]
    },
    options: { ...baseOpts('kW') }
  });
}

function buildEnergyPieChart() {
  mkChart('energyPieChart', {
    type: 'pie',
    data: {
      labels: ['Motors', 'HVAC', 'Lighting', 'Compressors', 'Welding', 'Other'],
      datasets: [{ data: [32,22,12,18,8,8], backgroundColor: ['#ff4d6d','#ffd60a','#00e5ff','#4a9eff','#00ff9d','#ff8c00'].map(c=>c+'cc'), borderColor: '#080f18', borderWidth: 2, hoverOffset: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { color: '#7eb8d4', font: { family: 'Share Tech Mono', size: 9 }, boxWidth: 10 } } } }
  });
}

function buildPfTrendChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('pfTrendChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A', data: rnd(0.93,0.06,labels.length), borderColor: '#ff4d6d', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase B', data: rnd(0.88,0.08,labels.length), borderColor: '#ffd60a', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Phase C', data: rnd(0.92,0.05,labels.length), borderColor: '#4a9eff', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Target (0.95)', data: Array(labels.length).fill(0.95), borderColor: 'rgba(0,255,157,0.4)', borderDash: [6,3], pointRadius: 0 }
      ]
    },
    options: { ...baseOpts('PF') }
  });
}

function buildHarmonicChart() {
  const harmonics = ['1st','3rd','5th','7th','9th','11th','13th'];
  mkChart('harmonicChart', {
    type: 'bar',
    data: {
      labels: harmonics,
      datasets: [
        { label: 'Phase A', data: [100,2.1,1.8,0.9,0.5,0.3,0.2], backgroundColor: 'rgba(255,77,109,0.5)', borderColor: '#ff4d6d', borderWidth: 1, borderRadius: 2 },
        { label: 'Phase B', data: [100,3.8,3.2,1.6,0.9,0.7,0.4], backgroundColor: 'rgba(255,214,10,0.5)', borderColor: '#ffd60a', borderWidth: 1, borderRadius: 2 },
        { label: 'Phase C', data: [100,1.9,1.5,0.8,0.4,0.2,0.1], backgroundColor: 'rgba(74,158,255,0.5)', borderColor: '#4a9eff', borderWidth: 1, borderRadius: 2 },
      ]
    },
    options: { ...baseOpts('%') }
  });
}

function buildUnbalChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('unbalChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Voltage Unbalance (%)', data: rnd(1.2,0.5,labels.length), borderColor: '#ffd60a', tension: 0.4, pointRadius: 2, borderWidth: 1.5, fill: true, backgroundColor: 'rgba(255,214,10,0.05)' },
        { label: 'IEC Limit (2%)', data: Array(labels.length).fill(2), borderColor: 'rgba(255,45,85,0.4)', borderDash: [5,4], pointRadius: 0 }
      ]
    },
    options: { ...baseOpts('%') }
  });
}

function buildFreqChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('freqChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Frequency (Hz)', data: rnd(50,0.1,labels.length), borderColor: '#00e5ff', tension: 0.4, pointRadius: 2, borderWidth: 1.5, fill: true, backgroundColor: 'rgba(0,229,255,0.04)' },
        { label: '+0.5 Hz', data: Array(labels.length).fill(50.5), borderColor: 'rgba(255,140,0,0.3)', borderDash: [4,3], pointRadius: 0 },
        { label: '-0.5 Hz', data: Array(labels.length).fill(49.5), borderColor: 'rgba(255,140,0,0.3)', borderDash: [4,3], pointRadius: 0 },
      ]
    },
    options: { ...baseOpts('Hz') }
  });
}

function buildSagSwellChart() {
  mkChart('sagSwellChart', {
    type: 'bar',
    data: {
      labels: ['<1s','1-5s','5-30s','30s-1m','>1m'],
      datasets: [
        { label: 'Voltage Sags', data: [4,2,1,0,0], backgroundColor: 'rgba(255,45,85,0.5)', borderColor: '#ff2d55', borderWidth: 1, borderRadius: 3 },
        { label: 'Voltage Swells', data: [1,0,0,0,0], backgroundColor: 'rgba(255,214,10,0.5)', borderColor: '#ffd60a', borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { ...baseOpts('Events') }
  });
}

function buildThermalPhaseChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('thermalPhaseChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Phase A (°C)', data: rnd(62,8,labels.length), borderColor: '#ff4d6d', tension: 0.4, pointRadius: 2, fill: true, backgroundColor: 'rgba(255,77,109,0.05)' },
        { label: 'Phase B (°C)', data: rnd(76,6,labels.length), borderColor: '#ffd60a', tension: 0.4, pointRadius: 2, fill: true, backgroundColor: 'rgba(255,214,10,0.05)' },
        { label: 'Phase C (°C)', data: rnd(59,7,labels.length), borderColor: '#4a9eff', tension: 0.4, pointRadius: 2, fill: true, backgroundColor: 'rgba(74,158,255,0.05)' },
        { label: 'Critical (75°C)', data: Array(labels.length).fill(75), borderColor: 'rgba(255,45,85,0.5)', borderDash: [6,4], pointRadius: 0 }
      ]
    },
    options: { ...baseOpts('°C') }
  });
}

function buildAmbientTempChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('ambientTempChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Ambient (°C)', data: rnd(35,5,labels.length), borderColor: '#00ff9d', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
        { label: 'Load Avg (°C)', data: rnd(65,10,labels.length), borderColor: '#ff8c00', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      ]
    },
    options: { ...baseOpts('°C') }
  });
}

function buildThermalRiskChart() {
  mkChart('thermalRiskChart', {
    type: 'doughnut',
    data: {
      labels: ['Normal (<60°C)', 'Elevated (60-70°C)', 'Warning (70-75°C)', 'Critical (>75°C)'],
      datasets: [{ data: [12, 6, 3, 1], backgroundColor: ['rgba(0,255,157,0.7)','rgba(255,214,10,0.7)','rgba(255,140,0,0.7)','rgba(255,45,85,0.7)'], borderColor: '#080f18', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom', labels: { color: '#7eb8d4', font: { family: 'Share Tech Mono', size: 9 }, boxWidth: 10 } } }, cutout: '55%' }
  });
}

function buildEquipTempChart() {
  const equip = ['Motor-1','Motor-2','HVAC-A','HVAC-B','Comp-1','Weld-1','Trans-1','MCC-A','MCC-B'];
  mkChart('equipTempChart', {
    type: 'bar',
    data: {
      labels: equip,
      datasets: [{
        label: 'Temperature (°C)',
        data: [62,58,48,55,71,68,45,78,52],
        backgroundColor: [62,58,48,55,71,68,45,78,52].map(v => v>75 ? 'rgba(255,45,85,0.7)' : v>65 ? 'rgba(255,140,0,0.7)' : 'rgba(0,229,255,0.4)'),
        borderColor: [62,58,48,55,71,68,45,78,52].map(v => v>75 ? '#ff2d55' : v>65 ? '#ff8c00' : '#00e5ff'),
        borderWidth: 1, borderRadius: 3
      }]
    },
    options: { ...baseOpts('°C') }
  });
}

function buildCoolingChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('coolingChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Cooling Efficiency (%)', data: rnd(82,8,labels.length), borderColor: '#00e5ff', tension: 0.4, pointRadius: 2, fill: true, backgroundColor: 'rgba(0,229,255,0.05)' },
      ]
    },
    options: { ...baseOpts('%') }
  });
}

function buildEnergyHistChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('energyHistChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Consumption (kWh)', data: rnd(3200,800,labels.length).map(Math.abs), backgroundColor: 'rgba(0,229,255,0.3)', borderColor: '#00e5ff', borderWidth: 1, borderRadius: 3 },
        { label: 'Cost (₹×100)', data: rnd(2200,600,labels.length).map(Math.abs), backgroundColor: 'rgba(0,255,157,0.3)', borderColor: '#00ff9d', borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { ...baseOpts() }
  });
}

function buildFaultHistChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('faultHistChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Critical', data: rnd(1,1,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(255,45,85,0.6)', borderColor: '#ff2d55', borderWidth: 1, borderRadius: 2 },
        { label: 'Warning', data: rnd(3,2,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(255,140,0,0.6)', borderColor: '#ff8c00', borderWidth: 1, borderRadius: 2 },
        { label: 'Info', data: rnd(5,3,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(0,229,255,0.4)', borderColor: '#00e5ff', borderWidth: 1, borderRadius: 2 },
      ]
    },
    options: { ...baseOpts('Events'), scales: { ...baseOpts().scales, x: { ...baseOpts().scales.x, stacked: true }, y: { ...baseOpts().scales.y, stacked: true } } }
  });
}

function buildPeakDemandChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('peakDemandChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Peak Demand (kW)', data: rnd(155,30,labels.length), borderColor: '#ff8c00', tension: 0.4, pointRadius: 3, borderWidth: 2, fill: true, backgroundColor: 'rgba(255,140,0,0.05)' },
        { label: 'Avg Demand (kW)', data: rnd(128,20,labels.length), borderColor: '#00e5ff', tension: 0.4, pointRadius: 2, borderWidth: 1.5 },
      ]
    },
    options: { ...baseOpts('kW') }
  });
}

function buildEffScoreChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('effScoreChart', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Efficiency Score', data: rnd(88,6,labels.length), borderColor: '#00ff9d', tension: 0.4, pointRadius: 2, fill: true, backgroundColor: 'rgba(0,255,157,0.05)' },
      ]
    },
    options: { ...baseOpts('%') }
  });
}

function buildCostChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('costChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Energy Cost (₹K)', data: rnd(85,20,labels.length).map(Math.abs), backgroundColor: 'rgba(255,214,10,0.5)', borderColor: '#ffd60a', borderWidth: 1, borderRadius: 3 },
        { label: 'PF Penalty (₹K)', data: rnd(8,4,labels.length).map(Math.abs), backgroundColor: 'rgba(255,45,85,0.4)', borderColor: '#ff2d55', borderWidth: 1, borderRadius: 3 },
      ]
    },
    options: { ...baseOpts('₹K') }
  });
}

function buildAlertFreqChart(mode) {
  const labels = genTimeLabels(mode);
  mkChart('alertFreqChart', {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Critical', data: rnd(0.5,0.5,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(255,45,85,0.6)', borderColor: '#ff2d55', borderWidth: 1, borderRadius: 2 },
        { label: 'Warning', data: rnd(2,1.5,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(255,140,0,0.6)', borderColor: '#ff8c00', borderWidth: 1, borderRadius: 2 },
        { label: 'Info', data: rnd(3,2,labels.length).map(v=>Math.max(0,Math.round(v))), backgroundColor: 'rgba(0,229,255,0.4)', borderColor: '#00e5ff', borderWidth: 1, borderRadius: 2 },
      ]
    },
    options: { ...baseOpts('Count'), scales: { ...baseOpts().scales, x: { ...baseOpts().scales.x, stacked: true }, y: { ...baseOpts().scales.y, stacked: true } } }
  });
}

function buildAlertCatChart() {
  mkChart('alertCatChart', {
    type: 'doughnut',
    data: {
      labels: ['Thermal','Overload','PQ Issue','Imbalance','Fault','Other'],
      datasets: [{ data: [28,22,18,16,10,6], backgroundColor: ['#ff2d55','#ff8c00','#ffd60a','#4a9eff','#ff4d6d','#00e5ff'].map(c=>c+'aa'), borderColor: '#080f18', borderWidth: 2 }]
    },
    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'right', labels: { color: '#7eb8d4', font: { family: 'Share Tech Mono', size: 9 }, boxWidth: 10 } } }, cutout: '55%' }
  });
}

// ===== LOAD TABLE =====
const loads = [
  { id:'LD-001', name:'Induction Motor #1', phase:'A', v:238.4, i:22.4, p:5.2, t:62.1, pf:0.93, util:72 },
  { id:'LD-002', name:'Induction Motor #2', phase:'B', v:241.8, i:28.6, p:6.8, t:74.2, pf:0.89, util:88, warn:true },
  { id:'LD-003', name:'HVAC Unit A', phase:'A', v:238.4, i:18.6, p:4.3, t:48.5, pf:0.95, util:61 },
  { id:'LD-004', name:'HVAC Unit B', phase:'C', v:236.1, i:15.2, p:3.5, t:51.2, pf:0.92, util:55 },
  { id:'LD-005', name:'Air Compressor #1', phase:'B', v:241.8, i:21.8, p:5.1, t:71.8, pf:0.87, util:82, warn:true },
  { id:'LD-006', name:'Welding Station', phase:'B', v:241.8, i:12.4, p:2.9, t:68.1, pf:0.84, util:65 },
  { id:'LD-007', name:'CNC Machine', phase:'A', v:238.4, i:9.8, p:2.3, t:44.0, pf:0.94, util:48 },
  { id:'LD-008', name:'Conveyor Belt', phase:'C', v:236.1, i:18.2, p:4.2, t:55.3, pf:0.91, util:74 },
  { id:'LD-009', name:'Transformer MCC-A', phase:'B', v:241.8, i:9.8, p:2.3, t:78.4, pf:0.86, util:91, crit:true },
  { id:'LD-010', name:'Lighting Panel', phase:'C', v:236.1, i:8.2, p:1.9, t:32.1, pf:0.98, util:38 },
  { id:'LD-011', name:'Furnace Load', phase:'A', v:238.4, i:10.4, p:2.4, t:67.5, pf:0.91, util:79 },
  { id:'LD-012', name:'Pump Station', phase:'C', v:236.1, i:5.0, p:1.2, t:41.3, pf:0.93, util:43 },
];

function buildLoadTable() {
  const tbody = document.getElementById('loadTableBody');
  tbody.innerHTML = '';
  loads.forEach(l => {
    const statusColor = l.crit ? '#ff2d55' : l.warn ? '#ff8c00' : '#00ff9d';
    const statusLabel = l.crit ? 'CRITICAL' : l.warn ? 'WARNING' : 'NORMAL';
    const utilColor = l.util > 85 ? '#ff2d55' : l.util > 70 ? '#ffd60a' : '#00ff9d';
    const row = document.createElement('tr');
    if (l.crit) row.style.background = 'rgba(255,45,85,0.04)';
    else if (l.warn) row.style.background = 'rgba(255,140,0,0.03)';
    row.innerHTML = `
      <td style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text-dim)">${l.id}</td>
      <td class="load-name" style="color:var(--text-primary)">${l.name}</td>
      <td style="font-family:'Orbitron',sans-serif;font-size:11px;color:${l.phase==='A'?'#ff4d6d':l.phase==='B'?'#ffd60a':'#4a9eff'}">PH-${l.phase}</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px">${l.v}V</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${l.i>25?'#ff8c00':'inherit'}">${l.i}A</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px">${l.p}kW</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${l.t>75?'#ff2d55':l.t>65?'#ff8c00':'inherit'}">${l.t}°C</td>
      <td style="font-family:'Share Tech Mono',monospace;font-size:12px;color:${l.pf<0.9?'#ffd60a':'inherit'}">${l.pf}</td>
      <td>
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:${utilColor}">${l.util}%</div>
        <div class="bar-mini"><div class="bar-mini-fill" style="width:${l.util}%;background:${utilColor}"></div></div>
      </td>
      <td>
        <div class="load-status">
          <div class="load-dot" style="background:${statusColor};box-shadow:0 0 6px ${statusColor}"></div>
          <span style="font-family:'Share Tech Mono',monospace;font-size:10px;color:${statusColor}">${statusLabel}</span>
        </div>
      </td>
    `;
    if (l.crit || l.warn) { row.style.cursor = 'pointer'; row.onclick = () => openSolution(l.crit ? 'overtemp' : 'unbalance'); }
    tbody.appendChild(row);
  });
}

// ===== GAUGES =====
function buildGauges() {
  drawGauge('gaugeA', liveData.voltageA, 210, 260, '#ff4d6d', '#gaugeA-val', 'V');
  drawGauge('gaugeB', liveData.voltageB, 210, 260, '#ffd60a', '#gaugeB-val', 'V');
  drawGauge('gaugeC', liveData.voltageC, 210, 260, '#4a9eff', '#gaugeC-val', 'V');
}

function drawGauge(canvasId, value, min, max, color, valId, unit) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 140, h = canvas.height = 140;
  const cx = w/2, cy = h/2, r = 55;
  const startAngle = Math.PI * 0.75;
  const endAngle = Math.PI * 2.25;
  const percent = (value - min) / (max - min);
  const valueAngle = startAngle + percent * (endAngle - startAngle);
  ctx.clearRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = '#0f2a3d';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();
  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0, color + '88');
  grad.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, valueAngle);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r-14, 0, Math.PI*2);
  ctx.strokeStyle = '#0a1520';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let i=0;i<=10;i++) {
    const a = startAngle + (i/10)*(endAngle-startAngle);
    const inner = r - 18, outer = r - 12;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a)*inner, cy + Math.sin(a)*inner);
    ctx.lineTo(cx + Math.cos(a)*outer, cy + Math.sin(a)*outer);
    ctx.strokeStyle = '#1a3a50';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const glow = ctx.createRadialGradient(cx + Math.cos(valueAngle)*r, cy + Math.sin(valueAngle)*r, 0, cx + Math.cos(valueAngle)*r, cy + Math.sin(valueAngle)*r, 8);
  glow.addColorStop(0, color);
  glow.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(cx + Math.cos(valueAngle)*r, cy + Math.sin(valueAngle)*r, 5, 0, Math.PI*2);
  ctx.fillStyle = glow;
  ctx.fill();
  if (valId) document.querySelector(valId).textContent = value.toFixed(1) + unit;
}

// ===== SPARKLINES =====
function buildSparklines() {
  buildSpark('spark-voltage', Array.from({length:8}, ()=> 414+Math.random()*4), '#00e5ff');
  buildSpark('spark-current', Array.from({length:8}, ()=> 175+Math.random()*20), '#00ff9d');
  buildSpark('spark-power', Array.from({length:8}, ()=> 120+Math.random()*20), '#ff8c00');
  buildSpark('spark-pf', Array.from({length:8}, ()=> 0.88+Math.random()*0.08), '#ffd60a');
  buildSpark('spark-temp', Array.from({length:8}, ()=> 65+Math.random()*15), '#ff2d55');
  buildSpark('spark-bal', Array.from({length:8}, ()=> 90+Math.random()*8), '#4a9eff');
}

function buildSpark(id, data, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const min = Math.min(...data), max = Math.max(...data);
  el.innerHTML = data.map(v => {
    const h = Math.max(4, Math.round(((v-min)/(max-min+0.001))*20));
    return `<div class="spark-bar" style="height:${h}px;background:${color};flex:1"></div>`;
  }).join('');
}

// ===== TIME TAB SWITCHING =====
const timeBuilders = {
  vc: buildVCChart, power: buildPowerChart, temp: buildTempChart,
  phaseBar: buildPhaseBarChart, kvar: buildKvarChart, kva: buildKvaChart,
  demand: buildDemandChart, pfTrend: buildPfTrendChart, unbal: buildUnbalChart,
  freq: buildFreqChart, thermalPhase: buildThermalPhaseChart, ambientTemp: buildAmbientTempChart,
  cooling: buildCoolingChart, energyHist: buildEnergyHistChart, faultHist: buildFaultHistChart,
  peakDemand: buildPeakDemandChart, effScore: buildEffScoreChart, cost: buildCostChart,
  alertFreq: buildAlertFreqChart
};

function switchTime(chartKey, mode, btn) {
  const parent = btn.closest('.time-tabs');
  parent.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (timeBuilders[chartKey]) timeBuilders[chartKey](mode);
}

// ===== SOLUTIONS DATABASE =====
const solutions = {
  overtemp: {
    icon: '🌡️',
    title: 'PHASE B BUS BAR OVERTEMPERATURE',
    subtitle: 'Critical — Temperature 78.4°C detected on Phase B bus bar (Threshold: 75°C)',
    color: '#ff2d55',
    cause: `Phase B is carrying 41.4% of total system load (78.6A vs rated 70A), leading to I²R heating in the bus bar assembly. The elevated current combined with inadequate airflow around MCC-A panel and blocked cooling vents on Transformer Bus-B has caused thermal accumulation. Ambient temperature in panel room is also 38°C (above design 35°C). Continued operation risks insulation class degradation (Class F insulation rated to 155°C but derating applies above 70°C).`,
    steps: [
      { title: 'Immediate Load Shedding', desc: 'Migrate 15A from Phase B (LD-002 Induction Motor #2) to Phase A via Tie Switch TS-B2. This reduces Phase B current from 78.6A to ~63A.', badge: 'AUTOMATED' },
      { title: 'Activate Emergency Cooling', desc: 'Trigger Panel Cooling Fan CF-B1 and CF-B2 to maximum speed. Open louvres on MCC-A panel. Estimated temperature drop: 5°C within 10 minutes.', badge: 'AUTOMATED' },
      { title: 'Reduce Welding Station Load', desc: 'Send advisory to Welding Station operator (LD-006) to pause operations for 20 minutes. This removes 2.9kW from Phase B.', badge: 'MANUAL' },
      { title: 'Inspect Cooling Vents', desc: 'Dispatch maintenance to physically inspect and clear any blockage on Transformer Bus-B cooling vents. Check thermal imaging for hotspots.', badge: 'MANUAL' },
      { title: 'Enable Capacitor Bank', desc: 'Engage capacitor bank CB-2 (25 kVAR) to reduce reactive current on Phase B, lowering I²R losses and reducing temperature.', badge: 'AUTOMATED' },
    ],
    metrics: [
      { val: '−9.4°C', lbl: 'TEMPERATURE REDUCTION' },
      { val: '−15.4A', lbl: 'CURRENT REDUCTION' },
      { val: '< 5 min', lbl: 'RESPONSE TIME' },
    ]
  },
  unbalance: {
    icon: '⚡',
    title: 'THREE-PHASE LOAD IMBALANCE',
    subtitle: 'Warning — Phase B at 41.4%, Phase C at 24.2% (IEC 60034-26 limit: ±5%)',
    color: '#ff8c00',
    cause: `Significant load imbalance exists: Phase A carries 34.4% (61.2A), Phase B carries 41.4% (78.6A), and Phase C carries only 24.2% (46.6A). This 17.2% spread between phases exceeds the IEC 60034-26 recommended maximum of 10%. Root cause: Recent addition of Air Compressor #1 (LD-005, 21.8A) and welding equipment to Phase B without load rebalancing. Imbalance causes negative sequence currents in motors, increasing rotor heating by up to 6× and reducing motor lifespan. Neutral conductor also experiences elevated current.`,
    steps: [
      { title: 'Migrate Compressor Load', desc: 'Reroute Air Compressor #1 (LD-005, 21.8A) from Phase B to Phase C via automatic transfer switch ATS-C1. This equalizes current distribution significantly.', badge: 'AUTOMATED' },
      { title: 'Transfer HVAC Unit', desc: 'Move HVAC Unit B (LD-004, 15.2A) from Phase C to Phase B via switching. New distribution: A=61.2A, B=57.2A, C=61.4A — within 3% balance.', badge: 'AUTOMATED' },
      { title: 'Enable Auto Load Balancer', desc: 'Activate intelligent load redistribution algorithm (ILB-V2) which continuously monitors and balances loads within ±2% using high-speed contactors.', badge: 'AUTOMATED' },
      { title: 'Update Load Schedule', desc: 'Revise load schedule in SCADA to prevent heavy loads from clustering on single phase during next shift startup sequence.', badge: 'MANUAL' },
    ],
    metrics: [
      { val: '< 3%', lbl: 'NEW IMBALANCE' },
      { val: '−4.6°C', lbl: 'MOTOR TEMP REDUCTION' },
      { val: '+2.1%', lbl: 'EFFICIENCY GAIN' },
    ]
  },
  pf: {
    icon: '📊',
    title: 'LOW POWER FACTOR CORRECTION',
    subtitle: 'Warning — System PF 0.91 lagging (Target: ≥ 0.95)',
    color: '#ffd60a',
    cause: `System power factor has degraded to 0.91 lagging due to high reactive power demand (55.2 kVAR) from inductive loads including three induction motors, two HVAC units, and one air compressor. Reactive current is 43.1A (out of 186.4A total), representing 23.1% wasted current capacity. This results in higher cable losses (I²R), reduced transformer capacity, and potential utility penalty charges. Phase B is the primary contributor with PF of 0.88 due to the Air Compressor at 0.84 PF.`,
    steps: [
      { title: 'Connect Capacitor Bank CB-1', desc: 'Switch in capacitor bank CB-1 (15 kVAR) at MCC-A busbar. This will correct approximately 15 kVAR, improving PF from 0.91 to ~0.94.', badge: 'AUTOMATED' },
      { title: 'Connect Capacitor Bank CB-2', desc: 'If CB-1 alone is insufficient, stage in CB-2 (10 kVAR) for combined 25 kVAR correction. Target PF will reach 0.96–0.97.', badge: 'AUTOMATED' },
      { title: 'Install Phase B Compensation', desc: 'Install dedicated 8 kVAR capacitor unit at Air Compressor #1 terminals for point-of-load correction. Phase B PF will improve from 0.84 to 0.93.', badge: 'MANUAL' },
      { title: 'Configure Automatic PF Controller', desc: 'Enable APFC relay APFC-01 to automatically switch capacitor stages to maintain PF between 0.95 and 0.99 lagging continuously.', badge: 'AUTOMATED' },
    ],
    metrics: [
      { val: '0.97', lbl: 'NEW POWER FACTOR' },
      { val: '−18 kVAR', lbl: 'REACTIVE REDUCTION' },
      { val: '₹12K/mo', lbl: 'PENALTY SAVINGS' },
    ]
  },
  harmonic: {
    icon: '∿',
    title: 'HARMONIC DISTORTION MITIGATION',
    subtitle: 'Info — Phase B THD 5.8% (IEEE 519 limit: 5.0%)',
    color: '#00e5ff',
    cause: `Total Harmonic Distortion on Phase B has exceeded IEEE 519-2014 limits at the Point of Common Coupling (PCC). THD = 5.8% vs 5.0% allowable limit. Primary harmonic sources: Variable frequency drives (VFDs) on induction motors generating 5th and 7th order harmonics; welding equipment generating 3rd order harmonics. High THD increases RMS current, causing additional heating in motors, transformers, and neutral conductors. Power measurement accuracy is also compromised by harmonic content.`,
    steps: [
      { title: 'Enable 5th/7th Harmonic Filter', desc: 'Switch in passive harmonic filter HF-B1 (tuned to 250 Hz and 350 Hz) at Phase B MCC bus. Estimated reduction: 60% of 5th and 7th harmonics.', badge: 'AUTOMATED' },
      { title: 'Configure VFD Input Chokes', desc: 'Enable 3% impedance AC line reactors on VFD-1 and VFD-2 inputs. This reduces THD contribution from each drive by 30-40%.', badge: 'MANUAL' },
      { title: 'Activate Active Filter AFE-1', desc: 'Enable Active Front End converter AFE-1 on Phase B which injects compensating harmonic currents in real-time, reducing THD to below 3%.', badge: 'AUTOMATED' },
      { title: 'Schedule Transformer De-rating Review', desc: 'Update transformer TS-B loading to account for harmonic K-factor. Ensure transformer K-factor rating (K-13) is not exceeded under new load conditions.', badge: 'MANUAL' },
    ],
    metrics: [
      { val: '2.8%', lbl: 'NEW THD' },
      { val: '−3°C', lbl: 'TRANSFORMER TEMP' },
      { val: 'PASS', lbl: 'IEEE 519 COMPLIANCE' },
    ]
  }
};

// ===== SOLUTION MODAL =====
function openSolution(key) {
  currentSolution = key;
  const s = solutions[key];
  if (!s) return;
  document.getElementById('sol-icon').textContent = s.icon;
  document.getElementById('sol-title').textContent = s.title;
  document.getElementById('sol-subtitle').textContent = s.subtitle;
  document.getElementById('sol-subtitle').style.color = s.color;
  document.getElementById('sol-cause').textContent = s.cause;
  document.querySelector('.solution-modal').style.borderColor = s.color;
  document.querySelector('.solution-modal').style.boxShadow = `0 0 60px ${s.color}44`;
  const stepsEl = document.getElementById('sol-steps');
  const implemented = implementedSolutions.has(key);
  stepsEl.innerHTML = s.steps.map((st, i) => `
    <div class="solution-step ${implemented ? 'done' : (i===0?'active-step':'')}">
      <div class="step-num">${implemented ? '✓' : (i+1)}</div>
      <div class="step-content">
        <div class="step-title">${st.title}</div>
        <div class="step-desc">${st.desc}</div>
        <div class="step-badge ${implemented ? 'done' : (st.badge==='AUTOMATED'?'pending':'warn')}">${implemented ? '✓ COMPLETED' : st.badge}</div>
      </div>
    </div>
  `).join('');
  const metricsEl = document.getElementById('sol-metrics');
  metricsEl.innerHTML = s.metrics.map(m => `
    <div class="sol-metric">
      <div class="sol-metric-val">${m.val}</div>
      <div class="sol-metric-lbl">${m.lbl}</div>
    </div>
  `).join('');
  const btn = document.getElementById('implementBtn');
  if (implemented) {
    btn.textContent = '✓ SOLUTION IMPLEMENTED';
    btn.classList.add('done');
    btn.disabled = true;
  } else {
    btn.textContent = '⚡ IMPLEMENT SOLUTION NOW';
    btn.classList.remove('done');
    btn.disabled = false;
  }
  document.getElementById('solutionOverlay').classList.add('active');
}

function closeSolution() {
  document.getElementById('solutionOverlay').classList.remove('active');
}

function closeSolutionOutside(e) {
  if (e.target === document.getElementById('solutionOverlay')) closeSolution();
}

function implementSolution() {
  if (!currentSolution) return;
  implementedSolutions.add(currentSolution);
  const btn = document.getElementById('implementBtn');
  btn.textContent = '⏳ IMPLEMENTING...';
  btn.disabled = true;
  let step = 0;
  const steps = document.querySelectorAll('.solution-step');
  function animateStep() {
    if (step < steps.length) {
      if (step > 0) steps[step-1].classList.remove('active-step');
      steps[step].classList.add('done');
      steps[step].querySelector('.step-num').textContent = '✓';
      const badge = steps[step].querySelector('.step-badge');
      badge.className = 'step-badge done';
      badge.textContent = '✓ COMPLETED';
      step++;
      if (step < steps.length) steps[step].classList.add('active-step');
      setTimeout(animateStep, 700);
    } else {
      btn.textContent = '✓ SOLUTION IMPLEMENTED';
      btn.classList.add('done');
      applyRealTimeChanges(currentSolution);
      setTimeout(closeSolution, 1500);
      showToast('✅', `Solution implemented: ${solutions[currentSolution].title.slice(0,40)}...`);
    }
  }
  setTimeout(animateStep, 300);
}

function applyRealTimeChanges(key) {
  if (key === 'overtemp') {
    liveData.tempB = 69.1;
    liveData.currentB = 63.2;
    document.getElementById('kpi-temp').textContent = '69.1';
    document.getElementById('kpi-temp').className = 'kpi-value orange';
    document.getElementById('phaseB-cur').textContent = '63.2A';
    updateAlerts(key);
    buildTempChart('daily');
    drawGauge('gaugeB', 240.5, 210, 260, '#ffd60a', '#gaugeB-val', 'V');
    updateKPIs();
  }
  if (key === 'unbalance') {
    liveData.currentA = 63.5;
    liveData.currentB = 62.8;
    liveData.currentC = 63.1;
    document.getElementById('kpi-balance').textContent = '98.7';
    document.getElementById('kpi-current').textContent = '189.4';
    document.getElementById('phaseA-cur').textContent = '63.5A';
    document.getElementById('phaseB-cur').textContent = '62.8A';
    document.getElementById('phaseC-cur').textContent = '63.1A';
    buildPieChart();
    updateAlerts(key);
  }
  if (key === 'pf') {
    document.getElementById('kpi-pf').textContent = '0.97';
    document.getElementById('phaseA-pf').textContent = '0.97';
    document.getElementById('phaseB-pf').textContent = '0.96';
    document.getElementById('phaseC-pf').textContent = '0.97';
    buildPfTrendChart('daily');
    updateAlerts(key);
  }
  if (key === 'harmonic') {
    document.getElementById('phaseB-thd').textContent = '2.8%';
    buildTHDChart();
    updateAlerts(key);
  }
  buildSparklines();
}

function updateAlerts(solvedKey) {
  const alertMap = { overtemp: 0, unbalance: 1, pf: 2, harmonic: 3 };
  const alertItems = document.querySelectorAll('#alertsList .alert-item');
  if (alertItems[alertMap[solvedKey]]) {
    alertItems[alertMap[solvedKey]].style.opacity = '0.3';
    alertItems[alertMap[solvedKey]].style.borderLeftColor = '#00ff9d';
    const title = alertItems[alertMap[solvedKey]].querySelector('.alert-title');
    if (title) { title.textContent = '✓ ' + title.textContent.replace('⚠ ','').replace('⚡ ','').replace('ℹ ',''); title.style.color = '#00ff9d'; }
  }
  const remaining = document.querySelectorAll('#alertsList .alert-item:not([style*="0.3"])').length;
  document.getElementById('alertCountBadge').textContent = remaining;
  if (remaining === 0) {
    document.getElementById('alertDot').className = 'status-dot green';
    document.getElementById('alertStatusText').textContent = 'ALL CLEAR';
  }
}

function updateKPIs() {
  buildSparklines();
}

// ===== TOAST =====
function showToast(icon, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toastIcon').textContent = icon;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}

// ===== SERVER IP — CHANGE THIS TO YOUR PC's IP ADDRESS FROM STEP 7 =====
const SERVER_IP = '192.168.0.124';   // <-- your PC's IP address
const SERVER_URL = `http://${SERVER_IP}:3000`;

// ===== CONNECTION STATUS INDICATOR =====
let isConnected = false;

function setConnectionStatus(connected) {
  isConnected = connected;
  const dot  = document.getElementById('alertDot');
  const txt  = document.getElementById('alertStatusText');
  if (!connected) {
    dot.className = 'status-dot red';
    txt.textContent = 'SERVER OFFLINE';
  }
}

// ===== FETCH LIVE DATA FROM SERVER =====
async function fetchLiveData() {
  try {
    const response = await fetch(`${SERVER_URL}/api/live`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error('Bad response');
    const data = await response.json();

    // If server returned empty object (no ESP32 data yet), skip update
    if (!data || Object.keys(data).length === 0) {
      console.warn('Server reachable but no sensor data yet. Is ESP32 sending?');
      return;
    }

    // Mark as connected
    if (!isConnected) {
      isConnected = true;
      showToast('📡', 'Connected to SmartGrid server!');
    }

    // ── Update internal liveData object ──
    liveData.voltageA = data.voltageA || liveData.voltageA;
    liveData.voltageB = data.voltageB || liveData.voltageB;
    liveData.voltageC = data.voltageC || liveData.voltageC;
    liveData.currentA = data.currentA || liveData.currentA;
    liveData.currentB = data.currentB || liveData.currentB;
    liveData.currentC = data.currentC || liveData.currentC;
    liveData.tempA    = data.tempA    || liveData.tempA;
    liveData.tempB    = data.tempB    || liveData.tempB;
    liveData.tempC    = data.tempC    || liveData.tempC;

    // ── Update KPI Cards ──
    const lineVoltage = ((data.voltageA + data.voltageB + data.voltageC) / 3 * 1.732).toFixed(1);
    document.getElementById('kpi-voltage').textContent  = lineVoltage;
    document.getElementById('kpi-current').textContent  = (data.totalCurrent || (data.currentA + data.currentB + data.currentC)).toFixed(1);
    document.getElementById('kpi-power').textContent    = (data.totalPower   || (data.powerA + data.powerB + data.powerC)).toFixed(1);
    document.getElementById('kpi-pf').textContent       = (data.pfA && data.pfB && data.pfC ? ((data.pfA + data.pfB + data.pfC) / 3) : 0.91).toFixed(2);
    document.getElementById('kpi-balance').textContent  = (data.balance || 94.2).toFixed(1);

    const maxTemp = Math.max(data.tempA, data.tempB, data.tempC);
    if (!implementedSolutions.has('overtemp')) {
      document.getElementById('kpi-temp').textContent = maxTemp.toFixed(1);
    }

    // ── Update Phase Gauge Canvases ──
    drawGauge('gaugeA', data.voltageA, 210, 260, '#ff4d6d', '#gaugeA-val', 'V');
    drawGauge('gaugeB', data.voltageB, 210, 260, '#ffd60a', '#gaugeB-val', 'V');
    drawGauge('gaugeC', data.voltageC, 210, 260, '#4a9eff', '#gaugeC-val', 'V');

    // ── Update Phase Stat Panels ──
    document.getElementById('phaseA-cur').textContent = (data.currentA).toFixed(1) + 'A';
    document.getElementById('phaseB-cur').textContent = (data.currentB).toFixed(1) + 'A';
    document.getElementById('phaseC-cur').textContent = (data.currentC).toFixed(1) + 'A';
    document.getElementById('phaseA-pwr').textContent = (data.powerA || 0).toFixed(1) + 'kW';
    document.getElementById('phaseB-pwr').textContent = (data.powerB || 0).toFixed(1) + 'kW';
    document.getElementById('phaseC-pwr').textContent = (data.powerC || 0).toFixed(1) + 'kW';
    document.getElementById('phaseA-pf').textContent  = (data.pfA || 0).toFixed(2);
    document.getElementById('phaseB-pf').textContent  = (data.pfB || 0).toFixed(2);
    document.getElementById('phaseC-pf').textContent  = (data.pfC || 0).toFixed(2);
    if (data.thdA !== undefined) document.getElementById('phaseA-thd').textContent = data.thdA.toFixed(1) + '%';
    if (data.thdB !== undefined) document.getElementById('phaseB-thd').textContent = data.thdB.toFixed(1) + '%';
    if (data.thdC !== undefined) document.getElementById('phaseC-thd').textContent = data.thdC.toFixed(1) + '%';

    // ── Auto Alert Checking ──
    checkAlerts(data);

    // ── Refresh Sparklines ──
    buildSparklines();

  } catch (err) {
    console.error('Cannot reach server:', err.message);
    setConnectionStatus(false);
  }
}

// ===== AUTO ALERT CHECKER =====
function checkAlerts(data) {
  const maxTemp   = Math.max(data.tempA || 0, data.tempB || 0, data.tempC || 0);
  const totalI    = data.totalCurrent || (data.currentA + data.currentB + data.currentC);
  const maxI      = Math.max(data.currentA, data.currentB, data.currentC);
  const minI      = Math.min(data.currentA, data.currentB, data.currentC);
  const avgI      = totalI / 3;
  const imbalance = avgI > 0 ? ((maxI - minI) / avgI) * 100 : 0;
  const dot       = document.getElementById('alertDot');
  const txt       = document.getElementById('alertStatusText');
  const badge     = document.getElementById('alertCountBadge');

  let alertCount = 0;

  // Temperature alert
  if (maxTemp > 75 && !implementedSolutions.has('overtemp')) {
    dot.className = 'status-dot red';
    txt.textContent = 'CRITICAL TEMP';
    alertCount++;
  }

  // Imbalance alert
  if (imbalance > 10 && !implementedSolutions.has('unbalance')) {
    dot.className = 'status-dot orange';
    txt.textContent = 'LOAD IMBALANCE';
    alertCount++;
  }

  // PF alert
  const avgPF = ((data.pfA || 0) + (data.pfB || 0) + (data.pfC || 0)) / 3;
  if (avgPF > 0 && avgPF < 0.95 && !implementedSolutions.has('pf')) {
    alertCount++;
  }

  // All clear
  if (alertCount === 0) {
    dot.className = 'status-dot green';
    txt.textContent = 'ALL CLEAR';
  }

  if (badge) badge.textContent = alertCount;
}

// ===== INIT =====
window.addEventListener('load', () => {
  initCharts();

  // Try to connect to real server every 2 seconds
  setInterval(fetchLiveData, 2000);
  fetchLiveData(); // run immediately on load

  // Refresh sparklines every 5 seconds
  setInterval(buildSparklines, 5000);

  // Show server connection info in console
  console.log(`PhaseFlow connecting to: ${SERVER_URL}`);
  console.log('Open browser console (F12) to see live data logs.');
});

// ===== THEME TOGGLE =====
function toggleTheme() {
  const body  = document.body;
  const icon  = document.getElementById('themeIcon');
  const label = document.getElementById('themeLabel');

  body.classList.toggle('light-mode');

  const isLight = body.classList.contains('light-mode');

  // Update button icon and label
  icon.textContent  = isLight ? '🌙' : '☀';
  label.textContent = isLight ? 'DARK' : 'LIGHT';

  // Save preference so it remembers after page refresh
  localStorage.setItem('smartgrid-theme', isLight ? 'light' : 'dark');

  // Rebuild all charts with correct colors for new theme
  rebuildChartsForTheme(isLight);
}

function rebuildChartsForTheme(isLight) {
  const grid    = isLight ? 'rgba(203,213,225,0.8)' : 'rgba(15,42,61,0.8)';
  const tick    = isLight ? '#64748b' : '#3a6680';
  const legend  = isLight ? '#475569' : '#7eb8d4';
  const tipBg   = isLight ? '#ffffff' : '#0a1520';
  const tipBdr  = isLight ? '#cbd5e1' : '#0f2a3d';
  const tipTitle = isLight ? '#0284c7' : '#00e5ff';
  const tipBody  = isLight ? '#475569' : '#7eb8d4';

  // Update all registered Chart.js charts
  Object.values(Chart.instances).forEach(chart => {
    // Update grid and tick colors
    if (chart.options.scales) {
      Object.values(chart.options.scales).forEach(scale => {
        if (scale.grid)  scale.grid.color  = grid;
        if (scale.ticks) scale.ticks.color = tick;
        if (scale.title) scale.title.color = tick;
      });
    }
    // Update legend and tooltip colors
    if (chart.options.plugins) {
      if (chart.options.plugins.legend?.labels)
        chart.options.plugins.legend.labels.color = legend;
      if (chart.options.plugins.tooltip) {
        chart.options.plugins.tooltip.backgroundColor = tipBg;
        chart.options.plugins.tooltip.borderColor     = tipBdr;
        chart.options.plugins.tooltip.titleColor      = tipTitle;
        chart.options.plugins.tooltip.bodyColor       = tipBody;
      }
    }
    chart.update();
  });
}

// Apply saved theme on page load
(function applySavedTheme() {
  const saved = localStorage.getItem('smartgrid-theme');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    const icon  = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon)  icon.textContent  = '🌙';
    if (label) label.textContent = 'DARK';
  }
})();