import React, {useContext, useEffect, useRef, useState} from 'react';
import useRefreshComponent from '../../useRefreshComponent';

import './RecipeTile.css';

import AddSymbol from '../../images/add.png';
import EditSymbol from '../../images/ellipsis.png';
import {Draggable} from "react-beautiful-dnd";
import RecipeTileTagConfigurator from "../RecipeTileTagConfigurator/RecipeTileTagConfigurator";
import {SocketContext} from "../../socket";
import {UserContext} from "../../user";

export default function RecipeTile(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const [showEllipses, setShowEllipses] = useState(false);

    const disableDrag = !!props['disableDrag'];

    const refreshComponent = useRefreshComponent();

    const text = useRef();

    useEffect(() => {
        if(text.current && (text.current.clientHeight < (text.current.scrollHeight - 2))){
            setShowEllipses(true);
        }
        else{
            setShowEllipses(false);
        }
    }, [text]);

    const handleClick = e => {
        if(props['onClick'] && typeof props['onClick'] === 'function'){
            props['onClick'](e);
        }
    };

    const handleCollapse = () => {
        if(props['onCollapseRequest'] && typeof props['onCollapseRequest'] === 'function'){
            props['onCollapseRequest']();
        }
    }

    const handleChangeQuantity = amount => {
        if(props['data']['quantity'] || !isNaN(props['data']['quantity'])){
            const newAmount = props['data']['quantity'] + amount;
            if(newAmount <= 0 && !window.confirm(`Are you sure you want to remove "${props['data']['recipe']}"?`)){
                return;
            }
            if(newAmount <= 100){
                if(amount >= 0){
                    for(let i = 0; i < amount; i++){
                        props['data']['information'].push({table_recipe_id: null, ordered_by: user.username, tags: [], submitted: false, submitted_by: null});
                        socket.emit('ADD_RECIPE', {
                            auth: user.privateAuthCode,
                            recipe: props['data']
                        });
                    }
                }
                else{
                    for(let removeIndex=(props['data']['information'].length - 1); removeIndex > (newAmount - 1); removeIndex--){
                        let choice = props['data']['information'][removeIndex];
                        if(choice['submitted']){
                            props['data']['submitted']--;
                        }
                        socket.emit('DELETE_RECIPE', {
                            auth: user.privateAuthCode,
                            table_recipe_id: choice['table_recipe_id']
                        });
                    }
                    props['data']['information'].length = newAmount;
                }
                props['data']['quantity'] = newAmount;
                if(newAmount <= 0){
                    if(props['onDelete'] && typeof props['onDelete'] === 'function'){
                        props['onDelete']();
                    }
                }
                else{
                    if(props['onUpdateRecipe'] && typeof props['onUpdateRecipe'] === 'function'){
                        props['onUpdateRecipe']();
                    }
                }
            }
        }
    };

    const handleDeleteExternalRecipe = data => {
        if(data['table_recipe_id'] && props['data']['information']){
            for(let choiceIndex = 0; choiceIndex < props['data']['information'].length; choiceIndex++){
                let choice = props['data']['information'][choiceIndex];
                if(choice['table_recipe_id'] === data['table_recipe_id']){
                    props['data']['information'].splice(choiceIndex, 1);
                    if(props['data']['quantity']) props['data']['quantity'] = props['data']['quantity'] - 1;
                    if(choice['submitted'] && props['data']['submitted']) props['data']['submitted'] = props['data']['submitted'] - 1;
                    if(choiceIndex === 0){
                        if(props['onDelete'] && typeof props['onDelete'] === 'function'){
                            props['onDelete']();
                        }
                    }
                    else{
                        if(props['onUpdateRecipe'] && typeof props['onUpdateRecipe'] === 'function'){
                            props['onUpdateRecipe']();
                        }
                    }
                    break;
                }
            }
        }
    }

    const handleDecreaseQuantity = e => {
        e.stopPropagation();
        handleChangeQuantity(-1);
    };

    const handleIncreaseQuantity = e => {
        e.stopPropagation();
        handleChangeQuantity(1);
    };

    const handleTagChange = tag => {
        if(tag['submitted']){
            tag['submitted'] = false;
        }
        if(data['information']){
            data['submitted'] = 0;
            for(let choice of data['information']){
                if(choice['submitted']) data['submitted']++;
            }
        }
        if(props['onUpdateRecipe'] && typeof props['onUpdateRecipe'] === 'function'){
            props['onUpdateRecipe']();
        }
        refreshComponent();
    }

    const handleIngredientStockChange = data => {
        let found = false;
        const counts = [];
        if(props['data'] && props['data']['ingredients'] && data['ingredient'] && data['count'] !== undefined){
            for(let ingredient of props['data']['ingredients']){
                if(ingredient['ingredient'] && ingredient['ingredient'] === data['ingredient']){
                    if(data['count'] === null){
                        ingredient['count'] = null;
                    }
                    else if(ingredient['required_units'] !== undefined && ingredient['required_units'] !== null){
                        ingredient['count'] = data['count'];
                        counts.push(Math.floor(data['count'] / ingredient['required_units']));
                    }
                    found = true;
                }
            }
        }
        if(found){
            if(counts.length > 0){
                props['data']['count'] = Math.min(counts);
            }
            refreshComponent();
        }
    }

    useEffect(() => {
        socket.on('DELETE_EXTERNAL_RECIPE', handleDeleteExternalRecipe);
        socket.on('SET_INGREDIENT_COUNT', handleIngredientStockChange);

        return () => {
            socket.off('DELETE_EXTERNAL_RECIPE', handleDeleteExternalRecipe);
            socket.off('SET_INGREDIENT_COUNT', handleIngredientStockChange);
        }

    }, [socket, props['data']['quantity'], props['data']['submitted']]);

    if(!props['data']) return null;

    const data = props['data'];

    const category = data['category'];
    const section = data['section'];
    const recipeName = data['recipe'];
    const ingredients = data['ingredients'];
    const quantity = data['quantity'];
    const count = data['count'];
    const information = data['information'];

    let submittedQuantity = data['submitted'];
    if(submittedQuantity === undefined){
        submittedQuantity = 0;
    }
    let allQuantitiesSubmitted = true;
    if(quantity && quantity > submittedQuantity){
        allQuantitiesSubmitted = false;
    }

    let countBadge = null;

    if(count && count > 0){
        let countValue = count.toString();
        if(count > 10){
            countValue = '10+';
        }
        countBadge = (
            <div className={"recipe-tile-quantity-badge"}>
                <p>{countValue}</p>
            </div>
        );
    }

    const badge = !!props['selectable'] ? (
        <div className={"recipe-tile-badge add"}>
            <img src={AddSymbol} alt={"Add"} />
        </div>
    ) : (
        <div className={"recipe-tile-badge"}>
            <img src={EditSymbol} alt={"Edit"} />
        </div>
    );

    const quantitySelector = !!props['selectable'] ? null : (
        <form className={"recipe-tile-quantity-selector-container"}>
            <input type={"button"} value={"–"} onClick={handleDecreaseQuantity} />
            <p>{quantity}</p>
            <input type={"button"} value={"+"} onClick={handleIncreaseQuantity} />
        </form>
    );

    const expandedContent = !props['selectable'] ? (
        <div className={"recipe-tile-expanded-content"}>
            <h1>{recipeName}</h1>
            <h3>{section} | {category}</h3>
            <form>
                <input type={"button"} value={"← Back to Order"} onClick={handleCollapse} />
            </form>
            <h2>Preferences</h2>
            <h3>Quantity</h3>
            {quantitySelector}
            <div className={"recipe-tile-expanded-content-tag-configurator-container"}>
                {information ? (information.map((inf, infIndex) => <RecipeTileTagConfigurator key={`tag-configurator-${infIndex}`} data={inf} ingredients={ingredients} index={infIndex + 1} onSave={tag => {
                    handleTagChange(tag);
                }} onDelete={tag => {
                    handleTagChange(tag);
                }} />)) : <p className={"error"}>Couldn't load order information.</p>}
            </div>
            <h2>Ingredients</h2>
            <ul>
                {ingredients.map(ing => <li key={`ingredients-list-${ing['ingredient']}`}>{ing['measure']} {ing['unit'] !== ' ' ? ing['unit'] : ""} {ing['ingredient']}</li>)}
            </ul>
        </div>
    ) : null;

    const content = (
        <>
            <div className={"recipe-tile-content"}>
                {expandedContent}
                <div className={"recipe-tile-content-data"}>
                    {countBadge}
                    {badge}
                    <h4 className={showEllipses ? "overflowing" : null} ref={text} >{recipeName}</h4>
                </div>
            </div>
            {quantitySelector}
        </>
    );

    const classes = ["recipe-tile"];
    if(!!props['selectable']){
        classes.push("selectable");
        if(count !== undefined && count !== null && count <= 10){
            if(count <= 5){
                classes.push("critical-stock");
                if(count < 1){
                    classes.push("out-of-stock");
                }
            }
            else{
                classes.push("low-stock");
            }
        }
    }
    if(!allQuantitiesSubmitted){
        classes.push("not-submitted");
    }
    if(!!props['hide']){
        classes.push('hide');
    }
    if(!!props['expand']){
        classes.push('open');
    }


    return (
        <Draggable draggableId={`${recipeName}${!!props['selectable'] ? '-selectable' : ''}`} index={props['index']} isDragDisabled={disableDrag}>
            {
                (provided, snapshot) => (
                    <>
                        <div className={classes.join(" ")} onClick={handleClick} ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            {content}
                            {provided.placeholder}
                        </div>
                        {!snapshot.isDragging || !props['selectable'] ? null : (
                            <div className={"recipe-tile clone"} onClick={handleClick}>
                                {content}
                                {provided.placeholder}
                            </div>
                        )}
                    </>
                )
            }
        </Draggable>

    );

}
