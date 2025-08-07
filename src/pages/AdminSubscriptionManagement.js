import React, { useState, useEffect, Fragment } from 'react';
import { collection, doc, updateDoc, onSnapshot, setDoc, deleteDoc, query, orderBy, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore'; // addDoc was missing here
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

// --- Plan Management Modal Sub-Component ---
const PlanManagementModal = ({ isOpen, setIsOpen, planToEdit, handleSavePlan, handleDeletePlan }) => {
    const [editMode, setEditMode] = useState(false);
    const [currentPlanId, setCurrentPlanId] = useState(null);

    const [planName, setPlanName] = useState('');
    const [originalPrice, setOriginalPrice] = useState('');
    const [price, setPrice] = useState('');
    const [offerPrice, setOfferPrice] = useState('');
    const [durationText, setDurationText] = useState('');
    const [checkoutLink, setCheckoutLink] = useState('');
    const [offerCheckoutLink, setOfferCheckoutLink] = useState('');
    const [isRecommended, setIsRecommended] = useState(false);
    const [order, setOrder] = useState('');
    const [hasOffer, setHasOffer] = useState(false);
    const [offerName, setOfferName] = useState('');
    const [offerEndTime, setOfferEndTime] = useState('');
    const [features, setFeatures] = useState([{ id: nanoid(), title: '', description: '' }]);

    useEffect(() => {
        if (planToEdit) {
            setEditMode(true);
            setCurrentPlanId(planToEdit.id);
            setPlanName(planToEdit.name);
            setOriginalPrice(planToEdit.originalPrice || '');
            setPrice(planToEdit.price || '');
            setOfferPrice(planToEdit.offerPrice || '');
            setDurationText(planToEdit.durationText || '');
            setCheckoutLink(planToEdit.checkoutLink || '');
            setOfferCheckoutLink(planToEdit.offerCheckoutLink || '');
            setIsRecommended(planToEdit.isRecommended || false);
            setOrder(planToEdit.order || '');
            setHasOffer(planToEdit.hasOffer || false);
            setOfferName(planToEdit.offerName || '');
            setOfferEndTime(planToEdit.offerEndTime ? new Date(planToEdit.offerEndTime.toDate()).toISOString().slice(0, 16) : '');
            setFeatures(planToEdit.features || [{ id: nanoid(), title: '', description: '' }]);
        } else {
            resetForm();
        }
    }, [planToEdit]);

    const resetForm = () => {
        setPlanName('');
        setOriginalPrice('');
        setPrice('');
        setOfferPrice('');
        setDurationText('');
        setCheckoutLink('');
        setOfferCheckoutLink('');
        setIsRecommended(false);
        setOrder('');
        setHasOffer(false);
        setOfferName('');
        setOfferEndTime('');
        setFeatures([{ id: nanoid(), title: '', description: '' }]);
        setEditMode(false);
        setCurrentPlanId(null);
    };

    const handleAddFeature = () => {
        setFeatures([...features, { id: nanoid(), title: '', description: '' }]);
    };

    const handleFeatureChange = (id, field, value) => {
        setFeatures(features.map(f => (f.id === id ? { ...f, [field]: value } : f)));
    };

    const handleRemoveFeature = (id) => {
        setFeatures(features.filter(f => f.id !== id));
    };

    const handleSave = () => {
        if (!planName || !price || !order) {
            alert("Please fill in all required fields: Plan Name, Standard Price, and Display Order.");
            return;
        }

        const planData = {
            name: planName,
            originalPrice: originalPrice ? parseInt(originalPrice) : null,
            price: parseInt(price),
            durationText: durationText || '',
            checkoutLink: checkoutLink || '',
            offerCheckoutLink: hasOffer ? offerCheckoutLink || '' : '',
            isRecommended: isRecommended,
            order: parseInt(order),
            hasOffer: hasOffer,
            offerName: hasOffer ? offerName : '',
            offerPrice: hasOffer ? parseInt(offerPrice) : null,
            offerEndTime: hasOffer && offerEndTime ? Timestamp.fromDate(new Date(offerEndTime)) : null,
            features: features.filter(f => f.title.trim() !== ''),
            isActive: planToEdit ? planToEdit.isActive : true, // Keep existing status or set to active
        };

        handleSavePlan(currentPlanId, planData, editMode);
        setIsOpen(false);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                            {editMode ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
                        </Dialog.Title>
                        
                        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                            <FormInput label="Plan Name" type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="e.g., Monthly Plan" />
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Original Price (₹)" type="number" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} placeholder="e.g., 1000" step="1" min="0" />
                                <FormInput label="Standard Price (₹)" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g., 419" step="1" min="0" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Display Order" type="number" value={order} onChange={e => setOrder(e.target.value)} placeholder="e.g., 1" step="1" min="1" />
                                <FormInput label="Duration Text" type="text" value={durationText} onChange={e => setDurationText(e.target.value)} placeholder="e.g., until CAT 2025" />
                            </div>
                            <FormInput label="Checkout Link (URL)" type="text" value={checkoutLink} onChange={e => setCheckoutLink(e.target.value)} placeholder="URL for the subscribe button (e.g., payment link)" />
                            
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                    <input type="checkbox" checked={isRecommended} onChange={e => setIsRecommended(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                                    <label className="ml-2 text-gray-300 text-sm">Recommended Plan</label>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" checked={hasOffer} onChange={e => setHasOffer(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                                    <label className="ml-2 text-gray-300 text-sm">Enable Offer</label>
                                </div>
                            </div>

                            {hasOffer && (
                                <div className="grid grid-cols-2 gap-4">
                                    <FormInput label="Offer Name" type="text" value={offerName} onChange={e => setOfferName(e.target.value)} placeholder="e.g., Limited Time Deal!" />
                                    <FormInput label="Offer Price (₹)" type="number" value={offerPrice} onChange={e => setOfferPrice(e.target.value)} placeholder="e.g., 350" step="1" min="0" />
                                    <FormInput label="Offer End Time" type="datetime-local" value={offerEndTime} onChange={e => setOfferEndTime(e.target.value)} />
                                    <div className="col-span-2">
                                        <FormInput label="Offer Checkout Link (URL)" type="text" value={offerCheckoutLink} onChange={e => setOfferCheckoutLink(e.target.value)} placeholder="Dedicated link for the offer" />
                                    </div>
                                </div>
                            )}

                            <h4 className="text-white font-semibold mt-6">Features (Bulletins)</h4>
                            <div className="space-y-2">
                                {features.map((feature) => (
                                    <div key={feature.id} className="flex items-center space-x-2">
                                        <div className="flex-grow grid grid-cols-2 gap-2">
                                            <FormInput
                                                label="Title"
                                                type="text"
                                                value={feature.title}
                                                onChange={e => handleFeatureChange(feature.id, 'title', e.target.value)}
                                                placeholder="Feature Title"
                                            />
                                            <FormInput
                                                label="Description"
                                                type="text"
                                                value={feature.description}
                                                onChange={e => handleFeatureChange(feature.id, 'description', e.target.value)}
                                                placeholder="Feature Description"
                                            />
                                        </div>
                                        <button onClick={() => handleRemoveFeature(feature.id)} className="text-red-500 hover:text-red-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                                <button onClick={handleAddFeature} className="text-green-500 hover:text-green-400 text-sm flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Add Feature
                                </button>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleSave}>
                                {editMode ? 'Update Plan' : 'Add Plan'}
                            </button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- Banner Management Modal ---
const BannerManagementModal = ({ isOpen, setIsOpen, bannerToEdit, handleSaveBanner, handleDeleteBanner }) => {
    const [editMode, setEditMode] = useState(false);
    const [currentBannerId, setCurrentBannerId] = useState(null);
    const [bannerText, setBannerText] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerImageUrl, setBannerImageUrl] = useState('');
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
            setIsActive(bannerToEdit.isActive);
            setStartTime(bannerToEdit.startTime?.toDate().toISOString().slice(0, 16) || '');
            setEndTime(bannerToEdit.endTime?.toDate().toISOString().slice(0, 16) || '');
        } else {
            resetForm();
        }
    }, [bannerToEdit]);

    const resetForm = () => {
        setBannerText('');
        setBannerLink('');
        setBannerImageUrl('');
        setIsActive(true);
        setStartTime('');
        setEndTime('');
        setEditMode(false);
        setCurrentBannerId(null);
    };

    const handleSave = () => {
        if (!bannerText) {
            alert("Please enter banner text.");
            return;
        }
        const bannerData = {
            text: bannerText,
            link: bannerLink,
            imageUrl: bannerImageUrl,
            isActive: isActive,
            startTime: startTime ? Timestamp.fromDate(new Date(startTime)) : null,
            endTime: endTime ? Timestamp.fromDate(new Date(endTime)) : null,
            createdAt: serverTimestamp(),
        };
        handleSaveBanner(currentBannerId, bannerData, editMode);
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">
                            {editMode ? 'Edit Banner' : 'Add New Banner'}
                        </Dialog.Title>
                        
                        <div className="mt-4 space-y-4">
                            <FormInput label="Banner Text" type="text" value={bannerText} onChange={e => setBannerText(e.target.value)} placeholder="e.g., Get 50% OFF! Limited time deal!" />
                            <FormInput label="Banner Link (URL)" type="text" value={bannerLink} onChange={e => setBannerLink(e.target.value)} placeholder="Optional. Link for the banner click." />
                            <FormInput label="Image URL" type="text" value={bannerImageUrl} onChange={e => setBannerImageUrl(e.target.value)} placeholder="Optional. Google Drive URL for banner image" />
                            
                            <FormInput label="Start Time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
                            <FormInput label="End Time" type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />

                            <div className="flex items-center">
                                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded text-amber-500 focus:ring-amber-500" />
                                <label className="ml-2 text-gray-300 text-sm">Active</label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-2">
                            <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                            <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleSave}>
                                {editMode ? 'Update Banner' : 'Add Banner'}
                            </button>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- Main AdminSubscriptionManagement Component ---
export default function AdminSubscriptionManagement() {
    const [plans, setPlans] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
    const [editPlanData, setEditPlanData] = useState(null);
    const [editBannerData, setEditBannerData] = useState(null);

    useEffect(() => {
        const plansColRef = collection(db, 'subscriptionPlans');
        const qPlans = query(plansColRef, orderBy('order', 'asc'));
        const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
            const fetchedPlans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPlans(fetchedPlans);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching subscription plans:", error);
            setLoading(false);
        });

        const bannersColRef = collection(db, 'banners');
        const qBanners = query(bannersColRef, orderBy('createdAt', 'desc'));
        const unsubscribeBanners = onSnapshot(qBanners, (snapshot) => {
            const fetchedBanners = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBanners(fetchedBanners);
        }, (error) => {
            console.error("Error fetching banners:", error);
        });

        return () => {
            unsubscribePlans();
            unsubscribeBanners();
        };
    }, []);

    const handleTogglePlanActiveStatus = async (planId, currentStatus) => {
        const planRef = doc(db, 'subscriptionPlans', planId);
        await updateDoc(planRef, { isActive: !currentStatus });
    };

    const handleToggleBannerActiveStatus = async (bannerId, currentStatus) => {
        const bannerRef = doc(db, 'banners', bannerId);
        await updateDoc(bannerRef, { isActive: !currentStatus });
    };

    const handleSavePlan = async (planId, planData, isEdit) => {
        try {
            if (isEdit) {
                await updateDoc(doc(db, 'subscriptionPlans', planId), planData);
                alert("Plan updated successfully!");
            } else {
                await setDoc(doc(collection(db, 'subscriptionPlans')), planData);
                alert("Plan added successfully!");
            }
            setIsPlanModalOpen(false);
        } catch (error) {
            console.error("Error saving plan:", error);
            alert("Failed to save plan.");
        }
    };

    const handleDeletePlan = async (planId) => {
        if (window.confirm("Are you sure you want to delete this plan? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, 'subscriptionPlans', planId));
                alert("Plan deleted successfully!");
            } catch (error) {
                console.error("Error deleting plan:", error);
                alert("Failed to delete plan.");
            }
        }
    };
    
    const handleSaveBanner = async (bannerId, bannerData, isEdit) => {
        try {
            if (isEdit) {
                await updateDoc(doc(db, 'banners', bannerId), bannerData);
                alert("Banner updated successfully!");
            } else {
                // Use addDoc for new documents with auto-generated IDs
                await addDoc(collection(db, 'banners'), bannerData);
                alert("Banner added successfully!");
            }
            setIsBannerModalOpen(false);
        } catch (error) {
            console.error("Error saving banner:", error);
            alert("Failed to save banner.");
        }
    };

    const handleDeleteBanner = async (bannerId) => {
        if (window.confirm("Are you sure you want to delete this banner?")) {
            try {
                await deleteDoc(doc(db, 'banners', bannerId));
                alert("Banner deleted successfully!");
            } catch (error) {
                console.error("Error deleting banner:", error);
                alert("Failed to delete banner.");
            }
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-white"></div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Subscription Management</h1>

            {/* Plan Management Section */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Plans</h2>
                <button onClick={() => { setIsPlanModalOpen(true); setEditPlanData(null); }} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Add New Plan
                </button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Order</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Plan Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Original Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Recommended</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Offer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Active</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {plans.length > 0 ? (
                                plans.map(plan => (
                                    <tr key={plan.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{plan.order}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{plan.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">₹{plan.price}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {plan.originalPrice ? `₹${plan.originalPrice}` : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isRecommended ? 'bg-green-800 text-green-100' : 'bg-gray-700 text-gray-300'}`}>
                                                {plan.isRecommended ? 'Yes' : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.hasOffer ? 'bg-red-800 text-red-100' : 'bg-gray-700 text-gray-300'}`}>
                                                {plan.hasOffer ? plan.offerName : 'No'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={plan.isActive} onChange={() => handleTogglePlanActiveStatus(plan.id, plan.isActive)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onClick={() => { setIsPlanModalOpen(true); setEditPlanData(plan); }} className="text-amber-400 hover:text-amber-300">Edit</button>
                                            <button onClick={() => handleDeletePlan(plan.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="px-6 py-4 text-center text-gray-400">No subscription plans found. Add a new plan to get started!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Banner Management Section */}
            <div className="flex justify-between items-center mb-4 mt-8">
                <h2 className="text-2xl font-bold text-white">Banners</h2>
                <button onClick={() => { setIsBannerModalOpen(true); setEditBannerData(null); }} className="bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    Add New Banner
                </button>
            </div>
            <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden mb-8">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Banner Text</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Link</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Image URL</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Start Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">End Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Active</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {banners.length > 0 ? (
                                banners.map(banner => (
                                    <tr key={banner.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{banner.text}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{banner.link || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 truncate max-w-xs">{banner.imageUrl || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {banner.startTime ? banner.startTime.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {banner.endTime ? banner.endTime.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={banner.isActive} onChange={() => handleToggleBannerActiveStatus(banner.id, banner.isActive)} className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button onClick={() => { setIsBannerModalOpen(true); setEditBannerData(banner); }} className="text-amber-400 hover:text-amber-300">Edit</button>
                                            <button onClick={() => handleDeleteBanner(banner.id)} className="text-red-500 hover:text-red-400">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-4 text-center text-gray-400">No banners found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PlanManagementModal
                isOpen={isPlanModalOpen}
                setIsOpen={setIsPlanModalOpen}
                planToEdit={editPlanData}
                handleSavePlan={handleSavePlan}
                handleDeletePlan={handleDeletePlan}
            />

            <BannerManagementModal
                isOpen={isBannerModalOpen}
                setIsOpen={setIsBannerModalOpen}
                bannerToEdit={editBannerData}
                handleSaveBanner={handleSaveBanner}
                handleDeleteBanner={handleDeleteBanner}
            />
        </div>
    );
};
