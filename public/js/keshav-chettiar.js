var ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'];

function showCreateMessage(text, isError) {
    var box = document.getElementById("createMessage");
    box.className = isError ? "alert alert-danger" : "alert alert-success";
    box.innerText = text;
}

// Each line: name, quantity, unit
function parseIngredients(text) {
    var lines = text.split("\n").map(function (l) { return l.trim(); })
        .filter(function (l) { return l !== ""; });
    var ingredients = [];
    for (var i = 0; i < lines.length; i++) {
        var parts = lines[i].split(",").map(function (p) { return p.trim(); });
        if (parts.length !== 3) {
            return { error: "Line " + (i + 1) + ": use the format name, quantity, unit" };
        }
        ingredients.push({ name: parts[0], quantity: parts[1], unit: parts[2] });
    }
    return { ingredients: ingredients };
}

function createRecipe() {
    var name = document.getElementById("recipeName").value.trim();
    var servings = document.getElementById("recipeServings").value.trim();
    var steps = document.getElementById("recipeSteps").value.trim();
    var parsed = parseIngredients(document.getElementById("recipeIngredients").value);

    if (name === "") { return showCreateMessage("Recipe name is required", true); }
    if (servings === "" || !Number.isInteger(Number(servings)) || Number(servings) <= 0) {
        return showCreateMessage("Servings must be a positive whole number", true);
    }
    if (parsed.error) { return showCreateMessage(parsed.error, true); }
    if (parsed.ingredients.length === 0) {
        return showCreateMessage("At least one ingredient is required", true);
    }
    for (var i = 0; i < parsed.ingredients.length; i++) {
        var ing = parsed.ingredients[i];
        if (ing.name === "" || !(Number(ing.quantity) > 0) || !ALLOWED_UNITS.includes(ing.unit)) {
            return showCreateMessage("Ingredient " + (i + 1) + ": check name, quantity (> 0) and unit (" + ALLOWED_UNITS.join(", ") + ")", true);
        }
    }
    if (steps === "") { return showCreateMessage("Steps are required", true); }

    var jsonData = { name: name, servings: servings, ingredients: parsed.ingredients, steps: steps };

    var request = new XMLHttpRequest();
    request.open("POST", "/add-recipe", true);
    request.setRequestHeader("Content-Type", "application/json");
    request.onload = function () {
        var response = JSON.parse(request.responseText);
        if (response.message === undefined) {
            alert("Added recipe: " + name + "!");
            document.getElementById("recipeName").value = "";
            document.getElementById("recipeServings").value = "";
            document.getElementById("recipeIngredients").value = "";
            document.getElementById("recipeSteps").value = "";
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