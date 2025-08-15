import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot, updateDoc, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import FeedbackForm from '../components/FeedbackForm';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaLock, FaPlay, FaCheckCircle, FaHourglassHalf, FaBookOpen, FaCrown, FaTachometerAlt, FaVial, FaCommentDots, FaHeadset, FaChevronDown, FaArrowLeft, FaArrowRight, FaChartLine, FaBullseye, FaStar, FaTrophy } from 'react-icons/fa';


// --- WIDGETS AND HELPERS START ---

const CountdownTimer = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            timeLeft = {
                Days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                Hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                Minutes: Math.floor((difference / 1000 / 60) % 60),
                Seconds: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (!Object.keys(newTimeLeft).length) { onComplete(); }
        }, 1000);
        return () => clearTimeout(timer);
    });
    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
        <span key={interval} className="text-center p-1">
            <span className="font-mono text-base sm:text-lg font-semibold">{String(value).padStart(2, '0')}</span>
            <span className="text-xs uppercase block opacity-70">{interval}</span>
        </span>
    ));
    return (
        <div className="flex justify-around items-center text-white w-full h-full bg-gray-700/50 rounded-md">
            {timerComponents.length ? timerComponents : <span className="font-semibold">Loading...</span>}
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
                    </div>
                </motion.div>
            </div>
            <p className="text-center text-xs text-gray-500 mt-4">Click card to flip</p>
        </div>
    );
};

// --- WIDGETS END ---


// --- CUSTOM HOOKS FOR CLEAN DATA FETCHING ---

const useMasterData = () => {
    const [masterData, setMasterData] = useState({ allTests: [], linkedArticles: {}, loading: true });

    useEffect(() => {
        const fetch = async () => {
            try {
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const articlesQuery = collection(db, 'rdfcArticles');

                const [testsSnapshot, articlesSnapshot] = await Promise.all([
                    getDocs(testsQuery),
                    getDocs(articlesQuery)
                ]);

                const fetchedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const fetchedArticles = {};
                articlesSnapshot.forEach(doc => { fetchedArticles[doc.id] = doc.data(); });
                
                setMasterData({ allTests: fetchedTests, linkedArticles: fetchedArticles, loading: false });
            } catch (error) {
                console.error("Error fetching master data:", error);
                setMasterData(prev => ({ ...prev, loading: false }));
            }
        };
        fetch();
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

const usePerformanceData = (uid) => {
    const [data, setData] = useState({
        metrics: { testsCompleted: 0, avgScore: 0, bestScore: 0 },
        leaderboard: [],
        currentUserEntry: null,
        loading: true
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const allAttemptsQuery = query(collection(db, 'attempts'), where('status', '==', 'completed'));
                const allAttemptsSnapshot = await getDocs(allAttemptsQuery);
                const allAttempts = allAttemptsSnapshot.docs.map(doc => doc.data());

                const userScores = {};
                allAttempts.forEach(attempt => {
                    const score = typeof attempt.totalScore === 'number' ? attempt.totalScore : 0;
                    if (!userScores[attempt.userId]) {
                        userScores[attempt.userId] = { totalScore: 0, count: 0, scores: [] };
                    }
                    userScores[attempt.userId].totalScore += score;
                    userScores[attempt.userId].count += 1;
                    userScores[attempt.userId].scores.push(score);
                });

                const rankedUsers = Object.entries(userScores)
                    .map(([userId, data]) => ({
                        userId,
                        totalScore: data.totalScore,
                        testCount: data.count,
                        scores: data.scores
                    }))
                    .sort((a, b) => b.totalScore - a.totalScore);

                const currentUserIndex = rankedUsers.findIndex(user => user.userId === uid);
                let currentUserData = null;
                let metrics = { testsCompleted: 0, avgScore: 0, bestScore: 0 };

                if (currentUserIndex !== -1) {
                    currentUserData = { ...rankedUsers[currentUserIndex], rank: currentUserIndex + 1 };
                    metrics = {
                        testsCompleted: currentUserData.testCount,
                        avgScore: (currentUserData.totalScore / currentUserData.testCount).toFixed(1),
                        bestScore: currentUserData.scores.length > 0 ? Math.max(...currentUserData.scores) : 0
                    };
                }

                const top10Users = rankedUsers.slice(0, 10);
                let userIdsToFetch = top10Users.map(u => u.userId);
                if (currentUserData && !userIdsToFetch.includes(uid)) {
                    userIdsToFetch.push(uid);
                }
                userIdsToFetch = [...new Set(userIdsToFetch)];

                const userDocs = await Promise.all(userIdsToFetch.map(id => getDoc(doc(db, 'users', id))));
                const usersMap = {};
                userDocs.forEach(userDoc => {
                    if (userDoc.exists()) {
                        usersMap[userDoc.id] = userDoc.data().displayName || 'Anonymous';
                    }
                });

                const leaderboard = top10Users.map((user, index) => ({
                    name: usersMap[user.userId] || 'Anonymous',
                    score: user.totalScore,
                    rank: index + 1,
                    userId: user.userId
                }));

                let currentUserEntry = null;
                if (currentUserData) {
                    currentUserEntry = {
                        name: usersMap[uid] || 'Anonymous',
                        score: currentUserData.totalScore,
                        rank: currentUserData.rank,
                        userId: uid
                    };
                }
                setData({ metrics, leaderboard, currentUserEntry, loading: false });
            } catch (error) {
                console.error("Error fetching performance data:", error);
                setData({
                    metrics: { testsCompleted: 0, avgScore: 0, bestScore: 0 },
                    leaderboard: [],
                    currentUserEntry: null,
                    loading: false
                });
            }
        };

        if (uid) fetchData();
        else setData(prev => ({ ...prev, loading: false }));
    }, [uid]);

    return data;
}

// --- MAIN DASHBOARD COMPONENT ---

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [liveTests, setLiveTests] = useState({});
    const [showFeedbackThanks, setShowFeedbackThanks] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [testFilter, setTestFilter] = useState('test');
    const [openAccordion, setOpenAccordion] = useState(null);

    const { allTests, linkedArticles, loading: masterDataLoading } = useMasterData();
    const userStatus = useUserStatus(userData?.uid);
    const userAttempts = useUserAttempts(userData?.uid);
    const { metrics, leaderboard, currentUserEntry, loading: performanceLoading } = usePerformanceData(userData?.uid);

    const { 
        rdfcTests, mockTests, sectionalTests, otherAddOnTests
    } = useMemo(() => {
        if (!allTests || allTests.length === 0) {
            return { rdfcTests: [], mockTests: [], sectionalTests: [], otherAddOnTests: [] };
        }
        
        const rdfc = allTests.filter(test => linkedArticles[test.id]).sort((a,b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
        
        const nonRdfcTests = allTests.filter(test => !linkedArticles[test.id]);
        
        const mocks = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'MOCK').sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
        const sectionals = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'SECTIONAL').sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
        const others = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'TEST').sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });

        return {
            rdfcTests: rdfc,
            mockTests: mocks,
            sectionalTests: sectionals,
            otherAddOnTests: others
        };
    }, [allTests, linkedArticles]);
    
    const updateLiveTests = (testId) => {
        setLiveTests(prev => ({...prev, [testId]: true}));
    };
    
    useEffect(() => {
        const checkLiveStatus = () => {
            const now = new Date().getTime();
            const newLiveTests = {};
            [...rdfcTests, ...mockTests, ...sectionalTests, ...otherAddOnTests].forEach(test => {
                if (test.liveAt?.toDate().getTime() <= now) {
                    newLiveTests[test.id] = true;
                }
            });
            setLiveTests(newLiveTests);
        };
        const interval = setInterval(checkLiveStatus, 1000 * 60);
        checkLiveStatus();
        return () => clearInterval(interval);
    }, [rdfcTests, mockTests, sectionalTests, otherAddOnTests]);

    const loading = masterDataLoading || !userStatus;

    const handleViewArticle = async (articleUrl, testId) => {
        if (!userData?.uid) return;
        try {
            const userRef = doc(db, 'users', userData.uid);
            await updateDoc(userRef, { [`readArticles.${testId}`]: true });
            navigate('rdfcArticleViewer', { articleUrl, testId: testId });
        } catch (error) {
            console.error("Error marking article as read:", error);
        }
    };

    const getIsLocked = (test, itemType) => {
        if (test.isFree) return false;
        if (!userStatus?.isSubscribed) return true;
        const access = userStatus.accessControl;
        if (!access) return true;
        if (itemType === 'rdfc_article') return !access.rdfc_articles;
        if (itemType === 'rdfc_test') return !access.rdfc_tests;
        switch (test.type?.toUpperCase()) {
            case 'MOCK': return !access.mock;
            case 'SECTIONAL': return !access.sectional;
            case 'TEST': return !access.test;
            default: return true;
        }
    };
    
    const renderRDFCDesktopRow = (test) => {
        const article = linkedArticles[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        
        const renderCellContent = (type) => {
            if (isScheduled) return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => updateLiveTests(test.id)} /></div>;
            const isLocked = getIsLocked(test, `rdfc_${type}`);
            const isArticleRead = userStatus?.readArticles?.[test.id];
            let text, action, className, disabled = !article, icon;

            if(isLocked) { text = "Unlock"; action = () => navigate('subscription'); className = "bg-amber-500 hover:bg-amber-400 text-gray-900"; icon = <FaLock />; } 
            else if(type === 'article') {
                if(isArticleRead) { text = "Article Read"; action = () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }); className = "bg-gray-600 hover:bg-gray-700 text-gray-300"; icon = <FaCheckCircle />; } 
                else { text = "View Article"; action = () => handleViewArticle(article.url, test.id); className = "bg-blue-600 hover:bg-blue-700 text-white"; icon = <FaBookOpen />; }
            } else { // type === 'test'
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') { text = "View Analysis"; action = () => navigate('results', { attemptId: attempt.id }); className = "bg-green-600 hover:bg-green-700 text-white"; icon = <FaEye />; } 
                else if (attempt?.status === 'in-progress') { text = "Continue Test"; action = () => navigate('test', { testId: test.id }); className = "bg-orange-500 hover:bg-orange-600 text-white"; icon = <FaPlay />; } 
                else { text = "Start Test"; action = () => navigate('test', { testId: test.id }); className = "bg-blue-600 hover:bg-blue-700 text-white"; icon = <FaPlay />; }
            }
            return <button onClick={action} disabled={disabled} className={`text-xs px-3 py-1 rounded-full w-40 h-10 flex items-center justify-center space-x-2 ${className} ${isLocked ? 'opacity-60' : ''}`}>{icon} <span>{text}</span></button>;
        };

        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-semibold">{test.title}</span>
                        {test.isFree && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                        {isScheduled && <span className="ml-2 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}
                    </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-300">{article ? article.name : ''}</td>
                <td className="px-6 py-4 text-sm text-gray-400">{article ? article.description : ''}</td>
                <td className="px-6 py-4 text-sm">{renderCellContent('article')}</td>
                <td className="px-6 py-4 text-sm">{renderCellContent('test')}</td>
            </tr>
        );
    };

    const renderAddOnTestRow = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const isLocked = getIsLocked(test, test.type);
        const typeColors = { MOCK: 'bg-purple-700 text-purple-200', SECTIONAL: 'bg-teal-700 text-teal-200', TEST: 'bg-gray-600 text-gray-300' };

        const renderCellContent = () => {
            if (isScheduled) return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => updateLiveTests(test.id)} /></div>;
            let text, action, className, icon;

            if (isLocked) {
                text = "Unlock"; action = () => navigate('subscription'); className = "bg-amber-500 hover:bg-amber-400 text-gray-900"; icon = <FaLock />;
            } else {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') { text = "View Analysis"; action = () => navigate('results', { attemptId: attempt.id }); className = "bg-green-600 hover:bg-green-700 text-white"; icon = <FaEye />; }
                else if (attempt?.status === 'in-progress') { text = "Continue Test"; action = () => navigate('test', { testId: test.id }); className = "bg-orange-500 hover:bg-orange-600 text-white"; icon = <FaPlay />; }
                else { text = "Start Test"; action = () => navigate('test', { testId: test.id }); className = "bg-blue-600 hover:bg-blue-700 text-white"; icon = <FaPlay />; }
            }
            return <button onClick={action} className={`text-xs px-3 py-1 rounded-full w-40 h-10 flex items-center justify-center space-x-2 ${className} ${isLocked ? 'opacity-60' : ''}`}>{icon} <span>{text}</span></button>;
        };

        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                 <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-semibold">{test.title}</span>
                        {test.isFree && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                        {isScheduled && <span className="ml-2 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}
                    </div>
                 </td>
                 <td className="px-6 py-4 text-sm text-gray-400">
                     <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeColors[test.type.toUpperCase()] || typeColors.TEST}`}>{test.type}</span>
                 </td>
                 <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{test.description}</td>
                 <td className="px-6 py-4 text-sm">{renderCellContent()}</td>
            </tr>
        );
    };

    const renderUserStatus = () => {
        if (!userStatus) return null;

        if (userStatus.isSubscribed) {
            let daysRemaining = null;
            if (userStatus.expiryDate && userStatus.expiryDate.toDate) {
                const expiryDate = userStatus.expiryDate.toDate();
                const now = new Date();
                const difference = expiryDate.getTime() - now.getTime();

                if (difference > 0) {
                    daysRemaining = Math.ceil(difference / (1000 * 60 * 60 * 24));
                }
            }

            return (
                <div className="flex items-center space-x-3">
                    <style jsx>{` @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .premium-badge { background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e); background-size: 200% 100%; animation: shine 4s linear infinite; color: #2d3748; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } `}</style>
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold premium-badge space-x-2">
                        <FaCrown />
                        <span>Premium Member</span>
                    </span>
                    {userStatus.planName && <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white">{userStatus.planName}</span>}
                    {daysRemaining !== null && (
                        <span className="text-sm text-gray-400">
                            Expires in: {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            );
        } else {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-300">Standard User</span>;
        }
    };
    
    const handleFeedbackSuccess = () => {
        setShowFeedbackThanks(true);
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

    const TestSection = ({ title, tests, limit, contentType, viewAllParams, navigate, renderDesktopRow }) => {
        if (!tests || tests.length === 0) return null;
        
        const isRdfc = contentType === 'rdfc';
        const headers = isRdfc 
            ? ['Title', 'Article Name', 'Article Description', 'Article Action', 'Test Action'] 
            : ['Title', 'Type', 'Description', 'Action'];

        return (
             <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{title}</h3>
                     {tests.length > limit && (
                        <button 
                            onClick={() => navigate('allTests', { ...viewAllParams, tests: tests.map(t => ({...t, article: linkedArticles[t.id]})) })} 
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
                               {headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">{h}</th>)}
                           </tr>
                       </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                           {tests.slice(0, limit).map(test => renderDesktopRow(test))}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    };
    
    // --- NEW LEADERBOARD ROW COMPONENT ---
    const LeaderboardRow = ({ entry, rank }) => {
        const isTopThree = rank <= 3;

        const rankStyles = [
            { // Rank 1
                bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
                icon: 'text-white',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400 font-bold',
            },
            { // Rank 2
                bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
                icon: 'text-white',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 font-semibold',
            },
            { // Rank 3
                bg: 'bg-gradient-to-br from-orange-400 to-amber-600',
                icon: 'text-white',
                name: 'text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-amber-500 font-semibold',
            }
        ];

        return (
            <div className={`flex items-center p-3 rounded-lg transition-all ${isTopThree ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'}`}>
                <div className="flex items-center justify-center w-12 flex-shrink-0">
                    {isTopThree ? (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${rankStyles[rank - 1].bg}`}>
                            <FaTrophy className={`text-lg ${rankStyles[rank - 1].icon}`} />
                        </div>
                    ) : (
                        <span className="text-gray-500 font-bold text-lg">{rank}</span>
                    )}
                </div>
                <p className={`flex-1 truncate ${isTopThree ? rankStyles[rank - 1].name : 'text-white'}`}>
                    {entry.name}
                </p>
                <div className="font-bold text-lg text-cyan-400">{entry.score}</div>
            </div>
        );
    };
    
    const PerformanceMetricCard = ({ icon, value, label, color }) => (
        <div className="bg-gray-800 p-4 rounded-lg text-center flex-grow shadow-lg border border-gray-700">
            <div className={`text-3xl mx-auto ${color}`}>{icon}</div>
            <div className="text-2xl font-bold mt-2 text-white">{value}</div>
            <p className="text-xs text-gray-400 uppercase mt-1">{label}</p>
        </div>
    );

    const PerformanceContent = () => {
        if (performanceLoading) {
            return <div className="text-center text-gray-400 p-8">Loading Performance Insights...</div>;
        }

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 flex flex-col space-y-4">
                    <h3 className="text-xl font-bold text-white mb-2">Your Insights</h3>
                    <PerformanceMetricCard icon={<FaCheckCircle />} value={metrics.testsCompleted} label="Tests Completed" color="text-green-400" />
                    <PerformanceMetricCard icon={<FaBullseye />} value={metrics.avgScore} label="Average Score" color="text-blue-400" />
                    <PerformanceMetricCard icon={<FaStar />} value={metrics.bestScore} label="Best Single Score" color="text-yellow-400" />
                </div>
                <div className="lg:col-span-2">
                    <h3 className="text-xl font-bold text-white mb-4">Overall Leaderboard (All Tests)</h3>
                    <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-2 space-y-1">
                        {leaderboard.length > 0 ? (
                            <>
                                {leaderboard.map((entry) => (
                                    <LeaderboardRow key={entry.rank} entry={entry} rank={entry.rank} />
                                ))}
                                {currentUserEntry && (
                                    <>
                                        <hr className="border-gray-700 my-2" />
                                        <div className="flex items-center p-3 rounded-lg bg-blue-900/50 border border-blue-700 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                                            <div className="flex items-center justify-center w-12 flex-shrink-0 text-lg font-bold text-white">
                                                {currentUserEntry.rank}
                                            </div>
                                            <p className="flex-1 font-bold text-white truncate">{currentUserEntry.name} (You)</p>
                                            <div className="font-bold text-lg text-white">{currentUserEntry.score}</div>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : <p className="text-center text-gray-500 py-4">No completed tests yet to rank.</p>}
                    </div>
                </div>
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

    const MobileRDFCListItem = ({ test }) => {
        const article = linkedArticles[test.id];
        const attempt = userAttempts[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date();
        
        const isArticleLocked = getIsLocked(test, 'rdfc_article');
        const isTestLocked = getIsLocked(test, 'rdfc_test');
        
        const articleButton = () => {
            if (isArticleLocked) {
                return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 text-gray-900" };
            }
            const isArticleRead = userStatus?.readArticles?.[test.id];
            if (isArticleRead) {
                return { text: "Read", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "bg-gray-600 text-gray-300" };
            }
            return { text: "View", action: () => handleViewArticle(article.url, test.id), className: "bg-blue-600 text-white" };
        };

        const testButton = () => {
            if (isTestLocked) {
                return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 text-gray-900" };
            }
            if (attempt?.status === 'completed') {
                return { text: "Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 text-white" };
            }
            if (attempt?.status === 'in-progress') {
                return { text: "Continue", action: () => navigate('test', { testId: test.id }), className: "bg-orange-500 text-white" };
            }
            return { text: "Start", action: () => navigate('test', { testId: test.id }), className: "bg-blue-600 text-white" };
        };
        
        const articleBtn = articleButton();
        const testBtn = testButton();

        return (
            <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                <div className="flex-1 min-w-0 pr-2">
                    <p className="text-white font-semibold truncate flex items-center">
                        {test.title}
                        {test.isFree && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                    </p>
                    <p className="text-gray-400 text-sm">{article?.name || ''}</p>
                </div>
                <div className="flex-shrink-0 flex items-center space-x-2">
                    {isScheduled ? (
                        <div className="text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</div>
                    ) : (
                        <>
                            <button onClick={articleBtn.action} disabled={!article} className={`text-xs px-2 py-1 rounded-full font-bold ${articleBtn.className}`}>
                                {articleBtn.text}
                            </button>
                            <button onClick={testBtn.action} disabled={!article} className={`text-xs px-2 py-1 rounded-full font-bold ${testBtn.className}`}>
                                {testBtn.text}
                            </button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const MobileTestListItem = ({ test }) => {
        const attempt = userAttempts[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date();
        const isLocked = getIsLocked(test, test.type);
        const typeColors = { MOCK: 'bg-purple-700 text-purple-200', SECTIONAL: 'bg-teal-700 text-teal-200', TEST: 'bg-gray-600 text-gray-300' };

        let text, action, className, icon;
        if (isScheduled) {
            text = "Coming Soon"; className = "bg-gray-600 text-gray-300 cursor-default"; icon = <FaHourglassHalf/>; action = () => {};
        } else if (isLocked) {
            text = "Unlock"; action = () => navigate('subscription'); className = "bg-amber-500 text-gray-900"; icon = <FaLock />;
        } else if (attempt?.status === 'completed') {
            text = "Analysis"; action = () => navigate('results', { attemptId: attempt.id }); className = "bg-green-600 text-white"; icon = <FaEye />;
        } else if (attempt?.status === 'in-progress') {
            text = "Continue"; action = () => navigate('test', { testId: test.id }); className = "bg-orange-500 text-white"; icon = <FaPlay />;
        } else {
            text = "Start"; action = () => navigate('test', { testId: test.id }); className = "bg-blue-600 text-white"; icon = <FaPlay />;
        }

        return (
            <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold truncate flex items-center">
                        {test.title}
                        {test.isFree && <span className="ml-2 flex-shrink-0 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                    </p>
                    <p className={`text-sm inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeColors[test.type.toUpperCase()] || typeColors.TEST}`}>{test.type}</p>
                </div>
                <div className="ml-4 flex-shrink-0">
                    <button onClick={action} className={`text-xs px-3 py-1.5 rounded-full w-28 h-8 flex items-center justify-center space-x-2 font-bold ${className}`}>
                        {icon}
                        <span>{text}</span>
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading Dashboard...</div>;
    }
    
    const testsForFilter = {
        mock: mockTests || [],
        sectional: sectionalTests || [],
        test: otherAddOnTests || [],
    };

    const anyTestsAvailable = mockTests.length > 0 || sectionalTests.length > 0 || otherAddOnTests.length > 0;

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">User Dashboard</h2>
                 {renderUserStatus()}
            </div>

            <div className="hidden md:block">
                <div className="mb-8 p-1.5 bg-gray-800 rounded-lg flex flex-wrap sm:space-x-2">
                    <TabButton value="dashboard" label="Dashboard" icon={FaTachometerAlt} />
                    <TabButton value="performance" label="Performance" icon={FaChartLine} />
                    {rdfcTests.length > 0 && <TabButton value="rdfc" label="RDFC" icon={FaBookOpen} />}
                    {anyTestsAvailable && <TabButton value="tests" label="Tests" icon={FaVial} />}
                    {userStatus?.isSubscribed && !userStatus.hasSubmittedFeedback && <TabButton value="feedback" label="Feedback" icon={FaCommentDots} />}
                    <TabButton value="support" label="Support" icon={FaHeadset} />
                </div>
                <div className="mt-4">
                    {activeTab === 'dashboard' && (
                         <div className="mb-12">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <ExamCountdownWidget title="Countdown to CAT 2025" targetDate="2025-11-29T23:59:59" />
                                <ExamCountdownWidget title="Countdown to XAT 2026" targetDate="2026-01-03T23:59:59" />
                                <VocabCardWidget />
                            </div>
                        </div>
                    )}
                    {activeTab === 'performance' && <PerformanceContent />}
                    {activeTab === 'rdfc' && rdfcTests.length > 0 && ( <TestSection title="RDFC Articles & Tests" tests={rdfcTests} limit={10} contentType="rdfc" viewAllParams={{ title: 'All RDFC Articles & Tests', contentType: 'rdfc' }} navigate={navigate} renderDesktopRow={renderRDFCDesktopRow}/> )}
                    {activeTab === 'tests' && anyTestsAvailable && (
                        <div>
                            <div className="flex items-center space-x-2 mb-6">
                                {otherAddOnTests.length > 0 && ( <button onClick={() => setTestFilter('test')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${testFilter === 'test' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Add-Ons</button> )}
                                {sectionalTests.length > 0 && ( <button onClick={() => setTestFilter('sectional')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${testFilter === 'sectional' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Sectionals</button> )}
                                {mockTests.length > 0 && ( <button onClick={() => setTestFilter('mock')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${testFilter === 'mock' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Mocks</button> )}
                            </div>
                            <TestSection title={`${testFilter.charAt(0).toUpperCase() + testFilter.slice(1)} Tests`} tests={testsForFilter[testFilter]} limit={10} contentType={testFilter} viewAllParams={{ title: `All ${testFilter}s`, contentType: testFilter }} navigate={navigate} renderDesktopRow={renderAddOnTestRow}/>
                        </div>
                    )}
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
                {rdfcTests.length > 0 && ( <AccordionSection title="RDFC Articles & Tests" icon={FaBookOpen} sectionKey="rdfc">{rdfcTests.slice(0, 10).map(test => <MobileRDFCListItem key={test.id} test={test} />)}{(rdfcTests.length > 10) && <button onClick={() => navigate('allTests', { tests: rdfcTests.map(t => ({...t, article: linkedArticles[t.id]})), title: 'All RDFC', contentType: 'rdfc' })} className="text-blue-400 font-semibold text-sm mt-2 w-full text-center">View All {rdfcTests.length} RDFC Tests...</button>}</AccordionSection> )}
                {otherAddOnTests.length > 0 && ( <AccordionSection title="Add-On Tests" icon={FaVial} sectionKey="addon">{otherAddOnTests.slice(0, 10).map(test => <MobileTestListItem key={test.id} test={test} />)}{(otherAddOnTests.length > 10) && <button onClick={() => navigate('allTests', { tests: otherAddOnTests, title: 'All Add-On Tests', contentType: 'test' })} className="text-blue-400 font-semibold text-sm mt-2 w-full text-center">View All {otherAddOnTests.length} Add-Ons...</button>}</AccordionSection> )}
                {sectionalTests.length > 0 && ( <AccordionSection title="Sectional Tests" icon={FaVial} sectionKey="sectional">{sectionalTests.slice(0, 10).map(test => <MobileTestListItem key={test.id} test={test} />)}{(sectionalTests.length > 10) && <button onClick={() => navigate('allTests', { tests: sectionalTests, title: 'All Sectional Tests', contentType: 'sectional' })} className="text-blue-400 font-semibold text-sm mt-2 w-full text-center">View All {sectionalTests.length} Sectionals...</button>}</AccordionSection> )}
                {mockTests.length > 0 && ( <AccordionSection title="Mock Tests" icon={FaVial} sectionKey="mock">{mockTests.slice(0, 10).map(test => <MobileTestListItem key={test.id} test={test} />)}{(mockTests.length > 10) && <button onClick={() => navigate('allTests', { tests: mockTests, title: 'All Mock Tests', contentType: 'mock' })} className="text-blue-400 font-semibold text-sm mt-2 w-full text-center">View All {mockTests.length} Mocks...</button>}</AccordionSection> )}
                {userStatus?.isSubscribed && !userStatus.hasSubmittedFeedback && ( <AccordionSection title="Feedback" icon={FaCommentDots} sectionKey="feedback">{showFeedbackThanks ? <p className="text-green-400 text-center">Thank you for your feedback!</p> : <FeedbackForm userStatus={userStatus} onSuccessfulSubmit={handleFeedbackSuccess} />}</AccordionSection> )}
                <AccordionSection title="Support" icon={FaHeadset} sectionKey="support"><p className="text-gray-400 text-center mb-4">Need help? Visit our support center.</p><button onClick={() => navigate('support')} className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700">Go to Support</button></AccordionSection>
            </div>
        </div>
    );
};

export default UserDashboard;