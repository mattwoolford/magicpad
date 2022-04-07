import base64
from datetime import datetime
import hashlib
import os
import random
import string
from flask import json, session, Response, request
from flask_socketio import emit, rooms
from functools import wraps
from database import Database
from fractions import Fraction
from math import floor

ALLOWED_FILES = ['jpg', 'jpeg', 'png']


def escape(value):
    return value.replace('<', '&lt;').replace('>', '&gt;')


def escape_dict(dictionary):
    if isinstance(dictionary, list):
        for item in dictionary:
            escape_dict(item)
    elif dictionary is not None:
        for key, value in dictionary.items():
            if isinstance(value, dict):
                dictionary[key] = escape_dict(value)
            elif isinstance(value, str):
                dictionary[key] = escape(value)
    return dictionary


def format_time(dt):
    toUTC = round((datetime.now() - datetime.utcnow()).seconds / 3600)
    additionDirection = '+'
    if toUTC < 0:
        additionDirection = '-'
    return dt.strftime(f"%d %b %Y %H:%M:%S UTC{additionDirection}0{toUTC}:00")


def make_response(message: str = "", status: int = 200, **kwargs):
    resp = Response(json.dumps(escape_dict({
        'status': status,
        'message': message,
        **kwargs
    })), status=status, mimetype="application/json")
    # resp.headers.add("Access-Control-Allow-Origin", "*")
    return resp


def is_logged_in():
    return not (session.get('mp-user', None) is None)


def require_auth():
    def wrap(fn):
        @wraps(fn)
        def dec(*args, **kwargs):
            if not is_logged_in():
                return make_response("Not authorised: Sign in required.", 401)
            return fn(*args, **kwargs)

        return dec

    return wrap


def socket_get_user(private_auth_code):
    db = Database()
    db.select('SELECT * FROM users WHERE private_auth_code=?', (private_auth_code,))
    results = db.fetchall()
    db.close()
    if results and len(results) > 0:
        if results[0]['profile_image_file_name'] is None or results[0]['profile_image_file_name'] == '':
            results[0]['profile_image_file_name'] = 'default.jpg'
    return results[0] if len(results) > 0 else None


def socket_get_tables(rooms):
    tables = []
    if rooms:
        for room in rooms:
            try:
                r = int(room)
                tables.append(r)
            except ValueError:
                pass
    return tables


def socket_require_auth(data):
    authenticated = False
    if 'auth' in data.keys():
        results = socket_get_user(data['auth'])
        if results:
            authenticated = len(results) > 0
    if not authenticated:
        emit("NOT_AUTHORISED")
    return authenticated


def socket_require_admin(data):
    authenticated = socket_require_auth(data)
    if authenticated:
        db = Database()
        db.select('SELECT private_auth_code FROM users WHERE is_admin=1 AND private_auth_code=?', (data['auth'],))
        results = db.fetchall()
        db.close()
        authenticated = len(results) > 0
    if not authenticated:
        emit('NOT_AUTHORISED')
    return authenticated


def get_recipes_from_db(table_number=None, table_recipe_id=None):
    recipes = []
    recipe_names = []
    db = Database()
    if table_recipe_id is None and table_number is not None:
        result = db.select('SELECT c.`category` AS `category`, s.`section` AS `section`, rs.`recipe` AS '
                           '`recipe`, `tr`.`submitted` AS `submitted`, tr.`table_recipe_id` AS `table_recipe_id`, '
                           'tr.`ordered_by` AS `ordered_by`, tr.`submitted_by` AS `submitted_by` FROM `table_recipes` '
                           'tr INNER JOIN '
                           '`recipes` r ON tr.`recipe` = r.`recipe` INNER JOIN `recipe_sections` rs ON '
                           'r.`recipe` = rs.`recipe` INNER JOIN `sections` s ON rs.`section` = s.`section` '
                           'INNER JOIN `categories` c ON s.`category` = c.`category` WHERE tr.`table_number` '
                           '= ? GROUP BY tr.`time_added`, tr.`table_recipe_id`, tr.`ordered_by`, tr.`submitted`, '
                           'tr.`submitted_by`, s.`sort_order`, s.`section`, '
                           'rs.`recipe`, r.`sort_order` ORDER BY tr.`time_added`, s.`sort_order`, s.`section`, '
                           'r.sort_order;', (table_number,))
    elif table_recipe_id is not None:
        result = db.select('SELECT c.`category` AS `category`, s.`section` AS `section`, rs.`recipe` AS '
                           '`recipe`, `tr`.`submitted` AS `submitted`, tr.`table_recipe_id` AS `table_recipe_id`, '
                           'tr.`ordered_by` AS `ordered_by`, tr.`submitted_by` AS `submitted_by` FROM `table_recipes` '
                           'tr INNER JOIN '
                           '`recipes` r ON tr.`recipe` = r.`recipe` INNER JOIN `recipe_sections` rs ON '
                           'r.`recipe` = rs.`recipe` INNER JOIN `sections` s ON rs.`section` = s.`section` '
                           'INNER JOIN `categories` c ON s.`category` = c.`category` WHERE tr.`table_recipe_id`=? '
                           'GROUP BY tr.`time_added`, tr.`table_recipe_id`, tr.`ordered_by`, tr.`submitted`, '
                           'tr.`submitted_by`, s.`sort_order`, s.`section`, '
                           'rs.`recipe`, r.`sort_order` ORDER BY tr.`time_added`, s.`sort_order`, s.`section`, '
                           'r.sort_order;', (table_recipe_id,))
    else:
        db.close()
        return recipes
    if result:
        results = db.fetchall()
        if len(results) > 0:
            for recipe in results:
                # Get tags
                result = db.select(
                    'SELECT choice FROM table_recipe_choices WHERE table_recipe_id=? ORDER BY time_added',
                    (recipe['table_recipe_id'],))
                if result:
                    tag_results = db.fetchall()
                    recipe['information'] = [{
                        'table_recipe_id': recipe['table_recipe_id'],
                        'ordered_by': recipe['ordered_by'],
                        'tags': [tag['choice'] for tag in tag_results],
                        'submitted': bool(recipe['submitted']),
                        'submitted_by': recipe['submitted_by']
                    }]
                    del recipe['table_recipe_id']
                    del recipe['ordered_by']
                    del recipe['submitted_by']
                if recipe['recipe'] not in recipe_names:
                    # Get ingredients
                    result = db.select(
                        'SELECT measure, unit, ingredient FROM recipe_ingredients WHERE recipe=?',
                        (recipe['recipe'],))
                    if result:
                        recipe['ingredients'] = db.fetchall()
                    recipe['quantity'] = 1
                    recipe['submitted'] = 1 if recipe['information'][0]['submitted'] else 0
                    recipe_names.append(recipe['recipe'])
                    recipes.append(recipe)
                else:
                    existingRecipe = None
                    for r in recipes:
                        if r['recipe'] == recipe['recipe']:
                            existingRecipe = r
                            break
                    existingRecipe['quantity'] += 1
                    existingRecipe['submitted'] += 1 if recipe['information'][0]['submitted'] else 0
                    existingRecipe['information'].append(recipe['information'][0])
    db.close()
    return recipes


def get_recipe_from_db(table_recipe_id):
    return get_recipes_from_db(table_recipe_id=table_recipe_id)


def require_admin():
    def wrap(fn):
        @wraps(fn)
        def dec(*args, **kwargs):
            is_admin = False
            if is_logged_in():
                db = Database()
                db.select('SELECT is_admin FROM users WHERE is_admin=1 AND private_auth_code=?',
                          (session.get('mp-user'),))
                results = db.fetchall()
                if len(results) > 0:
                    is_admin = True
            else:
                return make_response("Not authorised: Sign in required.", 401)
            if is_admin:
                return fn(*args, **kwargs)
            return make_response("Not authorised: Signed in user has insufficient privileges.", 401)

        return dec

    return wrap


def generate_media_id(filename):
    return base64.urlsafe_b64encode(
        hashlib.sha1(
            filename.join(
                random.SystemRandom().choice(
                    string.ascii_uppercase + string.ascii_lowercase + string.digits)
                for _ in range(10)).encode('ascii')).digest()).decode()


@require_auth()
def upload_file(file, path=''):
    filename = None
    ext = None
    if request.method == "POST" and file is not None:
        ext = file.content_type.split('/')[-1].lower()
        if ext in ALLOWED_FILES:
            if ext == 'jpeg':
                ext = 'jpg'
            while filename is None or os.path.exists(f'../public/media{path}/{filename}.{ext}'):
                filename = generate_media_id(file.filename)
            file.save(f'../public/media{path}/{filename}.{ext}')
    return f"{filename}.{ext}" if filename is not None else filename


@require_auth()
def delete_file(filename, path=''):
    if filename is not None and filename != "" and os.path.exists(f'../public/media{path}/{filename}'):
        return os.remove(f'../public/media{path}/{filename}')
    return False


def parse_float(number):
    result = 0.0
    try:
        result = float(number)
    except ValueError:
        try:
            parts = str(number).split(' ')
            total = 0.0
            for part in parts:
                total += float(Fraction(part))
            return total
        except ValueError:
            pass
    return result


def reduce_stock_count(ingredient_name, measure, unit, db=None, auto_commit=True):
    count = -1
    use_own_db = db is None
    if use_own_db:
        db = Database()
    unit_result = db.select('SELECT conversion_to_grams FROM units WHERE unit=? LIMIT 1', (unit,))
    if unit_result:
        unit_in_grams = db.fetchone()['conversion_to_grams']
        ingredient_result = db.select('SELECT unit_quantity_in_g AS `mass`, count, ordered_below_availability FROM ingredients WHERE ingredient=? LIMIT 1', (ingredient_name,))
        if ingredient_result:
            ingredient = db.fetchone()
            ingredient_mass = float(ingredient['mass'])
            if ingredient['count'] is not None:
                ingredient_count = float(ingredient['count'])
                ingredient_ordered_below_availability = float(ingredient['ordered_below_availability'])
                ingredient_count_in_grams = ingredient_count * ingredient_mass
                reduce_by_in_grams = measure * float(unit_in_grams)
                new_ingredient_count_in_grams = (ingredient_count_in_grams - reduce_by_in_grams)
                new_ingredient_count = max(0.0, float(max(0.0, new_ingredient_count_in_grams) / ingredient_mass) - ingredient_ordered_below_availability)
                result = db.update('UPDATE ingredients SET count=? WHERE ingredient=?', (new_ingredient_count, ingredient_name), auto_commit)
                if result:
                    count = new_ingredient_count
                    result = db.update('UPDATE ingredients SET ordered_below_availability=? WHERE ingredient=?', (max(0.0, (ingredient_ordered_below_availability - (new_ingredient_count_in_grams / ingredient_mass))), ingredient_name), auto_commit)
            else:
                count = None
    if use_own_db:
        db.close()
    return count


def reduce_recipe_count(recipe_name, db=None, amount=1.0):
    count = -1
    use_own_db = db is None
    if use_own_db:
        db = Database()
    ingredients_result = db.select('SELECT ri.ingredient, ri.measure, ri.unit, i.unit_quantity_in_g FROM recipe_ingredients ri INNER JOIN ingredients i on ri.ingredient = i.ingredient WHERE ri.recipe=?', (recipe_name,))
    if ingredients_result:
        ingredients = db.fetchall()
        recipe_counts = []
        for ing in ingredients:
            new_stock_count = reduce_stock_count(ing['ingredient'], (parse_float(ing['measure']) * amount), ing['unit'], db=db,
                                                 auto_commit=False)
            if new_stock_count is not None:
                unit_result = db.select('SELECT conversion_to_grams FROM units WHERE unit=? LIMIT 1', (ing['unit'],))
                if unit_result:
                    unit = db.fetchone()
                    measure = parse_float(ing['measure'])
                    measure_in_grams = (1 if measure <= 0 else measure) * abs(amount) * float(unit['conversion_to_grams'] if unit['conversion_to_grams'] is not None else 1)
                    new_count = max(0, floor(((new_stock_count * float(ing['unit_quantity_in_g'])) / measure_in_grams)))
                    recipe_counts.append(new_count)
        count = min(recipe_counts) if len(recipe_counts) > 0 else None
    if count is None or count >= 0:
        db.commit()
    if use_own_db:
        db.close()
    return count


def get_measure_in_grams(measure, unit, db=None, unit_quantity_in_g=0.0):
    measure_in_grams = None
    use_own_db = db is None
    if use_own_db:
        db = Database()
    unit_result = db.select('SELECT conversion_to_grams FROM units WHERE unit=? LIMIT 1', (unit,))
    if unit_result:
        unit = db.fetchone()
        measure = parse_float(measure)
        measure_in_grams = abs(measure) * float(
            unit['conversion_to_grams'] if unit['conversion_to_grams'] is not None else unit_quantity_in_g)
    if use_own_db:
        db.close()
    return measure_in_grams


def get_recipe_count(recipe_name, db=None):
    count = None
    use_own_db = db is None
    if use_own_db:
        db = Database()
    ingredients_result = db.select(
        'SELECT ri.ingredient, ri.measure, ri.unit, i.unit_quantity_in_g, i.count FROM recipe_ingredients ri INNER JOIN ingredients i on ri.ingredient = i.ingredient WHERE ri.recipe=?',
        (recipe_name,))
    if ingredients_result:
        ingredients = db.fetchall()
        recipe_counts = []
        for ing in ingredients:
            if ing['count'] is None:
                continue
            measure_in_grams = get_measure_in_grams(ing['measure'], ing['unit'], db=db, unit_quantity_in_g=float(ing['unit_quantity_in_g']))
            count = max(0, floor(((float(ing['count']) * float(ing['unit_quantity_in_g'])) / measure_in_grams)))
            recipe_counts.append(count)
        count = min(recipe_counts) if len(recipe_counts) > 0 else None
    if use_own_db:
        db.close()
    return count
