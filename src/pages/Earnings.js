import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, collection, serverTimestamp, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { Dialog, Transition } from '@headlessui/react';

// Reusable form input component for admin settings
const FormInput = ({ label, type = 'number', value, onChange, placeholder = '' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
        />
    </div>
);

// --- NEW SETTINGS MODAL ---
const SettingsModal = ({ isOpen, setIsOpen, plansToShow, myPlanShares, setMyPlanShares, onSave }) => {
    
    const handleShareChange = (planId, value) => {
        const percentage = parseInt(value, 10);
        if (value === '') {
            setMyPlanShares(prev => ({...prev, [planId]: ''}));
        } else if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
            setMyPlanShares(prev => ({...prev, [planId]: percentage}));
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Earnings Settings</Dialog.Title>
                        <p className="text-sm text-gray-400 mt-1">Set your share percentage for each subscription plan.</p>
                        <div className="mt-4 max-h-60 overflow-y-auto space-y-4 pr-2">
                            {plansToShow.map(plan => (
                                <FormInput 
                                    key={plan.id}
                                    label={`Share for "${plan.name}" (%)`}
                                    type="number" 
                                    value={myPlanShares[plan.id] ?? ''} 
                                    onChange={e => handleShareChange(plan.id, e.target.value)}
                                    placeholder="e.g., 50"
                                />
                            ))}
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={onSave}>Save Changes</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


export default function Earnings() {
    const { userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [mySettledUsers, setMySettledUsers] = useState([]);
    const [allPlans, setAllPlans] = useState([]);
    const [adminShares, setAdminShares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [myPlanShares, setMyPlanShares] = useState({});

    useEffect(() => {
        if (!userData?.uid) {
            setLoading(false);
            return;
        }

        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const fetchedUsers = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setLoading(false);
        });

        // Fetch ALL plans (active and inactive) for settings modal logic
        const unsubscribePlans = onSnapshot(collection(db, 'subscriptionPlans'), (snapshot) => {
            setAllPlans(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
        });

        const mySettledUsersColRef = collection(db, 'adminSettings', userData.uid, 'settledUsers');
        const unsubscribeMySettledUsers = onSnapshot(mySettledUsersColRef, (snapshot) => {
            setMySettledUsers(snapshot.docs.map(docSnap => docSnap.id));
        });

        const earningsConfigRef = doc(db, 'earnings', 'config');
        const unsubscribeAdminShares = onSnapshot(earningsConfigRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const allShares = data.adminShares || [];
                setAdminShares(allShares);
                const myShareData = allShares.find(share => share.uid === userData.uid);
                setMyPlanShares(myShareData?.planShares || {});
            }
        });

        return () => {
            unsubscribeUsers();
            unsubscribePlans();
            unsubscribeMySettledUsers();
            unsubscribeAdminShares();
        };
    }, [userData?.uid]);

    const handleUpdateMyShare = async () => {
        try {
            const earningsConfigRef = doc(db, 'earnings', 'config');
            let newAdminShares = [...adminShares];
            const adminIndex = newAdminShares.findIndex(share => share.uid === userData.uid);

            const sharesToSave = {};
            for (const planId in myPlanShares) {
                const shareValue = parseInt(myPlanShares[planId], 10);
                if (!isNaN(shareValue) && shareValue >= 0 && shareValue <= 100) {
                    sharesToSave[planId] = shareValue;
                }
            }

            if (adminIndex > -1) {
                newAdminShares[adminIndex].planShares = sharesToSave;
            } else {
                newAdminShares.push({ uid: userData.uid, planShares: sharesToSave });
            }

            await updateDoc(earningsConfigRef, { adminShares: newAdminShares });
            alert("Your share percentages have been updated.");
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error("Error updating share percentages:", error);
            alert("Failed to update share percentages.");
        }
    };
    
    const handleToggleMySettledStatus = async (userId, newStatus) => {
        try {
            const mySettledUserRef = doc(db, 'adminSettings', userData.uid, 'settledUsers', userId);
            if (newStatus) {
                await setDoc(mySettledUserRef, { timestamp: serverTimestamp() });
            } else {
                await deleteDoc(mySettledUserRef);
            }
        } catch (error) {
            console.error(`Error toggling settled status for user ${userId}:`, error);
            alert(`Failed to update settled status.`);
        }
    };

    const financialData = useMemo(() => {
        const premiumUsers = users.filter(user => user.isSubscribed);
        const DEDUCTION_RATE = 0.20;

        const unsettledUsersList = premiumUsers.filter(user => user.planPrice && !mySettledUsers.includes(user.id));
        
        const planWiseEarnings = {};

        unsettledUsersList.forEach(user => {
            const planName = user.planName || 'Custom Plan';
            const planId = user.planId || 'custom';
            if (!planWiseEarnings[planName]) {
                planWiseEarnings[planName] = { gross: 0, planId: planId };
            }
            planWiseEarnings[planName].gross += user.planPrice;
        });

        let grandTotalGross = 0;
        let myTotalShare = 0;

        for (const planName in planWiseEarnings) {
            const plan = planWiseEarnings[planName];
            const deduction = plan.gross * DEDUCTION_RATE;
            const net = plan.gross - deduction;
            plan.deduction = deduction;
            plan.net = net;
            
            const myShareForThisPlan = myPlanShares[plan.planId] || 0;
            plan.mySharePercentage = myShareForThisPlan;
            myTotalShare += (myShareForThisPlan / 100) * net;
            
            grandTotalGross += plan.gross;
        }

        const grandTotalNet = grandTotalGross * (1 - DEDUCTION_RATE);

        const unsettledPlanIds = new Set(Object.values(planWiseEarnings).map(p => p.planId));
        const plansToShowInSettings = allPlans.filter(p => p.isActive || unsettledPlanIds.has(p.id));

        return {
            totalPremiumUsers: premiumUsers.length,
            totalEarningsExpected: premiumUsers.reduce((sum, user) => sum + (user.planPrice || 0), 0),
            settledByMeCount: mySettledUsers.length,
            unsettledUsersCount: unsettledUsersList.length,
            unsettledUsersList,
            planWiseEarnings,
            grandTotalNet,
            myTotalShare,
            plansToShowInSettings
        };

    }, [users, mySettledUsers, myPlanShares, allPlans]);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Earnings Dashboard</h1>
                <button onClick={() => setIsSettingsModalOpen(true)} className="bg-gray-700 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors">
                    Settings
                </button>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Overall Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Premium Users</p>
                        <p className="text-white text-2xl font-bold">{financialData.totalPremiumUsers}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Earnings (Expected)</p>
                        <p className="text-white text-2xl font-bold">₹{financialData.totalEarningsExpected.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Net Unsettled (All Plans)</p>
                        <p className="text-green-400 text-2xl font-bold">₹{financialData.grandTotalNet.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">My Total Share</p>
                        <p className="text-white text-2xl font-bold">₹{financialData.myTotalShare.toLocaleString()}</p>
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">Plan-wise Unsettled Earnings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.keys(financialData.planWiseEarnings).length > 0 ? (
                        Object.entries(financialData.planWiseEarnings).map(([planName, earnings]) => (
                            <div key={planName} className="bg-gray-700 p-4 rounded-lg">
                                <h3 className="font-bold text-lg text-white mb-3">{planName}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Gross Unsettled:</span> <span className="font-semibold text-orange-400">₹{earnings.gross.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Charges (20%):</span> <span className="font-semibold text-red-400">- ₹{earnings.deduction.toLocaleString()}</span></div>
                                    <hr className="border-gray-600"/>
                                    <div className="flex justify-between"><span className="text-gray-300 font-bold">Net Earnings:</span> <span className="font-bold text-green-400">₹{earnings.net.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">My Share ({earnings.mySharePercentage}%):</span> <span className="font-semibold text-white">₹{((earnings.mySharePercentage / 100) * earnings.net).toLocaleString()}</span></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center md:col-span-2 p-4">All earnings are settled!</p>
                    )}
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-bold text-white mb-4">Unsettled Users ({financialData.unsettledUsersCount})</h3>
                    {financialData.unsettledUsersCount > 0 ? (
                         <>
                            {/* --- MOBILE CARD VIEW --- */}
                            <div className="md:hidden space-y-3">
                                {financialData.unsettledUsersList.map(user => (
                                    <div key={user.id} className="bg-gray-700 rounded-lg p-4 shadow-md">
                                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-600">
                                            <span className="text-sm font-medium text-white truncate">{user.email}</span>
                                            <span className="text-sm font-bold text-gray-300">₹{user.planPrice || '0'}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-4">
                                            <span className="text-xs text-gray-400">Plan</span>
                                            <span className="text-xs text-gray-300">{user.planName || 'N/A'}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleMySettledStatus(user.id, true)} 
                                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                                        >
                                            Mark as Settled
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* --- DESKTOP TABLE VIEW --- */}
                            <div className="hidden md:block bg-gray-700 rounded-lg overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-600">
                                    <thead className="bg-gray-600">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-700 divide-y divide-gray-600">
                                        {financialData.unsettledUsersList.map(user => (
                                            <tr key={user.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.planName || 'N/A'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">₹{user.planPrice || '0'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <button onClick={() => handleToggleMySettledStatus(user.id, true)} className="bg-blue-600 text-white px-4 py-1 rounded-md text-xs font-semibold hover:bg-blue-700">
                                                        Mark as Settled
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         </>
                    ) : (
                        <p className="text-gray-400 text-center p-4">No unsettled users found.</p>
                    )}
                </div>
            </div>

            <SettingsModal
                isOpen={isSettingsModalOpen}
                setIsOpen={setIsSettingsModalOpen}
                plansToShow={financialData.plansToShowInSettings}
                myPlanShares={myPlanShares}
                setMyPlanShares={setMyPlanShares}
                onSave={handleUpdateMyShare}
            />
        </div>
    );
}