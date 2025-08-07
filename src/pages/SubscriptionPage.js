import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Fragment } from 'react';

// Component to handle countdown timer logic for a single plan or banner
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

const SubscriptionPage = ({ navigate, embedded = false }) => {
    const [plans, setPlans] = useState([]);
    // Removed activeBanners state and its useEffect hook
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const plansCol = collection(db, 'subscriptionPlans');
        const q = query(plansCol, orderBy('order', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const now = new Date();
            const filteredPlans = fetchedPlans.map(plan => {
                const offerEndTime = plan.offerEndTime?.toDate();
                if (plan.hasOffer && offerEndTime && now > offerEndTime) {
                    return { ...plan, price: plan.price, offerPrice: null, hasOffer: false, offerName: '', offerEndTime: null, offerCheckoutLink: null };
                }
                return plan;
            }).filter(plan => plan.isActive);

            setPlans(filteredPlans);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching subscription plans:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    // Removed the useEffect hook for fetching banners from this component
    // as banners are no longer displayed here.

    const handleSubscribeClick = (checkoutLink) => {
        if (checkoutLink) {
            window.open(checkoutLink, '_blank');
        } else {
            const defaultMessage = "Hi, RDFC Team! I'm interested in a subscription plan.";
            const whatsappLink = `https://wa.me/919092112941?text=${encodeURIComponent(defaultMessage)}`;
            window.open(whatsappLink, '_blank');
        }
    };

    const calculateDiscountPercentage = (originalPrice, newPrice) => {
        if (!originalPrice || !newPrice || originalPrice <= newPrice) return 0;
        const discount = ((originalPrice - newPrice) / originalPrice) * 100;
        return Math.round(discount);
    };

    // Removed renderBannerItem function as banners are no longer displayed here.

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className={`max-w-7xl mx-auto ${!embedded ? 'mt-10' : ''} font-inter`}>
            <style>
                {`
                /* Removed banner specific styles as banners are no longer displayed here. */
                `}
            </style>
            
            {/* Removed Banners Section from this component. */}

            <div className="text-center mb-10">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'} mb-4`}>
                    Unlock Your Full Potential
                </h1>
                <p className="mt-4 text-lg text-gray-400">
                    Join our program to master Reading Comprehension and stay ahead.
                </p>
            </div>
            
            {/* Subscription Plans Section */}
            <div className="flex flex-col lg:flex-row justify-center items-stretch space-y-8 lg:space-y-0 lg:space-x-8 px-4">
                {plans.length > 0 ? (
                    plans.map((plan) => {
                        const isOfferActive = plan.hasOffer && plan.offerEndTime && new Date(plan.offerEndTime.toDate()) > new Date();
                        const currentPrice = isOfferActive && plan.offerPrice ? plan.offerPrice : plan.price;
                        const finalCheckoutLink = isOfferActive && plan.offerCheckoutLink ? plan.offerCheckoutLink : plan.checkoutLink;

                        return (
                            <div key={plan.id} className="w-full lg:w-1/3">
                                <div 
                                    className={`p-8 flex flex-col bg-gray-900 shadow-2xl relative rounded-lg transition-transform duration-300 hover:scale-105 min-h-[500px]
                                        ${plan.isRecommended ? 'border-4 border-amber-400' : 'border-2 border-gray-700'}`
                                    }
                                >
                                    {plan.isRecommended && (
                                        <div className="absolute top-0 left-0 bg-amber-400 text-gray-900 font-bold px-3 py-1 text-sm rounded-br-lg">
                                            Save More!
                                        </div>
                                    )}
                                    {(plan.originalPrice || plan.price) && currentPrice < (plan.originalPrice || plan.price) && (
                                        <div className="absolute top-4 right-4 bg-red-600 text-white font-semibold py-1 px-3 rounded-full text-xs">
                                            {calculateDiscountPercentage((plan.originalPrice || plan.price), currentPrice)}% OFF!
                                        </div>
                                    )}
                                    <h2 className="text-3xl font-bold text-white text-center mt-4">
                                        {plan.name}
                                    </h2>
                                    
                                    <div className="flex flex-col items-center mt-4">
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-4xl font-extrabold text-white">₹{currentPrice}</span>
                                            { (plan.originalPrice || plan.price) && currentPrice < (plan.originalPrice || plan.price) && (
                                                <span className="text-xl text-gray-500 line-through">₹{plan.originalPrice || plan.price}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mt-1">{plan.durationText || 'N/A'}</p>
                                    </div>

                                    {isOfferActive && plan.offerEndTime && <CountdownTimer targetDate={plan.offerEndTime.toDate()} offerName={plan.offerName} />}

                                    <ul className="my-8 space-y-6 text-gray-300 flex-grow">
                                        {plan.features && plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start text-left">
                                                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                <div>
                                                    <h3 className="font-semibold text-lg text-white">{feature.title}</h3>
                                                    <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    <button 
                                        onClick={() => handleSubscribeClick(finalCheckoutLink)}
                                        className="mt-auto w-full bg-amber-500 text-gray-900 py-4 rounded-lg font-bold hover:bg-amber-400 transition-all duration-300 text-lg"
                                    >
                                        Subscribe Now
                                    </button>
                                    <p className="text-xs text-center text-gray-500 mt-3">
                                        Limited seats available at this price.
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-400 w-full">No subscription plans available.</div>
                )}
            </div>

            {!embedded && (
                 <button onClick={() => navigate('home')} className="text-center text-gray-400 hover:text-white mt-6 w-full">
                    &larr; Back to Dashboard
                </button>
            )}
        </div>
    );
};

export default SubscriptionPage;
