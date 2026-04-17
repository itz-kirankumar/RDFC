import React, { useState, useEffect, Fragment, useMemo } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch, Dialog, Transition } from '@headlessui/react';
import { FaPlus, FaFilter } from 'react-icons/fa';

const formatTimestamp = (timestamp) => {
    if (!timestamp) return <span className="text-gray-500">Immediately</span>;
    const date = timestamp.toDate();
    if (date <= new Date()) return <span className="text-green-400 font-semibold">Live</span>;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

const ScheduleModal = ({ isOpen, setIsOpen, test, onSave }) => {
    const [scheduleOption, setScheduleOption] = useState('immediately');
    const [scheduledDate, setScheduledDate] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    useEffect(() => {
        if (test?.liveAt) {
            const liveDate = test.liveAt.toDate();
            setScheduleOption(liveDate > new Date() ? 'later' : 'immediately');
            setScheduledDate(liveDate.toISOString().split('T')[0]);
            setScheduledTime(liveDate.toTimeString().substring(0, 5));
        } else {
            setScheduleOption('immediately');
        }
    }, [test]);

    const handleSave = () => {
        const liveAt = scheduleOption === 'later' && scheduledDate && scheduledTime
            ? Timestamp.fromDate(new Date(`${scheduledDate}T${scheduledTime}`))
            : null;
        onSave(test.id, liveAt);
        setIsOpen(false);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/30" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Schedule Test: {test?.title}</Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <div><label className="flex items-center space-x-2"><input type="radio" value="immediately" checked={scheduleOption === 'immediately'} onChange={(e) => setScheduleOption(e.target.value)} className="form-radio bg-gray-700 border-gray-600" /><span>Make Live Immediately</span></label></div>
                            <div>
                                <label className="flex items-center space-x-2"><input type="radio" value="later" checked={scheduleOption === 'later'} onChange={(e) => setScheduleOption(e.target.value)} className="form-radio bg-gray-700 border-gray-600"/><span>Schedule for Later</span></label>
                                {scheduleOption === 'later' && (<div className="mt-2 pl-6 flex gap-2"><input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full rounded-md bg-gray-700 border-gray-600 text-white" /><input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className="w-full rounded-md bg-gray-700 border-gray-600 text-white" /></div>)}
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm font-medium text-white" onClick={handleSave}>Save Schedule</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

const AdminTestManager = ({ navigate }) => {
    const [tests, setTests] = useState([]);
    const [managedTabs, setManagedTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [filter, setFilter] = useState('All');
    const [freeFilter, setFreeFilter] = useState('All');        // ← NEW: Free/Paid filter
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedTest, setSelectedTest] = useState(null);

    useEffect(() => {
        const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
        const unsubscribeTabs = onSnapshot(tabsQuery, (snapshot) => setManagedTabs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

        const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
        const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
            setTests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => { unsubscribeTabs(); unsubscribeTests(); };
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm("Permanently delete this test?")) {
            await deleteDoc(doc(db, 'tests', id));
        }
    };

    const handleTogglePublish = async (test) => {
        await updateDoc(doc(db, 'tests', test.id), { isPublished: !test.isPublished });
    };

    const handleToggleShowOnLogin = async (test) => {
        await updateDoc(doc(db, 'tests', test.id), { 
            showOnLogin: !(test.showOnLogin !== false)
        });
    };

    // ==================== MASTER BULK CONTROLS ====================
    const handleBulkPublish = async (value) => {
        if (!window.confirm(`⚠️ This will ${value ? 'PUBLISH' : 'UNPUBLISH'} ALL tests.\n\nAre you sure?`)) return;
        setBulkLoading(true);
        try {
            const promises = tests.map(test => updateDoc(doc(db, 'tests', test.id), { isPublished: value }));
            await Promise.all(promises);
            alert(`✅ All tests have been ${value ? 'published' : 'unpublished'}!`);
        } catch (err) {
            alert("❌ Bulk update failed.");
        } finally { setBulkLoading(false); }
    };

    const handleBulkShowOnLogin = async (value) => {
        if (!window.confirm(`⚠️ This will ${value ? 'SHOW' : 'HIDE'} ALL tests on Login Page.\n\nAre you sure?`)) return;
        setBulkLoading(true);
        try {
            const promises = tests.map(test => updateDoc(doc(db, 'tests', test.id), { showOnLogin: value }));
            await Promise.all(promises);
            alert(`✅ All tests updated for Login Page!`);
        } catch (err) {
            alert("❌ Bulk update failed.");
        } finally { setBulkLoading(false); }
    };

    const handleBulkFree = async (value) => {
        if (!window.confirm(`⚠️ This will make ALL tests ${value ? 'FREE' : 'PAID'}.\n\nAre you 100% sure?`)) return;
        setBulkLoading(true);
        try {
            const promises = tests.map(test => updateDoc(doc(db, 'tests', test.id), { isFree: value }));
            await Promise.all(promises);
            alert(`✅ All tests are now ${value ? 'FREE' : 'PAID'}!`);
        } catch (err) {
            alert("❌ Bulk update failed.");
        } finally { setBulkLoading(false); }
    };

    const handleOpenScheduleModal = (test) => {
        setSelectedTest(test);
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (testId, liveAt) => {
        await updateDoc(doc(db, 'tests', testId), { liveAt });
    };

    const getTestCategory = (test) => {
        if (test.mainType) {
            return `${test.mainType}${test.subType ? ` / ${test.subType}` : ''}`;
        }
        return 'Uncategorized';
    };

    // ==================== FILTERED TESTS (Type + Free Status) ====================
    const filteredTests = useMemo(() => {
        let items = tests;

        // Type filter
        if (filter !== 'All') {
            const [mainFilter, subFilter] = filter.split('/');
            items = items.filter(test => {
                if (!test.mainType) return false;
                return subFilter 
                    ? test.mainType === mainFilter && test.subType === subFilter 
                    : test.mainType === mainFilter;
            });
        }

        // Free/Paid filter
        if (freeFilter === 'Free') {
            items = items.filter(test => test.isFree === true);
        } else if (freeFilter === 'Paid') {
            items = items.filter(test => test.isFree !== true);
        }

        return items;
    }, [filter, freeFilter, tests]);

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-0">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-white">Test Manager</h1>
                <button onClick={() => navigate('createTest')} className="bg-white text-gray-900 px-4 py-2 rounded-md font-semibold hover:bg-gray-200 shadow flex items-center space-x-2 text-sm md:text-base">
                    <FaPlus /> <span>Create New Test</span>
                </button>
            </div>

            {/* MASTER CONTROLS */}
            <div className="mb-6 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 mb-3">
                    <span>MASTER CONTROLS</span>
                    <div className="flex-1 h-px bg-gray-700"></div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => handleBulkPublish(true)} disabled={bulkLoading} className="px-5 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">✅ Publish All</button>
                    <button onClick={() => handleBulkPublish(false)} disabled={bulkLoading} className="px-5 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">❌ Unpublish All</button>
                    <button onClick={() => handleBulkShowOnLogin(true)} disabled={bulkLoading} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">👁️ Show All on Login</button>
                    <button onClick={() => handleBulkShowOnLogin(false)} disabled={bulkLoading} className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">🙈 Hide All from Login</button>
                    <button onClick={() => handleBulkFree(true)} disabled={bulkLoading} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">🆓 Make All Free</button>
                    <button onClick={() => handleBulkFree(false)} disabled={bulkLoading} className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors">💰 Make All Paid</button>
                </div>
                {bulkLoading && <p className="text-xs text-gray-400 mt-3">Processing bulk update… Please wait.</p>}
            </div>

            {/* FILTERS */}
            <div className="flex items-center gap-4 mb-4">
                <FaFilter className="text-gray-400" />
                
                {/* Type Filter */}
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-gray-800 border-gray-700 text-white rounded-md shadow-sm">
                    <option value="All">All Types</option>
                    {managedTabs.map(tab => (
                        <Fragment key={tab.id}>
                            <option value={tab.name}>{tab.name}</option>
                            {tab.subTabs?.map(subTab => (
                                <option key={`${tab.id}-${subTab.name}`} value={`${tab.name}/${subTab.name}`}>&nbsp;&nbsp;↳ {subTab.name}</option>
                            ))}
                        </Fragment>
                    ))}
                </select>

                {/* NEW: Free/Paid Filter */}
                <select value={freeFilter} onChange={(e) => setFreeFilter(e.target.value)} className="bg-gray-800 border-gray-700 text-white rounded-md shadow-sm">
                    <option value="All">All Free Status</option>
                    <option value="Free">Free Only</option>
                    <option value="Paid">Paid Only</option>
                </select>
            </div>

            {/* TABLE */}
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Goes Live</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Published</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Login Page</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{test.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{getTestCategory(test)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatTimestamp(test.liveAt)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Switch checked={!!test.isPublished} onChange={() => handleTogglePublish(test)} className={`${test.isPublished ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}>
                                            <span className={`${test.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`}/>
                                        </Switch>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Switch checked={test.showOnLogin !== false} onChange={() => handleToggleShowOnLogin(test)} className={`${test.showOnLogin !== false ? 'bg-emerald-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}>
                                            <span className={`${test.showOnLogin !== false ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`}/>
                                        </Switch>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-4">
                                        <button onClick={() => handleOpenScheduleModal(test)} className="text-gray-300 hover:text-white">Schedule</button>
                                        <button onClick={() => navigate('createTest', { testToEdit: test })} className="text-gray-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(test.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredTests.length === 0 && !loading && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No tests found for the selected filters.</p>
                    </div>
                )}
            </div>

            {selectedTest && <ScheduleModal isOpen={isScheduleModalOpen} setIsOpen={setIsScheduleModalOpen} test={selectedTest} onSave={handleSaveSchedule} />}
        </div>
    );
};

export default AdminTestManager;