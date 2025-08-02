import React, { useState, useEffect, Fragment } from 'react';
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Dialog, Transition } from '@headlessui/react';

// --- Reusable Form Input Component ---
const FormInput = ({ label, type = 'number', value, onChange, placeholder = '' }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-white shadow-sm focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
        />
    </div>
);

// --- User Edit Modal Sub-Component ---
const UserEditModal = ({ isOpen, setIsOpen, user, onUpdate }) => {
    const [validityDays, setValidityDays] = useState(30);

    // Reset state when the modal opens for a new user
    useEffect(() => {
        setValidityDays(30);
    }, [isOpen]);

    if (!isOpen || !user) return null;

    const handleGrantAccess = async () => {
        if (!validityDays || validityDays <= 0) {
            alert("Please enter a valid number of days.");
            return;
        }
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + parseInt(validityDays));
        try {
            const userRef = doc(db, 'users', user.id);
            await updateDoc(userRef, {
                isSubscribed: true,
                expiryDate: Timestamp.fromDate(expiryDate)
            });
            alert(`Access granted to ${user.email} for ${validityDays} days.`);
            onUpdate(); // This will trigger fetchUsers in the parent
            setIsOpen(false);
        } catch (error) {
            console.error("Error granting access:", error);
            alert("Failed to grant access.");
        }
    };

    const handleRevokeAccess = async () => {
        if (window.confirm(`Are you sure you want to revoke premium access for ${user.email}? This action is immediate.`)) {
            try {
                const userRef = doc(db, 'users', user.id);
                await updateDoc(userRef, {
                    isSubscribed: false,
                    expiryDate: null
                });
                alert(`Access revoked for ${user.email}.`);
                onUpdate();
                setIsOpen(false);
            } catch (error) {
                console.error("Error revoking access:", error);
                alert("Failed to revoke access.");
            }
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setIsOpen(false)}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"><div className="fixed inset-0 bg-black bg-opacity-75" /></Transition.Child>
                <div className="fixed inset-0 overflow-y-auto"><div className="flex min-h-full items-center justify-center p-4 text-center">
                    <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800 border border-gray-700 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-white">Manage Premium Access</Dialog.Title>
                        <div className="mt-2"><p className="text-sm text-gray-400">Manage subscription for {user.email}</p></div>
                        
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Set Validity (in days)</label>
                                <div className="mt-2 flex space-x-2">
                                    {[30, 90, 180, 365].map(days => (
                                        <button key={days} onClick={() => setValidityDays(days)} className={`px-3 py-1 text-xs rounded-full ${validityDays === days ? 'bg-white text-gray-900 font-bold' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{days}d</button>
                                    ))}
                                </div>
                                <FormInput type="number" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            {user.isSubscribed && <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700" onClick={handleRevokeAccess}>Revoke Access</button>}
                            <div className="flex space-x-2 ml-auto">
                                <button type="button" className="inline-flex justify-center rounded-md bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600" onClick={() => setIsOpen(false)}>Cancel</button>
                                <button type="button" className="inline-flex justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200" onClick={handleGrantAccess}>Update Access</button>
                            </div>
                        </div>
                    </Dialog.Panel>
                </div></div>
            </Dialog>
        </Transition>
    );
};

// --- Main AdminUserManagement Component ---
const AdminUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            // Filter out admin accounts from the list
            setUsers(usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !u.isAdmin));
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const filteredUsers = users.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">User Management</h1>
            <input 
                type="text"
                placeholder="Search by user email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 rounded-md bg-gray-700 text-white border border-gray-600 mb-6 focus:border-white focus:ring focus:ring-gray-500 focus:ring-opacity-50"
            />
             <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <p className="p-6 text-center text-gray-400">Loading users...</p>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Subscription Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Expiry Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                                {filteredUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{user.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isSubscribed ? 'bg-green-800 text-green-100' : 'bg-gray-700 text-gray-300'}`}>
                                                {user.isSubscribed ? 'PREMIUM' : 'Standard'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                            {user.isSubscribed && user.expiryDate ? user.expiryDate.toDate().toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onClick={() => handleOpenModal(user)} className="text-gray-300 hover:text-white">Manage Access</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <UserEditModal 
                isOpen={isModalOpen}
                setIsOpen={setIsModalOpen}
                user={selectedUser}
                onUpdate={fetchUsers}
            />
        </div>
    );
};

export default AdminUserManagement;
