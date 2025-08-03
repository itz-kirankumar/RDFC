import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = ({ navigate }) => {
    const { user, userData, signOut } = useAuth();

    return (
        <nav className="bg-gray-800 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <span 
                        onClick={() => user ? navigate('home') : null} 
                        className={`text-xl sm:text-2xl font-bold text-white tracking-wider ${user ? 'cursor-pointer' : ''}`}
                    >
                        RDFC<span className="text-gray-400">.blog</span>
                    </span>
                    {user && userData && (
                        <div className="ml-4 flex items-center">
                            <img className="h-8 w-8 rounded-full" src={userData.photoURL} alt="User avatar" />
                            <span className="text-gray-300 ml-3 hidden sm:block">Welcome, {userData.displayName?.split(' ')[0]}</span>
                            <button onClick={signOut} className="ml-4 bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
