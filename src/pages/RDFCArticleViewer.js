import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAttempt, setUserAttempt] = useState(null);
    const [mobileView, setMobileView] = useState('article');
    const [isDetailsVisible, setIsDetailsVisible] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const viewerContainerRef = useRef(null);

    const handleFullscreen = useCallback(() => {
        const elem = viewerContainerRef.current;
        if (!elem) return;

        if (!document.fullscreenElement) {
            elem.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    useEffect(() => {
        const fetchTest = async () => {
            if (!testId) return;
            setLoading(true);
            try {
                const testRef = doc(db, 'tests', testId);
                const testSnap = await getDoc(testRef);
                if (testSnap.exists()) {
                    setTest({ id: testSnap.id, ...testSnap.data() });
                }
            } catch (error) {
                console.error("Error fetching test details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTest();
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

    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading article and test...</div>;
    }

    if (!user || (!userData?.isSubscribed && test && !test.isFree)) {
        return (
            <div className="text-center text-gray-400 p-8 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p className="text-lg mb-4">This content is for premium users only.</p>
                <button onClick={() => navigate('subscription')} className="bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400">Subscribe Now</button>
            </div>
        );
    }

    let buttonText, buttonAction, buttonClass;
    if (userAttempt?.status === 'completed') {
        buttonText = "View Analysis";
        buttonAction = () => navigate('results', { attemptId: userAttempt.id });
        buttonClass = "bg-green-600 hover:bg-green-700 text-white";
    } else if (userAttempt?.status === 'in-progress') {
        buttonText = "Continue Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-orange-500 hover:bg-orange-600 text-white";
    } else {
        buttonText = "Start Test";
        buttonAction = () => navigate('test', { testId: test.id });
        buttonClass = "bg-blue-600 hover:bg-blue-700 text-white";
    }

    const actionButton = (
        <button onClick={buttonAction} className={`w-full px-4 py-3 rounded-md font-bold transition-all transform hover:scale-105 ${buttonClass}`} disabled={!test}>{buttonText}</button>
    );

    return (
        <div 
            ref={viewerContainerRef} 
            className={`bg-gray-900 text-white h-screen flex flex-col font-sans ${!isFullScreen ? '-mt-4 md:-mt-6' : ''}`}
        >
            <div className={`flex-shrink-0 bg-gray-800 shadow-md z-20 ${isFullScreen && 'hidden'}`}>
                 <div className="max-w-full mx-auto px-2 sm:px-4 flex justify-between items-center h-12">
                    <h1 className="text-lg md:text-xl font-bold truncate">{test?.title || 'RDFC Article'}</h1>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setIsDetailsVisible(!isDetailsVisible)} 
                            title="Toggle Details Panel" 
                            className="hidden md:inline-flex items-center justify-center px-3 py-1 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white"
                        >
                            {isDetailsVisible ? 'Hide Details' : 'Show Details'}
                        </button>
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                        </button>
                         <button onClick={() => navigate('home')} className="text-sm font-semibold text-gray-300 hover:text-white">&larr; Dashboard</button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row gap-4 max-w-full mx-auto w-full overflow-hidden p-2 md:p-4 md:pt-2">
                <div className={`bg-gray-800 shadow-md rounded-lg flex-1 flex flex-col ${isFullScreen ? 'w-full p-0' : 'md:w-2/3 lg:w-[70%] p-2 md:p-4'} ${mobileView === 'article' ? 'flex' : 'hidden md:flex'}`}>
                    <iframe src={articleUrl.replace('/view', '/preview')} className="w-full h-full rounded-md" frameBorder="0" allowFullScreen></iframe>
                </div>

                <div className={`w-full md:w-1/3 lg:w-[30%] bg-gray-800 text-white shadow-md rounded-lg p-4 flex-col overflow-y-auto ${isFullScreen && 'md:hidden'} ${mobileView === 'details' ? 'flex' : 'hidden'} ${isDetailsVisible ? 'md:flex' : 'md:hidden'}`}>
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

                    <div className={`mt-4 md:hidden ${isFullScreen ? 'block' : 'hidden'}`}>
                        {actionButton}
                    </div>
                </div>
            </div>
            
            <div className={`md:hidden flex-shrink-0`}>
                 <div className={`p-2 bg-gray-800 border-t border-gray-700 ${isFullScreen && 'hidden'}`}>
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