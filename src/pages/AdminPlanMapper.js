import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, onSnapshot, doc, setDoc, query, orderBy, where } from 'firebase/firestore';
import { FaSave, FaLink, FaTags, FaToggleOn, FaToggleOff, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { motion } from 'framer-motion';

// --- Reusable UI Components ---

const AccessItemSelector = ({ allAccessItems, selectedKeys, onSelectionChange }) => {
    const handleToggle = (key) => {
        const currentSelection = selectedKeys || [];
        const newSelection = currentSelection.includes(key)
            ? currentSelection.filter(id => id !== key)
            : [...currentSelection, key];
        onSelectionChange(newSelection);
    };

    return (
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {allAccessItems.map(item => {
                const isSelected = (selectedKeys || []).includes(item.key);
                return (
                    <button key={item.key} onClick={() => handleToggle(item.key)}
                        className={`p-2 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center text-left
                            ${isSelected ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {isSelected ? <FaToggleOn className="mr-2" /> : <FaToggleOff className="mr-2 text-gray-500" />}
                        <span className="truncate">{item.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

// --- Main AdminPlanMapper Component ---

const AdminPlanMapper = () => {
    const [plans, setPlans] = useState([]);
    const [allAccessItems, setAllAccessItems] = useState([]);
    const [mappings, setMappings] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState({});
    const [error, setError] = useState(null);

    useEffect(() => {
        const plansQuery = query(collection(db, 'subscriptionPlans'), where('isActive', '==', true), orderBy('order', 'asc'));
        const unsubscribePlans = onSnapshot(plansQuery, (snapshot) => {
            setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, err => setError("Could not load subscription plans."));

        const tabsQuery = query(collection(db, 'tabManager'), orderBy('order'));
        const unsubscribeTabs = onSnapshot(tabsQuery, (snapshot) => {
            const accessItems = snapshot.docs.flatMap(doc => {
                const tab = { id: doc.id, ...doc.data() };
                const items = [];
                if (tab.requiresAccess) items.push({ key: tab.name, label: tab.name });
                tab.subTabs?.forEach(subTab => {
                    if (subTab.requiresAccess) items.push({ key: `${tab.name}/${subTab.name}`, label: `↳ ${subTab.name}` });
                });
                return items;
            });
            setAllAccessItems(accessItems);
        }, err => setError("Could not load manageable tabs."));
        
        const unsubscribeMappings = onSnapshot(collection(db, 'planMappings'), (snapshot) => {
            const mappingsData = {};
            snapshot.forEach(doc => {
                mappingsData[doc.id] = doc.data();
            });
            setMappings(mappingsData);
            setLoading(false);
        }, err => {
            setError("Could not load existing plan mappings.");
            setLoading(false);
        });

        return () => { unsubscribePlans(); unsubscribeTabs(); unsubscribeMappings(); };
    }, []);

    const handleTierMappingChange = (planId, tierId, field, value) => {
        setMappings(prev => ({
            ...prev,
            [planId]: {
                ...(prev[planId] || {}),
                tiers: {
                    ...(prev[planId]?.tiers || {}),
                    [tierId]: {
                        ...(prev[planId]?.tiers?.[tierId] || { validityType: 'days', grantedAccessKeys: [] }),
                        [field]: value,
                    }
                }
            }
        }));
    };

    const handleSaveMapping = async (planId) => {
        setSaving(prev => ({ ...prev, [planId]: true }));
        try {
            const mappingDocRef = doc(db, 'planMappings', planId);
            const planDetails = plans.find(p => p.id === planId);
            const currentMapping = mappings[planId] || {};

            const finalMappingData = {
                planId: planId,
                planName: planDetails.name,
                tiers: {}
            };

            (planDetails.tiers || []).forEach(tier => {
                const tierMapping = currentMapping.tiers?.[tier.id];
                // Only save the mapping if it has been configured in the UI
                if (tierMapping) {
                    finalMappingData.tiers[tier.id] = {
                        tierId: tier.id,
                        durationText: tier.durationText,
                        grantedAccessKeys: tierMapping.grantedAccessKeys || [],
                        validityType: tierMapping.validityType || 'days',
                        validityValue: tierMapping.validityValue || null,
                    };
                }
            });

            await setDoc(mappingDocRef, finalMappingData, { merge: true });
            alert(`Mapping for "${planDetails.name}" saved successfully!`);
        } catch (err) {
            console.error("Error saving mapping:", err);
            alert('Failed to save mapping.');
        } finally {
            setSaving(prev => ({ ...prev, [planId]: false }));
        }
    };

    if (loading) return <div className="text-center p-10 text-white">Loading Plan Mapper...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-0">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center"><FaLink className="mr-3 text-blue-400" />Plan Access Mapper</h1>
                <p className="text-gray-400 mt-2">Define which features are unlocked and for how long for each pricing tier. This is the core of automated access control.</p>
            </div>

            <div className="space-y-8">
                {plans.map(plan => (
                    <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                        className="bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-700">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-700 pb-4 mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                                <p className="text-gray-400 text-sm">Display Order: {plan.order}</p>
                            </div>
                            <button onClick={() => handleSaveMapping(plan.id)} disabled={saving[plan.id]}
                                className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors duration-200 disabled:bg-gray-500">
                                <FaSave className="mr-2" />{saving[plan.id] ? 'Saving...' : 'Save All Tiers'}
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            {(plan.tiers || []).map(tier => {
                                const tierMapping = mappings[plan.id]?.tiers?.[tier.id] || { validityType: 'days', grantedAccessKeys: [] };
                                return (
                                <div key={tier.id} className="bg-gray-900/50 p-4 rounded-lg border-l-4 border-gray-600">
                                    <h3 className="font-bold text-white">{tier.durationText} <span className="text-sm font-normal text-gray-400">(Tier ID: {tier.id})</span></h3>
                                    
                                    <div className="mt-4">
                                        <label className="text-sm font-semibold text-gray-300 block mb-2">Unlocked Features:</label>
                                        <AccessItemSelector 
                                            allAccessItems={allAccessItems} 
                                            selectedKeys={tierMapping.grantedAccessKeys}
                                            onSelectionChange={(keys) => handleTierMappingChange(plan.id, tier.id, 'grantedAccessKeys', keys)} />
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <label className="text-sm font-semibold text-gray-300 block mb-2">Access Validity:</label>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="flex-1">
                                                <select value={tierMapping.validityType} onChange={(e) => handleTierMappingChange(plan.id, tier.id, 'validityType', e.target.value)}
                                                    className="w-full bg-gray-700 text-white p-2 rounded-md border-gray-600 focus:ring-blue-500">
                                                    <option value="days">Duration in Days (from payment)</option>
                                                    <option value="date">Fixed Expiry Date</option>
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                {tierMapping.validityType === 'days' ? (
                                                    <div className="relative">
                                                        <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input type="number" placeholder="e.g., 30" value={tierMapping.validityValue || ''} onChange={(e) => handleTierMappingChange(plan.id, tier.id, 'validityValue', e.target.value)}
                                                        className="w-full bg-gray-700 text-white p-2 pl-10 rounded-md border-gray-600 focus:ring-blue-500" />
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                        <input type="date" value={tierMapping.validityValue || ''} onChange={(e) => handleTierMappingChange(plan.id, tier.id, 'validityValue', e.target.value)}
                                                        className="w-full bg-gray-700 text-white p-2 pl-10 rounded-md border-gray-600 focus:ring-blue-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default AdminPlanMapper;

