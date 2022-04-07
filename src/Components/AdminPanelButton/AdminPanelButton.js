import React from 'react';

import './AdminPanelButton.css';

export default function AdminPanelButton(props){

    const handleClick = e => {
        if(props['onClick'] && typeof props['onClick'] === 'function'){
            props['onClick'](e);
        }
    };

    return (
        <div className={"admin-panel-button"} onClick={handleClick}>
            <div className={"admin-panel-button-line"} />
            <div className={"admin-panel-button-line"} />
            <div className={"admin-panel-button-line"} />
        </div>
    )
}
