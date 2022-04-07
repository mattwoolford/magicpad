import React, {useEffect, useRef, useState} from "react";

import './ManageUsers.css';
import Page from "../Page/Page";
import CheckBox from "../CheckBox/CheckBox";
import LoadingIcon from "../LoadingIcon/LoadingIcon";

export default function ManageUsers(props){

    const [loading, setLoading] = useState(false);

    const [mode, setMode] = useState('add');
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState(null);

    const [errorMessage, setErrorMessage] = useState();
    const [responseMessage, setResponseMessage] = useState();

    const [firstName, setFirstName] = useState(null);
    const [lastName, setLastName] = useState(null);
    const [username, setUsername] = useState(null);
    const [admin, setAdmin] = useState(false);
    const [requirePasswordReset, setRequirePasswordReset] = useState(false);

    const modeSelector = useRef();
    const usernameRef = useRef();

    const getUsers = () => {
        setLoading(true);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(async request => {
                if(request.status === 200){
                    const response = await request.json();
                    setUsers(response['users']);
                }
                setLoading(false);
            })
            .catch(e => {
                setLoading(false);
            })
    };

    const handleSelectChange = e => {
        setFirstName(null);
        setLastName(null);
        setUsername(null);
        setErrorMessage(null);
        setResponseMessage(null);
        setAdmin(false);
        setRequirePasswordReset(false);
        const value = e.target.value;
        if(value === ''){
            setMode('add');
            setUser(null);
        }
        else{
            let u = users[parseInt(value)];
            setUser(u);
            setFirstName(u['first_name']);
            setLastName(u['last_name']);
            setUsername(u['username']);
            setAdmin(u['is_admin']);
            setMode(parseInt(value));
        }
    };

    const handleSubmitNew = e => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);
        setResponseMessage(null);
        const data = {
            'first_name': firstName,
            'last_name': lastName,
            'username': username,
            'is_admin': admin
        };
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/register`, {
            credentials: 'include',
            body: JSON.stringify(data),
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                switch(request.status){
                    case 409:
                        setErrorMessage('A user with this username already exists.');
                        if(usernameRef.current){
                            usernameRef.current.focus();
                        }
                        break;
                    case 201:
                        setResponseMessage('User registered successfully.');
                        e.target.reset();
                        setFirstName(null);
                        setLastName(null);
                        setUsername(null);
                        getUsers();
                        break;
                    default:
                        setErrorMessage('Could not register user. Please try again later.');
                        break;
                }
                setLoading(false);
            })
            .catch(e => {
                setErrorMessage('Could not register user. Please try again later.');
                setLoading(false);
            });
    };

    const handleFirstNameChange = e => {
        setErrorMessage(null);
        setResponseMessage(null);
        setFirstName(e.target.value === '' ? null : e.target.value);
    };

    const handleLastNameChange = e => {
        setErrorMessage(null);
        setResponseMessage(null);
        setLastName(e.target.value === '' ? null : e.target.value);
    };

    const handleUsernameChange = e => {
        setErrorMessage(null);
        setResponseMessage(null);
        setUsername(e.target.value === '' ? null : e.target.value);
    };

    const handleAdminChange = value => {
        setErrorMessage(null);
        setResponseMessage(null);
        setAdmin(value);
    };

    const handleRequirePasswordResetChange = value => {
        setErrorMessage(null);
        setResponseMessage(null);
        setRequirePasswordReset(value);
    };

    const handleDeleteUser = () => {
        if(!user || !user['username']){
            setErrorMessage('Could not delete user. Please try again later.');
            return;
        }
        setLoading(true);
        if(window.confirm(`Are you sure you want to permanently remove ${user['first_name']} ${user['last_name']} (@${user['username']}) from Magic Pad?`)){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/remove`, {
                credentials: 'include',
                method: 'POST',
                body: JSON.stringify({username: user['username']}),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
                .then(async request => {
                    if(request.status === 200){
                        if(modeSelector.current){
                            modeSelector.current.value = '';
                            setFirstName(null);
                            setLastName(null);
                            setUsername(null);
                            setErrorMessage(null);
                            setAdmin(false);
                            setRequirePasswordReset(false);
                            setMode('add');
                            getUsers();
                        }
                    }
                    else{
                        setErrorMessage('Could not delete user. Please try again later.');
                    }
                    setLoading(false);
                })
                .catch(e => {
                    setErrorMessage('Could not delete user. Please try again later.');
                    setLoading(false);
                });
        }
    }

    const handleUpdateUser = e => {
        e.preventDefault();
        setErrorMessage('');
        setResponseMessage('');
        if(!user || !user['username']){
            setErrorMessage('Could not delete user. Please try again later.');
            return;
        }
        setLoading(true);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/update`, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                'username': user['username'],
                'update': {
                    'first_name': firstName,
                    'last_name': lastName,
                    'username': username,
                    'is_admin': admin
                },
                'require_password_reset': requirePasswordReset
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                if(request.status === 200){
                    user['first_name'] = firstName;
                    user['last_name'] = lastName;
                    user['username'] = username;
                    user['is_admin'] = admin;
                    setRequirePasswordReset(false);
                    setResponseMessage('Changes saved successfully.');
                }
                else{
                    setErrorMessage('Could not update user. Please try again later.');
                }
                setLoading(false);
            })
            .catch(e => {
                setErrorMessage('Could not update user. Please try again later.');
                setLoading(false);
            })
    }

    useEffect(() => {
        getUsers();
    }, []);

    return (
        <Page allowScroll={true}>
            <div className={"manage-users"}>
                {loading ? <LoadingIcon fullscreen/> : null}
                <h1>Manage users on Magic Pad.</h1>
                <form>
                    <h3>Choose a user.</h3>
                    <select defaultValue={''} onChange={handleSelectChange} ref={modeSelector}>
                        <option value={''}>+ Add New</option>
                        {users.map((user, userIndex) => <option key={`user-list-option-${userIndex}`} value={userIndex}>{user['first_name']} {user['last_name']} (@{user['username']})</option>)}
                    </select>
                </form>
                {mode === 'add' ? (
                    <div className={"user-area"}>
                        <form onSubmit={handleSubmitNew}>
                            <h3>Add a new user.</h3>
                            <p className={"response"}>{responseMessage}</p>
                            <p className={"error"}>{errorMessage}</p>
                            <label htmlFor={'new-user-first-name-input'}>First name</label>
                            <input id={'new-user-first-name-input'} type={"text"} placeholder={"First name"} name={"first_name"} maxLength={64} onChange={handleFirstNameChange} />
                            <label htmlFor={'new-user-last-name-input'}>Last name</label>
                            <input id={'new-user-last-name-input'} type={"text"} placeholder={"Last name"} name={"last_name"} maxLength={64} onChange={handleLastNameChange} />
                            <label htmlFor={'new-user-username-input'}>Username</label>
                            <input id={'new-user-username-input'} type={"text"} placeholder={"Username"} name={"username"} ref={usernameRef} maxLength={32} onChange={handleUsernameChange} />
                            <br />
                            <p>This user will be asked to set a password the first time they sign in.</p>
                            <CheckBox key={'new-user-admin-input'} name={"admin"} onChange={handleAdminChange} defaultChecked={admin} label={"Make administrator"} />
                            <br />
                            <input type={"submit"} value={"Add User to Magic Pad"} />
                        </form>
                    </div>
                ) : (
                    <div className={"user-area"}>
                        <form onSubmit={handleUpdateUser}>
                            <h3>Manage User.</h3>
                            <p className={"response"}>{responseMessage}</p>
                            <p className={"error"}>{errorMessage}</p>
                            <label htmlFor={`${user['username']}-field-first_name`}>First name</label>
                            <input id={`${user['username']}-field-first_name`} key={`${user['username']}-field-first_name`} type={"text"} placeholder={"First name"} name={"first_name"} defaultValue={user['first_name']} maxLength={64} onChange={handleFirstNameChange} />
                            <label htmlFor={`${user['username']}-field-last_name`}>Last name</label>
                            <input id={`${user['username']}-field-last_name`} key={`${user['username']}-field-last_name`} type={"text"} placeholder={"Last name"} name={"last_name"} defaultValue={user['last_name']} maxLength={64} onChange={handleLastNameChange} />
                            <label htmlFor={`${user['username']}-field-username`}>Username</label>
                            <input id={`${user['username']}-field-username`} key={`${user['username']}-field-username`} type={"text"} placeholder={"Username"} name={"username"} defaultValue={user['username']} ref={usernameRef} maxLength={32} onChange={handleUsernameChange} />
                            <br />
                            <CheckBox key={`${user['username']}-field-require-password-reset`} name={"require-password-reset"} onChange={handleRequirePasswordResetChange} defaultChecked={requirePasswordReset} label={"Require password to be reset / changed"} />
                            <br />
                            <CheckBox key={`${user['username']}-field-is_admin`} name={"admin"} onChange={handleAdminChange} defaultChecked={admin} label={"Make administrator"} />
                            <br />
                            <input type={"submit"} value={'Save Changes'} />
                            <input type={"button"} value={"Delete User"} onClick={handleDeleteUser} />
                        </form>
                    </div>
                )}
            </div>
        </Page>
    )

}
