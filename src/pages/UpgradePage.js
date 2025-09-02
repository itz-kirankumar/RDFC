import React, { useState, useEffect, Fragment } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';
import { ShieldExclamationIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { FaCheckCircle, FaArrowLeft } from 'react-icons/fa';

// --- Reusable Components (Theming Updated) ---
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
        const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
        return () => clearInterval(timer);
    }, [targetDate]);
    const formatTime = (time) => String(time || 0).padStart(2, '0');
    if (Object.keys(timeLeft).length === 0) return null;
    return (
        <div className="my-3 text-center animate-pulse">
            <p className="text-xs font-bold text-pink-400">{offerName || 'Offer Ends In'}</p>
            <p className="font-mono text-base text-pink-400">
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
const PlanCard = ({ plan, userData, initiatePaymentForLoggedInUser }) => {
    const [selectedTier, setSelectedTier] = useState(plan.tiers && plan.tiers.length > 0 ? plan.tiers[0] : null);
    const firstActiveOfferTier = plan.tiers.find(tier =>
        tier.hasOffer && tier.offerEndTime && new Date(tier.offerEndTime.toDate()) > new Date()
    );
    const handleSubscribeClick = () => {
        initiatePaymentForLoggedInUser(plan, selectedTier, userData);
    };
    if (!plan.tiers || plan.tiers.length === 0) return null;
    return (
        <div className={`relative bg-gray-900/70 backdrop-blur-sm rounded-2xl p-5 flex flex-col w-full max-w-sm min-h-[500px] transition-all duration-300 ease-in-out transform hover:scale-[1.03] ${plan.isRecommended ? 'border-2 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]' : 'border border-gray-700'}`}>
            {plan.isRecommended && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-pink-500 text-white font-bold px-3 py-1 text-xs rounded-full shadow-md z-10">Recommended</div>}
            <div className="flex-grow">
                <div className="text-center mt-2"><h2 className="text-xl font-bold text-white">{plan.name}</h2>{firstActiveOfferTier?.offerName && <p className="text-pink-400 mt-1 text-sm font-semibold">{firstActiveOfferTier.offerName}</p>}</div>
                {firstActiveOfferTier && (<CountdownTimer targetDate={firstActiveOfferTier.offerEndTime.toDate()} />)}
                <div className="my-4 space-y-2">
                    {plan.tiers.map(tier => {
                        const isOfferActive = tier.hasOffer && tier.offerEndTime && new Date(tier.offerEndTime.toDate()) > new Date();
                        const currentPrice = isOfferActive ? tier.offerPrice : tier.price;
                        const originalPrice = tier.originalPrice || (isOfferActive ? tier.price : null);
                        const tierDiscount = calculateDiscountPercentage(originalPrice, currentPrice);
                        const isSelected = tier.id === selectedTier?.id;
                        return (
                            <button key={tier.id} onClick={() => setSelectedTier(tier)} className={`w-full p-2.5 rounded-lg text-left flex justify-between items-center transition-all duration-300 ease-in-out ${isSelected ? 'bg-purple-600 text-white scale-105 shadow-lg' : 'bg-gray-700/80 hover:bg-gray-600/70 text-white'}`}><div className="flex items-center space-x-2"><span className="font-semibold text-sm">{tier.durationText}</span>{tierDiscount > 0 && <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{tierDiscount}% OFF</span>}</div><div className="flex items-baseline space-x-1.5">{tierDiscount > 0 && originalPrice && <span className={`text-xs ${isSelected ? 'text-gray-200' : 'text-gray-500'} line-through`}>₹{originalPrice}</span>}<span className={`font-bold text-base ${isSelected ? 'text-white' : 'text-pink-400'}`}>₹{currentPrice}</span></div></button>
                        );
                    })}
                </div>
                <div className="border-t border-gray-700 my-3"></div>
                <div><h3 className="font-semibold text-white text-left mb-2 text-sm">What's Included:</h3><ul className="space-y-1.5 text-gray-300">{(plan.features || []).map((feature, index) => (<li key={index} className="flex items-start"><svg className="w-4 h-4 text-green-400 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg><span className="text-xs">{typeof feature === 'object' ? feature.title : feature}</span></li>))}</ul></div>
            </div>
            <div className="mt-5 flex-shrink-0"><button onClick={handleSubscribeClick} className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 bg-purple-600 text-white hover:bg-purple-500 shadow-lg hover:shadow-xl">Upgrade Now</button></div>
        </div>
    );
};

const AlreadySubscribedModal = ({ isOpen, onClose, onGoToDashboard }) => (
    <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[10000]" onClose={onClose}>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/60 backdrop-blur-sm" /></Transition.Child>
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white flex items-center">
                            <CheckCircleIcon className="h-6 w-6 text-green-400 mr-3" />
                            Plan Active
                        </Dialog.Title>
                        <div className="mt-4">
                            <p className="text-sm text-gray-300">You are already subscribed to this plan.</p>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button type="button" onClick={onGoToDashboard} className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Go to Dashboard</button>
                        </div>
                    </Dialog.Panel>
                </div>
            </div>
        </Dialog>
    </Transition>
);

const PaymentStatusOverlay = ({ status, message, onComplete }) => {
    if (status === 'idle') return null;
    const content = {
        processing: { icon: <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white mb-4"></div>, title: "Processing Payment...", message: message || "Please wait..." },
        success: { icon: <FaCheckCircle className="h-16 w-16 text-green-400 mb-4" />, title: "Upgrade Successful!", message: "Your new features have been unlocked." },
        failed: { icon: <ShieldExclamationIcon className="h-16 w-16 text-red-400 mb-4" />, title: "Payment Failed", message: message || "Please try again." }
    };
    const currentContent = content[status];
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-[9999]">
            {currentContent.icon}
            <h2 className="text-2xl font-bold text-white mb-2">{currentContent.title}</h2>
            <p className="text-gray-400 mb-8 text-center px-4">{currentContent.message}</p>
            {status !== 'processing' && (<button onClick={onComplete} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Back to Dashboard</button>)}
        </div>
    );
};

// --- Main Upgrade Page Component ---
const UpgradePage = ({ navigate }) => {
    const { userData } = useAuth();
    const [upgradePlans, setUpgradePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [razorpayKeyId, setRazorpayKeyId] = useState(null);
    const [paymentState, setPaymentState] = useState({ status: 'idle' });
    const [showAlreadySubscribedModal, setShowAlreadySubscribedModal] = useState(false);

    const initiatePaymentForLoggedInUser = async (plan, selectedTier, currentUser) => {
        const lastPurchasedTierId = sessionStorage.getItem('lastPurchasedTierId');
        if ((currentUser.tierId && currentUser.tierId === selectedTier.id) || lastPurchasedTierId === selectedTier.id) {
            setShowAlreadySubscribedModal(true);
            return;
        }
        await proceedToPayment(plan, selectedTier, currentUser);
    };

    const proceedToPayment = async (plan, selectedTier, currentUser) => {
        setPaymentState({ status: 'processing', message: 'Connecting to payment gateway...' });
        const isOfferActive = selectedTier.hasOffer && selectedTier.offerEndTime && new Date(selectedTier.offerEndTime.toDate()) > new Date();
        const currentPrice = isOfferActive ? selectedTier.offerPrice : selectedTier.price;

        const options = {
            key: razorpayKeyId, amount: currentPrice * 100, currency: "INR", name: `${plan.name} - ${selectedTier.durationText}`,
            description: `Upgrade to ${plan.name}`, image: "https://i.postimg.cc/fy6n7jd3/RDFC.jpg",
            handler: function (response) {
                sessionStorage.setItem('lastPurchasedTierId', selectedTier.id);
                setPaymentState({ status: 'processing', message: 'Verifying payment...' });
                setTimeout(() => setPaymentState({ status: 'success' }), 2000);
            },
            modal: { ondismiss: () => setPaymentState({ status: 'idle' }) },
            prefill: { name: currentUser?.displayName, email: currentUser?.email, contact: currentUser?.phoneNumber },
            notes: { user_id: currentUser.uid, plan_id: plan.id, tier_id: selectedTier.id, type: 'upgrade' },
            theme: { color: "#f59e0b" }
        };

        try {
            const rzp1 = new window.Razorpay(options);
            rzp1.on('payment.failed', (response) => {
                setPaymentState({ status: 'failed', message: response.error.description });
            });
            rzp1.open();
        } catch (e) {
            setPaymentState({ status: 'failed', message: "Could not open payment window." });
        }
    };

    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
        setRazorpayKeyId("rzp_live_dpCBtIAmY3C42X");

        const plansQuery = query(collection(db, 'subscriptionPlans'), where('isActive', '==', true), where('type', '==', 'Upgrade'), orderBy('order', 'asc'));
        const unsubscribe = onSnapshot(plansQuery, snapshot => {
            setUpgradePlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => { unsubscribe(); if (document.body.contains(script)) { document.body.removeChild(script); }};
    }, []);

    if (loading) { return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>; }

    return (
        <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <PaymentStatusOverlay status={paymentState.status} message={paymentState.message} onComplete={() => { setPaymentState({ status: 'idle' }); navigate('home'); }} />
            <AlreadySubscribedModal isOpen={showAlreadySubscribedModal} onClose={() => setShowAlreadySubscribedModal(false)} onGoToDashboard={() => navigate('home')} />
            
            <div className={`transition-all duration-300 ${paymentState.status !== 'idle' || showAlreadySubscribedModal ? 'pointer-events-none blur-sm' : ''}`}>
                <button onClick={() => navigate('home')} className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
                    <FaArrowLeft />
                    <span>Back to Dashboard</span>
                </button>

                <div className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Upgrade Your Plan</h1>
                    <p className="mt-3 max-w-2xl mx-auto text-lg text-gray-400">Unlock more features and take your preparation to the next level.</p>
                </div>

                <div className="flex flex-wrap justify-center gap-8 items-stretch">
                    {upgradePlans.length > 0 ? (
                        upgradePlans.map((plan) => (
                            <PlanCard key={plan.id} plan={plan} userData={userData} initiatePaymentForLoggedInUser={initiatePaymentForLoggedInUser} />
                        ))
                    ) : (
                        <div className="text-center text-gray-400 w-full p-8 bg-gray-800/50 rounded-lg">
                            <h3 className="text-xl font-semibold text-white">No Upgrades Available</h3>
                            <p className="mt-2 text-gray-500">There are currently no upgrade plans available. Check back later!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpgradePage;