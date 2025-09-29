import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { doc, onSnapshot, updateDoc, collection, query, where, orderBy, getDocs, setDoc, serverTimestamp, writeBatch, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaCog, FaHistory, FaRupeeSign, FaClock, FaChartLine, FaSun, FaHandHoldingUsd, FaCheckDouble, FaFileCsv, FaSearch, FaSortAmountDown, FaSortAmountUp, FaChartPie, FaExclamationTriangle, FaBoxOpen, FaChevronLeft, FaChevronRight, FaUserShield, FaUserCircle, FaRobot, FaUserEdit, FaCheck, FaEye, FaEyeSlash, FaUndo } from 'react-icons/fa';
import { Dialog, Transition, Menu, Switch } from '@headlessui/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Helper Functions & Constants ---
const MASTER_ADMIN_EMAIL = "kiran160703kumar@gmail.com";

const safeToDate = (timestamp) => timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : null);
const formatTimestamp = (timestamp) => {
    const date = safeToDate(timestamp);
    return date ? date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
};
const formatForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444'];

// --- Reusable UI Components ---
const ConfirmationModal = ({ isOpen, setIsOpen, title, message, onConfirm }) => (
    <Transition appear show={isOpen} as={Fragment}><Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}><Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70" /></Transition.Child><div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4"><Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-slate-800 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all"><Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white flex items-center"><FaExclamationTriangle className="text-yellow-400 mr-3"/>{title}</Dialog.Title><div className="mt-2"><p className="text-sm text-slate-400">{message}</p></div><div className="mt-6 flex justify-end space-x-3"><button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 focus:outline-none" onClick={() => setIsOpen(false)}>Cancel</button><button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none" onClick={onConfirm}>Confirm</button></div></Dialog.Panel></div></div></Dialog></Transition>
);

const FormInput = ({ label, type = 'number', value, onChange, placeholder = '' }) => (
    <div><label className="block text-sm font-medium text-gray-300">{label}</label><input type={type} value={value} onChange={onChange} placeholder={placeholder} className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-500 focus:ring-opacity-50" /></div>
);

const FormCheckbox = ({ label, checked, onChange }) => (
    <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800" /><span className="text-gray-300 text-sm font-medium">{label}</span></label>
);

const SettingsModal = ({ isOpen, setIsOpen, plansToShow, myPlanShares, setMyPlanShares, charges, setCharges, onSave, isMasterAdmin, masterConfig, setMasterConfig, firebaseCharges, setFirebaseCharges }) => {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/60" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Earnings Settings</Dialog.Title>
                        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            {isMasterAdmin && (
                                <div className="p-4 border border-blue-500/50 rounded-lg bg-blue-900/20">
                                    <h4 className="font-semibold text-blue-300 mb-3 flex items-center"><FaRobot className="mr-2"/>Scheduled Automation Settings</h4>
                                    <p className="text-xs text-blue-400 mb-3">The automation rules below will only apply to new transactions created within the specified time range.</p>
                                    <div className="space-y-3">
                                        <FormInput label="Automation Start Time" type="datetime-local" value={formatForInput(safeToDate(masterConfig.automationStartDate))} onChange={e => setMasterConfig(prev => ({...prev, automationStartDate: new Date(e.target.value)}))} />
                                        <FormInput label="Automation End Time" type="datetime-local" value={formatForInput(safeToDate(masterConfig.automationEndDate))} onChange={e => setMasterConfig(prev => ({...prev, automationEndDate: new Date(e.target.value)}))} />
                                        <div className="pt-2 border-t border-blue-500/30">
                                            <FormCheckbox label="Auto-Approve New Transactions" checked={!!masterConfig.autoApprove} onChange={e => setMasterConfig(prev => ({...prev, autoApprove: e.target.checked}))} />
                                            <FormCheckbox label="Auto-Hide New Transactions" checked={!!masterConfig.autoHide} onChange={e => setMasterConfig(prev => ({...prev, autoHide: e.target.checked}))} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="p-4 border border-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-200 mb-2">Platform Charges (%)</h4>
                                <FormInput value={charges} onChange={e => setCharges(e.target.value)} placeholder="e.g., 2.5" />
                                
                                <h4 className="font-semibold text-gray-200 mt-4 mb-2">Firebase Charges (₹)</h4>
                                <FormInput value={firebaseCharges} onChange={e => setFirebaseCharges(e.target.value)} placeholder="e.g., 500" />
                            </div>
                            <div className="p-4 border border-gray-700 rounded-lg">
                                <h4 className="font-semibold text-gray-200 mb-2">My Plan Shares (%)</h4>
                                {plansToShow.map(plan => (<div key={plan.id} className="mb-3"><FormInput label={plan.name} value={myPlanShares[plan.id] || ''} onChange={e => setMyPlanShares(p => ({...p, [plan.id]: e.target.value}))} placeholder="e.g., 70" /></div>))}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-500" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-500" onClick={onSave}>Save Settings</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

const StatCard = ({ title, value, icon }) => (
    <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/80 shadow-lg transition-all duration-300 hover:bg-slate-800 hover:border-slate-600">
        <div className="flex items-center justify-between"><p className="text-slate-400 text-sm font-medium">{title}</p><div className="p-2 bg-slate-700/50 rounded-lg">{icon}</div></div>
        <p className="text-white text-3xl font-bold mt-2">₹{(value || 0).toFixed(2)}</p>
    </div>
);

const AnalyticsSection = ({ analyticsSummary, timeRange, setTimeRange }) => (
    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/80 mb-8">
         <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 px-2 gap-4">
             <h3 className="font-bold text-white text-lg">Financial Analytics</h3>
             <Menu as="div" className="relative self-end sm:self-auto">
                <Menu.Button className="bg-slate-700 px-3 py-1.5 rounded-md text-sm hover:bg-slate-600">Last {timeRange} Days</Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                    <Menu.Items className="absolute right-0 mt-2 w-32 origin-top-right divide-y divide-slate-600 rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(7)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 7 Days</button>)}</Menu.Item></div>
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(30)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 30 Days</button>)}</Menu.Item></div>
                        <div className="px-1 py-1"><Menu.Item>{({ active }) => (<button onClick={() => setTimeRange(90)} className={`${active ? 'bg-slate-700' : ''} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>Last 90 Days</button>)}</Menu.Item></div>
                    </Menu.Items>
                </Transition>
             </Menu>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center"><FaChartLine className="mr-2 text-emerald-400"/>Sales Trend</h3>
                <ResponsiveContainer width="100%" height={300}><LineChart data={analyticsSummary.trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="#334155" /><XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1' }} interval="preserveStartEnd" /><YAxis stroke="#94a3b8" fontSize={12} tick={{ fill: '#cbd5e1' }} /><Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} formatter={(value) => `₹${value.toFixed(2)}`} /><Line type="monotone" dataKey="revenue" name="Daily Revenue" stroke="#34d399" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer>
            </div>
            <div className="bg-slate-900/50 p-4 rounded-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center"><FaChartPie className="mr-2 text-blue-400"/>Plan Contribution</h3>
                <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={analyticsSummary.planData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={{ stroke: '#94a3b8' }} label={{ fill: '#e2e8f0', fontSize: 13 }}>{analyticsSummary.planData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip contentStyle={{ backgroundColor: '#d3d3d3', border: '1px solid #334155' }} formatter={(value, name) => [`₹${value.toFixed(2)}`, name]} /></PieChart></ResponsiveContainer>
            </div>
        </div>
    </div>
);

const TableSkeletonLoader = () => (<div className="p-4">{[...Array(5)].map((_, i) => (<div key={i} className="animate-pulse flex space-x-4 border-b border-slate-800 py-4"><div className="flex-1 space-y-3 py-1"><div className="h-3 bg-slate-700 rounded w-3/4"></div><div className="h-3 bg-slate-700 rounded w-1/2"></div></div><div className="h-8 bg-slate-700 rounded w-1/6"></div></div>))}</div>);
const EmptyState = ({ message }) => (<div className="text-center p-8 text-slate-400"><FaBoxOpen className="mx-auto text-4xl mb-4 text-slate-500" /><p>{message}</p></div>);
const Spinner = () => (<svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;
    return (<div className="flex items-center justify-between p-4 border-t border-slate-700"><span className="text-sm text-slate-400">Page {currentPage} of {totalPages}</span><div className="flex items-center space-x-2"><button onClick={() => onPageChange(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn"><FaChevronLeft className="h-4 w-4" /></button><button onClick={() => onPageChange(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn"><FaChevronRight className="h-4 w-4" /></button></div></div>);
};

const TransactionRow = ({ tx, isMasterAdmin, activeTab, onSettle, onToggleApproval, onToggleHidden }) => {
    const TypePill = ({ type }) => {
        const isAuto = type === 'transaction';
        return (<span className={`pill ${isAuto ? 'pill-auto' : 'pill-manual'}`}>{isAuto ? <FaRobot className="mr-1.5" /> : <FaUserEdit className="mr-1.5" />}{isAuto ? 'Auto' : 'Manual'}</span>);
    };
    const StatusPill = () => {
        if (tx.isHidden) return <span className="status-pill status-hidden"><FaEyeSlash className="mr-1.5" />Hidden</span>;
        if (tx.isApproved) return <span className="status-pill status-approved"><FaCheck className="mr-1.5" />Approved</span>;
        return <span className="status-pill status-pending"><FaClock className="mr-1.5" />Pending</span>;
    };
    const rowClass = tx.isHidden ? 'opacity-50 bg-slate-900/50' : (!tx.isApproved && isMasterAdmin ? 'bg-yellow-900/20' : '');

    return (
        <tr className={`transaction-row ${rowClass}`}>
            <td className="td user-cell"><FaUserCircle className="text-slate-500 text-2xl mr-3 flex-shrink-0" /><div><p className="font-medium text-white">{tx.userName || 'N/A'}</p><p className="text-xs text-slate-400 truncate max-w-[200px]">{tx.userEmail || 'N/A'}</p></div></td>
            <p className="text-emerald-400 font-semibold text-lg">₹{(tx.amount || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400">{`${tx.planName || 'N/A'} ${tx.tierText ? `(${tx.tierText})` : ''}`.trim()}</p>
            <td className="td"><p className="text-slate-300">{formatTimestamp(tx.createdAt)}</p><p className="text-xs text-slate-500">Transaction Date</p></td>
            {activeTab === 'settled' && (<td className="td"><p className="text-slate-300">{formatTimestamp(tx.settledAt)}</p><p className="text-xs text-slate-500">by {tx.settledBy || 'N/A'}</p></td>)}
            <td className="td"><TypePill type={tx.type} /></td>
            {isMasterAdmin && <td className="td"><StatusPill /></td>}
            
            {(isMasterAdmin || activeTab === 'unsettled') && (
                <td className="td text-center">
                    {isMasterAdmin ? (
                        <div className="flex items-center justify-center space-x-2">
                            {tx.status === 'unsettled' 
                                ? <button onClick={() => onSettle(tx, true)} className="action-icon-btn bg-blue-500/20 hover:bg-blue-500/40 text-blue-300" title="Settle"><FaCheckDouble /></button>
                                : <button onClick={() => onSettle(tx, false)} className="action-icon-btn bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-300" title="Mark as Unsettled"><FaUndo /></button>
                            }
                            <Switch checked={!!tx.isApproved} onChange={() => onToggleApproval(tx)} className={`${tx.isApproved ? 'bg-green-600' : 'bg-slate-600'} switch-btn`} title={tx.isApproved ? 'Un-approve' : 'Approve'}><span className="switch-thumb" /></Switch>
                            <Switch checked={!!tx.isHidden} onChange={() => onToggleHidden(tx)} className={`${tx.isHidden ? 'bg-red-600' : 'bg-slate-600'} switch-btn`} title={tx.isHidden ? 'Show' : 'Hide'}><span className="switch-thumb" /></Switch>
                        </div>
                    ) : (
                        tx.status === 'unsettled' && <button onClick={() => onSettle(tx, true)} className="settle-btn-icon"><FaCheck className="mr-2" />Settle</button>
                    )}
                </td>
            )}
        </tr>
    );
};


// --- Main Earnings Component ---
export default function Earnings() {
    // --- State and Hooks ---
    const { userData } = useAuth();
    const [loading, setLoading] = useState(true);
    const [allPlans, setAllPlans] = useState([]);
    const [usersMap, setUsersMap] = useState(new Map());
    const [myPlanShares, setMyPlanShares] = useState({});
    const [charges, setCharges] = useState(0);
    const [firebaseCharges, setFirebaseCharges] = useState(0);
    const [activeTab, setActiveTab] = useState('unsettled');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    
    // Admin action states
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [confirmModalState, setConfirmModalState] = useState({ isOpen: false });
    const [masterConfig, setMasterConfig] = useState({ autoApprove: false, autoHide: false, automationStartDate: null, automationEndDate: null });
    
    // Analytics
    const [timeRange, setTimeRange] = useState(30);
    const isMasterAdmin = userData?.email === MASTER_ADMIN_EMAIL;

    // --- Data Sources State ---
    const [automatedTransactions, setAutomatedTransactions] = useState([]);
    const [manualSubscribedUsers, setManualSubscribedUsers] = useState([]);
    const [settledManualUsersMap, setSettledManualUsersMap] = useState(new Map());
    const [allTransactionalUserIds, setAllTransactionalUserIds] = useState(new Set());

    // --- Data Fetching Effect ---
    useEffect(() => {
        if (!userData?.uid || !userData?.isAdmin) { setLoading(false); return; }
        const err = (error, type) => console.error(`Error fetching ${type}:`, error);

        const unsubUsers = onSnapshot(collection(db, "users"), snap => {
            const uMap = new Map(), mUsers = [];
            snap.forEach(doc => {
                const uData = { id: doc.id, ...doc.data() };
                uMap.set(doc.id, uData);
                if (uData.isSubscribed && (uData.planPrice || uData.pricePaid)) mUsers.push(uData);
            });
            setUsersMap(uMap); setManualSubscribedUsers(mUsers);
        }, e => err(e, 'users'));

        const q = isMasterAdmin ? query(collection(db, "transactions"), orderBy("createdAt", "desc")) : query(collection(db, "transactions"), where("isApproved", "==", true), where("isHidden", "==", false), orderBy("createdAt", "desc"));
        const unsubTxns = onSnapshot(q, snap => { setAutomatedTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), type: 'transaction' }))); setLoading(false); }, e => err(e, 'transactions'));
        
        const unsubAllTxUsers = onSnapshot(query(collection(db, "transactions")), snap => {
            const ids = new Set(); snap.forEach(d => { if(d.data().userId) ids.add(d.data().userId) });
            setAllTransactionalUserIds(ids);
        }, e => err(e, 'all transaction user IDs'));
        
        const unsubSettledManual = onSnapshot(collection(db, 'adminSettings', userData.uid, 'settledUsers'), snap => { const sMap = new Map(); snap.forEach(d => sMap.set(d.id, d.data())); setSettledManualUsersMap(sMap); }, e => err(e, 'settled manual users'));
        const unsubPlans = onSnapshot(query(collection(db, 'subscriptionPlans'), orderBy('order')), snap => setAllPlans(snap.docs.map(d => ({ id: d.id, ...d.data() }))), e => err(e, 'plans'));
        const unsubSettings = onSnapshot(doc(db, 'adminSettings', userData.uid), d => { 
            if (d.exists()) { 
                setMyPlanShares(d.data().planShares || {}); 
                setCharges(d.data().charges || 0);
                setFirebaseCharges(d.data().firebaseCharges || 0);
            }
        }, e => err(e, 'settings'));
        
        let unsubMasterConfig;
        if (isMasterAdmin) {
            unsubMasterConfig = onSnapshot(doc(db, 'adminSettings', 'masterConfig'), doc => { if (doc.exists()) setMasterConfig(doc.data()); }, e => err(e, 'master config'));
        }
        
        return () => { unsubUsers(); unsubTxns(); unsubAllTxUsers(); unsubSettledManual(); unsubPlans(); unsubSettings(); if (unsubMasterConfig) unsubMasterConfig(); };
    }, [userData, isMasterAdmin]);

    // --- Derived State (Single Source of Truth) ---
    const allItems = useMemo(() => {
        const enrichedAutoTxns = automatedTransactions.map(tx => ({ ...tx, userName: usersMap.get(tx.userId)?.displayName || usersMap.get(tx.userId)?.email, userEmail: usersMap.get(tx.userId)?.email }));
        const manualTxns = manualSubscribedUsers.filter(user => !allTransactionalUserIds.has(user.id)).map(user => {
            const settledData = settledManualUsersMap.get(user.id);
            return { id: user.id, userName: user.displayName || user.email, userEmail: user.email, planName: user.planName || 'Manual', amount: user.planPrice || user.pricePaid || 0, type: 'manual', status: settledData ? 'settled' : 'unsettled', createdAt: user.purchaseDate || null, settledAt: settledData?.settledAt || null, settledBy: settledData?.settledBy || null, isApproved: true, isHidden: false, };
        });
        return [...enrichedAutoTxns, ...manualTxns];
    }, [automatedTransactions, manualSubscribedUsers, settledManualUsersMap, usersMap, allTransactionalUserIds]);
    
    const unsettledItems = useMemo(() => allItems.filter(item => item.status === 'unsettled'), [allItems]);
    const settledItems = useMemo(() => allItems.filter(item => item.status === 'settled'), [allItems]);

    useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, sortConfig]);

    // --- Action Handlers ---
    const handleSettleItem = async (item, shouldSettle) => {
        const settlerName = userData.displayName || 'Admin';
        try {
            if (item.type === 'transaction') {
                await updateDoc(doc(db, 'transactions', item.id), { status: shouldSettle ? 'settled' : 'unsettled', settledAt: shouldSettle ? serverTimestamp() : null, settledBy: shouldSettle ? settlerName : null });
            } else if (item.type === 'manual') {
                const docRef = doc(db, 'adminSettings', userData.uid, 'settledUsers', item.id);
                if (shouldSettle) await setDoc(docRef, { settledAt: serverTimestamp(), settledBy: settlerName });
                else await deleteDoc(docRef);
            }
        } catch (error) { console.error("Error updating settlement status:", error); }
    };

    const handleSettleAll = async () => {
        setConfirmModalState({ isOpen: false }); setIsProcessing(true);
        const settlerName = userData.displayName || 'Admin'; const batch = writeBatch(db);
        try {
            unsettledItems.forEach(item => {
                if (item.type === 'transaction') batch.update(doc(db, 'transactions', item.id), { status: 'settled', settledAt: serverTimestamp(), settledBy: settlerName });
                else if (item.type === 'manual') batch.set(doc(db, 'adminSettings', userData.uid, 'settledUsers', item.id), { settledAt: serverTimestamp(), settledBy: settlerName });
            });
            await batch.commit();
        } catch (error) { console.error("Error settling all items:", error); } finally { setIsProcessing(false); }
    };
    const confirmAndSettleAll = () => {
        setConfirmModalState({ isOpen: true, title: 'Settle All Transactions', message: `Are you sure you want to settle all ${unsettledItems.length} items? This is irreversible.`, onConfirm: handleSettleAll });
    };
    
    const handleToggleApproval = async (tx) => { if (!isMasterAdmin || tx.type !== 'transaction') return; await updateDoc(doc(db, 'transactions', tx.id), { isApproved: !tx.isApproved }); };
    const handleToggleHidden = async (tx) => { if (!isMasterAdmin || tx.type !== 'transaction') return; await updateDoc(doc(db, 'transactions', tx.id), { isHidden: !tx.isHidden }); };
    
    const handleSaveSettings = async () => {
        if (!userData?.uid) return;
        setIsProcessing(true);
        try {
            await setDoc(doc(db, 'adminSettings', userData.uid), { 
                planShares: myPlanShares, 
                charges: Number(charges) || 0,
                firebaseCharges: Number(firebaseCharges) || 0
            }, { merge: true });

            if (isMasterAdmin) {
                const startDate = masterConfig.automationStartDate ? new Date(masterConfig.automationStartDate) : null;
                const endDate = masterConfig.automationEndDate ? new Date(masterConfig.automationEndDate) : null;

                const configToSave = {
                    ...masterConfig,
                    automationStartDate: startDate && !isNaN(startDate) ? Timestamp.fromDate(startDate) : null,
                    automationEndDate: endDate && !isNaN(endDate) ? Timestamp.fromDate(endDate) : null,
                };
                
                await setDoc(doc(db, 'adminSettings', 'masterConfig'), configToSave, { merge: true });
                alert("Master settings saved. Backend functions will now use the new automation rules for new transactions.");
            }
            setIsSettingsModalOpen(false);
        } catch (error) { 
            console.error("Error saving settings:", error); 
        } finally { 
            setIsProcessing(false); 
        }
    };
    
    const financialSummary = useMemo(() => {
    const totalUnsettledGross = unsettledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalSettled = settledItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const todayStr = new Date().toLocaleDateString('en-CA');
    const salesToday = allItems.filter(item => safeToDate(item.createdAt)?.toLocaleDateString('en-CA') === todayStr).reduce((acc, curr) => acc + (curr.amount || 0), 0);
    
    const netAfterPlatformCharges = totalUnsettledGross * (1 - (charges / 100));
    const totalUnsettledNet = netAfterPlatformCharges - (Number(firebaseCharges) || 0);

    // --- CORRECTED SHARE CALCULATION ---
    const totalUnsettledShares = unsettledItems.reduce((acc, item) => {
        // 1. Calculate revenue after the percentage platform charge
        const netAfterPercentageCharge = (item.amount || 0) * (1 - (charges / 100));

        // 2. Calculate this item's proportional share of the flat Firebase charge
        const proportionalFirebaseCharge = (totalUnsettledGross > 0)
            ? ((item.amount || 0) / totalUnsettledGross) * (Number(firebaseCharges) || 0)
            : 0;

        // 3. Determine the final "shareable" amount for this item by deducting its portion of fixed costs
        const shareableAmount = netAfterPercentageCharge - proportionalFirebaseCharge;

        // 4. Get the partner's share percentage for this item's plan
        const plan = allPlans.find(p => p.name === item.planName);
        const sharePercentage = (plan && myPlanShares[plan.id]) ? myPlanShares[plan.id] : 0;

        // 5. Calculate the final share for this item from the true net amount
        return acc + (shareableAmount * (sharePercentage / 100));
    }, 0);
    
    return { totalUnsettledNet, totalSettled, totalSales: totalUnsettledGross + totalSettled, salesToday, totalUnsettledShares };
}, [unsettledItems, settledItems, allItems, charges, firebaseCharges, myPlanShares, allPlans]);
    
    const analyticsSummary = useMemo(() => {
        const dateLimit = new Date(); dateLimit.setDate(dateLimit.getDate() - timeRange);
        const filteredItems = allItems.filter(item => safeToDate(item.createdAt) >= dateLimit);
        const planBreakdown = filteredItems.reduce((acc, item) => { const planName = item.planName || 'Unknown'; acc[planName] = (acc[planName] || 0) + (item.amount || 0); return acc; }, {});
        const dailySales = Array.from({ length: timeRange }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return { date: d.toLocaleDateString('en-CA'), revenue: 0 }; }).reverse();
        filteredItems.forEach(item => { const dateStr = safeToDate(item.createdAt)?.toLocaleDateString('en-CA'); const day = dailySales.find(d => d.date === dateStr); if (day) day.revenue += (item.amount || 0); });
        return { planData: Object.entries(planBreakdown).map(([name, revenue], i) => ({ name, revenue, fill: PIE_COLORS[i % PIE_COLORS.length] })).sort((a,b) => b.revenue - a.revenue), trendData: dailySales.map(d => ({ name: new Date(d.date).toLocaleDateString('en-GB', {day:'2-digit', month:'short'}), revenue: d.revenue })) };
    }, [allItems, timeRange]);

    const sortedAndFilteredItems = useMemo(() => {
        const sourceItems = activeTab === 'unsettled' ? unsettledItems : settledItems;
        const filtered = sourceItems.filter(item => (item.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (item.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (item.planName?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
        return filtered.sort((a, b) => { let aValue = a[sortConfig.key]; let bValue = b[sortConfig.key]; if (sortConfig.key.includes('At')) { aValue = safeToDate(aValue)?.getTime() || 0; bValue = safeToDate(bValue)?.getTime() || 0; } if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1; if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1; return 0; });
    }, [activeTab, unsettledItems, settledItems, searchTerm, sortConfig]);

    const paginatedItems = sortedAndFilteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        const exportToCSV = () => {
        const headers = activeTab === 'unsettled' ? 'User,Plan,Amount,Purchased On,Type' : 'User,Plan,Amount,Transaction Date,Settled On,Settled By,Type';
        const rows = sortedAndFilteredItems.map(tx => {
            const rowData = activeTab === 'unsettled'
                ? [tx.userName, tx.planName, (tx.amount||0).toFixed(2), formatTimestamp(tx.createdAt), tx.type]
                : [tx.userName, tx.planName, (tx.amount||0).toFixed(2), formatTimestamp(tx.createdAt), formatTimestamp(tx.settledAt), tx.settledBy, tx.type];
            return rowData.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
        });
        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `earnings_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
        
    return (
        <div className="earnings-page bg-slate-900 text-white min-h-screen p-4 md:p-8">
            <div className="max-w-8xl mx-auto">
                <h1 className="text-3xl font-bold text-white mb-6">Earnings Dashboard</h1>
                {isProcessing && <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]"><div className="flex items-center bg-slate-800 p-8 rounded-lg"><Spinner /><p className="ml-4">Processing...</p></div></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                    <StatCard title="Total Sales" value={financialSummary.totalSales} icon={<FaRupeeSign className="h-5 w-5 text-emerald-400"/>}/>
                    <StatCard title="Net Unsettled" value={financialSummary.totalUnsettledNet} icon={<FaClock className="h-5 w-5 text-yellow-400"/>}/>
                    <StatCard title="My Unsettled Share" value={financialSummary.totalUnsettledShares} icon={<FaHandHoldingUsd className="h-5 w-5 text-violet-400"/>}/>
                    <StatCard title="Total Settled" value={financialSummary.totalSettled} icon={<FaHistory className="h-5 w-5 text-blue-400"/>}/>
                    <StatCard title="Sales Today" value={financialSummary.salesToday} icon={<FaSun className="h-5 w-5 text-orange-400"/>} />
                </div>
                <AnalyticsSection analyticsSummary={analyticsSummary} timeRange={timeRange} setTimeRange={setTimeRange} />
                <div className="bg-slate-800/50 rounded-xl border border-slate-700/80">
                    <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center space-x-2 self-start w-full sm:w-auto">
                            <button onClick={() => setActiveTab('unsettled')} className={`tab-btn flex-1 sm:flex-none ${activeTab === 'unsettled' && 'active'}`}>Unsettled ({unsettledItems.length})</button>
                            <button onClick={() => setActiveTab('settled')} className={`tab-btn flex-1 sm:flex-none ${activeTab === 'settled' && 'active'}`}>History ({settledItems.length})</button>
                        </div>
                        <div className="flex items-center w-full sm:w-auto space-x-2 sm:space-x-4">
                             <div className="relative flex-grow"><FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="search-input w-full"/></div>
                            <button onClick={exportToCSV} aria-label="Export to CSV" className="action-btn-secondary"><FaFileCsv className="h-5 w-5 sm:mr-2"/><span className="hidden sm:inline">Export</span></button>
                            {activeTab === 'unsettled' && unsettledItems.length > 0 && (<button onClick={confirmAndSettleAll} disabled={isProcessing} className="action-btn-primary">{isProcessing ? <Spinner/> : <><FaCheckDouble className="h-5 w-5 sm:mr-2"/><span className="hidden sm:inline">Settle All</span></>}</button>)}
                            <button onClick={() => setIsSettingsModalOpen(true)} aria-label="Open Settings" className="p-2.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-700 transition-colors"><FaCog className="h-5 w-5"/></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        {loading ? <TableSkeletonLoader /> : (sortedAndFilteredItems.length > 0 ? (
                            <table className="w-full text-left">
                                <thead className="border-b-2 border-slate-700">
                                    <tr>
                                        <th className="th">User</th><th className="th">Amount</th><th className="th">Txn Date</th>
                                        {activeTab === 'settled' && <th className="th">Settlement</th>}
                                        <th className="th">Type</th>
                                        {isMasterAdmin && <th className="th">Status</th>}
                                        {(isMasterAdmin || activeTab === 'unsettled') && <th className="th text-center">Action</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.map(tx => (<TransactionRow key={tx.id + tx.type} tx={tx} isMasterAdmin={isMasterAdmin} activeTab={activeTab} onSettle={handleSettleItem} onToggleApproval={handleToggleApproval} onToggleHidden={handleToggleHidden} />))}
                                </tbody>
                            </table>
                        ) : <EmptyState message={`No ${activeTab} items found.`} />)}
                    </div>
                    <Pagination currentPage={currentPage} totalItems={sortedAndFilteredItems.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage}/>
                </div>
            </div>
            <style>{`
                .earnings-page .th { padding: 0.75rem 1.5rem; font-size: 0.75rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
                .earnings-page .td { padding: 1rem 1.5rem; font-size: 0.875rem; color: #cbd5e1; white-space: nowrap; vertical-align: middle; }
                .earnings-page .transaction-row { border-bottom: 1px solid #1e293b; transition: background-color 0.2s; }
                .earnings-page .transaction-row:hover { background-color: #33415520; }
                .earnings-page .pill, .earnings-page .status-pill { display: inline-flex; align-items: center; padding: 0.25rem 0.75rem; font-size: 0.75rem; font-weight: 600; border-radius: 9999px; border: 1px solid transparent; }
                .earnings-page .pill-auto { background-color: rgba(139, 92, 246, 0.15); color: #c4b5fd; border-color: rgba(139, 92, 246, 0.3); }
                .earnings-page .pill-manual { background-color: rgba(100, 116, 139, 0.2); color: #94a3b8; border-color: rgba(100, 116, 139, 0.4); }
                .earnings-page .status-approved { background-color: rgba(16, 185, 129, 0.15); color: #6ee7b7; border-color: rgba(16, 185, 129, 0.3); }
                .earnings-page .status-pending { background-color: rgba(245, 158, 11, 0.15); color: #fcd34d; border-color: rgba(245, 158, 11, 0.3); }
                .earnings-page .status-hidden { background-color: rgba(239, 68, 68, 0.15); color: #fca5a5; border-color: rgba(239, 68, 68, 0.3); }
                .earnings-page .tab-btn { justify-content: center; padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 500; border-radius: 0.375rem; color: #94a3b8; transition: all 0.2s ease; }
                .earnings-page .tab-btn.active { color: #ffffff; background-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
                .earnings-page .search-input { background-color: #1e293b; border: 1px solid #334155; border-radius: 0.375rem; padding: 0.625rem 0.75rem 0.625rem 2.25rem; font-size: 0.875rem; color: #f1f5f9; }
                .earnings-page .action-btn-primary, .earnings-page .action-btn-secondary { display: flex; align-items: center; justify-content: center; padding: 0.625rem 1rem; border-radius: 0.375rem; font-weight: 600; font-size: 0.875rem; transition: background-color 0.2s; white-space: nowrap; }
                .earnings-page .action-btn-primary { background-color: #2563eb; color: white; }
                .earnings-page .action-btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
                .earnings-page .action-btn-primary:disabled { background-color: #1e40af; cursor: not-allowed; }
                .earnings-page .action-btn-secondary { background-color: #334155; color: #cbd5e1; }
                .earnings-page .action-btn-secondary:hover { background-color: #475569; }
                .earnings-page .action-icon-btn { width: 2rem; height: 2rem; display: inline-flex; align-items: center; justify-content: center; border-radius: 9999px; transition: background-color 0.2s; }
                .earnings-page .settle-btn-icon { display: inline-flex; align-items: center; justify-content: center; background-color: #166534; color: white; padding: 0.375rem 1rem; border-radius: 0.375rem; font-weight: 600; font-size: 0.8125rem; transition: background-color 0.2s; white-space: nowrap; }
                .earnings-page .settle-btn-icon:hover { background-color: #15803d; }
                .earnings-page .switch-btn { position: relative; display: inline-flex; height: 1.5rem; width: 2.75rem; flex-shrink: 0; cursor: pointer; border-radius: 9999px; transition: background-color 0.2s ease-in-out; align-items: center; }
                .earnings-page .switch-thumb { pointer-events: none; display: inline-block; height: 1.25rem; width: 1.25rem; border-radius: 9999px; background-color: white; transition: transform 0.2s ease-in-out; transform: translateX(0.125rem); }
                .earnings-page .switch-btn[aria-checked="true"] .switch-thumb { transform: translateX(1.375rem); }
                .earnings-page .pagination-btn { display: flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border-radius: 0.375rem; background-color: #334155; color: #cbd5e1; }
            `}</style>
            <ConfirmationModal isOpen={confirmModalState.isOpen} setIsOpen={(val) => setConfirmModalState(s => ({...s, isOpen: val}))} title={confirmModalState.title} message={confirmModalState.message} onConfirm={confirmModalState.onConfirm} />
            <SettingsModal isOpen={isSettingsModalOpen} setIsOpen={setIsSettingsModalOpen} plansToShow={allPlans} myPlanShares={myPlanShares} setMyPlanShares={setMyPlanShares} charges={charges} setCharges={setCharges} firebaseCharges={firebaseCharges} setFirebaseCharges={setFirebaseCharges} onSave={handleSaveSettings} isMasterAdmin={isMasterAdmin} masterConfig={masterConfig} setMasterConfig={setMasterConfig} />
        </div>
    );
}