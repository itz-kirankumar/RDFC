import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { collection, doc, updateDoc, Timestamp, serverTimestamp, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Transition, Switch as HeadlessSwitch } from '@headlessui/react';
import { useAuth } from '../contexts/AuthContext';
import { UserGroupIcon, CheckCircleIcon, XCircleIcon, PencilIcon, ShieldCheckIcon, MagnifyingGlassIcon, ArrowLeftIcon, ArrowRightIcon, CurrencyRupeeIcon, CalendarDaysIcon, TagIcon } from '@heroicons/react/24/outline';

// --- Reusable UI Components ---

const StatCard = ({ title, value, icon }) => (
    <div className="bg-gray-800 p-5 rounded-lg flex items-center space-x-4 shadow-lg">
        <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
        <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
        </div>
    </div>
);

const FormInput = ({ label, type = 'number', value, onChange, placeholder = '', ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input type={type} value={value || ''} onChange={onChange} placeholder={placeholder} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 transition" {...props} />
    </div>
);

// --- Upgraded User Edit Modal ---
const UserEditModal = ({ isOpen, setIsOpen, user, handleGrantAccess, plans, managedTabs }) => {
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [accessCheckboxes, setAccessCheckboxes] = useState({});
    const [isVerified, setIsVerified] = useState(false);
    const [pricePaid, setPricePaid] = useState('');
    const [useGranularValidity, setUseGranularValidity] = useState(false);
    
    // State for Overall Validity
    const [overallExpiryDate, setOverallExpiryDate] = useState('');
    const [validityDays, setValidityDays] = useState('');

    // State for Granular Validity
    const [granularValidityMap, setGranularValidityMap] = useState({});

    const manageableAccessKeys = useMemo(() => managedTabs.flatMap(tab => {
        const keys = [];
        if (tab.requiresAccess) keys.push({ key: tab.name, label: tab.name });
        // Include sub-tabs if they exist and require access
        tab.subTabs?.forEach(subTab => {
            if (subTab.requiresAccess) keys.push({ key: `${tab.name}/${subTab.name}`, label: `↳ ${subTab.name}` });
        });
        return keys;
    }), [managedTabs]);
    
    const formatDateForInput = (date) => date ? new Date(date).toISOString().split('T')[0] : '';
    
    useEffect(() => {
        if (user) {
            const userAccess = user.accessControl || {};
            const isGranular = !!userAccess.validityMap;
            setUseGranularValidity(isGranular);
            setIsVerified(user.isVerified || false);
            setPricePaid(user.pricePaid || '');
            setSelectedPlanId(user.planId || '');
            
            // --- BACKWARD COMPATIBILITY READ ---
            const initialCheckboxes = {};
            const oldKeyMap = {'RDFC': user.rdfc_articles || user.rdfc_tests, 'Mocks': user.mock, 'Sectionals': user.sectional, 'Add-Ons': user.test, '10 Min RC': user.ten_min_tests };
            manageableAccessKeys.forEach(({key}) => {
                const hasNewAccess = isGranular ? !!userAccess.validityMap?.[key] : !!userAccess[key];
                initialCheckboxes[key] = hasNewAccess || !!oldKeyMap[key];
            });
            setAccessCheckboxes(initialCheckboxes);

            // Initialize validity dates
            setOverallExpiryDate(user.expiryDate ? formatDateForInput(user.expiryDate.toDate()) : '');
            const initialGranularMap = {};
            if (userAccess.validityMap) {
                Object.keys(userAccess.validityMap).forEach(key => {
                    initialGranularMap[key] = formatDateForInput(userAccess.validityMap[key].toDate());
                });
            }
            setGranularValidityMap(initialGranularMap);
            setValidityDays(''); // Reset helper field
        }
    }, [user, managedTabs]);

    const handleCheckboxChange = (name, isChecked) => {
        setAccessCheckboxes(prev => ({...prev, [name]: isChecked}));
    };
    
    const handleAllAccessChange = (e) => {
        const { checked } = e.target;
        const newCheckboxes = {};
        manageableAccessKeys.forEach(({ key }) => newCheckboxes[key] = checked);
        setAccessCheckboxes(newCheckboxes);
    };

    const handleDaysChange = (e) => {
        const days = e.target.value;
        setValidityDays(days);
        if (days && !isNaN(days) && days >= 0) {
            const date = new Date();
            date.setDate(date.getDate() + parseInt(days, 10));
            setOverallExpiryDate(formatDateForInput(date));
        }
    };
    
    const onSave = () => {
        handleGrantAccess(user, {
            useGranularValidity, isVerified, pricePaid, selectedPlanId,
            accessCheckboxes, overallExpiryDate, granularValidityMap,
        });
        setIsOpen(false);
    };
    
    const allAccessChecked = manageableAccessKeys.length > 0 && manageableAccessKeys.every(k => accessCheckboxes[k.key]);

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/50" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-white">Manage Access: {user?.displayName || user?.email}</Dialog.Title>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormInput label="Price Paid" type="number" value={pricePaid} onChange={(e) => setPricePaid(e.target.value)} placeholder="e.g., 499" min="0" />
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Subscription Plan</label>
                                <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white"><option value="">No Plan (Manual Access)</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select>
                            </div>
                        </div>
                        <div className="mt-4 border-t border-gray-700 pt-4">
                            <div className="flex items-center justify-between"><h4 className="font-semibold text-white">Content Access & Validity</h4><div className="flex items-center space-x-2"><span className="text-sm text-gray-400">Granular Dates</span><HeadlessSwitch checked={useGranularValidity} onChange={setUseGranularValidity} className={`${useGranularValidity ? 'bg-indigo-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full`}><span className={`${useGranularValidity ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} /></HeadlessSwitch></div></div>
                        </div>
                        {!useGranularValidity && (<div className="grid grid-cols-2 gap-4 mt-4"><FormInput label="Set Validity (Days)" type="number" value={validityDays} onChange={handleDaysChange} placeholder="e.g., 30" min="0" /><FormInput label="Overall Expiry Date" type="date" value={overallExpiryDate} onChange={(e) => setOverallExpiryDate(e.target.value)} /></div>)}
                        <div className="mt-4 space-y-1 max-h-60 overflow-y-auto pr-2 rounded-lg bg-gray-900/50 p-2">
                            <div className="border-b border-gray-700 pb-1 mb-1"><label className="flex items-center space-x-3 p-2 cursor-pointer"><input type="checkbox" checked={allAccessChecked} onChange={handleAllAccessChange} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-500" /><span className="text-white font-medium">All Access</span></label></div>
                            {manageableAccessKeys.map(({ key, label }) => (
                                <div key={key} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-700/50">
                                    <label className="flex items-center space-x-3 flex-grow cursor-pointer"><input type="checkbox" checked={!!accessCheckboxes[key]} onChange={(e) => handleCheckboxChange(key, e.target.checked)} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-indigo-500" /><span className="text-gray-300">{label}</span></label>
                                    {useGranularValidity && accessCheckboxes[key] && (<input type="date" value={granularValidityMap[key] || ''} onChange={(e) => setGranularValidityMap(p => ({...p, [key]: e.target.value}))} className="ml-4 w-auto rounded-md bg-gray-600 border-gray-500 text-white text-sm p-1" />)}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center justify-between"><h4 className="font-semibold text-white">Verification Status</h4><HeadlessSwitch checked={isVerified} onChange={setIsVerified} className={`${isVerified ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full`}><span className={`${isVerified ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`} /></HeadlessSwitch></div>
                        <div className="mt-6 flex justify-end space-x-2"><button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={() => setIsOpen(false)}>Cancel</button><button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={onSave}>Save Changes</button></div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

const UserCard = ({ user, planName, expiryStatus, onOpenModal, onRevokeAccess }) => (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col space-y-3 shadow-md border-l-4 border-gray-700">
        <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{user.displayName || user.email}</p>
                <p className="text-sm">{user.isSubscribed ? <span className="text-green-400 font-semibold">Premium</span> : <span className="text-gray-400">Standard</span>}</p>
            </div>
            {user.isVerified ? <ShieldCheckIcon className="h-5 w-5 text-green-400 flex-shrink-0" title="Verified"/> : <ShieldCheckIcon className="h-5 w-5 text-gray-500 flex-shrink-0" title="Not Verified"/>}
        </div>
        <div className="border-t border-gray-700 pt-3 text-sm text-gray-400 space-y-2">
            <div className="flex items-center gap-2"><TagIcon className="h-4 w-4"/><span>{planName}</span></div>
            <div className="flex items-center gap-2"><CurrencyRupeeIcon className="h-4 w-4"/><span>{user.pricePaid || 'N/A'}</span></div>
            <div className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4"/><span className={expiryStatus.color}>{expiryStatus.text}</span></div>
        </div>
        <div className="pt-2 flex items-center space-x-2">
            <button onClick={onOpenModal} className="text-sm bg-indigo-600 text-white font-semibold py-1 px-3 rounded-md w-full hover:bg-indigo-500 transition-colors">Manage</button>
            <button onClick={onRevokeAccess} className="text-sm bg-red-800 text-white font-semibold py-1 px-3 rounded-md w-full hover:bg-red-700 transition-colors">Revoke</button>
        </div>
    </div>
);


// --- Main Component ---
export default function AdminUserManagement() {
    const { userData } = useAuth();
    const [allUsers, setAllUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [managedTabs, setManagedTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState('All');
    const usersPerPage = 10;

    const MASTER_ADMIN_EMAIL = "kiran160703kumar@gmail.com";
    const isMasterAdmin = userData?.email === MASTER_ADMIN_EMAIL;
    
    useEffect(() => {
        const unsubUsers = onSnapshot(collection(db, "users"), snap => {
            const allDocs = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
            setAllUsers(allDocs.filter(u => !u.isAdmin));
        });
        const unsubPlans = onSnapshot(collection(db, "subscriptionPlans"), snap => setPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        const unsubTabs = onSnapshot(query(collection(db, 'tabManager'), orderBy('order')), snap => setManagedTabs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubTransactions = onSnapshot(collection(db, "transactions"), snap => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        Promise.all([unsubUsers, unsubPlans, unsubTabs, unsubTransactions]).then(() => {
            setLoading(false);
        });

        return () => { unsubUsers(); unsubPlans(); unsubTabs(); unsubTransactions(); };
    }, []);
    
    // Filter users based on admin role
    const visibleUsers = useMemo(() => {
        if (isMasterAdmin) {
            return allUsers; // Master admin sees all users
        }

        // For other admins, hide users whose transactions are marked as hidden.
        const hiddenUserIds = new Set(
            transactions
                .filter(tx => tx.isHidden) // Find all hidden transactions
                .map(tx => tx.userId)      // Get the corresponding user IDs
        );

        // Return all users except those in the hidden set.
        return allUsers.filter(user => !hiddenUserIds.has(user.uid));

    }, [allUsers, transactions, isMasterAdmin]);


    const handleGrantAccess = async (user, payload) => {
        const { useGranularValidity, isVerified, pricePaid, selectedPlanId, accessCheckboxes, overallExpiryDate, granularValidityMap } = payload;
        const userRef = doc(db, 'users', user.uid);
        const plan = plans.find(p => p.id === selectedPlanId);

        const grantedAccessKeys = Object.keys(accessCheckboxes).filter(key => accessCheckboxes[key]);
        const isSubscribed = grantedAccessKeys.length > 0 || !!selectedPlanId;
        
        let finalAccessControl = {};
        if (useGranularValidity) {
            const validityMap = {};
            grantedAccessKeys.forEach(key => {
                if(granularValidityMap[key]) {
                    validityMap[key] = Timestamp.fromDate(new Date(granularValidityMap[key] + 'T23:59:59'));
                }
            });
            finalAccessControl = { validityMap };
        } else {
            grantedAccessKeys.forEach(key => { finalAccessControl[key] = true; });
        }

        const numericPrice = pricePaid !== '' && pricePaid !== null ? parseFloat(pricePaid) : (user.pricePaid || null);

        const updateData = {
            isSubscribed, isVerified,
            pricePaid: numericPrice,
            planPrice: numericPrice,
            planId: selectedPlanId || null,
            planName: plan?.name || 'Custom Plan',
            expiryDate: useGranularValidity ? null : (overallExpiryDate ? Timestamp.fromDate(new Date(overallExpiryDate + 'T23:59:59')) : null),
            accessControl: finalAccessControl,
            lastUpdatedByAdmin: serverTimestamp(),
            rdfc_articles: !!accessCheckboxes['RDFC'],
            rdfc_tests: !!accessCheckboxes['RDFC'],
            mock: !!accessCheckboxes['Mocks'],
            sectional: !!accessCheckboxes['Sectionals'],
            test: !!accessCheckboxes['Add-Ons'],
            ten_min_tests: !!accessCheckboxes['10 Min RC'],
        };
        await updateDoc(userRef, updateData);
    };

    const handleRevokeAccess = async (user) => {
        if (window.confirm(`Revoke all access for ${user.displayName || user.email}?`)) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                isSubscribed: false, expiryDate: null, planId: null, planName: null,
                accessControl: {}, isVerified: false, pricePaid: null, planPrice: null,
                lastUpdatedByAdmin: serverTimestamp(),
                rdfc_articles: false, rdfc_tests: false, mock: false, sectional: false, test: false, ten_min_tests: false
            });
        }
    };
    
    const openUserModal = (user) => { setSelectedUser(user); setIsUserModalOpen(true); };

    const getExpiryStatusForUser = (user) => {
        const today = new Date();
        if (!user.isSubscribed) return { needsAction: false, text: 'N/A', color: 'text-gray-500' };

        if (user.accessControl?.validityMap) {
            const actionKeys = Object.keys(user.accessControl.validityMap).filter(key => {
                const expiry = user.accessControl.validityMap[key].toDate();
                const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                return daysLeft <= 7;
            });
            if (actionKeys.length > 0) {
                const hasExpired = actionKeys.some(k => user.accessControl.validityMap[k].toDate() < today);
                return { needsAction: true, text: `Granular (${actionKeys.length} items)`, color: hasExpired ? 'text-red-400' : 'text-yellow-400' };
            }
            return { needsAction: false, text: 'Granular', color: 'text-gray-300' };
        }
        
        if (user.expiryDate) {
            const expiry = user.expiryDate.toDate();
            const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 7) {
                const text = daysLeft <= 0 ? `Expired` : `Expires in ${daysLeft}d`;
                const color = daysLeft <= 0 ? 'text-red-400' : 'text-yellow-400';
                return { needsAction: true, text, color };
            }
            return { needsAction: false, text: expiry.toLocaleDateString(), color: 'text-gray-300' };
        }

        return { needsAction: false, text: 'N/A', color: 'text-gray-500' };
    };
    
    // Calculations below now use `visibleUsers` instead of `users` or `allUsers`
    const usersInExpiryTab = useMemo(() => visibleUsers.filter(u => !u.isVerified && getExpiryStatusForUser(u).needsAction), [visibleUsers]);

    const filteredUsers = useMemo(() => {
        let sorted = [...visibleUsers].sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
        
        if (activeTab === 'Premium') sorted = sorted.filter(u => u.isSubscribed);
        if (activeTab === 'Expiry') return usersInExpiryTab;
        if (activeTab === 'Verified') sorted = sorted.filter(u => u.isVerified);

        if (searchTerm) {
            sorted = sorted.filter(u => (u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
        }
        return sorted;
    }, [visibleUsers, activeTab, searchTerm, usersInExpiryTab]);
    
    const premiumUsersCount = useMemo(() => visibleUsers.filter(u => u.isSubscribed).length, [visibleUsers]);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);
    const currentUsers = filteredUsers.slice((currentPage * usersPerPage) - usersPerPage, currentPage * usersPerPage);
    
    const TabButton = ({ name, count }) => (
        <button onClick={() => { setActiveTab(name); setCurrentPage(1); }} className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === name ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
            {name}{count > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">{count}</span>}
        </button>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">User Management</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard title="Total Users" value={visibleUsers.length} icon={<UserGroupIcon className="h-6 w-6 text-indigo-400"/>}/>
                <StatCard title="Premium Users" value={premiumUsersCount} icon={<CheckCircleIcon className="h-6 w-6 text-green-400"/>}/>
                <StatCard title="Action Required" value={usersInExpiryTab.length} icon={<XCircleIcon className="h-6 w-6 text-red-400"/>}/>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-grow"><MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 p-2 rounded-md bg-gray-800 border-gray-700 text-white" /></div>
                <div className="p-1 bg-gray-800/50 rounded-lg flex items-center space-x-1"><TabButton name="All" /><TabButton name="Premium" /><TabButton name="Expiry" count={usersInExpiryTab.length} /><TabButton name="Verified" /></div>
            </div>
            
            {loading ? <div className="text-center p-8 text-gray-400">Loading...</div> : (
                <>
                    <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        {/* Mobile View */}
                        <div className="md:hidden p-4 grid grid-cols-1 gap-4">
                            {currentUsers.length > 0 ? currentUsers.map(user => {
                                const planName = plans.find(p => p.id === user.planId)?.name || user.planName || 'N/A';
                                const expiryStatus = getExpiryStatusForUser(user);
                                return <UserCard key={user.uid} user={user} planName={planName} expiryStatus={expiryStatus} onOpenModal={() => openUserModal(user)} onRevokeAccess={() => handleRevokeAccess(user)} />;
                            }) : <p className="text-center p-8 text-gray-400">No users found.</p>}
                        </div>
                        {/* Desktop View */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="min-w-full divide-y divide-gray-700">
                                <thead className="bg-gray-700/50"><tr><th className="th">User</th><th className="th">Status</th><th className="th">Verified</th><th className="th">Plan</th><th className="th">Expires On</th><th className="th">Price Paid</th><th className="th">Actions</th></tr></thead>
                                <tbody className="bg-gray-800 divide-y divide-gray-700">
                                    {currentUsers.length > 0 ? currentUsers.map(user => {
                                        const planName = plans.find(p => p.id === user.planId)?.name || user.planName || 'N/A';
                                        const expiryStatus = getExpiryStatusForUser(user);
                                        return (
                                            <tr key={user.uid}>
                                                <td className="px-6 py-4 text-sm font-medium text-white">{user.displayName || user.email}</td>
                                                <td className="px-6 py-4 text-sm">{user.isSubscribed ? <span className="badge-green"><CheckCircleIcon className="h-4 w-4"/>Subscribed</span> : <span className="badge-red"><XCircleIcon className="h-4 w-4"/>Not Subscribed</span>}</td>
                                                <td className="px-6 py-4 text-sm">{user.isVerified ? <ShieldCheckIcon className="h-5 w-5 text-green-400" /> : <ShieldCheckIcon className="h-5 w-5 text-gray-500" />}</td>
                                                <td className="px-6 py-4 text-sm text-gray-300">{planName}</td>
                                                <td className={`px-6 py-4 text-sm font-semibold ${expiryStatus.color}`}>{expiryStatus.text}</td>
                                                <td className="px-6 py-4 text-sm text-gray-300">{user.pricePaid || 'N/A'}</td>
                                                <td className="px-6 py-4 text-sm font-medium flex items-center space-x-4"><button onClick={() => openUserModal(user)} className="text-indigo-400 hover:text-indigo-300"><PencilIcon className="h-4 w-4"/></button><button onClick={() => handleRevokeAccess(user)} className="text-red-500 hover:text-red-400"><XCircleIcon className="h-4 w-4" /></button></td>
                                            </tr>
                                        );
                                    }) : <tr><td colSpan="7" className="text-center p-8 text-gray-400">No users found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (<div className="p-4 flex items-center justify-between"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="btn-pag"><ArrowLeftIcon className="h-4 w-4"/> Prev</button><span className="text-gray-300 text-sm">Page {currentPage} of {totalPages}</span><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="btn-pag">Next <ArrowRightIcon className="h-4 w-4"/></button></div>)}
                    </div>
                </>
            )}
            {selectedUser && <UserEditModal isOpen={isUserModalOpen} setIsOpen={setIsUserModalOpen} user={selectedUser} handleGrantAccess={handleGrantAccess} plans={plans} managedTabs={managedTabs} />}
            <style jsx>{`
                .th { padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 500; color: #D1D5DB; text-transform: uppercase; }
                .badge-green { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; background-color: #064E3B; color: #A7F3D0; }
                .badge-red { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500; background-color: #991B1B; color: #FECACA; }
                .btn-pag { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border-radius: 0.375rem; background-color: #4B5563; color: white; transition: background-color 0.2s; }
                .btn-pag:hover:not(:disabled) { background-color: #6B7280; }
                .btn-pag:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
}