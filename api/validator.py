from database import Database
from dependencies import is_logged_in
from flask import session
import re


class Validator:

    @staticmethod
    def get_regex(validate_type):
        validate_type = validate_type.lower()
        if validate_type == 'username':
            return "^@?[a-z0-9._]{4,32}$"
        elif validate_type == 'password':
            return "^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[a-zA-Z\d\-_]{8,}$"
        elif validate_type == 'email':
            return "(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
        return None

    def is_valid(self, test, validate_type):
        test = str(test)
        types = validate_type.split('/')
        for validate_type in types:
            if validate_type == '':
                continue
            if self._test(test, validate_type)['is_valid']:
                return True
        return False

    def create_response(self, test, validate_type):
        return self._test(test, validate_type)

    def _test(self, test, validate_type):
        validate_type = validate_type.lower()
        reason = None
        status = 200
        valid = True
        if validate_type == 'username':
            if not re.match(self.get_regex('username'), test):
                status = 400
                reason = f"\"{test}\" is not a valid username."
                valid = False
            else:
                exists = self.username_exists(test)
                reason = "An account with this username already exists." if exists else reason
                valid = not exists
                status = status if valid else 409
        elif validate_type == 'password':
            valid = re.match(self.get_regex('password'), test)
            reason = reason if valid else "You haven't entered a valid password."
            status = status if valid else 400
        elif validate_type == 'email':
            if not re.match(self.get_regex('email'), test):
                status = 400
                reason = f"\"{test}\" is not a valid email address."
                valid = False
            else:
                exists = self.email_exists(test)
                reason = "An account with this email address already exists." if exists else reason
                valid = not exists
                status = status if valid else 409
        elif validate_type == 'text':
            valid = test != '' and test is not None
            reason = reason if valid else "Please check the your information."
            status = status if valid else 400
        return {
            'is_valid': valid,
            'message': reason,
            'status': status
        }

    def username_exists(self, test):
        db = Database()
        if is_logged_in():
            db.select('SELECT * FROM users WHERE username=? AND user_id<>?', (test.lower(), session.get('lp_user')))
        else:
            db.select('SELECT * FROM users WHERE username=?', (test.lower(),))
        results = db.fetchall()
        db.close()
        return len(results) > 0

    def email_exists(self, test):
        db = Database()
        if is_logged_in():
            db.select('SELECT * FROM users WHERE email=? AND user_id<>?', (test.lower(), session.get('lp_user')))
        else:
            db.select('SELECT * FROM users WHERE email=?', (test.lower(),))
        results = db.fetchall()
        db.close()
        return len(results) > 0
