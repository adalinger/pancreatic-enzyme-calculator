const ENZYME_UNITS_STORAGE_KEY = 'enzymeUnitsKey';

const form = document.getElementById('calculatorForm');
const enzymeUnitsPerGramFatInput = document.getElementById('enzymeUnitsPerGramFat');
const foodItemsContainer = document.getElementById('foodItems');
const neededEnzymeUnitsOutput = document.getElementById('neededEnzymeUnits');
const resultDetailsOutput = document.getElementById('resultDetails');
const infoDialog = document.getElementById('infoDialog');

const fatFormatter = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 1});
const unitsFormatter = new Intl.NumberFormat('de-DE', {maximumFractionDigits: 0});

/**
 * Parses a German or English formatted decimal number.
 * Dots in correctly grouped numbers like "2.000" or "1.234,5" are treated as thousands separators,
 * otherwise a single comma or dot is the decimal separator.
 * Returns null for empty input and NaN for invalid input.
 */
function parseDecimal(value) {
    let normalized = value.trim();
    if (normalized === '') {
        return null;
    }
    if (/^\d{1,3}(\.\d{3})+(,\d*)?$/.test(normalized)) {
        normalized = normalized.replaceAll('.', '');
    }
    normalized = normalized.replace(',', '.');
    return /^\d*\.?\d+$|^\d+\.$/.test(normalized) ? parseFloat(normalized) : NaN;
}

function calculateFatGrams(gramsFatPer100gFood, eatenGramsFood) {
    return gramsFatPer100gFood / 100 * eatenGramsFood;
}

/**
 * Returns an error message for the given value or null if it is valid.
 */
function validate(value, min, max, minExclusive) {
    if (value === null) {
        return 'Bitte ausfüllen.';
    }
    if (Number.isNaN(value)) {
        return 'Keine gültige Zahl.';
    }
    if (minExclusive ? value <= min : value < min) {
        return `Muss größer ${min} sein.`;
    }
    if (max !== undefined && value > max) {
        return `Höchstens ${max} g.`;
    }
    return null;
}

/**
 * Marks an input as invalid. Errors for empty inputs are only shown when showEmptyErrors is true.
 */
function showValidation(input, value, error, showEmptyErrors) {
    const showError = error !== null && (value !== null || showEmptyErrors);
    input.classList.toggle('is-invalid', showError);
    input.setAttribute('aria-invalid', String(showError));
    input.parentElement.querySelector('.invalid-feedback').textContent = showError ? error : '';
}

function getFoodRows() {
    return foodItemsContainer.querySelectorAll('.food-row');
}

function getAllInputs() {
    return [...form.querySelectorAll('input')];
}

/**
 * Updates the accessible labels of the food rows and the enter key hints after rows were added or removed.
 */
function updateFoodRows() {
    const foodRows = getFoodRows();
    form.classList.toggle('single-row', foodRows.length === 1);
    foodRows.forEach((foodItem, index) => {
        const number = index + 1;
        foodItem.querySelector('.grams-fat-per-100g-food').setAttribute('aria-label', `Lebensmittel ${number}: Gramm Fett pro 100 g`);
        foodItem.querySelector('.eaten-grams-food').setAttribute('aria-label', `Lebensmittel ${number}: gegessene Gramm`);
        foodItem.querySelector('.remove-food-btn').setAttribute('aria-label', `Lebensmittel ${number} entfernen`);
    });
    const inputs = getAllInputs();
    inputs.forEach((input, index) => input.setAttribute('enterkeyhint', index === inputs.length - 1 ? 'done' : 'next'));
}

function addFoodItem() {
    const foodItem = document.createElement('div');
    foodItem.className = 'd-flex gap-2 align-items-start mb-3 food-row';
    foodItem.innerHTML = `
        <div class="food-column">
            <input type="text" inputmode="decimal" autocomplete="off" class="form-control grams-fat-per-100g-food">
            <div class="invalid-feedback"></div>
        </div>
        <div class="food-column">
            <input type="text" inputmode="decimal" autocomplete="off" class="form-control eaten-grams-food">
            <div class="invalid-feedback"></div>
        </div>
        <button type="button" class="btn btn-outline-secondary remove-food-btn p-0">&times;</button>
    `;
    foodItemsContainer.appendChild(foodItem);
    updateFoodRows();
    return foodItem;
}

function removeFoodItem(foodItem) {
    const foodRows = [...getFoodRows()];
    if (foodRows.length === 1) {
        // keep the last row, but clear it
        foodItem.querySelectorAll('input').forEach((input) => input.value = '');
        foodItem.querySelector('input').focus();
    } else {
        const index = foodRows.indexOf(foodItem);
        foodItem.remove();
        const nextRow = foodRows[index + 1] ?? foodRows[index - 1];
        nextRow.querySelector('input').focus();
    }
    updateFoodRows();
    calculate(false);
}

function startNewMeal() {
    foodItemsContainer.innerHTML = '';
    addFoodItem().querySelector('input').focus();
    calculate(false);
}

function showResult(neededEnzymeUnits, details) {
    neededEnzymeUnitsOutput.textContent = neededEnzymeUnits ?? '–';
    resultDetailsOutput.textContent = details;
}

/**
 * Validates all inputs and calculates the result.
 * Errors for empty inputs are only shown when showEmptyErrors is true.
 */
function calculate(showEmptyErrors) {
    let isComplete = true;
    let hasInvalidInput = false;
    let hasFoodInput = false;
    let totalFatGrams = 0;

    const enzymeUnitsPerGramFat = parseDecimal(enzymeUnitsPerGramFatInput.value);
    const enzymeUnitsError = validate(enzymeUnitsPerGramFat, 0, undefined, true);
    showValidation(enzymeUnitsPerGramFatInput, enzymeUnitsPerGramFat, enzymeUnitsError, showEmptyErrors);
    if (enzymeUnitsError === null) {
        localStorage.setItem(ENZYME_UNITS_STORAGE_KEY, enzymeUnitsPerGramFatInput.value.trim());
    } else {
        isComplete = false;
        hasInvalidInput ||= enzymeUnitsPerGramFat !== null;
    }

    const foodRows = getFoodRows();
    foodRows.forEach((foodItem) => {
        const fatInput = foodItem.querySelector('.grams-fat-per-100g-food');
        const eatenInput = foodItem.querySelector('.eaten-grams-food');
        const gramsFatPer100gFood = parseDecimal(fatInput.value);
        const eatenGramsFood = parseDecimal(eatenInput.value);

        // a completely empty row is ignored unless it is the only one
        const isEmptyRow = gramsFatPer100gFood === null && eatenGramsFood === null;
        if (isEmptyRow && foodRows.length > 1) {
            showValidation(fatInput, null, null, false);
            showValidation(eatenInput, null, null, false);
            return;
        }
        hasFoodInput ||= !isEmptyRow;

        const fatError = validate(gramsFatPer100gFood, 0, 100);
        const eatenError = validate(eatenGramsFood, 0);
        showValidation(fatInput, gramsFatPer100gFood, fatError, showEmptyErrors);
        showValidation(eatenInput, eatenGramsFood, eatenError, showEmptyErrors);

        if (fatError === null && eatenError === null) {
            totalFatGrams += calculateFatGrams(gramsFatPer100gFood, eatenGramsFood);
        } else {
            isComplete = false;
            hasInvalidInput ||= (fatError !== null && gramsFatPer100gFood !== null)
                || (eatenError !== null && eatenGramsFood !== null);
        }
    });

    if (!hasFoodInput && showEmptyErrors) {
        const firstRowInputs = foodRows[0].querySelectorAll('input');
        firstRowInputs.forEach((input) => showValidation(input, null, 'Bitte ausfüllen.', true));
    }

    if (hasInvalidInput) {
        showResult(null, 'Bitte Eingaben prüfen.');
    } else if (!isComplete || !hasFoodInput) {
        showResult(null, 'Bitte alle Werte eingeben.');
    } else {
        const neededEnzymeUnits = Math.round(enzymeUnitsPerGramFat * totalFatGrams);
        showResult(unitsFormatter.format(neededEnzymeUnits), `für ${fatFormatter.format(totalFatGrams)} g Fett`);
    }
}

const savedEnzymeUnitsPerGramFat = localStorage.getItem(ENZYME_UNITS_STORAGE_KEY);
if (savedEnzymeUnitsPerGramFat) {
    enzymeUnitsPerGramFatInput.value = savedEnzymeUnitsPerGramFat;
}

// add initial food item
addFoodItem();

document.getElementById('addFoodBtn').addEventListener('click', () => {
    addFoodItem().querySelector('input').focus();
});

document.getElementById('newMealBtn').addEventListener('click', startNewMeal);

foodItemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('.remove-food-btn');
    if (removeButton) {
        removeFoodItem(removeButton.closest('.food-row'));
    }
});

form.addEventListener('input', () => calculate(false));

// the enter key moves to the next input, on the last input it submits the form
form.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) {
        return;
    }
    event.preventDefault();
    const inputs = getAllInputs();
    const nextInput = inputs[inputs.indexOf(event.target) + 1];
    if (nextInput) {
        nextInput.focus();
    } else {
        form.requestSubmit();
    }
});

form.addEventListener('submit', (event) => {
    event.preventDefault();
    calculate(true);
});

document.getElementById('openInfoBtn').addEventListener('click', () => infoDialog.showModal());
document.getElementById('closeInfoBtn').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (event) => {
    // close when clicking on the backdrop
    if (event.target === infoDialog) {
        infoDialog.close();
    }
});

calculate(false);
