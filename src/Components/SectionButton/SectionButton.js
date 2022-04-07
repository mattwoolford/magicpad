import React, {useState} from 'react';

import './SectionButton.css';

export default function SectionButton(props){

    const [hide, setHide] = useState(false);

    if(!props['section'] || hide) return null;

    const handleIconError = () => {
        setHide(true);
    }

    const handleClick = e => {
        if(props['onClick'] && typeof props['onClick'] === 'function'){
            props['onClick'](e);
        }
    }

    return (
        <div className={"section-button"} onClick={handleClick}>
            <div className={"section-button-image-container"}>
                <img src={`//${window.location.hostname}:${window.location.port}/images/sections/${props['section'].replace(/[^\w\s]/gm, '').replace(/\s/gm, '-').toLowerCase()}.png`} onError={handleIconError} alt={props['section']} />
            </div>
            <p>{props['section']}</p>
        </div>
    )

}
