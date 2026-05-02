import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { FaFire, FaCheckCircle, FaRegCircle, FaSnowflake, FaArrowLeft, FaTrophy, FaTimesCircle, FaCalendarCheck, FaShieldAlt } from 'react-icons/fa';
import { motion } from 'framer-motion';

// --- DYNAMIC CONFIGURATION ---
const ACHIEVEMENTS_CONFIG = [
    {
        id: 'streak-master',
        title: 'Streak Master',
        icon: FaFire,
        color: 'text-orange-400',
        description: (goal) => `Reach a ${goal}-day streak.`,
        valueKey: 'currentStreak',
        tiers: [
            { level: 'Bronze', goal: 7, reward: 'Profile Flair' },
            { level: 'Silver', goal: 14, reward: 'New Badge' },
            { level: 'Gold', goal: 30, reward: 'Epic Badge' }
        ]
    },
    {
        id: 'weekly-warrior',
        title: 'Weekly Warrior',
        icon: FaShieldAlt,
        color: 'text-green-400',
        description: (goal) => `Complete ${goal} perfect week(s).`,
        valueKey: 'streakWeeksClaimed',
        tiers: [
            { level: 'Bronze', goal: 1, reward: '+2 Freezes' },
            { level: 'Silver', goal: 4, reward: '+2 Freezes' },
            { level: 'Gold', goal: 12, reward: '+2 Freezes' }
        ]
    }
];

// --- Helper Components ---

const WeeklyProgress = ({ completionDates, currentStreak }) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIndex = today.getDay();

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    // Estimate streak start boundary to properly color "frozen" vs "missed"
    const streakStartDate = new Date(today);
    let effectiveStreak = currentStreak || 0;
    if (!completionDates.has(today.getTime()) && effectiveStreak > 0) {
         streakStartDate.setDate(streakStartDate.getDate() - effectiveStreak);
    } else {
         streakStartDate.setDate(streakStartDate.getDate() - effectiveStreak + 1);
    }

    return (
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] h-full border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-extrabold mb-8 text-white tracking-tight flex items-center gap-2">
                <FaCalendarCheck className="text-blue-400"/> This Week
            </h2>
            <div className="flex justify-between items-center text-center px-2">
                {days.map((dayLabel, index) => {
                    const d = new Date(startOfWeek);
                    d.setDate(d.getDate() + index);
                    const time = d.getTime();

                    let status = 'future';
                    if (time > today.getTime()) {
                        status = 'future';
                    } else if (completionDates.has(time)) {
                        status = 'completed';
                    } else if (time === today.getTime()) {
                        status = 'today-uncompleted';
                    } else if (time >= streakStartDate.getTime() && effectiveStreak > 0) {
                        status = 'frozen'; // Within active streak, but no test taken
                    } else {
                        status = 'missed'; // Before active streak or streak broke
                    }

                    let Icon, bgColor, ringColor;
                    if (status === 'completed') {
                        Icon = FaCheckCircle; bgColor = 'bg-orange-500'; ringColor = 'text-white';
                    } else if (status === 'frozen') {
                        Icon = FaSnowflake; bgColor = 'bg-blue-500'; ringColor = 'text-white';
                    } else if (status === 'missed') {
                        Icon = FaTimesCircle; bgColor = 'bg-slate-700'; ringColor = 'text-slate-500';
                    } else if (status === 'today-uncompleted') {
                        Icon = FaRegCircle; bgColor = 'bg-slate-700'; ringColor = 'text-slate-400';
                    } else {
                        Icon = FaRegCircle; bgColor = 'bg-slate-800'; ringColor = 'text-slate-600';
                    }

                    return (
                        <div key={index} className="flex flex-col items-center group">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 transform group-hover:scale-110 shadow-lg
                                ${bgColor} ${index === todayIndex ? 'ring-4 ring-orange-500/30' : ''}`}>
                                <Icon className={`${ringColor} text-lg sm:text-xl`} />
                            </div>
                            <span className={`mt-3 text-[11px] font-extrabold uppercase tracking-wider ${index === todayIndex ? 'text-orange-400' : 'text-slate-400'}`}>{dayLabel}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const StreakFreezeCard = ({ freezes }) => {
    return (
        <div className={`p-8 rounded-[2rem] text-white shadow-xl transition-all duration-500 h-full flex flex-col justify-center relative overflow-hidden ${freezes > 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700'}`}>
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex items-center">
                <div className={`p-3 rounded-2xl mr-5 ${freezes > 0 ? 'bg-white/10' : 'bg-slate-700/50'}`}>
                    <FaSnowflake className={`w-8 h-8 ${freezes > 0 ? 'text-white' : 'text-slate-500'}`} />
                </div>
                <div>
                    <h3 className="font-extrabold text-xl text-white">Streak Freezes</h3>
                    <p className={`text-sm font-medium mt-1 ${freezes > 0 ? 'text-blue-100 opacity-90' : 'text-slate-500'}`}>Consumed automatically on miss.</p>
                </div>
            </div>
            <div className="mt-8 relative z-10">
                <p className="text-4xl font-black tracking-tight">{freezes} <span className="text-lg font-bold opacity-80 uppercase tracking-widest ml-1">Available</span></p>
            </div>
        </div>
    );
};

const AchievementCard = ({ config, userData }) => {
    const currentValue = userData[config.valueKey] || 0;
    
    // Find the highest tier achieved
    let currentTierIndex = -1;
    for (let i = 0; i < config.tiers.length; i++) {
        if (currentValue >= config.tiers[i].goal) {
            currentTierIndex = i;
        } else {
            break;
        }
    }

    const nextTier = config.tiers[currentTierIndex + 1];
    const currentLevelName = currentTierIndex >= 0 ? config.tiers[currentTierIndex].level : 'Locked';
    const goal = nextTier ? nextTier.goal : config.tiers[config.tiers.length - 1].goal;

    return (
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 rounded-3xl flex flex-col h-full border border-slate-700/50 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-[0.03] rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
            
            <div className="flex items-center mb-5 relative z-10">
                <div className="p-3 bg-slate-700/50 rounded-xl mr-4 shadow-sm">
                    <config.icon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div>
                    <h3 className="font-extrabold text-lg text-white">{config.title}</h3>
                    <p className="text-sm font-bold text-slate-400 tracking-wider uppercase">{currentLevelName}</p>
                </div>
            </div>
            
            {nextTier ? (
                <div className="relative z-10 flex-grow flex flex-col">
                    <p className="text-sm text-slate-300 font-medium mb-4">{config.description(goal)}</p>
                    
                    <div className="w-full bg-slate-700 rounded-full h-3 mb-2 overflow-hidden shadow-inner">
                        <motion.div className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${(currentValue / goal) * 100}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    
                    <div className="text-right text-xs font-bold text-slate-400 uppercase tracking-widest">{currentValue} / {goal}</div>
                    
                    <div className="mt-auto pt-6 text-center">
                        <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-4 py-2 rounded-xl inline-block uppercase tracking-wider">Reward: {nextTier.reward}</span>
                    </div>
                </div>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-center relative z-10 py-4">
                    <div className="p-4 bg-amber-500/10 rounded-full mb-3 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                        <FaTrophy className="text-amber-400 text-4xl drop-shadow-lg" />
                    </div>
                    <p className="font-extrabold text-white text-lg tracking-wide uppercase">Maxed Out!</p>
                </div>
            )}
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
            const top5 = snapshot.docs.map((doc, index) => ({ id: doc.id, rank: index + 1, ...doc.data() }));
            setLeaders(top5);
            const userInTop5 = top5.find(leader => leader.id === currentUser.uid);
            if (userInTop5) { setIsUserInTop5(true); setUserRank(userInTop5.rank); } 
            else { setIsUserInTop5(false); setUserRank(null); }
        });
        return () => unsubscribe();
    }, [currentUser]);

    return (
        <div className="bg-slate-800/80 backdrop-blur-sm p-6 sm:p-8 rounded-[2rem] h-full border border-slate-700/50 shadow-xl">
            <h2 className="text-xl font-extrabold mb-6 text-white flex items-center tracking-tight">
                <FaTrophy className="text-amber-400 mr-3" /> Streak Leaders
            </h2>
            <div className="space-y-3">
                {leaders.map((leader, index) => (
                    <div key={leader.id} className={`flex items-center p-3 rounded-2xl transition-colors ${leader.id === currentUser.uid ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30 hover:bg-slate-700/50'}`}>
                        <span className={`font-black text-lg w-10 text-center ${index === 0 ? 'text-amber-400 drop-shadow-md' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-orange-400' : 'text-slate-500'}`}>{index + 1}</span>
                        <img src={leader.photoURL || 'https://placehold.co/32x32/7c3aed/ffffff?text=U'} alt={leader.displayName} className="w-10 h-10 rounded-full mr-4 shadow-sm border border-slate-600" />
                        <span className="text-sm font-bold text-slate-200 flex-grow truncate">{leader.displayName}</span>
                        <div className="flex items-center font-black text-orange-400 text-lg bg-orange-500/10 px-3 py-1 rounded-xl"><FaFire className="mr-1.5" />{leader.currentStreak || 0}</div>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
                {isUserInTop5 ? (
                    <h3 className="text-sm font-bold text-slate-300 bg-blue-500/10 inline-block px-4 py-2 rounded-xl">Your Rank is <span className="text-blue-400 text-base font-black">#{userRank}</span></h3>
                ) : (
                    <p className="text-xs font-semibold text-slate-400 leading-relaxed bg-slate-700/30 inline-block px-4 py-2 rounded-xl">Your streak is <span className="font-black text-orange-400">{currentUser.currentStreak || 0}</span>. Keep going!</p>
                )}
            </div>
        </div>
    );
};

// --- Main StreaksPage Component ---
const StreaksPage = ({ navigate }) => {
    const { user, userData } = useAuth();
    const [completionDates, setCompletionDates] = useState(new Set());

    useEffect(() => {
        if (!user?.uid) return;
        const q = query(collection(db, 'attempts'), where('userId', '==', user.uid), where('status', '==', 'completed'), orderBy('completedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const dates = new Set();
            snapshot.docs.forEach(doc => {
                const attempt = doc.data();
                if (attempt.completedAt) {
                    const d = attempt.completedAt.toDate();
                    d.setHours(0, 0, 0, 0);
                    dates.add(d.getTime());
                }
            });
            setCompletionDates(dates);
        });
        return () => unsubscribe();
    }, [user]);

    if (!userData) {
        return <div className="flex items-center justify-center h-screen bg-slate-900 text-slate-400 font-bold">Loading Progress...</div>;
    }
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto bg-slate-900 min-h-screen">
            <button onClick={() => navigate('home')} className="flex items-center text-slate-400 hover:text-white mb-8 font-bold text-sm transition-colors bg-slate-800 px-4 py-2 rounded-xl w-fit border border-slate-700 shadow-sm active:scale-95">
                <FaArrowLeft className="mr-2" />
                Dashboard
            </button>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="text-center mb-12">
                    <div className="inline-block bg-orange-500/10 p-5 rounded-[2rem] border border-orange-500/20 mb-6 shadow-lg shadow-orange-500/10">
                        <FaFire className="w-16 h-16 text-orange-500 drop-shadow-md" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">You're on a <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{userData.currentStreak || 0}-Day Streak!</span></h1>
                    <p className="text-slate-400 mt-4 max-w-lg mx-auto font-medium leading-relaxed">Keep the flame alive by completing a test every day. Every 7 days earns you +2 streak freezes!</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <WeeklyProgress completionDates={completionDates} currentStreak={userData.currentStreak || 0} />
                    <StreakFreezeCard freezes={userData.streakFreezes || 0} />
                </div>
                
                <div className="mb-12">
                    <StreakLeaderboard currentUser={userData} />
                </div>

                <h2 className="text-2xl font-extrabold text-white mb-6 tracking-tight">Your Milestones</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                    {ACHIEVEMENTS_CONFIG.map((config) => (
                        <AchievementCard 
                            key={config.id}
                            config={config}
                            userData={userData}
                        />
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default StreaksPage;