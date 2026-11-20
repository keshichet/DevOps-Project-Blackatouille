var express = require('express');
var bodyParser = require("body-parser");
var app = express();
const PORT = process.env.PORT || 5050
var startPage = "index.html";

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("./public"));

// //Keshav: Create recipe
const { addRecipe } = require('./utils/KeshavChettiarUtil');
app.post('/add-recipe', addRecipe);

//Brayden: Update recipe
const { updateRecipe, getRecipesForEdit } = require('./utils/BraydenTanUtil');
app.get('/edit-recipes', getRecipesForEdit);
app.put('/update-recipe/:id', updateRecipe);



app.get('/', (req, res) => {
    res.sendFile(__dirname + "/public/" + startPage);
})

server = app.listen(PORT, function () {
    const address = server.address();
    const baseUrl = `http://${address.address == "::" ? 'localhost' : address.address}:${address.port}`;
    console.log(`Blackatouille at: ${baseUrl}`);
});

module.exports = {app, server}