import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaArrowLeft, FaExpand } from 'react-icons/fa';

const RDFCArticleViewer = ({ navigate, articleUrl, testId }) => {
    const { user } = useAuth();
    const [test, setTest] = useState(null);
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const viewerRef = useRef(null);

    // Detect full-screen changes
    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullScreen(
                !!document.fullscreenElement ||
                !!document.webkitFullscreenElement ||
                !!document.msFullscreenElement
            );
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('msfullscreenchange', handleFullScreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
            document.removeEventListener('msfullscreenchange', handleFullScreenChange);
        };
    }, []);

    // Fetch test and article data
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

    const handleFullScreenToggle = () => {
        const elem = viewerRef.current;
        if (!elem) return;
        if (!isFullScreen) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        }
    };

    const exitFullscreen = () => {
        if (document.exitFullscreen) {
            return document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            return document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            return document.msExitFullscreen();
        }
        return Promise.reject('Fullscreen API not supported');
    };

    const handleBack = () => {
        if (isFullScreen) {
            exitFullscreen().catch(err => console.error('Error exiting fullscreen:', err));
        }
        navigate('home');
    };

    if (!articleUrl || !testId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-center px-6 overflow-hidden">
                <h1 className="text-3xl font-bold text-red-400 mb-3">Content Error</h1>
                <p className="text-gray-300 mb-6">
                    Could not load the article because the required information was not provided.
                </p>
                <button
                    onClick={() => navigate('home')}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center space-x-2"
                >
                    <FaArrowLeft />
                    <span>Return to Dashboard</span>
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 overflow-hidden">
                <div className="animate-pulse text-2xl text-gray-400">Loading...</div>
            </div>
        );
    }

    return (
        <div
            ref={viewerRef}
            className="bg-gray-900 text-gray-100 font-serif min-h-screen w-full flex flex-col overflow-hidden"
        >
            {!isFullScreen ? (
                <div className="flex flex-col items-center justify-center min-h-screen w-full px-6 text-center animate-fadeIn overflow-hidden">
                    <h1 className="text-5xl font-extrabold mb-4 text-white tracking-tight">
                        Escape the Noise.
                    </h1>
                    <p className="text-lg text-gray-300 mb-10 max-w-xl leading-relaxed">
                        Step into a world where words come alive. Your reading journey starts here —
                        fully immersive, zero distractions.
                    </p>
                    <button
                        onClick={handleFullScreenToggle}
                        className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-full font-semibold text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
                    >
                        <FaExpand className="text-xl" />
                        <span>Enter Reader Mode</span>
                    </button>
                    <button
                        onClick={handleBack}
                        className="mt-6 flex items-center space-x-2 text-sm font-semibold text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-full transition-colors duration-200"
                    >
                        <FaArrowLeft />
                        <span>Back to Dashboard</span>
                    </button>
                </div>
            ) : (
                <>
                    <div className="absolute top-3 left-3 z-10">
                        <button
                            onClick={handleBack}
                            className="flex items-center space-x-2 text-sm font-semibold text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg shadow-md"
                        >
                            <FaArrowLeft />
                            <span>Dashboard</span>
                        </button>
                    </div>
                    <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden">
                        <iframe
                            src={articleUrl}
                            className="w-full h-full border-0"
                            style={{ backgroundColor: 'white', display: 'block' }}
                        ></iframe>
                    </div>
                </>
            )}
        </div>
    );
};

export default RDFCArticleViewer;