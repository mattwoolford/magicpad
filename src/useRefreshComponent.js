import {useState} from "react";

export default function useRefreshComponent(){
    const [value, setValue] = useState(0);
    return () => setValue(value => value + 1);
}
