import React from 'react';

import './MenuFooterOption.css';
import {Link} from "react-router-dom";

export default function MenuFooterOption(props){

    const handleClick = e => {
        if(props['onClick'] && typeof props['onClick'] === 'function'){
            props['onClick'](e, props['label']);
        }
    };

    return (
        <div className={"footer-option" + (!!props['active'] ? " active" : "")}>
            <Link to={props['href']} onClick={handleClick}>
                <div className={"footer-option-desc-container"}>
                    {props['image'] ? <img src={props['image']} alt={props['label'] ? props['label'] : "Option"} /> : <div className={"footer-image-placeholder"} /> }
                    {props['label'] ? <p>{props['label']}</p> : null}
                </div>
            </Link>
        </div>
    )
}
