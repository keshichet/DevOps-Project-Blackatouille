const fs = require('fs').promises;
const path = require('path');

// Same JSON data store as the Create feature (the template is the fallback if recipes.json is missing)
const RECIPES_FILE = path.join(__dirname, 'recipes.json');
const TEMPLATE_FILE = path.join(__dirname, 'recipes.template.json');

// Validation rules mirror the Create feature, so any recipe that can be created can also be edited
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'];
const NAME_MAX = 100;
const DESC_MAX = 300;

// ---------- JSON data store helpers ----------
async function readRecipes() {
    try {
        const data = await fs.readFile(RECIPES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            const templateData = await fs.readFile(TEMPLATE_FILE, 'utf8');
            return JSON.parse(templateData);
        }
        throw err;
    }
}

async function writeRecipes(recipes) {
    await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2), 'utf8');
}

// Accepts a number or a numeric string; anything else becomes NaN
function toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return NaN;
}

// ---------- Backend validation ----------
// Returns an error message string, or null if the input is valid
function validateRecipe(body) {
    const { name, description, servings, ingredients, steps, image } = body || {};

    if (typeof name !== 'string' || name.trim() === '') {
        return 'Recipe name is required';
    }
    if (name.trim().length > NAME_MAX) {
        return 'Recipe name must be ' + NAME_MAX + ' characters or fewer';
    }
    if (typeof description !== 'string' || description.trim() === '') {
        return 'Description is required';
    }
    if (description.trim().length > DESC_MAX) {
        return 'Description must be ' + DESC_MAX + ' characters or fewer';
    }

    const servingsNum = toNumber(servings);
    if (!Number.isInteger(servingsNum) || servingsNum <= 0) {
        return 'Servings must be a positive whole number';
    }

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return 'At least one ingredient is required';
    }
    const seen = new Set();
    for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        const label = 'Ingredient ' + (i + 1) + ': ';
        if (!ing || typeof ing.name !== 'string' || ing.name.trim() === '') {
            return label + 'name is required';
        }
        const qty = toNumber(ing.quantity);
        if (!(Number.isFinite(qty) && qty > 0)) {
            return label + 'quantity must be a number greater than 0';
        }
        if (!ALLOWED_UNITS.includes(ing.unit)) {
            return label + 'unit must be one of ' + ALLOWED_UNITS.join(', ');
        }
        const key = ing.name.trim().toLowerCase();
        if (seen.has(key)) {
            return label + 'duplicate ingredient "' + ing.name.trim() + '"';
        }
        seen.add(key);
    }

    if (typeof steps !== 'string' || steps.trim() === '') {
        return 'Steps are required';
    }
    if (image !== undefined && image !== null && image !== '') {
        if (typeof image !== 'string' || !/^https?:\/\/\S+$/i.test(image.trim())) {
            return 'Image must be a valid http or https URL';
        }
    }
    return null;
}

// Builds the cleaned fields to store. Only these whitelisted fields can ever be changed
// through this endpoint, so a request can never overwrite a recipe's id or locked flag.
function buildRecipeFields(body) {
    return {
        name: body.name.trim(),
        description: body.description.trim(),
        servings: toNumber(body.servings),
        ingredients: body.ingredients.map((i) => ({
            name: i.name.trim(),
            quantity: toNumber(i.quantity),
            unit: i.unit
        })),
        steps: body.steps.trim(),
        image: body.image ? body.image.trim() : ''
    };
}

// ---------- GET /edit-recipes : list recipes for the edit page ----------
async function getRecipesForEdit(req, res) {
    try {
        const recipes = await readRecipes();
        return res.status(200).json(recipes);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

// ---------- PUT /update-recipe/:id : UPDATE a recipe ----------
// Success : 200 + updated recipe
// Errors  : 400 invalid/missing input, 403 recipe is locked,
//           404 recipe not found, 409 duplicate name, 500 server error
async function updateRecipe(req, res) {
    try {
        const id = req.params.id;

        // 1. Validate the request BEFORE touching the data store
        const error = validateRecipe(req.body);
        if (error) {
            return res.status(400).json({ message: error });
        }

        // 2. Read the JSON data store
        const recipes = await readRecipes();

        // 3. The recipe being updated must exist
        const index = recipes.findIndex((r) => String(r.id) === String(id));
        if (index === -1) {
            return res.status(404).json({ message: 'Recipe not found' });
        }

        // 4. Locked recipes cannot be edited
        if (recipes[index].locked === true) {
            return res.status(403).json({ message: 'This recipe is locked and cannot be edited' });
        }

        // 5. The new name must not clash with a DIFFERENT recipe
        const fields = buildRecipeFields(req.body);
        const duplicate = recipes.some(
            (r) =>
                String(r.name).trim().toLowerCase() === fields.name.toLowerCase() &&
                String(r.id) !== String(id)
        );
        if (duplicate) {
            return res.status(409).json({ message: 'A recipe with this name already exists' });
        }

        // 6. Apply the update (id and locked are kept exactly as they were)
        recipes[index] = { ...recipes[index], ...fields };

        // 7. Persist to the JSON data store
        await writeRecipes(recipes);

        return res.status(200).json({
            message: 'Recipe updated successfully',
            recipe: recipes[index]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

module.exports = { updateRecipe, getRecipesForEdit };
