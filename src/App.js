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
import Earnings from './pages/Earnings';
import AdminSubscriptionManagement from './pages/AdminSubscriptionManagement';
import ReviewsPage from './pages/ReviewsPageTemp';
import AdminReviewsManager from './pages/AdminReviewsManager';
import AllTestimonialsPage from './pages/AllTestimonialsPage';
import LegalPage from './pages/LegalPage';
import AdminVocabManager from './pages/AdminVocabManager';
import SupportPage from './pages/SupportPage';
import AdminSupportManager from './pages/AdminSupportManager';
// NEW: Import the StreaksPage
import StreaksPage from './pages/StreaksPage';

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
        switch (currentPage) {
            case 'subscription': return <SubscriptionPage navigate={navigate} />;
            case 'reviews': return <ReviewsPage navigate={navigate} />;
            case 'allTestimonials': return <AllTestimonialsPage navigate={navigate} />;
            case 'legal': return <LegalPage navigate={navigate} pageData={pageData} />;
            default: return <LoginPage navigate={navigate} />;
        }
    }

    let pageComponent;
    let mainPaddingClass = "p-4 sm:p-6 md:p-8";
    let showNavbar = true;

    if (userData?.isAdmin) {
        // Admin routes
        switch (currentPage) {
            case 'home': pageComponent = <AdminDashboard navigate={navigate} />; break;
            case 'manageTests': pageComponent = <AdminTestManager navigate={navigate} />; break;
            case 'createTest': pageComponent = <CreateTestPage navigate={navigate} {...pageData} />; break;
            case 'userManagement': pageComponent = <AdminUserManagement navigate={navigate} />; break;
            case 'manageRDFCArticles': pageComponent = <RDFCArticlesPage navigate={navigate} />; break;
            case 'earnings': pageComponent = <Earnings navigate={navigate} />; break;
            case 'manageSubscriptions': pageComponent = <AdminSubscriptionManagement navigate={navigate} />; break;
            case 'reviews': pageComponent = <ReviewsPage navigate={navigate} />; break;
            case 'manageReviews': pageComponent = <AdminReviewsManager navigate={navigate} />; break;
            case 'allTestimonials': pageComponent = <AllTestimonialsPage navigate={navigate} />; break;
            case 'manageVocab': pageComponent = <AdminVocabManager navigate={navigate} />; break; 
            case 'manageSupport': pageComponent = <AdminSupportManager navigate={navigate} />; break;
            case 'legal': 
                pageComponent = <LegalPage navigate={navigate} pageData={pageData} />; 
                showNavbar = false;
                break;
            default: pageComponent = <AdminDashboard navigate={navigate} />;
        }
    } else {
        // User routes
        switch (currentPage) {
            case 'home': pageComponent = <UserDashboard navigate={navigate} />; break;
            case 'streaks': pageComponent = <StreaksPage navigate={navigate} />; break; // NEW ROUTE
            case 'test': pageComponent = <TestInterfacePage navigate={navigate} {...pageData} />; break;
            case 'results': 
                pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />; 
                mainPaddingClass = "p-0";
                break;
            case 'subscription': pageComponent = <SubscriptionPage navigate={navigate} />; break;
            case 'rdfcArticleViewer': pageComponent = <RDFCArticleViewer navigate={navigate} {...pageData} />; break;
            case 'allTests': pageComponent = <AllTestsPage navigate={navigate} {...pageData} />; break;
            case 'reviews': pageComponent = <ReviewsPage navigate={navigate} />; break;
            case 'allTestimonials': return <AllTestimonialsPage navigate={navigate} />;
            case 'support': pageComponent = <SupportPage navigate={navigate} />; break;
            case 'legal': 
                pageComponent = <LegalPage navigate={navigate} pageData={pageData} />; 
                showNavbar = false;
                break;
            default: pageComponent = <UserDashboard navigate={navigate} />;
        }
    }

    return (
        <div className="bg-gray-900 text-white min-h-screen font-sans antialiased">
            {showNavbar && <Navbar navigate={navigate} />}
            {user && showNavbar && <div className="h-16 w-full"></div>}
            <main className={!showNavbar ? '' : mainPaddingClass}>
                {pageComponent}
            </main>
        </div>
    );
};

export default function App() {
    return (<AuthProvider><MainRouter /></AuthProvider>);
}
