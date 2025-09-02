import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { FaFire, FaCheckCircle, FaRegCircle, FaSnowflake, FaArrowLeft, FaGift, FaTrophy, FaShieldAlt, FaStar } from 'react-icons/fa';
import { motion } from 'framer-motion';

// --- CONFIGURATION for Achievements ---
const ACHIEVEMENTS_CONFIG = {
    'streak-master': {
        title: 'Streak Master',
        icon: FaFire,
        color: 'text-orange-400',
        description: (goal) => `Reach a ${goal}-day streak to unlock.`,
        tiers: [
            { level: 'Bronze', goal: 7, reward: '+2 Freezes' },
            { level: 'Silver', goal: 14, reward: 'New Badge' },
            { level: 'Gold', goal: 30, reward: 'Profile Flair' },
        ],
    },
    'perfect-week': {
        title: 'Perfect Week',
        icon: FaShieldAlt,
        color: 'text-green-400',
        description: (goal) => `Complete a test without skipping a day for ${goal} full week(s).`,
        tiers: [
            { level: 'Bronze', goal: 1, reward: '+1 Freeze' },
            { level: 'Silver', goal: 2, reward: '+2 Freezes' },
            { level: 'Gold', goal: 4, reward: 'Epic Badge' },
        ],
    },
};

// --- Helper Components ---

const WeeklyProgress = ({ completedDays, frozenDay }) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const todayIndex = new Date().getDay();
    return (
        <div className="bg-gray-800 p-6 rounded-2xl h-full">
            <h2 className="text-xl font-bold mb-4 text-white">This Week's Progress</h2>
            <div className="flex justify-between items-center text-center">
                {days.map((day, index) => {
                    const isCompleted = completedDays.includes(index);
                    const isFrozen = frozenDay === index;
                    return (
                        <div key={index} className="flex flex-col items-center">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300
                                ${isFrozen ? 'bg-blue-400' : isCompleted ? 'bg-orange-500' : 'bg-gray-700'}
                                ${index === todayIndex ? 'ring-2 ring-blue-400' : ''}`}>
                                {isFrozen ? <FaSnowflake className="text-white text-sm sm:text-base" /> :
                                 isCompleted ? <FaCheckCircle className="text-white text-sm sm:text-base" /> :
                                 <FaRegCircle className="text-gray-500 text-sm sm:text-base" />}
                            </div>
                            <span className={`mt-2 text-xs font-semibold ${index === todayIndex ? 'text-blue-400' : 'text-gray-400'}`}>{day}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StreakFreezeCard = ({ freezes, lastFreezeUsed }) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
    const isFreezeActive = lastFreezeUsed && lastFreezeUsed.toDate().setHours(0, 0, 0, 0) === yesterday.getTime();
    
    return (
        <div className={`p-6 rounded-2xl text-white shadow-lg transition-all duration-300 h-full flex flex-col justify-center ${isFreezeActive ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
            <div className="flex items-center">
                <FaSnowflake className="w-8 h-8 mr-4" />
                <div>
                    <h3 className="font-bold text-lg">Streak Freeze</h3>
                    <p className="text-sm opacity-90">{isFreezeActive ? "Your streak is protected today!" : "Consumed automatically on a missed day."}</p>
                </div>
            </div>
            <div className="mt-4 text-center">
                <p className="text-2xl font-bold">{freezes} Available</p>
            </div>
        </div>
    );
};

const AchievementCard = ({ id, config, userAchievements, currentStreak }) => {
    const userProgress = userAchievements[id] || { level: 'Locked', progress: 0 };
    const currentTierIndex = config.tiers.findIndex(t => t.level === userProgress.level);
    const nextTier = config.tiers[currentTierIndex + 1];

    let displayProgress = id === 'streak-master' ? currentStreak : (userProgress.progress || 0);
    let goal = nextTier ? nextTier.goal : 0;

    return (
        <div className="bg-gray-800 p-5 rounded-2xl flex flex-col h-full">
            <div className="flex items-center mb-3"><config.icon className={`w-8 h-8 mr-3 ${config.color}`} /><div><h3 className="font-bold text-lg text-white">{config.title}</h3><p className="text-sm text-gray-400">{nextTier ? nextTier.level : 'Maxed Out!'}</p></div></div>
            {nextTier ? (<><p className="text-xs text-gray-400 mb-2">{config.description(goal)}</p><div className="w-full bg-gray-700 rounded-full h-2.5 mb-1"><motion.div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full" initial={{ width: 0 }} animate={{ width: `${(displayProgress / goal) * 100}%` }} transition={{ duration: 0.8 }} /></div><div className="text-right text-xs font-semibold text-gray-300">{displayProgress} / {goal}</div><div className="mt-auto pt-3 text-center text-xs bg-green-500/20 text-green-300 font-bold px-3 py-1 rounded-full inline-block self-center">Reward: {nextTier.reward}</div></>) : (<div className="flex-grow flex flex-col items-center justify-center text-center"><FaStar className="text-amber-400 text-5xl mb-2" /><p className="font-bold text-white">Achievement Complete!</p></div>)}
        </div>
    );
};

const StreakLeaderboard = ({ currentUser }) => {
    const [leaders, setLeaders] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [isUserInTop5, setIsUserInTop5] = useState(false);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const q = query(collection(db, 'users'), orderBy('currentStreak', 'desc'), limit(5));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const top5 = snapshot.docs.map((doc, index) => ({ 
                id: doc.id, 
                rank: index + 1,
                ...doc.data() 
            }));
            
            setLeaders(top5);

            const userInTop5 = top5.find(leader => leader.id === currentUser.uid);

            if (userInTop5) {
                setIsUserInTop5(true);
                setUserRank(userInTop5.rank);
            } else {
                setIsUserInTop5(false);
                setUserRank(null);
            }
        }, (error) => {
            console.error("Error fetching leaderboard:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    return (
        <div className="bg-gray-800 p-6 rounded-2xl h-full">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center"><FaTrophy className="text-amber-400 mr-3" /> Streak Leaders</h2>
            <div className="space-y-3">
                {leaders.map((leader, index) => (
                    <div key={leader.id} className={`flex items-center p-2 rounded-lg ${leader.id === currentUser.uid ? 'bg-blue-500/30' : 'bg-gray-700/50'}`}>
                        <span className="font-bold text-lg w-8 text-center">{index + 1}</span>
                        <img src={leader.photoURL || 'https://placehold.co/32x32/7c3aed/ffffff?text=U'} alt={leader.displayName} className="w-8 h-8 rounded-full mr-3" />
                        <span className="text-sm font-semibold flex-grow truncate">{leader.displayName}</span>
                        <div className="flex items-center font-bold text-orange-400"><FaFire className="mr-1" />{leader.currentStreak || 0}</div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
                {isUserInTop5 ? (
                    <h3 className="text-md font-bold text-white">Your Rank is <span className="text-blue-400">#{userRank}</span></h3>
                ) : (
                    <p className="text-sm text-gray-400">Your current streak is <span className="font-bold text-orange-400">{currentUser.currentStreak || 0}</span>. Keep going to make the leaderboard!</p>
                )}
            </div>
        </div>
    );
};

// --- Main StreaksPage Component ---
const StreaksPage = ({ navigate }) => {
    const { user, userData } = useAuth();
    const [completedDays, setCompletedDays] = useState([]);

    useEffect(() => {
        if (!user?.uid) return;
        
        // This query fetches the user's completed tests to display checkmarks for the current week.
        const q = query(collection(db, 'attempts'), where('userId', '==', user.uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            
            const thisWeekCompletions = new Set();
            snapshot.docs.forEach(doc => {
                const attempt = doc.data();
                if (attempt.completedAt) {
                    const completionDate = attempt.completedAt.toDate();
                    if (completionDate >= startOfWeek) { thisWeekCompletions.add(completionDate.getDay()); }
                }
            });
            setCompletedDays(Array.from(thisWeekCompletions));
        });
        return () => unsubscribe();
    }, [user]);

    if (!userData) {
        return <div className="text-center p-10">Loading...</div>;
    }
    
    // Determine which day a streak freeze was used, if it was used this week.
    let lastFreezeUsedDayThisWeek = null;
    if (userData.lastFreezeUsed) {
        const lastFreezeDate = userData.lastFreezeUsed.toDate();
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        // Check if the freeze was used on or after the start of this week to display it correctly.
        if (lastFreezeDate >= startOfWeek) {
            lastFreezeUsedDayThisWeek = lastFreezeDate.getDay();
        }
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <button onClick={() => navigate('home')} className="flex items-center text-blue-400 hover:text-blue-300 mb-6 font-semibold">
                <FaArrowLeft className="mr-2" />
                Back to Dashboard
            </button>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="text-center mb-10">
                    <div className="inline-block bg-gray-800 p-4 rounded-full mb-4">
                        <FaFire className="w-16 h-16 text-orange-500" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-white">You're on a <span className="text-orange-400">{userData.currentStreak || 0}-day streak!</span></h1>
                    <p className="text-gray-400 mt-2 max-w-md mx-auto">Keep the flame alive by completing a test every day. Your progress is paying off!</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <WeeklyProgress completedDays={completedDays} frozenDay={lastFreezeUsedDayThisWeek} />
                    <StreakFreezeCard freezes={userData.streakFreezes || 0} lastFreezeUsed={userData.lastFreezeUsed} />
                </div>
                
                <div className="mb-6">
                    <StreakLeaderboard currentUser={userData} />
                </div>

                <h2 className="text-2xl font-bold text-white mb-6 mt-10">Your Achievements</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(ACHIEVEMENTS_CONFIG).map(([id, config]) => (
                        <AchievementCard 
                            key={id}
                            id={id}
                            config={config}
                            userAchievements={userData.achievements || {}}
                            currentStreak={userData.currentStreak || 0}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default StreaksPage;