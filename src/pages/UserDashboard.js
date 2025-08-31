import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot, updateDoc, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import FeedbackForm from '../components/FeedbackForm';
import { motion, AnimatePresence } from 'framer-motion';
// --- ICONS ---
import { FaEye, FaLock, FaPlay, FaCheckCircle, FaHourglassHalf, FaBookOpen, FaCrown, FaTachometerAlt, FaVial, FaCommentDots, FaHeadset, FaChevronDown, FaArrowRight, FaChartLine, FaBullseye, FaStar, FaTrophy, FaBolt, FaCalendarAlt, FaChartPie, FaArrowUp } from 'react-icons/fa';
// --- CHARTING LIBRARY ---
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- (NEW) STYLED WIDGETS AND HELPERS ---

const CountdownTimer = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            timeLeft = {
                DAYS: Math.floor(difference / (1000 * 60 * 60 * 24)),
                HOURS: Math.floor((difference / (1000 * 60 * 60)) % 24),
                MINUTES: Math.floor((difference / 1000 / 60) % 60),
                SECONDS: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (!Object.keys(newTimeLeft).length && onComplete) { onComplete(); }
        }, 1000);
        return () => clearTimeout(timer);
    });

    if (!Object.keys(timeLeft).length) {
        return <div className="text-center font-semibold text-green-400">Live Now</div>;
    }
    
    return (
        <div className="grid grid-cols-4 gap-1 text-white" style={{width: '180px'}}>
            {Object.entries(timeLeft).map(([interval, value]) => (
                <div key={interval} className="flex flex-col items-center justify-center bg-gray-700/50 p-1 rounded">
                    <span className="font-mono text-lg font-bold text-cyan-300">{String(value).padStart(2, '0')}</span>
                    <span className="text-xs opacity-70" style={{fontSize: '0.6rem'}}>{interval}</span>
                </div>
            ))}
        </div>
    );
};


const ExamCountdownWidget = ({ title, targetDate }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const difference = new Date(targetDate) - now;
            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60)
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                clearInterval(interval);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate]);

    const TimeBlock = ({ value, label, colorClass }) => (
        <div className={`flex flex-col items-center justify-center ${colorClass} p-3 rounded-lg w-full h-20 text-white shadow-inner`}>
            <span className="text-2xl md:text-3xl font-bold font-mono">{String(value).padStart(2, '0')}</span>
            <span className="text-xs uppercase tracking-wider">{label}</span>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 md:p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col items-center justify-center h-full">
            <h3 className="text-lg font-bold text-cyan-300 mb-4">{title}</h3>
            <div className="grid grid-cols-4 gap-2 md:gap-4 w-full">
                <TimeBlock value={timeLeft.days} label="Days" colorClass="bg-red-500/30" />
                <TimeBlock value={timeLeft.hours} label="Hours" colorClass="bg-blue-500/30" />
                <TimeBlock value={timeLeft.minutes} label="Mins" colorClass="bg-green-500/30" />
                <TimeBlock value={timeLeft.seconds} label="Secs" colorClass="bg-yellow-500/30" />
            </div>
        </div>
    );
};

const VocabCardWidget = () => {
    const [vocabList, setVocabList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wordIndex, setWordIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    useEffect(() => {
        const fetchActiveVocab = async () => {
            setLoading(true);
            try {
                const activeListQuery = query(collection(db, 'vocabLists'), where('isActive', '==', true), limit(1));
                const activeListSnapshot = await getDocs(activeListQuery);

                if (!activeListSnapshot.empty) {
                    const activeList = activeListSnapshot.docs[0];
                    const wordsQuery = query(collection(db, 'vocabLists', activeList.id, 'words'), orderBy('createdAt', 'asc'));
                    const wordsSnapshot = await getDocs(wordsQuery);
                    const words = wordsSnapshot.docs.map(doc => doc.data());

                    if (words.length > 0) {
                        setVocabList(words);
                        const day = new Date().getDate();
                        setWordIndex(day % words.length);
                    }
                }
            } catch (error) {
                console.error("Error fetching vocab list:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchActiveVocab();
    }, []);
    
    if (loading) {
        return <div className="bg-gray-800 p-6 rounded-lg flex items-center justify-center h-full"><p>Loading Vocab...</p></div>
    }
    
    if (vocabList.length === 0) {
        return (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-6 rounded-lg flex flex-col items-center justify-center h-full text-center">
                 <h3 className="text-lg font-bold text-purple-300 mb-2">Vocab Card of the Day</h3>
                 <p className="text-gray-400">No active wordlist set by admin.</p>
            </div>
        );
    }

    const currentWord = vocabList[wordIndex];
    const difficultyColors = { Hard: 'bg-red-500', Medium: 'bg-yellow-500', Easy: 'bg-green-500' };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-4 md:p-6 rounded-lg shadow-lg border border-gray-700 flex flex-col h-full">
            <h3 className="text-lg font-bold text-purple-300 mb-4 text-center">Vocab Card of the Day</h3>
            <div className="flex-grow flex items-center justify-center cursor-pointer" style={{ perspective: '1000px' }} onClick={() => setIsFlipped(!isFlipped)}>
                <motion.div
                    className="relative w-full h-40"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center p-4 text-center shadow-lg" style={{ backfaceVisibility: 'hidden' }}>
                        <h2 className="text-3xl font-bold text-white">{currentWord.word}</h2>
                    </div>
                    <div className="absolute w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg p-4 flex flex-col justify-center text-center shadow-lg" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                        <p className="font-semibold text-white text-lg">{currentWord.meaning}</p>
                        <p className="text-sm text-gray-300 italic mt-2">"{currentWord.example}"</p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${difficultyColors[currentWord.difficulty] || 'bg-gray-500'}`}>{currentWord.difficulty}</span>
                            {currentWord.tags?.slice(0, 2).map(tag => <span key={tag} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{tag}</span>)}
                        </div>
                    </div>
                </motion.div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">Click card to flip</p>
        </div>
    );
};

// --- CUSTOM HOOKS ---

const useManagedTabs = () => {
    const [managedTabs, setManagedTabs] = useState([]);
    useEffect(() => {
        const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
        const unsubscribe = onSnapshot(tabsQuery, (snapshot) => {
            const tabs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setManagedTabs(tabs);
        });
        return () => unsubscribe();
    }, []);
    return managedTabs;
};


const useMasterData = () => {
    const [masterData, setMasterData] = useState({ allTests: [], linkedMaterials: {}, loading: true });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const articlesQuery = collection(db, 'rdfcArticles');

                const [testsSnapshot, articlesSnapshot] = await Promise.all([
                    getDocs(testsQuery),
                    getDocs(articlesQuery)
                ]);

                const fetchedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const fetchedMaterials = {};
                articlesSnapshot.forEach(doc => { fetchedMaterials[doc.id] = doc.data(); });
                
                setMasterData({ allTests: fetchedTests, linkedMaterials: fetchedMaterials, loading: false });
            } catch (error) {
                console.error("Error fetching master data:", error);
                setMasterData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchData();
    }, []);

    return masterData;
};

const useUserStatus = (uid) => {
    const [userStatus, setUserStatus] = useState(null);
    useEffect(() => {
        if (!uid) {
            setUserStatus(null);
            return;
        }
        const userDocRef = doc(db, 'users', uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });
        return () => unsubscribe();
    }, [uid]);
    return userStatus;
};

const useUserAttempts = (uid) => {
    const [userAttempts, setUserAttempts] = useState({});
    useEffect(() => {
        if (!uid) {
            setUserAttempts({});
            return;
        }
        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", uid));
        const unsubscribe = onSnapshot(attemptsQuery, (snapshot) => {
            const attemptsMap = {};
            snapshot.forEach((doc) => {
                const data = doc.data();
                attemptsMap[data.testId] = { id: doc.id, status: data.status };
            });
            setUserAttempts(attemptsMap);
        });
        return () => unsubscribe();
    }, [uid]);
    return userAttempts;
};

const usePerformanceData = (uid, allTests, linkedMaterials, managedTabs) => {
    const [data, setData] = useState({ loading: true, overall: null, byType: {} });

    useEffect(() => {
        if (!uid || !allTests || allTests.length === 0 || !linkedMaterials || !managedTabs || managedTabs.length === 0) {
            setData({ loading: false, overall: null, byType: {} });
            return;
        }

        const fetchData = async () => {
            setData({ loading: true, overall: null, byType: {} });
            try {
                const userAttemptsQuery = query(collection(db, 'attempts'), where('userId', '==', uid), where('status', '==', 'completed'));
                const userAttemptsSnap = await getDocs(userAttemptsQuery);
                const userAttemptsData = userAttemptsSnap.docs.map(doc => doc.data());

                const testInfoMap = allTests.reduce((acc, test) => {
                    acc[test.id] = test;
                    return acc;
                }, {});

                const byType = {};
                const overallScoreHistory = [];

                userAttemptsData.forEach(attempt => {
                    const test = testInfoMap[attempt.testId];
                    if (!test) return;

                    let category = test.mainType;
                    if (!category) {
                         const oldType = test.type?.toUpperCase();
                         if (linkedMaterials[test.id]) {
                             category = 'RDFC';
                         } else if (oldType === 'MOCK') {
                             category = 'Mocks';
                         } else if (oldType === 'SECTIONAL') {
                             category = 'Sectionals';
                         } else if (oldType === '10MIN') {
                             category = '10 Min RC';
                         } else {
                             const foundTab = managedTabs.find(t => t.name.toUpperCase().includes(oldType || ''))
                             category = foundTab ? foundTab.name : 'Add-Ons';
                         }
                    }

                    if (!byType[category]) {
                        byType[category] = { scores: [], totalScore: 0, count: 0, scoreHistory: [] };
                    }
                    const score = typeof attempt.totalScore === 'number' ? attempt.totalScore : 0;
                    byType[category].scores.push(score);
                    byType[category].totalScore += score;
                    byType[category].count += 1;

                    const scoreEntry = {
                        name: test.title, 
                        score, 
                        date: attempt.completedAt?.toDate().toLocaleDateString()
                    };
                    byType[category].scoreHistory.push(scoreEntry);
                    overallScoreHistory.push(scoreEntry);
                });

                Object.keys(byType).forEach(type => {
                    const d = byType[type];
                    d.metrics = {
                        testsCompleted: d.count,
                        avgScore: d.count > 0 ? (d.totalScore / d.count).toFixed(1) : 0,
                        bestScore: d.scores.length > 0 ? Math.max(...d.scores) : 0,
                    };
                });

                const allAttemptsQuery = query(collection(db, 'attempts'), where('status', '==', 'completed'));
                const allAttemptsSnapshot = await getDocs(allAttemptsQuery);
                const allAttempts = allAttemptsSnapshot.docs.map(doc => doc.data());
                const userScores = {};
                allAttempts.forEach(attempt => {
                    const score = typeof attempt.totalScore === 'number' ? attempt.totalScore : 0;
                    if (!userScores[attempt.userId]) userScores[attempt.userId] = { totalScore: 0, count: 0, scores: [] };
                    userScores[attempt.userId].totalScore += score;
                    userScores[attempt.userId].count += 1;
                    userScores[attempt.userId].scores.push(score);
                });
                const rankedUsers = Object.entries(userScores).map(([userId, data]) => ({ userId, totalScore: data.totalScore, testCount: data.count })).sort((a, b) => b.totalScore - a.totalScore);
                const currentUserIndex = rankedUsers.findIndex(user => user.userId === uid);
                const top10Users = rankedUsers.slice(0, 10);
                const userIdsToFetch = [...new Set(top10Users.map(u => u.userId).concat(uid))];
                const userDocs = await Promise.all(userIdsToFetch.map(id => getDoc(doc(db, 'users', id))));
                const usersMap = userDocs.reduce((acc, userDoc) => {
                    if (userDoc.exists()) acc[userDoc.id] = userDoc.data().displayName || 'Anonymous';
                    return acc;
                }, {});
                const leaderboard = top10Users.map((user, index) => ({ name: usersMap[user.userId] || 'Anonymous', score: user.totalScore, rank: index + 1, userId: user.userId }));
                const currentUserEntry = currentUserIndex !== -1 ? { name: usersMap[uid], score: rankedUsers[currentUserIndex].totalScore, rank: currentUserIndex + 1, userId: uid } : null;

                setData({
                    loading: false,
                    byType,
                    overall: {
                        metrics: {
                            testsCompleted: userAttemptsData.length,
                            avgScore: userScores[uid] ? (userScores[uid].totalScore / userScores[uid].count).toFixed(1) : 0,
                            bestScore: userScores[uid] && userScores[uid].scores.length > 0 ? Math.max(...userScores[uid].scores) : 0
                        },
                        leaderboard,
                        currentUserEntry,
                        scoreHistory: overallScoreHistory
                    }
                });

            } catch (error) {
                console.error("Error fetching performance data:", error);
                setData({ loading: false, overall: null, byType: {} });
            }
        };

        fetchData();
    }, [uid, allTests, linkedMaterials, managedTabs]);

    return data;
}

// --- MAIN DASHBOARD COMPONENT ---

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [liveTests, setLiveTests] = useState({});
    const [showFeedbackThanks, setShowFeedbackThanks] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeSubTab, setActiveSubTab] = useState(null);
    const [openAccordion, setOpenAccordion] = useState(null);

    const managedTabs = useManagedTabs();
    const { allTests, linkedMaterials, loading: masterDataLoading } = useMasterData();
    const userStatus = useUserStatus(userData?.uid);
    const userAttempts = useUserAttempts(userData?.uid);
    const performanceData = usePerformanceData(userData?.uid, allTests, linkedMaterials, managedTabs);

    const getTestCategory = (test) => {
        if (test.mainType) {
            return { main: test.mainType, sub: test.subType || null };
        }
        if (linkedMaterials[test.id]) return { main: 'RDFC', sub: null };
        const oldType = test.type?.toUpperCase();
        if (oldType === 'MOCK') return { main: 'Mocks', sub: null };
        if (oldType === 'SECTIONAL') return { main: 'Sectionals', sub: null };
        if (oldType === '10MIN') return { main: '10 Min RC', sub: null };
        const foundTab = managedTabs.find(t => t.name.toUpperCase().includes(oldType || ''));
        return { main: foundTab ? foundTab.name : 'Add-Ons', sub: null };
    };

    const testsByTab = useMemo(() => {
        if (!allTests || !managedTabs?.length) return {};
        
        const grouped = managedTabs.reduce((acc, tab) => {
            acc[tab.name] = { id: tab.id, tests: [], subTabs: {} };
            if (tab.subTabs) {
                tab.subTabs.forEach(sub => acc[tab.name].subTabs[sub.name] = { tests: [] });
            }
            return acc;
        }, {});

        allTests.forEach(test => {
            const { main, sub } = getTestCategory(test);
            if (grouped[main]) {
                if (sub && grouped[main].subTabs[sub]) {
                    grouped[main].subTabs[sub].tests.push(test);
                } else {
                    grouped[main].tests.push(test);
                }
            }
        });
        
        const sortFn = (a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        };
        
        Object.values(grouped).forEach(tabData => {
            tabData.tests.sort(sortFn);
            Object.values(tabData.subTabs).forEach(subTabData => subTabData.tests.sort(sortFn));
        });

        return grouped;
    }, [allTests, managedTabs, linkedMaterials]);

    const visibleTabs = useMemo(() => managedTabs.filter(tab => {
        const tabData = testsByTab[tab.name];
        if (!tabData) return false;
        const hasMainTests = tabData.tests.length > 0;
        const hasSubTabTests = Object.values(tabData.subTabs).some(sub => sub.tests.length > 0);
        return hasMainTests || hasSubTabTests;
    }), [managedTabs, testsByTab]);
    
    useEffect(() => {
      setActiveSubTab(null);
    }, [activeTab]);

    const updateLiveTests = (testId) => {
        setLiveTests(prev => ({...prev, [testId]: true}));
    };
    
    useEffect(() => {
        const checkLiveStatus = () => {
            const now = new Date().getTime();
            const newLiveTests = {};
            allTests.forEach(test => {
                if (test.liveAt?.toDate().getTime() <= now) {
                    newLiveTests[test.id] = true;
                }
            });
            setLiveTests(newLiveTests);
        };
        const interval = setInterval(checkLiveStatus, 1000 * 60);
        checkLiveStatus();
        return () => clearInterval(interval);
    }, [allTests]);

    const loading = masterDataLoading || !userStatus || managedTabs.length === 0;

    const handleViewMaterial = async (materialUrl, testId) => {
        if (!userData?.uid) return;
        try {
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, { [`readArticles.${testId}`]: true });
            navigate('rdfcArticleViewer', { articleUrl: materialUrl, testId: testId });
        } catch (error) {
            console.error("Error marking material as read:", error);
        }
    };

    const getIsLocked = (test) => {
        if (test.isFree) return false;
        if (!userStatus?.isSubscribed) return true;
        
        const access = userStatus.accessControl;
        if (!access) return true;
        
        const { main, sub } = getTestCategory(test);
        let requiredPermissionKey = sub ? `${main}/${sub}` : main;

        if (access.validityMap && access.validityMap[requiredPermissionKey]) {
            const expiry = access.validityMap[requiredPermissionKey];
            if (expiry && expiry.toDate() > new Date()) return false;
        }

        const hasOverallAccess = userStatus.expiryDate ? userStatus.expiryDate.toDate() > new Date() : true;
        if (!hasOverallAccess) return true;

        if (access[requiredPermissionKey] === true) return false;

        const oldKeyMap = {
            'RDFC': userStatus.rdfc_articles || userStatus.rdfc_tests,
            'Mocks': userStatus.mock,
            'Sectionals': userStatus.sectional,
            'Add-Ons': userStatus.test,
            '10 Min RC': userStatus.ten_min_tests
        };
        if (oldKeyMap[requiredPermissionKey]) return false;

        return true;
    };
    
    const needsUpgrade = useMemo(() => {
        if (!userStatus?.isSubscribed || !managedTabs?.length) {
            return false;
        }
        
        const requiredAccessTabs = managedTabs.flatMap(tab => {
            const main = tab.requiresAccess ? [tab.name] : [];
            const subs = tab.subTabs?.filter(s => s.requiresAccess).map(s => `${tab.name}/${s.name}`) || [];
            return [...main, ...subs];
        });

        if (requiredAccessTabs.length === 0) return false;

        const access = userStatus.accessControl || {};
        const oldKeyMap = {
            'RDFC': userStatus.rdfc_articles || userStatus.rdfc_tests,
            'Mocks': userStatus.mock,
            'Sectionals': userStatus.sectional,
            'Add-Ons': userStatus.test,
            '10 Min RC': userStatus.ten_min_tests
        };

        for (const key of requiredAccessTabs) {
            const hasAccess = (access.validityMap && access.validityMap[key] && access.validityMap[key].toDate() > new Date()) ||
                              (access[key] === true) ||
                              (oldKeyMap[key] === true);
            
            if (!hasAccess) {
                return true;
            }
        }

        return false;
    }, [userStatus, managedTabs]);
    
    const renderTestRow = (test, tabName) => {
        const material = linkedMaterials[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const isLocked = getIsLocked(test);
        const { main, sub } = getTestCategory(test);
        
        const renderActionButtons = () => {
            if (isScheduled) return <div className="flex items-center justify-center h-full"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => updateLiveTests(test.id)} /></div>;
            
            let buttons = [];
            
            if (isLocked) {
                 if (userStatus?.isSubscribed) {
                    buttons.push({ key: 'upgrade', text: "Upgrade", action: () => navigate('upgrade'), className: "action-btn-upgrade", icon: <FaArrowUp /> });
                } else {
                    buttons.push({ key: 'unlock', text: "Unlock", action: () => navigate('subscription'), className: "action-btn-unlock", icon: <FaLock /> });
                }
            } else {
                if (material) {
                    const isMaterialRead = userStatus?.readArticles?.[test.id];
                    const viewText = tabName === 'RDFC' ? 'View RDFC' : 'View Material';
                    const readText = tabName === 'RDFC' ? 'RDFC Read' : 'Material Viewed';

                    if(isMaterialRead){ buttons.push({ key: 'material', text: readText, action: () => navigate('rdfcArticleViewer', { articleUrl: material.url, testId: test.id }), className: "action-btn-viewed", icon: <FaCheckCircle /> }); }
                    else { buttons.push({ key: 'material', text: viewText, action: () => handleViewMaterial(material.url, test.id), className: "action-btn-view", icon: <FaBookOpen /> }); }
                }

                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') { buttons.push({ key: 'test', text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "action-btn-analysis", icon: <FaEye /> }); }
                else if (attempt?.status === 'in-progress') { buttons.push({ key: 'test', text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "action-btn-continue", icon: <FaPlay /> }); }
                else { buttons.push({ key: 'test', text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "action-btn-start", icon: <FaPlay /> }); }
            }
            
            return (
                <div className="flex items-center justify-center space-x-2 w-full">
                    {buttons.map(btn => (
                        <button key={btn.key} onClick={btn.action} className={`action-btn ${btn.className}`}>
                            {btn.icon}<span className="btn-text">{btn.text}</span>
                        </button>
                    ))}
                </div>
            );
        };
    
        const typeColors = { MOCKS: 'type-tag-mock', SECTIONALS: 'type-tag-sectional', 'ADD-ONS': 'type-tag-addon', '10 MIN RC': 'type-tag-10min', RDFC: 'type-tag-rdfc' };
        const displayType = sub ? sub : main;
    
        return (
            <tr key={test.id} className="hover:bg-gray-700/50 transition-colors">
                 <td className="px-6 py-4 text-sm font-medium text-white">
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-100">{test.title}</span>
                         {test.isFree && <span className="tag-green">Free</span>}
                    </div>
                 </td>
                 {tabName === 'RDFC' && (
                    <td className="px-6 py-4 text-sm text-gray-300">{material?.name || '-'}</td>
                 )}
                 <td className="px-6 py-4 text-sm text-gray-400">
                      <span className={`tag-type ${typeColors[displayType.toUpperCase()] || 'type-tag-addon'}`}>{displayType}</span>
                 </td>
                 <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{test.description || (material ? material.description : '')}</td>
                 <td className="px-6 py-4 text-sm text-center">{renderActionButtons()}</td>
            </tr>
        );
    };

    const renderUserStatus = () => {
        if (!userStatus) return null;

        if (userStatus.isSubscribed) {
            let expiryText = '';
            if(userStatus.accessControl?.validityMap) {
                expiryText = 'Granular Validity';
            }
            else if (userStatus.expiryDate && userStatus.expiryDate.toDate) {
                const expiryDate = userStatus.expiryDate.toDate();
                const now = new Date();
                const difference = expiryDate.getTime() - now.getTime();
                if (difference > 0) {
                    const daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));
                    expiryText = `Expires in: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
                } else {
                    expiryText = 'Expired';
                }
            }
            return (
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2">
                    <style jsx>{` @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .premium-badge { background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e); background-size: 200% 100%; animation: shine 4s linear infinite; color: #2d3748; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } `}</style>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold premium-badge space-x-2">
                        <FaCrown />
                        <span>Premium Member</span>
                    </span>
                    {userStatus.planName && <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-gray-700 text-gray-200 rounded">{userStatus.planName}</span>}
                    {needsUpgrade && (
                        <button onClick={() => navigate('upgrade')} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-3 py-1 text-sm flex items-center space-x-2 rounded transition-colors">
                            <FaArrowUp />
                            <span>Upgrade Plan</span>
                        </button>
                    )}
                    {expiryText && (<span className="text-sm text-gray-400">{expiryText}</span>)}
                </div>
            );
        } else {
            return (
                <div className="flex items-center space-x-3">
                     <style jsx>{` @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .subscribe-button { background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e); background-size: 200% 100%; animation: shine 4s linear infinite; color: #2d3748; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } `}</style>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-300">Standard User</span>
                    <button onClick={() => navigate('subscription')} className="subscribe-button text-gray-900 px-4 py-2 rounded-md font-bold hover:opacity-90 transition-opacity transform hover:scale-105">Subscribe Now</button>
                </div>
            );
        }
    };
    
    const handleFeedbackSuccess = () => {
        setShowFeedbackThanks(true);
    };

    const iconMap = {
        'RDFC': FaBookOpen,
        '10 Min RC': FaBolt,
        'Mocks': FaTrophy,
        'Sectionals': FaChartPie
    };
    
    const TabButton = ({ value, label, icon: Icon }) => {
        const isActive = activeTab === value;
        return (
            <button 
                onClick={() => setActiveTab(value)}
                className={`flex-1 sm:flex-none flex flex-col sm:flex-row items-center justify-center sm:justify-start space-x-0 sm:space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                    isActive ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
                <Icon className="mb-1 sm:mb-0" />
                <span>{label}</span>
            </button>
        );
    };

    const TestSection = ({ tab, tests, limit, navigate }) => {
        if (!tests || tests.length === 0) return null;
        const isRdfc = tab.name.includes('RDFC');
        const headers = ['Test Title'];
        if(isRdfc) headers.push('Article Name');
        headers.push('Type', 'Description', 'Actions');
    
        return (
             <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{tab.name}</h3>
                     {tests.length > limit && (
                        <button 
                            onClick={() => navigate('allTests', { tests: tests.map(t => ({...t, material: linkedMaterials[t.id]})), title: `All ${tab.name}`, contentType: tab.name.toUpperCase().includes('RDFC') ? 'rdfc' : 'addon' })} 
                            className="text-sm font-semibold text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                        >
                            <span>View All ({tests.length})</span> <FaArrowRight />
                        </button>
                     )}
                </div>
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
                    <table className="min-w-full divide-y divide-gray-700">
                       <thead className="bg-gray-700/50">
                           <tr>
                               {headers.map(h => <th key={h} className={`px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider ${h === 'Actions' ? 'text-center' : ''}`}>{h}</th>)}
                           </tr>
                       </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                           {tests.slice(0, limit).map(test => renderTestRow(test, tab.name))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    const LeaderboardRow = ({ entry, rank, isCurrentUser }) => {
        const isTopThree = rank <= 3;
        const rankStyles = [
            { bg: 'bg-gradient-to-br from-amber-400 to-yellow-500', icon: 'text-white', name: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 font-bold' },
            { bg: 'bg-gradient-to-br from-gray-300 to-gray-500', icon: 'text-white', name: 'text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 font-semibold' },
            { bg: 'bg-gradient-to-br from-orange-400 to-amber-600', icon: 'text-white', name: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-500 font-semibold' }
        ];

        if(isCurrentUser){
             return (
                <div className="flex items-center p-3 rounded-lg bg-blue-900/50 border border-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                    <div className="flex items-center justify-center w-12 flex-shrink-0 text-lg font-bold text-white">{rank}</div>
                    <p className="flex-1 font-bold text-white truncate">{entry.name} (You)</p>
                    <div className="font-bold text-lg text-white">{entry.score}</div>
                </div>
             )
        }

        return (
            <div className={`flex items-center p-3 rounded-lg transition-all ${isTopThree ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'}`}>
                <div className="flex items-center justify-center w-12 flex-shrink-0">
                    {isTopThree ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${rankStyles[rank - 1].bg}`}>
                            <FaTrophy className={`text-lg ${rankStyles[rank - 1].icon}`} />
                        </div>
                    ) : ( <span className="text-gray-500 font-bold text-lg">{rank}</span> )}
                </div>
                <p className={`flex-1 truncate ${isTopThree ? rankStyles[rank - 1].name : 'text-white'}`}>{entry.name}</p>
                <div className="font-bold text-lg text-cyan-400">{entry.score}</div>
            </div>
        );
    };
    
    const PerformanceMetricCard = ({ icon, value, label, color }) => (
        <div className="bg-gray-800/50 p-4 rounded-lg flex items-center space-x-4 shadow-lg border border-gray-700">
            <div className={`text-3xl p-3 rounded-full bg-gray-700 ${color}`}>{icon}</div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className="text-xs text-gray-400 uppercase">{label}</p>
            </div>
        </div>
    );

    const ScoreTrendChart = ({ data, color }) => (
        <div className="bg-gray-800/50 p-4 rounded-lg h-80 shadow-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-4">Score Trend</h4>
            <ResponsiveContainer width="100%" height="90%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                    <XAxis dataKey="name" stroke="#A0AEC0" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={50} interval={0} />
                    <YAxis stroke="#A0AEC0" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A202C', border: '1px solid #4A5568' }} />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
    
    const PerformanceContent = () => {
        const [filter, setFilter] = useState('OVERALL');
        const { loading, overall, byType } = performanceData;

        if (loading) {
            return <div className="text-center text-gray-400 p-8">Loading Performance Insights...</div>;
        }

        const availableFilters = ['OVERALL', ...Object.keys(byType)];
        const currentData = filter === 'OVERALL' ? overall : byType[filter];
        const scoreHistory = filter === 'OVERALL' ? overall?.scoreHistory : byType[filter]?.scoreHistory;
        
        if (!overall || overall.metrics.testsCompleted === 0) {
             return <p className="text-center text-gray-500 py-8">Complete some tests to see your performance analysis here.</p>
        }

        return (
            <div>
                <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
                    {availableFilters.map(f => (
                        <button key={f} onClick={() => setFilter(f)} disabled={!byType[f] && f !== 'OVERALL'} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed`}>{f}</button>
                    ))}
                </div>
                
                {!currentData ? <p className="text-center text-gray-500 py-4">No completed tests yet for this category.</p> : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1 flex flex-col space-y-4">
                            <h3 className="text-xl font-bold text-white mb-2">{filter} Insights</h3>
                            <PerformanceMetricCard icon={<FaCheckCircle />} value={currentData.metrics.testsCompleted} label="Tests Completed" color="text-green-400" />
                            <PerformanceMetricCard icon={<FaBullseye />} value={currentData.metrics.avgScore} label="Average Score" color="text-blue-400" />
                            <PerformanceMetricCard icon={<FaStar />} value={currentData.metrics.bestScore} label="Best Score" color="text-yellow-400" />
                        </div>
                        <div className="lg:col-span-2">
                            <h3 className="text-xl font-bold text-white mb-4">Performance Charts</h3>
                            {scoreHistory && scoreHistory.length > 1
                                ? <ScoreTrendChart data={scoreHistory} color="#38bdf8" />
                                : <div className="bg-gray-800/50 p-4 rounded-lg h-80 flex items-center justify-center text-gray-500 border border-gray-700">Complete at least two tests in this category to see your score trend.</div>
                            }
                        </div>
                    </div>
                )}
                
                {filter === 'OVERALL' && (
                    <div className="mt-12">
                         <h3 className="text-xl font-bold text-white mb-4">Overall Leaderboard (All Tests)</h3>
                         <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2 space-y-1">
                             {overall.leaderboard.length > 0 ? (
                                 <>
                                     {overall.leaderboard.map((entry) => ( <LeaderboardRow key={entry.rank} entry={entry} rank={entry.rank} isCurrentUser={entry.userId === userData.uid} /> ))}
                                     {overall.currentUserEntry && !overall.leaderboard.some(e => e.userId === overall.currentUserEntry.userId) && (
                                         <>
                                             <hr className="border-gray-700 my-2" />
                                             <LeaderboardRow entry={overall.currentUserEntry} rank={overall.currentUserEntry.rank} isCurrentUser />
                                         </>
                                     )}
                                 </>
                             ) : <p className="text-center text-gray-500 py-4">No completed tests yet to rank.</p>}
                         </div>
                    </div>
                )}
            </div>
        );
    };

    const TestCard = ({ test }) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const isLocked = getIsLocked(test);
        const { main } = getTestCategory(test);
        const typeColors = { MOCKS: 'border-purple-500', SECTIONALS: 'border-teal-500', 'ADD-ONS': 'border-gray-500', '10 MIN RC': 'border-rose-500', RDFC: 'border-pink-500' };
        
        let text, action, className, icon, iconClass;
        const attempt = userAttempts[test.id];

        if (isScheduled) { text = "Coming Soon"; className = "text-gray-400"; icon = <FaHourglassHalf/>; action = () => {}; iconClass="text-gray-400";
        } else if (isLocked) { 
             if (userStatus?.isSubscribed) { text = "Upgrade"; action = () => navigate('upgrade'); className = "text-purple-400"; icon = <FaArrowUp />; iconClass="text-purple-400"; } 
             else { text = "Unlock"; action = () => navigate('subscription'); className = "text-amber-400"; icon = <FaLock />; iconClass="text-amber-400"; }
        } else if (attempt?.status === 'completed') { text = "Analysis"; action = () => navigate('results', { attemptId: attempt.id }); className = "text-green-400"; icon = <FaEye />; iconClass="text-green-400";
        } else if (attempt?.status === 'in-progress') { text = "Continue"; action = () => navigate('test', { testId: test.id }); className = "text-orange-400"; icon = <FaPlay />; iconClass="text-orange-400";
        } else { text = "Start"; action = () => navigate('test', { testId: test.id }); className = "text-blue-400"; icon = <FaPlay />; iconClass="text-blue-400"; }

        return (
            <div className={`bg-gray-800 rounded-lg p-4 flex flex-col justify-between shadow-lg border-l-4 transition-all hover:shadow-2xl hover:border-gray-400 ${typeColors[main.toUpperCase()] || 'border-gray-600'}`}>
                <div>
                    <div className="flex items-center justify-between mb-2">
                         <span className={`tag-type ${typeColors[main.toUpperCase()]?.replace('border', 'bg')}/20 ${typeColors[main.toUpperCase()]?.replace('border', 'text')}`}>{main}</span>
                         {test.isFree && <span className="tag-green">Free</span>}
                    </div>
                    <h4 className="font-bold text-white mb-1 truncate">{test.title}</h4>
                    <p className="text-sm text-gray-400 mb-4 h-10 overflow-hidden text-ellipsis">{test.description}</p>
                </div>
                <button onClick={action} className={`w-full mt-2 text-sm px-3 py-2 rounded-md flex items-center justify-center space-x-2 font-semibold ${className} bg-gray-700/50 hover:bg-gray-700`}>
                    <span className={iconClass}>{icon}</span> <span>{text}</span>
                </button>
            </div>
        );
    };

    const AccordionSection = ({ title, icon: Icon, sectionKey, children }) => {
        const isOpen = openAccordion === sectionKey;
        return (
            <div className="mb-2">
                <button 
                    onClick={() => setOpenAccordion(isOpen ? null : sectionKey)}
                    className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg text-left text-white font-semibold"
                >
                    <div className="flex items-center space-x-3">
                        <Icon />
                        <span>{title}</span>
                    </div>
                    <FaChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-gray-800/50 rounded-b-lg">
                                {children}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    };

    const MobileTestListItem = ({ test, tabName }) => {
        const material = linkedMaterials[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date();
        const isLocked = getIsLocked(test);

        const renderActionButtons = () => {
            if (isLocked) {
                let text, action, className, icon;
                 if (userStatus?.isSubscribed) { text = "Upgrade"; action = () => navigate('upgrade'); className = "action-btn-upgrade"; icon = <FaArrowUp />; } 
                 else { text = "Unlock"; action = () => navigate('subscription'); className = "action-btn-unlock"; icon = <FaLock />; }
                 return <button onClick={action} className={`action-btn-mobile ${className}`}>{icon}<span>{text}</span></button>;
            }

            const isRdfc = tabName === 'RDFC';
            let buttons = [];
            if(material){
                const isMaterialRead = userStatus?.readArticles?.[test.id];
                const viewText = isRdfc ? 'View RDFC' : 'Material';
                const readText = isRdfc ? 'RDFC Read' : 'Viewed';
                if(isMaterialRead){ buttons.push({key: 'mat', text: readText, action: () => navigate('rdfcArticleViewer', { articleUrl: material.url, testId: test.id }), className: "action-btn-viewed"}); }
                else { buttons.push({key: 'mat', text: viewText, action: () => handleViewMaterial(material.url, test.id), className: "action-btn-view"}); }
            }
            
            const attempt = userAttempts[test.id];
            if (attempt?.status === 'completed') { buttons.push({ key: 'test', text: "Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "action-btn-analysis" }); }
            else if (attempt?.status === 'in-progress') { buttons.push({ key: 'test', text: "Continue", action: () => navigate('test', { testId: test.id }), className: "action-btn-continue" }); }
            else { buttons.push({ key: 'test', text: "Start", action: () => navigate('test', { testId: test.id }), className: "action-btn-start" }); }
            
            return (
                <div className="flex items-center space-x-2">
                    {buttons.map(btn => <button key={btn.key} onClick={btn.action} className={`action-btn-mobile ${btn.className}`}>{btn.text}</button>)}
                </div>
            )
        };

        const { main } = getTestCategory(test);
        const typeColors = { MOCKS: 'type-tag-mock', SECTIONALS: 'type-tag-sectional', 'ADD-ONS': 'type-tag-addon', '10 MIN RC': 'type-tag-10min', RDFC: 'type-tag-rdfc' };

        return (
            <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                <div className="flex-1 min-w-0 pr-2">
                    <p className="text-white font-semibold truncate flex items-center space-x-2">
                        <span>{test.title}</span>
                        {test.isFree && <span className="tag-green">Free</span>}
                    </p>
                    {tabName === 'RDFC' ? 
                        <p className="text-gray-400 text-sm">{material?.name || ''}</p> 
                        : <p className={`tag-type mt-1 ${typeColors[main.toUpperCase()] || 'type-tag-addon'}`}>{main}</p>
                    }
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    {isScheduled ? (<div className="tag-green">Coming Soon</div>) : renderActionButtons() }
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading Dashboard...</div>;
    }
    
    const currentActiveTabData = managedTabs.find(t => t.name === activeTab);
    const hasSubTabs = currentActiveTabData && currentActiveTabData.subTabs && currentActiveTabData.subTabs.length > 0;

    const allCategorizedTests = Object.values(testsByTab).flatMap(tab => {
        const mainTests = tab.tests;
        const subTabTests = tab.subTabs ? Object.values(tab.subTabs).flatMap(sub => sub.tests) : [];
        return [...mainTests, ...subTabTests];
    });
    const recentTests = [...allCategorizedTests].sort((a,b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0)).slice(0,3);

    return (
        <div className="max-w-7xl mx-auto px-4">
                   <style jsx>{`
            .action-btn { 
                @apply flex-1 text-sm px-4 py-2 rounded-lg flex items-center justify-center space-x-2 font-semibold 
                transition-all duration-300; 
                margin: 0 4px; /* Added margin for space between buttons */
                background-color: rgba(59, 130, 246, 0.05); /* Lighter translucent blue background */
                border: 1px solid rgba(59, 130, 246, 0.2); /* Subtle border */
                min-width: 120px;
            }
            .action-btn .btn-text { @apply font-semibold; }
            .action-btn-mobile { @apply text-xs px-3 py-1.5 rounded-md font-semibold transition-all duration-300 flex items-center justify-center space-x-1; }
            
            .action-btn-start, .action-btn-view { 
                color: #60a5fa; 
                background-color: rgba(59, 130, 246, 0.05);
                border: 1px solid rgba(59, 130, 246, 0.2);
            }
            .action-btn-start:hover, .action-btn-view:hover { 
                background-color: rgba(59, 130, 246, 0.15); 
                box-shadow: 0 0 12px rgba(59, 130, 246, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-continue { 
                color: #fb923c;
                background-color: rgba(249, 115, 22, 0.05);
                border: 1px solid rgba(249, 115, 22, 0.2);
            }
            .action-btn-continue:hover { 
                background-color: rgba(249, 115, 22, 0.15); 
                box-shadow: 0 0 12px rgba(249, 115, 22, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-analysis { 
                color: #4ade80; 
                background-color: rgba(34, 197, 94, 0.05);
                border: 1px solid rgba(34, 197, 94, 0.2);
            }
            .action-btn-analysis:hover { 
                background-color: rgba(34, 197, 94, 0.15); 
                box-shadow: 0 0 12px rgba(34, 197, 94, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-viewed { 
                color: #9ca3af; 
                background-color: rgba(107, 114, 128, 0.05);
                border: 1px solid rgba(107, 114, 128, 0.2);
            }
            .action-btn-viewed:hover { 
                background-color: rgba(107, 114, 128, 0.15); 
                transform: scale(1.05);
            }

            .action-btn-unlock { 
                color: #facc15; 
                background-color: rgba(245, 158, 11, 0.05);
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
            .action-btn-unlock:hover { 
                background-color: rgba(245, 158, 11, 0.15); 
                box-shadow: 0 0 12px rgba(245, 158, 11, 0.4); 
                transform: scale(1.05);
            }

            .action-btn-upgrade { 
                color: #c084fc; 
                background-color: rgba(147, 51, 234, 0.05);
                border: 1px solid rgba(147, 51, 234, 0.2);
            }
            .action-btn-upgrade:hover { 
                background-color: rgba(147, 51, 234, 0.15); 
                box-shadow: 0 0 12px rgba(147, 51, 234, 0.4); 
                transform: scale(1.05);
            }

            .tag-green { @apply inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300; }
            .tag-type { @apply inline-block px-3 py-1 text-xs font-bold rounded-md border; }
            .type-tag-mock { background-color: #9333ea20; color: #e9d5ff; border-color: #9333ea80; }
            .type-tag-sectional { background-color: #0d948820; color: #99f6e4; border-color: #0d948880; }
            .type-tag-addon { background-color: #6b728020; color: #d1d5db; border-color: #6b728080; }
            .type-tag-10min { background-color: #e11d4820; color: #fda4af; border-color: #e11d4880; }
            .type-tag-rdfc { background-color: #db277720; color: #fbcfe8; border-color: #db277780; }
            
        `}</style>
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">User Dashboard</h2>
                 {renderUserStatus()}
            </div>

            <div className="hidden md:block">
                <div className="mb-4 p-1.5 bg-gray-800 rounded-lg flex flex-wrap sm:space-x-2">
                    <TabButton value="dashboard" label="Dashboard" icon={FaTachometerAlt} />
                    <TabButton value="performance" label="Performance" icon={FaChartLine} />
                    {visibleTabs.map(tab => (
                        <TabButton key={tab.id} value={tab.name} label={tab.name} icon={iconMap[tab.name] || FaVial} />
                    ))}
                    {userStatus?.isSubscribed && !userStatus.hasSubmittedFeedback && <TabButton value="feedback" label="Feedback" icon={FaCommentDots} />}
                    <TabButton value="support" label="Support" icon={FaHeadset} />
                </div>

                {hasSubTabs && (
                    <div className="mb-8 p-1.5 bg-gray-800/50 rounded-lg flex flex-wrap items-center space-x-2">
                        {currentActiveTabData.subTabs.map(subTab => {
                             const subTests = testsByTab[activeTab]?.subTabs[subTab.name]?.tests || [];
                             if (subTests.length === 0) return null;
                             return (
                                <button key={subTab.name} onClick={() => setActiveSubTab(subTab.name)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${activeSubTab === subTab.name ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                                    {subTab.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="mt-4">
                    {activeTab === 'dashboard' && (
                         <div className="space-y-12">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <ExamCountdownWidget title="Countdown to CAT 2025" targetDate="2025-11-29T23:59:59" />
                                <ExamCountdownWidget title="Countdown to XAT 2026" targetDate="2026-01-03T23:59:59" />
                                <VocabCardWidget />
                            </div>
                            <div>
                                <h3 className="text-xl md:text-2xl font-bold text-white mb-4">Quick Access</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recentTests.map(test => <TestCard key={test.id} test={test} />)}
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'performance' && <PerformanceContent />}
                    
                    {visibleTabs.map(tab => {
                        if (activeTab !== tab.name) return null;
                        const testsForTab = testsByTab[tab.name];
                        let testsToShow = [];

                        if(!activeSubTab){
                            const subTabTests = Object.values(testsForTab.subTabs).flatMap(s => s.tests);
                            testsToShow = [...testsForTab.tests, ...subTabTests];
                        } else {
                            testsToShow = testsForTab.subTabs[activeSubTab]?.tests || [];
                        }

                        return (
                            <div key={tab.id}>
                                <TestSection 
                                    tab={{name: hasSubTabs && activeSubTab ? `${tab.name} / ${activeSubTab}` : tab.name }}
                                    tests={testsToShow}
                                    limit={10}
                                    navigate={navigate}
                                />
                            </div>
                        )
                    })}

                    {activeTab === 'support' && ( <div className="bg-gray-800 rounded-lg p-8 text-center"><h2 className="text-2xl font-bold text-white mb-4">Support Center</h2><p className="text-gray-400 mb-6">Have questions or need assistance? We're here to help!</p><button onClick={() => navigate('support')} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 shadow-lg transition-all">Go to Support Page</button></div> )}
                    {activeTab === 'feedback' && ( <div className="pt-8 mb-12">{showFeedbackThanks ? (<div className="bg-gray-800 border-l-4 border-green-500 text-white p-6 rounded-lg shadow-lg my-8 text-center"><h3 className="text-xl font-bold">Thank You!</h3><p className="text-gray-300 mt-2">Your feedback is valuable to us and helps improve the platform for everyone.</p></div>) : (<FeedbackForm userStatus={userStatus} onSuccessfulSubmit={handleFeedbackSuccess} />)}</div> )}
                </div>
            </div>

            {/* --- MOBILE UI: ACCORDION --- */}
            <div className="md:hidden space-y-2">
                <div className="mb-8 grid grid-cols-1 gap-4">
                    <ExamCountdownWidget title="CAT 2025" targetDate="2025-11-29T23:59:59" />
                    <VocabCardWidget />
                </div>
                <AccordionSection title="Performance" icon={FaChartLine} sectionKey="performance"><PerformanceContent /></AccordionSection>
                {visibleTabs.map(tab => {
                    const testsForTab = testsByTab[tab.name];
                    const allTestsInTab = [...testsForTab.tests, ...(tab.subTabs ? Object.values(testsForTab.subTabs).flatMap(s => s.tests) : [])];

                    return (
                        <AccordionSection key={tab.id} title={tab.name} icon={iconMap[tab.name] || FaVial} sectionKey={tab.id}>
                            {allTestsInTab.slice(0, 10).map(test => <MobileTestListItem key={test.id} test={test} tabName={tab.name} /> )}
                            {allTestsInTab.length > 10 && (
                                <button onClick={() => navigate('allTests', { tests: allTestsInTab.map(t => ({...t, material: linkedMaterials[t.id]})), title: `All ${tab.name}`, contentType: tab.name.toUpperCase().includes('RDFC') ? 'rdfc' : 'addon' })} className="text-blue-400 font-semibold text-sm mt-2 w-full text-center">
                                    View All {allTestsInTab.length} Items...
                                </button>
                            )}
                        </AccordionSection>
                    )
                })}
                {userStatus?.isSubscribed && !userStatus.hasSubmittedFeedback && ( <AccordionSection title="Feedback" icon={FaCommentDots} sectionKey="feedback">{showFeedbackThanks ? <p className="text-green-400 text-center">Thank you for your feedback!</p> : <FeedbackForm userStatus={userStatus} onSuccessfulSubmit={handleFeedbackSuccess} />}</AccordionSection> )}
                <AccordionSection title="Support" icon={FaHeadset} sectionKey="support"><p className="text-gray-400 text-center mb-4">Need help? Visit our support center.</p><button onClick={() => navigate('support')} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700">Go to Support</button></AccordionSection>
            </div>
        </div>
    );
};

export default UserDashboard;