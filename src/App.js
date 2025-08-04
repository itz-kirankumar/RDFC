import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SubscriptionPage from './pages/SubscriptionPage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminTestManager from './pages/AdminTestManager';
import AdminUserManagement from './pages/AdminUserManagement';
import CreateTestPage from './pages/CreateTestPage';
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
        // If not logged in, only show LoginPage or SubscriptionPage if explicitly navigated
        if (currentPage === 'subscription') {
            return <SubscriptionPage navigate={navigate} />;
        }
        return <LoginPage navigate={navigate} />;
    }

    let pageComponent;
    if (userData?.isAdmin) {
        // Admin routes
        switch (currentPage) {
            case 'home': pageComponent = <AdminDashboard navigate={navigate} />; break;
            case 'manageTests': pageComponent = <AdminTestManager navigate={navigate} />; break;
            case 'createTest': pageComponent = <CreateTestPage navigate={navigate} {...pageData} />; break;
            case 'userManagement': pageComponent = <AdminUserManagement navigate={navigate} />; break;
            default: pageComponent = <AdminDashboard navigate={navigate} />;
        }
    } else {
        // User routes
        // The default view for logged-in users will always be UserDashboard unless explicitly navigated
        switch (currentPage) {
            case 'home': pageComponent = <UserDashboard navigate={navigate} />; break;
            case 'test': pageComponent = <TestInterfacePage navigate={navigate} {...pageData} />; break;
            case 'results': pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />; break;
            case 'subscription': pageComponent = <SubscriptionPage navigate={navigate} />; break; // Only show if explicitly navigated
            default: pageComponent = <UserDashboard navigate={navigate} />; // Default to UserDashboard
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