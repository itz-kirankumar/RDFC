import React, { useState, useEffect, Fragment } from 'react';
import { collection, onSnapshot, doc, writeBatch, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Switch, Transition } from '@headlessui/react';
import { PlusIcon, TrashIcon, Bars3Icon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTabItem = ({ id, tab, index, handleUpdateTab, handleDeleteTab, handleAddSubTab, handleSubTabChange, handleDeleteSubTab }) => {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style} className="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
            <div className="flex items-center gap-4">
                <div {...attributes} {...listeners} className="text-gray-500 cursor-grab hover:text-white"><Bars3Icon className="h-6 w-6" /></div>
                <input type="text" value={tab.name} onChange={(e) => handleUpdateTab(index, 'name', e.target.value)} className="flex-grow bg-gray-700 text-white p-2 rounded-md border-gray-600 focus:ring-blue-500" />
                <div className="flex items-center space-x-3">
                    <Switch checked={tab.requiresAccess} onChange={(checked) => handleUpdateTab(index, 'requiresAccess', checked)} className={`${tab.requiresAccess ? 'bg-blue-600' : 'bg-gray-600'} relative inline-flex items-center h-6 rounded-full w-11 transition-colors`}>
                        <span className={`${tab.requiresAccess ? 'translate-x-6' : 'translate-x-1'} inline-block w-4 h-4 transform bg-white rounded-full`} />
                    </Switch>
                    <span className="text-sm text-gray-300">Requires Access</span>
                </div>
                <button onClick={() => handleDeleteTab(index)} className="text-red-500 hover:text-red-400"><TrashIcon className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 pl-10 space-y-3">
                <h4 className="text-sm font-semibold text-gray-400">Sub-tabs</h4>
                {tab.subTabs.map((subTab, subIndex) => (
                    <div key={subTab.id} className="flex items-center gap-2 bg-gray-700/50 p-2 rounded-md">
                        <input type="text" placeholder="Sub-tab Name" value={subTab.name} onChange={(e) => handleSubTabChange(index, subIndex, 'name', e.target.value)} className="flex-grow bg-gray-600 text-white p-2 rounded-md text-sm border-gray-500 focus:ring-blue-500" />
                        <div className="flex items-center space-x-2">
                            <Switch checked={subTab.requiresAccess} onChange={(checked) => handleSubTabChange(index, subIndex, 'requiresAccess', checked)} className={`${subTab.requiresAccess ? 'bg-blue-500' : 'bg-gray-500'} relative inline-flex items-center h-5 rounded-full w-9 transition-colors`}>
                                <span className={`${subTab.requiresAccess ? 'translate-x-5' : 'translate-x-1'} inline-block w-3 h-3 transform bg-white rounded-full`} />
                            </Switch>
                            {subTab.requiresAccess ? <LockClosedIcon className="h-4 w-4 text-blue-300" /> : <LockOpenIcon className="h-4 w-4 text-gray-400" />}
                        </div>
                        <button onClick={() => handleDeleteSubTab(index, subIndex)} className="text-red-500/70 hover:text-red-500 p-1"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                ))}
                <button onClick={() => handleAddSubTab(index)} className="text-xs text-gray-300 hover:text-white bg-gray-700/50 px-3 py-1.5 rounded-md">+ Add Sub-tab</button>
            </div>
        </div>
    );
};

const AdminTabManager = ({ navigate }) => {
    const [tabs, setTabs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [saving, setSaving] = useState(false);

    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    useEffect(() => {
        const q = query(collection(db, 'tabManager'), orderBy('order'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLoading(true);
            const tabsData = snapshot.docs.map(doc => {
                const data = doc.data();
                // Ensure subTabs have a unique ID for drag-n-drop libraries
                const subTabs = (data.subTabs || []).map(subTab =>
                    ({ ...subTab, id: subTab.id || `${doc.id}-${subTab.name.replace(/\s+/g, '-')}` })
                );
                return { id: doc.id, ...data, subTabs };
            });
            setTabs(tabsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching tabs:", error);
            alert("Failed to fetch tab data. Check console and Firestore rules.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddTab = () => {
        if (!newTabName.trim()) return;
        const newTab = { id: `new-${Date.now()}`, name: newTabName.trim(), requiresAccess: false, subTabs: [], order: tabs.length };
        setTabs([...tabs, newTab]);
        setIsModalOpen(false);
        setNewTabName('');
    };

    const handleUpdateTab = (index, field, value) => {
        const updatedTabs = [...tabs];
        updatedTabs[index] = { ...updatedTabs[index], [field]: value };
        setTabs(updatedTabs);
    };

    const handleDeleteTab = (index) => {
        if (window.confirm(`Are you sure you want to delete the tab "${tabs[index].name}"? This is permanent.`)) {
            setTabs(tabs.filter((_, i) => i !== index));
        }
    };
    
    const handleAddSubTab = (tabIndex) => {
        const updatedTabs = [...tabs];
        const newSubTab = { name: '', requiresAccess: false, id: `${updatedTabs[tabIndex].id}-new-${Date.now()}` };
        updatedTabs[tabIndex].subTabs.push(newSubTab);
        setTabs(updatedTabs);
    };

    const handleSubTabChange = (tabIndex, subTabIndex, field, value) => {
        const updatedTabs = [...tabs];
        updatedTabs[tabIndex].subTabs[subTabIndex] = { ...updatedTabs[tabIndex].subTabs[subTabIndex], [field]: value };
        setTabs(updatedTabs);
    };

    const handleDeleteSubTab = (tabIndex, subTabIndex) => {
        const updatedTabs = [...tabs];
        updatedTabs[tabIndex].subTabs.splice(subTabIndex, 1);
        setTabs(updatedTabs);
    };
    
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setTabs((items) => {
                const oldIndex = items.findIndex(item => item.id === active.id);
                const newIndex = items.findIndex(item => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const batch = writeBatch(db);
            const collectionRef = collection(db, 'tabManager');
            const existingDocsSnapshot = await getDocs(collectionRef);
            const existingIds = new Set(existingDocsSnapshot.docs.map(d => d.id));
            const currentIds = new Set();

            tabs.forEach((tab, index) => {
                const isNew = tab.id.startsWith('new-');
                const docRef = isNew ? doc(collectionRef) : doc(db, 'tabManager', tab.id);
                currentIds.add(docRef.id);
                
                const { id, ...data } = tab;
                data.order = index;
                data.subTabs = data.subTabs.map(st => ({ name: st.name, requiresAccess: st.requiresAccess, id: st.id.includes('-new-') ? `${docRef.id}-${st.name.replace(/\s+/g, '-')}` : st.id }));
                batch.set(docRef, data);
            });

            existingIds.forEach(id => {
                if (!currentIds.has(id)) {
                    batch.delete(doc(db, 'tabManager', id));
                }
            });

            await batch.commit();
            alert('Tab structure saved successfully!');
        } catch (error) {
            console.error("Error saving tabs:", error);
            alert("Failed to save. Check console for details.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center p-8 text-white">Loading Tabs...</div>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Tab Manager</h1>
                <div className="flex space-x-2">
                    <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-500 flex items-center space-x-2"><PlusIcon className="h-5 w-5"/><span>New Tab</span></button>
                    <button onClick={handleSave} disabled={saving} className="bg-white text-gray-900 px-6 py-2 rounded-md font-semibold hover:bg-gray-200 shadow disabled:bg-gray-400">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </div>

            <p className="text-gray-400 mb-6 text-sm">Drag and drop the main tabs to reorder them. Changes are saved only when you click "Save Changes".</p>
            
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={tabs} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                        {tabs.map((tab, index) => (
                           <SortableTabItem 
                                key={tab.id} id={tab.id} tab={tab} index={index}
                                handleUpdateTab={handleUpdateTab} handleDeleteTab={handleDeleteTab}
                                handleAddSubTab={handleAddSubTab} handleSubTabChange={handleSubTabChange}
                                handleDeleteSubTab={handleDeleteSubTab}
                           />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <Transition appear show={isModalOpen} as={Fragment}>
                 <Dialog as="div" className="relative z-50" onClose={() => setIsModalOpen(false)}>
                    <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black/70" /></Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                            <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Create New Main Tab</Dialog.Title>
                            <div className="mt-4">
                                <input type="text" value={newTabName} onChange={(e) => setNewTabName(e.target.value)} placeholder="e.g., Mocks, Sectionals" className="w-full bg-gray-700 text-white p-2 rounded-md"/>
                            </div>
                            <div className="mt-6 flex justify-end space-x-2">
                                <button type="button" className="bg-gray-600 px-4 py-2 rounded-md text-sm text-white" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="button" className="bg-blue-600 px-4 py-2 rounded-md text-sm text-white" onClick={handleAddTab}>Add Tab</button>
                            </div>
                        </Dialog.Panel>
                    </div></div>
                </Dialog>
            </Transition>
        </div>
    );
};

export default AdminTabManager;