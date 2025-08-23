import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaFire } from 'react-icons/fa';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';

const Navbar = ({ navigate, bannerHeight = 0 }) => {
    const { user, userData, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [attempts, setAttempts] = useState([]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > (50 + bannerHeight)) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        if (!user) {
            window.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (!user) {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, [user, bannerHeight]);

    // Listen to attempts
    useEffect(() => {
        if (!user?.uid) {
            setAttempts([]);
            return;
        }
        const q = query(
            collection(db, 'attempts'),
            where('userId', '==', user.uid),
            where('status', '==', 'completed'),
            orderBy('completedAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAttempts(snapshot.docs.map(doc => doc.data()));
        }, (error) => {
            console.error("Error fetching attempts:", error);
        });
        return unsubscribe;
    }, [user]);

    // Calculate streak based on test completions
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const completedDates = new Set();
        attempts.forEach(attempt => {
            if (attempt.completedAt) {
                const completedDay = new Date(attempt.completedAt.toDate());
                completedDay.setHours(0, 0, 0, 0);
                completedDates.add(completedDay.toISOString().split('T')[0]);
            }
        });

        const sortedDates = Array.from(completedDates).sort((a, b) => b.localeCompare(a));

        let calculatedStreak = 0;
        let lastDate = null;

        for (const dateStr of sortedDates) {
            const currentDate = new Date(dateStr);
            currentDate.setHours(0, 0, 0, 0);

            if (lastDate === null) {
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                if (currentDate.getTime() === today.getTime() || currentDate.getTime() === yesterday.getTime()) {
                    calculatedStreak = 1;
                } else {
                    calculatedStreak = 0;
                    break;
                }
            } else {
                const previousDay = new Date(lastDate);
                previousDay.setDate(previousDay.getDate() - 1);
                if (currentDate.getTime() === previousDay.getTime()) {
                    calculatedStreak++;
                } else {
                    break;
                }
            }
            lastDate = currentDate;
        }

        setCurrentStreak(calculatedStreak);
    }, [attempts]);

    const navbarClasses = `
        fixed left-0 right-0 z-50 transition-all duration-300
        ${user ? 'bg-gray-800 shadow-lg' : 'bg-transparent'}
        ${!user && scrolled ? '-translate-y-full' : 'translate-y-0'}
    `;

    return (
        <nav className={navbarClasses} style={{ top: `${bannerHeight}px` }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`h-16 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
                    <span
                        onClick={() => user ? navigate('home') : null}
                        className={`text-xl sm:text-2xl font-bold tracking-wider ${user ? 'cursor-pointer' : ''}
                                   bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text
                                   animate-shine-pulse`}
                    >
                        RDFC<span className="text-gray-400"> Test</span>
                    </span>
                    {user && userData && (
                        <div className="ml-4 flex items-center">
                            <div className="flex items-center text-orange-400 mr-3 animate-pulse">
                                <FaFire className="w-5 h-5 mr-1" />
                                <span className="font-semibold text-lg">{currentStreak}</span>
                            </div>
                            <img className="h-8 w-8 rounded-full" src={userData.photoURL} alt="User avatar" />
                            <span className="text-gray-300 ml-3 hidden sm:block">Welcome, {userData.displayName?.split(' ')[0]}</span>
                            <button onClick={signOut} className="ml-4 bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <style>
                {`
                @keyframes shine-pulse {
                    0% {
                        background-position: -200% 0;
                        opacity: 0.8;
                    }
                    50% {
                        background-position: 200% 0;
                        opacity: 1;
                    }
                    100% {
                        background-position: -200% 0;
                        opacity: 0.8;
                    }
                }
                .animate-shine-pulse {
                    background-size: 200% auto;
                    animation: shine-pulse 4s linear infinite;
                }
                `}
            </style>
        </nav>
    );
};

export default Navbar;