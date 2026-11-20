// Brayden's frontend logic: recipe list + UPDATE (edit) recipe
// Everything here is prefixed "edit" / "Edit" so it can never clash with
// teammates' globals (all files in public/js share one global scope).

// Same units as the Create feature
const EDIT_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'];

let editRecipesCache = [];

// ---------- Messages ----------
function editShowMessage(containerId, text, isError) {
    const box = document.getElementById(containerId);
    box.className = 'alert ' + (isError ? 'alert-danger' : 'alert-success');
    box.textContent = text;
}

function editClearMessage(containerId) {
    const box = document.getElementById(containerId);
    box.className = '';
    box.textContent = '';
}

// ---------- Recipe list ----------
async function loadEditRecipeList() {
    try {
        const response = await fetch('/edit-recipes');
        const result = await response.json();
        if (!response.ok) {
            editShowMessage('editPageMessage', result.message, true);
            return;
        }
        editRecipesCache = result;
        renderEditRecipeList(result);
    } catch (error) {
        editShowMessage('editPageMessage', 'Could not load recipes. Please try again.', true);
    }
}

function renderEditRecipeList(recipes) {
    const tbody = document.getElementById('editRecipeList');
    tbody.innerHTML = '';

    if (recipes.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.textContent = 'No recipes yet.';
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    recipes.forEach((recipe) => {
        const row = document.createElement('tr');

        // textContent (not innerHTML) so recipe names can never inject HTML
        const nameCell = document.createElement('td');
        nameCell.textContent = recipe.name;
        if (recipe.locked === true) {
            const badge = document.createElement('span');
            badge.className = 'badge badge-secondary ml-2';
            badge.textContent = 'Locked';
            nameCell.appendChild(badge);
        }

        const servingsCell = document.createElement('td');
        servingsCell.textContent = recipe.servings;

        const ingredientsCell = document.createElement('td');
        ingredientsCell.textContent = Array.isArray(recipe.ingredients) ? recipe.ingredients.length : 0;

        const actionCell = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-sm btn-outline-primary';
        editButton.textContent = 'Edit';
        editButton.addEventListener('click', () => openEditModal(recipe.id));
        actionCell.appendChild(editButton);

        row.append(nameCell, servingsCell, ingredientsCell, actionCell);
        tbody.appendChild(row);
    });
}

// ---------- Edit modal ----------
function addEditIngredientRow(ingredient) {
    const data = ingredient || { name: '', quantity: '', unit: '' };

    const row = document.createElement('div');
    row.className = 'form-row mb-2 edit-ingredient-row';

    const nameCol = document.createElement('div');
    nameCol.className = 'col-5';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'form-control edit-ing-name';
    nameInput.placeholder = 'Ingredient';
    nameInput.value = data.name;
    nameCol.appendChild(nameInput);

    const qtyCol = document.createElement('div');
    qtyCol.className = 'col-3';
    const qtyInput = document.createElement('input');
    qtyInput.type = 'text';
    qtyInput.className = 'form-control edit-ing-qty';
    qtyInput.placeholder = 'Qty';
    qtyInput.value = data.quantity;
    qtyCol.appendChild(qtyInput);

    const unitCol = document.createElement('div');
    unitCol.className = 'col-3';
    const unitSelect = document.createElement('select');
    unitSelect.className = 'form-control edit-ing-unit';
    ['', ...EDIT_UNITS].forEach((unit) => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unit === '' ? 'Unit' : unit;
        unitSelect.appendChild(option);
    });
    unitSelect.value = EDIT_UNITS.includes(data.unit) ? data.unit : '';
    unitCol.appendChild(unitSelect);

    const removeCol = document.createElement('div');
    removeCol.className = 'col-1';
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn-outline-danger px-2';
    removeButton.textContent = '×';
    removeButton.addEventListener('click', () => row.remove());
    removeCol.appendChild(removeButton);

    row.append(nameCol, qtyCol, unitCol, removeCol);
    document.getElementById('editIngredientRows').appendChild(row);
}

function openEditModal(id) {
    const recipe = editRecipesCache.find((item) => String(item.id) === String(id));
    if (!recipe) {
        editShowMessage('editPageMessage', 'Recipe not found', true);
        return;
    }

    editClearMessage('editMessage');
    document.getElementById('editRecipeId').value = recipe.id;
    document.getElementById('editName').value = recipe.name || '';
    document.getElementById('editDescription').value = recipe.description || '';
    document.getElementById('editServings').value = recipe.servings;
    document.getElementById('editSteps').value = recipe.steps || '';
    document.getElementById('editImage').value = recipe.image || '';

    document.getElementById('editIngredientRows').innerHTML = '';
    if (Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach((ingredient) => addEditIngredientRow(ingredient));
    } else {
        addEditIngredientRow();
    }

    $('#editRecipeModal').modal('show');
}

function getEditFormValues() {
    const ingredients = Array.from(document.querySelectorAll('#editIngredientRows .edit-ingredient-row'))
        .map((row) => ({
            name: row.querySelector('.edit-ing-name').value.trim(),
            quantity: row.querySelector('.edit-ing-qty').value.trim(),
            unit: row.querySelector('.edit-ing-unit').value
        }))
        // Completely empty rows are ignored
        .filter((ingredient) => ingredient.name !== '' || ingredient.quantity !== '' || ingredient.unit !== '');

    return {
        id: document.getElementById('editRecipeId').value,
        name: document.getElementById('editName').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        servings: document.getElementById('editServings').value.trim(),
        ingredients: ingredients,
        steps: document.getElementById('editSteps').value.trim(),
        image: document.getElementById('editImage').value.trim()
    };
}

// Frontend validation: instant feedback before any request is sent.
// Returns an error message, or '' when everything is fine.
function validateEditForm(values) {
    if (values.name === '') return 'Recipe name is required';
    if (values.name.length > 100) return 'Recipe name must be 100 characters or fewer';
    if (values.description === '') return 'Description is required';
    if (values.description.length > 300) return 'Description must be 300 characters or fewer';

    if (values.servings === '' || !Number.isInteger(Number(values.servings)) || Number(values.servings) <= 0) {
        return 'Servings must be a positive whole number';
    }

    if (values.ingredients.length === 0) return 'At least one ingredient is required';

    const seen = new Set();
    for (let i = 0; i < values.ingredients.length; i++) {
        const ing = values.ingredients[i];
        const label = 'Ingredient ' + (i + 1) + ': ';
        if (ing.name === '') return label + 'name is required';
        if (!(Number.isFinite(Number(ing.quantity)) && Number(ing.quantity) > 0 && ing.quantity !== '')) {
            return label + 'quantity must be a number greater than 0';
        }
        if (!EDIT_UNITS.includes(ing.unit)) return label + 'please choose a unit';

        const key = ing.name.toLowerCase();
        if (seen.has(key)) return label + 'duplicate ingredient "' + ing.name + '"';
        seen.add(key);
    }

    if (values.steps === '') return 'Steps are required';
    if (values.image !== '' && !/^https?:\/\/\S+$/i.test(values.image)) {
        return 'Image must be a valid http or https URL';
    }
    return '';
}

async function saveRecipeUpdate() {
    editClearMessage('editMessage');

    const values = getEditFormValues();
    const clientError = validateEditForm(values);
    if (clientError) {
        editShowMessage('editMessage', clientError, true);
        return;
    }

    const payload = {
        name: values.name,
        description: values.description,
        servings: Number(values.servings),
        ingredients: values.ingredients.map((ing) => ({
            name: ing.name,
            quantity: Number(ing.quantity),
            unit: ing.unit
        })),
        steps: values.steps,
        image: values.image
    };

    try {
        const response = await fetch('/update-recipe/' + encodeURIComponent(values.id), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok) {
            // Backend error (not found, locked, duplicate name, invalid input...)
            editShowMessage('editMessage', result.message, true);
            return;
        }

        $('#editRecipeModal').modal('hide');
        editShowMessage('editPageMessage', result.message, false);
        await loadEditRecipeList();
    } catch (error) {
        editShowMessage('editMessage', 'Could not reach the server. Please try again.', true);
    }
}

// Keshav's Create calls viewRecipes() (if it exists) after adding a recipe.
// Until a Read feature defines it, point it at this list so new recipes show up straight away.
if (typeof window.viewRecipes !== 'function') {
    window.viewRecipes = loadEditRecipeList;
}

window.addEventListener('DOMContentLoaded', loadEditRecipeList);
