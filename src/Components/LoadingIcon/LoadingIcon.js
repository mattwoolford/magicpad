import React from 'react';

import './LoadingIcon.css';

export default function LoadingIcon(props) {

    return (
        <div className={"loading-icon" + (props.fullscreen ? " fullscreen" : (props.fill) ? " fill" : "") + (props['remove-background'] ? " remove-background" : "")}>
            <div className={"loading-icon-container"}>
                <div className={"loading-icon-square"}>
                    <div className={"loading-icon-circle"}></div>
                </div>
            </div>
            <p id="label">{props.label}</p>
        </div>
    );
}
