'use client';

import { useState, useEffect, useCallback } from 'react';
import { MainLayout } from '@/layouts/main-layout';
import { cafeteriaApi } from '@/services/cafeteria-api';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, X, Search, Clock, Flame } from 'lucide-react';
import type { Recipe, RecipeIngredient } from '@/types';

const CATEGORIES = ['Staple', 'Protein', 'Vegetable', 'Fruit', 'Beverage', 'Snack', 'Dessert', 'Soup', 'Salad'];

const initialForm = {
  name: '',
  description: '',
  instructions: '',
  prepTimeMinutes: 0,
  cookTimeMinutes: 0,
  servings: 0,
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
  vitamins: '',
  allergens: '',
};

const initialMenuItemForm = {
  name: '',
  category: 'Staple',
  mealType: 'LUNCH',
  description: '',
  isVegetarian: false,
  isVegan: false,
  isHalal: false,
  isGlutenFree: false,
};

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Recipe | null>(null);
  const [form, setForm] = useState(initialForm);
  const [menuItemForm, setMenuItemForm] = useState(initialMenuItemForm);
  const [search, setSearch] = useState('');
  const [ingredients, setIngredients] = useState<{ productId: string; quantity: number; unit: string; notes: string }[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await cafeteriaApi.recipes.list();
      setRecipes(data);
    } catch {
      toast.error('Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(initialForm);
    setMenuItemForm(initialMenuItemForm);
    setEditItem(null);
    setIngredients([]);
  };

  const openCreate = () => { resetForm(); setDialogOpen(true); };

  const openEdit = (recipe: Recipe) => {
    setForm({
      name: recipe.name,
      description: recipe.description || '',
      instructions: recipe.instructions || '',
      prepTimeMinutes: recipe.prepTimeMinutes || 0,
      cookTimeMinutes: recipe.cookTimeMinutes || 0,
      servings: recipe.servings || 0,
      calories: recipe.calories || 0,
      protein: recipe.protein || 0,
      carbohydrates: recipe.carbohydrates || 0,
      fat: recipe.fat || 0,
      vitamins: recipe.vitamins || '',
      allergens: recipe.allergens || '',
    });
    if (recipe.menuItemId) {
      setMenuItemForm({
        name: recipe.name,
        category: 'Staple',
        mealType: 'LUNCH',
        description: recipe.description || '',
        isVegetarian: false,
        isVegan: false,
        isHalal: false,
        isGlutenFree: false,
      });
    }
    setEditItem(recipe);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const body = { ...menuItemForm, recipe: form, ingredients };
      if (editItem) {
        await cafeteriaApi.recipes.update(editItem.id, body);
        toast.success('Recipe updated');
      } else {
        await cafeteriaApi.recipes.create(body);
        toast.success('Recipe created');
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch {
      toast.error('Failed to save recipe');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recipe?')) return;
    try {
      await cafeteriaApi.recipes.remove(id);
      toast.success('Recipe deleted');
      load();
    } catch {
      toast.error('Failed to delete recipe');
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { productId: '', quantity: 0, unit: 'kg', notes: '' }]);
  };

  const removeIngredient = (idx: number) => {
    setIngredients(ingredients.filter((_, i) => i !== idx));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    const items = [...ingredients];
    items[idx] = { ...items[idx], [field]: value };
    setIngredients(items);
  };

  const filteredRecipes = recipes.filter(r => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return <MainLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Recipes</h1>
            <p className="text-sm text-muted-foreground">Manage recipes with ingredients, nutrition, and cooking instructions</p>
          </div>
          <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Recipe
          </button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Search recipes..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white pl-10 pr-4 py-2 text-sm outline-none focus:border-primary" />
        </div>

        {dialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editItem ? 'Edit Recipe' : 'Create Recipe'}</h2>
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg p-1 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Recipe Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g., Rice and Beans" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Prep Time (min)</label>
                  <input type="number" value={form.prepTimeMinutes || ''} onChange={(e) => setForm({ ...form, prepTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cook Time (min)</label>
                  <input type="number" value={form.cookTimeMinutes || ''} onChange={(e) => setForm({ ...form, cookTimeMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Servings</label>
                  <input type="number" value={form.servings || ''} onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={2} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Cooking Instructions</label>
                  <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={4} placeholder="Step by step instructions..." />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Nutrition Information</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Calories</label>
                    <input type="number" value={form.calories || ''} onChange={(e) => setForm({ ...form, calories: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Protein (g)</label>
                    <input type="number" value={form.protein || ''} onChange={(e) => setForm({ ...form, protein: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Carbs (g)</label>
                    <input type="number" value={form.carbohydrates || ''} onChange={(e) => setForm({ ...form, carbohydrates: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Fat (g)</label>
                    <input type="number" value={form.fat || ''} onChange={(e) => setForm({ ...form, fat: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium">Ingredients</h3>
                  <button onClick={addIngredient} className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Add Ingredient
                  </button>
                </div>
                {ingredients.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No ingredients added</p>
                ) : (
                  <div className="space-y-2">
                    {ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input placeholder="Product ID" value={ing.productId} onChange={(e) => updateIngredient(idx, 'productId', e.target.value)}
                          className="flex-1 rounded-lg border px-3 py-2 text-sm" />
                        <input type="number" placeholder="Qty" value={ing.quantity || ''} onChange={(e) => updateIngredient(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20 rounded-lg border px-3 py-2 text-sm" />
                        <select value={ing.unit} onChange={(e) => updateIngredient(idx, 'unit', e.target.value)}
                          className="w-20 rounded-lg border px-3 py-2 text-sm">
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="L">L</option>
                          <option value="ml">ml</option>
                          <option value="pcs">pcs</option>
                        </select>
                        <button onClick={() => removeIngredient(idx)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Allergens</label>
                  <input value={form.allergens} onChange={(e) => setForm({ ...form, allergens: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Peanuts, Gluten" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vitamins</label>
                  <input value={form.vitamins} onChange={(e) => setForm({ ...form, vitamins: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g., Vitamin A, Iron" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setDialogOpen(false); resetForm(); }} className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSave} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">{editItem ? 'Update' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => (
            <div key={recipe.id} className="rounded-xl border bg-white p-5 shadow-sm space-y-3 transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{recipe.name}</h3>
                  <p className="text-sm text-muted-foreground">{recipe.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(recipe)} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(recipe.id)} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {recipe.prepTimeMinutes && (
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.prepTimeMinutes}min prep</span>
                )}
                {recipe.cookTimeMinutes && (
                  <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {recipe.cookTimeMinutes}min cook</span>
                )}
                {recipe.calories && (
                  <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {recipe.calories} cal</span>
                )}
              </div>
              {recipe.allergens && (
                <div className="flex flex-wrap gap-1">
                  {recipe.allergens.split(',').map((a) => (
                    <span key={a} className="inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{a.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredRecipes.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">No recipes found</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
