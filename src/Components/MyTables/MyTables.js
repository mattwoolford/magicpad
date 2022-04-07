import React, {useContext, useEffect, useState} from 'react';

import './MyTables.css';
import Page from "../Page/Page";
import {UserContext} from "../../user";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import {Link} from "react-router-dom";
import {SocketContext} from "../../socket";
import useRefreshComponent from "../../useRefreshComponent";

export default function MyTables(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const refreshComponent = useRefreshComponent();

    const [tables, setTables] = useState([]);
    const [ownedTablesCount, setOwnedTablesCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [locationsReceived, setLocationsReceived] = useState(0);

    const findTable = tableNumber => {
        let table = null;
        if(tables && tableNumber){
            for(let t of tables){
                if(t['table_number'] === tableNumber){
                    table = t;
                    break;
                }
            }
        }
        return table;
    }

    const handleSetTable = tableNumber => {
        if(tableNumber && findTable(tableNumber)){
            window.localStorage.setItem('table', tableNumber);
        }
    }

    const getTables = isMounted => {
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/tables`, {
            credentials: 'include'
        })
            .then(async request => {
                if(request.status === 200){
                    const response = await request.json();
                    if(response['tables']){
                        const t = response['tables'];
                        for(let tab of t){
                            tab['users'] = [];
                            tab['owned_table'] = false;
                            let categories = {};
                            if(tab['recipes'] && tab['recipes'].length > 0 && user){
                                for(let recipe of tab['recipes']){
                                    if(recipe['ordered_by'] === user.username){
                                        tab['owned_table'] = true;
                                        setOwnedTablesCount(ownedTablesCount + 1);
                                    }
                                    if(recipe['category']){
                                        if(!Object.keys(categories).includes(recipe['category'])){
                                            categories[recipe['category']] = {
                                                recipes: [],
                                                sort_order: recipe['sort_order'],
                                                submitted: 0
                                            };
                                            delete recipe['sort_order'];
                                        }
                                        delete recipe['sort_order'];
                                        categories[recipe['category']]['recipes'].push(recipe);
                                        if(recipe['submitted']){
                                            categories[recipe['category']]['submitted']++;
                                        }
                                    }
                                }
                            }
                            tab['categories'] = [];
                            for(let category of Object.keys(categories)){
                                tab['categories'].push({category: category, recipes: categories[category]['recipes'], sort_order: categories[category]['sort_order'], submitted: categories[category]['submitted']});
                            }
                            tab['categories'].sort((a, b) => {
                                return a['sort_order'] - b['sort_order'];
                            });
                            if(tab['recipes']) delete tab['recipes'];
                        }
                        if(isMounted){
                            setTables(t);
                            setLoading(false);
                        }
                    }
                }
            });
    }

    const handleReceiveLocation = data => {
        if(data['image'] && tables && tables.length > 0){
            const temp = Array.from(tables);
            for(let table of temp){
                if(data['table_number'] && table['table_number'].toString() === data['table_number'].toString()){
                    if(!table['users'].includes(data['image'])){
                        table['users'].push(data['image']);
                    }
                }
                else if(table['users'].includes(data['image'])){
                    for(let userIndex = 0; userIndex < table['users'].length; userIndex++){
                        table['users'].splice(userIndex, 1);
                    }
                }
            }
            setTables(temp);
            setLocationsReceived(locationsReceived + 1);
            refreshComponent();
        }
    }

    useEffect(() => {
        socket.emit('LOCATE_USERS', {auth: user.privateAuthCode});
    }, [loading]);

    const handleExternalRecipesUpdate = data => {
        if(data['added_recipes'] && tables){
            for(let recipe of data['added_recipes']){
                if(recipe['table_number'] && recipe['table_recipe_id'] && recipe['category'] && recipe['ordered_by']){
                    for(let table of tables){
                        if(table['table_number'].toString() === recipe['table_number'].toString()){
                            for(let category of Object.keys(table['categories'])){
                                if(category === recipe['category']){
                                    let found = false;
                                    for(let rec of table['categories'][category]){
                                        if(rec['table_recipe_id'] === recipe['table_recipe_id']){
                                            found = true;
                                            break;
                                        }
                                    }
                                    if(!found){
                                        table['categories'][category].push(recipe);
                                        table['items']++
                                        if(recipe['submitted']){
                                            table['categories'][category]['submitted']++;
                                            table['submitted']++;
                                        }
                                    }
                                    break;
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }

    const handleCloseTable = table => {
        if(table && user){
            socket.emit('RESET_TABLE', {auth: user.privateAuthCode, table_number: table});
        }
    }

    useEffect(() => {
        socket.on('EXTERNAL_RECIPES_UPDATE', handleExternalRecipesUpdate);

        return () => {
            socket.off('EXTERNAL_RECIPES_UPDATE', handleExternalRecipesUpdate);
        }
    }, [socket])

    useEffect(() => {
        socket.on('LOCATION', handleReceiveLocation);

        return () => {
            socket.off('LOCATION', handleReceiveLocation);
        }

    }, [socket, tables]);

    useEffect(() => {
        let isMounted = true;

        getTables(isMounted);

        const handleTableReset = data => {
            getTables(isMounted);
            if(data['table_number'] && data['table_number'] === window.localStorage.getItem('table')) window.localStorage.removeItem('table');
        }

        socket.on('TABLE_RESET', handleTableReset);

        return () => {
            isMounted = false;
            socket.off('TABLE_RESET', handleTableReset);
        }

    }, []);

    return (
        <Page allowScroll={true}>
            <div className={"my-tables"}>
                {loading && <LoadingIcon fill label={"Loading tables..."}/>}
                <h1>Tables</h1>
                <h2>My Tables</h2>
                {
                    tables && tables.length > 0 && ownedTablesCount && ownedTablesCount > 0 ? (
                        <ul className={"my-tables-list"}>
                            {
                                (tables && tables.length > 0) && tables.map((table, tableIndex) => table['owned_table'] && (
                                    <Link key={`my-tables-list-item-${tableIndex}`} to={'/pad'} onClick={() => {handleSetTable(table['table_number']);}}>
                                        <li className={"my-tables-list-item"}>
                                            <div className={"my-tables-list-item-control-area"}>
                                                <div className={"my-tables-list-item-information-area"}>
                                                    <p>Table {table['table_number']}</p>
                                                </div>
                                                <div className={"my-tables-list-item-users-area"}>
                                                    {
                                                        table['users'] && table['users'].map((user, userIndex) => (userIndex < 4) && (
                                                            <img key={`my-tables-list-item-user-${userIndex}`} src={user} alt={`Table ${table['table_number']} team member`} />
                                                        ))
                                                    }
                                                </div>
                                                <form className={"my-tables-list-item-options-area"}>
                                                    <input type={"submit"} value={`Close Table ${table['table_number']}`} onClick={e => {e.preventDefault();e.stopPropagation();handleCloseTable(table['table_number']);}} />
                                                </form>
                                            </div>
                                            <div className={"my-tables-list-item-data-area"}>
                                                {window.localStorage.getItem('table') && window.localStorage.getItem('table').toString() === table['table_number'].toString() && <p className={"my-tables-list-item-tag current"}>Current Table</p>}
                                                {
                                                    table['categories'] && table['categories'].map((category, categoryIndex) => (
                                                        <p key={`my-tables-list-item-${tableIndex}-tag-${categoryIndex}`} className={"my-tables-list-item-tag" + ((category['recipes'] && !isNaN(category['submitted']) && category['recipes'].length > category['submitted']) ? " alert" : "")}>{category['category']}</p>
                                                    ))
                                                }
                                            </div>
                                        </li>
                                    </Link>
                                ))
                            }
                        </ul>
                    ) : (
                        <p>You have no open tables at the moment.</p>
                    )
                }
                <h2>All Tables</h2>
                <ul className={"my-tables-list"}>
                    {
                        (tables && tables.length > 0) ? tables.map((table, tableIndex) => (
                            <Link key={`my-tables-all-tables-list-item-${tableIndex}`} to={'/pad'} onClick={() => {handleSetTable(table['table_number']);}}>
                                <li className={"my-tables-list-item"}>
                                    <div className={"my-tables-list-item-control-area"}>
                                        <div className={"my-tables-list-item-information-area"}>
                                            <p>Table {table['table_number']}</p>
                                        </div>
                                        <div className={"my-tables-list-item-users-area"}>
                                            {
                                                table['users'] && table['users'].map((user, userIndex) => (userIndex < 4) && (
                                                    <img key={`my-tables-all-tables-list-item-user-${userIndex}`} src={user} alt={`Table ${table['table_number']} team member`} />
                                                ))
                                            }
                                        </div>
                                        <form className={"my-tables-list-item-options-area"}>
                                            {table['categories'].length > 0 ? (<input type={"submit"} value={`Close Table ${table['table_number']}`} onClick={e => {e.preventDefault();e.stopPropagation();handleCloseTable(table['table_number']);}} />) : (table['users'].length === 0 && <input type={"button"} value={`Open Table ${table['table_number']}`}/>)}
                                        </form>
                                    </div>
                                    <div className={"my-tables-list-item-data-area"}>
                                        {window.localStorage.getItem('table') && window.localStorage.getItem('table').toString() === table['table_number'].toString() && <p className={"my-tables-list-item-tag current"}>Current Table</p>}
                                        {
                                            table['categories'] && table['categories'].map((category, categoryIndex) => (
                                                <p key={`my-tables-all-tables-list-item-${tableIndex}-tag-${categoryIndex}`} className={"my-tables-list-item-tag" + ((category['recipes'] && !isNaN(category['submitted']) && category['recipes'].length > category['submitted']) ? " alert" : "")}>{category['category']}</p>
                                            ))
                                        }
                                    </div>
                                </li>
                            </Link>
                        )) : null
                    }
                </ul>
            </div>
        </Page>
    )
}
