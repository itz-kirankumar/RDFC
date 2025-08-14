import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { nanoid } from 'nanoid';

// --- Reusable Components ---

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

const calculateDiscountPercentage = (originalPrice, newPrice) => {
    if (!originalPrice || !newPrice || originalPrice <= newPrice) return 0;
    return Math.round(((originalPrice - newPrice) / originalPrice) * 100);
};

const handleSubscribeClick = (checkoutLink) => {
    if (checkoutLink) {
        window.open(checkoutLink, '_blank');
    } else {
        const defaultMessage = "Hi, I'm interested in a subscription plan.";
        const whatsappLink = `https://wa.me/919092112941?text=${encodeURIComponent(defaultMessage)}`;
        window.open(whatsappLink, '_blank');
    }
};

// --- Card Components for Different Layouts ---

const StandardPlanCard = ({ plan }) => {
    const tier = plan.tiers[0];
    const isOfferActive = tier.hasOffer && tier.offerEndTime && new Date(tier.offerEndTime.toDate()) > new Date();
    const currentPrice = isOfferActive && tier.offerPrice ? tier.offerPrice : tier.price;
    const finalCheckoutLink = isOfferActive && tier.offerCheckoutLink ? tier.offerCheckoutLink : tier.checkoutLink;
    const discountPercentage = calculateDiscountPercentage((tier.originalPrice || tier.price), currentPrice);

    return (
        <div className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 flex flex-col w-full md:w-[340px] transition-all duration-300 ease-in-out transform hover:scale-105 ${plan.isRecommended ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(252,211,77,0.4)]' : 'border border-gray-700'}`}>
            {plan.isRecommended && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-gray-900 font-bold px-4 py-1 text-sm rounded-full shadow-md">Recommended</div>}
            {discountPercentage > 0 && <div className="absolute top-0 right-0 bg-red-600 text-white font-semibold py-1 px-3 rounded-tr-xl rounded-bl-xl text-xs shadow-lg">{discountPercentage}% OFF</div>}
            
            <div className="text-center mt-2">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                <p className="text-gray-400 mt-1 text-sm">{tier.durationText || 'N/A'}</p>
            </div>
            
            <div className="my-4 text-center">
                { (tier.originalPrice || tier.price) && currentPrice < (tier.originalPrice || tier.price) && <p className="text-lg text-gray-500 line-through">₹{tier.originalPrice || tier.price}</p>}
                <p className="text-4xl font-extrabold text-white">₹{currentPrice}</p>
            </div>

            {isOfferActive && tier.offerEndTime && <CountdownTimer targetDate={tier.offerEndTime.toDate()} offerName={tier.offerName} />}
                
            <button onClick={() => handleSubscribeClick(finalCheckoutLink)} className="w-full py-2.5 mt-2 rounded-lg font-bold text-base transition-all duration-300 bg-amber-500 text-gray-900 hover:bg-amber-400">Subscribe Now</button>

            <div className="border-t border-gray-700 my-4"></div>

            <div className="flex-grow">
                <h3 className="font-semibold text-white text-center mb-3">What's Included:</h3>
                <ul className="space-y-2 text-gray-300">
                    {plan.features?.map((feature, idx) => (
                        <li key={feature.id || idx} className="flex items-start">
                            <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span className="text-sm">{feature.title}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const TieredPlanCard = ({ plan }) => {
    const [selectedTierId, setSelectedTierId] = useState(plan.tiers?.[0]?.id || null);
    
    const selectedTier = plan.tiers.find(t => t.id === selectedTierId) || plan.tiers[0];
    const isOfferActiveForSelected = selectedTier.hasOffer && selectedTier.offerEndTime && new Date(selectedTier.offerEndTime.toDate()) > new Date();
    const finalCheckoutLink = isOfferActiveForSelected && selectedTier.offerCheckoutLink ? selectedTier.offerCheckoutLink : selectedTier.checkoutLink;

    return (
        <div className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 flex flex-col w-full md:w-[360px] transition-all duration-300 ease-in-out hover:scale-105 ${plan.isRecommended ? 'border-2 border-amber-400 shadow-[0_0_20px_rgba(252,211,77,0.4)]' : 'border border-gray-700'}`}>
            {plan.isRecommended && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-gray-900 font-bold px-4 py-1 text-sm rounded-full shadow-md">Recommended</div>}
            
            <div className="text-center mt-2 flex-grow-0">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
            </div>
            
            <div className="my-6 space-y-3">
                {plan.tiers.map(tier => {
                    const isOfferActive = tier.hasOffer && tier.offerEndTime && new Date(tier.offerEndTime.toDate()) > new Date();
                    const currentPrice = isOfferActive && tier.offerPrice ? tier.offerPrice : tier.price;
                    const tierDiscount = calculateDiscountPercentage(tier.originalPrice, currentPrice);
                    const isSelected = tier.id === selectedTierId;

                    return (
                        <button 
                            key={tier.id} 
                            onClick={() => setSelectedTierId(tier.id)} 
                            className={`w-full p-3 rounded-lg text-left flex justify-between items-center transition-all duration-200 ease-in-out transform
                                ${isSelected ? 'bg-blue-700 text-white scale-105 shadow-lg' : 'bg-gray-700 hover:bg-gray-600/70 text-white'}`}
                        >
                            <div className="flex items-center space-x-2">
                                <span className="font-semibold">{tier.durationText}</span>
                                {tierDiscount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{tierDiscount}% OFF</span>}
                            </div>
                            <div className="flex items-baseline space-x-2">
                                {tierDiscount > 0 && <span className={`text-sm ${isSelected ? 'text-blue-200' : 'text-gray-500'} line-through`}>₹{tier.originalPrice}</span>}
                                <span className={`font-bold text-lg ${isSelected ? 'text-white' : 'text-amber-400'}`}>₹{currentPrice}</span>
                            </div>
                        </button>
                    );
                })}
            </div>

            <button onClick={() => handleSubscribeClick(finalCheckoutLink)} className="w-full py-2.5 mt-2 rounded-lg font-bold text-base transition-all duration-300 bg-amber-500 text-gray-900 hover:bg-amber-400">Subscribe Now</button>

            <div className="border-t border-gray-700 my-4"></div>

            <div className="flex-grow">
                <h3 className="font-semibold text-white text-center mb-3">What's Included:</h3>
                <ul className="space-y-2 text-gray-300">
                    {plan.features?.map((feature, idx) => (
                        <li key={feature.id || idx} className="flex items-start">
                            <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            <span className="text-sm">{feature.title}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


// --- Main Page Component ---
const SubscriptionPage = ({ navigate, embedded = false }) => {
    const [plans, setPlans] = useState([]);
    const [activeSaleTitle, setActiveSaleTitle] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const plansQuery = query(collection(db, 'subscriptionPlans'), orderBy('order', 'asc'));
        const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
            const now = new Date();
            const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const processedPlans = fetchedPlans.map(plan => {
                let tiers = plan.tiers;
                if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
                    tiers = [{
                        id: nanoid(), durationText: plan.durationText, price: plan.price, originalPrice: plan.originalPrice,
                        checkoutLink: plan.checkoutLink, hasOffer: plan.hasOffer, offerName: plan.offerName,
                        offerPrice: plan.offerPrice, offerEndTime: plan.offerEndTime, offerCheckoutLink: plan.offerCheckoutLink
                    }];
                }

                const tiersWithOfferStatus = tiers.map(tier => {
                    const offerEndTime = tier.offerEndTime?.toDate();
                    if (tier.hasOffer && offerEndTime && now > offerEndTime) {
                        return { ...tier, hasOffer: false };
                    }
                    return tier;
                });
                
                return { ...plan, tiers: tiersWithOfferStatus };
            }).filter(plan => plan.isActive);

            setPlans(processedPlans);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching subscription plans:", error);
            setLoading(false);
        });

        const bannersQuery = query(collection(db, 'banners'), where('isActive', '==', true), orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => {
            const now = new Date();
            const activeBanner = snapshot.docs.map(doc => doc.data()).find(b => {
                const startTime = b.startTime?.toDate();
                const endTime = b.endTime?.toDate();
                if (!startTime && !endTime) return true;
                if (startTime && !endTime) return now >= startTime;
                if (!startTime && endTime) return now <= endTime;
                return now >= startTime && now <= endTime;
            });
            setActiveSaleTitle(activeBanner?.saleTitle || '');
        });

        return () => { unsubscribePlans(); unsubscribeBanners(); };
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className={`max-w-7xl mx-auto ${!embedded ? 'py-12' : 'py-4'} px-4 sm:px-6 lg:px-8`}>
            <div className="text-center mb-12">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'} tracking-tight`}>Unlock Your Full Potential</h1>
                <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">Join our program to master Reading Comprehension and stay ahead.</p>
                {activeSaleTitle && <h2 className="mt-6 text-2xl font-bold bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300 text-transparent bg-clip-text animate-pulse">{activeSaleTitle}</h2>}
            </div>
            
            <div className="flex flex-wrap justify-center gap-8 items-stretch">
                {plans.length > 0 ? (
                    plans.map((plan) => {
                        if (plan.tiers && plan.tiers.length > 1) {
                            return <TieredPlanCard key={plan.id} plan={plan} />;
                        } else {
                            return <StandardPlanCard key={plan.id} plan={plan} />;
                        }
                    })
                ) : (
                    <div className="text-center text-gray-400 w-full">No subscription plans available.</div>
                )}
            </div>

            {!embedded && (
                 <div className="text-center mt-10">
                    <button onClick={() => navigate('home')} className="text-gray-400 hover:text-white font-semibold">&larr; Back to Dashboard</button>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPage;