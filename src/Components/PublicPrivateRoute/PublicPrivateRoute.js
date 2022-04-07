import React, {useContext} from 'react';
import {Navigate, Outlet} from 'react-router-dom';
import {UserContext} from "../../user";

const PublicPrivateRoute = ({ component: Component, ...rest }) => {

    const user = useContext(UserContext);
    const isLoggedIn = user.isLoggedIn;

    return isLoggedIn ? <Navigate to={'/'} /> : <Outlet />;
}

export default PublicPrivateRoute;
