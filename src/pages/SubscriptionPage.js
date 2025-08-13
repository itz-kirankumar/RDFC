import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';

// Component to handle countdown timer logic
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
        <div className="my-4 text-center">
             <p className="text-sm font-bold text-amber-400 animate-pulse">{offerName || 'Offer Ends In'}</p>
             <p className="font-mono text-lg text-amber-400">
                {timeLeft.days ? `${timeLeft.days}d ` : ''}
                {formatTime(timeLeft.hours)}h : {formatTime(timeLeft.minutes)}m : {formatTime(timeLeft.seconds)}s
            </p>
        </div>
    );
};

const SubscriptionPage = ({ navigate, embedded = false }) => {
    const [plans, setPlans] = useState([]);
    const [activeSaleTitle, setActiveSaleTitle] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const plansCol = collection(db, 'subscriptionPlans');
        const q = query(plansCol, orderBy('order', 'asc'));

        const unsubscribePlans = onSnapshot(q, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const now = new Date();
            const filteredPlans = fetchedPlans.map(plan => {
                const offerEndTime = plan.offerEndTime?.toDate();
                if (plan.hasOffer && offerEndTime && now > offerEndTime) {
                    return { ...plan, price: plan.price, offerPrice: null, hasOffer: false };
                }
                return plan;
            }).filter(plan => plan.isActive);

            setPlans(filteredPlans);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching subscription plans:", error);
            setLoading(false);
        });

        const bannersCol = collection(db, 'banners');
        const qBanners = query(bannersCol, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const activeBanner = snapshot.docs.length > 0 ? snapshot.docs[0].data() : null;
            setActiveSaleTitle(activeBanner?.saleTitle || '');
        });

        return () => {
            unsubscribePlans();
            unsubscribeBanners();
        };
    }, []);
    
    const handleSubscribeClick = (checkoutLink) => {
        if (checkoutLink) {
            window.open(checkoutLink, '_blank');
        } else {
            const defaultMessage = "Hi, I'm interested in a subscription plan.";
            const whatsappLink = `https://wa.me/919092112941?text=${encodeURIComponent(defaultMessage)}`;
            window.open(whatsappLink, '_blank');
        }
    };

    const calculateDiscountPercentage = (originalPrice, newPrice) => {
        if (!originalPrice || !newPrice || originalPrice <= newPrice) return 0;
        return Math.round(((originalPrice - newPrice) / originalPrice) * 100);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className={`max-w-7xl mx-auto ${!embedded ? 'py-12' : 'py-4'} px-4 sm:px-6 lg:px-8`}>
            <div className="text-center mb-12">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'} tracking-tight`}>
                    Unlock Your Full Potential
                </h1>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">
                    Join our program to master Reading Comprehension and stay ahead.
                </p>
                {activeSaleTitle && (
                    <h2 className="mt-6 text-2xl font-bold bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text animate-pulse">
                        {activeSaleTitle}
                    </h2>
                )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 items-stretch">
                {plans.length > 0 ? (
                    plans.map((plan) => {
                        const isOfferActive = plan.hasOffer && plan.offerEndTime && new Date(plan.offerEndTime.toDate()) > new Date();
                        const currentPrice = isOfferActive && plan.offerPrice ? plan.offerPrice : plan.price;
                        const finalCheckoutLink = isOfferActive && plan.offerCheckoutLink ? plan.offerCheckoutLink : plan.checkoutLink;
                        const discountPercentage = calculateDiscountPercentage((plan.originalPrice || plan.price), currentPrice);

                        return (
                            <div 
                                key={plan.id}
                                className={`
                                    relative bg-gradient-to-br from-gray-800 to-gray-900 
                                    rounded-2xl p-4 flex flex-col w-full md:w-[340px]
                                    transition-all duration-300 ease-in-out transform hover:scale-105
                                    ${plan.isRecommended 
                                        ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(252,211,77,0.4)]' 
                                        : 'border border-gray-700'
                                    }`
                                }
                            >
                                {plan.isRecommended && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                        <div className="bg-amber-400 text-gray-900 font-bold px-4 py-1 text-sm rounded-full shadow-md">
                                            Recommended
                                        </div>
                                    </div>
                                )}
                                {discountPercentage > 0 && (
                                    <div className="absolute top-0 right-0 bg-red-600 text-white font-semibold py-1 px-3 rounded-tr-xl rounded-bl-xl text-xs shadow-lg">
                                        {discountPercentage}% OFF
                                    </div>
                                )}
                                
                                <div className="text-center mt-2">
                                    <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                                    <p className="text-gray-400 mt-1 text-sm">{plan.durationText || 'N/A'}</p>

                                </div>
                                
                                <div className="my-4 text-center">
                                    { (plan.originalPrice || plan.price) && currentPrice < (plan.originalPrice || plan.price) &&
                                        <p className="text-lg text-gray-500 line-through">₹{plan.originalPrice || plan.price}</p>
                                    }
                                    <p className="text-4xl font-extrabold text-white">₹{currentPrice}</p>
                                </div>

                                {isOfferActive && plan.offerEndTime && <CountdownTimer targetDate={plan.offerEndTime.toDate()} offerName={plan.offerName} />}
                                    
                                <button 
                                    onClick={() => handleSubscribeClick(finalCheckoutLink)}
                                    className={`
                                        w-full py-2.5 rounded-lg font-bold text-base transition-all duration-300
                                        bg-amber-500 text-gray-900 hover:bg-amber-400
                                    `}
                                >
                                    Subscribe Now
                                </button>

                                <div className="border-t border-gray-700 my-4"></div>

                                <div className="flex-grow">
                                    <h3 className="font-semibold text-white text-center mb-3">What's Included:</h3>
                                    <ul className="space-y-2 text-gray-300">
                                        {plan.features && plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center">
                                                <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                <span className="text-sm">{feature.title}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <p className="text-xs text-center text-gray-500 mt-4">
                                    Limited seats available.
                                </p>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-400 w-full col-span-1 lg:col-span-3">No subscription plans available.</div>
                )}
            </div>

            {!embedded && (
                 <div className="text-center mt-10">
                    <button onClick={() => navigate('home')} className="text-gray-400 hover:text-white font-semibold">
                        &larr; Back to Dashboard
                    </button>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPage;