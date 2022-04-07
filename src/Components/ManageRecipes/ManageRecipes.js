import React, {useEffect, useRef, useState} from 'react';

import './ManageRecipes.css';
import Page from "../Page/Page";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import useRefreshComponent from "../../useRefreshComponent";
import {cloneDeep} from "lodash";

export default function ManageRecipes(props){

    const refreshComponent = useRefreshComponent();

    const [editSectionsLoading, setEditSectionsLoading] = useState(false);
    const [editRecipesLoading, setEditRecipesLoading] = useState(false);

    const [categories, setCategories] = useState([]);
    const [recipes, setRecipes] = useState([]);
    const [ingredients, setIngredients] = useState([]);
    const [units, setUnits] = useState([]);

    const [selectedRecipeCategory, setSelectedRecipeCategory] = useState(null);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const [sectionEditSelectedCategory, setSectionEditSelectedCategory] = useState(null);
    const [sectionEditSections, setSectionEditSections] = useState([]);
    const [sectionEditSelectedSection, setSectionEditSelectedSection] = useState('');

    const [sectionEditCategory, setSectionEditCategory] = useState(null);
    const [sectionEditSection, setSectionEditSection] = useState(null);

    const [sectionEditError, setSectionEditError] = useState(null);
    const [sectionEditResponse, setSectionEditResponse] = useState(null);

    const [recipeEditName, setRecipeEditName] = useState(null);
    const [recipeEditCategory, setRecipeEditCategory] = useState('');
    const [recipeEditSection, setRecipeEditSection] = useState('');
    const [recipeEditSections, setRecipeEditSections] = useState([]);

    const [recipeEditIngredientQuantity, setRecipeEditIngredientQuantity] = useState('');
    const [recipeEditIngredientUnit, setRecipeEditIngredientUnit] = useState('');
    const [recipeEditIngredient, setRecipeEditIngredient] = useState(null);

    const [recipeEditError, setRecipeEditError] = useState(null);
    const [recipeEditResponse, setRecipeEditResponse] = useState(null);

    const categoryEditNameInput = useRef();
    const sectionEditNameInput = useRef();

    const recipeEditNameInput = useRef();

    const recipeEditIngredientQuantityInput = useRef();
    const recipeEditIngredientUnitInput = useRef();
    const recipeEditIngredientInput = useRef();

    const handleEditSectionEditCategoryChange = e => {
        setSectionEditError(null);
        setSectionEditResponse(null);
        setSectionEditCategory(e.target.value);
    }

    const handleEditSectionDeleteCategory = () => {
        setSectionEditResponse(null);
        setSectionEditError(null);
        setEditSectionsLoading(true);
        if(sectionEditCategory && categories.includes(sectionEditCategory) && window.confirm('Deleting this category will also delete all sections in this category. This cannot be undone. Are you sure you want to continue?')){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/${sectionEditCategory}`, {
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
                    setEditSectionsLoading(false);
                    switch (response.status){
                        case 200:
                            setSectionEditResponse('Changes saved successfully');
                            const temp = Array.from(categories);
                            temp.splice(temp.indexOf(sectionEditCategory), 1);
                            setCategories(temp);
                            refreshComponent();
                            break;
                        default:
                            setSectionEditError(response.message);
                    }
                })
                .catch(err => {
                    setSectionEditError('Could not save changes. Please try again later');
                });
        }
    }

    const handleEditSectionEditSectionChange = e => {
        setSectionEditError(null);
        setSectionEditResponse(null);
        setSectionEditSection(e.target.value);
    }

    const handleEditSectionDeleteSection = () => {
        setSectionEditResponse(null);
        setSectionEditError(null);
        setEditSectionsLoading(true);
        if(sectionEditCategory && categories.includes(sectionEditCategory) && sectionEditSection && sectionEditSections.includes(sectionEditSection) && window.confirm(`You are about to delete the "${sectionEditSection}" section from the "${sectionEditCategory}" category. This cannot be undone. Are you sure you want to continue?`)){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/${sectionEditCategory}/sections/${sectionEditSection}`, {
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
                    setEditSectionsLoading(false);
                    switch (response.status){
                        case 200:
                            setSectionEditResponse('Changes saved successfully');
                            const temp = Array.from(categories);
                            temp.splice(temp.indexOf(sectionEditCategory), 1);
                            setCategories(temp);
                            refreshComponent();
                            break;
                        default:
                            setSectionEditError(response.message);
                    }
                })
                .catch(err => {
                    setSectionEditError('Could not save changes. Please try again later');
                });
        }
    }

    const saveSectionToCategory = category => {
        setSectionEditError(null);
        setSectionEditResponse(null);
        if(category && category.length > 0 && category.toLowerCase() !== 'new category' && sectionEditSelectedSection && sectionEditSelectedSection.length > 0){
            setEditSectionsLoading(true);
            let section = sectionEditSection;
            if(sectionEditSelectedSection.toLowerCase() === 'new section'){
                fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/${category}/sections/new`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        'section': section
                    }),
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                    .then(async request => {
                        const response = await request.json();
                        switch (response.status){
                            case 201:
                                const temp = Array.from(sectionEditSections);
                                temp.unshift(section);
                                temp.sort((a, b) => {
                                    return a > b;
                                });
                                setSectionEditSections(temp);
                                setSectionEditResponse('Section added successfully');
                                refreshComponent();
                                break;
                            default:
                                setSectionEditError(response.message);
                        }
                        setEditSectionsLoading(false);
                    })
                    .catch(err => {
                        setEditSectionsLoading(false);
                    })
            }
            else{
                fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/${category}/sections/${sectionEditSelectedSection}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        'section': section
                    }),
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                    .then(async request => {
                        const response = await request.json();
                        switch (response.status){
                            case 200:
                                const temp = Array.from(sectionEditSections);
                                for(let i = 0; i < temp.length; i++){
                                    let sec = temp[i];
                                    if(sec === sectionEditSelectedSection){
                                        temp[i] = sectionEditSection;
                                        break;
                                    }
                                }
                                setSectionEditSections(temp);
                                refreshComponent();
                                setSectionEditResponse('Changes saved successfully');
                                break;
                            default:
                                setSectionEditError(response.message);
                        }
                        setEditSectionsLoading(false);
                    })
                    .catch(err => {
                        setEditSectionsLoading(false);
                    })
            }
        }
    }

    const handleEditSectionsSave = e => {
        e.preventDefault();
        setSectionEditError(null);
        setSectionEditResponse(null);
        if(sectionEditSelectedCategory && sectionEditSelectedCategory.length > 0 && sectionEditCategory && sectionEditCategory.length > 0){
            let category = sectionEditCategory;
            if(sectionEditSelectedCategory.toLowerCase() === 'new category'){
                setEditSectionsLoading(true);
                fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/new`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        'category': category
                    }),
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                    .then(async request => {
                        const response = await request.json();
                        switch(response.status){
                            case 201:
                                setSectionEditResponse('Changes saved successfully');
                                if(sectionEditSection && sectionEditSection.length > 0){
                                    const temp = Array.from(categories);
                                    temp.unshift(category);
                                    setCategories(temp);
                                    refreshComponent();
                                    saveSectionToCategory(category);
                                }
                                break;
                            default:
                                setSectionEditError(response.message);
                        }
                        setEditSectionsLoading(false);
                    })
                    .catch(err => {
                        setEditSectionsLoading(false);
                    })
            }
            else{
                fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/categories/${sectionEditSelectedCategory}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        'category':  category
                    }),
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                })
                    .then(async request => {
                        const response = await request.json();
                        switch(response.status){
                            case 200:
                                setSectionEditResponse('Changes saved successfully');
                                if(sectionEditSection && sectionEditSection.length > 0){
                                    const temp = Array.from(categories);
                                    for(let i = 0; i < temp.length; i++){
                                        let cat = temp[i];
                                        if(cat === sectionEditSelectedCategory){
                                            temp[i] = sectionEditCategory;
                                            break;
                                        }
                                    }
                                    setCategories(temp);
                                    refreshComponent();
                                    saveSectionToCategory(category);
                                }
                                break;
                            default:
                                setSectionEditError(response.message);
                        }
                        setEditSectionsLoading(false);
                    })
                    .catch(err => {
                        setEditSectionsLoading(false);
                    })
            }
        }
    }

    const handleEditSectionCategoryChange = e => {
        setSectionEditSelectedCategory(e.target.value);
        setSectionEditCategory(e.target.value);
        if(categoryEditNameInput.current) categoryEditNameInput.current.value = e.target.value;
    }

    const handleEditSectionSectionChange = e => {
        setSectionEditSelectedSection(e.target.value);
        if(sectionEditNameInput.current) sectionEditNameInput.current.value = e.target.value;
    }

    const handleEditRecipeNameChange = e => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        setRecipeEditName(e.target.value);
    }

    const handleEditRecipeCategoryChange = e => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        setRecipeEditCategory(e.target.value);
    }

    const handleEditRecipeSectionChange = e => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        setRecipeEditSection(e.target.value);
    }

    const handleEditRecipeIngredientQuantityChange = e => {
        setRecipeEditIngredientQuantity(e.target.value);
    }

    const handleEditRecipeIngredientUnitChange = e => {
        setRecipeEditIngredientUnit(e.target.value);
    }

    const handleEditRecipeIngredientChange = e => {
        setRecipeEditIngredient(e.target.value);
    }

    const handleAddIngredient = e => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        if(recipeEditIngredientQuantity && recipeEditIngredientUnit && recipeEditIngredient && selectedRecipe){
            const temp = {
                ingredient: recipeEditIngredient,
                measure: recipeEditIngredientQuantity.toString(),
                unit: recipeEditIngredientUnit.toString()
            }
            if(!selectedRecipe['ingredients']) selectedRecipe['ingredients'] = [];
            selectedRecipe['ingredients'].unshift(temp);
            if(recipeEditIngredientUnitInput.current){
                recipeEditIngredientUnitInput.current.value = '';
                setRecipeEditIngredientUnit('');
            }
            if(recipeEditIngredientQuantityInput.current){
                recipeEditIngredientQuantityInput.current.value = '';
                setRecipeEditIngredientQuantity('');
            }
            if(recipeEditIngredientInput.current){
                recipeEditIngredientInput.current.value = '';
                setRecipeEditIngredient('');
            }
            refreshComponent();
        }
    }

    const handleDeleteIngredient = index => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        if(selectedRecipe && selectedRecipe['ingredients'] && index < selectedRecipe['ingredients'].length){
            selectedRecipe['ingredients'].splice(index, 1);
            refreshComponent();
        }
    }

    const setEditForm = recipe => {
        setRecipeEditError(null);
        setRecipeEditResponse(null);
        if(recipe){
            setSelectedRecipe(recipe);
            setRecipeEditName(recipe['recipe']);
            if(recipeEditNameInput.current){
                recipeEditNameInput.current.value = recipe['recipe'];
            }
            setRecipeEditCategory(recipe['category']);
            setRecipeEditSection(recipe['section']);
            //RecipeEditSections will set in useEffect()
            refreshComponent();
        }
        else{
            setSelectedRecipe(null);
            setRecipeEditName(null);
            setRecipeEditSection(null);
            setRecipeEditSections([]);
        }
        setRecipeEditIngredientQuantity('');
        setRecipeEditIngredientUnit('');
        setRecipeEditIngredient(null);
    }

    const handleEditRecipe = e => {
        e.preventDefault();
        if(selectedRecipe && selectedRecipe['recipe']){
            setEditRecipesLoading(true);
            setRecipeEditError(null);
            setRecipeEditResponse(null);
            const newRecipe = cloneDeep(selectedRecipe);
            let foundRecipe = null;
            for(let recipe of recipes){
                if(recipe['recipe'].trim().toLowerCase() === newRecipe['recipe'].trim().toLowerCase()){
                    foundRecipe = recipe;
                    break;
                }
            }
            if(selectedRecipe['recipe'] === 'New Recipe'){
                //Check if exists
                if(recipeEditName && recipeEditName.trim().toLowerCase() !== 'new recipe' && !recipeEditName.match(/^\s*$/)){
                    newRecipe['recipe'] = recipeEditName.trim();
                }
                else {
                    setRecipeEditError("New recipes need a name");
                    return;
                }
                if(recipeEditSection){
                    newRecipe['section'] = recipeEditSection;
                }
                else if(newRecipe['section']){
                    setRecipeEditError("New recipes need a section");
                    return;
                }
                if(recipeEditCategory){
                    newRecipe['category'] = recipeEditCategory;
                }
                else if(newRecipe['category']){
                    setRecipeEditError("New recipes need a category");
                    return;
                }
                if(foundRecipe && !window.confirm(`The recipe "${foundRecipe['recipe']}" already exists. Saving changes will delete the old recipe. Are you sure you want to continue?`)){
                    return;
                }
            }
            else{
                if(recipeEditName){
                    if(recipeEditName.trim().toLowerCase() !== 'new recipe' && !recipeEditName.match(/^\s*$/)){
                        newRecipe['recipe'] = recipeEditName.trim();
                    }
                    else{
                        setRecipeEditError('Recipes must have a name');
                    }
                }
                else if(newRecipe['recipe']){
                    delete newRecipe['recipe'];
                }
                if(recipeEditSection){
                    newRecipe['section'] = recipeEditSection;
                }
                else if(newRecipe['section']){
                    delete newRecipe['section'];
                }
                if(recipeEditCategory){
                    newRecipe['category'] = recipeEditCategory;
                }
                else if(newRecipe['category']){
                    delete newRecipe['category'];
                }
            }
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/${foundRecipe !== null ? selectedRecipe['recipe'] : 'new'}`, {
                credentials: 'include',
                method: foundRecipe !== null ? 'POST' : 'PUT',
                body: JSON.stringify(newRecipe),
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
                .then(async request => {
                    const response = await request.json();
                    if(response){
                        switch(response.status){
                            case 200:
                                setRecipeEditResponse('Changes saved successfully');
                                break;
                            case 201:
                                const temp = Array.from(recipes);
                                for(let recipeIndex = 0; recipeIndex < temp.length; recipeIndex++){
                                    let recipe = temp[recipeIndex];
                                    if(newRecipe['recipe'].trim().toLowerCase().localeCompare(recipe['recipe'].trim().toLowerCase()) >= 0){
                                        temp.splice(recipeIndex, 0, newRecipe);
                                        break;
                                    }
                                }
                                setRecipes(temp);
                                setEditForm(newRecipe);
                                setRecipeEditResponse('New recipe added');
                                break;
                            default:
                                setRecipeEditError(response.message);
                        }
                    }
                    setEditRecipesLoading(false);
                })
                .catch(err => {
                    setEditRecipesLoading(false);
                })
        }
    }

    const handleDeleteRecipe = () => {
        setRecipeEditResponse(null);
        setRecipeEditError(null);
        setEditRecipesLoading(true);
        if(selectedRecipe && selectedRecipe['recipe'] && selectedRecipe['recipe'].length > 0 && selectedRecipe['recipe'].toLowerCase() !== 'new recipe' && window.confirm(`You are about to delete the recipe "${selectedRecipe['recipe']}". This cannot be undone. Are you sure you want to continue?`)){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/recipes/${selectedRecipe['recipe']}`, {
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
                    setEditRecipesLoading(false);
                    switch (response.status){
                        case 200:
                            setRecipeEditResponse('Changes saved successfully');
                            const temp = Array.from(recipes);
                            for(let i = 0; i < temp.length; i++){
                                let r = temp[i];
                                if(r['recipe'] === selectedRecipe['recipe']){
                                    temp.splice(i, 0);
                                    break;
                                }
                            }
                            setRecipes(temp);
                            handleSelectRecipe({target: {value: ''}});
                            refreshComponent();
                            break;
                        default:
                            setRecipeEditError(response.message);
                    }
                })
                .catch(err => {
                    setRecipeEditError('Could not save changes. Please try again later');
                });
        }
    }

    const handleSelectCategory = e => {
        if(categories.includes(e.target.value)){
            setSelectedRecipeCategory(e.target.value);
            setRecipeEditCategory(e.target.value);
            setSelectedRecipe(null);
            setEditForm();
        }
    }

    const handleSelectRecipe = e => {
        if(selectedRecipeCategory){
            for(let recipe of recipes){
                if(recipe['recipe'] === e.target.value){
                    setEditForm(recipe);
                    return;
                }
            }
            const recipe = {
                category: selectedRecipeCategory,
                ingredients: [],
                recipe: 'New Recipe',
                section: ''
            }
            setEditForm(recipe);
        }
    }

    useEffect(() => {

        let mounted = true;


        setSectionEditSections([]);
        setSectionEditSelectedSection('');

        if(sectionEditSelectedCategory && sectionEditSelectedCategory !== 'New Category') {
            setEditSectionsLoading(true);
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/${sectionEditSelectedCategory}/sections`, {
                credentials: "include"
            })
                .then(async request => {
                    if (request.status === 200) {
                        const response = await request.json();
                        if (response['sections']) {
                            const temp = [];
                            for (let section of response['sections']) {
                                temp.push(section['section']);
                            }
                            if (mounted) {
                                setSectionEditSections(temp);
                            }
                        }
                    }
                    if(mounted){
                        setEditSectionsLoading(false);
                    }
                })
                .catch(err => {
                    setEditSectionsLoading(false);
                })
        }

        return () => {
            mounted = false;
        }

    }, [sectionEditSelectedCategory])

    useEffect(() => {

        let mounted = true;

        setRecipeEditSections([]);
        setRecipeEditSection('');

        if(recipeEditCategory) {
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/${recipeEditCategory}/sections`, {
                credentials: "include"
            })
                .then(async request => {
                    if (request.status === 200) {
                        const response = await request.json();
                        if (response['sections']) {
                            const temp = [];
                            for (let section of response['sections']) {
                                temp.push(section['section']);
                            }
                            if (mounted) {
                                setRecipeEditSections(temp);
                            }
                        }
                    }
                });
        }

        return () => {
            mounted = false;
        }

    }, [recipeEditCategory])

    useEffect(() => {
        let mounted = true;

        setEditRecipesLoading(true);

        if(selectedRecipeCategory){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/${selectedRecipeCategory}/recipes`, {
                credentials: 'include'
            })
                .then(async request => {
                    if(request.status === 200){
                        const response = await request.json();
                        if(response['recipes'] && mounted){
                            setRecipes(response['recipes']);
                            setEditRecipesLoading(false);
                        }
                    }
                })
                .catch(err => {
                    setEditRecipesLoading(false);
                })

            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/ingredients`, {
                credentials: "include"
            })
                .then(async request => {
                    if(request.status === 200){
                        const response = await request.json();
                        if(response['ingredients']){
                            const temp = [];
                            for(let ing of response['ingredients']){
                                if(ing['ingredient']) temp.push(ing['ingredient']);
                            }
                            if(mounted){
                                setIngredients(temp);
                            }
                        }
                    }
                });

            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/units`, {
                credentials: "include"
            })
                .then(async request => {
                    if(request.status === 200){
                        const response = await request.json();
                        if(response['units']){
                            for(let i = 0; i < response['units'].length; i++){
                                let unit = response['units'][i];
                                let temp = {};
                                temp['unit'] = unit['unit'];
                                temp['label'] = unit['unit'];
                                if(/^[\s]*$/.test(unit['unit'])){
                                    temp['label'] = "None (Measure in quantity)";
                                }
                                response['units'][i] = temp;
                            }
                            if(mounted){
                                setUnits(response['units']);
                            }
                        }
                    }
                });
        }

        return () => {
            mounted = false;
        }
    }, [selectedRecipeCategory]);

    useEffect(() => {

        let mounted = true;

        setEditRecipesLoading(false);

        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/categories`, {
            credentials: 'include'
        })
            .then(async request => {
                if(request.status === 200){
                    const response = await request.json();
                    if(response['categories']){
                        const temp = [];
                        for(let category of response['categories']){
                            temp.push(category['category']);
                        }
                        if(mounted){
                            setCategories(temp);
                            setEditRecipesLoading(false);
                        }
                    }
                }
            });

        return () => {
            mounted = false;
        }

    }, []);

    const recipeSections = {};
    if(recipes){
        for(let r of recipes){
            if(!Object.keys(recipeSections).includes(r['section'])){
                recipeSections[r['section']] = [];
            }
            recipeSections[r['section']].push(r);
        }
    }

    return (
        <Page allowScroll={true}>
            <div className={"manage-recipes"}>
                <h1>Recipes</h1>
                <form onSubmit={handleEditSectionsSave}>
                    {editSectionsLoading && <LoadingIcon fill />}
                    <h3>Edit sections</h3>
                    <p className={"error"}>{sectionEditError}</p>
                    <p className={"response"}>{sectionEditResponse}</p>
                    <select defaultValue={''} onChange={handleEditSectionCategoryChange}>
                        <option value={''} disabled>Choose a category</option>
                        <optgroup label={'Add New Categories'}>
                            <option value={'New Category'}>+ New Category</option>
                        </optgroup>
                        <optgroup label={'Modify Existing Categories'}>
                            {
                                categories && categories.map((category, categoryIndex) => (
                                    <option key={`select-category-selector-option-${categoryIndex}`} value={category}>{category}</option>
                                ))
                            }
                        </optgroup>
                    </select>
                    {sectionEditSections && (sectionEditSections.length > 0 || (sectionEditSelectedCategory && sectionEditSelectedCategory.length > 0)) && (
                        <select value={sectionEditSelectedSection} onChange={handleEditSectionSectionChange}>
                            <option value={''}>Choose a section</option>
                            <optgroup label={'Add New Sections'}>
                                <option value={'New Section'}>+ New Section</option>
                            </optgroup>
                            {
                                sectionEditSections && sectionEditSections.length > 0 && (
                                    <optgroup label={'Modify Existing Sections'}>
                                        {
                                            sectionEditSections.map((section, sectionIndex) => (
                                                <option key={`edit-sections-section-input-option-${sectionIndex}`} value={section}>{section}</option>
                                            ))
                                        }
                                    </optgroup>
                                )
                            }
                        </select>
                    )}
                    {sectionEditSelectedCategory && (
                        <>
                            <br />
                            <label htmlFor={'edit-section-category-name-input'}>Category name</label>
                            <input id={'edit-section-category-name-input'} type={"text"} placeholder={"Category name"} defaultValue={sectionEditSelectedCategory} ref={categoryEditNameInput} onChange={handleEditSectionEditCategoryChange} maxLength={32} />
                            <input type={"button"} className={"red"} value={"Delete Category"} disabled={!(categories.includes(sectionEditCategory))} onClick={handleEditSectionDeleteCategory} />
                        </>
                    )}
                    {sectionEditSelectedSection && (
                        <>
                            <label htmlFor={'edit-section-section-name-input'}>Section name</label>
                            <input id={'edit-section-section-name-input'} type={'text'} placeholder={"Section name"} defaultValue={sectionEditSelectedSection} ref={sectionEditNameInput} onChange={handleEditSectionEditSectionChange} maxLength={32} />
                            <input type={"button"} className={"red"} value={"Delete Section"} disabled={!(sectionEditSections.includes(sectionEditSection))} onClick={handleEditSectionDeleteSection} />
                        </>
                    )}
                    {sectionEditSelectedCategory && (
                        <>
                            <input type={"submit"} value={"Save"} className={"blue"}
                                   disabled={!((sectionEditSelectedCategory && sectionEditCategory && sectionEditCategory.length > 0 && sectionEditCategory.toLowerCase() !== 'new category') || (sectionEditSelectedSection && sectionEditSection && sectionEditSection.length > 0 && sectionEditSection.toLowerCase() !== 'new section'))}/>
                        </>)}
                </form>
                <form onSubmit={handleEditRecipe}>
                    {editRecipesLoading  && <LoadingIcon fill />}
                    <h3>Edit recipes</h3>
                    <select onChange={handleSelectCategory} defaultValue={''}>
                        <option value={''} disabled>Choose a category</option>
                        {
                            categories && categories.map((category, categoryIndex) => (
                                <option key={`select-recipes-categories-selector-option-${categoryIndex}`} value={category}>{category}</option>
                            ))
                        }
                    </select>
                    {selectedRecipeCategory && (
                        <select defaultValue={''} onChange={handleSelectRecipe}>
                            <option value={''} disabled>Choose a recipe</option>
                            <optgroup label={"Add New Recipes"}>
                                <option value={''}>+ New Recipe</option>
                            </optgroup>
                            {Object.keys(recipeSections).map((recipeSection, recipeSectionIndex) => (
                                <optgroup label={recipeSection} key={`recipe-category-group-${recipeSectionIndex}`}>
                                    {recipeSections[recipeSection] && recipeSections[recipeSection].map((recipe, recipeIndex) => recipe['category'] && recipe['category'] === selectedRecipeCategory && (
                                        <option key={`select-recipes-recipes-selector-option-${recipeIndex}`}
                                                value={recipe['recipe']}>{recipe['recipe']}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    )}
                    {selectedRecipeCategory && selectedRecipe && (
                        <div className={"edit-area"}>
                            <h2>{selectedRecipe['recipe']}</h2>
                            <p className={"error"}>{recipeEditError}</p>
                            <p className={"response"}>{recipeEditResponse}</p>
                            <label htmlFor={'edit-recipes-recipe-input'}>Recipe Name</label>
                            <input id={'edit-recipes-recipe-input'} type={"text"} placeholder={"Recipe name"} defaultValue={selectedRecipe['recipe']} onChange={handleEditRecipeNameChange} ref={recipeEditNameInput} maxLength={64} />
                            <label htmlFor={'edit-recipes-category-input'}>Category</label>
                            <select id={'edit-recipes-category-input'} value={recipeEditCategory} onChange={handleEditRecipeCategoryChange}>
                                <option value={''} disabled>Choose a category</option>
                                {
                                    categories && categories.map((category, categoryIndex) => (
                                        <option key={`edit-recipes-category-input-option-${categoryIndex}`} value={category}>{category}</option>
                                    ))
                                }
                            </select>
                            <label htmlFor={'edit-recipes-section-input'}>Section</label>
                            <select id={'edit-recipes-section-input'} value={recipeEditSection} onChange={handleEditRecipeSectionChange}>
                                <option value={''} disabled>Choose a section</option>
                                {
                                    recipeEditSections && recipeEditSections.map((section, sectionIndex) => (
                                        <option key={`edit-recipes-section-input-option-${sectionIndex}`} value={section}>{section}</option>
                                    ))
                                }
                            </select>
                            <br />
                            <h3>Ingredients</h3>
                            <div className={"edit-recipes-add-ingredient-area"}>
                                <h3>Add Ingredient</h3>
                                <label htmlFor={"edit-recipes-add-ingredient-area-quantity-input"}>Quantity</label>
                                <input id={"edit-recipes-add-ingredient-area-quantity-input"} type={"text"} placeholder={"Quantity"} pattern={"[0-9/\s]*"} onKeyPress={e => {
                                    if(!/[0-9/\s]/.test(e.key)){
                                        e.preventDefault();
                                    }
                                }} onChange={handleEditRecipeIngredientQuantityChange} ref={recipeEditIngredientQuantityInput} />
                                <label htmlFor={"edit-recipes-add-ingredient-area-unit-input"}>Unit of Measure</label>
                                <select id={"edit-recipes-add-ingredient-area-unit-input"} onChange={handleEditRecipeIngredientUnitChange} defaultValue={''} ref={recipeEditIngredientUnitInput}>
                                    <option value={''} disabled>Select a unit of measure</option>
                                    {units && units.map((unit, unitIndex) => (
                                        <option key={`edit-recipes-add-ingredient-area-unit-input-option-${unitIndex}`} value={unit['unit']}>{unit['label']}</option>
                                    ))}
                                </select>
                                <label htmlFor={"edit-recipes-add-ingredient-area-ingredient-input"}>Ingredient</label>
                                <select id={"edit-recipes-add-ingredient-area-ingredient-input"} onChange={handleEditRecipeIngredientChange} defaultValue={''} ref={recipeEditIngredientInput}>
                                    <option value={''} disabled>Select an ingredient</option>
                                    {ingredients && ingredients.map((ing, ingIndex) => (
                                        <option key={`edit-recipes-add-ingredient-area-ingredient-input-option-${ingIndex}`} value={ing}>{ing}</option>
                                    ))}
                                </select>
                                <br />
                                <input type={"button"} value={"+ Add Ingredient"} onClick={handleAddIngredient} disabled={!((recipeEditIngredientQuantity && recipeEditIngredientQuantity.length > 0) && (recipeEditIngredientUnit && recipeEditIngredientUnit.length > 0) && (recipeEditIngredient && recipeEditIngredient.length > 0))} />
                            </div>
                            {
                                selectedRecipe['ingredients'] && selectedRecipe['ingredients'].map((ing, ingIndex) => (
                                    <span key={`edit-recipes-ingredients-container-${ingIndex}`} className={'edit-recipes-ingredients-container'}>
                                        <p>{ing['measure']} {ing['unit']} {ing['ingredient']}</p>
                                        <input type={"button"} value={"x"} onClick={() => {handleDeleteIngredient(ingIndex)}} />
                                    </span>
                                ))
                            }
                            <br />
                            <br />
                            <input type={"button"} className={"red"} value={"Delete Recipe"} disabled={!(selectedRecipe && selectedRecipe['recipe'] && selectedRecipe['recipe'].length > 0 && selectedRecipe['recipe'].toLowerCase() !== 'new recipe')} onClick={handleDeleteRecipe} />
                            <input type={"submit"} className={"blue"} value={"Save Changes"} disabled={!((recipeEditName && recipeEditName.length > 0 && recipeEditName.toLowerCase() !== 'new recipe') && (recipeEditSection && recipeEditSections.includes(recipeEditSection)) && (recipeEditCategory && categories.includes(recipeEditCategory)) && (selectedRecipe && selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0))} />
                        </div>
                    )}
                </form>
            </div>
        </Page>
    )
}
