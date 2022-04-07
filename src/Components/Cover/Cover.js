import React from "react";

import './Cover.css';

import Logo from '../../images/logo-small.png';
import LoadingIcon from "../LoadingIcon/LoadingIcon";

export default function Cover(props){

    return (
        <div className={"cover" + (props['hide'] ? " hide" : "")}>
            <img src={Logo} alt={"Fridays"} />
            <h1>Magic Pad</h1>
            {(props['message'] && typeof props['message'] === 'string' && props['message'].length > 0) ? (
                <p>{props['message']}</p>
            ) : <LoadingIcon />}
        </div>
    );

}
