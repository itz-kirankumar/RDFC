import React from 'react';

const SubscriptionPage = ({ navigate, embedded = false }) => {
    
    // Updated plan with new feature list
    const plan = {
        name: 'Read Daily For CAT Program',
        price: '499',
        originalPrice: '1000',
        features: [
            { title: 'Deep Dive Articles', description: 'Access to exclusive daily articles to build your reading skills.' },
            { title: 'Article-Specific RC Tests', description: 'Test your comprehension on each article with dedicated RC questions.' },
            { title: 'Exclusive WhatsApp Group', description: 'Connect with a community of aspirants and get direct support from our team.' },
            { title: 'Deep Dive Insights', description: 'Analyze your performance with powerful, in-depth metrics to track your progress.' },
            { title: 'Full Access until CAT 2025', description: 'All passages and tests are available to you until the CAT 2025 exam.' }
        ],
    };

    const handleSubscribeClick = () => {
        const whatsappUrl = "https://wa.me/919092112941?text=Hi%2C%20RDFC%20Team!!%20I%20wanted%20to%20enroll%20for%20Read%20Daily%20For%20CAT%20Program.";
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className={`max-w-4xl mx-auto ${!embedded && 'mt-10'} font-inter`}>
            <div className="text-center mb-10">
                <h1 className={`font-extrabold text-white ${embedded ? 'text-3xl' : 'text-4xl'}`}>
                    Unlock Your Full Potential
                </h1>
                <p className="mt-4 text-lg text-gray-400">
                    Join our program to master Reading Comprehension and stay ahead.
                </p>
            </div>
            
            <div className="flex justify-center">
                <div className="border-2 border-amber-400 rounded-lg p-8 flex flex-col bg-gray-900 shadow-2xl w-full max-w-lg relative overflow-hidden">
                    
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
                        <p className="text-sm text-gray-400">per user</p>
                    </div>

                    <ul className="my-8 space-y-6 text-gray-300 flex-grow">
                        {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-start text-left">
                                <svg className="w-6 h-6 text-green-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                <div>
                                    <h3 className="font-semibold text-lg text-white">{feature.title}</h3>
                                    <p className="text-sm text-gray-400 mt-1">{feature.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button 
                        onClick={handleSubscribeClick}
                        className="mt-auto w-full bg-amber-500 text-gray-900 py-4 rounded-lg font-bold hover:bg-amber-400 transition-all transform hover:scale-105 text-lg"
                    >
                        Subscribe Now
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-3">
                        Limited seats available at this price.
                    </p>

                    {!embedded && (
                         <button onClick={() => navigate('home')} className="text-center text-gray-400 hover:text-white mt-6 w-full">
                            &larr; Back to Dashboard
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPage;
