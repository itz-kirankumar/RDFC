import React from 'react';

const AdminDashboard = ({ navigate }) => {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Original Buttons */}
                <button 
                    onClick={() => navigate('manageTests')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">Test Manager</h2>
                    <p className="mt-2 text-gray-400">Create, edit, publish, and delete all Sectionals and Mock Tests.</p>
                </button>
                <button 
                    onClick={() => navigate('manageRDFCArticles')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">RDFC Articles</h2>
                    <p className="mt-2 text-gray-400">Link Google Drive articles to specific tests.</p>
                </button>
                <button 
                    onClick={() => navigate('userManagement')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">User Management</h2>
                    <p className="mt-2 text-gray-400">View all users and manually grant premium subscription access.</p>
                </button>
                <button 
                    onClick={() => navigate('earnings')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">Earnings Dashboard</h2>
                    <p className="mt-2 text-gray-400">Track earnings, settled payments, and manage revenue sharing.</p>
                </button>
                <button 
                    onClick={() => navigate('manageSubscriptions')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">Subscription Plans</h2>
                    <p className="mt-2 text-gray-400">Manage subscription plans, pricing, and features.</p>
                </button>

                {/* New Button for Managing Reviews */}
                <button 
                    onClick={() => navigate('manageReviews')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">Manage Reviews</h2>
                    <p className="mt-2 text-gray-400">Approve and manage user-submitted testimonials.</p>
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
