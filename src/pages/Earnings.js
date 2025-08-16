import React, { useState, useEffect, Fragment } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
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

export default function Earnings() {
    const { userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [mySettledUsers, setMySettledUsers] = useState([]);
    const [plans, setPlans] = useState([]);
    const [adminShares, setAdminShares] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [mySharePercentage, setMySharePercentage] = useState(0);

    useEffect(() => {
        if (!userData?.uid) {
            setLoading(false);
            return;
        }

        const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
            const fetchedUsers = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setLoading(false);
        });

        const unsubscribePlans = onSnapshot(collection(db, 'subscriptionPlans'), (snapshot) => {
            const fetchedPlans = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            }));
            setPlans(fetchedPlans);
        });

        const mySettledUsersColRef = collection(db, 'adminSettings', userData.uid, 'settledUsers');
        const unsubscribeMySettledUsers = onSnapshot(mySettledUsersColRef, (snapshot) => {
            const settledUserIds = snapshot.docs.map(docSnap => docSnap.id);
            setMySettledUsers(settledUserIds);
        });

        const earningsConfigRef = doc(db, 'earnings', 'config');
        const unsubscribeAdminShares = onSnapshot(earningsConfigRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setAdminShares(data.adminShares || []);
                const myShare = (data.adminShares || []).find(share => share.uid === userData.uid);
                if (myShare) {
                    setMySharePercentage(myShare.share);
                } else {
                    setMySharePercentage(0);
                }
            } else {
                setDoc(earningsConfigRef, {
                    adminShares: [{ uid: userData.uid, share: 100 }]
                }).catch(e => console.error("Error setting default admin share:", e));
                setMySharePercentage(100);
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

            if (adminIndex > -1) {
                newAdminShares[adminIndex] = { ...newAdminShares[adminIndex], share: parseInt(mySharePercentage) };
            } else {
                newAdminShares.push({ uid: userData.uid, share: parseInt(mySharePercentage) });
            }

            await updateDoc(earningsConfigRef, { adminShares: newAdminShares });
            alert("Your share percentage has been updated.");
            setIsSettingsModalOpen(false);
        } catch (error) {
            console.error("Error updating share percentage:", error);
            alert("Failed to update share percentage.");
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

    // --- UPDATED FINANCIAL CALCULATIONS ---
    const premiumUsers = users.filter(user => user.isSubscribed);
    const totalPremiumUsers = premiumUsers.length;
    const settledByMeCount = mySettledUsers.length;
    const myShareConfig = adminShares.find(share => share.uid === userData.uid);
    const myCurrentSharePercentage = myShareConfig ? myShareConfig.share : 0;
    const otherSharePercentage = 100 - myCurrentSharePercentage;
    const DEDUCTION_RATE = 0.20; // 20% total deduction

    let totalEarningsExpected = 0;
    let grossUnsettledValue = 0;
    let unsettledUsersList = [];

    premiumUsers.forEach(user => {
        if (user.planPrice) {
            totalEarningsExpected += user.planPrice;
            if (!mySettledUsers.includes(user.id)) {
                grossUnsettledValue += user.planPrice;
                unsettledUsersList.push(user);
            }
        }
    });

    const totalDeduction = grossUnsettledValue * DEDUCTION_RATE;
    const netUnsettledAfterDeduction = grossUnsettledValue - totalDeduction;
    
    const unsettledUsersCount = unsettledUsersList.length;
    const myShareOfNetToSettle = (myCurrentSharePercentage / 100) * netUnsettledAfterDeduction;
    const otherShareOfNetToSettle = (otherSharePercentage / 100) * netUnsettledAfterDeduction;

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
                <h2 className="text-2xl font-bold text-white mb-4">Financial Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Premium Users</p>
                        <p className="text-white text-2xl font-bold">{totalPremiumUsers}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Earnings (Expected)</p>
                        <p className="text-white text-2xl font-bold">₹{totalEarningsExpected.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">My Settled Users</p>
                        <p className="text-blue-400 text-2xl font-bold">{settledByMeCount}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">My Unsettled Users</p>
                        <p className="text-orange-400 text-2xl font-bold">{unsettledUsersCount}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Unsettled Earnings (Gross)</p>
                        <p className="text-orange-400 text-2xl font-bold">₹{grossUnsettledValue.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Charges (2% + 18% GST)</p>
                        <p className="text-red-400 text-2xl font-bold">- ₹{totalDeduction.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center col-span-1 md:col-span-2 lg:col-span-2">
                        <p className="text-gray-400 text-sm">Net Unsettled Earnings (After Deduction)</p>
                        <p className="text-green-400 text-3xl font-bold">₹{netUnsettledAfterDeduction.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">My Share of Net ({myCurrentSharePercentage}%)</p>
                        <p className="text-white text-2xl font-bold">₹{myShareOfNetToSettle.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Other Share of Net ({otherSharePercentage}%)</p>
                        <p className="text-white text-2xl font-bold">₹{otherShareOfNetToSettle.toLocaleString()}</p>
                    </div>
                </div>

                <div className="mt-8">
                    <h3 className="text-xl font-bold text-white mb-4">Unsettled Users ({unsettledUsersCount})</h3>
                    {unsettledUsersCount > 0 ? (
                         <div className="bg-gray-700 rounded-lg overflow-hidden">
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
                                    {unsettledUsersList.map(user => (
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
                    ) : (
                        <p className="text-gray-400 text-center p-4">No unsettled users found.</p>
                    )}
                </div>
            </div>

             <Transition appear show={isSettingsModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsSettingsModalOpen(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Earnings Settings</Dialog.Title>
                            <div className="mt-4 space-y-4">
                                <FormInput label="My Share Percentage (%)" type="number" value={mySharePercentage} onChange={e => setMySharePercentage(e.target.value)} />
                            </div>
                            <div className="mt-6 flex justify-end space-x-2">
                                <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsSettingsModalOpen(false)}>Cancel</button>
                                <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleUpdateMyShare}>Save Changes</button>
                            </div>
                        </Dialog.Panel>
                    </div></div>
                </Dialog>
            </Transition>
        </div>
    );
}
