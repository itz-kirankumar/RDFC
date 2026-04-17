import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp, addDoc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Switch } from '@headlessui/react';
import { 
    ArrowLeftIcon, 
    PlusIcon, 
    PencilSquareIcon, 
    TrashIcon, 
    LinkIcon, 
    TagIcon, 
    DocumentPlusIcon, 
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';

const RDFCArticlesPage = ({ navigate }) => {
    // --- State Management ---
    const [materials, setMaterials] = useState([]);
    const [tests, setTests] = useState([]);
    const [managedTabs, setManagedTabs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [currentMaterialId, setCurrentMaterialId] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [selectedTab, setSelectedTab] = useState('');
    const [selectedSubTab, setSelectedSubTab] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [isLinkToTest, setIsLinkToTest] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // UI state
    const [filterTab, setFilterTab] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 8;

    // --- Data Fetching Effect ---
    useEffect(() => {
        setLoading(true);
        
        const fetchStaticData = async () => {
            const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
            const testsSnapshot = await getDocs(testsQuery);
            setTests(testsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

            const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
            const tabsSnapshot = await getDocs(tabsQuery);
            const tabsData = tabsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setManagedTabs(tabsData);
            if (tabsData.length > 0 && !selectedTab) {
                setSelectedTab(tabsData[0].name);
            }
        };

        const materialsQuery = query(collection(db, 'materials'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(materialsQuery, (snapshot) => {
            setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        fetchStaticData();
        
        return () => unsubscribe();
    }, []);

    // --- Form and Action Handlers ---
    const resetForm = () => {
        setCurrentMaterialId(null);
        setName('');
        setDescription('');
        setUrl('');
        setSelectedSubTab('');
        setIsFree(false);
        setIsLinkToTest(false);
        setSelectedTestId('');
        if (managedTabs.length > 0) {
            setSelectedTab(managedTabs[0].name);
        }
    };

    const handleEditClick = (material) => {
        setCurrentMaterialId(material.id);
        setName(material.name);
        setDescription(material.description);
        setUrl(material.url);
        setSelectedTab(material.mainType);
        setSelectedSubTab(material.subType || '');
        setIsFree(material.isFree || false);
        setIsLinkToTest(!!material.linkedTestId);
        setSelectedTestId(material.linkedTestId || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !url || !description || !selectedTab) return alert("Please fill in all required fields.");
        if (isLinkToTest && !selectedTestId) return alert("Please select a test to link.");
        
        setIsSubmitting(true);
        const materialData = { name, description, url, mainType: selectedTab, subType: selectedSubTab || null, linkedTestId: isLinkToTest ? selectedTestId : null, isFree };
        const materialDataWithPublished = { ...materialData, isPublished: true };

        try {
            if (currentMaterialId) {
                await updateDoc(doc(db, 'materials', currentMaterialId), { ...materialDataWithPublished, updatedAt: serverTimestamp() });
                alert('Material updated successfully!');
            } else {
                await addDoc(collection(db, 'materials'), { ...materialDataWithPublished, createdAt: serverTimestamp() });
                alert('Material created successfully!');
            }
            resetForm();
        } catch (error) {
            console.error("Error saving material:", error);
            alert("Failed to save material.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (materialId) => {
        if (window.confirm("Are you sure you want to permanently delete this material?")) {
            try {
                await deleteDoc(doc(db, 'materials', materialId));
                alert("Material deleted successfully.");
            } catch (error) {
                console.error("Error deleting material:", error);
            }
        }
    };

    const handleTogglePublish = async (material) => {
        await updateDoc(doc(db, 'materials', material.id), { isPublished: !material.isPublished });
    };

    // --- Memoized Data for Display ---
    const filteredMaterials = useMemo(() => {
        const testsMap = new Map(tests.map(t => [t.id, t.title]));
        let items = materials.map(mat => ({ ...mat, testTitle: testsMap.get(mat.linkedTestId) || 'Standalone' }));
        if (filterTab !== 'All') {
            items = items.filter(mat => mat.mainType === filterTab);
        }
        return items;
    }, [materials, tests, filterTab]);
    
    const paginatedMaterials = useMemo(() => {
        return filteredMaterials.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredMaterials, currentPage]);

    const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
    const availableSubTabs = useMemo(() => managedTabs.find(t => t.name === selectedTab)?.subTabs || [], [selectedTab, managedTabs]);

    const availableTestsForLinking = useMemo(() => {
        if (!isLinkToTest || !selectedTab) return [];

        // Create a set of test IDs already linked to a material (excluding the current one being edited)
        const linkedTestIds = new Set(
            materials
                .filter(material => material.id !== currentMaterialId && material.linkedTestId)
                .map(material => material.linkedTestId)
        );

        // Filter tests that match the selected category and are not already linked.
        // The tests are already sorted by latest from the initial Firestore query.
        return tests.filter(test => {
            const isCorrectCategory = test.mainType === selectedTab;
            const isNotLinked = !linkedTestIds.has(test.id);
            return isCorrectCategory && isNotLinked;
        });
    }, [tests, materials, selectedTab, isLinkToTest, currentMaterialId]);


    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-400">Loading...</div>;

    // --- JSX Render ---
    return (
        <div className="bg-gray-900 min-h-screen text-gray-300">
            <div className="max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
                <header className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Manage Materials</h1>
                    <button onClick={() => navigate('home')} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gray-700/80 text-gray-200 rounded-lg hover:bg-gray-700 transition-colors">
                        <ArrowLeftIcon className="h-4 w-4" /> <span>Dashboard</span>
                    </button>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
                    {/* --- FINAL FIXED FORM SECTION --- */}
                    <aside className="lg:col-span-4 mb-8 lg:mb-0">
                        <div className="sticky top-8 bg-gray-800 border border-gray-700 rounded-xl shadow-lg">
                             <div className="flex items-center space-x-3 p-6 border-b border-gray-700">
                                {currentMaterialId ? <PencilSquareIcon className="h-6 w-6 text-indigo-400" /> : <PlusIcon className="h-6 w-6 text-indigo-400" />}
                                <h2 className="text-xl font-bold text-white">{currentMaterialId ? 'Edit Material' : 'Add New Material'}</h2>
                             </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <fieldset className="space-y-4">
                                     <legend className="sr-only">Core Details</legend>
                                     <div>
                                        <label htmlFor="material-name" className="block mb-1.5 text-sm font-medium text-gray-300">Material Name</label>
                                        <input id="material-name" type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors" required />
                                     </div>
                                     <div>
                                        <label htmlFor="material-desc" className="block mb-1.5 text-sm font-medium text-gray-300">Description</label>
                                        <textarea id="material-desc" value={description} onChange={e => setDescription(e.target.value)} rows="4" className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors" required />
                                     </div>
                                     <div>
                                        <label htmlFor="material-url" className="block mb-1.5 text-sm font-medium text-gray-300">Content URL</label>
                                        <input id="material-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="e.g., https://docs.google.com/..." className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors" required />
                                     </div>
                                </fieldset>

                                <fieldset>
                                    <label htmlFor="main-category" className="block mb-1.5 text-sm font-medium text-gray-300">Categorization</label>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         <select id="main-category" value={selectedTab} onChange={e => { setSelectedTab(e.target.value); setSelectedSubTab(''); }} className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors">
                                             {managedTabs.map(tab => <option key={tab.id} value={tab.name}>{tab.name}</option>)}
                                         </select>
                                         <select value={selectedSubTab} onChange={e => setSelectedSubTab(e.target.value)} className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors" disabled={availableSubTabs.length === 0} aria-label="Sub-category">
                                             <option value="">{availableSubTabs.length === 0 ? 'No Sub-categories' : 'Sub-category'}</option>
                                             {availableSubTabs.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
                                         </select>
                                     </div>
                                </fieldset>
                                
                                <fieldset>
                                    <label className="block mb-2 text-sm font-medium text-gray-300">Settings</label>
                                    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                        <Switch.Group as="div" className="flex items-center justify-between">
                                            <Switch.Label as="span" className="text-sm font-medium text-gray-200 mr-4 flex-grow">Free for all users?</Switch.Label>
                                            <Switch
                                                checked={isFree}
                                                onChange={setIsFree}
                                                className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
                                            >
                                                <span className="sr-only">Free for all users toggle</span>
                                                <span aria-hidden="true" className={`${isFree ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`} />
                                            </Switch>
                                        </Switch.Group>
                                        <Switch.Group as="div" className="flex items-center justify-between">
                                            <Switch.Label as="span" className="text-sm font-medium text-gray-200 mr-4 flex-grow">Link to a test?</Switch.Label>
                                            <Switch
                                                checked={isLinkToTest}
                                                onChange={setIsLinkToTest}
                                                className={`${isLinkToTest ? 'bg-indigo-500' : 'bg-gray-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
                                            >
                                                <span className="sr-only">Link to a test toggle</span>
                                                <span aria-hidden="true" className={`${isLinkToTest ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`} />
                                            </Switch>
                                        </Switch.Group>
                                    </div>
                                </fieldset>
                                
                                {isLinkToTest && (
                                    <div>
                                        <label htmlFor="link-test" className="block mb-1.5 text-sm font-medium text-gray-300">Select Test to Link</label>
                                        <select id="link-test" value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-colors">
                                            <option value="">-- Please select a test --</option>
                                            {availableTestsForLinking.length > 0 ? (
                                                availableTestsForLinking.map(test => <option key={test.id} value={test.id}>{test.title}</option>)
                                            ) : (
                                                <option disabled>No unlinked tests in this category.</option>
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
                                    {currentMaterialId && <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold bg-gray-600/80 text-gray-200 rounded-lg hover:bg-gray-600">Cancel</button>}
                                    <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 shadow-md transition-all disabled:bg-gray-500 disabled:cursor-wait">
                                        {isSubmitting ? 'Saving...' : (currentMaterialId ? 'Update Material' : 'Create Material')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </aside>
                    
                    {/* --- LIST SECTION --- */}
                    <section className="lg:col-span-8">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="border-b border-gray-700 mb-4">
                                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                                    <button onClick={() => { setFilterTab('All'); setCurrentPage(1); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${filterTab === 'All' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'}`}>All</button>
                                    {managedTabs.map(tab => <button key={tab.id} onClick={() => { setFilterTab(tab.name); setCurrentPage(1); }} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${filterTab === tab.name ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500'}`}>{tab.name}</button>)}
                                </nav>
                            </div>
                            <div className="overflow-x-auto">
                               {paginatedMaterials.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead><tr>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Material</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Category</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Status</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Published</th><th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-300">Linked To</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {paginatedMaterials.map(mat => (
                                                <tr key={mat.id} className="hover:bg-gray-800/40 transition-colors">
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-white font-medium">{mat.name}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400"><div className="flex items-center space-x-2"><TagIcon className="h-4 w-4 text-gray-500"/><span>{mat.subType ? `${mat.mainType} / ${mat.subType}` : mat.mainType}</span></div></td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400">{mat.isFree ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300">Free</span> : <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300">Paid</span>}</td>
                                                    <td className="whitespace-nowrap px-3 py-4 whitespace-nowrap"><Switch checked={!!mat.isPublished} onChange={() => handleTogglePublish(mat)} className={`${mat.isPublished ? 'bg-green-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11`}><span className={`${mat.isPublished ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`}/></Switch></td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-400"><div className="flex items-center space-x-2">{mat.linkedTestId ? <><LinkIcon className="h-4 w-4 text-indigo-400"/><span>{mat.testTitle}</span></> : <span className="text-gray-500">Standalone</span>}</div></td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right space-x-4">
                                                        <button onClick={() => handleEditClick(mat)} className="font-medium text-indigo-400 hover:text-indigo-300">Edit</button>
                                                        <button onClick={() => handleDelete(mat.id)} className="font-medium text-red-500 hover:text-red-400">Delete</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center py-16 text-gray-500 flex flex-col items-center"><DocumentPlusIcon className="h-16 w-16 mb-4 text-gray-600" /><p className="font-semibold text-lg text-gray-400">No materials found</p><p className="text-sm mt-1">Create one using the form to get started.</p></div>
                                )}
                            </div>
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between text-sm text-gray-400 px-4 py-3 border-t border-gray-700 mt-4">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700/60 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeftIcon className="h-4 w-4" /> Previous</button>
                                    <span>Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700/60 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next <ChevronRightIcon className="h-4 w-4" /></button>
                                </div>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default RDFCArticlesPage;