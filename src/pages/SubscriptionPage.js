import React, { useState, useEffect } from 'react';

// Custom hook for the 24-hour countdown timer
const useDailyCountdown = () => {
    const calculateTimeLeft = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const difference = tomorrow - now;

        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
            };
        }

        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        // Cleanup the timer on component unmount
        return () => clearTimeout(timer);
    });

    return timeLeft;
};

const SubscriptionPage = ({ navigate, embedded = false }) => {
    
    const timeLeft = useDailyCountdown();

    const plans = [
        {
            name: 'Read Daily For CAT Program',
            price: '499',
            originalPrice: '1000',
            duration: 'until CAT 2025',
            features: [
                { title: 'Deep Dive Articles', description: 'Access to exclusive daily articles to build your reading skills.' },
                { title: 'Article-Specific RC Tests', description: 'Test your comprehension on each article with dedicated RC questions.' },
                { title: 'Exclusive WhatsApp Group', description: 'Connect with a community of aspirants and get direct support from our team.' },
                { title: 'Deep Dive Insights', description: 'Analyze your performance with powerful, in-depth metrics to track your progress.' },
                { title: 'Full Access until CAT 2025', description: 'All passages and tests are available to you until the CAT 2025 exam.' }
            ],
            whatsappMessage: "Hi, RDFC Team!! I wanted to enroll for Read Daily For CAT Program.",
        },
        {
            name: 'RDFC Monthly Subscription',
            price: '99',
            originalPrice: '200',
            duration: 'per month',
            features: [
                { title: 'Deep Dive Articles', description: 'Access to exclusive daily articles to build your reading skills.' },
                { title: 'Article-Specific RC Tests', description: 'Test your comprehension on each article with dedicated RC questions.' },
                { title: 'Exclusive WhatsApp Group', description: 'Connect with a community of aspirants and get direct support from our team.' },
                { title: 'Deep Dive Insights', description: 'Analyze your performance with powerful, in-depth metrics to track your progress.' },
            ],
            whatsappMessage: "Hi, RDFC Team! I wanted to enroll for the RDFC Monthly Subscription.",
        }
    ];

    const handleSubscribeClick = (message) => {
        const whatsappUrl = `https://wa.me/919092112941?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const formatTime = (time) => {
        return time < 10 ? `0${time}` : time;
    };

    return (
        <div className={`max-w-6xl mx-auto ${!embedded && 'mt-10'} font-inter`}>
            <div className="text-center mb-10">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'}`}>
                    Unlock Your Full Potential
                </h1>
                <p className="mt-4 text-lg text-gray-400">
                    Join our program to master Reading Comprehension and stay ahead.
                </p>
                <div className="mt-6 flex justify-center items-center space-x-2 text-white">
                    <span className="text-red-500 font-bold text-xl">Limited Time Deal:</span>
                    <span className="text-2xl font-mono">{formatTime(timeLeft.hours || 0)}</span>:
                    <span className="text-2xl font-mono">{formatTime(timeLeft.minutes || 0)}</span>:
                    <span className="text-2xl font-mono">{formatTime(timeLeft.seconds || 0)}</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {plans.map((plan, index) => (
                    <div key={index} className="border-2 border-amber-400 rounded-lg p-8 flex flex-col bg-gray-900 shadow-2xl relative overflow-hidden">
                        
                        <div className="absolute top-4 right-4 bg-red-600 text-white font-semibold py-1 px-3 rounded-full text-xs">
                            50% OFF!
                        </div>

                        <h2 className="text-3xl font-bold text-white text-center mt-4">
                            {plan.name}
                        </h2>
                        
                        <div className="flex flex-col items-center mt-4">
                            <div className="flex items-baseline space-x-2">
                                <span className="text-4xl font-extrabold text-white">₹{plan.price}</span>
                                <span className="text-xl text-gray-500 line-through">₹{plan.originalPrice}</span>
                            </div>
                            <p className="text-sm text-gray-400">{plan.duration}</p>
                        </div>

                        <ul className="my-8 space-y-6 text-gray-300 flex-grow">
                            {plan.features.map((feature, idx) => (
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
                            onClick={() => handleSubscribeClick(plan.whatsappMessage)}
                            className="mt-auto w-full bg-amber-500 text-gray-900 py-4 rounded-lg font-bold hover:bg-amber-400 transition-all transform hover:scale-105 text-lg"
                        >
                            Subscribe Now
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-3">
                            Limited seats available at this price.
                        </p>
                    </div>
                ))}
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