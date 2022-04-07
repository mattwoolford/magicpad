import re, hashlib, random, string, smtplib, ssl, binascii, os, secrets
from flask import Blueprint, request, session, current_app
from flask_accept import accept
from database import Database
from validator import Validator
from datetime import timedelta
from dependencies import *

auth = Blueprint('auth', __name__, url_prefix="/v1/auth")


@auth.route('/login', methods=['POST'])
@accept('application/json')
def login_with_password():
    data = request.get_json()
    if 'username' not in data:
        return make_response("Please enter a username.", 400)
    username = data['username'].lower()
    db = Database()
    results = db.select("SELECT user_id, username, first_name, last_name, password,  public_auth_code, is_admin FROM users WHERE username=? LIMIT 1", (username,))
    result = db.fetchone()
    if results and results.rowcount == 1:
        public_auth_code = result['public_auth_code']
        result['is_admin'] = bool(result['is_admin'])
        if result['password'] is None or result['password'] == '':
            v = Validator()
            if 'reset_password' in data and 'password' in data and bool(data['reset_password']):
                password = data['password']
                if v.is_valid(password, 'password'):
                    # Assign reset password
                    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ASCII')
                    password = (salt + binascii.hexlify(hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000))).decode('ascii')
                    result = db.update('UPDATE users SET password=? WHERE username=?', (password, username))
                    if result and result.rowcount == 1:
                        return make_response("Password created successfully. Please sign in.", 201)
                    else:
                        return make_response("An unknown error occurred. Please try again later.", 500)
                else:
                    return make_response("New password must be at least 8 characters long and have at least one uppercase letter, lowercase letter and a number.", 400)
            return make_response("A password reset is required before signing in. Please enter a new password.", 412)
        password = data['password'].encode('utf-8')
        full_password_hash = result['password']
        password_hash = full_password_hash[64:]
        salt = full_password_hash[:64].encode('ascii')
        test_hash = binascii.hexlify(hashlib.pbkdf2_hmac('sha512', password, salt, 100000)).decode('ascii')
        if password_hash == test_hash:
            # Password verified
            # Adopt current one-time-use public auth code as own
            # Create new public auth code
            result['private_auth_code'] = public_auth_code
            new_public_auth_code = secrets.token_urlsafe(32)
            result['public_auth_code'] = new_public_auth_code
            db.update('UPDATE users SET private_auth_code=?, public_auth_code=? WHERE username=?', (public_auth_code, new_public_auth_code, username))
            db.close()
            del result['password']
            response = make_response("Success", 200, **{
                "user": result
            })
            if session.get('mp-user') != result['private_auth_code']:
                session.permanent = True
                session['mp-user'] = result['private_auth_code']
                response.set_cookie('user_private_auth', value=result['private_auth_code'], domain=request.headers['Host'], secure=False,
                                    max_age=timedelta(days=1), path="/", httponly=False)
            return response
    db.close()
    return make_response("Username or password is incorrect.", 401)


@auth.route('/login/public', methods=['POST'])
@accept('application/json')
def login_with_qr_code():
    data = request.get_json()
    if 'username' not in data or len(data['username']) <= 0:
        return make_response("No username provided.", 400)
    username = data['username'].strip().lower()
    if 'auth' not in data:
        return make_response("No access code provided.", 400)
    auth_code = data['auth']
    db = Database()
    result = db.select('SELECT username FROM users WHERE public_auth_code=? AND username<>?', (auth_code, username))
    if result:
        results = db.fetchall()
        if len(results) > 0:
            user = results[0]
            new_public_auth_code = secrets.token_urlsafe(32)
            result = db.update('UPDATE users SET public_auth_code=?, public_auth_last_used=CURRENT_TIMESTAMP WHERE username=? AND (public_auth_last_used IS NULL OR public_auth_last_used < (NOW() - INTERVAL 1 DAY))', (new_public_auth_code, user['username']), False)
            if result:
                new_public_auth_code = secrets.token_urlsafe(32)
                result = db.update('UPDATE users SET private_auth_code=?, public_auth_code=? WHERE username=?', (auth_code, new_public_auth_code, username), False)
                if result:
                    result = db.select(
                        "SELECT user_id, username, first_name, last_name, password, private_auth_code, public_auth_code, is_admin, allow_quick_sign_in FROM users WHERE username=? LIMIT 1", (username,))
                    results = db.fetchall()
                    if result and len(results) > 0:
                        result = results[0]
                        if result['password'] is None or result['password'] == '':
                            db.close()
                            return make_response("Quick sign in is not available because a password reset is required before signing in. Please enter a new password.", 412)
                        if not bool(result['allow_quick_sign_in']):
                            db.close()
                            return make_response("Quick sign in is not enabled on this account.", 401)
                        del result['password']
                        db.commit()
                        response = make_response("Success", 200, **{
                            "user": result
                        })
                        db.close()
                        if session.get('mp-user') != auth_code:
                            session.permanent = True
                            session['mp-user'] = result['private_auth_code']
                            response.set_cookie('user_private_auth', value=result['private_auth_code'],
                                                domain=request.headers['Host'], secure=False,
                                                max_age=timedelta(days=1), path="/", httponly=False)
                        return response
                    db.close()
                    return make_response("Username is incorrect.", 401)
        db.close()
        return make_response("Invalid access code.", 401)
    db.close()
    return make_response("An unknown error occurred.", 500)


@auth.route('/register', methods=['POST'])
@accept('application/json')
@require_admin()
def register():
    data = request.get_json()
    if 'first_name' not in data or 'last_name' not in data or 'username' not in data:
        return make_response("You must provide a username, first name and last name.", 400)
    first_name = data['first_name'].strip().title()
    last_name = data['last_name'].strip().title()
    username = data['username'].strip().lower()
    if first_name == '' or last_name == '' or username == '':
        return make_response("You must provide a username, first name and last name.", 400)
    admin = False
    if 'is_admin' in data:
        admin = bool(data['is_admin'])
    admin = 1 if admin else 0
    db = Database()
    db.select('SELECT username FROM users WHERE username=?', (username,))
    results = db.fetchall()
    if len(results) > 0:
        db.close()
        return make_response(f"Could not register user: User with username @{username} already exists.", 409)
    else:
        new_public_auth_code = secrets.token_urlsafe(32)
        result = db.insert('INSERT INTO users (username, first_name, last_name, is_admin, public_auth_code) VALUES (?, ?, ?, ?, ?)', (username, first_name, last_name, admin, new_public_auth_code))
        db.close()
        if result:
            return make_response('Success', 201)
        else:
            return make_response('Could not register user: An unknown error occurred.', 500)


@auth.route('/update', methods=['POST'])
@accept('application/json')
@require_admin()
def update_user():
    data = request.get_json()
    if 'username' not in data:
        return make_response('Username of account to update is required.', 400)
    username = data['username'].lower()
    if 'update' in data and isinstance(data['update'], dict):
        db = Database()
        db.select('SELECT first_name, last_name, username, is_admin FROM users WHERE username=?', (username, ))
        results = db.fetchall()
        if len(results) > 0:
            user = results[0]
            update = data['update']
            for key in user.keys():
                if key in update:
                    value = update[key]
                    if value is None or (isinstance(value, str) and value.strip() == ''):
                        continue
                    if key == 'first_name' or key == 'last_name':
                        value = value.strip().title()
                    if key == 'username':
                        value = value.strip().lower()
                    if key == 'is_admin':
                        value = 1 if value else 0
                    result = db.update(f"UPDATE users SET {key}=? WHERE username=?", (value, username), False)
                    if not result:
                        db.close()
                        return make_response("Could not update user: An unknown error occurred.")
                    else:
                        user[key] = value
            if 'require_password_reset' in data and bool(data['require_password_reset']):
                result = db.update('UPDATE users SET password=NULL WHERE username=?', (username,))
                if not result:
                    db.close()
                    return make_response("Could not update user: An unknown error occurred.")
            db.commit()
            db.close()
            return make_response("1 user updated", 200, **{
                'users': [
                    user
                ]
            })
        return make_response(f"Could not update user: No user found with username @{username}.")
    return make_response("Success", 200)


@auth.route('/update-password', methods=['POST'])
@accept('application/json')
@require_auth()
def change_user_password():
    data = request.get_json()
    if 'password' not in data:
        return make_response('Not authorised: Your current password is incorrect.', 401)
    if 'new_password' not in data:
        return make_response('You need to supply a new password.', 400)
    db = Database()
    db.select('SELECT password FROM users WHERE private_auth_code=? LIMIT 1', (session.get('mp-user'),))
    result = db.fetchone()
    password = data['password']
    full_password_hash = result['password']
    password_hash = full_password_hash[64:]
    salt = full_password_hash[:64].encode('ascii')
    test_hash = binascii.hexlify(hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)).decode('ascii')
    if password_hash == test_hash:
        new_password = data['new_password']
        if password != new_password:
            v = Validator()
            if v.is_valid(new_password, 'password'):
                salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ASCII')
                new_password = (salt + binascii.hexlify(
                    hashlib.pbkdf2_hmac('sha512', new_password.encode('utf-8'), salt, 100000))).decode('ascii')
                result = db.update('UPDATE users SET password=? WHERE private_auth_code=?', (new_password, session.get('mp-user')))
                db.close()
                if result and result.rowcount == 1:
                    return make_response("Password changed successfully.", 200)
                else:
                    return make_response("An unknown error occurred. Please try again later.", 500)
            else:
                db.close()
                return make_response(
                    "New password must be at least 8 characters long and have at least one uppercase letter, lowercase letter and a number.",
                    400)
        db.close()
        return make_response("Your new password can't be the same as your old password.", 409)
    db.close()
    return make_response('Not authorised: Your current password is incorrect.', 401)


@auth.route('/remove', methods=['POST'])
@accept('application/json')
@require_admin()
def remove_user():
    data = request.get_json()
    if 'username' not in data:
        return make_response('Username of account to delete is required.', 400)
    username = data['username'].lower()
    db = Database()
    db.select('SELECT * FROM users WHERE username=?', (username,))
    results = db.fetchall()
    if len(results) > 0:
        result = db.delete('DELETE FROM users WHERE username=?', (username,))
        if result and result.rowcount > 0:
            return make_response("Success", 200)
        else:
            return make_response("Could not delete user: An unknown error occurred.", 500)
    return make_response(f"Could not delete user: No user found with username @{username}.", 404)


@auth.route('/logout', methods=["GET"])
def logout():
    db = Database()
    db.update('UPDATE users SET private_auth_code=NULL WHERE private_auth_code=?', (session.get('mp-user'),))
    db.close()
    session.clear()
    response = make_response("Success", 200)
    response.headers['Clear-Site-Data'] = "cache, cookies, storage"
    return response
