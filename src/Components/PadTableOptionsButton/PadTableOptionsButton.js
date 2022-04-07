import React, {useCallback} from "react";

import './PadTableOptionsButton.css';

export default function PadTableOptionsButton(props){

    const alert = !!props['alert'];

    const handleClick = useCallback(e => {
        if(props['onClick'] && typeof props['onClick'] === 'function'){
            props['onClick'](e);
        }
    });

    return (
        <span className={"pad-table-options-button" + (alert ? " alert" : "")} onClick={handleClick}>
            {props['image'] ? <img src={props['image']} alt={props['value']} /> : null}
            <input type={"button"} value={props['value']} />
        </span>
    )
}
