import copy

from flask import Flask
from flask_socketio import SocketIO, join_room, leave_room, emit, rooms
from flask_cors import CORS, cross_origin
from datetime import datetime, timedelta


from dependencies import *

app = Flask(__name__, static_folder="../public")

host = "0.0.0.0"
domain = "matts-macbook-pro.local"
port = 3001
debug = True

app.config['MAX_CONTENT_PATH'] = 10 * 1024 ** 2
app.config['SESSION_COOKIE_DOMAIN'] = f".{domain}"
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=1)
app.config['SERVER_NAME'] = f"{domain}:{str(port)}"
app.config['SESSION_COOKIE_NAME'] = 'mp-session'
app.config['SECRET_KEY'] = '\xd1\xeb\xe7SO\xe5\xa3Q\x88G\xbb\xfc\x13\xd0\xb2(\x95\xbek\xe4\xb0zpr'
app.config['UPLOAD_FOLDER'] = app.static_folder + "/media"
app.config['CORS_HEADERS'] = 'Content-type'
app.config['CORS_ORIGINS'] = '*'
app.config['THREADED'] = True


# Blueprints

from auth import auth
from recipes import recipes
from users import users

app.register_blueprint(auth)
app.register_blueprint(recipes)
app.register_blueprint(users)

socketio = SocketIO(app, cors_allowed_origins=app.config['CORS_ORIGINS'])


cors = CORS(app, supports_credentials=True)


@app.route('/')
def welcome():
    return make_response("Welcome to the Magic Pad API", 200)


@app.route('/tables', methods=['GET'])
@require_auth()
def get_tables():
    db = Database()
    result = db.select('SELECT t.`table_number` AS `table_number`, COUNT(tr.table_recipe_id) AS `items`, CAST(IF(SUM(tr.submitted) IS NOT NULL, SUM(tr.submitted), 0) AS UNSIGNED) AS `submitted` FROM `tables` t LEFT JOIN table_recipes tr ON t.table_number = tr.table_number GROUP BY t.table_number')
    results = []
    if result:
        results = db.fetchall()
        for table in results:
            table['recipes'] = []
        # Get recipes
        result = db.select('SELECT tr.table_recipe_id, tr.table_number, tr.ordered_by, tr.submitted, s.category, c.sort_order FROM table_recipes tr INNER JOIN recipe_sections rs ON rs.recipe=tr.recipe INNER JOIN sections s ON rs.section = s.section INNER JOIN categories c on s.category = c.category ORDER BY tr.table_number, c.sort_order')
        if result:
            recipe_results = db.fetchall()
            for table in results:
                for recipe in recipe_results:
                    if recipe['table_number'] == table['table_number']:
                        temp = copy.deepcopy(recipe)
                        del temp['table_number']
                        temp['submitted'] = bool(temp['submitted'])
                        table['recipes'].append(temp)
                    #     Because ordered by table number, optimise...
                    if recipe['table_number'] > table['table_number']:
                        break
    db.close()
    return make_response(
        f'{len(results)} table{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), **{
            "tables": results
        })


@app.route('/categories', methods=['GET'])
def get_categories():
    db = Database()
    db.select('SELECT category FROM categories WHERE hidden=0 ORDER BY sort_order ASC')
    results = db.fetchall()
    db.close()
    return make_response(
        f'{len(results)} categor{"ies" if not (len(results) == 1) else "y"} found',
        (404 if len(results) == 0 else 200), **{
            "categories": results
        })


@app.route('/<string:category>/sections', methods=['GET'])
def get_sections(category):
    category = category.title()
    db = Database()
    result = db.select('SELECT section FROM sections WHERE category=?', (category,))
    if result:
        results = db.fetchall()
    db.close()
    return make_response(
        f'{len(results)} section{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), **{
            "sections": results
        })


@app.route('/<string:category>/recipes', methods=['GET'])
def get_category_recipes(category):
    category = category.title()
    db = Database()
    results = []
    result = db.select('SELECT c.`category` AS `category`, s.`section` AS `section`, rs.`recipe` AS `recipe` FROM '
                       'categories c INNER JOIN sections s on c.`category` = s.`category` INNER JOIN '
                       'recipe_sections rs on s.section = rs.section '
                       'INNER JOIN recipes r on rs.`recipe` = r.`recipe` WHERE c.category = ? GROUP BY '
                       's.`sort_order`,  s.`section`,  rs.`recipe`,  r.sort_order ORDER BY s.`sort_order`,  '
                       's.`section`,  r.sort_order', (category,))
    if result:
        results = db.fetchall()
        if len(results) > 0:
            for recipe in results:
                # Get ingredients
                result = db.select('SELECT ri.measure, ri.unit, ri.ingredient, i.count, i.unit_quantity_in_g FROM recipe_ingredients ri INNER JOIN ingredients i on ri.ingredient = i.ingredient WHERE ri.recipe=?', (recipe['recipe'],))
                if result:
                    recipe['ingredients'] = db.fetchall()
                    recipe['count'] = get_recipe_count(recipe['recipe'], db=db)
                    recipe['count'] = float(recipe['count']) if recipe['count'] is not None else None
                    for ing in recipe['ingredients']:
                        ing['count'] = float(ing['count']) if ing['count'] is not None else None
                        measure_in_grams = get_measure_in_grams(ing['measure'], ing['unit'], db=db, unit_quantity_in_g=float(ing['unit_quantity_in_g']))
                        ing['required_units'] = (measure_in_grams / float(ing['unit_quantity_in_g'])) if (float(ing['unit_quantity_in_g']) != 0 if ing['unit_quantity_in_g'] is not None else False) and measure_in_grams is not None else 0
    db.close()
    return make_response(
        f'{len(results)} recipe{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), **{
            "recipes": results
        })


@app.route('/ingredients', methods=['GET'])
def get_ingredients():
    db = Database()
    result = db.select('SELECT ingredient, unit_quantity_in_g, `count`, time_updated FROM ingredients')
    if result:
        ingredients = [{'ingredient': ing['ingredient'], 'count': (float(ing['count']) if ing['count'] is not None else None), 'unit_quantity_in_g': float(ing['unit_quantity_in_g']), 'time_updated': ing['time_updated']} for ing in db.fetchall()]
        for ing in ingredients:
            result = db.select('SELECT recipe FROM recipe_ingredients WHERE ingredient=?', (ing['ingredient'],))
            ing['recipes'] = db.fetchall() if result else []
        db.close()
        return make_response(
        f'{len(ingredients)} ingredient{"s" if not (len(ingredients) == 1) else ""} found',
        (404 if len(ingredients) == 0 else 200), **{
            "ingredients": ingredients
        })
    db.close()
    return make_response("Could not get ingredients: An unknown error occurred.", 500)


@app.route('/units', methods=['GET'])
def get_units():
    db = Database()
    result = db.select('SELECT unit, conversion_to_grams FROM units')
    if result:
        units = db.fetchall()
        db.close()
        return make_response(
        f'{len(units)} unit{"s" if not (len(units) == 1) else ""} found',
        (404 if len(units) == 0 else 200), **{
            "units": units
        })
    db.close()
    return make_response("Could not get units: An unknown error occurred.", 500)

# SOCKETS START


@socketio.on('LOCATE_USERS')
def request_users_at_table(data):
    if socket_require_auth(data):
        emit('LOCATE', {'for': request.sid}, broadcast=True, include_self=False)


@socketio.on('SEND_LOCATION')
def send_user_at_table(data):
    if socket_require_auth(data):
        if 'table_number' in data:
            user = socket_get_user(data['auth'])
            if user:
                if 'for' in data:
                    emit('LOCATION', {'table_number': data['table_number'], 'username': user['username'], 'image': f"/media/profiles/{user['profile_image_file_name']}"}, to=data['for'])
                else:
                    emit('LOCATION', {'table_number': data['table_number'], 'username': user['username'],
                                      'image': f"/media/profiles/{user['profile_image_file_name']}"}, broadcast=True, include_self=False)


@socketio.on('LEAVE_TABLE')
def leave_table(data):
    if socket_require_auth(data):
        user = socket_get_user(data['auth'])
        if data['tableNumber']:
            leave_room(str(data['tableNumber']))
            emit('LEAVE_TABLE_ACCEPTED', str(data['tableNumber']))
            if user:
                n_data = {
                    'body': f"{user['first_name']} {user['last_name']} left the table.",
                    'image': f"/media/profiles/{user['profile_image_file_name']}"
                }
                emit('NOTIFY', n_data, to=str(data['tableNumber']), include_self=False)
        else:
            for roomIndex in range(1, len(socket_get_tables(rooms()))):
                room = roomIndex
                leave_room(room)
                emit('LEAVE_TABLE_ACCEPTED', room)
                if user:
                    n_data = {
                        'body': f"{user['first_name']} {user['last_name']} left the table.",
                        'image': f"/media/profiles/{user['profile_image_file_name']}"
                    }
                    emit('NOTIFY', n_data, to=room, include_self=False)
                    send_user_at_table({'auth': data['auth'], 'table_number': None})


@socketio.on('JOIN_TABLE')
def join_table(data):
    if socket_require_auth(data):
        if data['tableNumber']:
            tables = socket_get_tables(rooms())
            for table in tables:
                if str(table) != str(data['tableNumber']):
                    leave_table({'auth': data['auth'], 'tableNumber': table})
            join_room(str(data['tableNumber']))
            emit('JOIN_TABLE_ACCEPTED', str(data['tableNumber']))
            user = socket_get_user(data['auth'])
            if user:
                # Emit recipes to client
                recipes = get_recipes_from_db(table_number=data['tableNumber'])
                if len(recipes) > 0:
                    emit('ADD_EXTERNAL_RECIPES', {
                        'recipes': recipes
                    })
                n_data = {
                    'body': f"{user['first_name']} {user['last_name']} joined the table.",
                    'image': f"/media/profiles/{user['profile_image_file_name']}"
                }
                emit('NOTIFY', n_data, to=str(data['tableNumber']), include_self=False)
                send_user_at_table({'auth': data['auth'], 'table_number': str(data['tableNumber'])})


@socketio.on('ADD_RECIPE')
def add_recipe_to_table(data):
    if 'recipe' in data and data['recipe'] is not None:
        recipe = data['recipe']
        if socket_require_auth(data):
            tables = socket_get_tables(rooms())
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                for table in tables:
                    if 'sequence' in data:
                        try:
                            sequence = data['sequence']
                            db.select("SELECT c.category, tr.table_recipe_id FROM table_recipes tr INNER JOIN recipe_sections rs on tr.recipe = rs.recipe INNER JOIN sections s on rs.section = s.section INNER JOIN categories c on s.category = c.category WHERE tr.table_number=? AND tr.recipe=? ORDER BY tr.table_recipe_id", (table, recipe['recipe']))
                            results = db.fetchall()
                            if len(results) >= sequence:
                                category = results[sequence - 1]['category']
                                result = db.update('UPDATE table_recipes SET table_number=?, recipe=?, ordered_by=? WHERE table_recipe_id=?', (table, recipe['recipe'], user['username'], results[sequence - 1]['table_recipe_id']))
                                if result:
                                    emit('ADD_RECIPE_ACCEPTED',
                                         {'table_number': table, 'table_recipe_id': results[sequence - 1]['table_recipe_id'], 'recipe': recipe['recipe']})
                                    emit('ADD_EXTERNAL_RECIPES', {
                                        'recipes': get_recipe_from_db(results[sequence - 1]['table_recipe_id'])
                                    }, to=str(table), include_self=False)
                                    emit('EXTERNAL_RECIPES_UPDATE', {'added_recipes': [{'ordered_by': user['username'], 'table_number': table, 'category': category, 'table_recipe_id': results[sequence - 1]['table_recipe_id'], 'submitted': False}], 'deleted_recipes': []}, broadcast=True, include_self=False)
                                    n_data = {
                                        'body': f"{user['first_name']} {user['last_name']} took an order of {recipe['recipe']}.",
                                        'image': f"/media/profiles/{user['profile_image_file_name']}"
                                    }
                                    emit('NOTIFY', n_data, to=str(table), include_self=False)
                                #     Reduce stock count
                                new_recipe_count = reduce_recipe_count(recipe['recipe'], db=db)
                                if new_recipe_count is not None and new_recipe_count > -1:
                                    result = db.select('SELECT ingredient, count FROM ingredients WHERE ingredient IN (SELECT ingredient FROM recipe_ingredients WHERE recipe=?)', (recipe['recipe'],))
                                    if result:
                                        ingredients = db.fetchall()
                                        for ing in ingredients:
                                            emit('SET_INGREDIENT_COUNT', {
                                                'ingredient': ing['ingredient'],
                                                'count': float(ing['count']) if ing['count'] is not None else None,
                                                'time_updated': datetime.now().strftime("%a, %d %b %Y %H:%M:%S %Z")
                                            }, broadcast=True)
                                return
                        except ValueError:
                            pass
                    result = db.insert('INSERT INTO table_recipes (table_number, recipe, ordered_by) VALUES (?, ?, ?)', (table, recipe['recipe'], user['username']))
                    if result:
                        insert_id = result.getlastrowid()
                        emit('ADD_RECIPE_ACCEPTED', {'table_number': table, 'table_recipe_id': insert_id, 'recipe': recipe['recipe']})
                        emit('ADD_EXTERNAL_RECIPES', {
                            'recipes': get_recipe_from_db(insert_id)
                        }, to=str(table), include_self=False)
                        result = db.select('SELECT c.category FROM table_recipes tr INNER JOIN recipe_sections rs on tr.recipe = rs.recipe INNER JOIN sections s on rs.section = s.section INNER JOIN categories c on s.category = c.category WHERE table_recipe_id=? LIMIT 1', (insert_id,))
                        if result:
                            result = db.fetchone()
                            category = result['category']
                            emit('EXTERNAL_RECIPES_UPDATE', {'added_recipes': [{'ordered_by': user['username'], 'table_number': table, 'category': category, 'table_recipe_id': insert_id, 'submitted': False}], 'deleted_recipes': []}, broadcast=True, include_self=False)
                        n_data = {
                            'body': f"{user['first_name']} {user['last_name']} took an order of {recipe['recipe']}.",
                            'image': f"/media/profiles/{user['profile_image_file_name']}"
                        }
                        emit('NOTIFY', n_data, to=str(table), include_self=False)
                    new_recipe_count = reduce_recipe_count(recipe['recipe'], db=db)
                    if new_recipe_count is not None and new_recipe_count > -1:
                        result = db.select(
                            'SELECT ingredient, count FROM ingredients WHERE ingredient IN (SELECT ingredient FROM recipe_ingredients WHERE recipe=?)',
                            (recipe['recipe'],))
                        if result:
                            ingredients = db.fetchall()
                            for ing in ingredients:
                                emit('SET_INGREDIENT_COUNT', {
                                    'ingredient': ing['ingredient'],
                                    'count': float(ing['count']) if ing['count'] is not None else None,
                                    'time_updated': datetime.now().strftime("%a, %d %b %Y %H:%M:%S %Z")
                                }, broadcast=True)
            db.close()
    else:
        emit("NOT_AUTHORISED")


@socketio.on('ADD_TAG')
def add_tag_to_recipe(data):
    if 'table_recipe_id' in data and data['table_recipe_id'] is not None and 'tag' in data and data['tag'] is not None:
        table_recipe_id = data['table_recipe_id']
        tag = str(data['tag'])
        if len(tag) > 0 and socket_require_auth(data):
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                result = db.select('SELECT table_number FROM table_recipes WHERE table_recipe_id=? LIMIT 1', (table_recipe_id,))
                if result:
                    results = db.fetchone()
                    if len(results) == 1:
                        table = str(results['table_number'])
                        result = db.insert('INSERT INTO table_recipe_choices (table_recipe_id, choice) VALUES (?, ?)', (table_recipe_id, tag), False)
                        if result:
                            result = db.update('UPDATE table_recipes SET ordered_by=?, submitted=0, submitted_by=NULL WHERE table_recipe_id=?', (user['username'], table_recipe_id), False)
                            if result:
                                db.commit()
                                emit('ADD_TAG_ACCEPTED', {'table_recipe_id': table_recipe_id, 'tag': tag})
                                emit('ADD_EXTERNAL_TAG', {'table_recipe_id': table_recipe_id, 'ordered_by': user['username'], 'tag': tag}, to=table, include_self=False)
                db.close()


@socketio.on('DELETE_TAG')
def delete_tag_from_recipe(data):
    if 'table_recipe_id' in data and data['table_recipe_id'] is not None and 'tag' in data and data['tag'] is not None:
        table_recipe_id = data['table_recipe_id']
        tag = str(data['tag'])
        if len(tag) > 0 and socket_require_auth(data):
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                result = db.select('SELECT table_number FROM table_recipes WHERE table_recipe_id=? LIMIT 1', (table_recipe_id,))
                if result:
                    results = db.fetchone()
                    if len(results) == 1:
                        table = str(results['table_number'])
                        result = db.delete('DELETE FROM table_recipe_choices WHERE table_recipe_id=? AND choice=?', (table_recipe_id, tag), False)
                        if result:
                            result = db.update(
                                'UPDATE table_recipes SET ordered_by=?, submitted=0, submitted_by=NULL WHERE table_recipe_id=?',
                                (user['username'], table_recipe_id), False)
                            if result:
                                db.commit()
                                emit('DELETE_TAG_ACCEPTED', {'table_recipe_id': table_recipe_id, 'tag': tag})
                                emit('DELETE_EXTERNAL_TAG', {'table_recipe_id': table_recipe_id, 'ordered_by': user['username'], 'tag': tag}, to=table, include_self=False)
                db.close()


@socketio.on('DELETE_RECIPE')
def delete_recipe_from_table(data):
    if 'table_recipe_id' in data and data['table_recipe_id'] is not None:
        table_recipe_id = data['table_recipe_id']
        if socket_require_auth(data):
            tables = socket_get_tables(rooms())
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                for table in tables:
                    result = db.select('SELECT c.category, tr.recipe, tr.submitted FROM table_recipes tr INNER JOIN recipe_sections rs on tr.recipe = rs.recipe INNER JOIN sections s on rs.section = s.section INNER JOIN categories c on s.category = c.category WHERE table_recipe_id=? LIMIT 1', (table_recipe_id,))
                    if result:
                        result = db.fetchone()
                        recipe_name = result['recipe']
                        recipe_submitted = bool(result['submitted'])
                        recipe_category = result['category']
                        result = db.delete('DELETE FROM table_recipes WHERE table_recipe_id=?', (table_recipe_id,))
                        if result:
                            emit('DELETE_RECIPE_ACCEPTED',
                                 {'table_number': table, 'table_recipe_id': table_recipe_id})
                            emit('DELETE_EXTERNAL_RECIPE', {
                                'table_recipe_id': table_recipe_id
                            }, to=str(table), include_self=False)
                            emit('EXTERNAL_RECIPES_UPDATE',
                                 {'added_recipes': [],
                                  'deleted_recipes': [{'deleted_by': user['username'],'table_number': table, 'category': recipe_category, 'table_recipe_id': table_recipe_id, 'submitted': recipe_submitted}]}, broadcast=True, include_self=False)
                            n_data = {
                                'body': f"{user['first_name']} {user['last_name']} removed an order of {recipe_name}.",
                                'image': f"/media/profiles/{user['profile_image_file_name']}"
                            }
                            emit('NOTIFY', n_data, to=str(table), include_self=False)
                            #     Increase stock count
                            new_recipe_count = reduce_recipe_count(recipe_name, db=db, amount=-1.0)
                            if new_recipe_count is not None and new_recipe_count > -1:
                                result = db.select(
                                    'SELECT ingredient, count FROM ingredients WHERE ingredient IN (SELECT ingredient FROM recipe_ingredients WHERE recipe=?)',
                                    (recipe_name,))
                                if result:
                                    ingredients = db.fetchall()
                                    for ing in ingredients:
                                        emit('SET_INGREDIENT_COUNT', {
                                            'ingredient': ing['ingredient'],
                                            'count': float(ing['count']) if ing['count'] is not None else None,
                                            'time_updated': datetime.now().strftime("%a, %d %b %Y %H:%M:%S %Z")
                                        }, broadcast=True)
                db.close()


@socketio.on('SUBMIT_RECIPE')
def submit_recipe_on_table(data):
    if socket_require_auth(data):
        if 'table_recipe_id' in data:
            table_recipe_id = data['table_recipe_id']
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                result = db.update('UPDATE table_recipes SET submitted_by=?, submitted=1, time_submitted=CURRENT_TIMESTAMP WHERE table_recipe_id=? AND submitted=0', (user['username'], table_recipe_id))
                if result:
                    tables = socket_get_tables(rooms())
                    result = db.select('SELECT recipe FROM table_recipes WHERE table_recipe_id=? LIMIT 1', (table_recipe_id,))
                    recipe = db.fetchone()
                    n_data = None
                    if result:
                        recipe = recipe['recipe']
                        n_data = {
                            'body': f"{user['first_name']} {user['last_name']} put through an order of {recipe}.",
                            'image': f"/media/profiles/{user['profile_image_file_name']}"
                        }
                    for table in tables:
                        table = str(table)
                        emit('RECIPE_SUBMITTED', {'table_recipe_id': table_recipe_id, 'submitted_by': user['username']}, to=table, include_self=False)
                        if n_data is not None:
                            emit('NOTIFY', n_data, to=table, include_self=False)
                db.close()


@socketio.on('RESET_TABLE')
def reset_table(data):
    if socket_require_auth(data):
        if 'table_number' in data:
            table = data['table_number']
            try:
                table = int(table)
            except ValueError:
                return
            user = socket_get_user(data['auth'])
            if user:
                db = Database()
                result = db.select('SELECT c.category, tr.table_recipe_id, tr.recipe, tr.submitted FROM table_recipes tr INNER JOIN recipe_sections rs on tr.recipe = rs.recipe INNER JOIN sections s on rs.section = s.section INNER JOIN categories c on s.category = c.category WHERE tr.table_number=? AND (tr.ordered_by=? OR ? IN (SELECT u.username FROM users u WHERE u.is_admin=1))', (table, user['username'], user['username']))
                if result:
                    results = db.fetchall()
                    success = True
                    for recipe in results:
                        table_recipe_id = recipe['table_recipe_id']
                        result = db.delete('DELETE FROM table_recipes WHERE table_recipe_id=?', (table_recipe_id,), False)
                        if not result:
                            success = False
                            break
                    if success:
                        db.commit()
                        for recipe in results:
                            recipe_name = recipe['recipe']
                            recipe_category = recipe['category']
                            recipe_submitted = recipe['submitted']
                            emit('DELETE_EXTERNAL_RECIPE', {
                                'table_recipe_id': table_recipe_id
                            }, to=str(table), include_self=False)
                            emit('EXTERNAL_RECIPES_UPDATE',
                                 {'added_recipes': [],
                                  'deleted_recipes': [
                                      {'deleted_by': user['username'], 'table_number': table, 'category': recipe_category,
                                       'table_recipe_id': table_recipe_id, 'submitted': recipe_submitted}]}, broadcast=True,
                                 include_self=False)
                            #     Increase stock count
                            new_recipe_count = reduce_recipe_count(recipe_name, db=db, amount=-1.0)
                            if new_recipe_count is not None and new_recipe_count > -1:
                                result = db.select(
                                    'SELECT ingredient, count FROM ingredients WHERE ingredient IN (SELECT ingredient FROM recipe_ingredients WHERE recipe=?)',
                                    (recipe_name,))
                                if result:
                                    ingredients = db.fetchall()
                                    for ing in ingredients:
                                        emit('SET_INGREDIENT_COUNT', {
                                            'ingredient': ing['ingredient'],
                                            'count': float(ing['count']) if ing['count'] is not None else None,
                                            'time_updated': datetime.now().strftime("%a, %d %b %Y %H:%M:%S %Z")
                                        }, broadcast=True)
                        emit('TABLE_RESET', {'reset_by': user['username'], 'table_number': table}, broadcast=True, include_self=True)
                        n_data = {
                            'body': f"{user['first_name']} {user['last_name']} closed Table {table}.",
                            'image': f"/media/profiles/{user['profile_image_file_name']}"
                        }
                        emit('NOTIFY', n_data, to=table, include_self=False)
                db.close()


@socketio.on('RESET_ALL_TABLES')
def reset_all_tables(data):
    if socket_require_admin(data):
        db = Database()
        result = db.select('SELECT table_number FROM tables')
        if result:
            results = db.fetchall()
            for table in results:
                table_number = table['table_number']
                reset_table({'auth': data['auth'], 'table_number': table_number})
        db.close()


@socketio.on('BROADCAST_INGREDIENT_COUNT')
def broadcast_ingredient_count(data):
    if socket_require_admin(data):
        if 'ingredient' in data and 'count' in data and len(data['ingredient']) > 0:
            try:
                cont = False
                if data['count'] is None:
                    count = None
                    cont = True
                else:
                    count = float(data['count'])
                    if count > 0.0:
                        cont = True
                if cont:
                    emit('SET_INGREDIENT_COUNT', {
                        'ingredient': data['ingredient'],
                        'count': count,
                        'time_updated': datetime.now().strftime("%a, %d %b %Y %H:%M:%S %Z")
                    }, broadcast=True)
            except ValueError:
                pass


# SOCKETS END


if __name__ == '__main__':
    socketio.run(app, debug=debug, host=host, port=port, ssl_context=('server.cert', 'server.key'))
