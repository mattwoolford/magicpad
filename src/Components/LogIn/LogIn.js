import React, {useRef, useState} from "react";

import './LogIn.css';
import Page from "../Page/Page";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import QrReader from 'react-qr-scanner';

export default function LogIn(props){

    const [requirePasswordReset, setRequirePasswordReset] = useState(false);

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [response, setResponse] = useState("");

    const [loading, setLoading] = useState(false);

    const [showQRCodeReader, setShowQRCodeReader] = useState(false);

    const passwordRef = useRef();

    const handleUsernameChange = e => {
        setUsername(e.target.value);
        setRequirePasswordReset(false);
    }

    const handlePasswordChange = e => {
        setPassword(e.target.value);
    }

    const handleConfirmPasswordChange = e => {
        setConfirmPassword(e.target.value);
    }

    const signInWithPassword = e => {
        e.preventDefault();
        setLoading(true);
        if(!username || !(username.length > 0)){
            setError("Please enter a username.");
            setLoading(false);
            return;
        }
        if(requirePasswordReset){
            if(!password || !confirmPassword){
                setError("You need to enter a new password.");
                setLoading(false);
                return;
            }
            if(!password.match(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[a-zA-Z\d\-_]{8,}$/)){
                setError("New password must be at least 8 characters long and have at least one uppercase letter, lowercase letter and a number.");
                setLoading(false);
                return;
            }
            if(password !== confirmPassword){
                setError("Passwords do not match.");
                setLoading(false);
                return;
            }
        }
        setError('');
        setResponse('');
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/login`, {
            method: 'POST',
            body: JSON.stringify({
                'username': username,
                'password': password,
                'reset_password': requirePasswordReset
            }),
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                const response = await request.json();
                if (request.status === 200) {
                    localStorage.setItem('user', response.user.username);
                    localStorage.setItem('user_is_admin', response.user.is_admin);
                    localStorage.setItem('user_public_auth', response.user.public_auth_code);
                    props['onLogIn'](response.user);
                }
                else if(request.status === 201){
                    setLoading(false);
                    setRequirePasswordReset(false);
                    setResponse(response.message);
                    if(passwordRef.current){
                        setPassword("");
                        passwordRef.current.value = '';
                    }
                }
                else {
                    setError(response.message);
                    setLoading(false);
                    if (request.status === 412) {
                        setRequirePasswordReset(true);
                    }
                }
            })
            .catch((error) => {
                console.warn(error);
                setError("Could not sign in. Please try again later.")
                setLoading(false);
            })
    }

    const handleQRCodeScan = data => {
        if(data && data.text){
            setShowQRCodeReader(false);
            setLoading(true);
            setError('');
            setResponse('');
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/login/public`, {
                method: 'POST',
                body: JSON.stringify({
                    'username': username,
                    'auth': data.text,
                }),
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
                .then(async request => {
                    const response = await request.json();
                    if (request.status === 200) {
                        localStorage.setItem('user', response.user.username);
                        localStorage.setItem('user_is_admin', response.user.is_admin);
                        localStorage.setItem('user_public_auth', response.user.public_auth_code);
                        props['onLogIn'](response.user);
                    }
                    else if(request.status === 201){
                        setLoading(false);
                        setRequirePasswordReset(false);
                        setResponse(response.message);
                        if(passwordRef.current){
                            setPassword("");
                            passwordRef.current.value = '';
                        }
                    }
                    else {
                        setError(response.message);
                        setLoading(false);
                        if (request.status === 412) {
                            setRequirePasswordReset(true);
                        }
                    }
                })
                .catch((error) => {
                    console.warn(error);
                    setError("Could not sign in. Please try again later.");
                    setLoading(false);
                })
        }
    }

    const handleQRCodeError = () => {
        setError("Could not find a valid QR Code");
        setShowQRCodeReader(false);
    }

    const handleSignInWithQRCode = () => {
        setError(null);
        if(!username || username === ''){
            setError("Please enter a username before attampting to sign in.");
            return;
        }
        setShowQRCodeReader(true);
    }

    return (
        <Page ignoreFooter={true}>
            <div className={"login"}>
                {!showQRCodeReader ? (
                    <form className={"login-form float"} onSubmit={signInWithPassword}>
                        {loading ? <LoadingIcon fill/> : null}
                        <h2>Sign in.</h2>
                        <p>You need to sign in to access Magic Pad for your store.</p>
                        <p className={"response"}>{response}</p>
                        <p className={"error"}>{error}</p>
                        <input type={"text"} placeholder={"Username"} onChange={handleUsernameChange} disabled={requirePasswordReset} />
                        <input type={"password"} placeholder={requirePasswordReset ? "New password" : "Password"} onChange={handlePasswordChange} ref={passwordRef} />
                        {requirePasswordReset ? <input type={"password"} placeholder={"Confirm new password"} onChange={handleConfirmPasswordChange} /> : null}
                        <input type={"submit"} value={"Sign In"} />
                        {window.location.protocol === 'https:' && !requirePasswordReset && <input type={"button"} value={"Sign in with QR Code"} onClick={handleSignInWithQRCode}/>}
                    </form>
                ) : (
                    <form className={"login-form float show-qr-code"}>
                        <QrReader legacymode={true} onError={handleQRCodeError} onScan={handleQRCodeScan} />
                        <div className={"input-container"}>
                            <h3>Ask another team member to scan their one-time QR code.</h3>
                            <input type={"button"} value={"Sign In with Password"} onClick={() => {setShowQRCodeReader(false);}} />
                        </div>
                    </form>
                )}
            </div>
        </Page>
    )
}
