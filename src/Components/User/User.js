import {useEffect, useState} from "react";
import usePrevious from "../../usePrevious";

export default function User(props){

    const [user, setUser] = useState();
    const previousUsername = usePrevious(props['username']);

    useEffect(() => {
        let isMounted = true;
        if(props['username'] && typeof props['username'] === 'string' && props['username'].length > 0 && (!user || props['username'] !== previousUsername)){
            fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/v1/users/${props['username'].toLowerCase()}`, {
                credentials: 'include'
            })
                .then(async request => {
                    if(request.status === 200){
                        const response = await request.json();
                        if(isMounted && response['users'] && response['users'].length > 0){
                            setUser(response['users'][0]);
                        }
                    }
                });
        }
        return () => {
            isMounted = false;
        }
    });

    if(!user) return null;

    return (
        <>
            {props['firstName'] && user['first_name']}
            {props['separator']}
            {props['lastName'] && user['last_name']}
            {props['separator']}
            {props['is_admin'] && (user['is_admin'] ? 'Admin' : '')}
        </>
    );

}
