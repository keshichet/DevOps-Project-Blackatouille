const { Recipe } = require('../models/Recipe');
const fs = require('fs').promises;
const path = require('path');

const RECIPES_FILE = path.join('utils', 'recipes.json');
const TEMPLATE_FILE = path.join('utils', 'recipes.template.json');
const ALLOWED_UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'piece'];

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

// Returns an error message string, or null if the input is valid
function validateRecipe(body) {
    const { name, servings, ingredients, steps } = body || {};

    if (typeof name !== 'string' || name.trim() === '') {
        return 'Recipe name is required';
    }
    if (name.trim().length > 100) {
        return 'Recipe name must be 100 characters or fewer';
    }
    const servingsNum = Number(servings);
    if (servings === undefined || servings === '' || !Number.isInteger(servingsNum) || servingsNum <= 0) {
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
        const qty = Number(ing.quantity);
        if (ing.quantity === '' || !(qty > 0)) {
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
    return null;
}

async function addRecipe(req, res) {
    try {
        const error = validateRecipe(req.body);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const { name, servings, ingredients, steps } = req.body;
        const recipes = await readRecipes();

        const duplicate = recipes.some(
            r => r.name.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (duplicate) {
            return res.status(409).json({ message: 'A recipe with this name already exists' });
        }

        const cleanIngredients = ingredients.map(i => ({
            name: i.name.trim(),
            quantity: Number(i.quantity),
            unit: i.unit
        }));
        const newRecipe = new Recipe(name.trim(), Number(servings), cleanIngredients, steps.trim());

        recipes.push(newRecipe);
        await fs.writeFile(RECIPES_FILE, JSON.stringify(recipes, null, 2), 'utf8');
        return res.status(201).json(recipes);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: error.message });
    }
}

module.exports = { addRecipe };