import React, { useState } from 'react';
import './HelpBar.css';
import rankings from './media/rankings.jpg';

const HelpBar = () => {
    const [open, setOpen] = useState(false)
    let leftOpen = open ? 'open' : 'closed';
    let iconText = open ? '<' : 'Help >';

    return (
        <div id='HelpBar'>
            <div id='left' className={leftOpen} >
                <div className='icon'
                    onClick={() => setOpen((prev) => !prev)} >
                    {iconText}
                </div>
                <div className={`sidebar ${leftOpen}`} >
                    <div className='content'>
                        <img src={rankings} alt="rankings" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default HelpBar;