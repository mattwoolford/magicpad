import React, {useContext, useEffect, useRef, useState} from 'react';

import './ManageStock.css';
import Page from "../Page/Page";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import useRefreshComponent from "../../useRefreshComponent";
import {SocketContext} from "../../socket";
import {UserContext} from "../../user";

export default function ManageStock(props){

    const socket = useContext(SocketContext);
    const user = useContext(UserContext);

    const refreshComponent = useRefreshComponent();

    const [unitsLoading, setUnitsLoading] = useState(false);
    const [showUnitsEditArea, setShowUnitsEditArea] = useState(false);

    const [unitsError, setUnitsError] = useState(null);
    const [unitsResponse, setUnitsResponse] = useState(null);

    const [ingredientsError, setIngredientsError] = useState(null);
    const [ingredientsResponse, setIngredientsResponse] = useState(null);

    const [units, setUnits] = useState([]);
    const [selectedUnitValue, setSelectedUnitValue] = useState(null);
    const [selectedUnit, setSelectedUnit] = useState(null);

    const [unitUnitInput, setUnitUnitInput] = useState(null);
    const [unitGramsInput, setUnitGramsInput] = useState(null);

    const [ingredientsLoading, setIngredientsLoading] = useState(false);
    const [showIngredientsEditArea, setShowIngredientsEditArea] = useState(false);

    const [ingredients, setIngredients] = useState([]);
    const [selectedIngredientValue, setSelectedIngredientValue] = useState(null);
    const [selectedIngredient, setSelectedIngredient] = useState(null);

    const [ingredientIngredientInput, setIngredientIngredientInput] = useState("");
    const [ingredientQuantityInput, setIngredientQuantityInput] = useState("");
    const [ingredientCountInput, setIngredientCountInput] = useState("");

    const unitUnitInputRef = useRef();
    const unitGramsInputRef = useRef();

    const ingredientIngredientInputRef = useRef();
    const ingredientQuantityInputRef = useRef();
    const ingredientCountInputRef = useRef();

    const handleSelectUnit = e => {
        setUnitsError(null);
        setUnitsResponse(null);
        if(e.target.value.toLowerCase() === 'new unit'){
            setSelectedUnit({
                unit: '',
                conversion_to_grams: ''
            })
            setUnitUnitInput('');
            setUnitGramsInput('');
            if(unitUnitInputRef.current) unitUnitInputRef.current.value = '';
            if(unitGramsInputRef.current) unitGramsInputRef.current.value = '';
        }
        else if(units && units.length > 0){
            for(let unit of units){
                if(e.target.value === unit['unit']){
                    setSelectedUnit(unit);
                    setUnitUnitInput(unit['unit']);
                    setUnitGramsInput(unit['grams']);
                    if(unitUnitInputRef.current) unitUnitInputRef.current.value = unit['unit'];
                    if(unitGramsInputRef.current) unitGramsInputRef.current.value = unit['grams'] ? unit['grams'] : '';
                    break;
                }
            }
        }
        setSelectedUnitValue(e.target.value);
        refreshComponent();
    }

    const handleUnitChange = e => {
        setUnitUnitInput(e.target.value);
    }

    const handleUnitGramsChange = e => {
        setUnitGramsInput(e.target.value);
    }

    const handleSaveUnit = () => {
        setUnitsError(null);
        setUnitsResponse(null);
        setUnitsLoading(true);
        if(selectedUnitValue && selectedUnitValue.length > 0){
            const newUnit = {
                unit: unitUnitInput,
                conversion_to_grams: parseFloat(unitGramsInput)
            };
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/units/${selectedUnitValue.toLowerCase() === 'new unit' ? "new" : selectedUnitValue}`, {
                credentials: 'include',
                method: selectedUnitValue.toLowerCase() === 'new unit' ? "PUT" : "POST",
                body: JSON.stringify(newUnit),
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(async request => {
                    const response = await request.json();
                    switch(response.status){
                        case 200:
                        case 201:
                            setUnitsResponse('Changes saved successfully');
                            const temp = Array.from(units);
                            if(selectedUnitValue.toLowerCase() !== 'new unit'){
                                for(let unitIndex = 0; unitIndex < temp.length; unitIndex++){
                                    let unit = temp[unitIndex];
                                    if(unit['unit'] === selectedUnitValue){
                                        temp.splice(unitIndex, 1);
                                    }
                                }
                                setSelectedUnit(null);
                                setSelectedUnitValue(null);
                            }
                            newUnit['unitLabel'] = newUnit['unit'];
                            newUnit['grams'] = newUnit['conversion_to_grams'];
                            delete newUnit['conversion_to_grams'];
                            temp.push(newUnit);
                            temp.sort((a, b) => {
                                return a['unit'] > b['unit'];
                            })
                            setUnits(temp);
                            if(unitUnitInputRef.current) unitUnitInputRef.current.value = '';
                            if(unitGramsInputRef.current) unitGramsInputRef.current.value = '';
                            break;
                        default:
                            setUnitsError(response.message);
                    }
                    setUnitsLoading(false);
                    refreshComponent();
                })
                .catch(err => {
                    setUnitsError('Could not add unit. Please try again later.');
                    setUnitsLoading(false);
                })
        }
    }

    const handleDeleteUnit = e => {
        e.preventDefault();
        setUnitsResponse(null);
        setUnitsError(null);
        setUnitsLoading(true);
        if(selectedUnitValue && selectedUnitValue.toLowerCase() !== 'new unit' && window.confirm('Deleting this unit will delete all ingredients that use this unit and may modify existing recipes. This cannot be undone. Are you sure you want to continue?')){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/units/${selectedUnitValue}`, {
                method: 'DELETE',
                body: JSON.stringify({}),
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
                .then(async request => {
                    const response = await request.json();
                    setUnitsLoading(false);
                    switch(response.status){
                        case 200:
                            setUnitsResponse('Changes saved successfully');
                            const temp = Array.from(units);
                            for(let i = 0; i < temp.length; i++){
                                let unit = temp[i];
                                if(unit['unit'] === selectedUnitValue){
                                    temp.splice(i, 1);
                                    break;
                                }
                            }
                            setUnits(temp);
                            refreshComponent();
                            break;
                        default:
                            setUnitsLoading(false);
                            setUnitsError('Could not save changes. Please try again later.');
                    }
                })
                .catch(err => {
                    setUnitsLoading(false);
                    setUnitsError('Could not save changes. Please try again later.');
                })
        }
    }

    const handleSelectIngredient = e => {
        setIngredientsError(null);
        setIngredientsResponse(null);
        if(e.target.value === 'New Ingredient'){
            setSelectedIngredient({
                ingredient: '',
                unit_quantity_in_g: '0.00000',
                count: null
            });
            if(ingredientIngredientInputRef.current) ingredientIngredientInputRef.current.value = '';
            if(ingredientQuantityInputRef.current) ingredientQuantityInputRef.current.value = '0.00000';
            if(ingredientCountInputRef.current) ingredientCountInputRef.current.value = '';
        }
        else if(ingredients && ingredients.length > 0){
            for(let ing of ingredients){
                if(e.target.value === ing['ingredient']){
                    setSelectedIngredient(ing);
                    setIngredientIngredientInput(ing['ingredient'] ? ing['ingredient'] : "");
                    setIngredientQuantityInput(ing['unit_quantity_in_g'] ? ing['unit_quantity_in_g'].toString() : "");
                    setIngredientCountInput(ing['count']);
                    if(ingredientIngredientInputRef.current) ingredientIngredientInputRef.current.value = ing['ingredient'];
                    if(ingredientQuantityInputRef.current) ingredientQuantityInputRef.current.value = ing['unit_quantity_in_g'];
                    if(ingredientCountInputRef.current) ingredientCountInputRef.current.value = ing['count'] !== null ? ing['count'] : '';
                    break;
                }
            }
        }
        setSelectedIngredientValue(e.target.value);
        refreshComponent();
    }

    const handleIngredientChange = e => {
        setIngredientIngredientInput(e.target.value);
    }

    const handleIngredientQuantityChange = e => {
        setIngredientQuantityInput(e.target.value ? e.target.value : "");
    }

    const handleIngredientCountChange = e => {
        setIngredientCountInput(e.target.value);
    }

    const handleSaveIngredient = () => {
        setIngredientsLoading(true);
        setIngredientsResponse(null);
        setIngredientsError(null);
        const newIngredient = {
            ingredient: ingredientIngredientInput,
            unit_quantity_in_g: ingredientQuantityInput ? parseFloat(ingredientQuantityInput) : 0,
            count: ingredientCountInput ? parseFloat(ingredientCountInput) : null
        }
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/ingredients/${selectedIngredientValue.toLowerCase() === 'new ingredient' ? "new" : selectedIngredientValue}`, {
            credentials: 'include',
            method: selectedIngredientValue.toLowerCase() === 'new ingredient' ? "PUT" : "POST",
            body: JSON.stringify(newIngredient),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
            .then(async request => {
                const response = await request.json();
                switch(response.status){
                    case 200:
                    case 201:
                        setIngredientsResponse('Changes saved successfully');
                        const temp = Array.from(ingredients);
                        if(selectedIngredientValue.toLowerCase() !== 'new ingredient'){
                            for(let ingIndex = 0; ingIndex < temp; ingIndex++){
                                let ing = temp[ingIndex];
                                if(ing['ingredient'].toLowerCase() === newIngredient['ingredient'].trim().toLowerCase()){
                                    temp.splice(ingIndex, 1);
                                    break;
                                }
                            }
                            socket.emit("BROADCAST_INGREDIENT_COUNT", {
                                auth: user.privateAuthCode,
                                ingredient: newIngredient['ingredient'].trim(),
                                count: newIngredient['count']
                            });
                        }
                        else{
                            setIngredientIngredientInput("");
                            setIngredientQuantityInput("");
                            setIngredientCountInput("");
                            if(ingredientIngredientInputRef.current) ingredientIngredientInputRef.current.value = '';
                            if(ingredientQuantityInputRef.current) ingredientQuantityInputRef.current.value = '';
                            if(ingredientCountInputRef.current) ingredientCountInputRef.current.value = '';
                        }
                        temp.push(newIngredient);
                        temp.sort((a, b) => {
                            return a['ingredient'] > b['ingredient'];
                        });
                        setIngredients(temp);
                        refreshComponent();
                        break;
                    default:
                        setIngredientsError(response.message);
                }
                setIngredientsLoading(false);
            })
            .catch(err => {
                setIngredientsError('Could not save changes. Please try again later.');
                setIngredientsLoading(false);
            })
    }

    useEffect(() => {

        setShowUnitsEditArea(selectedUnit !== null);

    }, [selectedUnit]);

    useEffect(() => {
        setShowIngredientsEditArea(selectedIngredient !== null);
    }, [selectedIngredient]);

    useEffect(() => {

        let mounted = true;

        setUnitsLoading(true);

        //Get units

        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/units`, {
            credentials: 'include'
        })
            .then(async request => {
                const response = await request.json();
                if(response.status === 200 && response.units){
                    const temp = [];
                    for(let unit of response.units){
                        let temp_unit = {
                            unit: unit['unit'],
                            unitLabel: unit['unit'],
                            grams: unit['conversion_to_grams']
                        }
                        if(unit['unit'].match(/^[\s]*$/)){
                            temp_unit['unitLabel'] = 'None (Measure in Quantity)';
                        }
                        temp.push(temp_unit);
                    }
                    if(mounted) setUnits(temp);
                }
                if(mounted) setUnitsLoading(false);
            })
            .catch(err => {
                setUnitsLoading(false);
            })

        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/ingredients`, {
            credentials: 'include'
        })
            .then(async request => {
                const response = await request.json();
                if(mounted){
                    if(response.status === 200 && response.ingredients){
                        setIngredients(response.ingredients);
                    }
                    setIngredientsLoading(false);
                }
            })
            .catch(err => {
                if(mounted) setIngredientsLoading(false);
            });

        return () => {
            mounted = false;
        }

    }, []);

    return (
        <Page allowScroll={true}>
            <div className={"manage-stock"}>
                <h1>Stock</h1>
                <form className={"edit-units-form"} onSubmit={handleDeleteUnit}>
                    {unitsLoading && <LoadingIcon fill />}
                    <h3>Units of Measure</h3>
                    {unitsError && <p className={"error"}>{unitsError}</p>}
                    {unitsResponse && <p className={"response"}>{unitsResponse}</p>}
                    <select defaultValue={''} onChange={handleSelectUnit}>
                        <option value={''} disabled>Choose a unit</option>
                        <optgroup label={"New unit of measure"}>
                            <option value={'New Unit'}>+ New Unit of Measure</option>
                        </optgroup>
                        <optgroup label={"Existing units of measure"}>
                            {units && units.length > 0 && units.map((unit, unitIndex) => unit['unit'].match(/^[\s]*$/) ? null : <option key={`units-option-${unitIndex}`} value={unit['unit']}>{unit['unitLabel']}</option>)}
                        </optgroup>
                    </select>
                    {showUnitsEditArea && <div className={"units-edit-area"}>
                        <br />
                        <br />
                        <label htmlFor={'edit-unit-unit-input'}>Unit denotation</label>
                        <input id={`edit-unit-unit-input`} type={"text"} name={"unit"} placeholder={"Unit denotation"} defaultValue={selectedUnit && selectedUnit['unit'] ? selectedUnit['unit'] : ''} onChange={handleUnitChange} maxLength={16} ref={unitUnitInputRef} />
                        <br />
                        <label htmlFor={'edit-unit-g-input'}>Conversion to <strong>grams (g)</strong> (use standard metric conversions, such as 1 ml of water = 1 g)<br /><br /><strong>Leave empty if measured in unit quantity</strong></label>
                        <input id={'edit-unit-g-input'} type={'text'} name={'g'} placeholder={'Conversion in g'} defaultValue={selectedUnit && selectedUnit['grams'] ? selectedUnit['grams'] : ''} onKeyPress={e => {
                            if(!/^([0-9]{0,5}(\.|\.[0-9]{1,5})?)$/.test(e.target.value + e.key)){
                                e.preventDefault();
                            }
                        }} maxLength={11} onChange={handleUnitGramsChange} ref={unitGramsInputRef} />
                        <input type={"button"} value={"Save Changes"} disabled={!unitUnitInput || unitUnitInput.trim().length < 1} onClick={handleSaveUnit} />
                        <input type={"submit"} value={"Delete Unit of Measure"} disabled={selectedUnitValue && selectedUnitValue.toLowerCase() === 'new unit'} />
                    </div>}
                </form>
                <form className={'edit-ingredients-form'}>
                    {ingredientsLoading && <LoadingIcon fill />}
                    <h3>Ingredients</h3>
                    {ingredientsError && <p className={"error"}>{ingredientsError}</p>}
                    {ingredientsResponse && <p className={"response"}>{ingredientsResponse}</p>}
                    <select defaultValue={''} onChange={handleSelectIngredient}>
                        <option value={''} disabled>Choose an ingredient</option>
                        <optgroup label={'New ingredient'}>
                            <option value={'New Ingredient'}>+ New Ingredient</option>
                        </optgroup>
                        <optgroup label={'Existing ingredients'}>
                            {ingredients && ingredients.length > 0 && ingredients.map((ing, ingIndex) => <option key={`ingredients-option-${ingIndex}`} value={ing['ingredient']}>{ing['ingredient']}</option>)}
                        </optgroup>
                    </select>
                    {showIngredientsEditArea && (
                        <div className={"ingredients-edit-area"}>
                            <br />
                            <br />
                            <label htmlFor={'edit-ingredient-ingredient-input'}>Ingredient name</label>
                            <input id={'edit-ingredient-ingredient-input'} type={"text"} name={"ingredient"} placeholder={"Ingredient name"} defaultValue={selectedIngredient && selectedIngredient['ingredient'] ? selectedIngredient['ingredient'] : ''} maxLength={64} onChange={handleIngredientChange} ref={ingredientIngredientInputRef} />
                            <br />
                            <label htmlFor={'edit-ingredient-quantity-input'}>Unit quantity in <strong>grams (g)</strong> (use standard metric conversions, such as 1 ml of water = 1 g)<br /><br /><strong>Do not include the weight of any container</strong></label>
                            <input id={'edit-ingredient-quantity-input'} type={"text"} name={"unit_quantity"} placeholder={"Unit quantity"} defaultValue={selectedIngredient && selectedIngredient['unit_quantity_in_g'] ? selectedIngredient['unit_quantity_in_g'] : ''} onKeyPress={e => {
                                if(!/^([0-9]{0,5}(\.|\.[0-9]{1,5})?)$/.test(e.target.value + e.key)){
                                    e.preventDefault();
                                }
                            }} maxLength={11} onChange={handleIngredientQuantityChange} ref={ingredientQuantityInputRef} />
                            <label htmlFor={'edit-ingredient-count-input'}>Unit Stock Count</label>
                            {(!ingredientQuantityInput || isNaN(ingredientQuantityInput) || parseFloat(ingredientQuantityInput) <= 0) && (
                                <p className={"error"} style={{marginTop: 0}}>Stock levels can't deplete if the unit quantity is unknown.</p>
                            )}
                            <input id={'edit-ingredient-count-input'} type={"text"} name={"count"} placeholder={"Count"} onKeyPress={e => {
                                if(!/^([0-9]{0,5}(\.|\.[0-9]{1,2})?)$/.test(e.target.value + e.key)){
                                    e.preventDefault();
                                }
                            }} defaultValue={selectedIngredient && selectedIngredient['count'] ? selectedIngredient['count'].toString() : ''} maxLength={8} onChange={handleIngredientCountChange} ref={ingredientCountInputRef} />
                            <input type={"button"} value={'Save Changes'} disabled={!ingredientIngredientInput || ingredientIngredientInput.trim().length < 1  || ingredientIngredientInput.trim().toLowerCase() === 'new ingredient' || !ingredientQuantityInput || ingredientQuantityInput.trim().length < 1} onClick={handleSaveIngredient} />
                            <input type={"submit"} value={"Delete Ingredient"} disabled={selectedIngredientValue && selectedIngredientValue.toLowerCase() === 'new ingredient'} />
                        </div>
                    )}
                </form>
            </div>
        </Page>
    )
}
