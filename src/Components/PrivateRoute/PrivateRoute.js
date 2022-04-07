import React, {useContext} from 'react';
import {Navigate, Outlet} from 'react-router-dom';
import {UserContext} from "../../user";

const PrivateRoute = ({ component: Component, ...rest }) => {

    const user = useContext(UserContext);
    const isLoggedIn = user.isLoggedIn;

    return isLoggedIn ? <Outlet /> : <Navigate to={'/login'} />;
}

export default PrivateRoute;
