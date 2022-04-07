import React, {useContext, useEffect, useState} from 'react';

import Page from "../Page/Page";

import './Stock.css';
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import AccurateSearch from "accurate-search";
import {UserContext} from "../../user";
import {Link} from "react-router-dom";
import {SocketContext} from "../../socket";
import useRefreshComponent from "../../useRefreshComponent";

export default function Stock(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const refreshComponent = useRefreshComponent();

    const [accurateSearch, setAccurateSearch] = useState(new AccurateSearch());
    const [search, setSearch] = useState(null);

    const [filter, setFilter] = useState("");
    const [sort, setSort] = useState("time");

    const [loading, setLoading] = useState(true);

    const [recipes, setRecipes] = useState([]);
    const [ingredients, setIngredients] = useState([]);

    useEffect(() => {

        let mounted = true;

        //Get stock

        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/ingredients`, {
            credentials: 'include'
        })
            .then(async request => {
                const response = await request.json();
                if(mounted){
                    if(response.status === 200 && response.ingredients){
                        setIngredients(response.ingredients.map(obj => ({...obj, type: 'ingredient', sort: obj.ingredient})));
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                if(mounted) setLoading(false);
            })


        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/`, {
            credentials: 'include'
        })
            .then(async request => {
                const response = await request.json();
                if(mounted){
                    if(response.status === 200 && response.recipes){
                        setRecipes(response.recipes.map(obj => ({...obj, type: 'recipe', sort: obj.recipe})));
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                if(mounted) setLoading(false);
            })

        return () => {
            mounted = false;
        }

    }, [])

    const handleFilterChange = e => {
        setFilter(e.target.value);
    }

    const handleSearch = e => {
        setSearch(e.target.value !== "" ? e.target.value : null);
    };

    const handleSortChange = e => {
        setSort(e.target.value);
    }

    const handleIngredientStockChange = data => {
        let found = false;
        for(let r = 0; r < recipes.length; r++){
            let recipe = recipes[r];
            if(recipe['ingredients']){
                let counts = [];
                for(let i = 0; i < recipe['ingredients'].length; i++){
                    let ingredient = recipe['ingredients'][i];
                    if(ingredient['ingredient'] === data['ingredient']){
                        ingredient['count'] = data['count'];
                        ingredient['time_updated'] = data['time_updated'];
                        if(ingredient['required_units'] && ingredient['required_units'] !== 0) counts.push(Math.floor(data['count'] / ingredient['required_units']));
                        if(data['time_updated'] && new Date(recipe['time_updated']) < new Date(data['time_updated'])){
                            //Do nothing
                        }
                        else if(!data['time_updated']){
                            recipe['time_updated'] = null;
                        }
                        found = true;
                    }
                }
                if (counts.length > 0) {
                    recipe['count'] = Math.min(counts);
                }
            }
        }
        for(let i = 0; i < ingredients.length; i++){
            let ingredient = ingredients[i];
            if(ingredient['ingredient'] === data['ingredient']){
                if(ingredient['count'] !== data['count']){
                    ingredient['time_updated'] = data['time_updated'];
                }
                ingredient['count'] = data['count'];
            }
        }
        if(found){
            refreshComponent();
        }
    }

    useEffect(() => {
        socket.on('SET_INGREDIENT_COUNT', handleIngredientStockChange);

        return () => {
            socket.off('SET_INGREDIENT_COUNT', handleIngredientStockChange);
        }
    })

    let allItems;
    if(filter === 'recipes'){
        allItems = [...recipes];
    }
    else if(filter === 'ingredients'){
        allItems = [...ingredients];
    }
    else{
        allItems = [...ingredients, ...recipes];
    }

    if(sort === 'time'){
        allItems.sort((a, b) => {
            if(!a.time_updated){
                return 1;
            }
            if(!b.time_updated){
                return -1;
            }
            const dateA = new Date(a.time_updated);
            const dateB = new Date(b.time_updated);
            return dateB - dateA;
        })
    }
    else if(sort === 'item'){
        allItems.sort((a, b) => {
            if(!a.sort){
                return 1;
            }
            if(!b.sort){
                return -1;
            }
            const sortA = a.sort.toUpperCase();
            const sortB = b.sort.toUpperCase();
            if(sortA < sortB){
                return -1;
            }
            if(sortA > sortB){
                return 1;
            }
            return 0;
        })
    }
    else if(sort === 'count_asc'){
        allItems.sort((a, b) => {
            if(a.count === undefined || a.count === null){
                return 1;
            }
            if(b.count === undefined || b.count === null){
                return -1;
            }
            return a.count - b.count;
        })
    }
    else if(sort === 'count_desc'){
        allItems.sort((a, b) => {
            if(a.count === undefined || a.count === null){
                return -1;
            }
            if(b.count === undefined || b.count === null){
                return 1;
            }
            return b.count - a.count;
        })
    }

    for(let i = 0; i < allItems.length; i++){
        let item = allItems[i];
        if(item.sort){
            accurateSearch.addText(i, item.sort);
        }
    }

    if(search){
        allItems = accurateSearch.search(search).map(suggestion => (allItems[parseInt(suggestion)]));
    }

    const stockItems = allItems.map((item, itemIndex) => (
        <li className={'stock-list-item'} key={`stock-list-item-${itemIndex}`}>
            <span>
                <div className={'stock-list-item-indicator' + (item.count && item.count <= 0.5 ? ' critical-stock' : (item.count && item.count <= (item.type && item.type === 'recipe' ? 10 : 1.5) ? ' low-stock' : ''))} />
                <p>{item.sort}</p>
            </span>
            {item.count !== undefined && item.count !== null && (
                <span>
                    <p className={'stock-list-count'}>Remaining: &asymp; {item.count}</p>
                </span>
            )}
        </li>
    ));

    return (
        <Page allowScroll={true}>
            <div className={"stock"}>
                <h1>Stock Levels</h1>
                <form className={"stock-filter-menu"}>
                    <input type={"text"} placeholder={"Search"} onChange={handleSearch} />
                    <div className={"stock-filter-menu-button-row"}>
                        <select onChange={handleFilterChange}>
                            <option value={""}>Filter by (none)</option>
                            <option value={'recipes'}>Recipes</option>
                            <option value={'ingredients'}>Ingredients</option>
                        </select>
                        <select defaultValue={'time'} onChange={handleSortChange} disabled={!!search}>
                            <option disabled value={""}>Sort by</option>
                            <option value={'time'}>Most Recent</option>
                            <option value={'item'}>A-Z</option>
                            <option value={'count_asc'}>Stock Level (Low to High)</option>
                            <option value={'count_desc'}>Stock Level (High to Low)</option>
                        </select>
                        {user && user.isAdmin && (
                            <Link to={'/stock'}>
                                <input type={"button"} value={"Manage Stock"} />
                            </Link>
                        )}
                    </div>
                </form>
                <div className={"stock-list-container"}>
                    {loading && <LoadingIcon label={"Getting stock current levels..."} fill />}
                    {allItems && allItems.length > 0 && (
                        <ul className={'stock-list'}>
                            {stockItems}
                        </ul>
                    )}
                </div>
            </div>
        </Page>
    )
}
