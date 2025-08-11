import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const CountdownTimer = ({ targetDate, onComplete }) => {
    // ... (This component is unchanged)
};

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAttempt, setUserAttempt] = useState(null);
    const [mobileView, setMobileView] = useState('article');
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const viewerContainerRef = useRef(null);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            // FIX: More robust check. If testId is missing, stop loading and show an error.
            if (!testId) {
                console.error("RDFCArticleViewer: testId prop is missing.");
                setLoading(false);
                return;
            }
            
            setLoading(true);
            try {
                // Fetch test details
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    setTest({ id: testSnap.id, ...testSnap.data() });
                }

                // Fetch article details
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

    // ... (Fullscreen hooks and handlers are unchanged)

    // FIX: Add a top-level guard clause to handle missing props gracefully.
    if (!articleUrl || !testId) {
        return (
            <div className="text-center text-red-400 p-8 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold mb-4">Content Error</h1>
                <p className="text-lg">Could not load the article because the required information was not provided.</p>
                <button onClick={() => navigate('home')} className="mt-6 bg-gray-700 text-white px-6 py-2 rounded-md font-semibold hover:bg-gray-600">
                    Return to Dashboard
                </button>
            </div>
        );
    }
    
    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading...</div>;
    }

    // ... (The rest of the component logic for buttons, access denial, and JSX rendering remains the same as the last correct version)

    let buttonContent, buttonAction, buttonClass, buttonDisabled = false;
    
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
    } else if (userAttempt?.status === 'completed') {
        buttonContent = "View Analysis";
        buttonAction = () => navigate('results', { attemptId: userAttempt.id });
        buttonClass = "bg-green-600 hover:bg-green-700 text-white";
    } else if (userAttempt?.status === 'in-progress') {
        buttonContent = "Continue Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-orange-500 hover:bg-orange-600 text-white";
    } else {
        buttonContent = "Start Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";
    }
    
    if (!test) {
        buttonDisabled = true;
    }
    
    const actionButton = (
        <button onClick={buttonAction} className={`w-full px-4 py-3 rounded-md font-bold transition-all transform hover:scale-105 ${buttonClass}`} disabled={buttonDisabled}>
            {buttonContent}
        </button>
    );

    return (
        <div 
            ref={viewerContainerRef} 
            className={`bg-gray-900 text-white h-screen flex flex-col font-sans -mt-8`}
        >
            <div className={`flex-shrink-0 bg-gray-800 shadow-md z-20`}>
                 <div className="max-w-full mx-auto px-2 sm:px-4 flex justify-between items-center h-12">
                    <h1 className="text-lg md:text-xl font-bold truncate">{article?.name || test?.title || 'Article'}</h1>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setIsDetailsVisible(!isDetailsVisible)} 
                            title="Toggle Details Panel" 
                            className="hidden md:inline-flex items-center justify-center px-3 py-1 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white"
                        >
                            {isDetailsVisible ? 'Hide Details' : 'Show Details'}
                        </button>
                         <button onClick={() => navigate('home')} className="text-sm font-semibold text-gray-300 hover:text-white">&larr; Dashboard</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4 max-w-full mx-auto w-full overflow-hidden p-2 md:p-4 md:pt-2">
                <div className={`bg-gray-800 shadow-md rounded-lg flex-1 flex flex-col md:w-2/3 lg:w-[70%] p-2 md:p-4 ${mobileView === 'article' ? 'flex' : 'hidden md:flex'}`}>
                    <iframe src={articleUrl.replace('/view', '/preview')} className="w-full h-full rounded-md" frameBorder="0" allowFullScreen></iframe>
                </div>

                <div className={`w-full md:w-1/3 lg:w-[30%] bg-gray-800 text-white shadow-md rounded-lg p-4 flex-col overflow-y-auto ${mobileView === 'details' ? 'flex' : 'hidden'} ${isDetailsVisible ? 'md:flex' : 'md:hidden'}`}>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2">Test Details</h2>
                        {test ? (
                            <div className="bg-gray-700 p-4 rounded-lg">
                                <p className="text-lg font-semibold">{test.title}</p>
                                <p className="text-sm text-gray-400 mt-2">{test.description}</p>
                                <div className="mt-4 text-sm space-y-1">
                                    {test.sections && (
                                        <>
                                            {test.sections.map((section, index) => (
                                                <p key={index} className="text-gray-300"><span className="font-semibold">{section.name}:</span> {section.duration} mins ({section.questions.length} Qs)</p>
                                            ))}
                                            <p className="text-gray-300 font-bold mt-2">Total Duration: {test.sections.reduce((acc, sec) => acc + sec.duration, 0)} minutes</p>
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
                    <button onClick={() => setMobileView('article')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'article' ? 'bg-gray-700' : ''}`}>Article</button>
                    <button onClick={() => setMobileView('details')} className={`flex-1 py-3 text-sm font-semibold ${mobileView === 'details' ? 'bg-gray-700' : ''}`}>Test Details</button>
                </div>
            </div>
        </div>
    );
};

export default RDFCArticleViewer;