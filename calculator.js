const ENZYME_UNITS_STORAGE_KEY = 'enzymeUnitsKey';

const enzymeUnitsPerGramFatInput = document.getElementById('enzymeUnitsPerGramFat');
const foodItemsContainer = document.getElementById('foodItems');
const resultContainer = document.getElementById('resultContainer');
const resultOutput = document.getElementById('resultOutput');

const savedEnzymeUnitsPerGramFat = localStorage.getItem(ENZYME_UNITS_STORAGE_KEY);
if (savedEnzymeUnitsPerGramFat) {
    enzymeUnitsPerGramFatInput.value = savedEnzymeUnitsPerGramFat;
}

// add initial food item
addFoodItem();

function addFoodItem() {
    const foodItem = document.createElement('div');
    foodItem.className = 'row food-row';
    foodItem.innerHTML = `
        <div class="col-6 mb-3">
            <input type="number" inputmode="decimal" class="form-control grams-fat-per-100g-food" 
            aria-label="Gramm Fett in 100g">
        </div>
        <div class="col-6 mb-3">
            <input type="number" inputmode="decimal" class="form-control eaten-grams-food" 
            aria-label="gegessene Gramm Lebensmittel">
        </div>
    `;
    foodItemsContainer.appendChild(foodItem);
}

document.getElementById('addFoodBtn').addEventListener('click', addFoodItem);

document.getElementById('removeFoodBtn').addEventListener('click', () => {
    const foodItems = foodItemsContainer.querySelectorAll('.food-row');
    if (foodItems.length > 1) {
        foodItems[foodItems.length - 1].remove();
    }
});

document.getElementById('calculatorForm').addEventListener('submit', (event) => {
    event.preventDefault();
    // update enzyme units needed per gram fat in local storage
    localStorage.setItem(ENZYME_UNITS_STORAGE_KEY, enzymeUnitsPerGramFatInput.value);

    let totalFatGrams = 0;
    foodItemsContainer.querySelectorAll('.food-row').forEach((foodItem) => {
        const gramsFatPer100gFood = parseFloat(foodItem.querySelector('.grams-fat-per-100g-food').value) || 0;
        const eatenGramsFood = parseFloat(foodItem.querySelector('.eaten-grams-food').value) || 0;
        totalFatGrams += gramsFatPer100gFood / 100 * eatenGramsFood;
    });

    const enzymeUnitsPerGramFat = parseFloat(enzymeUnitsPerGramFatInput.value) || 0;
    const neededEnzymeUnits = enzymeUnitsPerGramFat * totalFatGrams;

    resultOutput.innerHTML = `
        Gesamtmenge Fett: ${totalFatGrams.toFixed(1)}g<br>
        Dafür erforderlichen Enzymeinheiten: ${neededEnzymeUnits.toFixed(1)}
    `;
    resultContainer.style.display = 'block';
});
