import React, {useContext} from "react";

import './SideBar.css';
import {Link} from "react-router-dom";
import {SocketContext} from "../../socket";
import {UserContext} from "../../user";

export default function SideBar(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const handleLogOut = () => {
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/logout`, {
            credentials: "include",
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(async request => {
                const response = await request.json();
                if(response['status'] === 200){
                    if(props['onLogOut'] && typeof props['onLogOut'] === 'function'){
                        props['onLogOut']()
                    }
                }
            });
    };

    const handleCloseClick = () => {
        if(props['open']){
            if(props['onCloseRequest'] && typeof props['onCloseRequest'] === 'function'){
                props['onCloseRequest']();
            }
        }
    }

    const handleCloseTable = table => {
        if(table && user && window.confirm(`Are you sure you want to close and reset Table ${table}? This cannot be undone.`)){
            socket.emit('RESET_TABLE', {auth: user.privateAuthCode, table_number: table});
        }
    }

    const handleCloseAllTables = () => {
        if(user && user.isAdmin && window.confirm('Are you sure you want to close and reset all tables in the restaurant? This cannot be undone.')){
            socket.emit('RESET_ALL_TABLES', {auth: user.privateAuthCode})
        }
    }

    return (
        <div className={"sidebar" + (props['open'] ? " open" : "")}>
            <p className={"close-prompt"} onClick={handleCloseClick}>Close →</p>
            {!!props['table'] && (
                <>
                    <h2>Table Options</h2>
                    <ul onClick={handleCloseClick}>
                        <li onClick={() => {handleCloseTable(props['table'])}}>
                            <p>Close Table {props['table']}</p>
                        </li>
                    </ul>
                </>
            )}
            <h2>Settings</h2>
            <ul onClick={handleCloseClick}>
                <Link to={'/profile'}>
                    <li>
                        <p>My Profile</p>
                    </li>
                </Link>
            </ul>
            {!!props['showAdminOptions'] ? (
                <>
                <h2>Admin Options</h2>
                <ul onClick={handleCloseClick} >
                    <li onClick={handleCloseAllTables}>
                        <p>Close All Tables</p>
                    </li>
                    <Link to={'/recipes'}>
                        <li>
                            <p>Manage Recipes</p>
                        </li>
                    </Link>
                    <Link to={'/stock'}>
                        <li>
                            <p>Manage Stock List</p>
                        </li>
                    </Link>
                    <Link to={'/users'}>
                        <li>
                            <p>Manage Users</p>
                        </li>
                    </Link>
                </ul>
                </>
            ) : null}
            <ul>
                <li onClick={() => {handleCloseClick(); handleLogOut();}}>
                    <p>Sign Out</p>
                </li>
            </ul>
        </div>
    )

}
