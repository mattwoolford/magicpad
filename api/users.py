from flask import Blueprint, send_from_directory
from flask_accept import accept
from dependencies import *

users = Blueprint('users', __name__, url_prefix="/v1/users", static_folder="../public")


@users.route('/', methods=['GET'])
@require_admin()
def get_users():
    db = Database()
    db.select('SELECT username, first_name, last_name, is_admin, time_added FROM users WHERE user_id NOT IN (SELECT user_id FROM users WHERE private_auth_code=?) ORDER BY first_name, last_name', (session.get('mp-user'),))
    results = db.fetchall()
    db.close()
    return make_response(
        f'{len(results)} user{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), **{
            "users": results
        })


@users.route('/update', methods=['POST'])
@accept('application/json')
@require_auth()
def update_user():
    data = request.get_json()
    db = Database()
    db.select('SELECT first_name, last_name, username, is_admin, allow_quick_sign_in FROM users WHERE private_auth_code=?', (session.get('mp-user'),))
    results = db.fetchall()
    if len(results) > 0:
        user = results[0]
        for key in user.keys():
            if key in data:
                value = data[key]
                if value is None or (isinstance(value, str) and value.strip() == ''):
                    continue
                if key == 'first_name' or key == 'last_name':
                    value = value.strip().title()
                if key == 'username':
                    value = value.strip().lower()
                if key == 'is_admin' or key == 'allow_quick_sign_in':
                    value = 1 if value else 0
                result = db.update(f"UPDATE users SET {key}=? WHERE private_auth_code=?", (value, session.get('mp-user')), False)
                if not result:
                    db.close()
                    return make_response("Could not update user: An unknown error occurred.")
                else:
                    user[key] = value
        db.commit()
        db.close()
        return make_response("1 user updated", 200, **{
            'users': [
                user
            ]
        })
    return make_response(f"Could not update user: No user found.", 500)


@users.route('/update-profile-image', methods=['POST'])
@require_auth()
def update_profile_image():
    if 'profile_image' in request.files:
        file = request.files.get('profile_image')
        if file is not None and file.filename != '':
            filename = upload_file(file, '/profiles')
            if filename:
                db = Database()
                db.select('SELECT profile_image_file_name FROM users WHERE private_auth_code=? LIMIT 1', (session.get('mp-user'),))
                result = db.fetchone()
                old_filename = result['profile_image_file_name']
                if old_filename is not None and old_filename != '':
                    delete_file(old_filename, '/profiles')
                result = db.update('UPDATE users SET profile_image_file_name=? WHERE private_auth_code=?', (filename, session.get('mp-user')))
                if result:
                    return make_response("Success", 200)
                delete_file(filename, '/profiles')
            return make_response("An unknown error occurred.", 500)
    return make_response("No image supplied.", 400)


@users.route('/<string:username>', methods=['GET'])
@require_auth()
def get_user(username):
    db = Database()
    db.select('SELECT username, first_name, last_name, public_auth_code, profile_image_file_name, is_admin, allow_quick_sign_in, time_added FROM users WHERE username=?', (username, ))
    results = db.fetchall()
    if len(results) > 0:
        for result in results:
            result['is_admin'] = bool(result['is_admin']);
            result['allow_quick_sign_in'] = bool(result['allow_quick_sign_in'])
    db.close()
    return make_response(
        f'{len(results)} user{"s" if not (len(results) == 1) else ""} found',
        (404 if len(results) == 0 else 200), **{
            "users": results
        })


@users.route('/<string:username>/profile-image', methods=['GET'])
def get_user_profile_image(username):
    db = Database()
    db.select('SELECT profile_image_file_name FROM users WHERE username=? LIMIT 1', (username, ))
    result = db.fetchone()
    db.close()
    if result:
        filename = result['profile_image_file_name']
        if filename is not None:
            try:
                return send_from_directory(f"{users.static_folder}/media/profiles/", filename)
            except FileNotFoundError:
                pass
    return send_from_directory(f"{users.static_folder}/media/profiles", 'default.jpg')
