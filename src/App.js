// src/App.js
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
import RDFCArticlesPage from './pages/RDFCArticlesPage';
import RDFCArticleViewer from './pages/RDFCArticleViewer';
import AllTestsPage from './pages/AllTestsPage';
import Earnings from './pages/Earnings'; // Earnings is now a dedicated page
import AdminSubscriptionManagement from './pages/AdminSubscriptionManagement'; // New: Admin Subscription Management page

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
    let mainPaddingClass = "p-4 sm:p-6 md:p-8"; // Default padding

    if (userData?.isAdmin) {
        switch (currentPage) {
            case 'home': pageComponent = <AdminDashboard navigate={navigate} />; break;
            case 'manageTests': pageComponent = <AdminTestManager navigate={navigate} />; break;
            case 'createTest': pageComponent = <CreateTestPage navigate={navigate} {...pageData} />; break;
            case 'userManagement': pageComponent = <AdminUserManagement navigate={navigate} />; break;
            case 'manageRDFCArticles': pageComponent = <RDFCArticlesPage navigate={navigate} />; break;
            case 'earnings': pageComponent = <Earnings navigate={navigate} />; break;
            case 'manageSubscriptions': pageComponent = <AdminSubscriptionManagement navigate={navigate} />; break; // New: Route for Admin Subscription Management
            default: pageComponent = <AdminDashboard navigate={navigate} />;
        }
    } else {
        switch (currentPage) {
            case 'home': pageComponent = <UserDashboard navigate={navigate} />; break;
            case 'test': pageComponent = <TestInterfacePage navigate={navigate} {...pageData} />; break;
            case 'results': 
                pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />; 
                mainPaddingClass = "p-0"; // Remove padding for ResultAnalysis page
                break;
            case 'subscription': pageComponent = <SubscriptionPage navigate={navigate} />; break;
            case 'rdfcArticleViewer': pageComponent = <RDFCArticleViewer navigate={navigate} {...pageData} />; break;
            case 'allTests': pageComponent = <AllTestsPage navigate={navigate} {...pageData} />; break;
            default: pageComponent = <UserDashboard navigate={navigate} />;
        }
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans antialiased">
            <Navbar navigate={navigate} />
            {user && <div className="h-16 w-full"></div>}
            <main className={mainPaddingClass}> {/* Apply conditional padding */}
                {pageComponent}
            </main>
        </div>
    );
};

export default function App() {
    return (<AuthProvider><MainRouter /></AuthProvider>);
}