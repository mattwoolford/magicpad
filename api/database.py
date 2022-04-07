import mysql
from mysql.connector import connect, errorcode


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


class Database:
    def __init__(self):
        self.config = {
            'user': 'magic_pad',
            'password': 'password',
            'host': '127.0.0.1',
            'database': 'magic_pad',
            'auth_plugin': 'mysql_native_password'
        }
        # Open connection
        self.conn = connect(**self.config)
        self.cursor = self.conn.cursor(prepared=True)

    def close(self):
        self.conn.close()

    def commit(self):
        self.conn.commit()

    def delete(self, query, custom_data=None, auto_commit=True):
        return self._execute(query, custom_data, auto_commit)

    def _execute(self, query, custom_data=None, require_commit=True):
        try:
            if custom_data is not None:
                self.cursor.execute(query, custom_data)
            else:
                self.cursor.execute(query)
            if require_commit:
                self.commit()
            return self.cursor
        except mysql.connector.Error as e:
            if e.errno == errorcode.ER_ACCESS_DENIED_ERROR:
                print("Could not connect to database: Incorrect credentials")
            elif e.errno == errorcode.ER_BAD_DB_ERROR:
                print("Could not locate database")
            else:
                print(e)
            return False

    def fetchall(self):
        results = self.cursor.fetchall()
        if results is None:
            return None
        return escape_dict([dict(zip([col[0] for col in self.cursor.description], row)) for row in results])

    def fetchmany(self, size):
        results = self.cursor.fetchmany(size)
        if results is None:
            return None
        return escape_dict([dict(zip([col[0] for col in self.cursor.description], row)) for row in results])

    def fetchone(self):
        result = self.cursor.fetchone()
        if result is None:
            return None
        return escape_dict(dict(zip([col[0] for col in self.cursor.description], result)))

    def flush(self):
        self.close()
        self.conn = connect(**self.config)
        self.cursor = self.conn.cursor(prepared=True)
        return self

    def insert(self, query, custom_data=None, auto_commit=True):
        return self._execute(query, custom_data, auto_commit)

    def select(self, query, custom_data=None):
        return self._execute(query, custom_data, False)

    def update(self, query, custom_data=None, auto_commit=True):
        return self._execute(query, custom_data, auto_commit)
