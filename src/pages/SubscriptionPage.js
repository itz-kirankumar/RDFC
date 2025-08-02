import React from 'react';

const SubscriptionPage = () => {
    
    const plan = {
        name: 'CAT Premium Access',
        price: '499',
        originalPrice: '999',
        features: [
            '15 Full-Length VARC Sectionals',
            '15 Full-Length QA Sectionals',
            '15 Full-Length DILR Sectionals',
            '20 Full-Length Mock Tests',
            '90 Daily VARC Tests',
            '90 Daily QA Tests',
            '90 Daily DILR Tests',
            'Detailed Performance Analytics',
            'Access to all future test updates'
        ],
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 animate-fade-in">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-white">Unlock Your Full Potential</h1>
                <p className="mt-4 text-lg text-gray-400">You've completed your free trials. Choose a plan to get unlimited access to all our premium tests and features.</p>
            </div>
            
            <div className="flex justify-center">
                <div className="border-2 border-amber-400 rounded-lg p-8 flex flex-col bg-gray-800 shadow-2xl w-full max-w-lg relative overflow-hidden">
                    
                    <div className="absolute top-0 -right-20">
                        <div className="transform rotate-45 bg-amber-500 text-center text-white font-semibold py-2 px-20 text-sm uppercase tracking-wider">
                            50% OFF
                        </div>
                    </div>

                    <div className="text-center">
                        <span className="bg-gray-700 text-amber-300 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            Early Bird Offer
                        </span>
                        <h2 className="text-3xl font-semibold text-white mt-4">{plan.name}</h2>
                    </div>

                    <div className="my-8 text-center">
                        <span className="text-5xl font-bold text-white">₹{plan.price}</span>
                        <span className="text-2xl text-gray-400 line-through ml-2">₹{plan.originalPrice}</span>
                    </div>

                    <ul className="mb-8 space-y-4 text-gray-300 flex-grow">
                        {plan.features.map(feature => (
                            <li key={feature} className="flex items-start">
                                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    <button 
                        onClick={() => alert("This button is ready for your payment link!")}
                        className="mt-auto w-full bg-amber-500 text-gray-900 py-3 rounded-lg font-semibold hover:bg-amber-400 transition-all transform hover:scale-105 text-lg"
                    >
                        Subscribe Now
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">Limited seats available at this price.</p>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
