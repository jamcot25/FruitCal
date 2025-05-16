const unitToGrams = {
  g: 1, cup: 240, tbsp: 15, tsp: 5, oz: 28.35, ml: 1
};

function convertToGrams(amount, unit) {
  return (amount || 1) * (unitToGrams[unit] || 1);
}

function addEntry() {
  const food = document.getElementById('food').value;
  const amount = parseFloat(document.getElementById('servingAmount').value);
  const unit = document.getElementById('servingUnit').value;
  const calories = parseFloat(document.getElementById('calories').value);
  const protein = parseFloat(document.getElementById('protein').value);
  const carbs = parseFloat(document.getElementById('carbs').value);
  const fat = parseFloat(document.getElementById('fat').value);
  const sodium = parseFloat(document.getElementById('sodium').value);
  const meal = document.getElementById('meal').value;

  const entry = {
    food, amount, unit, calories, protein, carbs, fat, sodium, meal,
    timestamp: Date.now()
  };

  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  entries.push(entry);
  localStorage.setItem('entries', JSON.stringify(entries));

  renderEntries();
  calculateDailyTotals();
}

function fetchFoodFromBarcode(code) {
  const apiUrl = `https://world.openfoodfacts.org/api/v0/product/${code}.json`;
  fetch(apiUrl)
    .then(res => res.json())
    .then(data => {
      if (data.status !== 1) return alert("Product not found");
      const p = data.product;
      const n = p.nutriments;
      const amt = parseFloat(document.getElementById('servingAmount').value) || 1;
      const unit = document.getElementById('servingUnit').value;
      const servingSize = convertToGrams(amt, unit);

      document.getElementById('food').value = p.product_name || `Food (${code})`;
      document.getElementById('calories').value = (n['energy-kcal_100g'] || 0) * servingSize / 100;
      document.getElementById('protein').value = (n['proteins_100g'] || 0) * servingSize / 100;
      document.getElementById('carbs').value = (n['carbohydrates_100g'] || 0) * servingSize / 100;
      document.getElementById('fat').value = (n['fat_100g'] || 0) * servingSize / 100;
      document.getElementById('sodium').value = (n['sodium_100g'] || 0) * 1000 * servingSize / 100;
    });
}

function renderEntries() {
  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  const container = document.getElementById('entries');
  container.innerHTML = '';
  entries.slice().reverse().forEach(item => {
    const perc = calculateMacroPercents(item.calories, item.protein, item.carbs, item.fat);
    const div = document.createElement('div');
    div.innerHTML = `
      ${item.food} (${item.meal}, ${item.amount} ${item.unit}) – 
      ${item.calories} cal, ${item.protein}g P, ${item.carbs}g C, ${item.fat}g F, ${item.sodium}mg sodium
      <br/><small>Macros: ${perc.protein}% P / ${perc.carbs}% C / ${perc.fat}% F</small>
    `;
    container.appendChild(div);
  });
}

function calculateMacroPercents(cals, p, c, f) {
  const pCal = p * 4, cCal = c * 4, fCal = f * 9, total = pCal + cCal + fCal;
  return {
    protein: total ? Math.round((pCal / total) * 100) : 0,
    carbs: total ? Math.round((cCal / total) * 100) : 0,
    fat: total ? Math.round((fCal / total) * 100) : 0
  };
}

function calculateDailyTotals() {
  const entries = JSON.parse(localStorage.getItem('entries') || '[]');
  const today = new Date().toISOString().split('T')[0];
  const todayEntries = entries.filter(e => new Date(e.timestamp).toISOString().split('T')[0] === today);
  let cal = 0, p = 0, c = 0, f = 0;
  todayEntries.forEach(e => {
    cal += +e.calories; p += +e.protein; c += +e.carbs; f += +e.fat;
  });
  document.getElementById('totals').innerText = `Calories: ${cal} | Protein: ${p}g | Carbs: ${c}g | Fat: ${f}g`;
  updateMacroChart(p, c, f);
}

let macroChart;
function updateMacroChart(p, c, f) {
  const ctx = document.getElementById('macroChart').getContext('2d');
  const data = [p * 4, c * 4, f * 9];
  if (macroChart) {
    macroChart.data.datasets[0].data = data;
    macroChart.update();
    return;
  }
  macroChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{ data, backgroundColor: ['#4caf50', '#2196f3', '#ff9800'] }]
    }
  });
}

function saveWeight() {
  const w = parseFloat(document.getElementById('weightInput').value);
  if (!w) return alert("Enter weight");
  const weights = JSON.parse(localStorage.getItem('weights') || '[]');
  weights.push({ weight: w, date: new Date().toISOString() });
  localStorage.setItem('weights', JSON.stringify(weights));
  document.getElementById('weightInput').value = '';
  renderWeightChart();
}

function renderWeightChart() {
  const data = JSON.parse(localStorage.getItem('weights') || '[]');
  const dates = data.map(e => new Date(e.date).toLocaleDateString());
  const weights = data.map(e => e.weight);
  const ctx = document.getElementById('weightChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: dates,
      datasets: [{ label: 'Weight (lbs)', data: weights, borderColor: '#3f51b5', fill: false }]
    }
  });
}

function calculateBodyFat() {
  const weight = parseFloat(document.getElementById('weightInput').value);
  const height = parseFloat(document.getElementById('height').value);
  const waist = parseFloat(document.getElementById('waist').value);
  const neck = parseFloat(document.getElementById('neck').value);
  const hip = parseFloat(document.getElementById('hip').value);
  const sex = document.getElementById('sex').value;

  if (!weight || !height || !waist || !neck) {
    return alert("Please fill all required fields.");
  }

  const bmi = (weight / (height * height)) * 703;
  let bf = 0;

  if (sex === 'male') {
    bf = 86.010 * Math.log10(waist - neck) - 70.041 * Math.log10(height) + 36.76;
  } else {
    if (!hip) return alert("Hip required for females.");
    bf = 163.205 * Math.log10(waist + hip - neck) - 97.684 * Math.log10(height) - 78.387;
  }

  bf = Math.round(bf * 10) / 10;
  const lean = Math.round(weight * (1 - bf / 100));

  document.getElementById('bodyFatOutput').innerHTML = `
    <strong>BMI:</strong> ${bmi.toFixed(1)}<br/>
    <strong>Body Fat %:</strong> ${bf}%<br/>
    <strong>Lean Mass:</strong> ${lean} lbs
  `;
}

renderEntries();
calculateDailyTotals();
renderWeightChart();
