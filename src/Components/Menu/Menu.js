import React from "react";
import Spacer from "../Spacer/Spacer";
import MenuFooterOption from "./MenuFooterOption/MenuFooterOption";

import './Menu.css';

import Logo from '../../images/logo-small.png';
import AdminPanelButton from "../AdminPanelButton/AdminPanelButton";

import Table from '../../images/table.png';
import Pad from '../../images/pad.png';
import NotAllowed from '../../images/not-allowed.png';
import {useLocation} from "react-router-dom";

export default function Menu(props){

    const location = useLocation();
    const path = location.pathname;

    const handleMenuToggle = (e, label) => {
        if(props['onChange'] && typeof props['onChange'] === 'function'){
            props['onChange'](label);
        }
    };

    const handleToggleSideBar = () => {
        if(props['onToggleSideBar'] && typeof props['onToggleSideBar'] === 'function'){
            props['onToggleSideBar']();
        }
    };


    return (
        <>
            <div className={"menu-spacer"} />
            <header id={"menu"}>
                {Logo && <img src={Logo} alt={"Magic Pad"} />}
                <h3>Magic Pad</h3>
                <Spacer />
                {!!props['isLoggedIn'] ? <AdminPanelButton onClick={handleToggleSideBar} /> : null}
            </header>
            <div id={"footer-menu"} className={!!props['isLoggedIn'] ? null : "hide"}>
                <div id={"footer-stripes"} />
                <nav id={"footer-options"}>
                    <MenuFooterOption label={"My Tables"} image={Table} href={'/'} active={path === '/'} onClick={handleMenuToggle} />
                    <MenuFooterOption label={"Notepad"} image={Pad} href={'/pad'} active={path === '/pad'} onClick={handleMenuToggle} />
                    <MenuFooterOption label={"Stock Levels"} image={NotAllowed} href={'/stock-levels'} active={path === '/stock-levels'} onClick={handleMenuToggle} />
                </nav>
            </div>
        </>
    )
}
