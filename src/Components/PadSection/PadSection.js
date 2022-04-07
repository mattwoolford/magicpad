import React, {useEffect, useRef, useState} from 'react';

import './PadSection.css';
import {Droppable} from "react-beautiful-dnd";
import RecipeTile from "../RecipeTile/RecipeTile";
import usePrevious from "../../usePrevious";

export default function PadSection(props){

    const recipes = ((props['recipes'] && typeof props['recipes'] === 'object') ? props['recipes'] : []);
    const [expandedRecipeTile, setExpandedRecipeTile] = useState(null);

    const previousRecipes = usePrevious(recipes);

    const container = useRef();

    const handleExpandRecipeTile = recipeIndex => {
        if(expandedRecipeTile !== recipeIndex){
            setExpandedRecipeTile(recipeIndex);
            if(props['onToggleRecipeExpand'] && typeof props['onToggleRecipeExpand'] === 'function'){
                props['onToggleRecipeExpand'](true);
            }
        }
    };

    const handleCollapseRecipeTile = () => {
        setExpandedRecipeTile(null);
        if(props['onToggleRecipeExpand'] && typeof props['onToggleRecipeExpand'] === 'function'){
            props['onToggleRecipeExpand'](false);
        }
    };

    const handleDelete = (recipe, recipeIndex) => {
        if(expandedRecipeTile === recipeIndex){
            if(props['onToggleRecipeExpand'] && typeof props['onToggleRecipeExpand'] === 'function'){
                props['onToggleRecipeExpand'](false);
            }
        }
        if(props['onDeleteRecipe'] && typeof props['onDeleteRecipe'] === 'function'){
            props['onDeleteRecipe'](recipe);
        }
    };

    const handleUpdateRecipe = () => {
        if(props['onUpdateRecipe'] && typeof props['onUpdateRecipe'] === 'function'){
            props['onUpdateRecipe']();
        }
    };

    const recipeTiles = recipes.map((recipe, recipeIndex) => {
        return <RecipeTile key={`${props['title']}-recipe-${recipeIndex}`} hide={expandedRecipeTile !== null && expandedRecipeTile !== recipeIndex} onCollapseRequest={handleCollapseRecipeTile} expand={expandedRecipeTile === recipeIndex} onClick={() => {handleExpandRecipeTile(recipeIndex);}} data={recipe} onUpdateRecipe={handleUpdateRecipe} onDelete={() => {handleDelete(recipe, recipeIndex);}} index={recipeIndex} disableDrag={!!props['disableDrag']} />;
    });

    useEffect(() => {
        if(previousRecipes && recipes.length !== previousRecipes.length){
            handleCollapseRecipeTile();
        }
    }, [recipes])

    return (
        <div className={"pad-section"} ref={container}>
            {props['title'] ? <h1>{props['title']}</h1> : null}
            <Droppable droppableId={`droppable-${props['title']}`}>
                {
                    provided => {
                        return (<ul className={"pad-area"} {...provided.droppableProps} ref={provided.innerRef}>
                            {recipeTiles}
                            {provided.placeholder}
                        </ul>);
                    }
                }
            </Droppable>
        </div>
    )

}
