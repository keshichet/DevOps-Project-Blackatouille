var ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'];

function showCreateMessage(text, isError) {
    var box = document.getElementById("createMessage");
    box.className = isError ? "alert alert-danger" : "alert alert-success";
    box.innerText = text;
}

function addIngredientRow() {
    var options = '<option value="">Unit</option>' + ALLOWED_UNITS.map(function (u) {
        return '<option value="' + u + '">' + u + '</option>';
    }).join('');
    var row = document.createElement('div');
    row.className = 'form-row mb-2 ingredient-row';
    row.innerHTML =
        '<div class="col-5"><input type="text" class="form-control ing-name" placeholder="Ingredient"></div>' +
        '<div class="col-3"><input type="text" class="form-control ing-qty" placeholder="Qty"></div>' +
        '<div class="col-3"><select class="form-control ing-unit">' + options + '</select></div>' +
        '<div class="col-1"><button type="button" class="btn btn-outline-danger px-2" onclick="this.closest(\'.ingredient-row\').remove()">&times;</button></div>';
    document.getElementById('ingredientRows').appendChild(row);
}

function resetIngredientRows() {
    document.getElementById('ingredientRows').innerHTML = '';
    addIngredientRow();
}

function readIngredients() {
    var rows = document.querySelectorAll('#ingredientRows .ingredient-row');
    var ingredients = [];
    rows.forEach(function (row) {
        ingredients.push({
            name: row.querySelector('.ing-name').value.trim(),
            quantity: row.querySelector('.ing-qty').value.trim(),
            unit: row.querySelector('.ing-unit').value
        });
    });
    return ingredients;
}

document.addEventListener('DOMContentLoaded', resetIngredientRows);

function createRecipe() {
    var name = document.getElementById("recipeName").value.trim();
    var description = document.getElementById("recipeDescription").value.trim();
    var servings = document.getElementById("recipeServings").value.trim();
    var steps = document.getElementById("recipeSteps").value.trim();
    var image = document.getElementById("recipeImage").value.trim();
    var ingredients = readIngredients();

    if (name === "") { return showCreateMessage("Recipe name is required", true); }
    if (description === "") { return showCreateMessage("Description is required", true); }
    if (servings === "" || !Number.isInteger(Number(servings)) || Number(servings) <= 0) {
        return showCreateMessage("Servings must be a positive whole number", true);
    }
    if (ingredients.length === 0) {
        return showCreateMessage("At least one ingredient is required", true);
    }
    for (var i = 0; i < ingredients.length; i++) {
        var ing = ingredients[i];
        var label = "Ingredient " + (i + 1) + ": ";
        if (ing.name === "") { return showCreateMessage(label + "name is required", true); }
        if (!(Number(ing.quantity) > 0)) { return showCreateMessage(label + "quantity must be a number greater than 0", true); }
        if (!ALLOWED_UNITS.includes(ing.unit)) { return showCreateMessage(label + "please choose a unit", true); }
    }
    if (steps === "") { return showCreateMessage("Instructions are required", true); }
    if (image !== "" && !/^https?:\/\/\S+$/i.test(image)) {
        return showCreateMessage("Image must be a valid http or https URL", true);
    }

    var jsonData = {
        name: name, description: description, servings: servings,
        ingredients: ingredients, steps: steps, image: image
    };

    var request = new XMLHttpRequest();
    request.open("POST", "/add-recipe", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
        var response = JSON.parse(request.responseText);
        if (response.message === undefined) {
            alert("Added recipe: " + name + "!");
            document.getElementById("recipeName").value = "";
            document.getElementById("recipeDescription").value = "";
            document.getElementById("recipeServings").value = "";
            document.getElementById("recipeSteps").value = "";
            document.getElementById("recipeImage").value = "";
            resetIngredientRows();
            document.getElementById("createMessage").className = "";
            document.getElementById("createMessage").innerText = "";
            $('#createRecipeModal').modal('hide');
            if (typeof viewRecipes === "function") { viewRecipes(); }
        } else {
            showCreateMessage(response.message, true);
        }
    };
    request.send(JSON.stringify(jsonData));
}