import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user, userData } = useAuth();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
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

    useEffect(() => {
        const fetchTest = async () => {
            if (!testId) return;
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

    const handleStartTest = () => {
        if (test) {
            navigate('test', { testId: test.id });
        }
    };

    if (loading) {
        return <div className="text-center text-gray-400">Loading article and test...</div>;
    }

    if (!user) {
        return <div className="text-center text-gray-400">Please sign in to view this content.</div>;
    }

    if (!userData?.isSubscribed && test && !test.isFree) {
        return (
            <div className="text-center text-gray-400">
                <p className="text-xl mb-4">This content is for premium users only.</p>
                <button onClick={() => navigate('subscription')} className="bg-amber-500 text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-amber-400">
                    Subscribe Now
                </button>
            </div>
        );
    }

    return (
        <div ref={viewerContainerRef} className="bg-gray-900 text-white p-4 h-screen flex flex-col font-sans">
            <div className="flex-1 flex flex-col md:flex-row gap-4">
                <div className="md:w-3/4 bg-gray-800 shadow-md rounded-lg p-4 flex-1 overflow-y-auto relative">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">RDFC Article</h2>
                        <button onClick={handleFullscreen} title="Toggle Fullscreen" className="text-gray-400 hover:text-white">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m0 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m0 0v-4m0 4l-5-5"></path></svg>
                        </button>
                    </div>
                    {/* Embedded PDF viewer for Google Drive */}
                    <iframe
                        src={articleUrl.replace('/view', '/preview')}
                        className="w-full h-full"
                        frameBorder="0"
                        allowFullScreen
                    ></iframe>
                </div>
                <div className="md:w-1/4 bg-gray-800 text-white shadow-md rounded-lg p-4 flex flex-col">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold mb-2">Test Details</h2>
                        {test ? (
                            <div>
                                <p className="text-lg font-semibold">{test.title}</p>
                                <p className="text-sm text-gray-400 mt-2">{test.description}</p>
                                <p className="text-sm text-gray-400 mt-2">Duration: {test.sections[0]?.duration} minutes</p>
                            </div>
                        ) : (
                            <p className="text-gray-400">No corresponding test found.</p>
                        )}
                    </div>
                    <button 
                        onClick={handleStartTest} 
                        className="mt-4 w-full bg-white text-gray-900 px-4 py-2 rounded-md font-semibold hover:bg-gray-200 transition-all transform hover:scale-105"
                        disabled={!test}
                    >
                        Start Test
                    </button>
                    <button 
                        onClick={() => navigate('home')} 
                        className="mt-2 w-full bg-gray-700 text-white px-4 py-2 rounded-md font-semibold hover:bg-gray-600 transition-all transform hover:scale-105"
                    >
                        &larr; Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RDFCArticleViewer;
