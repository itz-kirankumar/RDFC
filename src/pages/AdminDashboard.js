import React from 'react';
import { FaTicketAlt, FaUsers, FaListAlt, FaChartLine, FaTags, FaStar, FaSpellCheck, FaSitemap } from 'react-icons/fa'; // Import more icons for visual appeal

const AdminDashboard = ({ navigate }) => {
    
    // Card component for consistency and cleaner code
    const DashboardCard = ({ onClick, title, description, icon, special = false }) => (
        <button 
            onClick={onClick} 
            className={`p-4 md:p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between h-full
                ${special 
                    ? 'bg-indigo-800 ring-2 ring-indigo-500' 
                    : 'bg-gray-800'
                }`}
        >
            <div>
                <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
                <p className={`mt-2 ${special ? 'text-gray-300' : 'text-gray-400'}`}>{description}</p>
            </div>
            {icon && <div className="self-end mt-4">{icon}</div>}
        </button>
    );

    return (
        // Added padding for mobile view
        <div className="max-w-7xl mx-auto p-4 md:p-0 space-y-6 md:space-y-8">
            {/* Adjusted font size for mobile */}
            <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard 
                    onClick={() => navigate('manageTabs')} 
                    title="Tab Manager"
                    description="Manage test categories, tabs, and user dashboard structure."
                    icon={<FaSitemap className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('manageTests')} 
                    title="Test Manager"
                    description="Create, edit, publish, and delete all Sectionals and Mock Tests."
                    icon={<FaListAlt className="text-gray-500 text-3xl"/>}
                />
                 <DashboardCard 
                    onClick={() => navigate('manageRDFCArticles')} 
                    title="Material Manager"
                    description="Link Google Drive articles to specific tests."
                    icon={<FaSpellCheck className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('userManagement')} 
                    title="User Management"
                    description="View all users and manually grant premium subscription access."
                    icon={<FaUsers className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('earnings')} 
                    title="Earnings Dashboard"
                    description="Track earnings, settled payments, and manage revenue sharing."
                    icon={<FaChartLine className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('manageSubscriptions')} 
                    title="Subscription Plans"
                    description="Manage subscription plans, pricing, and features."
                    icon={<FaTags className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('manageReviews')} 
                    title="Manage Reviews"
                    description="Approve and manage user-submitted testimonials."
                    icon={<FaStar className="text-gray-500 text-3xl"/>}
                />
                <DashboardCard 
                    onClick={() => navigate('manageVocab')} 
                    title="Vocab Manager"
                    description="Create and manage daily vocabulary wordlists for users."
                    special // This prop applies the special styling
                />
                <DashboardCard 
                    onClick={() => navigate('manageSupport')} 
                    title="Support Center"
                    description="View and respond to user support tickets."
                    icon={<FaTicketAlt className="text-cyan-400 text-3xl"/>}
                    // Using a different base style for this special card
                    className="bg-cyan-800 ring-2 ring-cyan-500"
                />
            </div>
        </div>
    );
};

export default AdminDashboard;
