import React, {useEffect, useRef, useState} from 'react';

import './PadTableOptions.css';
import PadTableOptionsButton from "../PadTableOptionsButton/PadTableOptionsButton";

import CheckBoxIcon from '../../images/checkbox.png';

export default function PadTableOptions(props){

    const [tables, setTables] = useState([]);

    const promptChecklist = !!props['promptChecklist'];

    const selectInputRef = useRef();

    const handleSetTableNumber = e => {
        let tableNumber = e.target.value;
        try {
            tableNumber = parseInt(tableNumber);
        }
        catch (e) {
            //Do nothing
            return;
        }
        if(props['onTableChange'] && typeof props['onTableChange'] === 'function'){
            props['onTableChange'](tableNumber);
        }
    };

    const handleToggleChecklist = () => {
        if(props['onToggleChecklist'] && typeof props['onToggleChecklist'] === 'function'){
            props['onToggleChecklist']();
        }
    }

    const getTables = () => {
        fetch(`//${process.env["REACT_APP_API_HOSTNAME"]}/tables`, {
            credentials: 'include'
        })
            .then(async request => {
                const response = await request.json();
                if(response['tables']){
                    setTables(response['tables']);
                }
            });
    }

    useEffect(() => {
        getTables();
    }, []);

    const tableOptions = tables.map((table, tableIndex) => <option key={`table-selector-option-${tableIndex}`} value={table['table_number'].toString()}>Table {table['table_number']}</option>);

    return (
        <div className={"pad-table-options"}>
            <form className={"pad-table-options-form" + (!!props['selectedTable'] ? "" : " right-align")}>
                {!!props['selectedTable'] && <PadTableOptionsButton value={"Checklist"} image={CheckBoxIcon} alert={promptChecklist} onClick={handleToggleChecklist}/>}
                <select className={"pad-table-options-table-select-input"} onChange={handleSetTableNumber} value={props['selectedTable'] && props['selectedTable'] ? props['selectedTable'] : ''} ref={selectInputRef}>
                    <option value={""}>Choose a table</option>
                    {tableOptions}
                </select>
            </form>
        </div>
    )

}
