import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaCheckCircle } from 'react-icons/fa';

const AdminSupportManager = ({ navigate }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');
    const { userData } = useAuth();

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(fetchedTickets);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching support tickets:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleReply = async () => {
        if (!selectedTicket || !replyText.trim() || !userData) return;

        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
        const newStatus = selectedTicket.status === 'resolved' ? 'resolved' : 'replied';

        try {
            await updateDoc(ticketRef, {
                messages: arrayUnion({
                    text: replyText,
                    sender: 'admin',
                    senderName: userData.displayName || 'Admin',
                    timestamp: new Date()
                }),
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            setReplyText('');
            // Optimistic update
            const updatedTicket = {
                ...selectedTicket,
                status: newStatus,
                messages: [...selectedTicket.messages, { text: replyText, sender: 'admin', senderName: userData.displayName || 'Admin', timestamp: new Date() }]
            };
            setSelectedTicket(updatedTicket);
            setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        } catch (error)
        {
            console.error("Error sending reply:", error);
        }
    };

    const handleResolveTicket = async () => {
        if (!selectedTicket) return;
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
        try {
            await updateDoc(ticketRef, {
                status: 'resolved',
                updatedAt: serverTimestamp()
            });
             // Optimistic update
            const updatedTicket = { ...selectedTicket, status: 'resolved' };
            setSelectedTicket(updatedTicket);
            setTickets(tickets.map(t => t.id === updatedTicket.id ? updatedTicket : t));
        } catch (error) {
            console.error("Error resolving ticket:", error);
        }
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'bg-yellow-500 text-yellow-900';
            case 'replied': return 'bg-blue-500 text-blue-100';
            case 'resolved': return 'bg-green-500 text-green-100';
            default: return 'bg-gray-500 text-gray-100';
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading tickets...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Support Ticket Management</h1>
                <button onClick={() => navigate('home')} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-semibold transition-colors">&larr; Back to Admin Dashboard</button>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-200px)]">
                {/* Tickets List */}
                <div className="md:w-1/3 bg-gray-800 rounded-lg p-4 overflow-y-auto border border-gray-700">
                    <h2 className="text-xl font-bold mb-4 text-cyan-300">All Tickets ({tickets.length})</h2>
                    {tickets.map(ticket => (
                        <div 
                            key={ticket.id} 
                            onClick={() => setSelectedTicket(ticket)}
                            className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-blue-900/50 ring-2 ring-blue-500' : 'bg-gray-700/50 hover:bg-gray-700'}`}
                        >
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-white truncate">{ticket.subject}</p>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                                    {ticket.status}
                                </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">User: {ticket.userEmail}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(ticket.createdAt?.toDate()).toLocaleString()}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Selected Ticket View */}
                <div className="md:w-2/3 bg-gray-800 rounded-lg flex flex-col border border-gray-700">
                    {selectedTicket ? (
                        <>
                            <div className="p-4 border-b border-gray-700">
                                <h3 className="text-2xl font-bold text-white">{selectedTicket.subject}</h3>
                                <p className="text-sm text-gray-400">From: {selectedTicket.userEmail} | Status: <span className={`font-semibold p-1 rounded ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></p>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto">
                                {selectedTicket.messages.map((msg, index) => (
                                    <div key={index} className={`mb-4 p-3 rounded-lg max-w-xl ${msg.sender === 'user' ? 'bg-gray-700 ml-auto text-right' : 'bg-blue-900 mr-auto'}`}>
                                        <p className="font-bold text-sm mb-1">{msg.senderName}</p>
                                        <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                                        <p className="text-xs text-gray-400 mt-2">{new Date(msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply..."
                                    className="w-full p-2 rounded-md bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="4"
                                />
                                <div className="flex items-center space-x-2 mt-2">
                                    <button
                                        onClick={handleReply}
                                        className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                                    >
                                        Send Reply
                                    </button>
                                    {selectedTicket.status !== 'resolved' && (
                                         <button
                                            onClick={handleResolveTicket}
                                            className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center space-x-2"
                                        >
                                            <FaCheckCircle />
                                            <span>Mark as Resolved</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Select a ticket to view details and reply.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupportManager;