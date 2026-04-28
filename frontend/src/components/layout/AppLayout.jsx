import React from 'react';
import Sidebar from './Sidebar';

const AppLayout = ({ children, user, onLogout }) => {
    return (
        <div className="flex h-screen overflow-hidden bg-[#030305] text-white selection:bg-purple-500/30">
            {/* Desktop Sidebar */}
            <Sidebar user={user} />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    );
};

export default AppLayout;
