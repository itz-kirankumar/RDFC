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

// --- Access Control Checkbox Component ---
const AccessCheckbox = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
        <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600"
        />
        <span className="text-gray-300">{label}</span>
    </label>
);


// --- User Edit Modal Sub-Component ---
const UserEditModal = ({ isOpen, setIsOpen, user, handleGrantAccess, handleRevokeAccess, plans, validityDays, setValidityDays, selectedPlanId, setSelectedPlanId, accessControl, setAccessControl }) => {
    const [pricePaid, setPricePaid] = useState('');
    
    // Default access control structure including the new 'ten_min_tests'
    const defaultAccess = { rdfc_articles: false, rdfc_tests: false, test: false, sectional: false, mock: false, ten_min_tests: false };

    useEffect(() => {
        if (user) {
            setValidityDays(user.expiryDate ? Math.ceil((user.expiryDate.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30);
            setSelectedPlanId(user.planId || '');
            setPricePaid(user.planPrice || '');
            // Ensure the accessControl state includes the new field, even for older user documents
            setAccessControl({ ...defaultAccess, ...(user.accessControl || {}) });
        } else {
            setValidityDays(30);
            setSelectedPlanId('');
            setPricePaid('');
            setAccessControl(defaultAccess);
        }
    }, [user, setAccessControl, setValidityDays, setSelectedPlanId]);

    if (!user) return null;

    const handleAccessChange = (e) => {
        const { name, checked } = e.target;
        if (name === 'all') {
            // Update all access fields when 'All Access' is toggled
            const allAccessState = Object.keys(defaultAccess).reduce((acc, key) => {
                acc[key] = checked;
                return acc;
            }, {});
            setAccessControl(allAccessState);
        } else {
            setAccessControl(prev => ({ ...prev, [name]: checked }));
        }
    };

    const handleUpdateAccess = () => {
        let finalPrice = null;
        let finalPlanName = null;
        let finalPlanId = selectedPlanId;

        if (selectedPlanId) {
            const selectedPlan = plans.find(p => p.id === selectedPlanId);
            finalPlanName = selectedPlan.name;
        } else {
             finalPlanName = 'Custom Plan';
        }
        
        finalPrice = parseInt(pricePaid);
        if (isNaN(finalPrice)) {
            finalPrice = null;
        }
        
        handleGrantAccess(user.id, user.email, validityDays, finalPlanId, finalPlanName, finalPrice, accessControl);
        setIsOpen(false);
    };

    // Check if all individual access controls are checked
    const allChecked = Object.values(accessControl).every(v => v === true);

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
                                <label className="block text-sm font-medium text-gray-300 mb-2">Grant Access To</label>
                                <div className="space-y-1 bg-gray-900/50 p-3 rounded-lg">
                                    <AccessCheckbox label="All Access" name="all" checked={allChecked} onChange={handleAccessChange} />
                                    <div className="border-t border-gray-700 my-2"></div>
                                    <AccessCheckbox label="RDFC Articles" name="rdfc_articles" checked={accessControl.rdfc_articles} onChange={handleAccessChange} />
                                    <AccessCheckbox label="RDFC Tests" name="rdfc_tests" checked={accessControl.rdfc_tests} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Mock Tests" name="mock" checked={accessControl.mock} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Sectional Tests" name="sectional" checked={accessControl.sectional} onChange={handleAccessChange} />
                                    {/* --- NEW CHECKBOX FOR 10 MIN TESTS --- */}
                                    <AccessCheckbox label="10 Min Tests" name="ten_min_tests" checked={accessControl.ten_min_tests} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Other Add-On Tests" name="test" checked={accessControl.test} onChange={handleAccessChange} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">Select Plan (Optional)</label>
                                <select 
                                    value={selectedPlanId} 
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                                >
                                    <option value="">Select a plan...</option>
                                    {plans.filter(plan => plan.isActive).map(plan => (
                                        <option key={plan.id} value={plan.id}>{plan.name} (₹{plan.price})</option>
                                    ))}
                                </select>
                            </div>

                            <FormInput 
                                label="Price Paid (₹) (Optional)" 
                                type="number" 
                                value={pricePaid} 
                                onChange={e => setPricePaid(e.target.value)} 
                                placeholder="Enter price paid" 
                            />
                            
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
        accessControl: data.accessControl || null,
    };
};

// --- User Row Component (for 'All Users' tab) ---
const UserRow = ({ user, handleOpenModal }) => {
    return (
        <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
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
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.planName || 'N/A'} (₹{user.planPrice != null ? user.planPrice : 'N/A'})
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

// --- Expiry Management Row Component (for 'Expiry' and 'Verified' tabs) ---
const ExpiryManagementRow = ({ user, handleOpenModal, onMarkAsVerified, isVerifiedTab = false }) => {
    const now = new Date();
    const expiry = user.expiryDate?.toDate ? user.expiryDate.toDate() : null;
    const diffTime = expiry ? expiry.getTime() - now.getTime() : -Infinity;
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    let expiryText;
    let textClass;

    if (!expiry) {
        expiryText = "No Date";
        textClass = "text-gray-500";
    } else if (diffDays <= 0) {
        expiryText = "Expired";
        textClass = "text-red-400 font-bold";
    } else {
        expiryText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        textClass = "text-yellow-400";
    }

    return (
        <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                {user.planName || 'N/A'} (₹{user.planPrice != null ? user.planPrice : 'N/A'})
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{expiry ? expiry.toLocaleDateString() : 'N/A'}</td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{expiryText}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                {!isVerifiedTab && (
                    <button onClick={() => onMarkAsVerified(user.id)} className="text-blue-400 hover:text-blue-300">
                        Mark as Verified
                    </button>
                )}
                <button onClick={() => handleOpenModal(user)} className="text-gray-300 hover:text-white">
                    Manage Access
                </button>
            </td>
        </tr>
    );
};


// --- Main AdminUserManagement Component ---
export default function AdminUserManagement() {
    const { userData } = useAuth();
    const [users, setUsers] = useState([]);
    const [mySettledUsers, setMySettledUsers] = useState([]);
    const [verifiedExpiryUsers, setVerifiedExpiryUsers] = useState([]);
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
    // Add the new access control field to the initial state
    const [accessControl, setAccessControl] = useState({ rdfc_articles: false, rdfc_tests: false, test: false, sectional: false, mock: false, ten_min_tests: false });

    useEffect(() => {
        const plansCol = collection(db, 'subscriptionPlans');
        const unsubscribePlans = onSnapshot(plansCol, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(fetchedPlans);
        });

        const usersCol = collection(db, 'users');
        const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(processUserData).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setTotalUsersCount(snapshot.docs.filter(doc => !doc.data().isAdmin).length);
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
            }, (error) => console.error("Error fetching admin's settled users:", error));

            const verifiedExpiryUsersColRef = collection(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers');
            const unsubscribeVerifiedExpiryUsers = onSnapshot(verifiedExpiryUsersColRef, (snapshot) => {
                const verifiedUserIds = snapshot.docs.map(doc => doc.id);
                setVerifiedExpiryUsers(verifiedUserIds);
            }, (error) => {
                console.error("Error fetching admin's verified expiry users:", error);
            });

            return () => {
                unsubscribePlans();
                unsubscribeUsers();
                unsubscribeMySettledUsers();
                unsubscribeVerifiedExpiryUsers();
            };
        }

        return () => {
            unsubscribePlans();
            unsubscribeUsers();
        };
    }, [userData?.uid]);

    const handleOpenUserModal = (user) => {
        setSelectedUser(user);
        setIsUserModalOpen(true);
    };

    const handleGrantAccess = async (userId, userEmail, days, planId, planName, pricePaid, newAccessControl) => {
        if (!Object.values(newAccessControl).some(v => v === true)) {
            alert("Please grant access to at least one service.");
            return;
        }
        if (!days || days <= 0) {
            alert("Please set a validity period greater than 0 days.");
            return;
        }

        try {
            const userRef = doc(db, 'users', userId);
            const now = new Date();
            const expiryDateCalc = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            
            const updatedUserRefData = {
                isSubscribed: true,
                accessControl: newAccessControl,
                planId: planId || null,
                planName: planName || 'Custom Access',
                planPrice: pricePaid,
                expiryDate: Timestamp.fromDate(expiryDateCalc),
                subscribedAt: users.find(u => u.id === userId)?.subscribedAt || serverTimestamp(),
            };
            
            await updateDoc(userRef, updatedUserRefData);
            alert(`Access updated for ${userEmail}.`);
            setIsUserModalOpen(false);
        } catch (error) {
            console.error("Error granting access:", error);
            alert("Failed to grant access.");
        }
    };

    const handleRevokeAccess = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to revoke all premium access for ${userEmail}? This will also remove them from your settled and verified lists.`)) {
            try {
                const userRef = doc(db, 'users', userId);
                const mySettledUserRef = doc(db, 'adminSettings', userData.uid, 'settledUsers', userId);
                const verifiedUserRef = doc(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers', userId);

                const updatedUserRefData = {
                    isSubscribed: false,
                    expiryDate: null,
                    subscribedAt: null,
                    planId: null,
                    planName: null,
                    planPrice: null,
                    accessControl: null,
                };
                await updateDoc(userRef, updatedUserRefData);
                await deleteDoc(mySettledUserRef).catch(()=>{}); 
                await deleteDoc(verifiedUserRef).catch(()=>{}); 

                alert(`Access revoked for ${userEmail}.`);
                setIsUserModalOpen(false);
            } catch (error) {
                console.error("Error revoking access:", error);
                alert("Failed to revoke access.");
            }
        }
    };
    
    const handleToggleMySettledStatus = async (userId, newStatus) => {
        if (!userData?.uid) return;
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

    const handleMarkAsVerified = async (userId) => {
        if (!userData?.uid) {
            alert("You must be logged in to perform this action.");
            return;
        }
        try {
            const verifiedUserRef = doc(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers', userId);
            await setDoc(verifiedUserRef, { timestamp: serverTimestamp() });
        } catch (error) {
            console.error(`Error marking user ${userId} as verified:`, error);
            alert(`Failed to mark user as verified. Check Firestore rules.`);
        }
    };
    
    const getDaysRemaining = (expiryDate) => {
        if (!expiryDate?.toDate) return Infinity;
        const now = new Date();
        const expiry = expiryDate.toDate();
        return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    };

    const expiringUsers = users
        .filter(user => {
            const daysRemaining = getDaysRemaining(user.expiryDate);
            return user.isSubscribed && daysRemaining <= 3 && !verifiedExpiryUsers.includes(user.id);
        })
        .sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));

    const verifiedUsersList = users.filter(user => verifiedExpiryUsers.includes(user.id));

    let displayedUsers;
    switch(activeTab) {
        case 'expiry':
            displayedUsers = expiringUsers.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase()));
            break;
        case 'verified':
            displayedUsers = verifiedUsersList.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase()));
            break;
        case 'premium':
            displayedUsers = users.filter(u => u.isSubscribed && (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase()));
            break;
        default: // 'all'
            displayedUsers = users.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase()));
            break;
    }

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = displayedUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(displayedUsers.length / usersPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);


    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>
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
                placeholder="Search by user name or email..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 mb-4 focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
            />
            <div className="flex mb-4">
                <button
                    onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm ${activeTab === 'all' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    All Users
                </button>
                <button
                    onClick={() => { setActiveTab('premium'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm ${activeTab === 'premium' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    Premium Users
                </button>
                <button
                    onClick={() => { setActiveTab('expiry'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm relative ${activeTab === 'expiry' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    Expiry
                    {expiringUsers.length > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{expiringUsers.length}</span>}
                </button>
                 <button
                    onClick={() => { setActiveTab('verified'); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-t-md font-semibold text-sm ${activeTab === 'verified' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
                >
                    Verified
                </button>
            </div>
            
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                 <div className="overflow-x-auto">{loading ? (<p className="p-6 text-center text-gray-400">Loading users...</p>) : (<>
                    {activeTab === 'all' && (
                        <table className="min-w-full divide-y divide-gray-700">
                           <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscription Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th></tr></thead>
                           <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<UserRow key={user.id} user={user} handleOpenModal={handleOpenUserModal}/>))) : (<tr><td colSpan={5} className="px-6 py-4 text-center text-gray-400">No users found.</td></tr>)}</tbody>
                        </table>
                    )}
                    {activeTab === 'premium' && (
                         <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">My Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<PremiumUserRow key={user.id} user={user} mySettledUsers={mySettledUsers} handleToggleMySettledStatus={handleToggleMySettledStatus} handleOpenModal={handleOpenUserModal} />))) : (<tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No premium users found.</td></tr>)}</tbody>
                        </table>
                    )}
                    {activeTab === 'expiry' && (
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Mail ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expires In</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Action</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<ExpiryManagementRow key={user.id} user={user} handleOpenModal={handleOpenUserModal} onMarkAsVerified={handleMarkAsVerified} />))) : (<tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No users are expiring soon.</td></tr>)}</tbody>
                        </table>
                    )}
                    {activeTab === 'verified' && (
                        <table className="min-w-full divide-y divide-gray-700">
                           <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Mail ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Action</th></tr></thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<ExpiryManagementRow key={user.id} user={user} handleOpenModal={handleOpenUserModal} isVerifiedTab={true} />))) : (<tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No users have been marked as verified.</td></tr>)}</tbody>
                        </table>
                    )}
                    
                    {totalPages > 1 && (
                        <div className="p-4 flex justify-between items-center bg-gray-700">
                            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50">Previous</button>
                            <span className="text-gray-300">Page {currentPage} of {totalPages}</span>
                            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50">Next</button>
                        </div>
                    )}
                    </>)}
                </div>
            </div>

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
                accessControl={accessControl}
                setAccessControl={setAccessControl}
            />
        </div>
    );
}
