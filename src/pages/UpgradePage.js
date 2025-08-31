import React from 'react';
import { FaArrowLeft, FaCheckCircle, FaPlusCircle, FaStar } from 'react-icons/fa';

const UpgradePage = ({ navigate }) => {
  
  // Data derived from the subscription plans and schedule documents
  const currentPlan = {
    name: 'RDFC Daily Drill Plan',
    features: [
      'Free Deep Dive RDFC Articles',
      'Article-Specific RDFC Tests',
      'Add-on VA Tests',
      'Daily 10-Min RC Tests',
      'Exclusive WhatsApp Group',
    ],
  };

  const upgradePlan = {
    name: 'RDFC Comprehensive Plan',
    price: '₹149',
    tagline: 'The only sectionals you need to crack CAT.',
    features: [
        { text: '15 Core Sectionals with Curated Difficulty', isNew: true },
        { text: 'VARC Core 01-10: Ramps up from easy to hard difficulty', isNew: false },
        { text: 'VARC Core 11-15: Features long RCs to build stamina', isNew: false },
        { text: '5 Challenging Sectionals for Final Prep', isNew: true },
        { text: 'Replicates worst-case CAT scenarios & common traps', isNew: false },
    ],
  };

  // The upgrade payment link
  const paymentLink = 'http://rzp.io/rzp/FTsYerI';

  const handlePayment = () => {
    window.open(paymentLink, '_blank');
  };

  return (
    <div className="bg-slate-900 text-white flex flex-col items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-4xl">
        <button 
          onClick={() => navigate('home')} 
          className="flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <FaArrowLeft />
          <span>Back to Dashboard</span>
        </button>

        <div className="bg-slate-800/50 rounded-xl shadow-2xl p-6 sm:p-8 border border-slate-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Upgrade to Comprehensive
            </h1>
            <p className="text-slate-300 mt-2 text-lg font-semibold">{upgradePlan.tagline}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Current Plan Card */}
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col">
              <h2 className="text-xl font-semibold text-slate-300">Your Current Plan</h2>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{currentPlan.name}</p>
              <div className="border-t border-slate-700 my-3"></div>
              <ul className="space-y-2 text-slate-300 flex-grow">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <FaCheckCircle className="text-cyan-500 mt-1 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade Plan Card */}
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-lg border border-purple-500 shadow-2xl shadow-purple-500/20 flex flex-col">
              <div className="absolute top-0 right-6 -mt-3 bg-yellow-400 text-slate-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Recommended</div>
              <h2 className="text-xl font-semibold text-white">What You'll Unlock</h2>
              <p className="text-2xl font-bold text-yellow-300 mt-1">{upgradePlan.name}</p>
              <div className="border-t border-purple-500 my-3"></div>
              <ul className="space-y-2 flex-grow">
                 {upgradePlan.features.map((feature, index) => (
                  <li key={index} className={`flex items-start space-x-3 ${feature.isNew ? 'font-semibold text-white' : 'text-purple-200 pl-4'}`}>
                    {feature.isNew ? 
                        <FaPlusCircle className="text-yellow-300 mt-1 flex-shrink-0" /> :
                        <FaStar className="text-purple-400 mt-1 flex-shrink-0 text-xs" />
                    }
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-center mt-8">
              <p className="text-base text-slate-300 mb-1">Limited-time fee to upgrade</p>
              <p className="text-4xl font-bold text-white mb-4">{upgradePlan.price}</p>
              <button 
                  onClick={handlePayment}
                  className="bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 font-bold py-3 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-xl hover:shadow-yellow-400/30"
              >
                  Upgrade to Comprehensive for {upgradePlan.price}
              </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UpgradePage;