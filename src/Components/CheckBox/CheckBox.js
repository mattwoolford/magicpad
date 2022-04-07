import React, {useEffect, useState} from "react";

import './CheckBox.css';

export default function CheckBox(props){

    const [checked, setChecked] = useState(!!props['defaultChecked']);
    const [userInput, setUserInput] = useState(false);

    const handleClick = () => {
        if(props['onChange'] && typeof props['onChange'] === 'function'){
            props['onChange'](!checked);
        }
        setChecked(!checked);
        setUserInput(true);
    };

    const handleChange = e => {
        setChecked(e.target.checked);
        if(props['onChange'] && typeof props['onChange'] === 'function'){
            props['onChange'](e.target.checked);
        }
    };

    useEffect(() => {
        if(!userInput) setChecked(!!props['defaultChecked']);
    });

    return (
        <div className={"checkbox-container"}>
            <div className={"checkbox" + (checked ? " checked" : "")} onClick={handleClick}>
                {checked ? <div className={"check"} /> : null}
            </div>
            <p>{props['label']}</p>
            <input type={"checkbox"} checked={checked} name={props['name']} onChange={handleChange} />
        </div>
    )

}
