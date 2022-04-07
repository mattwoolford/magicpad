import Notifications from "./Components/Notifications/Notifications";
import Menu from "./Components/Menu/Menu";
import LogIn from "./Components/LogIn/LogIn";

import MyTables from "./Components/MyTables/MyTables";
import Pad from "./Components/Pad/Pad";

import {useContext, useEffect, useState} from "react";

import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

import Cover from "./Components/Cover/Cover";
import SideBar from "./Components/SideBar/SideBar";
import ManageUsers from "./Components/ManageUsers/ManageUsers";
import {SocketContext} from "./socket";
import {UserContext} from "./user";
import PrivateRoute from "./Components/PrivateRoute/PrivateRoute";
import PublicPrivateRoute from "./Components/PublicPrivateRoute/PublicPrivateRoute";
import MyProfile from "./Components/MyProfile/MyProfile";
import ManageRecipes from "./Components/ManageRecipes/ManageRecipes";
import ManageStock from "./Components/ManageStock/ManageStock";
import Stock from "./Components/Stock/Stock";
import {useCookies} from "react-cookie";

function App() {

    const socket = useContext(SocketContext);

    const [cookies, setCookie, deleteCookie] = useCookies();

    const [loading, setLoading] = useState(true);
    const [coverMessage, setCoverMessage] = useState("");

    const [showSideBar, setShowSideBar] = useState(false);

    const [userUsername, setUserUsername] = useState(window.localStorage.getItem('user'));
    const [userIsAdmin, setUserIsAdmin] = useState(!!window.localStorage.getItem('user_is_admin'));
    const [userPrivateAuth, setUserPrivateAuth] = useState(cookies['user_private_auth']);
    const [userPublicAuth, setUserPublicAuth] = useState(window.localStorage.getItem('user_public_auth'));
    const [isLoggedIn, setIsLoggedIn] = useState(!!userUsername && !!userPrivateAuth);
    const [isLoggedInPoll, setIsLoggedInPoll] = useState(null);

    const [currentTableNumber, setCurrentTableNumber] = useState(null);

    const user = {
        username: userUsername,
        isAdmin: userIsAdmin,
        privateAuthCode: userPrivateAuth,
        pubicAuthCode: userPublicAuth,
        isLoggedIn: isLoggedIn
    };

    const handleLogIn = (data) => {
        setUserUsername(data['username']);
        setUserIsAdmin(data['is_admin']);
        setUserPrivateAuth(data['private_auth_code']);
        setUserPublicAuth(data['public_auth_code']);
    };

    const handleLogOut = () => {
        setShowSideBar(false);
        window.localStorage.removeItem('user');
        window.localStorage.removeItem('user_is_admin');
        deleteCookie('user_private_auth');
        window.localStorage.removeItem('user_public_auth');
        window.localStorage.removeItem('table');
        setUserUsername(null);
        setUserIsAdmin(false);
        setUserPrivateAuth(null);
        setUserPublicAuth(null);
    };

    const handleToggleSideBar = () => {
        setShowSideBar(!showSideBar);
    };

    const handleMenuToggle = label => {
        setShowSideBar(false);
    };

    const handleJoinTable = tableNumber => {
        setCurrentTableNumber(tableNumber);
    }

    const handleLeaveTable = tableNumber => {
        if(tableNumber === currentTableNumber){
            setCurrentTableNumber(null);
        }
    }

    const handleLocate = data => {
        let table = currentTableNumber;
        if(!currentTableNumber){
            table = window.localStorage.getItem('table');
        }
        if(data['for']){
            socket.emit('SEND_LOCATION', {
                auth: user.privateAuthCode,
                for: data['for'],
                table_number: table ? table : null
            });
        }
    }

    useEffect(() => {

        let mounted = true;

        if(!('localStorage' in window)){
            setCoverMessage("You need to update your browser to use Magic Pad.");
        }
        else{
            if(!userUsername && !userPrivateAuth){
                setIsLoggedIn(false);
            }
            else{
                setIsLoggedIn(true);
                setIsLoggedInPoll(setInterval(() => {
                    let auth = null;
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; user_private_auth=`);
                    if (parts.length === 2) auth = parts.pop().split(';').shift();
                    if(!auth && mounted){
                        handleLogOut();
                    }
                }, 15000));
            }
            setLoading(false);
        }

        socket.on('NOT_AUTHORISED', handleLogOut);
        socket.on('LOCATE', handleLocate);

        return () => {
            mounted = false;
            if(isLoggedInPoll) clearInterval(isLoggedInPoll);
            socket.off('NOT_AUTHORISED', handleLogOut);
            socket.off('LOCATE', handleLocate);
        }
    }, [userUsername, userPrivateAuth]);

    return (
        <UserContext.Provider value={user}>
            <Router>
                <div className="App">
                    <Cover hide={!loading} message={coverMessage} />
                    <Notifications />
                    <Menu isLoggedIn={isLoggedIn} onChange={handleMenuToggle} onToggleSideBar={handleToggleSideBar} />
                        <Routes>
                            <Route path={'*'} element={<Navigate to={'/'} />} />
                            <Route exact path={"/"} element={<PrivateRoute />}>
                                <Route exact path={"/"} element={<MyTables />} />
                            </Route>
                            <Route exact path={"/pad"} element={<PrivateRoute />}>
                                <Route exact path={'/pad'} element={<Pad onJoinTable={handleJoinTable} onLeaveTable={handleLeaveTable} />} />
                            </Route>
                            <Route exact path={"/stock-levels"} element={<PrivateRoute />}>
                                <Route exact path={'/stock-levels'} element={<Stock />} />
                            </Route>
                            <Route exact path={"/profile"} element={<PrivateRoute />}>
                            <Route exact path={'/profile'} element={<MyProfile />} />
                        </Route>
                            {
                                userIsAdmin ? (
                                    <>
                                        <Route exact path={"/stock"} element={<PrivateRoute />}>
                                            <Route exact path={'/stock'} element={<ManageStock />} />
                                        </Route>
                                        <Route exact path={"/recipes"} element={<PrivateRoute />}>
                                            <Route exact path={'/recipes'} element={<ManageRecipes />} />
                                        </Route>
                                        <Route exact path={"/users"} element={<PrivateRoute />}>
                                            <Route exact path={'/users'} element={<ManageUsers />} />
                                        </Route>
                                    </>
                                ) : null
                            }
                            <Route exact path={'/login'} element={<PublicPrivateRoute />}>
                                <Route exact path={'/login'} element={<LogIn onLogIn={handleLogIn}/>} />
                            </Route>
                        </Routes>
                    <SideBar open={showSideBar} table={currentTableNumber} onLogOut={handleLogOut} showAdminOptions={userIsAdmin} onCloseRequest={handleToggleSideBar} />
                </div>
            </Router>
        </UserContext.Provider>
    );
}

export default App;
