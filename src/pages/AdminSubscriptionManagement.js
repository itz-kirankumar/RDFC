import React, { useState, useEffect, Fragment } from 'react';
import { collection, doc, updateDoc, onSnapshot, setDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Transition } from '@headlessui/react';
import { nanoid } from 'nanoid';

// --- Reusable Form Input Component ---
const FormInput = ({ label, type = 'text', value, onChange, placeholder = '', step, min, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            step={step}
            min={min}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
            {...props}
        />
    </div>
);

// --- Plan Management Modal with Tiered Offers ---
const PlanManagementModal = ({ isOpen, setIsOpen, planToEdit, handleSavePlan }) => {
    const [editMode, setEditMode] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState(null);

    // Main Plan States
    const [planName, setPlanName] = useState('');
    const [isRecommended, setIsRecommended] = useState(false);
    const [order, setOrder] = useState('');
    
    // State for Features (Simplified: Title Only)
    const [features, setFeatures] = useState([{ id: nanoid(), title: '' }]);
    
    // State for Pricing Tiers (with integrated offer logic)
    const [tiers, setTiers] = useState([]);

    const initialTierState = {
        id: nanoid(),
        durationText: '',
        price: '',
        originalPrice: '',
        checkoutLink: '',
        hasOffer: false,
        offerName: '',
        offerPrice: '',
        offerEndTime: '',
        offerCheckoutLink: '',
    };
    
    useEffect(() => {
        if (planToEdit) {
            setEditMode(true);
            setCurrentPlanId(planToEdit.id);
            setPlanName(planToEdit.name || '');
            setIsRecommended(planToEdit.isRecommended || false);
            setOrder(planToEdit.order || '');
            setFeatures(planToEdit.features?.map(f => ({ id: f.id || nanoid(), title: f.title })) || [{ id: nanoid(), title: '' }]);

            // Handle both old and new data structures for backward compatibility
            if (planToEdit.tiers && planToEdit.tiers.length > 0) {
                 setTiers(planToEdit.tiers.map(t => ({
                    ...initialTierState,
                    ...t,
                    offerEndTime: t.offerEndTime ? new Date(t.offerEndTime.toDate()).toISOString().slice(0, 16) : '',
                 })));
            } else {
                // Convert old single-price structure to a single tier
                setTiers([{
                    id: nanoid(),
                    durationText: planToEdit.durationText || '',
                    price: planToEdit.price || '',
                    originalPrice: planToEdit.originalPrice || '',
                    checkoutLink: planToEdit.checkoutLink || '',
                    hasOffer: planToEdit.hasOffer || false,
                    offerName: planToEdit.offerName || '',
                    offerPrice: planToEdit.offerPrice || '',
                    offerEndTime: planToEdit.offerEndTime ? new Date(planToEdit.offerEndTime.toDate()).toISOString().slice(0, 16) : '',
                    offerCheckoutLink: planToEdit.offerCheckoutLink || '',
                }]);
            }
        } else {
            resetForm();
        }
    }, [planToEdit]);

    const resetForm = () => {
        setPlanName('');
        setIsRecommended(false);
        setOrder('');
        setFeatures([{ id: nanoid(), title: '' }]);
        setTiers([initialTierState]);
        setEditMode(false);
        setCurrentPlanId(null);
    };

    // Feature Handlers
    const handleAddFeature = () => setFeatures([...features, { id: nanoid(), title: '' }]);
    const handleFeatureChange = (id, value) => setFeatures(features.map(f => (f.id === id ? { ...f, title: value } : f)));
    const handleRemoveFeature = (id) => setFeatures(features.filter(f => f.id !== id));

    // Tier Handlers
    const handleAddTier = () => setTiers([...tiers, { ...initialTierState, id: nanoid() }]);
    const handleTierChange = (id, field, value) => setTiers(tiers.map(t => (t.id === id ? { ...t, [field]: value } : t)));
    const handleRemoveTier = (id) => setTiers(tiers.filter(t => t.id !== id));

    const handleSave = () => {
        if (!planName || !order || tiers.length === 0 || !tiers[0].price) {
            alert("Please fill in required fields: Plan Name, Display Order, and at least one pricing tier with a price.");
            return;
        }

        const planData = {
            name: planName,
            isRecommended: isRecommended,
            order: parseInt(order),
            features: features.filter(f => f.title.trim() !== ''),
            tiers: tiers.map(t => ({
                id: t.id,
                durationText: t.durationText || '',
                price: t.price ? parseInt(t.price) : 0,
                originalPrice: t.originalPrice ? parseInt(t.originalPrice) : null,
                checkoutLink: t.checkoutLink || '',
                hasOffer: t.hasOffer || false,
                offerName: t.hasOffer ? t.offerName : '',
                offerPrice: t.hasOffer && t.offerPrice ? parseInt(t.offerPrice) : null,
                offerEndTime: t.hasOffer && t.offerEndTime ? Timestamp.fromDate(new Date(t.offerEndTime)) : null,
                offerCheckoutLink: t.hasOffer ? t.offerCheckoutLink || '' : '',
            })).filter(t => t.durationText && t.price),
            isActive: planToEdit ? planToEdit.isActive : true,
        };
        
        handleSavePlan(currentPlanId, planData, editMode);
        setIsOpen(false);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => {setIsOpen(false); resetForm();}}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">{editMode ? 'Edit Subscription Plan' : 'Add New Plan'}</Dialog.Title>
                        <div className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-3">
                            <div className="p-4 border border-gray-700 rounded-lg space-y-4">
                                <h4 className="text-white font-semibold">Main Plan Details</h4>
                                <FormInput label="Plan Name" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g., RDFC Articles Access" />
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Display Order" type="number" value={order} onChange={e => setOrder(e.target.value)} placeholder="e.g., 1" />
                                    <div className="flex items-end pb-2">
                                        <input type="checkbox" checked={isRecommended} onChange={e => setIsRecommended(e.target.checked)} className="rounded h-5 w-5 text-amber-500 focus:ring-amber-500" />
                                        <label className="ml-2 text-gray-300 text-sm">Mark as Recommended</label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 border border-gray-700 rounded-lg space-y-4">
                                <h4 className="text-white font-semibold">Pricing Tiers</h4>
                                {tiers.map((tier, index) => (
                                    <div key={tier.id} className="p-4 bg-gray-900/50 rounded-md space-y-4 relative border-l-4 border-gray-600">
                                        <div className="flex justify-between items-center">
                                            <p className="font-bold text-gray-300">Tier {index + 1}</p>
                                            {tiers.length > 1 && <button onClick={() => handleRemoveTier(tier.id)} className="text-red-500 hover:text-red-400">Remove</button>}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <FormInput label="Duration Text" value={tier.durationText} onChange={e => handleTierChange(tier.id, 'durationText', e.target.value)} placeholder="for 1 Month"/>
                                            <FormInput label="Standard Price (₹)" type="number" value={tier.price} onChange={e => handleTierChange(tier.id, 'price', e.target.value)} placeholder="129" />
                                            <FormInput label="Original Price (₹)" type="number" value={tier.originalPrice} onChange={e => handleTierChange(tier.id, 'originalPrice', e.target.value)} placeholder="Optional: 200" />
                                            <FormInput label="Standard Checkout Link" value={tier.checkoutLink} onChange={e => handleTierChange(tier.id, 'checkoutLink', e.target.value)} placeholder="Standard payment URL" />
                                        </div>
                                        <div className="pt-4 border-t border-gray-700">
                                            <div className="flex items-center">
                                                <input type="checkbox" checked={tier.hasOffer} onChange={e => handleTierChange(tier.id, 'hasOffer', e.target.checked)} className="h-5 w-5 rounded text-amber-500 focus:ring-amber-500" />
                                                <label className="ml-2 text-gray-300 font-semibold">Enable Offer for this Tier</label>
                                            </div>
                                            {tier.hasOffer && (
                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    <FormInput label="Offer Name" value={tier.offerName} onChange={e => handleTierChange(tier.id, 'offerName', e.target.value)} placeholder="e.g., Diwali Sale" />
                                                    <FormInput label="Offer Price (₹)" type="number" value={tier.offerPrice} onChange={e => handleTierChange(tier.id, 'offerPrice', e.target.value)} placeholder="99" />
                                                    <FormInput label="Offer End Time" type="datetime-local" value={tier.offerEndTime} onChange={e => handleTierChange(tier.id, 'offerEndTime', e.target.value)} />
                                                    <FormInput label="Offer Checkout Link" value={tier.offerCheckoutLink} onChange={e => handleTierChange(tier.id, 'offerCheckoutLink', e.target.value)} placeholder="Special offer URL" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <button onClick={handleAddTier} className="text-green-500 hover:text-green-400 font-semibold"> + Add Another Tier</button>
                            </div>

                            <div className="p-4 border border-gray-700 rounded-lg space-y-4">
                                <h4 className="text-white font-semibold">Features (Bullet Points)</h4>
                                {features.map(feature => (
                                    <div key={feature.id} className="flex items-center space-x-2">
                                        <div className="flex-grow">
                                            <FormInput label="" value={feature.title} onChange={e => handleFeatureChange(feature.id, e.target.value)} placeholder="Feature e.g., Access to all RDFC articles" />
                                        </div>
                                        <button onClick={() => handleRemoveFeature(feature.id)} className="text-red-500 hover:text-red-400 self-end mb-1">Remove</button>
                                    </div>
                                ))}
                                <button onClick={handleAddFeature} className="text-green-500 hover:text-green-400 font-semibold">+ Add Feature</button>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => {setIsOpen(false); resetForm();}}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleSave}>{editMode ? 'Update Plan' : 'Add Plan'}</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


// --- Banner Management Modal (Unchanged) ---
const BannerManagementModal = ({ isOpen, setIsOpen, bannerToEdit, handleSaveBanner }) => {
    const [editMode, setEditMode] = useState(false);
    const [currentBannerId, setCurrentBannerId] = useState(null);
    const [bannerText, setBannerText] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
    const [saleTitle, setSaleTitle] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (bannerToEdit) {
            setEditMode(true);
            setCurrentBannerId(bannerToEdit.id);
            setBannerText(bannerToEdit.text);
            setBannerLink(bannerToEdit.link);
            setBannerImageUrl(bannerToEdit.imageUrl || '');
            setSaleTitle(bannerToEdit.saleTitle || '');
            setIsActive(bannerToEdit.isActive);
            setStartTime(bannerToEdit.startTime?.toDate().toISOString().slice(0, 16) || '');
            setEndTime(bannerToEdit.endTime?.toDate().toISOString().slice(0, 16) || '');
        } else {
            setEditMode(false); setCurrentBannerId(null); setBannerText(''); setBannerLink(''); setBannerImageUrl(''); setSaleTitle(''); setIsActive(true); setStartTime(''); setEndTime('');
        }
    }, [bannerToEdit]);

    const handleSave = () => {
        if (!bannerText) { alert("Please enter banner text."); return; }
        const bannerData = {
            text: bannerText, link: bannerLink, imageUrl: bannerImageUrl, saleTitle: saleTitle, isActive: isActive,
            startTime: startTime ? Timestamp.fromDate(new Date(startTime)) : null,
            endTime: endTime ? Timestamp.fromDate(new Date(endTime)) : null,
            createdAt: bannerToEdit?.createdAt || serverTimestamp(),
        };
        handleSaveBanner(currentBannerId, bannerData, editMode);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">{editMode ? 'Edit Banner' : 'Add New Banner'}</Dialog.Title>
                        <div className="mt-4 space-y-4">
                            <FormInput label="Banner Text" value={bannerText} onChange={e => setBannerText(e.target.value)} placeholder="e.g., Get 50% OFF!"/>
                            <FormInput label="Sale Title (optional)" value={saleTitle} onChange={e => setSaleTitle(e.target.value)} placeholder="e.g., MEGA SALE!"/>
                            <FormInput label="Banner Link (URL)" value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="Optional link"/>
                            <FormInput label="Image URL" value={bannerImageUrl} onChange={e => setBannerImageUrl(e.target.value)} placeholder="Optional image URL"/>
                            <FormInput label="Start Time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            <FormInput label="End Time" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
                            <div className="flex items-center"><input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-amber-500"/>
                                <label className="ml-2 text-gray-300 text-sm">Active</label>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleSave}>{editMode ? 'Update' : 'Add'}</button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};


// --- Main Component ---
export default function AdminSubscriptionManagement() {
    const [plans, setPlans] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [editPlanData, setEditPlanData] = useState(null);
    const [editBannerData, setEditBannerData] = useState(null);

    useEffect(() => {
        const plansQuery = query(collection(db, 'subscriptionPlans'), orderBy('order', 'asc'));
        const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => { setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); setLoading(false); }, (error) => { console.error("Error fetching plans:", error); setLoading(false); });
        const bannersQuery = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(bannersQuery, (snapshot) => { setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); }, (error) => console.error("Error fetching banners:", error));
        return () => { unsubscribePlans(); unsubscribeBanners(); };
    }, []);

    const handleTogglePlanActiveStatus = async (planId, currentStatus) => await updateDoc(doc(db, 'subscriptionPlans', planId), { isActive: !currentStatus });
    const handleToggleBannerActiveStatus = async (bannerId, currentStatus) => await updateDoc(doc(db, 'banners', bannerId), { isActive: !currentStatus });

    const handleSavePlan = async (planId, planData, isEdit) => {
        try {
            if (isEdit) { await updateDoc(doc(db, 'subscriptionPlans', planId), planData); alert("Plan updated!"); }
            else { await addDoc(collection(db, 'subscriptionPlans'), planData); alert("Plan added!"); }
            setIsPlanModalOpen(false);
        } catch (error) { console.error("Error saving plan:", error); alert("Failed to save plan."); }
    };

    const handleDeletePlan = async (planId) => {
        if (window.confirm("Are you sure?")) {
            try { await deleteDoc(doc(db, 'subscriptionPlans', planId)); alert("Plan deleted!"); }
            catch (error) { console.error("Error deleting plan:", error); alert("Failed to delete plan."); }
        }
    };
    
    const handleSaveBanner = async (bannerId, bannerData, isEdit) => {
        try {
            if (isEdit) { await updateDoc(doc(db, 'banners', bannerId), bannerData); alert("Banner updated!"); }
            else { await addDoc(collection(db, 'banners'), bannerData); alert("Banner added!"); }
            setIsBannerModalOpen(false);
        } catch (error) { console.error("Error saving banner:", error); alert("Failed to save banner."); }
    };

    const handleDeleteBanner = async (bannerId) => {
        if (window.confirm("Are you sure?")) {
            try { await deleteDoc(doc(db, 'banners', bannerId)); alert("Banner deleted!"); }
            catch (error) { console.error("Error deleting banner:", error); alert("Failed to delete banner."); }
        }
    };

    if (loading) { return <div className="text-center p-8">Loading...</div>; }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Subscription Management</h1>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Plans</h2>
                <button onClick={() => { setIsPlanModalOpen(true); setEditPlanData(null); }} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700">Add New Plan</button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                {['Order', 'Plan Name', 'Tiers', 'Recommended', 'Active', 'Actions'].map(h => 
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {plans.map(plan => (
                                <tr key={plan.id}>
                                    <td className="px-6 py-4 text-sm text-white">{plan.order}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-white">{plan.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-400">{plan.tiers?.length || 0}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isRecommended ? 'bg-green-800 text-green-100' : 'bg-gray-700 text-gray-300'}`}>{plan.isRecommended ? 'Yes' : 'No'}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={plan.isActive} onChange={() => handleTogglePlanActiveStatus(plan.id, plan.isActive)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                                        <button onClick={() => { setIsPlanModalOpen(true); setEditPlanData(plan); }} className="text-amber-400 hover:text-amber-300">Edit</button>
                                        <button onClick={() => handleDeletePlan(plan.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-between items-center mb-4 mt-12">
                <h2 className="text-2xl font-bold text-white">Banners</h2>
                <button onClick={() => { setIsBannerModalOpen(true); setEditBannerData(null); }} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700">Add New Banner</button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                {['Banner Text', 'Sale Title', 'Active', 'Actions'].map(h =>
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {banners.map(banner => (
                                <tr key={banner.id}>
                                    <td className="px-6 py-4 text-sm text-white">{banner.text}</td>
                                    <td className="px-6 py-4 text-sm text-white">{banner.saleTitle || 'N/A'}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={banner.isActive} onChange={() => handleToggleBannerActiveStatus(banner.id, banner.isActive)} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium space-x-2">
                                        <button onClick={() => { setIsBannerModalOpen(true); setEditBannerData(banner); }} className="text-amber-400 hover:text-amber-300">Edit</button>
                                        <button onClick={() => handleDeleteBanner(banner.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <PlanManagementModal isOpen={isPlanModalOpen} setIsOpen={setIsPlanModalOpen} planToEdit={editPlanData} handleSavePlan={handleSavePlan} />
            <BannerManagementModal isOpen={isBannerModalOpen} setIsOpen={setIsBannerModalOpen} bannerToEdit={editBannerData} handleSaveBanner={handleSaveBanner} />
        </div>
    );
}