import React, {useContext, useEffect, useRef, useState} from "react";

import './MyProfile.css';
import Page from "../Page/Page";
import QRCode from "react-qr-code";
import {UserContext} from "../../user";
import LoadingIcon from "../LoadingIcon/LoadingIcon";
import useRefreshComponent from "../../useRefreshComponent";
import CheckBox from "../CheckBox/CheckBox";

export default function MyProfile(props){

    const user = useContext(UserContext);
    const refreshComponent = useRefreshComponent();

    const [profile, setProfile] = useState(null);

    const [profileImageLoading, setProfileImageLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [showQRCode, setShowQRCode] = useState(false);

    const [profileError, setProfileError] = useState(null);
    const [profileResponse, setProfileResponse] = useState(null);

    const [passwordError, setPasswordError] = useState(null);
    const [passwordResponse, setPasswordResponse] = useState(null);

    const [firstName, setFirstName] = useState(profile ? (profile['first_name'] ? profile['first_name'] : null): null);
    const [lastName, setLastName] = useState(profile ? (profile['last_name'] ? profile['last_name'] : null): null);
    const [username, setUsername] = useState(profile ? (profile['username'] ? profile['username'] : null): null);
    const [password, setPassword] = useState(null);
    const [newPassword, setNewPassword] = useState(null);
    const [confirmNewPassword, setConfirmNewPassword] = useState(null);
    const [enableQuickSignIn, setEnableQuickSignIn] = useState(false);

    const [newProfileImageSrc, setNewProfileImageSrc] = useState(null);

    const profileImageInput = useRef();

    const handleChooseProfileImage = e => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setNewProfileImageSrc(reader.result);
            });
            reader.readAsDataURL(e.target.files[0]);
        }
    }

    const handleProfileImageClick = () => {
        if(profileImageInput.current){
            profileImageInput.current.click();
        }
    }

    const handleFirstNameChange = e => {
        setProfileError(null);
        setProfileResponse(null);
        setFirstName(e.target.value);
    }

    const handleLastNameChange = e => {
        setProfileError(null);
        setProfileResponse(null);
        setLastName(e.target.value);
    }

    const handleUsernameChange = e => {
        setProfileError(null);
        setProfileResponse(null);
        setUsername(e.target.value.toLowerCase());
    }

    const handlePasswordChange = e => {
        setPasswordError(null);
        setPasswordResponse(null);
        setPassword(e.target.value);
    }

    const handleNewPasswordChange = e => {
        setPasswordError(null);
        setPasswordResponse(null);
        setNewPassword(e.target.value);
    }

    const handleConfirmNewPasswordChange = e => {
        setPasswordError(null);
        setPasswordResponse(null);
        setConfirmNewPassword(e.target.value);
    }

    const handleSaveProfile = e => {
        e.preventDefault();
        setProfileError(null);
        setProfileResponse(null);
        setProfileLoading(true);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/update`, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                username: username
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                if(request.status === 200){
                    profile['first_name'] = firstName;
                    profile['last_name'] = lastName;
                    profile['username'] = username;
                    setProfileResponse("Changes saved successfully.");
                }
                else{
                    setProfileError("Could not save changes. Please try again later.");
                }
                setProfileLoading(false);
            })
            .catch(err => {
                setProfileError("Could not save changes. Please try again later.");
                setProfileLoading(false);
            });
    }

    const handleChangePassword = e => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordResponse(null);
        setPasswordLoading(true);
        if(newPassword !== confirmNewPassword){
            setPasswordError("Passwords do not match.");
            return;
        }
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/auth/update-password`, {
            credentials: 'include',
            method: 'POST',
            body: JSON.stringify({
                password: password,
                new_password: newPassword
            }),
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                const response = await request.json();
                if(response['status'] === 200){
                    setPasswordResponse("Password changed successfully.")
                }
                else{
                    setPasswordError(response['message'] ? response['message'] : "Could not change password. Please try again later.")
                }
                setPasswordLoading(false);
            })
            .catch(err => {
                setPasswordError("Could not change password. Please try again later.");
                setPasswordLoading(false);
            });
    }

    const handleToggleShowQRCode = () => {
        setShowQRCode(!showQRCode);
    }

    const getProfile = () => {
        setProfileLoading(true);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/${user.username}`, {
            credentials: 'include'
        })
            .then(async request => {
                if(request.status === 200){
                    const response = await request.json();
                    if(response['users'] && response['users'].length > 0){
                        const u = response['users'][0];
                        setProfile(u);
                        if(u['first_name']) setFirstName(u['first_name']);
                        if(u['last_name']) setLastName(u['last_name']);
                        if(u['username']) setUsername(u['username']);
                        if(u['allow_quick_sign_in']) setEnableQuickSignIn(u['allow_quick_sign_in']);
                    }
                }
                setProfileLoading(false);
            })
            .catch(err => {
                setProfileLoading(false);
            })
    }

    const handleSubmitNewProfileImage = () => {
        if(!newProfileImageSrc || !profileImageInput.current || !(profileImageInput.current.files.length > 0)){
            return;
        }
        setProfileImageLoading(true);
        const formData = new FormData();
        formData.append('profile_image', profileImageInput.current.files[0]);
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/update-profile-image`, {
            credentials: 'include',
            method: 'POST',
            body: formData
        })
            .then(async request => {
                await request.json();
                setProfileImageLoading(false);
                refreshComponent();
            })
            .catch(err => {
                setProfileImageLoading(false);
            });
    }

    const handleEnableQuickSignIn = enable => {
        const body = JSON.stringify({
            'allow_quick_sign_in': enable
        });
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/update`, {
            credentials: 'include',
            method: 'POST',
            body: body,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
            .then(async request => {
                const response = await request.json();
                if(response.status === 200){
                    setEnableQuickSignIn(enable);
                }
                else{
                    setEnableQuickSignIn(!enable);
                }
            })
            .catch(err => {
                setEnableQuickSignIn(!enable);
            })
    }

    useEffect(() => {

        if (user.isLoggedIn) {
            getProfile();
        }

    }, [user]);

    if(!user.isLoggedIn || !profile) return null;

    return (
        <Page allowScroll={true}>
            <div className={"my-profile"}>
                {newProfileImageSrc && (
                    <div className={"my-profile-crop-area"}>
                        {profileImageLoading && <LoadingIcon fill />}
                        <div className={'my-profile-crop-container'}>
                            <div className={"my-profile-crop-window"}>
                                <img src={newProfileImageSrc} alt={"New Profile"} />
                            </div>
                            <form onSubmit={e => {e.preventDefault();}}>
                                <input type={"button"} value={"Use Photo"} onClick={handleSubmitNewProfileImage} />
                            </form>
                        </div>
                    </div>
                )}
                <div className={"my-profile-header"}>
                    <img src={`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/${user.username}/profile-image`} alt={'Profile'} onClick={handleProfileImageClick} />
                    <form className={"profile-image-form"}>
                        <input type={"file"} accept={"image/jpg,image/jpeg,image/png"} name={"new-profile-image"} ref={profileImageInput} onChange={handleChooseProfileImage} />
                    </form>
                    <span className={"my-profile-information"}>
                        <h1>{profile['first_name']} {profile['last_name']}</h1>
                        <h3>@{profile['username']}</h3>
                        {!!profile['is_admin'] ? <h3 className={"admin-label"}>Admin</h3> : null }
                    </span>
                </div>
                <div className={"my-profile-data-area"}>
                    <div className={"my-profile-forms-area"}>
                        <form className={"my-profile-qr-code-prompt"} onSubmit={e => {e.preventDefault();}}>
                            <input type={"button"} value={`${showQRCode ? 'Hide' : 'Show'} Sign In QR Code`} onClick={handleToggleShowQRCode} />
                        </form>
                        <form onSubmit={handleSaveProfile}>
                            {profileLoading ? <LoadingIcon fill /> : null}
                            <h3>Edit your information.</h3>
                            <p className={"response"}>{profileResponse}</p>
                            <p className={"error"}>{profileError}</p>
                            <label htmlFor={"my-profile-first-name-input"}>First name</label>
                            <input id={"my-profile-first-name-input"} type={"text"} name={"first_name"} placeholder={"First name"} defaultValue={profile['first_name']} onChange={handleFirstNameChange} maxLength={64} />
                            <label htmlFor={"my-profile-last-name-input"}>Last name</label>
                            <input id={"my-profile-last-name-input"} type={"text"} name={"last_name"} placeholder={"Last name"} defaultValue={profile['last_name']} onChange={handleLastNameChange} maxLength={64} />
                            <label htmlFor={"my-profile-username-input"}>Username</label>
                            <input id={"my-profile-username-input"} type={"text"} name={"username"} placeholder={"Username"} defaultValue={profile['username']} onChange={handleUsernameChange} maxLength={32} />
                            <br />
                            <br />
                            <input type={"submit"} value={"Save Changes"} />
                        </form>
                        <form onSubmit={handleChangePassword}>
                            {passwordLoading ? <LoadingIcon fill /> : null}
                            <h3>Change your password.</h3>
                            <p className={"response"}>{passwordResponse}</p>
                            <p className={"error"}>{passwordError}</p>
                            <CheckBox label={"Enable Quick Sign in with QR Code"} defaultChecked={enableQuickSignIn} onChange={handleEnableQuickSignIn} />
                            <br />
                            <label htmlFor={"my-profile-password-input"}>Current password</label>
                            <input id={"my-profile-password-input"} type={"password"} name={"password"} placeholder={"Current password"} onChange={handlePasswordChange} />
                            <br />
                            <br />
                            <label htmlFor={"my-profile-new-password-input"}>New password</label>
                            <input id={"my-profile-new-password-input"} type={"password"} name={"new-password"} placeholder={"New password"} onChange={handleNewPasswordChange} />
                            <label htmlFor={"my-profile-confirm-new-password-input"}>Confirm new password</label>
                            <input id={"my-profile-confirm-new-password-input"} type={"password"} name={"new-password-confirm"} placeholder={"Confirm new password"} onChange={handleConfirmNewPasswordChange} />
                            <br />
                            <br />
                            <input type={"submit"} value={"Change My Password"} />
                        </form>
                    </div>
                    <div className={"my-profile-qr-code-area" + (showQRCode ? " show" : "")}>
                        <QRCode value={profile['public_auth_code']} size={200} />
                        <h1>Your one-time QR code.</h1>
                        <p>You can help another Team Member sign in by letting them scan this QR code with Magic Pad.<br /><br /><strong>You can use this once, and you'll need to log in again to get a new one.</strong></p>
                        <form className={"my-profile-qr-code-prompt"} onSubmit={e => {e.preventDefault();handleToggleShowQRCode();}}>
                            <input type={"submit"} value={`${showQRCode ? 'Hide' : 'Show'} QR Code`} />
                        </form>
                    </div>
                </div>
            </div>
        </Page>
    )

}
