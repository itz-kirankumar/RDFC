import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import SubscriptionPage from './SubscriptionPage';

// Helper Component: CountdownTimer
const CountdownTimer = ({ targetDate, offerName }) => {
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
        const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearTimeout(timer);
    }, [targetDate, timeLeft]);
    const formatTime = (time) => String(time || 0).padStart(2, '0');
    if (Object.keys(timeLeft).length === 0) return null;
    return (
        <span className={`ml-4 bg-gradient-to-r from-red-600 via-red-400 to-red-600 text-transparent bg-clip-text font-bold text-sm animate-shine`}>
            {offerName || 'Ends in'}: {timeLeft.days ? `${timeLeft.days}d ` : ''}
            {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
        </span>
    );
};

// Helper Component: StarRating
const StarRating = ({ rating }) => (
    <div className="flex">
        {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
        ))}
    </div>
);

// FAQ Section Component
const FaqSection = () => {
    const [openFaq, setOpenFaq] = useState(0); 

    const faqData = [
        {
            question: "What are the free tests for?",
            answer: "The free tests are designed to give you a firsthand experience of our platform's quality and interface. They allow you to understand our approach to comprehension-focused learning before you commit to a subscription. You can attempt them by simply signing in with your Google account."
        },
        {
            question: "Do I receive new tests and articles every day?",
            answer: "Yes! Our core program is built on a daily regimen. You will receive a fresh RDFC (Read Daily for CAT) article paired with a specific RC test every single day to ensure consistent practice and skill development."
        },
        {
            question: "Are the reading comprehension articles from reputable sources?",
            answer: "Absolutely. All our articles are carefully chosen from high-quality publications like The Guardian, The New York Times, Aeon, and Smithsonian. This ensures the content is challenging, relevant, and helps you build a strong reading habit."
        },
        {
            question: "What makes RDFCtest.site different from other platforms?",
            answer: "Our primary focus is on building deep comprehension and critical thinking skills through disciplined, daily practice. We provide high-quality, exam-relevant content at an affordable price, making top-tier VARC preparation accessible to everyone. We're here to help you master VARC without breaking the bank."
        },
        {
            question: "Does the test interface simulate a real exam environment?",
            answer: "Yes. We have meticulously curated our test interface to reflect the actual exam experience, including the layout, timer, and question navigation. This helps you build familiarity and reduce anxiety on test day."
        },
        {
            question: "What kind of support is offered for the entire VARC section?",
            answer: "We provide comprehensive support for the entire Verbal Ability and Reading Comprehension (VARC) section. Beyond daily RCs, we also provide sectional tests and dedicated support for Verbal Ability to ensure a holistic preparation."
        },
        {
            question: "How do I enroll in a program?",
            answer: "Enrolling is simple! Just navigate to the 'Unlock Your Full Potential' section on this page, choose the plan that suits you best, and click the 'Subscribe' button to complete the secure payment process."
        },
        {
            question: "Is there a community group for subscribers?",
            answer: "Yes! Upon successful subscription, you will be added to an exclusive WhatsApp group within 24 hours. This group is a great place for peer learning, doubt discussion, and staying updated with our latest tests."
        }
    ];

    return (
        <section id="faq" className="py-16 sm:py-20 bg-zinc-900">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12 md:mb-16">
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
                    <p className="text-zinc-300 mt-4 max-w-2xl mx-auto">Have questions? We've got answers. If you need more help, feel free to contact us.</p>
                </div>
                <div className="max-w-4xl mx-auto">
                    {faqData.map((faq, index) => (
                        <div key={index} className="border-b border-zinc-700">
                            <button
                                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                                className="w-full flex justify-between items-center text-left py-5 px-2"
                            >
                                <span className="text-lg font-semibold text-white">{faq.question}</span>
                                <span className="text-cyan-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-300 ${openFaq === index ? 'rotate-45' : ''}`}>
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </span>
                            </button>
                            <div className={`overflow-hidden transition-max-height duration-500 ease-in-out ${openFaq === index ? 'max-h-96' : 'max-h-0'}`}>
                                <p className="text-zinc-300 pb-5 px-2 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const LoginPage = ({ navigate }) => {
    const { signInWithGoogle } = useAuth();
    const [freeTests, setFreeTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeBanners, setActiveBanners] = useState([]);
    const [testimonials, setTestimonials] = useState([]);
    const [loadingTestimonials, setLoadingTestimonials] = useState(true);

    useEffect(() => {
        const fetchFreeTests = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, 'tests'), where("isFree", "==", true), where("isPublished", "==", true), orderBy("createdAt", "asc"));
                const snapshot = await getDocs(q);
                setFreeTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching free tests:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFreeTests();
    }, []);

    useEffect(() => {
        const bannersCol = collection(db, 'banners');
        const qBanners = query(bannersCol, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const now = new Date();
            setActiveBanners(fetchedBanners.filter(banner => {
                const startTime = banner.startTime?.toDate();
                const endTime = banner.endTime?.toDate();
                return (!startTime || now >= startTime) && (!endTime || now <= endTime);
            }));
        });
        return () => unsubscribeBanners();
    }, []);

    useEffect(() => {
        const fetchTestimonials = async () => {
            setLoadingTestimonials(true);
            try {
                const q = query(collection(db, 'feedbacks'), where('isApproved', '==', true), orderBy('createdAt', 'desc'), limit(10));
                const snapshot = await getDocs(q);
                setTestimonials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching testimonials:", error);
            } finally {
                setLoadingTestimonials(false);
            }
        };
        fetchTestimonials();
    }, []);

    const features = [
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-book-open"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
            title: "Comprehension-Focused Learning",
            description: "Our platform supports your daily practice with a consistent stream of high-quality tests designed for genuine skill improvement."
        },
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-activity"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>`,
            title: "Article-Based RC Tests",
            description: "Test your comprehension on each article with dedicated RC questions."
        },
        {
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-bar-chart-2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
            title: "Deep Dive Analytics",
            description: "Go beyond just a score. Understand your strengths and pinpoint your weaknesses with our detailed analysis."
        }
    ];

    const renderBannerItem = (banner) => {
        const hasLink = banner.link && banner.link.trim() !== '';
        const bannerContent = (
            <div className="flex items-center justify-center p-3 text-center text-sm font-semibold flex-shrink-0">
                {banner.imageUrl && <img src={banner.imageUrl} alt="banner" className="h-6 inline-block mr-2 object-contain" onError={(e) => e.target.style.display = 'none'} />}
                <span className="bg-gradient-to-r from-gray-200 via-white to-gray-200 text-transparent bg-clip-text animate-shine">{banner.text}</span>
                {banner.endTime && new Date(banner.endTime.toDate()) > new Date() && <CountdownTimer targetDate={banner.endTime.toDate()} />}
            </div>
        );
        return (
            <div key={banner.id} className="banner-item">
                {hasLink ? (<a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">{bannerContent}</a>) : (bannerContent)}
            </div>
        );
    };

    const bannerHeight = activeBanners.length > 0 ? 40 : 0;

    return (
        <div className="bg-zinc-950 text-white min-h-screen font-sans antialiased">
            <style>{`
                .marquee-container {
                    overflow: hidden;
                    position: relative;
                    width: 100%;
                    mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
                }
                .marquee-content {
                    display: flex;
                    width: max-content;
                    animation: marquee 60s linear infinite;
                }
                .marquee-container:hover .marquee-content {
                    animation-play-state: paused;
                }
                .testimonial-card-marquee {
                    width: 450px;
                    margin-right: 2rem;
                    flex-shrink: 0;
                }
                @keyframes marquee {
                    0% { transform: translateX(0%); }
                    100% { transform: translateX(-50%); }
                }
                @media (max-width: 768px) {
                    .testimonial-card-marquee {
                        width: 80vw;
                        margin-right: 1rem;
                    }
                }
                @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
                .floating-icon { animation: float 4s ease-in-out infinite; }
                .bg-grid { background-image: linear-gradient(to right, #2d3748 1px, transparent 1px), linear-gradient(to bottom, #2d3748 1px, transparent 1px); background-size: 20px 20px; }
                @keyframes slide { 0% { transform: translateX(0%); } 100% { transform: translateX(-100%); } }
                @keyframes shine { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
                .animate-shine { background-size: 200% auto; animation: shine 5s linear infinite; }
                .banner-container { width: 100%; overflow: hidden; white-space: nowrap; background-color: #1a202c; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; z-index: 1000; height: 40px; }
                .banner-content-wrapper { display: inline-block; animation: slide 30s linear infinite; padding: 8px 0; min-width: 400%; height: 100%; display: flex; align-items: center; }
                .banner-content-wrapper:hover { animation-play-state: paused; }
                .banner-item { display: inline-flex; align-items: center; margin-right: 80px; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); }
                .transition-max-height { transition: max-height 0.5s ease-in-out; }
            `}</style>
            
            {activeBanners.length > 0 && (
                <div className="banner-container">
                    <div className="banner-content-wrapper">
                        {Array(40).fill(null).map((_, i) => (activeBanners.map(banner => renderBannerItem(banner))))}
                    </div>
                </div>
            )}

            <Navbar navigate={navigate} bannerHeight={bannerHeight} />
            <main style={{ paddingTop: `${bannerHeight + 64}px` }}>
                <div className="relative pb-20 md:pb-32 flex content-center items-center justify-center min-h-[75vh] lg:min-h-[85vh] bg-zinc-950">
                    <div className="absolute top-0 w-full h-full bg-grid z-0">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black opacity-90"></div>
                    </div>
                    <div className="container relative mx-auto text-center z-10">
                        <div className="max-w-4xl mx-auto px-4">
                            <h1 className="text-white font-extrabold text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-tight animate-fade-in-up">
                                With RDFC's tests, you'll be a step above the rest.
                            </h1>
                            <p className="mt-6 text-lg sm:text-xl text-zinc-300 max-w-3xl mx-auto animate-fade-in-up delay-200">
                                Elevate your reading comprehension and analytical skills with a dynamic platform that provides a daily regimen of fresh RDFC articles paired with article-specific RC tests, ensuring disciplined and effective practice.
                            </p>
                            <button onClick={signInWithGoogle} className="mt-8 sm:mt-12 mx-auto flex items-center justify-center bg-white text-zinc-900 px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg rounded-full shadow-md hover:shadow-xl hover:bg-zinc-200 transition-all transform hover:scale-105 group font-bold animate-fade-in-up delay-400">
                                <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48"><path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#34A853" d="M43.611 20.083H24v8h11.303c-1.649 4.657-6.08 8-11.303 8V44c5.268 0 10.046-1.947 13.611-5.657c3.565-3.71 5.789-8.604 5.789-14.343c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FBBC05" d="M9.961 14.961C11.846 12.154 15.059 10 18 10c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C28.046 2.053 23.268 0 18 0C12.955 0 8 4.955 8 10c0 1.341.138 2.65.389 3.917l1.572 1.044z"></path><path fill="#EA4335" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-4.891c-1.543 1.037-3.481 1.663-5.219 1.663c-3.454 0-6.556-1.983-8.163-4.891L4.389 35.083C7.023 40.523 12.866 44 24 44z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
                                Join with Google
                            </button>
                        </div>
                    </div>
                </div>

                <section className="py-16 sm:py-20 bg-zinc-900">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Try a Free Test Today!</h2>
                            <p className="text-zinc-300 mt-4 max-w-2xl mx-auto">See for yourself how our platform can help you prepare. Sign in with Google to attempt these free starter tests.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {loading ? <p className="text-center col-span-full text-zinc-400">Loading free tests...</p> : freeTests.length > 0 ? freeTests.map(test => (
                                <div key={test.id} className="bg-zinc-800 rounded-lg shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-all">
                                    <div>
                                        <h3 className="text-xl font-semibold text-white">{test.title}</h3>
                                        <p className="text-zinc-400 mt-2">{test.description}</p>
                                    </div>
                                    <button onClick={signInWithGoogle} className="mt-6 w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-900 px-4 py-2 rounded-md font-semibold transition-colors hover:bg-yellow-400">
                                        Sign In to Attempt
                                    </button>
                                </div>
                            )) : <p className="text-center col-span-full text-zinc-500">No free tests have been added by the admin yet.</p>}
                        </div>
                    </div>
                </section>
                
                <section className="py-16 sm:py-20 bg-zinc-950">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Why Choose RDFC Test?</h2>
                            <p className="text-zinc-300 mt-4 max-w-2xl mx-auto">Our platform is meticulously designed to give you a genuine competitive advantage.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                            {features.map((feature, index) => (
                                <div key={index} className="flex flex-col items-center text-center p-6 bg-zinc-900 rounded-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-2">
                                    <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center bg-zinc-800 rounded-full mb-6 text-cyan-400 floating-icon">
                                        <div dangerouslySetInnerHTML={{ __html: feature.icon }} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">{feature.title}</h3>
                                    <p className="text-zinc-400 mt-2">{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="subscription" className="py-16 sm:py-20 bg-zinc-900">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12 md:mb-16">
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Choose Your Plan</h2>
                        </div>
                        <SubscriptionPage embedded={true} />
                    </div>
                </section>

                {!loadingTestimonials && testimonials.length > 0 && (
                    <section className="py-16 sm:py-20 bg-zinc-950">
                        <div className="container mx-auto px-4">
                            <div className="text-center mb-12 md:mb-16">
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white">What Our Members Say</h2>
                                <p className="text-zinc-300 mt-4 max-w-2xl mx-auto">Real feedback from premium members who are excelling with our platform.</p>
                            </div>
                        </div>
                        <div className="marquee-container">
                            <div className="marquee-content">
                                {[...testimonials, ...testimonials].map((feedback, index) => (
                                    <div key={`${feedback.id}-${index}`} className="bg-gray-800 rounded-lg p-6 flex flex-col justify-between shadow-lg testimonial-card-marquee">
                                        <div className="flex-grow mb-4">
                                            <p className="text-gray-300 italic">"{feedback.feedbackText}"</p>
                                        </div>
                                        <div className="border-t border-gray-700 pt-4 flex items-center justify-between">
                                            <div className="flex items-center">
                                                <img src={feedback.userPhotoURL || `https://ui-avatars.com/api/?name=${feedback.userName}&background=random`} alt={feedback.userName} className="w-10 h-10 rounded-full mr-3" />
                                                <span className="font-semibold text-white">{feedback.userName}</span>
                                            </div>
                                            <StarRating rating={feedback.rating} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-center mt-12">
                            <button
                                onClick={() => navigate('allTestimonials')}
                                className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-colors shadow-md transform hover:scale-105"
                            >
                                View All Testimonials
                            </button>
                        </div>
                    </section>
                )}

                <FaqSection />

            </main>
            <footer className="bg-black border-t border-zinc-800">
                <div className="container mx-auto px-6 py-16">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
                        
                        <div className="sm:col-span-2 md:col-span-1">
                            <h3 className="text-white text-lg font-bold mb-4">About RDFCtest.site</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                We are a team of experienced educators dedicated to helping aspirants master the VARC section. Our platform is designed to build deep comprehension and critical thinking skills through disciplined, daily practice at an affordable price.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4 tracking-wide">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><a href="#subscription" className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm">Subscription Plans</a></li>
                                <li><a href="#faq" className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm">FAQ</a></li>
                                <li><button onClick={() => navigate('allTestimonials')} className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm text-left">Testimonials</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4 tracking-wide">Legal</h4>
                            <ul className="space-y-3">
                                <li><button onClick={() => navigate('legal', { section: 'terms' })} className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm text-left">Terms & Conditions</button></li>
                                <li><button onClick={() => navigate('legal', { section: 'privacy' })} className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm text-left">Privacy Policy</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-white font-semibold mb-4 tracking-wide">Contact Us</h4>
                            <ul className="space-y-4 text-zinc-400 text-sm">
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-3 mt-0.5 text-zinc-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path></svg>
                                    <a href="mailto:admin@rdfctest.site" className="hover:text-yellow-400 transition-colors">admin@rdfctest.site</a>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-3 mt-0.5 text-zinc-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"></path></svg>
                                    <a href="tel:+919092112941" className="hover:text-yellow-400 transition-colors">+91 9092112941</a>
                                </li>
                            </ul>
                        </div>

                    </div>

                    <div className="mt-12 pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
                        <p>
                            © {new Date().getFullYear()} RDFCtest.site. All Rights Reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
