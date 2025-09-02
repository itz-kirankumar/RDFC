// src/App.js
import React, { useState, useEffect } from 'react';
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
import StreaksPage from './pages/StreaksPage';
import SchedulePage from './pages/SchedulePage';
import AdminTabManager from './pages/AdminTabManager';
import UpgradePage from './pages/UpgradePage';
import AdminPlanMapper from './pages/AdminPlanMapper';

// --- NEW: A better full-page loader for the initial auth check ---
const InitialLoader = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
        <p className="mt-4 text-gray-400">Loading your session...</p>
    </div>
);

const LoadingOverlay = ({ message }) => {
    if (!message) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-[9999]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>
            <p className="text-white text-lg font-semibold">{message}</p>
        </div>
    );
};

const MainRouter = () => {
    const { user, userData, loading } = useAuth();
    const [currentPage, setCurrentPage] = useState('home');
    const [pageData, setPageData] = useState({});
    const [loadingMessage, setLoadingMessage] = useState(null);

    const navigate = (page, data = {}) => {
        setCurrentPage(page);
        setPageData(data);
    };

    // This effect handles the guest checkout flow
    useEffect(() => {
        if (!loading && user) {
            const pendingCheckoutJSON = sessionStorage.getItem('pendingCheckout');
            if (pendingCheckoutJSON) {
                try {
                    const pendingCheckout = JSON.parse(pendingCheckoutJSON);
                    sessionStorage.removeItem('pendingCheckout');
                    if (!userData?.isAdmin) {
                        navigate('subscription', { pendingCheckout, setLoadingMessage });
                    }
                } catch(e) {
                    console.error("Error parsing pending checkout data", e);
                    sessionStorage.removeItem('pendingCheckout');
                }
            }
        }
    }, [user, userData, loading]);

    // --- FIX: This effect handles sign-out to prevent crashes and UI hangs ---
    useEffect(() => {
        if (!loading && !user) {
            // When the user signs out, always reset the view to the default guest page.
            setCurrentPage('home');
        }
    }, [user, loading]);


    if (loading) {
        // Use the new, improved initial loader to prevent login page flicker
        return <InitialLoader />;
    }

    if (!user) {
        switch (currentPage) {
            case 'subscription': return <SubscriptionPage navigate={navigate} setLoadingMessage={setLoadingMessage} />;
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
            case 'manageTabs': pageComponent = <AdminTabManager navigate={navigate} />; break;
            case 'manageTests': pageComponent = <AdminTestManager navigate={navigate} />; break;
            case 'createTest': pageComponent = <CreateTestPage navigate={navigate} {...pageData} />; break;
            case 'userManagement': pageComponent = <AdminUserManagement navigate={navigate} />; break;
            case 'manageRDFCArticles': pageComponent = <RDFCArticlesPage navigate={navigate} />; break;
            case 'earnings': pageComponent = <Earnings navigate={navigate} />; break;
            case 'manageSubscriptions': pageComponent = <AdminSubscriptionManagement navigate={navigate} />; break;
            case 'planMapper': pageComponent = <AdminPlanMapper navigate={navigate} />; break; 
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
            case 'upgrade': pageComponent = <UpgradePage navigate={navigate} />; break; 
            case 'streaks': pageComponent = <StreaksPage navigate={navigate} />; break;
            case 'schedule': pageComponent = <SchedulePage navigate={navigate} />; break;
            case 'test': pageComponent = <TestInterfacePage navigate={navigate} {...pageData} />; break;
            case 'results': 
                pageComponent = <ResultAnalysis navigate={navigate} {...pageData} />; 
                mainPaddingClass = "p-0";
                break;
            case 'subscription': pageComponent = <SubscriptionPage navigate={navigate} setLoadingMessage={setLoadingMessage} {...pageData} />; break;
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
            <LoadingOverlay message={loadingMessage} />
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