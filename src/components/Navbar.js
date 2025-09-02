import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaFire } from 'react-icons/fa';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, serverTimestamp, increment, writeBatch, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { motion, useAnimation } from 'framer-motion';
import Confetti from 'react-confetti';

// --- CONFIG ---
const ACHIEVEMENTS_CONFIG = {
    'streak-master': { tiers: [{ level: 'Bronze', goal: 7, reward: '+2 Freezes' }, { level: 'Silver', goal: 14, reward: 'New Badge' }, { level: 'Gold', goal: 30, reward: 'Profile Flair' }] },
    'perfect-week': { tiers: [{ level: 'Bronze', goal: 1, reward: '+1 Freeze' }, { level: 'Silver', goal: 2, reward: '+2 Freezes' }, { level: 'Gold', goal: 4, reward: 'Epic Badge' }] }
};
const STREAK_MESSAGES = {
    SAFE_TODAY: { title: "Streak Safe!", message: "You've completed a test today." },
    SAFE_FRIDAY: { title: "Streak Safe!", message: "Your streak is safe over the weekend!" },
    AT_RISK: { title: "Extend Your Streak!", message: "Complete a test today to keep your streak." },
    BROKEN: { title: "Streak Lost", message: "Complete a test to start a new one!" },
    NEW_USER: { title: "Start a Streak!", message: "Complete your first test to begin." }
};

// --- CORE LOGIC: Streak and Achievement Calculation ---
const processUserData = async (user, userData, attempts) => {
    if (!user || !userData || !attempts) return;

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const sortedCompletionTimestamps = [...new Set(attempts.map(a => {
        const d = a.completedAt.toDate(); d.setHours(0, 0, 0, 0); return d.getTime();
    }))].sort((a, b) => b - a);

    let calculatedStreak = 0;
    let freezeUsedThisStreak = false;
    let justCompletedPerfectWeek = false;

    // Recalculate streak from scratch based on completion dates
    if (sortedCompletionTimestamps.length > 0) {
        const mostRecent = new Date(sortedCompletionTimestamps[0]); mostRecent.setHours(0, 0, 0, 0);
        let lastDate = mostRecent;
        calculatedStreak = 1;

        for (let i = 1; i < sortedCompletionTimestamps.length; i++) {
            const currentDate = new Date(sortedCompletionTimestamps[i]);
            currentDate.setHours(0, 0, 0, 0);

            const expectedPrev = new Date(lastDate);
            expectedPrev.setDate(lastDate.getDate() - 1);

            if (currentDate.getTime() === expectedPrev.getTime()) {
                calculatedStreak++;
                lastDate = currentDate;
            } else {
                const expectedPrevWithFreeze = new Date(lastDate);
                expectedPrevWithFreeze.setDate(lastDate.getDate() - 2);

                if (currentDate.getTime() === expectedPrevWithFreeze.getTime() && (userData.streakFreezes || 0) > 0) {
                    calculatedStreak += 2;
                    freezeUsedThisStreak = true;
                    lastDate = currentDate;
                } else {
                    break;
                }
            }
        }
    }

    const updates = { currentStreak: calculatedStreak };
    if (freezeUsedThisStreak) {
        updates.streakFreezes = increment(-1);
        updates.lastFreezeUsed = serverTimestamp();
    }

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const uniqueDaysThisWeek = new Set(sortedCompletionTimestamps.filter(ts => ts >= startOfWeek.getTime()).map(ts => new Date(ts).getDay()));
    
    // Check for a perfect week achievement
    if (uniqueDaysThisWeek.size === 7) {
        const lastPerfectWeekDate = userData.achievements?.['perfect-week']?.lastAwarded?.toDate();
        
        const wasFreezeUsedThisWeek = userData.lastFreezeUsed?.toDate() >= startOfWeek;

        if (!wasFreezeUsedThisWeek && (!lastPerfectWeekDate || lastPerfectWeekDate.getTime() < startOfWeek.getTime())) {
            updates['achievements.perfect-week.progress'] = increment(1);
            updates['achievements.perfect-week.lastAwarded'] = serverTimestamp();
            justCompletedPerfectWeek = true;

            updates.streakFreezes = increment(2);
        }
    }

    // Check for achievement progression
    for (const [id, config] of Object.entries(ACHIEVEMENTS_CONFIG)) {
        const currentProgress = id === 'streak-master' ? calculatedStreak : (userData.achievements?.[id]?.progress || 0) + (justCompletedPerfectWeek && id === 'perfect-week' ? 1 : 0);
        const userLevelIndex = config.tiers.findIndex(t => t.level === (userData.achievements?.[id]?.level || 'Locked'));
        const nextTier = config.tiers[userLevelIndex + 1];

        if (nextTier && currentProgress >= nextTier.goal) {
            updates[`achievements.${id}.level`] = nextTier.level;
            if (id === 'streak-master' && nextTier.reward.includes('Freezes')) {
                const freezesToAdd = parseInt(nextTier.reward.match(/\d+/)[0]);
                updates.streakFreezes = increment(freezesToAdd);
            }
        }
    }

    if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updates);
    }
};

const Navbar = ({ navigate, bannerHeight = 0 }) => {
    const { user, userData, signOut } = useAuth();
    const [attempts, setAttempts] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showDiscoveryTooltip, setShowDiscoveryTooltip] = useState(false);
    const fireControls = useAnimation();
    const [scrolled, setScrolled] = useState(false);

    // Re-implemented scroll behavior to match the requested design.
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
        } else {
            setScrolled(true); 
        }

        return () => {
            if (!user) {
                window.removeEventListener('scroll', handleScroll);
            }
        };
    }, [user, bannerHeight]);

    // Grant 3 initial freezes if not already set
    useEffect(() => {
        const grantInitialFreezes = async () => {
            if (user && userData && userData.streakFreezes === undefined) {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, { streakFreezes: 3 });
                console.log("Granted 3 initial streak freezes to new/existing user.");
            }
        };
        grantInitialFreezes();
    }, [user, userData]);

    // Listen for changes to attempts to trigger streak calculation
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'attempts'), where('userId', '==', user.uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const fetchedAttempts = snapshot.docs.map(doc => doc.data());
            setAttempts(fetchedAttempts);
            if (userData) {
                 await processUserData(user, userData, fetchedAttempts);
            }
        }, (error) => console.error("Error fetching attempts:", error));
        return unsubscribe;
    }, [user, userData]);

    // Trigger confetti on achievement level-up
    useEffect(() => {
        const checkAchievements = async () => {
            // FIX: Ensure user and achievements exist before proceeding.
            // This prevents a crash on logout when the 'user' object becomes null.
            if (!user || !userData?.achievements) return;

            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) return; // Also corrected .exists to .exists()

            const previousAchievements = userSnap.data().achievements || {};

            for (const id in ACHIEVEMENTS_CONFIG) {
                const currentLevel = userData.achievements[id]?.level;
                const previousLevel = previousAchievements[id]?.level;
                if (currentLevel && currentLevel !== previousLevel) {
                    setShowConfetti(true);
                    break;
                }
            }
        };
        checkAchievements();
    }, [user, userData]); // FIX: Added 'user' to the dependency array

    // Show discovery tooltip for new users
    useEffect(() => {
        if (userData) {
            const hasSeenTooltip = localStorage.getItem('hasSeenStreakDiscoveryTooltip');
            if (!hasSeenTooltip && (userData.currentStreak || 0) < 3) {
                const timer = setTimeout(() => setShowDiscoveryTooltip(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [userData]);

    const streakStatus = useMemo(() => {
        if (!userData) return STREAK_MESSAGES.NEW_USER;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const mostRecentCompletion = attempts.find(a => {
            const d = a.completedAt.toDate(); d.setHours(0, 0, 0, 0);
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
            {showConfetti && <Confetti recycle={false} numberOfPieces={400} onConfettiComplete={() => setShowConfetti(false)} style={{ zIndex: 100 }} />}
            <nav className={`fixed left-0 right-0 z-50 transition-all duration-300 ${user ? 'bg-gray-800 shadow-lg top-0' : scrolled ? 'bg-gray-800 shadow-lg top-0' : 'bg-transparent'}`}
                 style={{ top: scrolled || user ? '0px' : `${bannerHeight}px` }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className={`h-16 flex items-center ${user ? 'justify-between' : 'justify-center'}`}>
                        <span onClick={() => user ? navigate('home') : null}
                            className={`text-xl sm:text-2xl font-bold tracking-wider ${user ? 'cursor-pointer' : ''} bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text animate-shine-pulse`}>
                            RDFC<span className="text-gray-400"> Test</span>
                        </span>
                        {user && userData && (
                            <div className="ml-4 flex items-center">
                                <div className="relative flex items-center mr-3 cursor-pointer group" onClick={handleStreakClick}>
                                    <motion.div animate={fireControls}><FaFire className={`w-5 h-5 mr-1 transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-gray-400' : 'text-orange-400'}`} /></motion.div>
                                    <motion.span key={userData.currentStreak || 0} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }} className={`font-semibold text-lg transition-colors ${streakStatus === STREAK_MESSAGES.AT_RISK ? 'text-gray-300' : 'text-orange-400'}`}>{userData.currentStreak || 0}</motion.span>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 z-10 mt-2 w-64 p-3 text-sm text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none">
                                        <h4 className="font-bold text-base">{streakStatus.title}</h4><p className="text-xs text-gray-300 mt-1">{streakStatus.message}</p>
                                        <div className="absolute left-1/2 -translate-x-1/2 top-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-gray-900"></div>
                                    </div>
                                    {showDiscoveryTooltip && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 z-20 mt-2 w-64 p-3 text-sm text-white bg-blue-600 rounded-lg shadow-lg transition-all duration-300 animate-bounce">
                                            <h4 className="font-bold">New Feature!</h4>
                                            <p className="text-xs text-blue-100 mt-1">Click here to track your progress, achievements, and rewards!</p>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-[-4px] w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-blue-600"></div>
                                        </div>
                                    )}
                                </div>
                                <img className="h-8 w-8 rounded-full" src={userData.photoURL} alt="User avatar" />
                                <button onClick={signOut} className="ml-4 bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-600">Sign Out</button>
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