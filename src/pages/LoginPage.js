import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import SubscriptionPage from './SubscriptionPage';

// Reusable CountdownTimer for banners
const CountdownTimer = ({ targetDate, offerName, isFlashing = false }) => {
    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }
        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        if (!targetDate) return;
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        if (Object.keys(timeLeft).length === 0) {
            // No full page reload needed, just let the component re-evaluate
        }

        return () => clearTimeout(timer);
    }, [targetDate, timeLeft]);

    const formatTime = (time) => String(time || 0).padStart(2, '0');

    if (Object.keys(timeLeft).length === 0) {
        return null; // Don't render if time is up
    }

    return (
        <span className={`ml-4 text-red-300 font-bold text-sm ${isFlashing ? 'animate-flash' : ''}`}>
            {offerName || 'Ends in'}: {timeLeft.days ? `${timeLeft.days}d ` : ''}
            {formatTime(timeLeft.hours)}:
            {formatTime(timeLeft.minutes)}:
            {formatTime(timeLeft.seconds)}
        </span>
    );
};

const LoginPage = ({ navigate }) => {
    const { signInWithGoogle } = useAuth();
    const [freeTests, setFreeTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBanners, setActiveBanners] = useState([]);

    // Fetch all free tests to display as a preview
    useEffect(() => {
        const fetchFreeTests = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'tests'), 
                    where("isFree", "==", true),
                    where("isPublished", "==", true)
                );
                const snapshot = await getDocs(q);
                const allFreeTests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFreeTests(allFreeTests);
            } catch (error) {
                console.error("Error fetching free tests for login page:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFreeTests();
    }, []);

    // Fetch active banners based on isActive, startTime, and endTime
    useEffect(() => {
        const bannersCol = collection(db, 'banners');
        const qBanners = query(
            bannersCol, 
            where('isActive', '==', true),
            orderBy('createdAt', 'desc') // Order by creation time to maintain some consistency
        );

        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const now = new Date(); // Define 'now' inside the callback for real-time accuracy
            const filteredBanners = fetchedBanners.filter(banner => {
                const startTime = banner.startTime?.toDate();
                const endTime = banner.endTime?.toDate();
                
                const isStarted = !startTime || now >= startTime;
                const isNotEnded = !endTime || now <= endTime;

                return isStarted && isNotEnded;
            });
            setActiveBanners(filteredBanners);
        });
        return () => unsubscribeBanners();
    }, []);

    const features = [
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-check"><path d="M8 2.8c1.3-.8 2.8-.8 4-1.2"></path><path d="M17 20c-1.3.8-2.8.8-4 1.2"></path><path d="M12 1.2c-1.3.8-2.8.8-4 1.2"></path><path d="M13 21.2c1.3-.8 2.8-.8 4-1.2"></path><path d="M19 3v15h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"></path><path d="m9 12 2 2 4-4"></path></svg>`,
            title: "Comprehension-Focused Learning",
            description: "Our platform supports your daily practice with a consistent stream of high-quality tests designed for genuine skill improvement."
        },
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trending-up"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`,
            title: "Article-Based RC Tests",
            description: "Test your comprehension on each article with dedicated RC questions."
        },
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bar-chart-3"><path d="M10 20V8"></path><path d="M18 20V4"></path><path d="M6 20v-6"></path><path d="M2 20h20"></path></svg>`,
            title: "Deep Dive Analytics",
            description: "Go beyond just a score. Understand your strengths and pinpoint your weaknesses with our detailed analysis."
        }
    ];

    const renderBannerItem = (banner) => {
        const hasLink = banner.link && banner.link.trim() !== '';
        const bannerContent = (
            <div className="flex items-center justify-center p-3 text-center text-sm font-semibold flex-shrink-0">
                {banner.imageUrl && <img src={banner.imageUrl} alt="banner" className="h-6 inline-block mr-2 object-contain" onError={(e) => e.target.style.display='none'} />}
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 text-transparent bg-clip-text"> {/* Dark gradient text for banner */}
                    {banner.text}
                </span>
                {banner.endTime && new Date(banner.endTime.toDate()) > new Date() && (
                    <CountdownTimer targetDate={banner.endTime.toDate()} isFlashing={true} />
                )}
            </div>
        );

        return (
            <div key={banner.id} className="banner-item">
                {hasLink ? (
                    <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">
                        {bannerContent}
                    </a>
                ) : (
                    bannerContent
                )}
            </div>
        );
    };

    // Calculate banner height (approximate, adjust if needed based on actual banner content)
    const bannerHeight = activeBanners.length > 0 ? 40 : 0; // p-3 (12px top/bottom) + text height approx 16px = ~40px

    return (
        <div className="bg-gray-950 text-white min-h-screen font-sans antialiased">
            <style>
                {`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }

                .floating-icon {
                    animation: float 4s ease-in-out infinite;
                }

                .bg-grid {
                    background-image: linear-gradient(to right, #2d3748 1px, transparent 1px),
                                      linear-gradient(to bottom, #2d3748 1px, transparent 1px);
                    background-size: 20px 20px;
                }

                /* Banner specific styles */
                @keyframes slide {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-100%); }
                }

                @keyframes flash {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .banner-container {
                    width: 100%;
                    overflow: hidden;
                    white-space: nowrap;
                    background-color: #dc2626; /* Red background */
                    background-image: repeating-linear-gradient(45deg, #ef4444 0, #ef4444 10px, #dc2626 10px, #dc2626 20px); /* Red checkered background */
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
                    position: fixed; /* Fixed to the viewport */
                    top: 0;
                    left: 0;
                    z-index: 1000; /* Very high z-index to be always on top */
                    height: 40px; /* Explicit height for the banner */
                }

                .banner-content-wrapper {
                    display: inline-block;
                    animation: slide 30s linear infinite; /* Adjust duration as needed */
                    padding: 8px 0; /* Add some vertical padding */
                    min-width: 400%; /* Ensure enough content to scroll seamlessly */
                    height: 100%; /* Ensure wrapper takes full height of container */
                    display: flex; /* Use flex to vertically center content */
                    align-items: center; /* Vertically center content */
                }

                .banner-item {
                    display: inline-flex;
                    align-items: center;
                    margin-right: 80px; /* Increased space between duplicated banners for better flow */
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
                }
                .banner-item:last-child {
                    margin-right: 0; /* No margin after the last item in the group */
                }
                `}
            </style>
            
            {/* Banners Section - Placed above Navbar, fixed to the top */}
            {activeBanners.length > 0 && (
                <div className="banner-container">
                    <div className="banner-content-wrapper">
                        {/* Duplicate banners multiple times for seamless infinite scroll */}
                        {Array(40).fill(null).map((_, i) => ( // Increased duplication to 40 times
                            activeBanners.map(banner => renderBannerItem(banner))
                        ))}
                    </div>
                </div>
            )}

            {/* Navbar is now positioned below the banner dynamically */}
            <Navbar navigate={navigate} bannerHeight={bannerHeight} /> {/* Pass bannerHeight to Navbar */}
            <main style={{ paddingTop: `${bannerHeight + 64}px` }}> {/* Dynamic padding-top to account for banner and Navbar */}
                {/* Hero Section */}
                <div className="relative pb-32 flex content-center items-center justify-center min-h-[75vh] lg:min-h-[85vh] bg-gray-950">
                    <div className="absolute top-0 w-full h-full bg-grid z-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 to-gray-900 opacity-90"></div>
                    </div>
                    <div className="container relative mx-auto text-center z-10">
                        <div className="max-w-4xl mx-auto px-4">
                            <h1 className="text-white font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight animate-fade-in-up">
                                Master Reading Comprehension with RDFC.
                            </h1>
                            <p className="mt-6 text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto animate-fade-in-up delay-200">
                                RDFC Test is a comprehensive platform designed to sharpen your analytical thinking and critical reading skills through disciplined, daily practice.
                            </p>
                            <button onClick={signInWithGoogle} className="mt-12 mx-auto flex items-center justify-center bg-white text-gray-900 px-8 py-4 rounded-full shadow-md hover:shadow-xl hover:bg-gray-200 transition-all transform hover:scale-105 group text-lg font-bold animate-fade-in-up delay-400">
                                <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#34A853" d="M43.611 20.083H24v8h11.303c-1.649 4.657-6.08 8-11.303 8V44c5.268 0 10.046-1.947 13.611-5.657c3.565-3.71 5.789-8.604 5.789-14.343c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FBBC05" d="M9.961 14.961C11.846 12.154 15.059 10 18 10c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C28.046 2.053 23.268 0 18 0C12.955 0 8 4.955 8 10c0 1.341.138 2.65.389 3.917l1.572 1.044z"></path><path fill="#EA4335" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-4.891c-1.543 1.037-3.481 1.663-5.219 1.663c-3.454 0-6.556-1.983-8.163-4.891L4.389 35.083C7.023 40.523 12.866 44 24 44z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                Join with Google
                            </button>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <section className="py-20 bg-gray-950">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-white">Why Choose RDFC Test?</h2>
                            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
                                Our platform is meticulously designed to give you a genuine competitive advantage.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {features.map((feature, index) => (
                                <div key={index} className="flex flex-col items-center text-center p-6 bg-gray-900 rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2">
                                    <div className="w-20 h-20 flex items-center justify-center bg-gray-800 rounded-full mb-6 text-indigo-400 floating-icon">
                                        <div dangerouslySetInnerHTML={{ __html: feature.icon }} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                                    <p className="text-gray-400 mt-2">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Free Test Section */}
                <section className="py-20 bg-gray-900">
                    <div className="container mx-auto px-4">
                         <div className="text-center mb-16">
                            <h2 className="text-3xl font-extrabold text-white">Try a Free Test Today!</h2>
                            <p className="text-gray-400 mt-4 max-w-2xl mx-auto">
                                See for yourself how our platform can help you prepare. Sign in with Google to attempt these free starter tests.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {loading ? <p className="text-center col-span-3 text-gray-400">Loading free tests...</p> 
                                     : freeTests.length > 0 ? freeTests.map(test => (
                                <div key={test.id} className="bg-gray-950 rounded-lg shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-all">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                                        <p className="text-gray-400 mt-2">{test.description}</p>
                                    </div>
                                    <button onClick={signInWithGoogle} className="mt-6 w-full bg-white text-gray-900 px-4 py-2 rounded-md font-semibold transition-colors hover:bg-gray-200">
                                        Sign In to Attempt
                                    </button>
                                </div>
                            )) : <p className="text-center col-span-3 text-gray-500">No free tests have been added by the admin yet.</p>}
                        </div>
                    </div>
                </section>

                {/* Subscription Section */}
                <section className="py-20 bg-gray-950">
                    <div className="container mx-auto px-4">
                        <SubscriptionPage embedded={true} /> {/* Pass embedded prop */}
                    </div>
                </section>
            </main>
            <footer className="bg-gray-900 pt-8 pb-6"> {/* Corrected closing brace here */}
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap items-center md:justify-between justify-center">
                        <div className="w-full md:w-4/12 px-4 mx-auto text-center">
                            <div className="text-sm text-gray-500 font-semibold py-1">
                                © {new Date().getFullYear()} RDFCtest.site. All Rights Reserved.
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
