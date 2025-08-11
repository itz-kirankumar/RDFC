import React, { useState, useEffect, Fragment } from 'react';
import { collection, doc, updateDoc, Timestamp, serverTimestamp, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';

// --- Reusable Form Input Component ---
const FormInput = ({ label, type = 'number', value, onChange, placeholder = '', step, min, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type}
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            step={step}
            min={min}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
            {...props}
        />
    </div>
);

// --- User Edit Modal Sub-Component ---
const UserEditModal = ({ isOpen, setIsOpen, user, handleGrantAccess, handleRevokeAccess, plans, validityDays, setValidityDays, selectedPlanId, setSelectedPlanId }) => {
    const [pricePaid, setPricePaid] = useState('');
    const [isCustomPlanSelected, setIsCustomPlanSelected] = useState(false);

    useEffect(() => {
        if (user) {
            setValidityDays(user.expiryDate ? Math.ceil((user.expiryDate.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30);
            setSelectedPlanId(user.planId || '');
            setPricePaid(user.planPrice || '');
            setIsCustomPlanSelected(user.planId === 'custom');
        } else {
            setValidityDays(30);
            setSelectedPlanId('');
            setPricePaid('');
            setIsCustomPlanSelected(false);
        }
    }, [user]);

    if (!user) return null;

    const handleUpdateAccess = () => {
        let finalPrice = null;
        let finalPlanName = null;
        let finalPlanId = selectedPlanId;

        if (selectedPlanId === 'custom') {
            finalPlanId = null;
            finalPlanName = 'Custom Plan';
            finalPrice = parseInt(pricePaid);
            if (isNaN(finalPrice)) {
                alert("Please enter a valid custom price.");
                return;
            }
        } else if (selectedPlanId) {
            const selectedPlan = plans.find(p => p.id === selectedPlanId);
            finalPlanName = selectedPlan.name;
            finalPrice = parseInt(pricePaid);
            if (isNaN(finalPrice)) {
                alert("Please enter a valid price.");
                return;
            }
        } else {
            finalPlanId = null;
            finalPlanName = null;
            finalPrice = parseInt(pricePaid);
             if (isNaN(finalPrice)) {
                finalPrice = null;
            }
        }

        handleGrantAccess(user.id, user.email, validityDays, finalPlanId, finalPlanName, finalPrice);
        setIsOpen(false);
    };

    const selectedPlan = plans.find(p => p.id === selectedPlanId);

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
                                <label className="block text-sm font-medium text-gray-300">Select Plan (Optional)</label>
                                <select 
                                    value={selectedPlanId} 
                                    onChange={(e) => {
                                        const planId = e.target.value;
                                        setSelectedPlanId(planId);
                                        if (planId === 'custom') {
                                            setValidityDays(30);
                                            setPricePaid('');
                                            setIsCustomPlanSelected(true);
                                        } else {
                                            const plan = plans.find(p => p.id === planId);
                                            if (plan) {
                                                setValidityDays(plan.durationInDays);
                                                setPricePaid(plan.price || '');
                                            } else {
                                                setValidityDays(30);
                                                setPricePaid('');
                                            }
                                            setIsCustomPlanSelected(false);
                                        }
                                    }}
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                                >
                                    <option value="">Select a plan...</option>
                                    <option value="custom">Custom Plan</option>
                                    {plans.filter(plan => plan.isActive).map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name} (₹{plan.price})</option>
                                    ))}
                                </select>
                            </div>

                             {(selectedPlanId || isCustomPlanSelected) && (
                                <FormInput 
                                    label="Price Paid (₹)" 
                                    type="number" 
                                    value={pricePaid} 
                                    onChange={e => setPricePaid(e.target.value)} 
                                    placeholder="Enter price paid" 
                                />
                            )}
                            
                            <div className="text-sm text-gray-400">
                                OR set custom validity.
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Set Validity (in days)</label>
                                <div className="mt-2 flex space-x-2">
                                    {[7, 30, 90, 180, 365].map(days => (
                                        <button key={days} onClick={() => setValidityDays(days)} className={`px-3 py-1 text-xs rounded-full ${validityDays == days ? 'bg-white text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{days}d</button>
                                    ))}
                                </div>
                                <FormInput type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            {user.isSubscribed && <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={() => handleRevokeAccess(user.id, user.email)}>Revoke Access</button>}
                            <div className="flex space-x-2 ml-auto">
                                <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                                <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleUpdateAccess}>Update Access</button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// Helper function to process user data
const processUserData = (docSnap) => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        isSubscribed: data.isSubscribed || false,
        expiryDate: data.expiryDate || null,
        subscribedAt: data.subscribedAt || null,
    };
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
const PremiumUserRow = ({ user, mySettledUsers, handleToggleMySettledStatus, handleOpenModal }) => {
    const isSettledByMe = mySettledUsers.includes(user.id);

    return (
        <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.planName || 'N/A'} (₹{user.planPrice || 'N/A'})
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}
            </td>
            <td className="px-4 py-4 whitespace-nowrap text-sm">
                <button
                    onClick={() => handleToggleMySettledStatus(user.id, !isSettledByMe)}
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                        ${isSettledByMe ? 'bg-blue-800 text-blue-100' : 'bg-orange-700 text-orange-100'} hover:opacity-80`}
                >
                    {isSettledByMe ? 'Settled' : 'Not Settled'}
                </button>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onClick={() => handleOpenModal(user)} className="text-gray-300 hover:text-white">Manage Access</button>
            </td>
        </tr>
    );
};

// --- Main AdminUserManagement Component ---
export default function AdminUserManagement() {
    const { userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [mySettledUsers, setMySettledUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [validityDays, setValidityDays] = useState(30);
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [totalPremiumUsersCount, setTotalPremiumUsersCount] = useState(0);

    useEffect(() => {
        const plansCol = collection(db, 'subscriptionPlans');
        const unsubscribePlans = onSnapshot(plansCol, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlans(fetchedPlans);
        });

        const usersCol = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
            const now = new Date();
            // --- MODIFICATION START: Automatic Subscription Revocation ---
            // This logic checks for expired subscriptions and revokes them.
            // Note: This check runs on the client-side whenever an admin loads this page.
            // For a more robust solution, a scheduled backend function (e.g., Cloud Function) is recommended.
            snapshot.docs.forEach(docSnap => {
                const user = docSnap.data();
                if (user.isSubscribed && user.expiryDate && user.expiryDate.toDate() < now) {
                    console.log(`Subscription for ${user.email} has expired. Automatically revoking...`);
                    const userRef = doc(db, 'users', docSnap.id);
                    const updatedData = {
                        isSubscribed: false,
                        expiryDate: null,
                        subscribedAt: null,
                        planId: null,
                        planName: null,
                        planPrice: null,
                    };
                    // Perform the update. We don't need to wait for it to complete.
                    // The onSnapshot listener will pick up the change and re-render the UI.
                    updateDoc(userRef, updatedData)
                        .then(() => console.log(`Successfully auto-revoked subscription for ${user.email}.`))
                        .catch(error => console.error(`Failed to auto-revoke subscription for ${user.email}:`, error));
                }
            });
            // --- MODIFICATION END ---

            const fetchedUsers = snapshot.docs.map(processUserData).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setTotalUsersCount(snapshot.docs.length-3);
            setTotalPremiumUsersCount(snapshot.docs.filter(doc => doc.data().isSubscribed).length);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching users with onSnapshot:", error);
            setLoading(false);
        });

        if (userData?.uid) {
            const mySettledUsersColRef = collection(db, 'adminSettings', userData.uid, 'settledUsers');
            const unsubscribeMySettledUsers = onSnapshot(mySettledUsersColRef, (snapshot) => {
                const settledUserIds = snapshot.docs.map(doc => doc.id);
                setMySettledUsers(settledUserIds);
            }, (error) => {
                console.error("Error fetching admin's settled users:", error);
            });
            return () => {
                unsubscribePlans();
                unsubscribeUsers();
                unsubscribeMySettledUsers();
            };
        }

        return () => {
            unsubscribePlans();
            unsubscribeUsers();
        };
    }, [userData?.uid]);

    const handleOpenUserModal = (user) => {
        setSelectedUser(user);
        setValidityDays(30);
        setSelectedPlanId('');
        setIsUserModalOpen(true);
    };

    const handleGrantAccess = async (userId, userEmail, days, planId, planName, pricePaid) => {
        try {
            const userRef = doc(db, 'users', userId);
            let updatedUserRefData = {};
            let expiryDateCalc;
            const now = new Date();

            if (planId) {
                const selectedPlan = plans.find(p => p.id === planId);
                if (!selectedPlan) {
                    alert("Selected plan not found.");
                    return;
                }
                const durationInDays = selectedPlan.durationInDays || days || 0;
                expiryDateCalc = new Date(now.getTime() + durationInDays * 24 * 60 * 60 * 1000);
                updatedUserRefData = {
                    isSubscribed: true,
                    planId: planId,
                    planName: planName,
                    planPrice: pricePaid,
                    expiryDate: Timestamp.fromDate(expiryDateCalc),
                    subscribedAt: users.find(u => u.id === userId)?.subscribedAt || serverTimestamp(),
                };
            } else if (days > 0) {
                expiryDateCalc = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                 updatedUserRefData = {
                    isSubscribed: true,
                    planId: null,
                    planName: 'Custom Plan',
                    planPrice: pricePaid,
                    expiryDate: Timestamp.fromDate(expiryDateCalc),
                    subscribedAt: users.find(u => u.id === userId)?.subscribedAt || serverTimestamp(),
                };
            } else {
                alert("Please select a plan or set a custom validity period.");
                return;
            }
            
            await updateDoc(userRef, updatedUserRefData);
            alert(`Access granted to ${userEmail} for plan: ${updatedUserRefData.planName}.`);
            setIsUserModalOpen(false);
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
                    planId: null,
                    planName: null,
                    planPrice: null,
                };
                await updateDoc(userRef, updatedUserRefData);

                await deleteDoc(mySettledUserRef);

                alert(`Access revoked for ${userEmail}.`);
                setIsUserModalOpen(false);
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
    
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm.toLowerCase() === '' || user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTab = activeTab === 'all' || (activeTab === 'premium' && user.isSubscribed);
        return matchesSearch && matchesTab;
    });

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>

            {/* Admin User Counts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-800 p-4 rounded-lg text-center shadow-md">
                    <p className="text-gray-400 text-sm">Total Registered Users</p>
                    <p className="text-white text-2xl font-bold">{totalUsersCount}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-center shadow-md">
                    <p className="text-gray-400 text-sm">Total Premium Users</p>
                    <p className="text-white text-2xl font-bold">{totalPremiumUsersCount}</p>
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
                            <>
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
                                        {currentUsers.length > 0 ? (
                                            currentUsers.map(user => (
                                                <UserRow
                                                    key={user.id}
                                                    user={user}
                                                    handleOpenModal={handleOpenUserModal}
                                                />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-4 text-center text-gray-400">No users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {/* Pagination Controls */}
                                <div className="p-4 flex justify-between items-center bg-gray-700">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-300">Page {currentPage} of {totalPages}</span>
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
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
                            <>
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead className="bg-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">My Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                                        {currentUsers.length > 0 ? (
                                            currentUsers.map(user => (
                                                <PremiumUserRow
                                                    key={user.id}
                                                    user={user}
                                                    mySettledUsers={mySettledUsers}
                                                    handleToggleMySettledStatus={handleToggleMySettledStatus}
                                                    handleOpenModal={handleOpenUserModal}
                                                />
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-4 text-center text-gray-400">No premium users found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {/* Pagination Controls */}
                                <div className="p-4 flex justify-between items-center bg-gray-700">
                                    <button
                                        onClick={() => paginate(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-300">Page {currentPage} of {totalPages}</span>
                                    <button
                                        onClick={() => paginate(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <UserEditModal
                isOpen={isUserModalOpen}
                setIsOpen={setIsUserModalOpen}
                user={selectedUser}
                handleGrantAccess={handleGrantAccess}
                handleRevokeAccess={handleRevokeAccess}
                validityDays={validityDays}
                setValidityDays={setValidityDays}
                plans={plans}
                selectedPlanId={selectedPlanId}
                setSelectedPlanId={setSelectedPlanId}
            />
        </div>
    );
}