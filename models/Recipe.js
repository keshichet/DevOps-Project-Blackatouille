class Recipe {
    constructor(name, description, servings, ingredients, steps, image) {
        this.name = name;
        this.description = description;
        this.servings = servings;
        this.ingredients = ingredients;
        this.steps = steps;
        this.image = image;
        this.locked = false;
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        this.id = timestamp + "" + random.toString().padStart(3, '0');
    }
}
module.exports = { Recipe };