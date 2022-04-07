from flask import Blueprint
from flask_accept import accept
import re
from database import Database
from dependencies import *

recipes = Blueprint('recipes', __name__, url_prefix="/v1/recipes", static_folder="../public")


@recipes.route('/', methods=['GET'])
@require_auth()
def get_recipes():
    db = Database()
    result = db.select('SELECT recipe FROM recipes ORDER BY sort_order')
    if result:
        results = db.fetchall()
        for recipe in results:
            result = db.select('SELECT ri.ingredient, ri.measure, ri.unit, i.unit_quantity_in_g, i.count, i.time_updated FROM recipe_ingredients ri INNER JOIN ingredients i on ri.ingredient = i.ingredient WHERE ri.recipe=?', (recipe['recipe'],))
            recipe['ingredients'] = db.fetchall() if result else []
            recipe['count'] = get_recipe_count(recipe['recipe'], db)
            stock_update_times = []
            for ing in recipe['ingredients']:
                ing['unit_quantity_in_g'] = float(ing['unit_quantity_in_g']) if ing['unit_quantity_in_g'] is not None else None
                measure_in_grams = get_measure_in_grams(ing['measure'], ing['unit'], db=db, unit_quantity_in_g=ing['unit_quantity_in_g'])
                ing['measure_in_g'] = measure_in_grams
                ing['count'] = float(ing['count']) if ing['count'] is not None else None
                ing['required_units'] = (measure_in_grams / float(ing['unit_quantity_in_g'])) if (float(ing['unit_quantity_in_g']) != 0 if ing['unit_quantity_in_g'] is not None else False) and measure_in_grams is not None else 0
                stock_update_times.append(ing['time_updated'])
                del ing['measure']
                del ing['unit']
            recipe['time_updated'] = max(stock_update_times) if len(stock_update_times) > 0 else None
        db.close()
        return make_response(f'{len(results)} recipe{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), ** {
            "recipes": results
        })
    db.close()
    return make_response("Could not get recipes: An unknown error occurred.", 500)


@recipes.route('/<string:recipe>', methods=['GET'])
@require_auth()
def get_recipe(recipe):
    db = Database()
    result = db.select('SELECT recipe FROM recipes WHERE recipe=? LIMIT 1', (recipe,))
    if result:
        results = db.fetchall()
        db.close()
        return make_response(f'{len(results)} recipe{"s" if not (len(results) == 1) else ""} found',
                             (404 if len(results) == 0 else 200), **{
                "recipes": results
            })
    db.close()
    return make_response("Could not get recipe: An unknown error occurred.", 500)


@recipes.route('/new', methods=['PUT'])
@accept('application/json')
@require_admin()
def add_recipe():
    recipe = request.get_json()
    if 'category' not in recipe or recipe['category'] is None or not isinstance(recipe['category'], str) or not (len(recipe['category'].strip()) > 0):
        return make_response('New recipes must have a category', 400)
    if 'section' not in recipe or recipe['section'] is None or not isinstance(recipe['section'], str) or not (len(recipe['section'].strip()) > 0):
        return make_response('New recipes must have a section', 400)
    if 'recipe' not in recipe or recipe['recipe'] is None or not isinstance(recipe['recipe'], str) or not (len(recipe['recipe'].strip()) > 0):
        return make_response('New recipes must have a name', 400)
    if 'ingredients' not in recipe or recipe['ingredients'] is None or not isinstance(recipe['ingredients'], list) or len(recipe['ingredients']) == 0:
        return make_response('New recipes must have at least 1 ingredient', 400)
    if recipe['recipe'].lower() == 'new recipe':
        return make_response('Recipes cannot have the name "New Recipe"', 400)
    ingredients = []
    measures = []
    units = []
    ingredients_valid = True
    db = Database()
    result = db.select('SELECT ingredient FROM ingredients')
    if result:
        results = db.fetchall()
        for result in results:
            ingredients.append(result['ingredient'])
    result = db.select('SELECT measure FROM measures')
    if result:
        results = db.fetchall()
        for result in results:
            measures.append(result['measure'])
    result = db.select('SELECT unit FROM units')
    if result:
        results = db.fetchall()
        for result in results:
            units.append(result['unit'])
    for ing in recipe['ingredients']:
        if 'ingredient' not in ing or ing['ingredient'].strip() not in ingredients or 'measure' not in ing or re.sub(r'[^0-9/\s]', '', ing['measure'].strip()) not in measures or 'unit' not in ing or ing['unit'] not in units:
            ingredients_valid = False
            break
        else:
            ing['ingredient'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), ing['ingredient'].strip().title())
            ing['measure'] = re.sub(r'[^0-9/\s]', '', ing['measure'].strip())
    if not ingredients_valid:
        db.close()
        return make_response('All ingredients must have a name, unit and measure', 400)
    recipe['category'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['category'].strip().title())
    recipe['section'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['section'].strip().title())
    recipe['recipe'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['recipe'].strip().title())
    result = db.insert('INSERT IGNORE INTO categories (category) VALUES (?)', (recipe['category'],), False)
    if result:
        result = db.insert('INSERT IGNORE INTO sections (section, category) VALUES (?, ?)', (recipe['section'], recipe['category']), False)
        if result:
            result = db.insert('INSERT IGNORE INTO recipes (recipe, sort_order) VALUES (?, ?)', (recipe['recipe'], recipe['recipe']), False)
            if result:
                result = db.insert('INSERT IGNORE INTO recipe_sections (recipe, section) VALUES (?, ?)', (recipe['recipe'], recipe['section']), False)
                if result:
                    ingredients_added = True
                    for ing in recipe['ingredients']:
                        result = db.insert('INSERT IGNORE INTO ingredients (ingredient) VALUES (?)', (ing['ingredient'],), False)
                        if not result:
                            ingredients_added = False
                            break
                        result = db.insert('INSERT IGNORE INTO units (unit) VALUES (?)', (ing['unit'],), False)
                        if not result:
                            ingredients_added = False
                            break
                        result = db.insert('INSERT IGNORE INTO measures (measure, unit) VALUES (?, ?)', (ing['measure'], ing['unit']), False)
                        if not result:
                            ingredients_added = False
                            break
                        result = db.insert('INSERT INTO recipe_ingredients (recipe, measure, unit, ingredient) VALUES (?, ?, ?, ?)', (recipe['recipe'], ing['measure'], ing['unit'], ing['ingredient']), False)
                        if not result:
                            ingredients_added = False
                            break
                    if ingredients_added:
                        db.commit()
                        db.close()
                        return make_response("Success", 201)
    db.close()
    return make_response('Could not add recipe: An unknown error occurred', 500)


@recipes.route('/<string:recipe_name>', methods=['POST'])
@accept('application/json')
@require_admin()
def edit_recipe(recipe_name):
    recipe_name = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe_name.strip().title())
    if recipe_name.lower() == 'new recipe':
        return make_response('Recipes cannot have the name "New Recipe"', 400)
    recipe = request.get_json()
    db = Database()
    result = db.select('SELECT c.category, r.recipe FROM recipes r INNER JOIN recipe_sections rs on r.recipe = rs.recipe INNER JOIN sections s on rs.section = s.section INNER JOIN categories c on s.category = c.category WHERE r.recipe=? LIMIT 1', (recipe_name,))
    if result:
        results = db.fetchall()
        if len(results) > 0:
            recipe_result = results[0]
            print(recipe_result)
            changes_made = True
            if 'category' in recipe:
                recipe['category'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['category'].strip().title())
                result = db.insert('INSERT IGNORE INTO categories (category) VALUES (?)', (recipe['category'],), False)
                if not result:
                    changes_made = False
            if 'section' in recipe:
                recipe['section'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['section'].strip().title())
                result = db.insert('INSERT IGNORE INTO sections (section, category) VALUES (?, ?)', (recipe['section'], recipe_result['category']), False)
                if result:
                    result = db.update('UPDATE recipe_sections SET section=? WHERE recipe=?', (recipe['section'], recipe_name), False)
                    if not result:
                        changes_made = False
                else:
                    changes_made = False
            if 'ingredients' in recipe:
                if isinstance(recipe['ingredients'], list) and len(recipe['ingredients']) > 0:
                    result = db.delete('DELETE FROM recipe_ingredients WHERE recipe=?', (recipe_result['recipe'],), False)
                    if result:
                        for ing in recipe['ingredients']:
                            if 'ingredient' not in ing or ing['ingredient'] is None or ing['ingredient'].strip() == '' or 'measure' not in ing or ing['measure'] is None or ing['measure'].strip() == '' or 'unit' not in ing or ing['unit'] is None:
                                return make_response('All ingredients must have a name, measure and unit.')
                            ing['ingredient'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), ing['ingredient'].strip().title())
                            ing['measure'] = re.sub(r'[^0-9/\s]', '', ing['measure'].strip())
                            result = db.insert('INSERT IGNORE INTO ingredients (ingredient) VALUES (?)', (ing['ingredient'],), False)
                            if result:
                                result = db.insert('INSERT IGNORE INTO units (unit) VALUES (?)', (ing['unit'],), False)
                                if result:
                                    result = db.insert('INSERT IGNORE INTO measures (measure, unit) VALUES (?, ?)', (ing['measure'], ing['unit']), False)
                                    if result:
                                        result = db.insert('INSERT INTO recipe_ingredients (recipe, measure, unit, ingredient) VALUES (?, ?, ?, ?)', (recipe_result['recipe'], ing['measure'], ing['unit'], ing['ingredient']), False)
                                        if not result:
                                            changes_made = False
                                    else:
                                        changes_made = False
                                        break
                                else:
                                    changes_made = False
                                    break
                            else:
                                changes_made = False
                                break
                    else:
                        changes_made = False
                else:
                    return make_response('Recipes must have at least one ingredient', 400)
            if 'recipe' in recipe:
                recipe['recipe'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), recipe['recipe'].strip().title())
                result = db.update('UPDATE recipes SET recipe=? WHERE recipe=?', (recipe['recipe'], recipe_result['recipe']), False)
                if not result:
                    changes_made = False
            if changes_made:
                db.commit()
                db.close()
                return make_response('Success', 200)
        else:
            db.close()
            return make_response(f"Could not edit recipe: Could not find recipe '{recipe_name}'.", 404)
    db.close()
    return make_response("Could not edit recipe: An unknown error occurred.", 500)


@recipes.route('/<string:recipe_name>', methods=['DELETE'])
@accept('application/json')
@require_admin()
def delete_recipe(recipe_name):
    db = Database()
    result = db.select('SELECT * FROM recipes WHERE recipe=?', (recipe_name,))
    if result and len(db.fetchall()) <= 0:
        db.close()
        return make_response(f'Could not find recipe with name "{recipe_name}', 404)
    result = db.delete('DELETE FROM recipes WHERE recipe=?', (recipe_name,))
    db.close()
    return make_response('Success', 200) if result else make_response(f'Could not delete recipe "{recipe_name}": An unknown error occurred', 500)


@recipes.route('/categories/new', methods=['PUT'])
@accept('application/json')
@require_admin()
def add_new_category():
    data = request.get_json()
    if 'category' not in data or data['category'] is None or data['category'].lower() == 'new recipe' or not (len(data['category'].strip()) > 0):
        return make_response('New categories must have a name', 400)
    data['category'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['category'].strip().title())
    db = Database()
    result = db.insert('INSERT IGNORE INTO categories (category) VALUES (?)', (data['category'],))
    if result:
        db.close()
        return make_response('Success', 201)
    db.close()
    return make_response('Could not add category: An unknown error occurred')


@recipes.route('/categories/<string:category_name>', methods=['POST'])
@accept('application/json')
@require_admin()
def update_category(category_name):
    data = request.get_json()
    if 'category' not in data or data['category'] is None or data['category'].lower() == 'new recipe' or not (len(data['category'].strip()) > 0):
        return make_response('Categories must have a name', 400)
    category_name = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), category_name.strip().title())
    data['category'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['category'].strip().title())
    db = Database()
    result = db.select('SELECT category FROM categories WHERE category=?', (category_name,))
    if result and len(db.fetchall()) > 0:
        result = db.update('UPDATE categories SET category=? WHERE category=?', (data['category'], category_name))
        if result:
            db.close()
            return make_response('Success', 200)
        db.close()
        return make_response('Could not update category: An unknown error occurred', 500)
    db.close()
    return make_response(f"Could not find category \"{category_name}\"", 404)


@recipes.route('/categories/<string:category_name>', methods=['DELETE'])
@accept('application/json')
@require_admin()
def delete_category(category_name):
    db = Database()
    result = db.select('SELECT category FROM categories WHERE category=?', (category_name,))
    if result and len(db.fetchall()) > 0:
        result = db.delete('DELETE FROM categories WHERE category=?', (category_name,))
        if result:
            db.close()
            return make_response('Success', 200)
        db.close()
        return make_response('Could not delete category: An unknown error occurred', 500)
    db.close()
    return make_response(f'Could not delete category: Could not find category "{category_name}"', 404)


@recipes.route('/categories/<string:category_name>/sections/new', methods=['PUT'])
@accept('application/json')
@require_admin()
def add_new_section(category_name):
    data = request.get_json()
    if category_name is None or not (len(category_name.strip()) > 0):
        return make_response('No category specified')
    if 'section' not in data or data['section'] is None or not (len(data['section'].strip()) > 0) or data['section'].lower() == 'new section':
        return make_response('New sections must have a name')
    category_name = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), category_name.strip().title())
    data['section'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['section'].strip().title())
    db = Database()
    result = db.select('SELECT category FROM categories WHERE category=?', (category_name,))
    if result and len(db.fetchall()) > 0:
        result = db.insert('INSERT IGNORE INTO sections (section, category) VALUES (?, ?)', (data['section'], category_name))
        if result:
            db.close()
            return make_response('Success', 201)
        db.close()
        return make_response('Could not add section: An unknown error occurred')
    else:
        db.close()
        return make_response(f"Could not find category \"{category_name}\"", 404)


@recipes.route('/categories/<string:category_name>/sections/<string:section_name>', methods=['POST'])
@accept('application/json')
@require_admin()
def update_section(category_name, section_name):
    if category_name is None or not (len(category_name.strip()) > 0):
        return make_response('No category specified')
    if section_name is None or not (len(section_name.strip()) > 0):
        return make_response('No section specified')
    data = request.get_json()
    if 'section' not in data or data['section'] is None or not (len(data['section'].strip()) > 0) or data['section'].lower() == 'new section':
        return make_response('Sections must have a name')
    category_name = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), category_name.strip().title())
    section_name = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), section_name.strip().title())
    data['section'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['section'].strip().title())
    db = Database()
    result = db.select('SELECT category FROM categories WHERE category=?', (category_name,))
    if result and len(db.fetchall()) > 0:
        result = db.select('SELECT section FROM sections WHERE section=? AND category=?', (section_name, category_name))
        if result and len(db.fetchall()) > 0:
            result = db.update('UPDATE sections SET section=? WHERE section=? AND category=?', (data['section'], section_name, category_name))
            if result:
                db.close()
                return make_response('Success', 200)
            db.close()
            return make_response('Could not update section: An unknown error occurred')
        else:
            db.close()
            return make_response(f"Could not find section \"{section_name}\" in category \"{category_name}\"", 404)
    else:
        db.close()
        return make_response(f"Could not find category \"{category_name}\"", 404)


@recipes.route('/categories/<string:category_name>/sections/<string:section_name>', methods=['DELETE'])
@accept('application/json')
@require_admin()
def delete_section(category_name, section_name):
    db = Database()
    result = db.select('SELECT section FROM sections WHERE category=? AND section=?', (category_name, section_name))
    if result and len(db.fetchall()) > 0:
        result = db.delete('DELETE FROM sections WHERE category=? AND section=?', (category_name, section_name))
        if result:
            db.close()
            return make_response('Success', 200)
        db.close()
        return make_response('Could not delete section: An unknown error occurred', 500)
    db.close()
    return make_response(f'Could not delete section: Could not find section "{section_name}"', 404)


@recipes.route('/units/new', methods=['PUT'])
@accept('application/json')
@require_admin()
def create_new_unit():
    data = request.get_json()
    if 'unit' not in data or len(data['unit'].strip()) == 0 or data['unit'].strip().lower() == 'new unit':
        return make_response('Units must have a denotation', 400)
    unit = data['unit']
    db = Database()
    result = db.select('SELECT FROM units WHERE unit=?', (unit,))
    if result and len(db.fetchall()) > 0:
        db.close()
        return make_response(f'Could not add unit: Unit "{unit}" already exists')
    try:
        grams = float(data['conversion_to_grams']) if data['conversion_to_grams'] is not None else None
    except ValueError:
        grams = None
    result = db.insert('INSERT INTO units (unit, conversion_to_grams) VALUES (?, ?)', (unit, grams))
    if result:
        return make_response('Success', 201)
    return make_response('Could not add unit: An unknown error occurred')


@recipes.route('/units/<string:unit>', methods=['POST'])
@accept('application/json')
@require_admin()
def edit_unit(unit):
    data = request.get_json()
    db = Database()
    result = db.select('SELECT unit, conversion_to_grams FROM units WHERE unit=?', (unit,))
    results = db.fetchall()
    if not result or len(results) == 0:
        db.close()
        return make_response(f'Could not find unit "{unit}"', 404)
    result = results[0]
    success = True
    for key in result.keys():
        if key in data and result[key] != data[key]:
            res = db.update(f'UPDATE units SET {key}=? WHERE unit=?', (data[key], unit), False)
            if not res:
                success = False
                break
    if success:
        db.commit()
        db.close()
        return make_response('Success', 200)
    db.close()
    return make_response('Could not save unit: An unknown error occurred')


@recipes.route('/units/<string:unit>', methods=['DELETE'])
@accept('application/json')
@require_admin()
def delete_unit(unit):
    db = Database()
    result = db.select('SELECT unit FROM units WHERE unit=?', (unit,))
    if result and len(db.fetchall()) > 0:
        result = db.delete('DELETE FROM units WHERE unit=?', (unit,))
        if result:
            db.close()
            return make_response('Success', 200)
        db.close()
        return make_response('Could not delete unit: An unknown error occurred', 500)
    db.close()
    return make_response(f'Could not delete unit: Could not find unit "{unit}"', 404)


@recipes.route('/ingredients/new', methods=['PUT'])
@accept('application/json')
@require_admin()
def create_new_ingredient():
    data = request.get_json()
    if 'ingredient' not in data or len(data['ingredient'].strip()) == 0 or data['ingredient'].strip().lower() == 'new ingredient':
        return make_response('Ingredients must have a name', 400)
    data['ingredient'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['ingredient'].strip().title())
    try:
        unit_quantity = float(data['unit_quantity_in_g'])
    except ValueError:
        unit_quantity = None
    try:
        count = int(data['count']) if data['count'] is not None else None
    except ValueError:
        count = None
    db = Database()
    ingredient = data['ingredient']
    result = db.select('SELECT FROM ingredients WHERE ingredient=?', (ingredient,))
    if result and len(db.fetchall()) > 0:
        db.close()
        return make_response(f'Could not add ingredient: Ingredient "{ingredient}" already exists', 409)
    result = db.insert('INSERT INTO ingredients (ingredient, unit_quantity_in_g, `count`) VALUES (?, ?, ?)', (ingredient, unit_quantity, count))
    db.close()
    if result:
        return make_response('Success', 201)
    return make_response('Could not add ingredient: An unknown error occurred', 500)


@recipes.route('/ingredients/<string:ingredient>', methods=['POST'])
@accept('application/json')
@require_admin()
def edit_ingredient(ingredient):
    data = request.get_json()
    if data['ingredient'].strip() == '':
        return make_response('No ingredient specified.', 404)
    db = Database()
    result = db.select('SELECT ingredient, unit_quantity_in_g, `count` FROM ingredients WHERE ingredient=?', (ingredient,))
    results = db.fetchall()
    if not result or len(results) < 1:
        db.close()
        return make_response(f'Could not find ingredient "{ingredient}"', 404)
    success = True
    current_ingredient = results[0]
    for key in current_ingredient.keys():
        if not success:
            break
        if key == 'ingredient':
            data['ingredient'] = re.sub(r"'[A-Z]\s", lambda m: m.group(0).lower(), data['ingredient'].strip().title())
        else:
            try:
                if (key == 'count' and data[key] is not None) or key != 'count':
                    data[key] = float(data[key])
            except ValueError:
                continue
        result = db.update(f'UPDATE ingredients SET {key}=? WHERE ingredient=?', (data[key], ingredient), False)
        if not result:
            success = False
    if success:
        db.commit()
        db.close()
        return make_response('Success', 200)
    db.close()
    return make_response('Could not save ingredient: An unknown error occurred')
