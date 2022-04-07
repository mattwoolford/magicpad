import React, {useContext, useEffect, useRef, useState} from "react";

import {SocketContext} from "../../socket";

import './Notifications.css';

export default function Notifications(props){

    const socket = useContext(SocketContext);

    const [queue, setQueue] = useState([]);
    const [queueNumber, setQueueNumber] = useState(0);
    const [notificationShown, setNotificationShown] = useState(null);

    const notification = useRef();

    const findNotification = notificationId => {
        if(notificationId) {
            for (let n of queue) {
                if (n['notification_id'] && n['notification_id'] === notificationId) {
                    return n;
                }
            }
        }
        return false;
    };

    const handleQueueNotify = data => {
        if(!findNotification(data['notification_id'])){
            queue.push(data);
            setQueueNumber(queueNumber + 1);
        }
    }

    const handleShiftQueue = () => {
        setNotificationShown(null);
        queue.shift();
        setQueueNumber(queueNumber - 1);
    };

    const handleShowNextNotification = () => {
        if(queue.length > 0){
            setNotificationShown(queue[0]);
            setTimeout(() => {
                if(notification.current){
                    notification.current.classList.add('hide');
                    let delay = 1000;
                    try {
                        delay = 1000 * notification.current.offsetHeight / window.innerHeight;
                    }
                    catch(e){
                        //Do nothing
                    }
                    setTimeout(() => {
                        handleShiftQueue();
                    }, delay);
                }
                else{
                    handleShiftQueue();
                }
            }, 4000);
        }
    };

    useEffect(() => {
        if(!notificationShown){
            handleShowNextNotification();
        }

        socket.on('NOTIFY', handleQueueNotify);

        return () => {
            socket.off('NOTIFY', handleQueueNotify);
        }
    }, [queueNumber]);

    return (
        <div className={"notifications-container" + (notificationShown ? " visible" : "")}>
            {notificationShown ? (
                <div className={"notification"} ref={notification}>
                    {notificationShown['image'] && (
                        <div className={"notification-image-area"}>
                            <img src={`${notificationShown['image']}`} alt={"Notification"} />
                        </div>
                    )}
                    <div className={"notification-data-area"}>
                        <p className={"title"}>{notificationShown['title']}</p>
                        <p className={"body"}>{notificationShown['body']}</p>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
