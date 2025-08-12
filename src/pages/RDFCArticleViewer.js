import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaEye, FaLock, FaPlay, FaArrowLeft, FaColumns, FaTimes, FaHourglassHalf, FaExpand, FaCompress } from 'react-icons/fa';


const CountdownTimer = ({ targetDate, onComplete }) => {
    // This component is unchanged
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
            <span className="font-mono text-sm font-semibold">{String(value).padStart(2, '0')}</span>
            <span className="text-xs uppercase block opacity-70">{interval}</span>
        </span>
    ));
    return (
        <div className="flex justify-around items-center text-white w-full h-full bg-gray-700/50 rounded-md py-2">
            {timerComponents.length ? timerComponents : <span className="font-semibold text-sm">Loading...</span>}
        </div>
    );
};

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAttempt, setUserAttempt] = useState(null);
    const [mobileView, setMobileView] = useState('article');
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [isLive, setIsLive] = useState(false);
    
    const [isFullScreen, setIsFullScreen] = useState(false);
    const iframeContainerRef = useRef(null);

    useEffect(() => {
        if (!testId) {
            console.error("RDFCArticleViewer: testId prop is missing.");
            setLoading(false);
            return;
        }
        
        const fetchData = async () => {
            setLoading(true);
            try {
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    setTest({ id: testSnap.id, ...testSnap.data() });
                }

                const articleRef = doc(db, 'rdfcArticles', testId);
                const articleSnap = await getDoc(articleRef);
                if (articleSnap.exists()) {
                    setArticle(articleSnap.data());
                }
            } catch (error) {
                console.error("Error fetching component data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [testId]);

    useEffect(() => {
        if (!user?.uid || !testId) {
            setUserAttempt(null);
            return;
        }
        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", user.uid), where("testId", "==", testId));
        const unsubscribe = onSnapshot(attemptsQuery, (querySnapshot) => {
            if (!querySnapshot.empty) {
                const attemptDoc = querySnapshot.docs[0];
                setUserAttempt({ id: attemptDoc.id, status: attemptDoc.data().status });
            } else {
                setUserAttempt(null);
            }
        });
        return () => unsubscribe();
    }, [testId, user?.uid]);
    
    const handleFullScreenToggle = () => {
        const elem = iframeContainerRef.current;
        if (!elem) return;

        if (!isFullScreen) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) { /* Safari */
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) { /* IE11 */
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    useEffect(() => {
        const onFullScreenChange = () => {
            setIsFullScreen(Boolean(document.fullscreenElement));
        };
        document.addEventListener('fullscreenchange', onFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
    }, []);

    if (!articleUrl || !testId) {
        return (
            <div className="text-center text-red-400 p-8 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold mb-4">Content Error</h1>
                <p className="text-lg">Could not load the article because the required information was not provided.</p>
                <button onClick={() => navigate('home')} className="mt-6 bg-gray-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-600 flex items-center space-x-2">
                    <FaArrowLeft /> <span>Return to Dashboard</span>
                </button>
            </div>
        );
    }
    
    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading Dashboard...</div>;
    }

    let buttonContent, buttonAction, buttonClass, buttonIcon, buttonDisabled = false;
    
    const isScheduled = test?.liveAt && test.liveAt.toDate() > new Date();
    const isTestLocked = test && !test.isFree && (!userData?.isSubscribed || !userData?.accessControl?.rdfc_tests);

    if (isScheduled && !isLive) {
        buttonContent = <CountdownTimer targetDate={test.liveAt.toDate()} onComplete={() => setIsLive(true)} />;
        buttonAction = () => {};
        buttonClass = "bg-gray-700 cursor-default";
        buttonDisabled = true;
    } else if (isTestLocked) {
        buttonContent = "Subscribe to Unlock";
        buttonAction = () => navigate('subscription');
        buttonClass = "bg-amber-500 hover:bg-amber-400 text-gray-900";
        buttonIcon = <FaLock />;
    } else if (userAttempt?.status === 'completed') {
        buttonContent = "View Analysis";
        buttonAction = () => navigate('results', { attemptId: userAttempt.id });
        buttonClass = "bg-green-600 hover:bg-green-700 text-white";
        buttonIcon = <FaEye />;
    } else if (userAttempt?.status === 'in-progress') {
        buttonContent = "Continue Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-orange-500 hover:bg-orange-600 text-white";
        buttonIcon = <FaPlay />;
    } else {
        buttonContent = "Start Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";
        buttonIcon = <FaPlay />;
    }
    
    if (!test) {
        buttonDisabled = true;
    }
    
    const actionButton = (
        <button onClick={buttonAction} className={`w-full px-4 py-3 rounded-md font-bold transition-all transform hover:scale-105 flex items-center justify-center space-x-2 ${buttonClass}`} disabled={buttonDisabled}>
            {isScheduled && !isLive ? <FaHourglassHalf /> : buttonIcon}
            <span>{buttonContent}</span>
        </button>
    );

    return (
        <div className={`bg-gray-900 text-white h-screen flex flex-col font-sans -mt-8`}>
            <div className={`flex-shrink-0 bg-gray-800 border-b border-gray-700 shadow-md z-20`}>
                 <div className="max-w-full mx-auto px-2 sm:px-4 flex justify-between items-center h-12">
                    <h1 className="text-lg md:text-xl font-bold truncate text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-400">{article?.name || test?.title || 'Article'}</h1>
                    <div className="flex items-center space-x-2 md:space-x-4">
                        <button 
                            onClick={() => setIsDetailsVisible(!isDetailsVisible)} 
                            title="Toggle Details Panel" 
                            className="hidden md:inline-flex items-center justify-center p-2 text-lg font-semibold text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 hover:text-white"
                        >
                            {isDetailsVisible ? <FaTimes /> : <FaColumns />}
                        </button>

                        <button
                            onClick={handleFullScreenToggle}
                            title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                            // UPDATED: Changed 'hidden md:inline-flex' to 'inline-flex' to make it visible on mobile
                            className="inline-flex items-center justify-center p-2 text-lg font-semibold text-gray-300 bg-gray-700 rounded-full hover:bg-gray-600 hover:text-white"
                        >
                            {isFullScreen ? <FaCompress /> : <FaExpand />}
                        </button>

                         <button onClick={() => navigate('home')} className="flex items-center space-x-2 text-sm font-semibold text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md">
                            <FaArrowLeft />
                            <span className="hidden md:inline">Dashboard</span>
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 max-w-full mx-auto w-full overflow-hidden p-2 md:p-4 md:pt-2">
                <div ref={iframeContainerRef} className={`bg-gray-800 shadow-lg rounded-lg flex-1 flex flex-col w-full p-1 md:p-2 ${mobileView === 'article' ? 'flex' : 'hidden md:flex'}`}>
                    <iframe 
                        src={articleUrl} 
                        className="w-full h-full rounded-md" 
                        frameBorder="0" 
                        allow="autoplay; encrypted-media" 
                        allowFullScreen>
                    </iframe>
                </div>


                <div className={`w-full md:w-1/3 lg:w-[30%] bg-gray-800 text-white shadow-lg rounded-lg p-4 flex-col overflow-y-auto ${mobileView === 'details' ? 'flex' : 'hidden'} ${isDetailsVisible ? 'md:flex' : 'md:hidden'}`}>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-blue-400">Test Details</h2>
                        {test ? (
                            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                                <p className="text-lg font-semibold text-white">{test.title}</p>
                                <p className="text-sm text-gray-400 mt-2">{test.description}</p>
                                <div className="mt-4 text-sm space-y-2 border-t border-gray-600 pt-3">
                                    {test.sections && (
                                        <>
                                            {test.sections.map((section, index) => (
                                                <div key={index} className="flex justify-between items-center text-gray-300">
                                                    <span><span className="font-semibold text-white">{section.name}:</span> {section.questions.length} Qs</span>
                                                    <span className="font-mono bg-gray-600 px-2 py-1 rounded text-xs">{section.duration} mins</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center font-bold mt-2 pt-2 border-t border-gray-600">
                                                <span className="text-white">Total:</span>
                                                <span className="font-mono bg-blue-600 px-2 py-1 rounded text-xs">{test.sections.reduce((acc, sec) => acc + sec.duration, 0)} minutes</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">No corresponding test found.</p>
                        )}
                    </div>
                    
                    <div className="mt-4 hidden md:flex flex-col space-y-2">
                        {actionButton}
                    </div>
                </div>
            </div>
            
            <div className={`md:hidden flex-shrink-0`}>
                 <div className={`p-2 bg-gray-800 border-t border-gray-700`}>
                    {actionButton}
                </div>
                <div className="flex justify-around bg-black text-white shadow-inner">
                    <button onClick={() => setMobileView('article')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${mobileView === 'article' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Article</button>
                    <button onClick={() => setMobileView('details')} className={`flex-1 py-3 text-sm font-semibold transition-colors ${mobileView === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>Test Details</button>
                </div>
            </div>
        </div>
    );
};

export default RDFCArticleViewer;