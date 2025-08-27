import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { FaEye, FaLock, FaPlay, FaCheckCircle, FaBookOpen, FaArrowLeft } from 'react-icons/fa';

// --- HELPER COMPONENTS ---

const CountdownTimer = ({ targetDate, onComplete }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};
        if (difference > 0) {
            timeLeft = {
                D: Math.floor(difference / (1000 * 60 * 60 * 24)),
                H: Math.floor((difference / (1000 * 60 * 60)) % 24),
                M: Math.floor((difference / 1000 / 60) % 60),
                S: Math.floor((difference / 1000) % 60)
            };
        }
        return timeLeft;
    };
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
    useEffect(() => {
        const timer = setTimeout(() => {
            const newTimeLeft = calculateTimeLeft();
            setTimeLeft(newTimeLeft);
            if (!Object.keys(newTimeLeft).length) onComplete();
        }, 1000);
        return () => clearTimeout(timer);
    });
    const timerComponents = Object.entries(timeLeft).map(([interval, value]) => (
        <div key={interval} className="flex flex-col items-center mx-1">
            <span className="font-mono text-lg font-bold">{String(value).padStart(2, '0')}</span>
            <span className="text-xs opacity-70">{interval}</span>
        </div>
    ));
    return (
        <div className="flex justify-center items-center text-white w-full h-full bg-cyan-800/50 rounded-md p-2">
            {timerComponents.length ? timerComponents : <span className="font-semibold text-sm">Loading...</span>}
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

const AllTestsPage = ({ navigate, tests: initialTests = [], title, contentType }) => {
    const { userData } = useAuth();
    const [userAttempts, setUserAttempts] = useState({});
    const [userStatus, setUserStatus] = useState(null);
    const [liveTests, setLiveTests] = useState({});
    const [visibleCount, setVisibleCount] = useState(10);

    useEffect(() => {
        if (!userData?.uid) return;
        const unsub = onSnapshot(doc(db, 'users', userData.uid), (docSnap) => {
            setUserStatus(docSnap.exists() ? docSnap.data() : null);
        });
        return unsub;
    }, [userData?.uid]);

    useEffect(() => {
        if (!userData?.uid) return;
        const q = query(collection(db, "attempts"), where("userId", "==", userData.uid));
        const unsub = onSnapshot(q, (snapshot) => {
            const attemptsMap = snapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                acc[data.testId] = { id: doc.id, status: data.status };
                return acc;
            }, {});
            setUserAttempts(attemptsMap);
        });
        return unsub;
    }, [userData?.uid]);
    
    useEffect(() => {
        const checkLiveStatus = () => {
            const now = new Date().getTime();
            const newLiveTests = {};
            initialTests.forEach(test => {
                if (test.liveAt?.toDate().getTime() <= now) {
                    newLiveTests[test.id] = true;
                }
            });
            setLiveTests(newLiveTests);
        };
        const interval = setInterval(checkLiveStatus, 1000 * 60);
        checkLiveStatus();
        return () => clearInterval(interval);
    }, [initialTests]);

    const sortedTests = useMemo(() => {
        return [...initialTests].sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            return (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0);
        });
    }, [initialTests]);

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
            case '10MIN': return !access.ten_min_tests; 
            default: return true;
        }
    };

    const handleViewArticle = async (articleUrl, testId) => {
        if (!userData?.uid) return;
        try {
            await updateDoc(doc(db, 'users', userData.uid), { [`readArticles.${testId}`]: true });
            navigate('rdfcArticleViewer', { articleUrl, testId });
        } catch (error) {
            console.error("Error marking article as read:", error);
        }
    };
    
    const renderCellContent = (test, type) => {
        const isScheduled = test.liveAt && test.liveAt.toDate() > new Date() && !liveTests[test.id];
        if (isScheduled) return <div className="w-full h-10 flex items-center justify-center"><CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setLiveTests(prev => ({ ...prev, [test.id]: true }))} /></div>;

        const isLocked = getIsLocked(test, type);
        let props;

        if (isLocked) {
            props = { icon: <FaLock />, text: "Unlock", onClick: () => navigate('subscription'), className: "bg-amber-500 text-gray-900 hover:bg-amber-400" };
        } else {
             if (type === 'rdfc_article') {
                const isArticleRead = userStatus?.readArticles?.[test.id];
                props = isArticleRead 
                    ? { icon: <FaCheckCircle />, text: "Read", onClick: () => navigate('rdfcArticleViewer', { articleUrl: test.article.url, testId: test.id }), className: "bg-gray-600 text-gray-300 hover:bg-gray-500" }
                    : { icon: <FaBookOpen />, text: "View Article", onClick: () => handleViewArticle(test.article.url, test.id), className: "bg-sky-600 text-white hover:bg-sky-500" };
            } else {
                const attempt = userAttempts[test.id];
                if (attempt?.status === 'completed') props = { icon: <FaEye />, text: "Analysis", onClick: () => navigate('results', { attemptId: attempt.id }), className: "bg-green-600 text-white hover:bg-green-500" };
                else if (attempt?.status === 'in-progress') props = { icon: <FaPlay />, text: "Continue", onClick: () => navigate('test', { testId: test.id }), className: "bg-orange-500 text-white hover:bg-orange-400" };
                else props = { icon: <FaPlay />, text: "Start Test", onClick: () => navigate('test', { testId: test.id }), className: "bg-blue-600 text-white hover:bg-blue-500" };
            }
        }
        return <button onClick={props.onClick} disabled={contentType === 'rdfc' && !test.article} className={`text-xs px-3 py-1 rounded-full w-36 h-9 flex items-center justify-center space-x-2 font-semibold ${props.className}`}>{props.icon} <span>{props.text}</span></button>;
    };

    const renderRDFCDesktopRow = (test) => {
        const { article } = test;
        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-sm"><div className="flex items-center"><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 font-semibold">{test.title}</span>{test.isFree && <span className="ml-2 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}</div></td>
                <td className="px-6 py-4 text-sm text-gray-300">{article?.name || 'N/A'}</td>
                <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{article?.description || 'N/A'}</td>
                <td className="px-6 py-4 text-sm">{renderCellContent(test, 'rdfc_article')}</td>
                <td className="px-6 py-4 text-sm">{renderCellContent(test, 'rdfc_test')}</td>
            </tr>
        );
    };

    const renderRdfcMobileRow = (test) => {
        const { article } = test;
        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col items-start space-y-1">
                        <span className="text-sm font-semibold text-white">{test.title}</span>
                        <span className="text-xs text-gray-400">{article?.name || 'N/A'}</span>
                        {test.isFree && <span className="text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                    </div>
                </td>
                <td className="px-4 py-3 text-sm flex flex-col space-y-2">
                    {renderCellContent(test, 'rdfc_article')}
                    {renderCellContent(test, 'rdfc_test')}
                </td>
            </tr>
        );
    };
    
    const renderAddOnDesktopRow = (test) => {
        const typeColors = { MOCK: 'bg-purple-700 text-purple-200', SECTIONAL: 'bg-teal-700 text-teal-200', TEST: 'bg-gray-600 text-gray-300', '10MIN': 'bg-rose-700 text-rose-200' };
        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4 text-sm"><div className="flex items-center"><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-semibold">{test.title}</span>{test.isFree && <span className="ml-2 text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}</div></td>
                <td className="px-6 py-4 text-sm text-gray-400"><span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${typeColors[test.type.toUpperCase()] || typeColors.TEST}`}>{test.type}</span></td>
                <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">{test.description}</td>
                <td className="px-6 py-4 text-sm">{renderCellContent(test, test.type)}</td>
            </tr>
        );
    };
    
    const renderAddOnMobileRow = (test) => {
        const typeColors = { MOCK: 'bg-purple-700 text-purple-200', SECTIONAL: 'bg-teal-700 text-teal-200', TEST: 'bg-gray-600 text-gray-300', '10MIN': 'bg-rose-700 text-rose-200' };
        return (
            <tr key={test.id} className="hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm">
                    <div className="flex flex-col items-start space-y-1">
                        <span className="text-sm font-semibold text-white">{test.title}</span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${typeColors[test.type.toUpperCase()] || typeColors.TEST}`}>{test.type}</span>
                        {test.isFree && <span className="text-xs font-semibold rounded-full bg-green-700 text-green-200 px-2 py-1">Free</span>}
                    </div>
                </td>
                <td className="px-4 py-3 text-sm">
                    {renderCellContent(test, test.type)}
                </td>
            </tr>
        );
    };
    
    if (!userStatus) return <div className="text-center text-gray-400 p-8">Loading User Data...</div>;
    
    const isPaidContentPresent = initialTests.some(test => !test.isFree);
    const showUnlockBanner = !userStatus.isSubscribed && isPaidContentPresent;
    
    const renderDesktopTable = (headers, renderRow) => (
        <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                    <tr>
                        {headers.map(h => <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {sortedTests.slice(0, visibleCount).map(test => renderRow(test))}
                </tbody>
            </table>
            {sortedTests.length > visibleCount && (
                <div className="p-4 bg-gray-800 text-center">
                    <button onClick={() => setVisibleCount(prev => prev + 10)} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                        Load more...
                    </button>
                </div>
            )}
        </div>
    );
    
    const renderMobileTable = (headers, renderRow) => (
        <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-700">
             <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700/50">
                    <tr>
                        {headers.map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{h}</th>)}
                    </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {sortedTests.slice(0, visibleCount).map(test => renderRow(test))}
                </tbody>
            </table>
            {sortedTests.length > visibleCount && (
                <div className="p-4 bg-gray-800 text-center">
                    <button onClick={() => setVisibleCount(prev => prev + 10)} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                        Load more...
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">{title}</h1>
                <button onClick={() => navigate('home')} className="bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-all flex items-center space-x-2"><FaArrowLeft /><span>Dashboard</span></button>
            </div>
            
            {showUnlockBanner && (
                <div className="mb-8 p-5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 text-center flex flex-col sm:flex-row items-center justify-center sm:justify-between shadow-lg">
                    <p className="text-lg font-bold text-white mb-2 sm:mb-0">Unlock Your Full Potential! Access all premium content now.</p>
                    <button onClick={() => navigate('subscription')} className="bg-white text-amber-700 px-6 py-2 rounded-md font-bold hover:bg-gray-200 transition-transform transform hover:scale-105">Subscribe Now</button>
                </div>
            )}

            <div className="hidden md:block">
                {sortedTests.length > 0 ? (
                    contentType === 'rdfc'
                    ? renderDesktopTable(['Title', 'Article Name', 'Article Description', 'Article Action', 'Test Action'], renderRDFCDesktopRow)
                    : renderDesktopTable(['Title', 'Type', 'Description', 'Action'], renderAddOnDesktopRow)
                ) : ( <div className="text-center text-gray-500 p-12 bg-gray-800 rounded-lg"><p>No tests available in this category yet.</p></div> )}
            </div>

            <div className="md:hidden">
                {sortedTests.length > 0 ? (
                    contentType === 'rdfc'
                    ? renderMobileTable(['Details', 'Actions'], renderRdfcMobileRow)
                    : renderMobileTable(['Details', 'Action'], renderAddOnMobileRow)
                ) : ( <div className="text-center text-gray-500 p-12 bg-gray-800 rounded-lg"><p>No tests available in this category yet.</p></div> )}
            </div>
        </div>
    );
};

export default AllTestsPage;
