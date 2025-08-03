import React, { useState, useEffect, Fragment } from 'react';
import { collection, doc, updateDoc, Timestamp, serverTimestamp, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore'; 
import { db } from '../firebase/config';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext'; 

// --- Configuration Constants ---
// REQUIRED_ADMIN_EMAILS is now primarily for display/metrics, not for multi-admin logic
const REQUIRED_ADMIN_EMAILS = [
    "kiran160703kumar@gmail.com",
    "atalgupta887@gmail.com"
];

// Helper function to process user data
const processUserData = (docSnap) => { 
    const data = docSnap.data();
    return { 
        id: docSnap.id, 
        ...data,
        isSubscribed: data.isSubscribed || false,
        expiryDate: data.expiryDate || null,
        subscribedAt: data.subscribedAt || null,
        // No more 'settledByAdmins' field on user document itself for individual tracking
    };
};

// --- Reusable Form Input Component ---
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

// --- User Edit Modal Sub-Component ---
const UserEditModal = ({ isOpen, setIsOpen, user, handleGrantAccess, handleRevokeAccess, validityDays, setValidityDays }) => {
    if (!isOpen || !user) return null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Manage Premium Access</Dialog.Title>
                        <div className="mt-2"><p className="text-sm text-gray-400">Manage subscription for {user.email}</p></div>
                        
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Set Validity (in days)</label>
                                <div className="mt-2 flex space-x-2">
                                    {[30, 90, 180, 365].map(days => (
                                        <button key={days} onClick={() => setValidityDays(days)} className={`px-3 py-1 text-xs rounded-full ${validityDays === days ? 'bg-white text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{days}d</button>
                                    ))}
                                </div>
                                <FormInput type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            {user.isSubscribed && <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={() => handleRevokeAccess(user.id, user.email)}>Revoke Access</button>}
                            <div className="flex space-x-2 ml-auto">
                                <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                                <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={() => handleGrantAccess(user.id, user.email, validityDays)}>Update Access</button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- User Row Component (for 'All Users' tab) ---
const UserRow = ({ user, handleOpenModal }) => {
    return (
        <tr key={user.id}> 
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isSubscribed ? 'bg-green-800 text-green-100' : 'bg-gray-700 text-gray-300'}`}>
                    {user.isSubscribed ? 'PREMIUM' : 'Standard'}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.isSubscribed && user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onClick={() => handleOpenModal(user)} className="text-gray-300 hover:text-white">Manage Access</button>
            </td>
        </tr>
    );
};

// --- Premium User Row Component (for 'Premium Users' tab, with individual admin settlement) ---
const PremiumUserRow = ({ user, mySettledUsers, handleToggleMySettledStatus }) => {
    const isSettledByMe = mySettledUsers.includes(user.id);

    return (
        <tr key={user.id}> 
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}
            </td>
            {/* Display only THIS admin's status */}
            <td className="px-4 py-4 whitespace-nowrap text-sm">
                <button 
                    onClick={() => handleToggleMySettledStatus(user.id, !isSettledByMe)}
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${isSettledByMe ? 'bg-blue-800 text-blue-100' : 'bg-orange-700 text-orange-100'} hover:opacity-80`}
                >
                    {isSettledByMe ? 'Settled' : 'Not Settled'}
                </button>
            </td>
        </tr>
    );
};

// --- Main AdminUserManagement Component ---
export default function AdminUserManagement() {
    const { userData } = useAuth(); 
    const [users, setUsers] = useState([]);
    const [mySettledUsers, setMySettledUsers] = useState([]); // State to hold THIS admin's settled user IDs
    const [subscriptionCharge, setSubscriptionCharge] = useState(0); 
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); 
    const [activeTab, setActiveTab] = useState('all'); 
    const [validityDays, setValidityDays] = useState(30); 
    const [newSubscriptionCharge, setNewSubscriptionCharge] = useState(''); // For updating charge

    useEffect(() => {
        // Listener for Subscription Settings
        const subscriptionSettingsRef = doc(db, 'subscriptionSettings', 'config');
        const unsubscribeSettings = onSnapshot(subscriptionSettingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const currentCharge = docSnap.data().charge || 0;
                setSubscriptionCharge(currentCharge);
                setNewSubscriptionCharge(currentCharge.toString()); // Set input field to current value
            } else {
                setDoc(subscriptionSettingsRef, { charge: 499 }).then(() => {
                    setSubscriptionCharge(499);
                    setNewSubscriptionCharge('499');
                }).catch(e => console.error("Error setting default subscription config:", e));
            }
        }, (error) => {
            console.error("Error fetching subscription settings with onSnapshot:", error);
        });

        // Listener for Users Collection
        const usersCol = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(processUserData).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users with onSnapshot:", error);
            setLoading(false);
        });

        // Listener for THIS ADMIN's settled users
        if (userData?.uid) { 
            const mySettledUsersColRef = collection(db, 'adminSettings', userData.uid, 'settledUsers');
            const unsubscribeMySettledUsers = onSnapshot(mySettledUsersColRef, (snapshot) => {
                const settledUserIds = snapshot.docs.map(doc => doc.id); 
                setMySettledUsers(settledUserIds);
            }, (error) => {
                console.error("Error fetching admin's settled users:", error);
            });
            return () => {
                unsubscribeSettings();
                unsubscribeUsers();
                unsubscribeMySettledUsers(); 
            };
        }

        return () => {
            unsubscribeSettings();
            unsubscribeUsers();
        };
    }, [userData?.uid]);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setValidityDays(30); 
        setIsModalOpen(true); 
    };

    const handleGrantAccess = async (userId, userEmail, days) => {
        try {
            const userRef = doc(db, 'users', userId);
            const mySettledUserRef = doc(db, 'adminSettings', userData.uid, 'settledUsers', userId);
            
            const updatedUserRefData = {
                isSubscribed: true,
                expiryDate: Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000)),
                subscribedAt: users.find(u => u.id === userId)?.subscribedAt || serverTimestamp(), 
            };
            await updateDoc(userRef, updatedUserRefData);

            await setDoc(mySettledUserRef, { timestamp: serverTimestamp() }); 

            alert(`Access granted to ${userEmail} for ${days} days and marked as settled by you.`);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error granting access:", error);
            alert("Failed to grant access.");
        }
    };

    const handleRevokeAccess = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to revoke premium access for ${userEmail}? This action is immediate.`)) {
            try {
                const userRef = doc(db, 'users', userId);
                const mySettledUserRef = doc(db, 'adminSettings', userData.uid, 'settledUsers', userId);

                const updatedUserRefData = {
                    isSubscribed: false,
                    expiryDate: null,
                    subscribedAt: null,
                };
                await updateDoc(userRef, updatedUserRefData);

                // Delete from this admin's settled list upon revoke
                await deleteDoc(mySettledUserRef); 
                
                alert(`Access revoked for ${userEmail}.`);
                setIsModalOpen(false);
            } catch (error) {
                console.error("Error revoking access:", error);
                alert("Failed to revoke access.");
            }
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

    const handleUpdateSubscriptionCharge = async () => {
        const chargeValue = parseInt(newSubscriptionCharge);
        if (isNaN(chargeValue) || chargeValue <= 0) {
            alert("Please enter a valid positive number for the subscription charge.");
            return;
        }

        try {
            const subscriptionSettingsRef = doc(db, 'subscriptionSettings', 'config');
            await updateDoc(subscriptionSettingsRef, { charge: chargeValue });
            alert("Subscription charge updated successfully!");
        } catch (error) {
            console.error("Error updating subscription charge:", error);
            alert("Failed to update subscription charge. Check Firebase rules.");
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm.toLowerCase() === '' || user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || (activeTab === 'premium' && user.isSubscribed);
        return matchesSearch && matchesTab;
    });

    const premiumUsers = users.filter(user => user.isSubscribed);
    
    const totalPremiumUsers = premiumUsers.length;
    const totalEarningsExpected = totalPremiumUsers * subscriptionCharge;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyPremiumUsers = premiumUsers.filter(user => 
        user.subscribedAt && user.subscribedAt.toDate() >= oneWeekAgo
    );

    const settledByMeCount = mySettledUsers.length;
    const unsettledByMeCount = premiumUsers.length - mySettledUsers.length;
    const remainingToSettleAmountByMe = unsettledByMeCount * subscriptionCharge;

    // Admin's 50% share calculations
    const myShareOfTotalEarnings = 0.50 * totalEarningsExpected;
    const myShareOfRemainingToSettle = 0.50 * remainingToSettleAmountByMe;

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>
            
            {/* Financial Overview Section */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Financial Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Subscription Charge (per user)</p>
                        <p className="text-white text-2xl font-bold">₹{subscriptionCharge}</p>
                        <div className="mt-2 flex items-center justify-center">
                            <FormInput 
                                type="number" 
                                value={newSubscriptionCharge} 
                                onChange={(e) => setNewSubscriptionCharge(e.target.value)} 
                                placeholder="New Charge"
                                className="w-24 mr-2"
                            />
                            <button 
                                onClick={handleUpdateSubscriptionCharge} 
                                className="bg-white text-gray-900 px-3 py-1 rounded-md text-xs font-semibold hover:bg-gray-200"
                            >
                                Update
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Premium Users</p>
                        <p className="text-white text-2xl font-bold">{totalPremiumUsers}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Weekly Premium Users</p>
                        <p className="text-white text-2xl font-bold">{weeklyPremiumUsers.length}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Settled</p>
                        <p className="text-blue-400 text-2xl font-bold">{settledByMeCount}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Unsettled (Premium)</p>
                        <p className="text-orange-400 text-2xl font-bold">{unsettledByMeCount}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">Total Earnings (Expected)</p>
                        <p className="text-white text-2xl font-bold">₹{totalEarningsExpected.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center col-span-full md:col-span-1">
                        <p className="text-gray-400 text-sm">Remaining to Settle </p>
                        <p className="text-red-400 text-2xl font-bold">₹{remainingToSettleAmountByMe.toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-700 p-4 rounded-lg text-center col-span-full md:col-span-1">
                        <p className="text-gray-400 text-sm">My 50% Share (of Total Earnings)</p>
                        <p className="text-white text-2xl font-bold">₹{myShareOfTotalEarnings.toLocaleString()}</p>
                    </div>
                     <div className="bg-gray-700 p-4 rounded-lg text-center col-span-full md:col-span-1">
                        <p className="text-gray-400 text-sm">My 50% Share (of Remaining to Settle)</p>
                        <p className="text-white text-2xl font-bold">₹{myShareOfRemainingToSettle.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <input 
                type="text"
                placeholder="Search by user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 mb-4 focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
            />
            
            {/* Tabs for filtering users */}
            <div className="flex mb-4">
                <button 
                    onClick={() => setActiveTab('all')} 
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm ${activeTab === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    All Users
                </button>
                <button 
                    onClick={() => setActiveTab('premium')} 
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm ${activeTab === 'premium' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    Premium Users
                </button>
            </div>

            {/* All Users Table */}
            {activeTab === 'all' && (
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="p-6 text-center text-gray-400">Loading users...</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscription Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {filteredUsers.length > 0 ? (
                                        filteredUsers.map(user => (
                                            <UserRow 
                                                key={user.id} 
                                                user={user} 
                                                handleOpenModal={handleOpenModal} 
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-4 text-center text-gray-400">No users found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Premium Users Table */}
            {activeTab === 'premium' && (
                <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        {loading ? (
                            <p className="p-6 text-center text-gray-400">Loading users...</p>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th>
                                        {/* Display only one 'My Status' column */}
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">My Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {premiumUsers.length > 0 ? (
                                        premiumUsers.map(user => (
                                            <PremiumUserRow 
                                                key={user.id} 
                                                user={user} 
                                                mySettledUsers={mySettledUsers} 
                                                handleToggleMySettledStatus={handleToggleMySettledStatus} 
                                            />
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-gray-400">No premium users found.</td> 
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            <UserEditModal 
                isOpen={isModalOpen} 
                setIsOpen={setIsModalOpen} 
                user={selectedUser}
                handleGrantAccess={handleGrantAccess} 
                handleRevokeAccess={handleRevokeAccess} 
                validityDays={validityDays} 
                setValidityDays={setValidityDays} 
            />
        </div>
    );
}
