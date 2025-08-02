import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SubscriptionPage from './pages/SubscriptionPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminTestManager from './pages/AdminTestManager';
import AdminUserManagement from './pages/AdminUserManagement';
import TestInterfacePage from './pages/TestInterfacePage';
import ResultAnalysis from './pages/ResultAnalysis';

// --- Main Router Component ---
const MainRouter = () => {
    const { user, userData, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
    const [pageData, setPageData] = useState({});

    if (loading) {
        return (<div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>);
    }
    
    const navigate = (page, data = {}) => {
        setCurrentPage(page);
        setPageData(data);
    };

    if (!user) {
        if (currentPage === 'subscription') {
            return <SubscriptionPage navigate={navigate} />;
        }
        return <LoginPage navigate={navigate} />;
    }

    let pageComponent;
    if (userData?.isAdmin) {
        switch (currentPage) {
            case 'home': pageComponent = <AdminDashboard navigate={navigate} />; break;
            case 'manageTests': pageComponent = <AdminTestManager navigate={navigate} />; break;
            case 'userManagement': pageComponent = <AdminUserManagement navigate={navigate} />; break;
            default: pageComponent = <AdminDashboard navigate={navigate} />;
        }
    } else {
        const freeTestsTaken = userData?.freeTestsTaken || { VARC: true, DILR: true, QA: true };
        const allFreeTestsTaken = Object.values(freeTestsTaken).every(Boolean);

        if (userData?.isSubscribed || !allFreeTestsTaken) {
            switch (currentPage) {
                case 'home': pageComponent = <UserDashboard navigate={navigate} />; break;
                case 'test': pageComponent = <TestInterfacePage navigate={navigate} {...pageData} />; break;
                case 'results': pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />; break;
                case 'subscription': pageComponent = <SubscriptionPage navigate={navigate} />; break;
                default: pageComponent = <UserDashboard navigate={navigate} />;
            }
        } else {
            if (currentPage === 'results') {
                pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />;
            } else {
                 pageComponent = <SubscriptionPage navigate={navigate} />;
            }
        }
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans antialiased">
            <Navbar navigate={navigate} />
            <main className="p-4 sm:p-6 md:p-8">{pageComponent}</main>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
    return (<AuthProvider><MainRouter /></AuthProvider>);
}
