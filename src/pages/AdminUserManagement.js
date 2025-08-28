import React, { useState, useEffect, Fragment } from 'react';
import { collection, doc, updateDoc, Timestamp, serverTimestamp, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Transition } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';
import { UserGroupIcon, CheckCircleIcon, XCircleIcon, PencilIcon, ShieldCheckIcon, MagnifyingGlassIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

// --- Reusable UI Components ---

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
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition"
            {...props}
        />
    </div>
);

const AccessCheckbox = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer transition">
        <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-indigo-500 focus:ring-indigo-600"
        />
        <span className="text-gray-300">{label}</span>
    </label>
);

const StatCard = ({ title, value, icon }) => (
    <div className="bg-gray-800 p-5 rounded-lg flex items-center space-x-4 shadow-lg">
        <div className="bg-gray-700 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const StatusBadge = ({ children, color }) => {
    const colors = {
        green: 'bg-green-800 text-green-100',
        gray: 'bg-gray-700 text-gray-300',
        blue: 'bg-blue-800 text-blue-100',
        orange: 'bg-orange-700 text-orange-100',
        red: 'text-red-400 font-bold',
        yellow: 'text-yellow-400',
    };
    return (
        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors[color] || colors.gray}`}>
            {children}
        </span>
    );
};


// --- User Edit Modal (Refined for Mobile & with new Expiry Options) ---
const UserEditModal = ({ isOpen, setIsOpen, user, handleGrantAccess, handleRevokeAccess, plans, validityDays, setValidityDays, expiryDate, setExpiryDate, selectedPlanId, setSelectedPlanId, accessControl, setAccessControl }) => {
    const [pricePaid, setPricePaid] = useState('');
    const [expiryMode, setExpiryMode] = useState('days'); // 'days' or 'date'
    const defaultAccess = { rdfc_articles: false, rdfc_tests: false, test: false, sectional: false, mock: false, ten_min_tests: false };

    // Helper to format date for the input type="date"
    const formatDateForInput = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : date.toDate();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    useEffect(() => {
        if (user) {
            setValidityDays(user.expiryDate ? Math.ceil((user.expiryDate.toDate().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30);
            setExpiryDate(user.expiryDate ? formatDateForInput(user.expiryDate) : '');
            setSelectedPlanId(user.planId || '');
            setPricePaid(user.planPrice || '');
            setAccessControl({ ...defaultAccess, ...(user.accessControl || {}) });
        } else {
            setValidityDays(30);
            setExpiryDate('');
            setSelectedPlanId('');
            setPricePaid('');
            setAccessControl(defaultAccess);
        }
        setExpiryMode('days'); // Reset to default mode when modal opens
    }, [user, setAccessControl, setValidityDays, setSelectedPlanId, setExpiryDate]);

    if (!user) return null;

    const handleAccessChange = (e) => {
        const { name, checked } = e.target;
        if (name === 'all') {
            const allAccessState = Object.keys(defaultAccess).reduce((acc, key) => ({ ...acc, [key]: checked }), {});
            setAccessControl(allAccessState);
        } else {
            setAccessControl(prev => ({ ...prev, [name]: checked }));
        }
    };

    const handleUpdateAccess = () => {
        const finalPlan = selectedPlanId ? plans.find(p => p.id === selectedPlanId) : null;
        const finalPlanName = finalPlan ? finalPlan.name : 'Custom Plan';
        const finalPrice = !isNaN(parseInt(pricePaid)) ? parseInt(pricePaid) : null;
        const expiryOptions = expiryMode === 'days'
            ? { days: validityDays, specificDate: null }
            : { days: null, specificDate: expiryDate };

        handleGrantAccess(user.id, user.email, expiryOptions, selectedPlanId, finalPlanName, finalPrice, accessControl);
        setIsOpen(false);
    };

    const allChecked = Object.values(accessControl).every(v => v === true);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/80" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Manage Access</Dialog.Title>
                        <div className="mt-2"><p className="text-sm text-gray-400">For user: <span className="font-semibold text-gray-300">{user.email}</span></p></div>

                        <div className="mt-4 space-y-5">
                             <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Grant Access To</label>
                                <div className="space-y-1 bg-gray-900/50 p-3 rounded-lg">
                                    <AccessCheckbox label="All Access" name="all" checked={allChecked} onChange={handleAccessChange} />
                                    <div className="border-t border-gray-700 my-2"></div>
                                    <AccessCheckbox label="RDFC Articles" name="rdfc_articles" checked={accessControl.rdfc_articles} onChange={handleAccessChange} />
                                    <AccessCheckbox label="RDFC Tests" name="rdfc_tests" checked={accessControl.rdfc_tests} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Mock Tests" name="mock" checked={accessControl.mock} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Sectional Tests" name="sectional" checked={accessControl.sectional} onChange={handleAccessChange} />
                                    <AccessCheckbox label="10 Min Tests" name="ten_min_tests" checked={accessControl.ten_min_tests} onChange={handleAccessChange} />
                                    <AccessCheckbox label="Other Add-On Tests" name="test" checked={accessControl.test} onChange={handleAccessChange} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300">Select Plan</label>
                                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 transition">
                                    <option value="">Select a plan...</option>
                                    {plans.filter(plan => plan.isActive).map(plan => (<option key={plan.id} value={plan.id}>{plan.name} (₹{plan.price})</option>))}
                                </select>
                            </div>

                            <FormInput label="Price Paid (₹) " type="number" value={pricePaid} onChange={e => setPricePaid(e.target.value)} placeholder="Enter price paid" />

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Set Validity</label>
                                <div className="flex bg-gray-700 rounded-md p-1 mb-3">
                                    <button onClick={() => setExpiryMode('days')} className={`w-1/2 rounded py-1 text-sm font-semibold transition ${expiryMode === 'days' ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-gray-600/50'}`}>By Days</button>
                                    <button onClick={() => setExpiryMode('date')} className={`w-1/2 rounded py-1 text-sm font-semibold transition ${expiryMode === 'date' ? 'bg-indigo-500 text-white' : 'text-gray-300 hover:bg-gray-600/50'}`}>By Date</button>
                                </div>
                                {expiryMode === 'days' ? (
                                    <div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {[7, 30, 90, 180, 365].map(days => (<button key={days} onClick={() => setValidityDays(days)} className={`px-3 py-1 text-xs rounded-full transition ${validityDays == days ? 'bg-indigo-500 text-white font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{days}d</button>))}
                                        </div>
                                        <FormInput type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} min="1" />
                                    </div>
                                ) : (
                                    <FormInput type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} min={formatDateForInput(new Date())} />
                                )}
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3">
                            {user.isSubscribed && <button type="button" className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition" onClick={() => handleRevokeAccess(user.id, user.email)}><XCircleIcon className="h-5 w-5" />Revoke Access</button>}
                            <div className="flex w-full sm:w-auto space-x-2 ml-auto">
                                <button type="button" className="w-full inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 transition" onClick={() => setIsOpen(false)}>Cancel</button>
                                <button type="button" className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 transition" onClick={handleUpdateAccess}><CheckCircleIcon className="h-5 w-5" />Update Access</button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


// --- Mobile-First User Card Component ---
const UserCard = ({ user, activeTab, mySettledUsers, handleOpenModal, handleToggleMySettledStatus, onMarkAsVerified }) => {
    const isSettledByMe = mySettledUsers.includes(user.id);

    // Expiry logic for Expiry & Verified tabs
    const now = new Date();
    const expiry = user.expiryDate?.toDate ? user.expiryDate.toDate() : null;
    const diffTime = expiry ? expiry.getTime() - now.getTime() : -Infinity;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let expiryText, expiryColor;

    if (!expiry) {
        expiryText = "No Date";
        expiryColor = "gray";
    } else if (diffDays <= 0) {
        expiryText = "Expired";
        expiryColor = "red";
    } else {
        expiryText = `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        expiryColor = "yellow";
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col space-y-3 shadow-md">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="font-bold text-white truncate">{user.name || user.email}</p>
                    <p className="text-sm text-gray-400 truncate">{user.email}</p>
                </div>
                {activeTab === 'all' && <StatusBadge color={user.isSubscribed ? 'green' : 'gray'}>{user.isSubscribed ? 'PREMIUM' : 'Standard'}</StatusBadge>}
            </div>

            <div className="border-t border-gray-700 pt-3 text-sm text-gray-400 space-y-2">
                <p><strong>Subscribed:</strong> {user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}</p>
                <p><strong>Expires:</strong> {user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}</p>
                {(activeTab === 'premium' || activeTab === 'expiry' || activeTab === 'verified') && (
                    <p><strong>Plan:</strong> {user.planName || 'N/A'} (₹{user.planPrice ?? 'N/A'})</p>
                )}
                 {(activeTab === 'expiry' || activeTab === 'verified') && (
                    <p><strong>Status:</strong> <StatusBadge color={expiryColor}>{expiryText}</StatusBadge></p>
                )}
            </div>

            <div className="border-t border-gray-700 pt-3 flex flex-wrap gap-2 items-center justify-between">
                 {activeTab === 'premium' && (
                    <button onClick={() => handleToggleMySettledStatus(user.id, !isSettledByMe)} className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 transition ${isSettledByMe ? 'bg-blue-800 text-blue-100' : 'bg-orange-700 text-orange-100'}`}>
                        {isSettledByMe ? 'Settled' : 'Not Settled'}
                    </button>
                )}
                {activeTab === 'expiry' && (
                     <button onClick={() => onMarkAsVerified(user.id)} className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1.5"><ShieldCheckIcon className="h-5 w-5"/> Mark Verified</button>
                )}
                <button onClick={() => handleOpenModal(user)} className="text-gray-300 hover:text-white text-sm font-semibold flex items-center gap-1.5 ml-auto"><PencilIcon className="h-5 w-5"/> Manage</button>
            </div>
        </div>
    );
};

// --- Desktop User Row Components (Largely unchanged, but using StatusBadge) ---
const UserRow = ({ user, handleOpenModal }) => (
    <tr>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge color={user.isSubscribed ? 'green' : 'gray'}>{user.isSubscribed ? 'PREMIUM' : 'Standard'}</StatusBadge></td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.isSubscribed && user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onClick={() => handleOpenModal(user)} className="text-indigo-400 hover:text-indigo-300">Manage Access</button></td>
    </tr>
);

const PremiumUserRow = ({ user, mySettledUsers, handleToggleMySettledStatus, handleOpenModal }) => {
    const isSettledByMe = mySettledUsers.includes(user.id);
    return (
        <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.planName || 'N/A'} (₹{user.planPrice != null ? user.planPrice : 'N/A'})</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.subscribedAt ? user.subscribedAt.toDate().toLocaleDateString() : 'N/A'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}</td>
            <td className="px-4 py-4 whitespace-nowrap text-sm"><button onClick={() => handleToggleMySettledStatus(user.id, !isSettledByMe)}><StatusBadge color={isSettledByMe ? 'blue' : 'orange'}>{isSettledByMe ? 'Settled' : 'Not Settled'}</StatusBadge></button></td>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><button onClick={() => handleOpenModal(user)} className="text-indigo-400 hover:text-indigo-300">Manage Access</button></td>
        </tr>
    );
};

const ExpiryManagementRow = ({ user, handleOpenModal, onMarkAsVerified, isVerifiedTab = false }) => {
    const now = new Date();
    const expiry = user.expiryDate?.toDate ? user.expiryDate.toDate() : null;
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
    let expiryText, textClass;
    if (!expiry) { expiryText = "No Date"; textClass = "text-gray-500"; }
    else if (diffDays <= 0) { expiryText = "Expired"; textClass = "text-red-400 font-bold"; }
    else { expiryText = `${diffDays} day${diffDays > 1 ? 's' : ''}`; textClass = "text-yellow-400"; }

    return (
        <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.name || user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{user.planName || 'N/A'} (₹{user.planPrice != null ? user.planPrice : 'N/A'})</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{expiry ? expiry.toLocaleDateString() : 'N/A'}</td>
            <td className={`px-6 py-4 whitespace-nowrap text-sm ${textClass}`}>{expiryText}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                {!isVerifiedTab && (<button onClick={() => onMarkAsVerified(user.id)} className="text-blue-400 hover:text-blue-300">Mark as Verified</button>)}
                <button onClick={() => handleOpenModal(user)} className="text-indigo-400 hover:text-indigo-300">Manage Access</button>
            </td>
        </tr>
    );
};

// --- Main Component ---
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
    const [expiryDate, setExpiryDate] = useState(''); // New state for specific date
    const [plans, setPlans] = useState([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [totalUsersCount, setTotalUsersCount] = useState(0);
    const [totalPremiumUsersCount, setTotalPremiumUsersCount] = useState(0);
    const [accessControl, setAccessControl] = useState({ rdfc_articles: false, rdfc_tests: false, test: false, sectional: false, mock: false, ten_min_tests: false });

    const processUserData = (docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        isSubscribed: docSnap.data().isSubscribed || false,
    });

    useEffect(() => {
        const plansCol = collection(db, 'subscriptionPlans');
        const unsubPlans = onSnapshot(plansCol, snap => setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        const usersCol = collection(db, 'users');
        const unsubUsers = onSnapshot(usersCol, snap => {
            const fetchedUsers = snap.docs.map(processUserData).filter(u => !u.isAdmin);
            setUsers(fetchedUsers);
            setTotalUsersCount(snap.docs.filter(doc => !doc.data().isAdmin).length);
            setTotalPremiumUsersCount(snap.docs.filter(doc => doc.data().isSubscribed).length);
            setLoading(false);
        }, err => { console.error("Error fetching users:", err); setLoading(false); });

        let unsubSettled, unsubVerified;
        if (userData?.uid) {
            unsubSettled = onSnapshot(collection(db, 'adminSettings', userData.uid, 'settledUsers'), snap => setMySettledUsers(snap.docs.map(d => d.id)));
            unsubVerified = onSnapshot(collection(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers'), snap => setVerifiedExpiryUsers(snap.docs.map(d => d.id)));
        }

        return () => { unsubPlans(); unsubUsers(); unsubSettled && unsubSettled(); unsubVerified && unsubVerified(); };
    }, [userData?.uid]);

    const handleOpenUserModal = (user) => { setSelectedUser(user); setIsUserModalOpen(true); };

    const handleGrantAccess = async (userId, userEmail, expiryOptions, planId, planName, pricePaid, newAccessControl) => {
        if (!Object.values(newAccessControl).some(v => v)) { return alert("Please grant access to at least one service."); }

        let finalExpiryDate;
        if (expiryOptions.specificDate) {
            // Use the specific date provided
            const dateParts = expiryOptions.specificDate.split('-');
            finalExpiryDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
            finalExpiryDate.setHours(23, 59, 59, 999); // Set to end of day for consistency
        } else if (expiryOptions.days && expiryOptions.days > 0) {
            // Calculate date from days
            finalExpiryDate = new Date(new Date().getTime() + expiryOptions.days * 24 * 60 * 60 * 1000);
        } else {
            return alert("Please set a valid expiry period or date.");
        }

        try {
            const userRef = doc(db, 'users', userId);
            const currentSubscribedAt = users.find(u => u.id === userId)?.subscribedAt;
            await updateDoc(userRef, {
                isSubscribed: true, accessControl: newAccessControl, planId: planId || null, planName: planName || 'Custom Access',
                planPrice: pricePaid, expiryDate: Timestamp.fromDate(finalExpiryDate),
                subscribedAt: currentSubscribedAt || serverTimestamp(),
            });
            alert(`Access updated for ${userEmail}.`);
            setIsUserModalOpen(false);
        } catch (error) { console.error("Error granting access:", error); alert("Failed to grant access."); }
    };

    const handleRevokeAccess = async (userId, userEmail) => {
        if (window.confirm(`Are you sure you want to revoke all premium access for ${userEmail}?`)) {
            try {
                await updateDoc(doc(db, 'users', userId), {
                    isSubscribed: false, expiryDate: null, subscribedAt: null, planId: null, planName: null, planPrice: null, accessControl: null,
                });
                if (userData?.uid) {
                    await deleteDoc(doc(db, 'adminSettings', userData.uid, 'settledUsers', userId)).catch(() => {});
                    await deleteDoc(doc(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers', userId)).catch(() => {});
                }
                alert(`Access revoked for ${userEmail}.`);
                setIsUserModalOpen(false);
            } catch (error) { console.error("Error revoking access:", error); alert("Failed to revoke access."); }
        }
    };

    const handleToggleMySettledStatus = async (userId, newStatus) => {
        if (!userData?.uid) return;
        const ref = doc(db, 'adminSettings', userData.uid, 'settledUsers', userId);
        try {
            if (newStatus) { await setDoc(ref, { timestamp: serverTimestamp() }); }
            else { await deleteDoc(ref); }
        } catch (error) { console.error("Error toggling settled status:", error); alert("Failed to update status."); }
    };

    const handleMarkAsVerified = async (userId) => {
        if (!userData?.uid) return alert("You must be logged in.");
        try {
            await setDoc(doc(db, 'adminSettings', userData.uid, 'verifiedExpiryUsers', userId), { timestamp: serverTimestamp() });
        } catch (error) { console.error("Error marking as verified:", error); alert("Failed to mark as verified."); }
    };

    const getDaysRemaining = (expiryDate) => {
        if (!expiryDate?.toDate) return Infinity;
        return Math.ceil((expiryDate.toDate().getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    };

    const expiringUsers = users.filter(user => user.isSubscribed && getDaysRemaining(user.expiryDate) <= 3 && !verifiedExpiryUsers.includes(user.id))
                              .sort((a, b) => getDaysRemaining(a.expiryDate) - getDaysRemaining(b.expiryDate));
    const verifiedUsersList = users.filter(user => verifiedExpiryUsers.includes(user.id));

    const filteredUsers = users.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase()));

    let displayedUsers;
    switch(activeTab) {
        case 'expiry': displayedUsers = expiringUsers.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase())); break;
        case 'verified': displayedUsers = verifiedUsersList.filter(u => (u.name || u.email).toLowerCase().includes(searchTerm.toLowerCase())); break;
        case 'premium': displayedUsers = filteredUsers.filter(u => u.isSubscribed); break;
        default: displayedUsers = filteredUsers; break;
    }

    const totalPages = Math.ceil(displayedUsers.length / usersPerPage);
    const currentUsers = displayedUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const tabs = [
        { id: 'all', label: 'All Users' },
        { id: 'premium', label: 'Premium Users' },
        { id: 'expiry', label: 'Expiry', count: expiringUsers.length },
        { id: 'verified', label: 'Verified' },
    ];

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
            <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <StatCard title="Total Registered Users" value={totalUsersCount} icon={<UserGroupIcon className="h-6 w-6 text-indigo-400"/>} />
                <StatCard title="Total Premium Users" value={totalPremiumUsersCount} icon={<CheckCircleIcon className="h-6 w-6 text-green-400"/>} />
            </div>

            <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3"><MagnifyingGlassIcon className="h-5 w-5 text-gray-400"/></span>
                <input
                    type="text" placeholder="Search by name or email..." value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full p-2 pl-10 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500 transition"
                />
            </div>

            <div className="mb-4">
                <div className="sm:hidden">
                    <select onChange={(e) => { setActiveTab(e.target.value); setCurrentPage(1); }} className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:border-indigo-500 focus:ring-indigo-500">
                        {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label} {tab.count > 0 ? `(${tab.count})` : ''}</option>)}
                    </select>
                </div>
                <div className="hidden sm:flex border-b border-gray-700">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
                            className={`px-4 py-2 font-semibold text-sm relative transition ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                            {tab.label}
                            {tab.count > 0 && <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-500 text-xs text-white">{tab.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-gray-800/50 shadow-md rounded-lg overflow-hidden mb-8">
                {loading ? (<p className="p-6 text-center text-gray-400">Loading users...</p>) : (
                    <>
                        {/* --- Mobile Card View --- */}
                        <div className="md:hidden p-4 space-y-4">
                           {currentUsers.length > 0 ? (
                                currentUsers.map(user => <UserCard key={user.id} user={user} activeTab={activeTab} mySettledUsers={mySettledUsers} handleOpenModal={handleOpenUserModal} handleToggleMySettledStatus={handleToggleMySettledStatus} onMarkAsVerified={handleMarkAsVerified} />)
                            ) : (
                                <p className="text-center text-gray-400 py-8">No users found.</p>
                            )}
                        </div>

                        {/* --- Desktop Table View --- */}
                        <div className="hidden md:block overflow-x-auto">
                            {activeTab === 'all' && (
                                <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th></tr></thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<UserRow key={user.id} user={user} handleOpenModal={handleOpenUserModal}/>))) : (<tr><td colSpan={5} className="px-6 py-4 text-center text-gray-400">No users found.</td></tr>)}</tbody>
                                </table>
                            )}
                            {activeTab === 'premium' && (
                                <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscribed At</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase">My Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th></tr></thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<PremiumUserRow key={user.id} user={user} mySettledUsers={mySettledUsers} handleToggleMySettledStatus={handleToggleMySettledStatus} handleOpenModal={handleOpenUserModal} />))) : (<tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">No premium users found.</td></tr>)}</tbody>
                                </table>
                            )}
                            {activeTab === 'expiry' || activeTab === 'verified' ? (
                                <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Mail ID</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Action</th></tr></thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">{currentUsers.length > 0 ? (currentUsers.map(user => (<ExpiryManagementRow key={user.id} user={user} handleOpenModal={handleOpenUserModal} onMarkAsVerified={handleMarkAsVerified} isVerifiedTab={activeTab === 'verified'} />))) : (<tr><td colSpan={6} className="px-6 py-4 text-center text-gray-400">{activeTab === 'expiry' ? 'No users are expiring soon.' : 'No users marked as verified.'}</td></tr>)}</tbody>
                                </table>
                            ) : null}
                        </div>

                        {totalPages > 1 && (
                            <div className="p-4 flex justify-between items-center bg-gray-700/50">
                                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"><ArrowLeftIcon className="h-4 w-4"/> Previous</button>
                                <span className="text-gray-300 text-sm">Page {currentPage} of {totalPages}</span>
                                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 rounded-md bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition">Next <ArrowRightIcon className="h-4 w-4"/></button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <UserEditModal
                isOpen={isUserModalOpen}
                setIsOpen={setIsUserModalOpen}
                user={selectedUser}
                handleGrantAccess={handleGrantAccess}
                handleRevokeAccess={handleRevokeAccess}
                validityDays={validityDays}
                setValidityDays={setValidityDays}
                expiryDate={expiryDate}
                setExpiryDate={setExpiryDate}
                plans={plans}
                selectedPlanId={selectedPlanId}
                setSelectedPlanId={setSelectedPlanId}
                accessControl={accessControl}
                setAccessControl={setAccessControl}
            />
        </div>
    );
}