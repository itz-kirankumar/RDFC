import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc, onSnapshot, query, collection, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userAttempt, setUserAttempt] = useState(null); // FIX: New state for real-time attempt status
    const viewerContainerRef = useRef(null);

    const handleFullscreen = useCallback(() => {
        if (viewerContainerRef.current) {
            if (!document.fullscreenElement) {
                viewerContainerRef.current.requestFullscreen().catch(err => {
                    console.error(`Fullscreen Error: ${err.message} (${err.name})`);
                });
            } else {
                document.exitFullscreen();
            }
        }
    }, []);

    // Effect for fetching static test data
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

    // FIX: New dedicated useEffect to get the real-time status of this specific test attempt
    useEffect(() => {
        if (!user?.uid || !testId) {
            return;
        }

        const attemptsQuery = query(collection(db, "attempts"), where("userId", "==", user.uid), where("testId", "==", testId));
        const unsubscribe = onSnapshot(attemptsQuery, (querySnapshot) => {
            if (!querySnapshot.empty) {
                // An attempt for this test exists
                const attemptDoc = querySnapshot.docs[0];
                setUserAttempt({
                    id: attemptDoc.id,
                    status: attemptDoc.data().status
                });
            } else {
                // No attempt for this test exists
                setUserAttempt(null);
            }
        });

        return () => unsubscribe(); // Cleanup the listener
    }, [testId, user?.uid]);

    
    if (!user || (!userData?.isSubscribed && test && !test.isFree)) {
        return (
            <div className="text-center text-gray-400 p-8 flex flex-col items-center justify-center min-h-[50vh]">
                <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
                <p className="text-lg mb-4">This content is for premium users only.</p>
                <button
                    onClick={() => navigate('subscription')}
                    className="bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400 transition-all transform hover:scale-105"
                >
                    Subscribe Now
                </button>
            </div>
        );
    }

    if (loading) {
        return <div className="text-center text-gray-400 p-8">Loading article and test...</div>;
    }

    // FIX: New logic to determine button text, action, and color based on real-time status
    let buttonText;
    let buttonAction;
    let buttonClass;

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

    return (
        <div ref={viewerContainerRef} className="bg-gray-900 text-white min-h-screen p-4 flex flex-col font-sans">
            <div className="flex-1 flex flex-col md:flex-row gap-4 max-w-7xl mx-auto w-full">
                {/* PDF Viewer Panel */}
                <div className="md:w-2/3 bg-gray-800 shadow-md rounded-lg p-4 flex flex-col full-screen-flex max-h-[calc(100vh-120px)]">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">RDFC Article</h2>
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                        </button>
                    </div>
                    <iframe
                        src={articleUrl.replace('/view', '/preview')}
                        className="w-full flex-1"
                        style={{ minHeight: '500px' }}
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                </div>

                {/* Test Details and Navigation Panel */}
                <div className="md:w-1/3 bg-gray-800 text-white shadow-md rounded-lg p-4 flex flex-col full-screen-hide max-h-[calc(100vh-120px)] overflow-y-auto">
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
                                                <p key={index} className="text-gray-300">
                                                    <span className="font-semibold">{section.name}:</span> {section.duration} minutes ({section.questions.length} questions)
                                                </p>
                                            ))}
                                            <p className="text-gray-300">
                                                <span className="font-semibold">Test Duration:</span> {test.sections.reduce((acc, sec) => acc + sec.duration, 0)} minutes
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-400">No corresponding test found.</p>
                        )}
                    </div>
                    
                    {/* Navigation Buttons */}
                    <div className="mt-4 flex flex-col space-y-2">
                        <button
                            onClick={buttonAction}
                            className={`w-full px-4 py-3 rounded-md font-bold transition-all transform hover:scale-105 ${buttonClass}`}
                            disabled={!test}
                        >
                            {buttonText}
                        </button>
                        <button
                            onClick={() => navigate('home')}
                            className="w-full bg-gray-700 text-white px-4 py-3 rounded-md font-semibold hover:bg-gray-600 transition-all transform hover:scale-105"
                        >
                            &larr; Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
             <style jsx>{`
                :fullscreen .full-screen-flex {
                    width: 100% !important;
                    height: 100vh;
                    max-height: 100vh;
                    flex-basis: 100% !important;
                    margin: 0;
                    padding: 0;
                    border: 2px solid #374151;
                }
                 :fullscreen .full-screen-flex iframe {
                    width: 100%;
                    height: 100%;
                    min-height: 100vh;
                }
                :fullscreen .full-screen-hide {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default RDFCArticleViewer;