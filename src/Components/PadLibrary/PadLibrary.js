import React, {useContext, useEffect, useRef, useState} from "react";
import usePrevious from "../../usePrevious";

import AccurateSearch from 'accurate-search'

import './PadLibrary.css';
import SectionButton from "../SectionButton/SectionButton";
import RecipeTile from "../RecipeTile/RecipeTile";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import {Droppable} from "react-beautiful-dnd";
import {throttle} from "lodash";

export default function PadLibrary(props){

    const [accurateSearch, setAccurateSearch] = useState(new AccurateSearch());
    const [accurateSearchIngredients, setAccurateSearchIngredients] = useState(new AccurateSearch());

    const category = props['category'] ? props['category'] : "Items";
    const prevCategory = usePrevious(category);

    const [search, setSearch] = useState(null);

    const [handleIsHeld, setHandleIsHeld] = useState(false);
    const [handleTouch, setHandleTouch] = useState(null);

    const [transitionHeight, setTransitionHeight] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const [sections, setSections] = useState([]);
    const [recipes, setRecipes] = useState([]);

    const [loading, setLoading] = useState(false);

    const [showAddConfirmation, setShowAddConfirmation] = useState(false);
    const [showScrollToTopPrompt, setShowScrollToTopPrompt] = useState(false);

    const container = useRef();
    const dataContainer = useRef();
    const recipesContainer = useRef();
    const searchInput = useRef();

    const handleDragStart = e => {
        setTransitionHeight(false);
        setHandleIsHeld(true);
        setHandleTouch(e.nativeEvent.touches ? e.nativeEvent.touches[0].clientY : e.nativeEvent.clientY);
        searchInput.current.blur();
    };

    const handleDrag = ev => {
        if(handleIsHeld){
            const e = ev.nativeEvent;
            const rect = e.target.getBoundingClientRect();
            const view = container.current;
            const newHeight = view.clientHeight + (e.changedTouches ? ((e.changedTouches[0].clientY - rect.top) * (-1)) : ((e.clientY - rect.top)));
            view.style.height = newHeight + 'px';
        }
    };

    const handleDragEnd = e => {
        setHandleIsHeld(false);
        setTransitionHeight(true);
        if(handleTouch > (e.changedTouches ? (e.changedTouches[0].clientY + 100) : (e.clientY + 100))){
            setExpanded(true);
        }
        else{
            setExpanded(false);
        }
        container.current.style.height = '';
    };

    const handleScrollToTop = () => {
        if(dataContainer.current){
            const libraryChildNodes = dataContainer.current.childNodes;
            if(libraryChildNodes.length > 0){
                libraryChildNodes[0].scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
            }
        }
    }

    const handleOpenToggle = e => {
        setTransitionHeight(true);
        if(expanded) handleScrollToTop();
        setExpanded(!expanded);
    };

    const handleSearchFocus = e => {
        if(expanded) return;
        setTransitionHeight(true);
        setExpanded(true);
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
        }, 300)
    };

    const handleSearchBlur = () => {
        setTransitionHeight(false);
    };

    const handleSelectSection = label => {
        const sectionElem = recipesContainer.current.querySelector(`div.pad-library-section[section-label="${label}"]`);
        if(sectionElem) sectionElem.scrollIntoView({behavior: "smooth", block: "start", inline: "nearest"});
    };

    const handleSearch = e => {
        setSearch(e.target.value !== "" ? e.target.value : null);
    };

    const handleShowAddConfirmation = throttle(() => {
        setShowAddConfirmation(true);
        setTimeout(() => {
            setShowAddConfirmation(false);
        }, 750);
    }, 750);

    const handleSelectRecipeTile = r => {
        if(props['onAddRecipe'] && typeof props['onAddRecipe']){
            props['onAddRecipe'](r);
        }
        handleShowAddConfirmation();
    };

    const handleScroll = e => {
        const scrollTop = e.target.scrollTop - Math.round(parseFloat(window.getComputedStyle(e.target, null).getPropertyValue('padding-top').replace(/[^\d.]/g, '')) + parseFloat(window.getComputedStyle(e.target, null).getPropertyValue('padding-bottom').replace(/[^\d.]/g, '')))
        setShowScrollToTopPrompt(scrollTop > (window.innerHeight / 2));
    }

    useEffect(() => {
        let mounted = true;
        if(category !== prevCategory){
            handleScrollToTop();
            //Get recipes
            setLoading(true);
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/${category}/recipes`)
                .then(async request => {
                    if(request.status === 200){
                        const response = await request.json();
                        const temp = [];
                        for(let recipe of response['recipes']){
                            temp.push(recipe);
                        }
                        if(mounted) setRecipes(temp);
                        if(props['onUpdateRecipes'] && typeof props['onUpdateRecipes'] === 'function'){
                            props['onUpdateRecipes'](temp);
                        }
                    }
                    else if(mounted){
                        setRecipes([]);
                    }
                    //Get sections
                    await fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/${category}/sections`)
                        .then(async request => {
                            if (request.status === 200) {
                                const response = await request.json();
                                const temp = [];
                                for (let section of response['sections']) {
                                    temp.push(section['section']);
                                }
                                if(mounted) setSections(temp);
                            } else if (mounted) {
                                setSections([]);
                            }
                        });
                    if(mounted) setLoading(false);
                });
        }

        return () => {
            mounted = false;
        }
    }, [category]);

    let sectionButtons = null;
    if(sections.length > 0){
        sectionButtons = sections.map((section) => <SectionButton key={`section-${section}`} section={section} onClick={() => {handleSelectSection(section);}} />);
    }

    let dragDisabled = !!props['disableDrag'];

    const recipeSections = {};

    let recipeTiles = null;
    if(recipes.length > 0){
        if(search){
            let ASResults =  accurateSearch.search(search);
            let ASIResults = accurateSearchIngredients.search(search).filter((ASIResult) => {
                return !ASResults.includes(ASIResult);
            });
            let searchResultIndexes = ASResults.concat(ASIResults);
            for(let searchResultIndex of searchResultIndexes){
                try {
                    let sRIndex = parseInt(searchResultIndex);
                    let foundRecipe = recipes[sRIndex];
                    if(foundRecipe['section']){
                        if (!Object.keys(recipeSections).includes(foundRecipe['section'])) {
                            recipeSections[foundRecipe['section']] = [];
                        }
                        let newTile = (<RecipeTile key={`recipe-${foundRecipe['recipe']}`}
                                                  data={foundRecipe} onClick={() => {handleSelectRecipeTile(foundRecipe)}} index={sRIndex} selectable={true} disableDrag={dragDisabled}/>);
                        recipeSections[foundRecipe['section']].push(newTile);
                    }
                }
                catch (e) {
                    //Skip
                }
            }
        }
        else {
            for (let recipeIndex = 0; recipeIndex < recipes.length; recipeIndex++) {
                let recipe = recipes[recipeIndex];
                if (recipe['section']) {
                    if (!Object.keys(recipeSections).includes(recipe['section'])) {
                        recipeSections[recipe['section']] = [];
                    }
                    let newTile = (<RecipeTile key={`recipe-${recipe['recipe']}`}
                                              data={recipe} onClick={() => {handleSelectRecipeTile(recipe)}} index={recipeIndex} selectable={true} disableDrag={dragDisabled}/>);
                    recipeSections[recipe['section']].push(newTile);
                }
                let recipeIngredients = [];
                if(recipe['ingredients'] && recipe['ingredients'].length > 0){
                    for(let recipeIngredient of recipe['ingredients']){
                        if(!recipeIngredients.includes(recipeIngredient['ingredient'])){
                            recipeIngredients.push(recipeIngredient['ingredient']);
                        }
                    }
                }

                accurateSearch.addText(recipeIndex, recipe['recipe']);
                accurateSearchIngredients.addText(recipeIndex, ...recipeIngredients);
            }
        }
        recipeTiles = Object.keys(recipeSections).map((section) => {
            return (
                <div key={`pad-library-section-${section}`} className={"pad-library-section"} section-label={section}>
                    <h2>{section}</h2>
                    <Droppable droppableId={`droppable-${section}-library`}>
                        {
                            provided => (
                                <ul className={"pad-library-section-recipes"} {...provided.droppableProps} ref={provided.innerRef}>
                                    {recipeSections[section]}
                                    {provided.placeholder}
                                </ul>
                            )
                        }
                    </Droppable>
                </div>
            );
        });
    }

    return (
        <div className={"pad-library" + (transitionHeight ? " transition" : "") + (expanded ? " open" : "")} ref={container}>
            <div className={"handle"} onTouchStart={handleDragStart} onClick={handleOpenToggle} onTouchMove={handleDrag} onMouseMove={handleDrag} onTouchEnd={handleDragEnd} />
            <div className={"pad-library-add-confirmation" + (showAddConfirmation ? " show" : "")}>
                <div className={"pad-library-add-confirmation-data-container"}>
                    <p>+1</p>
                </div>
            </div>
            <form className={"pad-library-search-form"}>
                <input type={"text"} placeholder={`Search ${category}...`} onChange={handleSearch} onFocus={handleSearchFocus} onBlur={handleSearchBlur} ref={searchInput} />
            </form>
            <div className={"pad-library-data-container" + (loading ? " loading" : "")} ref={dataContainer} onScroll={handleScroll}>
                {loading ? <LoadingIcon fill /> : null}
                <div className={"pad-library-filters" + (search ? " hide" : "")}>
                    {sectionButtons}
                </div>
                <div className={"pad-library-recipes"} ref={recipesContainer}>
                    {recipeTiles}
                </div>
            </div>
            <form className={"pad-library-scroll-to-top-prompt-container" + (showScrollToTopPrompt ? "" : " hide")}>
                <input type={"button"} value={"Scroll to Top"} onClick={handleScrollToTop}/>
            </form>
        </div>
    )
}
