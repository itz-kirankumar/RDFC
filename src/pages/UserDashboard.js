import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, query, where, doc, onSnapshot, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import FeedbackForm from '../components/FeedbackForm';
import { motion, AnimatePresence } from 'framer-motion';
import { FaEye, FaLock, FaPlay, FaRedo, FaCheckCircle, FaHourglassHalf, FaBookOpen } from 'react-icons/fa';


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

const UserDashboard = ({ navigate }) => {
    const { userData } = useAuth();
    const [rdfcTests, setRdfcTests] = useState([]);
    const [mockTests, setMockTests] = useState([]);
    const [sectionalTests, setSectionalTests] = useState([]);
    const [otherAddOnTests, setOtherAddOnTests] = useState([]);
    const [linkedArticles, setLinkedArticles] = useState({});
    const [loading, setLoading] = useState(true);
    const [userStatus, setUserStatus] = useState(null);
    const [userAttempts, setUserAttempts] = useState({});
    const [liveTests, setLiveTests] = useState({});
    const [showFeedbackThanks, setShowFeedbackThanks] = useState(false);

    useEffect(() => {
        if (!userData?.uid) {
            setUserStatus(null);
            setUserAttempts({});
            return;
        }
        const userDocRef = doc(db, 'users', userData.uid);
        const userUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });
        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", userData.uid));
        const attemptsUnsubscribe = onSnapshot(attemptsQuery, (querySnapshot) => {
            const attemptsMap = {};
            querySnapshot.forEach((doc) => {
                const attemptData = doc.data();
                attemptsMap[attemptData.testId] = { id: doc.id, status: attemptData.status };
            });
            setUserAttempts(attemptsMap);
        });
        return () => {
            userUnsubscribe();
            attemptsUnsubscribe();
        };
    }, [userData?.uid]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!userStatus) return;
            setLoading(true);
            try {
                const testsQuery = query(collection(db, 'tests'), where("isPublished", "==", true));
                const testsSnapshot = await getDocs(testsQuery);
                const allPublishedTests = testsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const articlesQuery = collection(db, 'rdfcArticles');
                const articlesSnapshot = await getDocs(articlesQuery);
                const fetchedArticles = {};
                articlesSnapshot.forEach(doc => { fetchedArticles[doc.id] = doc.data(); });
                setLinkedArticles(fetchedArticles);
                const rdfc = allPublishedTests.filter(test => fetchedArticles[test.id]);
                const nonRdfcTests = allPublishedTests.filter(test => !fetchedArticles[test.id]);
                const mocks = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'MOCK');
                const sectionals = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'SECTIONAL');
                const others = nonRdfcTests.filter(t => t.type?.toUpperCase() === 'TEST');
                const sortByDate = (a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
                setRdfcTests(rdfc.sort(sortByDate));
                setMockTests(mocks.sort(sortByDate));
                setSectionalTests(sectionals.sort(sortByDate));
                setOtherAddOnTests(others.sort(sortByDate));
            } catch (error) {
                console.error("Error fetching dashboard data: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [userStatus]);

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

    const renderTestCard = (test) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const isLocked = getIsLocked(test, test.type);
        const attempt = userAttempts[test.id];
        let buttonContent, buttonClass, buttonIcon;

        if (isScheduled) {
            buttonContent = <CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} />;
            buttonClass = "bg-gray-700 cursor-default";
            buttonIcon = <FaHourglassHalf />;
        } else if (isLocked) {
            buttonContent = "Subscribe to Unlock";
            buttonClass = "bg-amber-500 hover:bg-amber-400 text-gray-900";
            buttonIcon = <FaLock />;
        } else if (attempt?.status === 'completed') {
            buttonContent = "View Analysis";
            buttonClass = "bg-green-600 hover:bg-green-700 text-white";
            buttonIcon = <FaEye />;
        } else if (attempt?.status === 'in-progress') {
            buttonContent = "Continue Test";
            buttonClass = "bg-orange-500 hover:bg-orange-600 text-white";
            buttonIcon = <FaPlay />;
        } else {
            buttonContent = "Start Test";
            buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";
            buttonIcon = <FaPlay />;
        }

        const handleButtonClick = () => {
            if (isScheduled) return;
            if (isLocked) navigate('subscription');
            else if (attempt?.status === 'completed') navigate('results', { attemptId: attempt.id });
            else if (attempt?.status === 'in-progress') navigate('test', { testId: test.id });
            else navigate('test', { testId: test.id });
        };
        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg shadow-md p-6 flex flex-col justify-between transition-all duration-300 border-l-4 ${isLocked ? 'border-amber-500' : 'border-blue-500'} ${isLocked && !isScheduled ? 'opacity-60' : 'hover:shadow-xl hover:-translate-y-1'}`}>
                <div>
                    <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                    <div className="flex items-center mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${test.type === 'MOCK' ? 'bg-purple-700 text-purple-200' : test.type === 'SECTIONAL' ? 'bg-teal-700 text-teal-200' : 'bg-gray-600 text-gray-400'}`}>{test.type}</span>
                        {isScheduled && <span className="ml-2 inline-block px-2 py-1 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200">Coming Soon</span>}
                    </div>
                    <p className="text-gray-400 mt-2 text-sm">{test.description}</p>
                </div>
                <button onClick={handleButtonClick} className={`mt-4 w-full px-4 py-3 rounded-md font-semibold transition-colors flex items-center justify-center space-x-2 ${buttonClass}`}>
                    {buttonIcon}
                    <span>{buttonContent}</span>
                </button>
            </div>
        );
    };
    
    const renderRDFCArticleRow = (test) => {
        const article = linkedArticles[test.id];
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        const renderButtons = () => {
            const articleIsLocked = getIsLocked(test, 'rdfc_article');
            const testIsLocked = getIsLocked(test, 'rdfc_test');
            const isArticleRead = userStatus?.readArticles?.[test.id];
            const getButtonState = (type, isLocked) => {
                 if (isLocked) return { text: "Unlock", action: () => navigate('subscription'), className: "bg-amber-500 hover:bg-amber-400 text-gray-900", disabled: false, icon: <FaLock /> };
                 if (type === 'article' && article) {
                    if (isArticleRead) return { text: "Article Read", action: () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id }), className: "bg-gray-600 hover:bg-gray-700 text-gray-300", disabled: false, icon: <FaCheckCircle /> };
                    return { text: "View Article", action: () => handleViewArticle(article.url, test.id), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false, icon: <FaBookOpen /> };
                }
                if (type === 'test' && article) {
                    const attempt = userAttempts[test.id];
                    if (attempt?.status === 'completed') return { text: "View Analysis", action: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 hover:bg-green-700 text-white", disabled: false, icon: <FaEye /> };
                    if (attempt?.status === 'in-progress') return { text: "Continue Test", action: () => navigate('test', { testId: test.id }), className: "bg-orange-500 hover:bg-orange-600 text-white", disabled: false, icon: <FaPlay /> };
                    return { text: "Start Test", action: () => navigate('test', { testId: test.id }), className: "bg-blue-600 hover:bg-blue-700 text-white", disabled: false, icon: <FaPlay /> };
                }
                return { text: "N/A", action: null, className: "bg-gray-700 text-gray-500 cursor-not-allowed", disabled: true, icon: null };
            };
            const articleButton = getButtonState('article', articleIsLocked);
            const testButton = getButtonState('test', testIsLocked);
            return (
                <div className="flex space-x-2">
                    <button onClick={articleButton.action} disabled={articleButton.disabled} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${articleIsLocked ? 'opacity-60' : ''} ${articleButton.className}`}>{articleButton.icon} <span>{articleButton.text}</span></button>
                    <button onClick={testButton.action} disabled={testButton.disabled} className={`flex-1 text-sm font-semibold px-3 py-2 rounded-md transition-colors flex items-center justify-center space-x-2 ${testIsLocked ? 'opacity-60' : ''} ${testButton.className}`}>{testButton.icon} <span>{testButton.text}</span></button>
                </div>
            );
        };
        return (
            <div key={test.id} className={`bg-gray-800 rounded-lg p-4 mb-4 border-l-4 border-purple-500`}>
                <h4 className="text-lg font-semibold text-white">{test.title}</h4>
                <p className="text-sm text-gray-400 mt-1 mb-2">{article ? article.name : 'N/A'}</p>
                <p className="text-xs text-gray-500 mb-4 h-8 overflow-hidden">{article ? article.description : 'N/A'}</p>
                {isScheduled ? <div className="mt-2"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div> : renderButtons()}
            </div>
        );
    };

    const renderUserStatus = () => {
        if (!userStatus) return null;
        if (userStatus.isSubscribed) {
            return (
                <div className="flex items-center space-x-2">
                    <style jsx>{` @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } } .premium-badge { background: linear-gradient(90deg, #ffde5e, #ffef97, #ffde5e); background-size: 200% 100%; animation: shine 4s linear infinite; color: #2d3748; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.2); } `}</style>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold premium-badge">Premium Member</span>
                    {userStatus.planName && <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-800 text-blue-100">{userStatus.planName}</span>}
                </div>
            );
        } else {
            return <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-700 text-gray-300">Standard User</span>;
        }
    };

    const renderTestSection = (title, tests, contentType) => {
        if (tests.length === 0) return null;
        const freeTests = tests.filter(t => t.isFree);
        const paidTests = tests.filter(t => !t.isFree);
        return (
            <div className="border-t border-gray-700 pt-8 mb-12">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-400">{title}</h2>
                    {tests.length > 6 && (<button onClick={() => navigate('allTests', { tests, title: `All ${title}`, contentType })} className="text-sm font-semibold text-gray-400 hover:text-white">View All &rarr;</button>)}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {freeTests.slice(0, 3).map(test => renderTestCard(test))}
                    {paidTests.slice(0, 3).map(test => renderTestCard(test))}
                </div>
            </div>
        );
    };

    const handleFeedbackSuccess = () => {
        setShowFeedbackThanks(true);
    };

    if (loading || !userStatus) {
        return <div className="text-center text-gray-400 p-8">Loading Dashboard...</div>;
    }
    
    const freeRdfcTests = rdfcTests.filter(t => t.isFree);
    const paidRdfcTests = rdfcTests.filter(t => !t.isFree);
    const hasAnyRdfcAccess = userStatus?.accessControl?.rdfc_articles || userStatus?.accessControl?.rdfc_tests;

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                 <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 sm:mb-0">User Dashboard</h2>
                 {renderUserStatus()}
            </div>

            <div className="mb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <ExamCountdownWidget title="Countdown to CAT 2025" targetDate="2025-11-29T23:59:59" />
                    <ExamCountdownWidget title="Countdown to XAT 2026" targetDate="2026-01-03T23:59:59" />
                    <VocabCardWidget />
                </div>
            </div>

            {[
                { title: "Free RDFC Articles & Tests", tests: freeRdfcTests, sectionLocked: false },
                { title: "Premium RDFC Articles & Tests", tests: paidRdfcTests, sectionLocked: !userStatus.isSubscribed || !hasAnyRdfcAccess }
            ].map((section, index) => (
                section.tests.length > 0 && 
                <div key={section.title} className={`${index > 0 ? 'border-t border-gray-700 pt-8' : ''} mb-12`}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h3 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-400 mb-2 md:mb-0">{section.title}</h3>
                        {section.sectionLocked && <button onClick={() => navigate('subscription')} className="bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400 shadow transition-all transform hover:scale-105 self-start md:self-center">Subscribe Now to Unlock</button>}
                    </div>
                    <div className="hidden md:block bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
                        <table className="min-w-full divide-y divide-gray-700">
                           <thead className="bg-gray-700/50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Title</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Article Link</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Test Link</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {section.tests.slice(0, 3).map(test => {
                                    const article = linkedArticles[test.id];
                                    const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
                                    const renderCellContent = (type) => {
                                        if (isScheduled) {
                                            return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({...prev, [test.id]: true}))} /></div>;
                                        }
                                        const isLocked = getIsLocked(test, `rdfc_${type}`);
                                        const isArticleRead = userStatus?.readArticles?.[test.id];
                                        let text, action, className, disabled = !article, icon;
                                        if(isLocked) {
                                            text = "Unlock";
                                            action = () => navigate('subscription');
                                            className = "bg-amber-500 hover:bg-amber-400 text-gray-900";
                                            icon = <FaLock />;
                                        } else if(type === 'article') {
                                            if(isArticleRead) {
                                                text = "Article Read";
                                                action = () => navigate('rdfcArticleViewer', { articleUrl: article.url, testId: test.id });
                                                className = "bg-gray-600 hover:bg-gray-700 text-gray-300";
                                                icon = <FaCheckCircle />;
                                            } else {
                                                text = "View Article";
                                                action = () => handleViewArticle(article.url, test.id);
                                                className = "bg-blue-600 hover:bg-blue-700 text-white";
                                                icon = <FaBookOpen />;
                                            }
                                        } else { // type === 'test'
                                            const attempt = userAttempts[test.id];
                                            if (attempt?.status === 'completed') {
                                                text = "View Analysis";
                                                action = () => navigate('results', { attemptId: attempt.id });
                                                className = "bg-green-600 hover:bg-green-700 text-white";
                                                icon = <FaEye />;
                                            } else if (attempt?.status === 'in-progress') {
                                                text = "Continue Test";
                                                action = () => navigate('test', { testId: test.id });
                                                className = "bg-orange-500 hover:bg-orange-600 text-white";
                                                icon = <FaPlay />;
                                            } else {
                                                text = "Start Test";
                                                action = () => navigate('test', { testId: test.id });
                                                className = "bg-blue-600 hover:bg-blue-700 text-white";
                                                icon = <FaPlay />;
                                            }
                                        }
                                        return <button onClick={action} disabled={disabled} className={`text-xs px-3 py-1 rounded-full w-40 h-10 flex items-center justify-center space-x-2 ${className} ${isLocked ? 'opacity-60' : ''}`}>{icon} <span>{text}</span></button>;
                                    };
                                    return (
                                        <tr key={test.id} className="hover:bg-gray-700/50">
                                            <td className="px-6 py-4 text-sm font-medium text-white"><div className="flex items-center"><span>{test.title}</span> {isScheduled && <span className="ml-2 text-xs font-semibold rounded-full bg-cyan-700 text-cyan-200 px-2 py-1">Coming Soon</span>}</div></td>
                                            <td className="px-6 py-4 text-sm text-gray-400">{article ? article.name : 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm">{renderCellContent('article')}</td>
                                            <td className="px-6 py-4 text-sm">{renderCellContent('test')}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="md:hidden">
                        {section.tests.slice(0, 3).map(test => renderRDFCArticleRow(test))}
                    </div>
                    {section.tests.length > 3 && (
                        <div className="text-center mt-4">
                            <button onClick={() => navigate('allTests', { tests: section.tests.map(t => ({...t, article: linkedArticles[t.id]})), title: section.title, contentType: 'rdfc' })} className="text-sm font-semibold text-gray-400 hover:text-white">View All &rarr;</button>
                        </div>
                    )}
                </div>
            ))}

            {renderTestSection("Add-On Tests", otherAddOnTests, 'test')}
            {renderTestSection("Sectional Tests", sectionalTests, 'sectional')}
            {renderTestSection("Mock Tests", mockTests, 'mock')}

            <div className="border-t border-gray-700 pt-8 mb-12">
                {showFeedbackThanks ? (
                    <div className="bg-gray-800 border-l-4 border-green-500 text-white p-6 rounded-lg shadow-lg my-8 text-center">
                        <h3 className="text-xl font-bold">Thank You!</h3>
                        <p className="text-gray-300 mt-2">Your feedback is valuable to us and helps improve the platform for everyone.</p>
                    </div>
                ) : (
                    <FeedbackForm userStatus={userStatus} onSuccessfulSubmit={handleFeedbackSuccess} />
                )}
            </div>
        </div>
    );
};

export default UserDashboard;