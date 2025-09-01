import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, query, orderBy, serverTimestamp, addDoc, updateDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore'; // Import writeBatch
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
    ArchiveBoxIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon // New Icon for migration
} from '@heroicons/react/24/outline';

// --- Suggested Improvement: Use a Toast Notification Library ---
// Replace window.alert() with a library like 'react-hot-toast' for better UX.
// Example: import { toast } from 'react-hot-toast';

const RDFCArticlesPage = ({ navigate }) => {
    // --- State Management ---
    const [materials, setMaterials] = useState([]);
    const [oldArticles, setOldArticles] = useState([]);
    const [tests, setTests] = useState([]);
    const [managedTabs, setManagedTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isMigrating, setIsMigrating] = useState(false); // New state for bulk migration

    // Form state
    const [currentMaterialId, setCurrentMaterialId] = useState(null);
    const [isEditingOld, setIsEditingOld] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');
    const [selectedTab, setSelectedTab] = useState('');
    const [selectedSubTab, setSelectedSubTab] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [isLinkToTest, setIsLinkToTest] = useState(false);
    const [selectedTestId, setSelectedTestId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // UI state for the list
    const [filterTab, setFilterTab] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // --- Data Fetching Effect ---
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            // Fetch static data first
            const testsQuery = query(collection(db, 'tests'), orderBy('createdAt', 'desc'));
            const testsSnapshot = await getDocs(testsQuery);
            const testsData = testsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTests(testsData);

            const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
            const tabsSnapshot = await getDocs(tabsQuery);
            const tabsData = tabsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setManagedTabs(tabsData);
            if (tabsData.length > 0 && !selectedTab) setSelectedTab(tabsData[0].name);
            
            // Set up real-time listeners
            const materialsQuery = query(collection(db, 'materials'), orderBy('createdAt', 'desc'));
            const unsubMaterials = onSnapshot(materialsQuery, (snapshot) => {
                setMaterials(snapshot.docs.map(d => ({ id: d.id, ...d.data(), source: 'new' })));
            });

            const oldArticlesQuery = query(collection(db, 'rdfcArticles'));
            const unsubOldArticles = onSnapshot(oldArticlesQuery, (snapshot) => {
                const oldData = snapshot.docs.map(d => {
                    const test = testsData.find(t => t.id === d.id);
                    return { ...d.data(), id: d.id, source: 'old', testTitle: test?.title || 'Unknown Test' };
                });
                setOldArticles(oldData);
            });
            
            setLoading(false);
            return { unsubMaterials, unsubOldArticles };
        };

        const unsubscribePromise = fetchData();
        return () => { 
            unsubscribePromise.then(unsubs => {
                if (unsubs.unsubMaterials) unsubs.unsubMaterials();
                if (unsubs.unsubOldArticles) unsubs.unsubOldArticles();
            }); 
        };
    }, []);

    // --- Form and Action Handlers ---
    const resetForm = () => {
        setCurrentMaterialId(null);
        setIsEditingOld(false);
        setName('');
        setDescription('');
        setUrl('');
        setSelectedSubTab('');
        setIsFree(false);
        setIsLinkToTest(false);
        setSelectedTestId('');
        if (managedTabs.length > 0) setSelectedTab(managedTabs[0].name);
    };

    const handleEditClick = (material) => {
        setIsEditingOld(material.source === 'old');
        setCurrentMaterialId(material.id);
        setName(material.name);
        setDescription(material.description);
        setUrl(material.url);
        setSelectedTab(material.mainType || (managedTabs.length > 0 ? managedTabs[0].name : ''));
        setSelectedSubTab(material.subType || '');
        setIsFree(material.isFree || false);
        setIsLinkToTest(!!material.linkedTestId);
        setSelectedTestId(material.linkedTestId || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !url || !description || !selectedTab) return alert("Please fill in Name, Description, URL, and select a Category.");
        if (isLinkToTest && !selectedTestId) return alert("Please select a test to link.");
        
        setIsSubmitting(true);
        const materialData = { name, description, url, mainType: selectedTab, subType: selectedSubTab || null, linkedTestId: isLinkToTest ? selectedTestId : null, isFree };

        try {
            if (isEditingOld) {
                // Migrating from old system to new: Create a new doc and delete the old one
                await addDoc(collection(db, 'materials'), { ...materialData, createdAt: serverTimestamp() });
                await deleteDoc(doc(db, 'rdfcArticles', currentMaterialId));
                alert('Legacy article successfully migrated to the new system!');
            } else if (currentMaterialId) {
                await updateDoc(doc(db, 'materials', currentMaterialId), { ...materialData, updatedAt: serverTimestamp() });
                alert('Material updated successfully!');
            } else {
                await addDoc(collection(db, 'materials'), { ...materialData, createdAt: serverTimestamp() });
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

    const handleDelete = async (material) => {
        const confirmMsg = material.source === 'old' 
            ? "Delete this LEGACY article link? This is permanent."
            : "Permanently delete this material?";
        
        if (window.confirm(confirmMsg)) {
            try {
                if (material.source === 'old') {
                    await deleteDoc(doc(db, 'rdfcArticles', material.id));
                } else {
                    await deleteDoc(doc(db, 'materials', material.id));
                }
                alert("Item deleted successfully.");
            } catch (error) {
                console.error("Error deleting item:", error);
                alert("Failed to delete item.");
            }
        }
    };

    // --- NEW: Bulk Migration Handler ---
    const handleMigrateAll = async () => {
        if (oldArticles.length === 0) {
            return alert("No legacy articles to migrate.");
        }

        const confirmMsg = `Are you sure you want to migrate all ${oldArticles.length} legacy articles to the new system? This action cannot be undone.`;
        if (window.confirm(confirmMsg)) {
            setIsMigrating(true);
            try {
                const batch = writeBatch(db);
                const defaultTab = managedTabs.length > 0 ? managedTabs[0].name : 'Uncategorized';

                oldArticles.forEach(article => {
                    const newMaterialData = {
                        name: article.name,
                        description: article.description,
                        url: article.url,
                        mainType: defaultTab,
                        subType: null,
                        linkedTestId: article.id,
                        isFree: false,
                        createdAt: serverTimestamp(),
                    };
                    const newMaterialRef = doc(collection(db, 'materials'));
                    batch.set(newMaterialRef, newMaterialData);

                    const oldArticleRef = doc(db, 'rdfcArticles', article.id);
                    batch.delete(oldArticleRef);
                });

                await batch.commit();
                alert(`Successfully migrated ${oldArticles.length} articles!`);
            } catch (error) {
                console.error("Error during bulk migration:", error);
                alert("An error occurred during migration. Please check the console.");
            } finally {
                setIsMigrating(false);
            }
        }
    };

    // --- Memoized Data for Display ---
    const allMaterials = useMemo(() => {
        const testsMap = new Map(tests.map(t => [t.id, t.title]));
        const newSystemMaterials = materials.map(mat => ({ ...mat, testTitle: mat.linkedTestId ? testsMap.get(mat.linkedTestId) : 'Standalone' }));
        const oldSystemArticles = oldArticles.map(article => ({ ...article, mainType: 'Legacy', subType: null, isFree: false, linkedTestId: article.id, testTitle: testsMap.get(article.id) || 'N/A' }));
        return [...newSystemMaterials, ...oldSystemArticles];
    }, [materials, oldArticles, tests]);

    const filteredMaterials = useMemo(() => {
        if (filterTab === 'All') return allMaterials;
        if (filterTab === 'Legacy') return allMaterials.filter(m => m.source === 'old');
        return allMaterials.filter(m => m.mainType === filterTab && m.source === 'new');
    }, [allMaterials, filterTab]);
    
    const paginatedMaterials = useMemo(() => {
        return filteredMaterials.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredMaterials, currentPage]);

    const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE);
    const availableSubTabs = useMemo(() => managedTabs.find(t => t.name === selectedTab)?.subTabs || [], [selectedTab, managedTabs]);

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-400">Loading Material Manager...</div>;

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
                    {/* --- FORM SECTION --- */}
                    <aside className="lg:col-span-4 mb-8 lg:mb-0">
                        <div className="sticky top-8 bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg">
                             <div className="flex items-center space-x-3 p-6 border-b border-gray-700">
                                {currentMaterialId ? <PencilSquareIcon className="h-6 w-6 text-blue-400" /> : <PlusIcon className="h-6 w-6 text-blue-400" />}
                                <h2 className="text-xl font-bold text-white">{isEditingOld ? 'Migrate Legacy Article' : (currentMaterialId ? 'Edit Material' : 'Add New Material')}</h2>
                             </div>
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Form content remains the same... */}
                                <fieldset className="space-y-4">
                                     <legend className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Core Details</legend>
                                     <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Material Name" className="form-input" required />
                                     <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" rows="4" className="form-input" required />
                                     <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="Content URL (e.g., Google Drive)" className="form-input" required />
                                </fieldset>

                                <fieldset className="space-y-4" disabled={isEditingOld}>
                                    <legend className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-2">Categorization</legend>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         <select value={selectedTab} onChange={e => { setSelectedTab(e.target.value); setSelectedSubTab(''); }} className="form-input">
                                             {managedTabs.map(tab => <option key={tab.id} value={tab.name}>{tab.name}</option>)}
                                         </select>
                                         <select value={selectedSubTab} onChange={e => setSelectedSubTab(e.target.value)} className="form-input" disabled={availableSubTabs.length === 0}>
                                             <option value="">{availableSubTabs.length === 0 ? 'No Sub-categories' : 'Sub-category (Optional)'}</option>
                                             {availableSubTabs.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
                                         </select>
                                     </div>
                                </fieldset>
                                
                                <fieldset>
                                    <legend className="text-xs font-semibold uppercase text-gray-400 tracking-wider mb-3">Settings</legend>
                                    <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg">
                                        <Switch.Group as="div" className="flex items-center justify-between">
                                            <Switch.Label className="text-sm font-medium text-gray-200">Free for all users?</Switch.Label>
                                            <Switch checked={isFree} onChange={setIsFree} disabled={isEditingOld} className={`${isFree ? 'bg-green-500' : 'bg-gray-600'} switch-base`}><span className={`${isFree ? 'translate-x-5' : 'translate-x-0'} switch-handle`}/></Switch>
                                        </Switch.Group>
                                        <Switch.Group as="div" className="flex items-center justify-between">
                                            <Switch.Label className="text-sm font-medium text-gray-200">Link to a test?</Switch.Label>
                                            <Switch checked={isLinkToTest} onChange={setIsLinkToTest} disabled={isEditingOld} className={`${isLinkToTest ? 'bg-blue-500' : 'bg-gray-600'} switch-base`}><span className={`${isLinkToTest ? 'translate-x-5' : 'translate-x-0'} switch-handle`}/></Switch>
                                        </Switch.Group>
                                    </div>
                                </fieldset>
                                
                                {isLinkToTest && !isEditingOld && (
                                    <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="form-input">
                                        <option value="">-- Select a test to link --</option>
                                        {tests.map(test => <option key={test.id} value={test.id}>{test.title}</option>)}
                                    </select>
                                )}

                                <div className="flex items-center justify-end space-x-3 pt-4">
                                    {currentMaterialId && <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold bg-gray-600/80 text-gray-200 rounded-lg hover:bg-gray-600">Cancel</button>}
                                    <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-md transition-all disabled:bg-gray-500 disabled:cursor-wait">
                                        {isSubmitting ? 'Saving...' : (isEditingOld ? 'Migrate & Save' : (currentMaterialId ? 'Update Material' : 'Create Material'))}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </aside>
                    
                    {/* --- LIST SECTION --- */}
                    <section className="lg:col-span-8">
                        <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-4 sm:p-6">
                            <div className="border-b border-gray-700 mb-4">
                                {/* --- UPDATED: Tab bar with Migrate All button --- */}
                                <nav className="-mb-px flex items-center space-x-6 overflow-x-auto" aria-label="Tabs">
                                    <button onClick={() => { setFilterTab('All'); setCurrentPage(1); }} className={`filter-tab ${filterTab === 'All' ? 'active' : ''}`}>All</button>
                                    {managedTabs.map(tab => <button key={tab.id} onClick={() => { setFilterTab(tab.name); setCurrentPage(1); }} className={`filter-tab ${filterTab === tab.name ? 'active' : ''}`}>{tab.name}</button>)}
                                    <button onClick={() => { setFilterTab('Legacy'); setCurrentPage(1); }} className={`filter-tab ${filterTab === 'Legacy' ? 'active' : ''}`}><ArchiveBoxIcon className="h-4 w-4 mr-1.5 inline-block"/> Legacy Articles ({oldArticles.length})</button>
                                    
                                    {/* --- NEW: Migrate All Button --- */}
                                    {oldArticles.length > 0 && (
                                        <div className="ml-auto flex items-center pl-4">
                                            <button
                                                onClick={handleMigrateAll}
                                                disabled={isMigrating}
                                                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-semibold bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/40 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                            >
                                                <ArrowPathIcon className={`h-4 w-4 ${isMigrating ? 'animate-spin' : ''}`}/>
                                                <span>{isMigrating ? 'Migrating...' : 'Migrate All'}</span>
                                            </button>
                                        </div>
                                    )}
                                </nav>
                            </div>

                            <div className="overflow-x-auto">
                               {/* Table and list content remains the same... */}
                               {paginatedMaterials.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-700">
                                        <thead><tr>
                                            <th scope="col" className="th">Material</th><th scope="col" className="th">Category</th><th scope="col" className="th">Status</th><th scope="col" className="th">Linked To</th><th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                            {paginatedMaterials.map(mat => (
                                                <tr key={mat.id} className="hover:bg-gray-800/40 transition-colors">
                                                    <td className="td font-medium text-white">
                                                        {mat.name}
                                                        {mat.source === 'old' && <span className="ml-2 badge-purple">Legacy</span>}
                                                    </td>
                                                    <td className="td"><div className="flex items-center space-x-2"><TagIcon className="h-4 w-4 text-gray-500"/><span>{mat.source === 'old' ? 'RDFC Articles' : (mat.subType ? `${mat.mainType} / ${mat.subType}` : mat.mainType)}</span></div></td>
                                                    <td className="td">{mat.isFree ? <span className="badge-green">Free</span> : <span className="badge-yellow">Paid</span>}</td>
                                                    <td className="td"><div className="flex items-center space-x-2">{mat.linkedTestId ? <><LinkIcon className="h-4 w-4 text-blue-400"/><span>{mat.testTitle}</span></> : <span className="text-gray-500">Standalone</span>}</div></td>
                                                    <td className="td text-right space-x-4">
                                                        <button onClick={() => handleEditClick(mat)} className="font-medium text-blue-400 hover:text-blue-300">{mat.source === 'old' ? 'Migrate' : 'Edit'}</button>
                                                        <button onClick={() => handleDelete(mat)} className="font-medium text-red-500 hover:text-red-400">Delete</button>
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
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="pagination-btn"><ChevronLeftIcon className="h-4 w-4" /> Previous</button>
                                    <span>Page {currentPage} of {totalPages}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="pagination-btn">Next <ChevronRightIcon className="h-4 w-4" /></button>
                                </div>
                            )}
                        </div>
                    </section>
                </main>

                <style>{`
                    .form-input { @apply w-full rounded-lg bg-gray-900/70 border-gray-600 text-white placeholder-gray-500 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed; }
                    .switch-base { @apply relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed; }
                    .switch-handle { @apply inline-block h-5 w-5 transform rounded-full bg-white transition-transform; }
                    .filter-tab { @apply whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors; }
                    .filter-tab:not(.active) { @apply border-transparent text-gray-400 hover:text-white hover:border-gray-500; }
                    .filter-tab.active { @apply border-blue-500 text-blue-400; }
                    .th { @apply px-3 py-3.5 text-left text-sm font-semibold text-gray-300; }
                    .td { @apply whitespace-nowrap px-3 py-4 text-sm text-gray-400; }
                    .badge-green { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-300; }
                    .badge-yellow { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-300; }
                    .badge-purple { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-300; }
                    .pagination-btn { @apply inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-700/60 hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed; }
                `}</style>
            </div>
        </div>
    );
};

export default RDFCArticlesPage;