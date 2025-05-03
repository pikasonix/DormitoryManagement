import React from 'react';

const Tab = ({ id, label, icon: Icon, children, isActive, onClick }) => {
    return (
        <div role="tabpanel" hidden={!isActive} id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} className={isActive ? 'block' : 'hidden'}>
            {children}
        </div>
    );
};

export default Tab;