import React from 'react';

const AdminDashboard = ({ navigate }) => {
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={() => navigate('manageTests')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">Test Manager</h2>
                    <p className="mt-2 text-gray-400">Create, edit, publish, and delete all Sectionals and Mock Tests.</p>
                </button>
                <button 
                    onClick={() => navigate('userManagement')} 
                    className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all text-left"
                >
                    <h2 className="text-2xl font-bold text-white">User Management</h2>
                    <p className="mt-2 text-gray-400">View all users and manually grant premium subscription access.</p>
                </button>
            </div>
        </div>
    );
};

export default AdminDashboard;
