import React, {useEffect, useState} from 'react';

import './PadScrollIndicator.css';
import usePrevious from "../../usePrevious";

export default function PadScrollIndicator(props){

    const [showLabel, setShowLabel] = useState(false);
    const [showLabelTimeout, setShowLabelTimeout] = useState(null);

    const currentPage = props['currentSection'];
    const previousPage = usePrevious(currentPage);

    const handlePageToggle = (pageIndex) => {
        if(props['onToggle'] && typeof props['onToggle'] === 'function'){
            props['onToggle'](pageIndex);
        }
    }

    useEffect(() => {
        let timeout = null;
        if(currentPage !== previousPage){
            if(showLabelTimeout) clearTimeout(showLabelTimeout);
            setShowLabel(true);
            timeout = setTimeout(() => {
                setShowLabel(false);
            }, 2000);
            setShowLabelTimeout(timeout);
        }

        return () => {
            if(timeout){
                clearTimeout(timeout);
            }
        }
    }, [currentPage]);

    if(!props['pages']) return null;

    const pages = props['pages'];

    const pageIndicators = pages.map((page, pageIndex) => (
        <p key={`pad-scroll-indicator-page-indicator-${pageIndex}`} className={"pad-scroll-indicator-page-indicator" + ((currentPage && page === currentPage) ? (" active" + (showLabel ? " show-label" : "")) : "")} onClick={() => {
            handlePageToggle(pageIndex);
        }}>{page}</p>
    ));

    return (
        <div className={"pad-scroll-indicator" + (!!props['hide'] ? " hide" : "")}>
            {pageIndicators}
        </div>
    )
}
