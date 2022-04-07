import React, {useContext, useEffect, useState} from 'react';

import './PadChecklist.css';
import useRefreshComponent from "../../useRefreshComponent";
import {SocketContext} from "../../socket";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import {UserContext} from "../../user";
import User from "../User/User";

export default function PadChecklist(props){

    const user = useContext(UserContext);
    const socket = useContext(SocketContext);

    const refreshComponent = useRefreshComponent();

    const open = !!props['open'];
    const recipes = props['recipes'] ? props['recipes'] : [];

    const [freezeListScroll, setFreezeListScroll] = useState(true);

    const [resaveTimeout, setResaveTimeout] = useState(null);
    const [resaveSubject, setResaveSubject] = useState(null);
    const [resaveSubjectChoiceIndex, setResaveSubjectChoiceIndex] = useState(null);

    const handleCloseRequest = () => {
        if(props['onCloseRequest'] && typeof props['onCloseRequest'] === 'function'){
            props['onCloseRequest']();
        }
    };

    const handleScroll = e => {
        setFreezeListScroll(e.target.scrollTop === 0);
    };

    const submitItem = (e, recipe, choiceIndex) => {
        const itemRef = e.target.parentNode.parentNode;
        if(itemRef){
            itemRef.classList.add('hide');
        }
        setTimeout(() => {
            recipe['information'][choiceIndex]['submitted'] = true;
            recipe['information'][choiceIndex]['submitted_by'] = user.username;
            recipe['submitted']++;
            refreshComponent();
            if(itemRef){
                itemRef.classList.remove('hide');
            }
            socket.emit('SUBMIT_RECIPE', {auth: user.privateAuthCode, table_recipe_id: recipe['information'][choiceIndex]['table_recipe_id']})
            if(props['onSubmitItem'] && typeof props['onSubmitItem'] === 'function'){
                props['onSubmitItem'](recipes);
            }
        }, 800);
    };

    const cancelSubmitItem = (e, recipe, choiceIndex) => {
        const itemRef = e.target.parentNode.parentNode;
        if(itemRef){
            itemRef.classList.add('hide');
        }
        setTimeout(() => {
            if(itemRef){
                itemRef.classList.remove('hide');
            }
            recipe['information'][choiceIndex]['submitted'] = false;
            recipe['submitted']--;
            refreshComponent();
            if(itemRef){
                itemRef.classList.remove('hide');
            }
            if(props['onCancelSubmitItem'] && typeof props['onCancelSubmitItem'] === 'function'){
                props['onCancelSubmitItem'](recipes);
            }
        }, 800);
    };

    const handleAddRecipeAccepted = data => {
        if(resaveSubject && !isNaN(resaveSubjectChoiceIndex) && data['recipe'] && data['table_recipe_id']){
            const recipe = resaveSubject;
            if(props['tableNumber'] && recipe['table_number'] && props['tableNumber'].toString() !== recipe['table_number'].toString()) return;
            if(resaveTimeout){
                clearTimeout(resaveTimeout);
                setResaveTimeout(null);
            }
            const choice = recipe['information'][resaveSubjectChoiceIndex];
            choice['table_recipe_id'] = data['table_recipe_id'];
            setResaveSubject(null);
            setResaveSubjectChoiceIndex(null);
        }
    }

    const handleResave = (recipe, choiceIndex) => {
        if(resaveTimeout) return;
        const timeout = setTimeout(() => {
            clearTimeout(resaveTimeout);
            setResaveTimeout(null);
        }, 10000);
        setResaveTimeout(timeout);
        setResaveSubject(recipe);
        setResaveSubjectChoiceIndex(choiceIndex);
        socket.emit('ADD_RECIPE', {
            auth: user.privateAuthCode,
            recipe: recipe,
            sequence: choiceIndex + 1
        });
    }

    const handleRecipeSubmitted = data => {
        if(data['table_recipe_id']){
            for(let recipe of recipes){
                for(let choice of recipe['information']){
                    if(choice['table_recipe_id'] === data['table_recipe_id']){
                        recipe['submitted']++;
                        choice['submitted_by'] = data['submitted_by'] ? data['submitted_by'] : null;
                        choice['submitted'] = true;
                        if(props['onSubmitItem'] && typeof props['onSubmitItem'] === 'function'){
                            props['onSubmitItem'](recipes);
                        }
                    }
                }
            }
        }
    }

    useEffect(() => {

        socket.on('ADD_RECIPE_ACCEPTED', handleAddRecipeAccepted);
        socket.on('RECIPE_SUBMITTED', handleRecipeSubmitted);

        return () => {
            socket.off('ADD_RECIPE_ACCEPTED', handleAddRecipeAccepted);
            socket.off('RECIPE_SUBMITTED', handleRecipeSubmitted);
        }

    });

    const unsavedComponents = [];
    const unsubmittedComponents = [];
    const submittedComponents = [];

    let newComponent;
    for(let recipeIndex = 0; recipeIndex < recipes.length; recipeIndex++){
        const recipe = recipes[recipeIndex];
        if(!recipe['information']) continue;
        for(let choiceIndex = 0; choiceIndex < recipe['information'].length; choiceIndex++){
            let choice = recipe['information'][choiceIndex];
            newComponent = (
                <li key={`pad-checklist-item-${(recipeIndex + 1)}-choice-${(choiceIndex + 1)}`} className={"pad-checklist-item" + (choice['submitted'] ? "" : " alert")}>
                    <div className={"pad-checklist-item-indicator"} />
                    <h2>{recipe['recipe']}</h2>
                    {choice['tags'].map((tag, tagIndex) => {
                        return (
                            <div className={"pad-checklist-item-tag"} key={`pad-checklist-item-${(recipeIndex + 1)}-choice-${(choiceIndex + 1)}-tag-${(tagIndex + 1)}`}>
                                <p>+ {tag}</p>
                            </div>
                        )
                    })}
                    <form>
                        {
                            choice['table_recipe_id'] ? (
                                <input type={"button"} className={(choice['submitted'] ? " red" : "")} value={!choice['submitted'] ? "I've Put This Through" : "This Wasn't Put Through"} onClick={!choice['submitted'] ? e => {
                                    submitItem(e, recipe, choiceIndex);
                                } : e => {
                                    cancelSubmitItem(e, recipe, choiceIndex);
                                }} />
                            ) : (
                                <input type={"button"} className={"red"} value={"Try Again"} onClick={() => {handleResave(recipe, choiceIndex)}} />
                            )
                        }
                    </form>
                    {(choice['ordered_by'] || !!choice['submitted_by']) && (
                        <div className={"pad-checklist-item-user-area"}>
                            {!!choice['ordered_by'] && (
                                <div className={"pad-checklist-item-user"}>
                                    <img src={`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/${choice['ordered_by'].toLowerCase()}/profile-image`} alt={`@${choice['ordered_by']}`} />
                                    <p>Ordered by <User username={choice['ordered_by']} separator={' '} firstName lastName /> (@{choice['ordered_by']})</p>
                                </div>
                            )}
                            {!!choice['submitted_by'] && (
                                <div className={"pad-checklist-item-user"}>
                                    <img src={`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/${choice['submitted_by'].toLowerCase()}/profile-image`} alt={`@${choice['submitted_by']}`} />
                                    <p>Put through by <User username={choice['submitted_by']} separator={' '} firstName lastName /> (@{choice['submitted_by']})</p>
                                </div>
                            )}
                        </div>
                    )}
                </li>
            );
            if(!choice['table_recipe_id']){
                unsavedComponents.push(newComponent);
            }
            else if(choice['submitted']){
                submittedComponents.push(newComponent);
            }
            else{
                unsubmittedComponents.push(newComponent);
            }
        }
    }

    return(
        <>
            {resaveTimeout && <LoadingIcon fullscreen label={"Saving..."}/>}
            <div className={"pad-checklist" + (open ? " open" : "")} onScroll={handleScroll}>

                <div className={"pad-checklist-header"}>
                    <h1>My Checklist.</h1>
                    <p>Use this at the point of sale to check off order items without missing anything!</p>
                    <form>
                        <input type={"button"} value={"Finish"} onClick={handleCloseRequest} />
                    </form>
                </div>
                <div className={"pad-checklist-list-container" + (freezeListScroll ? " no-scroll" : "")}>
                    {
                        unsavedComponents.length > 0 && (
                            <>
                                <h2>Some recipes require your attention.</h2>
                                <p>The following items have not been saved, and may be lost. Try re-saving items you still need.</p>
                                <ul className={"pad-checklist-list"}>
                                    {unsavedComponents}
                                </ul>
                            </>
                        )
                    }
                    {
                        unsubmittedComponents.length > 0 && (
                            <>
                                <h2>Not yet ordered.</h2>
                                <ul className={"pad-checklist-list"}>
                                    {unsubmittedComponents}
                                </ul>
                            </>
                        )
                    }
                    {
                     submittedComponents.length > 0 && (
                         <>
                             <h2>Ordered.</h2>
                             <ul className={"pad-checklist-list"}>
                                 {submittedComponents}
                             </ul>
                         </>
                     )
                    }
                    {recipes.length === 0 && (
                        <div className={"pad-checklist-message"}>
                            <h3>No items have been added to this table's order yet.</h3>
                            <p>Add items to this order and your checklist will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
