import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Fragment } from 'react';

// Component to handle countdown timer logic for a single plan or banner
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
        return null;
    }

    return (
        <div className="mt-2 text-center">
            {/* Updated gradient and animation to match LoginPage's CountdownTimer */}
            <span className={`bg-gradient-to-r from-red-600 via-red-400 to-red-600 text-transparent bg-clip-text font-bold text-sm animate-shine`}>
                {offerName || 'Ends in'}: {timeLeft.days ? `${timeLeft.days}d ` : ''}
                {formatTime(timeLeft.hours)}:
                {formatTime(timeLeft.minutes)}:
                {formatTime(timeLeft.seconds)}
            </span>
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

        const bannersCol = collection(db, 'banners');
        const qBanners = query(bannersCol, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            const activeBannerWithSaleTitle = fetchedBanners.find(banner => banner.saleTitle);
            setActiveSaleTitle(activeBannerWithSaleTitle ? activeBannerWithSaleTitle.saleTitle : '');
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

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-zinc-950"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className={`max-w-7xl mx-auto ${!embedded ? 'mt-10' : ''} font-sans`}> {/* Changed font-inter to font-sans */}
            <style>
                {`
                @keyframes shine-pulse {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-shine-pulse {
                    background-size: 200% auto;
                    animation: shine-pulse 3s linear infinite;
                }
                
                @keyframes shine {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }

                .animate-shine {
                    background-size: 200% auto;
                    animation: shine 5s linear infinite;
                }
                
                .card-border {
                    position: relative;
                    padding: 4px;
                    border-radius: 0.5rem; /* Rounded-lg */
                    background-origin: border-box;
                    background-clip: content-box, border-box;
                    z-index: 10;
                }

                .card-border-animated::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 0.5rem;
                    padding: 4px;
                    background: linear-gradient(to right, #f59e0b, #d97706, #f59e0b);
                    -webkit-mask: 
                        linear-gradient(#fff 0 0) content-box, 
                        linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    animation: shine-pulse 3s linear infinite;
                    z-index: -1;
                }
                `}
            </style>
            
            <div className="text-center mb-12">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'} mb-4`}>
                    Unlock Your Full Potential
                </h1>
                <p className="mt-4 text-lg text-zinc-400"> {/* Changed text-gray-400 to text-zinc-400 */}
                    Join our program to master Reading Comprehension and stay ahead.
                </p>
                {activeSaleTitle && (
                    <h2 className="mt-6 text-2xl font-bold bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text animate-shine-pulse">
                        {activeSaleTitle}
                    </h2>
                )}
            </div>
            
            {/* Subscription Plans Section */}
            <div className="flex flex-col lg:flex-row justify-center items-stretch space-y-8 lg:space-y-0 lg:space-x-8 px-4">
                {plans.length > 0 ? (
                    plans.map((plan) => {
                        const isOfferActive = plan.hasOffer && plan.offerEndTime && new Date(plan.offerEndTime.toDate()) > new Date();
                        const currentPrice = isOfferActive && plan.offerPrice ? plan.offerPrice : plan.price;
                        const finalCheckoutLink = isOfferActive && plan.offerCheckoutLink ? plan.offerCheckoutLink : plan.checkoutLink;
                        const discountPercentage = calculateDiscountPercentage((plan.originalPrice || plan.price), currentPrice);

                        return (
                            <div key={plan.id} className="w-full lg:w-1/3">
                                <div 
                                    className={`p-8 flex flex-col bg-zinc-950 shadow-2xl relative rounded-lg h-full
                                        ${plan.isRecommended ? 'card-border card-border-animated' : 'border-2 border-zinc-800'}`}
                                >
                                    {plan.isRecommended && (
                                        <div className="absolute top-0 left-0 bg-amber-400 text-zinc-900 font-bold px-3 py-1 text-sm rounded-br-lg">
                                            Save More!
                                        </div>
                                    )}
                                    {discountPercentage > 0 && (
                                        <div className="absolute top-0 right-0 bg-red-600 text-white font-semibold py-1 px-3 rounded-tr-lg rounded-bl-lg text-xs">
                                            {discountPercentage}% OFF!
                                        </div>
                                    )}
                                    
                                    <div className="mt-6 text-center">
                                        <h2 className="text-3xl font-bold text-white">
                                            {plan.name}
                                        </h2>
                                    </div>
                                    
                                    <div className="flex flex-col items-center mt-4">
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-4xl font-extrabold text-white">₹{currentPrice}</span>
                                            { (plan.originalPrice || plan.price) && currentPrice < (plan.originalPrice || plan.price) &&
                                                <span className="text-xl text-zinc-500 line-through">₹{plan.originalPrice || plan.price}</span>
                                            }
                                        </div>
                                        <p className="text-sm text-zinc-400 mt-1">{plan.durationText || 'N/A'}</p>
                                    </div>

                                    {isOfferActive && plan.offerEndTime && <CountdownTimer targetDate={plan.offerEndTime.toDate()} offerName={plan.offerName} />}

                                    <ul className="my-8 space-y-6 text-zinc-300 px-4 flex-grow">
                                        {plan.features && plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start text-left">
                                                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                <div className="flex-grow">
                                                    <h3 className="font-semibold text-lg text-white">{feature.title}</h3>
                                                    <p className="text-sm text-zinc-400 mt-1">{feature.description}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-auto flex justify-center">
                                        <button 
                                            onClick={() => handleSubscribeClick(finalCheckoutLink)}
                                            className="w-11/12 bg-amber-500 text-zinc-900 py-4 rounded-lg font-bold hover:bg-amber-400 transition-all duration-300 text-lg"
                                        >
                                            Subscribe Now
                                        </button>
                                    </div>
                                    <p className="text-xs text-center text-zinc-500 mt-3">
                                        Limited seats available at this price.
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-zinc-400 w-full">No subscription plans available.</div>
                )}
            </div>

            {!embedded && (
                 <button onClick={() => navigate('home')} className="text-center text-zinc-400 hover:text-white mt-6 w-full">
                    &larr; Back to Dashboard
                </button>
            )}
        </div>
    );
};

export default SubscriptionPage;