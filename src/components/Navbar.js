import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaFire } from 'react-icons/fa';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';

const STREAK_MESSAGES = {
    SAFE_TODAY: { title: "Streak Safe!", message: "You've completed a test today." },
    SAFE_FRIDAY: { title: "Streak Safe!", message: "Your streak is safe over the weekend!" },
    AT_RISK: { title: "Extend Your Streak!", message: "Complete a test today to keep your streak." },
    BROKEN: { title: "Streak Lost", message: "Complete a test to start a new one!" },
    NEW_USER: { title: "Start a Streak!", message: "Complete your first test to begin." }
};

// --- CORE LOGIC: Strict Streak and Reward Calculation ---
const processUserData = async (user, userData, attempts) => {
    if (!user || !userData || !attempts) return;

    const today = new Date(); 
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();

    // Set of unique, normalized completion timestamps
    const completionDates = new Set(attempts.map(a => {
        const d = a.completedAt?.toDate() || new Date(); 
        d.setHours(0, 0, 0, 0); 
        return d.getTime();
    }));

    let updates = {};
    let currentStreak = userData.currentStreak || 0;
    let streakFreezes = userData.streakFreezes !== undefined ? userData.streakFreezes : 3;
    
    let lastActiveDate = userData.lastActiveDate?.toDate() || null;
    if (lastActiveDate) lastActiveDate.setHours(0, 0, 0, 0);

    const completedToday = completionDates.has(todayTime);

    // Initial setup for new users
    if (!lastActiveDate) {
        if (completedToday) {
            currentStreak = 1;
            updates.currentStreak = currentStreak;
            updates.lastActiveDate = today;
        } else {
            updates.lastActiveDate = yesterday;
        }
        if (userData.streakFreezes === undefined) updates.streakFreezes = 3;
    } else {
        const lastActiveTime = lastActiveDate.getTime();

        if (lastActiveTime === yesterdayTime) {
            // Normal sequential day
            if (completedToday) {
                currentStreak++;
                updates.currentStreak = currentStreak;
                updates.lastActiveDate = today;
            }
        } else if (lastActiveTime < yesterdayTime) {
            // Gap detected! Calculate missing days
            const gap = Math.floor((yesterdayTime - lastActiveTime) / (1000 * 60 * 60 * 24));
            
            if (currentStreak > 0) {
                if (streakFreezes >= gap) {
                    // Freezes bridge the gap
                    streakFreezes -= gap;
                    updates.streakFreezes = streakFreezes;
                    updates.lastActiveDate = yesterday;
                    
                    if (completedToday) {
                        currentStreak++;
                        updates.currentStreak = currentStreak;
                        updates.lastActiveDate = today;
                    }
                } else {
                    // Streak Broken
                    currentStreak = 0;
                    updates.currentStreak = currentStreak;
                    updates.lastActiveDate = yesterday;
                    
                    if (completedToday) {
                        currentStreak = 1;
                        updates.currentStreak = currentStreak;
                        updates.lastActiveDate = today;
                    }
                }
            } else {
                updates.lastActiveDate = yesterday;
                if (completedToday) {
                    currentStreak = 1;
                    updates.currentStreak = currentStreak;
                    updates.lastActiveDate = today;
                }
            }
        } else if (lastActiveTime === todayTime) {
            // Failsafe recovery if state gets misaligned
            if (currentStreak === 0 && completedToday) {
                currentStreak = 1;
                updates.currentStreak = 1;
            }
        }
    }

    // --- WEEKLY MILESTONE REWARD LOGIC ---
    if (currentStreak > 0) {
        const streakWeeks = Math.floor(currentStreak / 7);
        const claimedWeeks = userData.streakWeeksClaimed || 0;

        if (streakWeeks > claimedWeeks) {
            updates.streakWeeksClaimed = streakWeeks;
            streakFreezes += 2;
            updates.streakFreezes = streakFreezes;
            
            // Trigger Popup
            updates.unseenReward = {
                title: "Weekly Milestone! 🌟",
                message: `You maintained your streak for ${streakWeeks * 7} days straight!`,
                reward: "+2 Streak Freezes",
                icon: "shield"
            };
        }
    } else if (currentStreak === 0 && (userData.streakWeeksClaimed || 0) > 0) {
        // Reset claims if streak breaks so they can earn again
        updates.streakWeeksClaimed = 0;
    }

    if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updates);
    }
};

// --- REWARD POPUP MODAL ---
const RewardModal = ({ reward, onClose }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <Confetti recycle={false} numberOfPieces={600} gravity={0.15} />
        <motion.div 
            initial={{ scale: 0.8, opacity: 0, y: 50 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-700 shadow-[0_0_50px_rgba(59,130,246,0.4)] relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-blue-500 opacity-20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-amber-500 opacity-20 rounded-full blur-3xl"></div>
            
            <div className="text-7xl mb-4 relative z-10 drop-shadow-lg animate-bounce">
                {reward.icon === 'shield' ? '🛡️' : '🏆'}
            </div>
            <h2 className="text-3xl font-extrabold text-white mb-2 relative z-10">{reward.title}</h2>
            <p className="text-slate-300 mb-6 font-medium relative z-10">{reward.message}</p>
            
            <div className="bg-slate-900/60 rounded-2xl p-5 mb-8 border border-slate-700 relative z-10 shadow-inner">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Reward Unlocked</p>
                <p className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 drop-shadow-sm">
                    {reward.reward}
                </p>
            </div>
            
            <button 
                onClick={onClose} 
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-lg transition-all shadow-lg shadow-blue-500/30 active:scale-95 relative z-10"
            >
                Awesome!
            </button>
        </motion.div>
    </div>
);

const Navbar = ({ navigate, bannerHeight = 0 }) => {
    const { user, userData, signOut } = useAuth();
    const [attempts, setAttempts] = useState([]);
    const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(false);
    const fireControls = useAnimation();
    const [scrolled, setScrolled] = useState(false);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > (50 + bannerHeight));
        if (!user) window.addEventListener('scroll', handleScroll);
        else setScrolled(true); 
        return () => { if (!user) window.removeEventListener('scroll', handleScroll); };
    }, [user, bannerHeight]);

    // Fixed Infinite Loop: Extracted safely, depends ONLY on user.uid
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'attempts'), where('userId', '==', user.uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (isProcessingRef.current) return;
            const fetchedAttempts = snapshot.docs.map(doc => doc.data());
            setAttempts(fetchedAttempts);
            
            isProcessingRef.current = true;
            const userSnap = await getDoc(doc(db, 'users', user.uid));
            if (userSnap.exists()) {
                 await processUserData(user, userSnap.data(), fetchedAttempts);
            }
            isProcessingRef.current = false;
        });
        return unsubscribe;
    }, [user?.uid]);

    useEffect(() => {
        if (userData) {
            const hasSeenTooltip = localStorage.getItem('hasSeenStreakDiscoveryTooltip');
            if (!hasSeenTooltip && (userData.currentStreak || 0) < 3) {
                const timer = setTimeout(() => setShowDiscoveryTooltip(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [userData]);

    const handleCloseReward = async () => {
        if (!user?.uid) return;
        await updateDoc(doc(db, 'users', user.uid), { unseenReward: deleteField() });
    };

    const streakStatus = useMemo(() => {
        if (!userData) return STREAK_MESSAGES.NEW_USER;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const mostRecentCompletion = attempts.find(a => {
            const d = a.completedAt?.toDate() || new Date(); 
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });

        if (mostRecentCompletion) {
            return today.getDay() === 5 ? STREAK_MESSAGES.SAFE_FRIDAY : STREAK_MESSAGES.SAFE_TODAY;
        } else if (userData.currentStreak > 0) {
            return STREAK_MESSAGES.AT_RISK;
        } else {
            return STREAK_MESSAGES.BROKEN;
        }
    }, [userData, attempts]);

    const handleStreakClick = () => {
        setShowDiscoveryTooltip(false);
        localStorage.setItem('hasSeenStreakDiscoveryTooltip', 'true');
        navigate('streaks');
    };

    return (
        <>
            <AnimatePresence>
                {userData?.unseenReward && (
                    <RewardModal reward={userData.unseenReward} onClose={handleCloseReward} />
                )}
            </AnimatePresence>

            <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${user ? 'bg-slate-900 shadow-lg top-0' : scrolled ? 'bg-slate-900 shadow-lg top-0' : 'bg-transparent'}`}
                 style={{ top: scrolled || user ? '0px' : `${bannerHeight}px` }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`h-16 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
                        <span onClick={() => user ? navigate('home') : null}
                            className={`text-xl sm:text-2xl font-black tracking-wider ${user ? 'cursor-pointer' : ''} bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text animate-shine-pulse`}>
                            RDFC<span className="text-slate-400"> Test</span>
                        </span>
                        {user && userData && (
                            <div className="ml-4 flex items-center">
                                <div className="relative flex items-center mr-4 cursor-pointer group" onClick={handleStreakClick}>
                                    <motion.div animate={fireControls}><FaFire className={`w-5 h-5 mr-1.5 transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-slate-500' : 'text-orange-500'}`} /></motion.div>
                                    <motion.span key={userData.currentStreak || 0} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }} className={`font-extrabold text-lg transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-slate-300' : 'text-orange-400'}`}>{userData.currentStreak || 0}</motion.span>
                                    
                                    <div className="absolute top-full right-0 z-10 mt-3 w-56 p-4 text-sm text-white bg-slate-800 border border-slate-700 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none origin-top-right">
                                        <h4 className="font-bold text-base">{streakStatus.title}</h4>
                                        <p className="text-xs text-slate-400 mt-1 font-medium">{streakStatus.message}</p>
                                        <div className="absolute right-6 top-[-6px] w-3 h-3 rotate-45 bg-slate-800 border-t border-l border-slate-700"></div>
                                    </div>

                                    {showDiscoveryTooltip && (
                                        <div className="absolute top-full right-0 z-20 mt-3 w-56 p-4 text-sm text-white bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/30 transition-all duration-300 animate-bounce origin-top-right">
                                            <h4 className="font-bold">New Feature!</h4>
                                            <p className="text-xs text-blue-100 mt-1 font-medium">Click here to track your progress, achievements, and rewards!</p>
                                            <div className="absolute right-6 top-[-6px] w-3 h-3 rotate-45 bg-blue-600"></div>
                                        </div>
                                    )}
                                </div>
                                <img className="h-9 w-9 rounded-full border-2 border-slate-700" src={userData.photoURL} alt="User avatar" />
                                <button onClick={signOut} className="ml-4 bg-slate-800 text-slate-300 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">Sign Out</button>
                            </div>
                        )}
                    </div>
                </div>
                <style>{`@keyframes shine-pulse { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .animate-shine-pulse { background-size: 200% auto; animation: shine-pulse 4s linear infinite; }`}</style>
            </nav>
        </>
    );
};

export default Navbar;