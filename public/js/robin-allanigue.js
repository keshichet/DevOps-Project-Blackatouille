// Robin Allanigue - DELETE recipe (frontend)
// Every global here starts with "delete" so it cannot clash with teammates' files
// (all files in public/js share one global scope).

let deleteRecipesCache = [];

// Messages
function deleteShowMessage(text, isError) {
   const box = document.getElementById('deleteMessage');
   box.className = 'alert mt-3 ' + (isError ? 'alert-danger' : 'alert-success');
   box.textContent = text;
}

function deleteClearMessage() {
   const box = document.getElementById('deleteMessage');
   box.className = '';
   box.textContent = '';
}

// Same normalising rule as the backend: trim, collapse spaces, ignore case
function deleteNormaliseName(value) {
   return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
}

// Load recipes into the dropdown
async function loadDeleteOptions() {
   const select = document.getElementById('deleteRecipeSelect');
   const previous = select.value;
   try {
      const response = await fetch('/edit-recipes');
      const recipes = await response.json();
      if (!response.ok) {
         deleteShowMessage(recipes.message || 'Could not load recipes.', true);
         return;
      }
      deleteRecipesCache = recipes;

      select.innerHTML = '';
      select.appendChild(new Option('-- Choose a recipe --', ''));
      recipes.forEach((recipe) => {
         // new Option() sets text safely, so recipe names can never inject HTML
         const label =
            recipe.name + (recipe.locked === true ? ' (locked)' : '');
         select.appendChild(new Option(label, recipe.id));
      });

      // Keep the user's selection if that recipe still exists
      if (recipes.some((r) => String(r.id) === previous)) {
         select.value = previous;
      }
      deleteUpdateHint();
   } catch (error) {
      deleteShowMessage('Could not reach the server. Please try again.', true);
   }
}

// Shows which name to type, and warns early if the chosen recipe is locked
function deleteUpdateHint() {
   const hint = document.getElementById('deleteHint');
   const recipe = deleteRecipesCache.find(
      (r) =>
         String(r.id) === document.getElementById('deleteRecipeSelect').value,
   );
   if (!recipe) {
      hint.textContent = 'Choose a recipe, then type its name to confirm.';
      return;
   }
   hint.textContent =
      recipe.locked === true
         ? 'Note: "' +
           recipe.name +
           '" is locked, so the server will refuse to delete it.'
         : 'Type "' + recipe.name + '" below to confirm.';
}

// Frontend validation
// Returns an error message, or '' when the form is fine to send
function validateDeleteForm(id, typedName) {
   if (id === '') return 'Please choose a recipe to delete';
   if (!/^\d+$/.test(id))
      return 'Invalid recipe selected. Please refresh the page.';
   if (typedName.trim() === '')
      return 'Please type the recipe name to confirm the deletion';

   const recipe = deleteRecipesCache.find((r) => String(r.id) === id);
   if (
      recipe &&
      deleteNormaliseName(typedName) !== deleteNormaliseName(recipe.name)
   ) {
      return 'The name you typed does not match "' + recipe.name + '"';
   }
   return '';
}

// Send the DELETE request
async function deleteSelectedRecipe() {
   deleteClearMessage();

   const id = document.getElementById('deleteRecipeSelect').value;
   const typedName = document.getElementById('deleteConfirmName').value;

   const clientError = validateDeleteForm(id, typedName);
   if (clientError) {
      deleteShowMessage(clientError, true);
      return;
   }

   const button = document.getElementById('deleteRecipeBtn');
   button.disabled = true; // stop double-clicks sending two requests
   try {
      const response = await fetch('/delete-recipe/' + encodeURIComponent(id), {
         method: 'DELETE',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ confirmName: typedName.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
         // Backend errors: 400 invalid / mismatch, 403 locked, 404 not found, 500
         deleteShowMessage(result.message, true);
         if (response.status === 404) {
            await loadDeleteOptions(); // the list was out of date, so refresh it
         }
         return;
      }

      deleteShowMessage(result.message, false);
      document.getElementById('deleteConfirmName').value = '';
      document.getElementById('deleteRecipeSelect').value = '';

      // Refresh the shared recipe table (Brayden's list) and this dropdown
      if (typeof loadEditRecipeList === 'function') {
         await loadEditRecipeList();
      }
      await loadDeleteOptions();
   } catch (error) {
      deleteShowMessage('Could not reach the server. Please try again.', true);
   } finally {
      button.disabled = false;
   }
}

// Wire up
window.addEventListener('DOMContentLoaded', () => {
   document
      .getElementById('deleteRecipeSelect')
      .addEventListener('change', () => {
         deleteClearMessage();
         deleteUpdateHint();
      });
   document
      .getElementById('deleteRecipeBtn')
      .addEventListener('click', deleteSelectedRecipe);

   // When a teammate's feature re-renders the recipe table (create / update),
   // refresh this dropdown too, so it never offers a stale list.
   const table = document.getElementById('editRecipeList');
   if (table) {
      new MutationObserver(() => loadDeleteOptions()).observe(table, {
         childList: true,
      });
   }

   loadDeleteOptions();
});
