import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaFire } from 'react-icons/fa';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
// NEW: Import motion and useAnimation from framer-motion
import { motion, useAnimation } from 'framer-motion';

// ... (STREAK_MESSAGES object remains the same) ...
const STREAK_MESSAGES = {
    SAFE_TODAY: { 
        title: "Streak Safe!", 
        message: "You've completed a test today. Keep up the great work!" 
    },
    AT_RISK: {
        title: "Extend Your Streak!",
        message: "Your streak is active from yesterday. Complete a test today to keep it going."
    },
    BROKEN: {
        title: "Streak Lost",
        message: "You missed a day. Complete a test today to start a new streak!"
    },
    NEW_USER: {
        title: "Start a Streak!",
        message: "Complete your first test today to begin your daily streak."
    }
};


const Navbar = ({ navigate, bannerHeight = 0 }) => {
    const { user, userData, signOut } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [attempts, setAttempts] = useState([]);
    const [streakStatus, setStreakStatus] = useState(STREAK_MESSAGES.NEW_USER);

    // NEW: Animation controls for the fire icon
    const fireControls = useAnimation();

    // ... (All useEffect hooks for scroll, fetching, and streak logic remain the same) ...
    // Effect for handling scroll behavior
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > (50 + bannerHeight)) setScrolled(true);
            else setScrolled(false);
        };
        if (!user) window.addEventListener('scroll', handleScroll);
        return () => {
            if (!user) window.removeEventListener('scroll', handleScroll);
        };
    }, [user, bannerHeight]);

    // Effect for fetching user's attempts from Firestore
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

    // Effect for calculating streak and status
    useEffect(() => {
        if (attempts.length === 0) {
            setCurrentStreak(0);
            setStreakStatus(STREAK_MESSAGES.NEW_USER);
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const completedDates = new Set();
        attempts.forEach(attempt => {
            if (attempt.completedAt) {
                const completedDay = new Date(attempt.completedAt.toDate());
                completedDay.setHours(0, 0, 0, 0);
                completedDates.add(completedDay.getTime());
            }
        });
        const sortedTimestamps = Array.from(completedDates).sort((a, b) => b - a);
        const mostRecentCompletion = sortedTimestamps[0];
        let calculatedStreak = 0;
        if (mostRecentCompletion === today.getTime()) {
            setStreakStatus(STREAK_MESSAGES.SAFE_TODAY);
        } else if (mostRecentCompletion === yesterday.getTime()) {
            setStreakStatus(STREAK_MESSAGES.AT_RISK);
        } else {
            setStreakStatus(STREAK_MESSAGES.BROKEN);
        }
        if (mostRecentCompletion === today.getTime() || mostRecentCompletion === yesterday.getTime()) {
            calculatedStreak = 1;
            let lastDate = new Date(mostRecentCompletion);
            for (let i = 1; i < sortedTimestamps.length; i++) {
                const previousDay = new Date(lastDate);
                previousDay.setDate(lastDate.getDate() - 1);
                if (sortedTimestamps[i] === previousDay.getTime()) {
                    calculatedStreak++;
                    lastDate = previousDay;
                } else {
                    break;
                }
            }
        } else {
            calculatedStreak = 0;
        }
        
        // Check if streak has increased to trigger the animation
        if (calculatedStreak > currentStreak) {
            fireControls.start({
                scale: [1, 1.4, 1],
                transition: { duration: 0.4 }
            });
        }
        
        setCurrentStreak(calculatedStreak);

    // We add currentStreak and fireControls to the dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attempts]);
    
    // ... (navbarClasses and styles remain the same) ...
     const navbarClasses = `
        fixed left-0 right-0 z-50 transition-all duration-300
        ${user ? 'bg-gray-800 shadow-lg' : 'bg-transparent'}
        ${!user && scrolled ? '-translate-y-full' : 'translate-y-0'}
    `;

    return (
        <nav className={navbarClasses} style={{ top: `${bannerHeight}px` }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`h-16 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
                    {/* ... (Logo remains the same) ... */}
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
                            <div className="relative group flex items-center mr-3">
                                {/* NEW: Wrap icon in a motion.div to control its animation */}
                                <motion.div animate={fireControls}>
                                    <FaFire className={`w-5 h-5 mr-1 transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-gray-400' : 'text-orange-400'}`} />
                                </motion.div>

                                {/* NEW: Animate the number change */}
                                <motion.div
                                    key={currentStreak}
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 20, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className={`font-semibold text-lg transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-gray-300' : 'text-orange-400'}`}
                                >
                                    {currentStreak}
                                </motion.div>
                                
                                {/* ... (Tooltip remains the same) ... */}
                                 <div className="absolute top-full left-1/2 -translate-x-1/2 z-10 mt-2 w-64 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                                    <h4 className="font-bold text-base">{streakStatus.title}</h4>
                                    <p className="text-xs text-gray-300 mt-1">{streakStatus.message}</p>
                                    
                                    {/* This is the little arrow, now pointing up */}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                                </div>
                            </div>
                            {/* ... (User avatar and sign out button remain the same) ... */}
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
                    0% { background-position: -200% 0; opacity: 0.8; }
                    50% { background-position: 200% 0; opacity: 1; }
                    100% { background-position: -200% 0; opacity: 0.8; }
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