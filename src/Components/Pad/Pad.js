import React, {useContext, useEffect, useRef, useState} from "react";

import { DragDropContext } from 'react-beautiful-dnd';

import './Pad.css';
import Page from "../Page/Page";
import PadSection from "../PadSection/PadSection";
import PadLibrary from "../PadLibrary/PadLibrary";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import PadTableOptions from "../PadTableOptions/PadTableOptions";
import PadScrollIndicator from "../PadScrollIndicator/PadScrollIndicator";
import {SocketContext} from "../../socket";
import {UserContext} from "../../user";
import usePrevious from "../../usePrevious";

import {cloneDeep, debounce} from "lodash";
import PadChecklist from "../PadChecklist/PadChecklist";

export default function Pad(props){

    const user = useContext(UserContext);

    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");

    const [preventScroll, setPreventScroll] = useState(false);

    const [categories, setCategories] = useState(["Drinks", "Apps", "Mains", "Sides", "Desserts"]);
    const [currentCategory, setCurrentCategory] = useState("Drinks");

    const [tableNumber, setTableNumber] = useState(window.localStorage.getItem('table') ? window.localStorage.getItem('table'): null);
    const previousTableNumber = usePrevious(tableNumber);
    const [tableJoined, setTableJoined] = useState(false);

    const [showChecklist, setShowChecklist] = useState(false);

    const [showScrollIndicator, setShowScrollIndicator] = useState(false);
    const [scrollIndicatorTimeout, setScrollIndicatorTimeout] = useState(null);

    const [recipes, setRecipes] = useState([]);
    const [addedRecipes, setAddedRecipes] = useState([]);

    const container = useRef();
    const sectionContainer = useRef();

    const socket = useContext(SocketContext);

    const handleScroll = debounce(e => {
        if(scrollIndicatorTimeout) clearTimeout(scrollIndicatorTimeout);
        const scrollTop = e.target.scrollTop;
        const sectionElement = e.target.querySelector('div.pad-section');
        const height = sectionElement.offsetHeight;
        const index = Math.min(Math.max(0, Math.round(scrollTop / height)), (categories.length - 1));
        setCurrentCategory(categories[index]);
        setShowScrollIndicator(true);
        const sIT = setTimeout(() => {
            setShowScrollIndicator(false);
        }, 3000);
        setScrollIndicatorTimeout(sIT);
    }, 100);

    const findAddedRecipe = recipeName => {
        for(let recipeIndex = 0; recipeIndex < addedRecipes.length; recipeIndex++){
            if(addedRecipes[recipeIndex]['recipe'] === recipeName){
                return recipeIndex;
            }
        }
        return -1;
    };

    const handleCloseChecklist = () => {
        let quantitySum = 0;
        let submittedSum = 0;
        for(let recipe of addedRecipes){
            quantitySum = quantitySum + recipe['quantity'];
            submittedSum = submittedSum + recipe['submitted'];
        }
        if(quantitySum > submittedSum && !window.confirm('You still have unchecked items left on your checklist. Are you sure you want to exit?')){
            return;
        }
        setShowChecklist(false);
    };

    const handleToggleShowChecklist = () => {
        if(showChecklist){
            handleCloseChecklist();
        }
        else{
            setShowChecklist(true);
        }
    };

    const handleTableNumberChange = tableNumber => {
        if(tableNumber) setTableNumber(tableNumber);
    }

    const handleAddRecipeAccepted = data => {
        if(data['recipe'] && data['table_recipe_id'] && data['table_number'] && data['table_number'].toString() === tableNumber.toString()){
            const temp = Array.from(addedRecipes);
            const recipeIndex = findAddedRecipe(data['recipe']);
            if(recipeIndex > -1){
                const choices = temp[recipeIndex]['information'];
                for(let choice of choices){
                    if(choice['table_recipe_id'] === undefined || choice['table_recipe_id'] === null){
                        choice['table_recipe_id'] = data['table_recipe_id'];
                    }
                }
            }
            setAddedRecipes(temp);
        }
    }

    const handleAddRecipe = recipe => {
        if(recipe){
            if(recipe['count'] !== undefined && recipe['count'] !== null){
                if(recipe['count'] < 1) {
                    let warnMessage = "This item may not be available. Are you sure you want to add this to the order?";
                    if (recipe['ingredients'] && typeof recipe['ingredients'] === 'object' && recipe['ingredients'].length > 1) {
                        warnMessage = "Some or all of the ingredients for this item may not be available. Are you sure you want to add this to the order?";
                    }
                    if (!window.confirm(warnMessage)) {
                        return;
                    }
                }
                recipe['count'] = Math.max(0, (recipe['count'] - 1));
            }
            const existingAddedRecipeIndex = findAddedRecipe(recipe['recipe']);
            let newRecipe = cloneDeep(recipe);
            let temp = Array.from(addedRecipes).slice();
            if(existingAddedRecipeIndex >= 0) {
                temp[existingAddedRecipeIndex]['quantity']++;
                temp[existingAddedRecipeIndex]['information'].push({table_recipe_id: null, ordered_by: user.username, tags: [], submitted: false, submitted_by: null});
            }
            else{
                newRecipe['quantity'] = 1;
                newRecipe['submitted'] = 0;
                newRecipe['information'] = [{table_recipe_id: null, ordered_by: user.username, tags: [], submitted: false, submitted_by: null}];
                addedRecipes.push(newRecipe); // Push to state array so that handleAddRecipeAccepted can access despite component not refreshing. This is ok as newRecipe is parsed by reference
                temp.push(newRecipe);
            }
            setAddedRecipes(temp);
            socket.emit("ADD_RECIPE", {
                auth: user.privateAuthCode,
                recipe: newRecipe
            });
        }
    }

    const handleAddExternalRecipe = data => {
        if(data['recipes']){
            const existingRecipes = [];
            let temp = Array.from(addedRecipes);
            for(let recipe of temp){
                if(!existingRecipes.includes(recipe['recipe'])){
                    existingRecipes.push(recipe['recipe']);
                }
            }
            for(let recipe of data['recipes']){
                if(!existingRecipes.includes(recipe['recipe'])){
                    temp.push(recipe);
                }
                else{
                    let existingRecipe = null;
                    for(let existingRecipeItem of temp){
                        if(existingRecipeItem['recipe'] === recipe['recipe']){
                            existingRecipe = existingRecipeItem;
                        }
                    }
                    let existingChoices = [];
                    for(let choice of existingRecipe['information']){
                        if(!existingChoices.includes(choice['table_recipe_id'])){
                            existingChoices.push(choice['table_recipe_id']);
                        }
                    }
                    for(let choice of recipe['information']){
                        if(existingChoices.includes(choice['table_recipe_id'])) continue;
                        existingRecipe['information'].push(choice);
                        existingRecipe['quantity'] = existingRecipe['quantity'] + 1;
                        if(choice['submitted']){
                            existingRecipe['submitted'] = existingRecipe['submitted'] + 1;
                        }
                    }
                }
            }
            setAddedRecipes(temp);
        }
    }

    const handleDeleteRecipe = recipe => {
        if(recipe){
            let temp = Array.from(addedRecipes);
            temp = temp.filter(item => {
                return item['recipe'] !== recipe['recipe'];
            });
            setAddedRecipes(temp);
        }
    };

    const handleRecipeSubmissionChange = newRecipes => {
        setAddedRecipes(Array.from(newRecipes));
    };

    const handleDragEnd = result => {
        const {source, destination} = result;
        if(!destination || !source || source.droppableId === destination.droppableId) return;
        const index = source.index;
        if(recipes.length > index){
            if(!destination.droppableId.match(/^droppable-.+-library$/)){
                handleAddRecipe(recipes[index]);
            }
            else{
                handleDeleteRecipe(recipes[index]);
            }
        }
    };

    const handlePageToggle = pageIndex => {
        const pages = sectionContainer.current.querySelectorAll('div.pad-section');
        pageIndex = Math.min(Math.max(pageIndex, 0), (pages.length - 1));
        const page = pages[pageIndex];
        page.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    }

    const handleToggleRecipeExpand = isExpanded => {
        setPreventScroll(isExpanded);
    };

    const handleUpdateRecipe = () => {
        const temp = Array.from(addedRecipes);
        setAddedRecipes(temp);
    };

    const handleUpdateRecipes = newRecipes => {
        setRecipes(newRecipes);
    };

    const handleJoinAccepted = () => {
        setTableJoined(true);
        setAddedRecipes([]);
        window.localStorage.setItem('table', tableNumber);
        if(props['onJoinTable'] && typeof props['onJoinTable'] === 'function'){
            props['onJoinTable'](tableNumber);
        }
    }

    const handleJoinTable = () => {
        if(user && user.privateAuthCode){
            setTableJoined(false);
            if(tableNumber) socket.emit("JOIN_TABLE", {auth: user.privateAuthCode, tableNumber: tableNumber});
        }
    };

    const handleLeaveTableAccepted = () => {
        if(tableNumber) handleJoinTable();
    }

    const handleLeaveTable = () => {
        if(user && user.privateAuthCode && tableJoined && previousTableNumber !== tableNumber){
            window.localStorage.removeItem('table');
            setTableJoined(false);
            if(previousTableNumber) socket.emit("LEAVE_TABLE", {auth: user.privateAuthCode, tableNumber: previousTableNumber});
            if(props['onLeaveTable'] && typeof props['onLeaveTable'] === 'function'){
                props['onLeaveTable'](previousTableNumber);
            }
        }
    };

    const handleResetTable = data => {
        setAddedRecipes([]);
        setTableNumber(null);
        if(data['table_number'] && data['table_number'].toString() === tableNumber){
            handleLeaveTable();
        }
    }

    const handleConnected = () => {
        setLoadingMessage(null);
        if(tableNumber) handleJoinTable();
    };

    const handleDisconnected = () => {
        setTableJoined(false);
        setLoadingMessage("Please check your connection...");
    };

    useEffect(() => {

        if(sectionContainer.current){
            sectionContainer.current.addEventListener('scroll', handleScroll);

            return () => {
                if(sectionContainer.current) sectionContainer.current.removeEventListener('scroll', handleScroll);
            }
        }

    }, [sectionContainer.current])

    useEffect(() => {
        let mounted = true;
        //    Get categories
        setLoading(true);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/categories`)
            .then(async request => {
                const response = await request.json();
                const cats = response['categories'];
                const temp = [];
                for(let cat of cats){
                    temp.push(cat['category']);
                }
                if(mounted) {
                    setCategories(temp);
                    setCurrentCategory(temp.length > 0 ? temp[0] : null);
                    setLoading(false);
                    if (scrollIndicatorTimeout) clearTimeout(scrollIndicatorTimeout);
                    setShowScrollIndicator(true);
                    const sIT = setTimeout(() => {
                        if(mounted) setShowScrollIndicator(false);
                    }, 5000);
                    setScrollIndicatorTimeout(sIT);
                }
            })

        return () => {
            mounted = false;
            if(scrollIndicatorTimeout){
                clearTimeout(scrollIndicatorTimeout);
            }
        }

    }, [])

    useEffect(() => {
    //    Socket

        socket.on('connect', handleConnected);
        socket.on("JOIN_TABLE_ACCEPTED", handleJoinAccepted);
        socket.on("ADD_EXTERNAL_RECIPES", handleAddExternalRecipe);
        socket.on("ADD_RECIPE_ACCEPTED", handleAddRecipeAccepted);
        socket.on('TABLE_RESET', handleResetTable);
        socket.on("LEAVE_TABLE_ACCEPTED", handleLeaveTableAccepted);
        socket.on('disconnect', handleDisconnected);
        socket.on('reconnect', handleConnected);

        if(previousTableNumber !== tableNumber){
            handleLeaveTable();
        }

        if(tableNumber && !tableJoined){
            handleJoinTable();
        }

        return () => {
            socket.off('connect', handleConnected);
            socket.off("JOIN_TABLE_ACCEPTED", handleJoinAccepted);
            socket.off("ADD_EXTERNAL_RECIPES", handleAddExternalRecipe);
            socket.off("ADD_RECIPE_ACCEPTED", handleAddRecipeAccepted);
            socket.off('TABLE_RESET', handleResetTable);
            socket.off("LEAVE_TABLE_ACCEPTED", handleLeaveTableAccepted);
            socket.off('disconnect', handleDisconnected);
            socket.off('reconnect', handleConnected);
        }

    }, [socket, tableNumber, addedRecipes]);

    let categorisedRecipes = {};
    let quantitySum = 0;
    let submittedSum = 0;

    for(let recipe of addedRecipes){
        if(!Object.keys(categorisedRecipes).includes(recipe['category'])){
            categorisedRecipes[recipe['category']] = [];
        }
        categorisedRecipes[recipe['category']].push(recipe);
        quantitySum = quantitySum + recipe['quantity'];
        submittedSum = submittedSum + recipe['submitted'];
    }

    //Disable drag from recipe tiles when drawer view being used (drawer view controlled by PadLibrary.css)
    let dragDisabled = sectionContainer.current && (sectionContainer.current.offsetWidth > (window.innerWidth / 2));

    const padSections = categories.map((section, sectionIndex) => <PadSection key={`pad-section-${section}`} title={section} recipes={categorisedRecipes[section] ? categorisedRecipes[section] : []} onDeleteRecipe={handleDeleteRecipe} onUpdateRecipe={handleUpdateRecipe} disableDrag={dragDisabled} onToggleRecipeExpand={handleToggleRecipeExpand} />);

    const allRecipesSubmitted = quantitySum <= submittedSum;


    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Page>
                {tableNumber ? <PadChecklist tableNumber={tableNumber} open={showChecklist} recipes={addedRecipes} onCloseRequest={handleCloseChecklist} onSubmitItem={handleRecipeSubmissionChange} onCancelSubmitItem={handleRecipeSubmissionChange} /> : null}
                {tableNumber ? <PadScrollIndicator pages={categories} currentSection={currentCategory} onToggle={handlePageToggle}
                                     hide={!showScrollIndicator}/> : null}
                <div className={"pad" + (tableNumber ? (showChecklist ? " blur" : "") : " disabled")} ref={container}>
                    {(loading || (tableNumber && !tableJoined)) ? <LoadingIcon label={loadingMessage} fill/> : null}
                    <div className={"pad-section-container" + (preventScroll ? " no-scroll" : "")} ref={sectionContainer}>
                        {padSections}
                    </div>
                    <PadLibrary category={currentCategory} onUpdateRecipes={handleUpdateRecipes} onAddRecipe={handleAddRecipe} disableDrag={dragDisabled} />
                </div>
                <PadTableOptions selectedTable={tableNumber} onTableChange={handleTableNumberChange} onToggleChecklist={handleToggleShowChecklist} promptChecklist={!allRecipesSubmitted} />
            </Page>
        </DragDropContext>
    )
}
