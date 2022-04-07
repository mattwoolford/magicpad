import React, {useContext, useEffect, useRef, useState} from 'react';

import './RecipeTileTagConfigurator.css';
import useRefreshComponent from "../../useRefreshComponent";
import {SocketContext} from "../../socket";
import {UserContext} from "../../user";

export default function RecipeTileTagConfigurator(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const index = props['index'] ? props['index'] : 1;
    const data = props['data'];
    const [showIngredientsSelector, setShowIngredientsSelector] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);

    const [modeSelectorValue, setModeSelectorValue] = useState('');
    const [ingredientsSelectorValue, setIngredientsSelectorValue] = useState('');
    const [conjunctive, setConjunctive] = useState('');
    const [textInputValue, setTextInputValue] = useState('');

    const refreshComponent = useRefreshComponent();

    const ingredientsSelector = useRef();
    const textInput = useRef();

    const handleFormModeChange = mode => {
        let showIngredients = false;
        let conj = '';
        let showText = false;
        switch(mode){
            case 'No':
            case 'Extra':
                showIngredients = true;
                break;
            case 'Swap':
                showIngredients = true;
                conj = 'for';
                showText = true;
                break;
            case 'Custom':
                showText = true;
                break;
            default:
                break;
        }
        setShowIngredientsSelector(showIngredients);
        setConjunctive(conj);
        setShowTextInput(showText);
        setModeSelectorValue(mode);
        if(ingredientsSelector.current){
            ingredientsSelector.current.value = '';
            setIngredientsSelectorValue('');
        }
        if(textInput.current){
            textInput.current.value = '';
            setTextInputValue('');
        }
    }

    const handleIngredientsSelectorChange = e => {
        setIngredientsSelectorValue(e.target.value);
    }

    const handleTextInputChange = e => {
        setTextInputValue(e.target.value);
    }

    const handleSave = () => {
        const parts = [(modeSelectorValue === 'Custom' ? '' : modeSelectorValue), ingredientsSelectorValue, conjunctive, textInputValue].filter((part) => {
            return part !== '';
        });
        const value = parts.join(' ');
        if(data && data['tags']) data['tags'].push(value);
        data['ordered_by'] = user.username;
        data['submitted'] = false;
        data['submitted_by'] = null;
        handleFormModeChange(modeSelectorValue);
        socket.emit('ADD_TAG', {
            auth: user.privateAuthCode,
            table_recipe_id: data['table_recipe_id'],
            tag: value
        });
        if(props['onSave'] && typeof props['onSave'] === 'function'){
            props['onSave'](data);
        }
    }

    const handleAddExternalTag = socket_data => {
        if(socket_data['tag'] && socket_data['table_recipe_id'] && socket_data['table_recipe_id'] === data['table_recipe_id'] && data && data['tags']){
            if(socket_data['ordered_by']) data['ordered_by'] = socket_data['ordered_by'];
            data['submitted'] = false;
            data['submitted_by'] = null;
            const temp = Array.from(data['tags']);
            temp.push(socket_data['tag']);
            data['tags'] = temp;
            if(props['onSave'] && typeof props['onSave'] === 'function'){
                props['onSave'](data);
            }
            refreshComponent();
        }
    }

    const handleDeleteTag = index => {
        if(data['tags'] && index < data['tags'].length){
            const tableRecipeID = data['table_recipe_id'];
            const tag = data['tags'][index];
            data['ordered_by'] = user.username;
            data['tags'].splice(index, 1);
            data['submitted'] = false;
            data['submitted_by'] = null;
            socket.emit('DELETE_TAG', {
                auth: user.privateAuthCode,
                table_recipe_id: tableRecipeID,
                tag: tag
            });
            refreshComponent();
        }
        if(props['onDelete'] && typeof props['onDelete'] === 'function'){
            props['onDelete'](data);
        }
    }

    const handleDeleteExternalTag = socket_data => {
        if(socket_data['tag'] && socket_data['table_recipe_id'] && socket_data['table_recipe_id'] === data['table_recipe_id'] && data && data['tags']){
            const temp = Array.from(data['tags']);
            const index = temp.indexOf(socket_data['tag']);
            if(index >= 0){
                temp.splice(index, 1);
                if(socket_data['ordered_by']) data['ordered_by'] = socket_data['ordered_by'];
                data['tags'] = temp;
                data['submitted'] = false;
                data['submitted_by'] = null;
                refreshComponent();
                if(props['onDelete'] && typeof props['onDelete'] === 'function'){
                    props['onDelete'](data);
                }
            }
        }
    }

    useEffect(() => {

        socket.on('ADD_EXTERNAL_TAG', handleAddExternalTag);
        socket.on('DELETE_EXTERNAL_TAG', handleDeleteExternalTag);

        return () => {
            socket.off('ADD_EXTERNAL_TAG', handleAddExternalTag);
            socket.off('DELETE_EXTERNAL_TAG', handleDeleteExternalTag);
        }

    }, [socket]);

    if(!data || typeof data !== 'object') return null;

    const ingredients = (props['ingredients'] && typeof props['ingredients'] === 'object') ? props['ingredients'] : [];

    return(
        <>
            <div className={"recipe-tile-tag-configurator"}>
                <span className={"recipe-tile-tag-configurator-header"}>
                    <h3>Choice {index}</h3>
                    <p className={!data['submitted'] ? "error" : "response"}>{!data['submitted'] ? "Order not put through" : "Order put through"}</p>
                </span>
                <form>
                    <select defaultValue={''} onChange={e => {handleFormModeChange(e.target.value)}}>
                        <option value={''} disabled={true}>Choose an option...</option>
                        <option value={'No'}>No</option>
                        <option value={'Extra'}>Extra</option>
                        <option value={'Swap'}>Swap</option>
                        <option value={'Custom'}>Custom message</option>
                    </select>
                    <span className={"recipe-tile-tag-configurator-options-area"}>
                        {showIngredientsSelector ? (
                            <select defaultValue={''} onChange={handleIngredientsSelectorChange} ref={ingredientsSelector}>
                                <option value={''} disabled={true}>Choose an ingredient...</option>
                                {ingredients.map((ing, ingIndex) => <option key={`recipe-tile-tag-configurator-ingredient-${ingIndex}`} value={ing['ingredient']}>{ing['ingredient']}</option>)}
                            </select>
                        ) : null}
                        <p className={"conjunctive"}>{conjunctive}</p>
                        {showTextInput ? (
                            <input type={"text"} placeholder={"Start typing..."} onChange={handleTextInputChange} ref={textInput} maxLength={30} />
                        ) : null}
                        {(showIngredientsSelector || showTextInput) ? (
                            <input type={"button"} value={"+ Add"} disabled={((showIngredientsSelector && (!ingredientsSelectorValue || ingredientsSelectorValue === '')) || (showTextInput && (!textInputValue || textInputValue === '')))} onClick={handleSave} />
                        ) : null}
                    </span>
                </form>
            </div>
            <div className={"recipe-tile-tag-configurator-tags"}>
                {data['tags'].map((tag, tagIndex) => {
                    return (
                        <div key={`recipe-tile-tag-configurator-tags-${tagIndex}`}
                             className={"recipe-tile-tag-configurator-tag"}>
                            <p>+ {tag}</p>
                            <form>
                                <input type={"button"} value={"x"} onClick={() => {handleDeleteTag(tagIndex);}} />
                            </form>
                        </div>
                    )
                }).reverse()}
            </div>
        </>
    )

}
