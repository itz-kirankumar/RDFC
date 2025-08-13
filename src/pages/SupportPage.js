import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { FaCheckCircle } from 'react-icons/fa';

const SupportPage = ({ navigate }) => {
    const { user, userData } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list', 'new', 'ticket'
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const q = query(collection(db, 'supportTickets'), where('userId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            setTickets(userTickets);
            if (selectedTicket) {
                const updatedSelected = userTickets.find(t => t.id === selectedTicket.id);
                if (updatedSelected) {
                    setSelectedTicket(updatedSelected);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [user, selectedTicket]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!subject.trim() || !message.trim()) {
            alert('Please fill out both subject and message.');
            return;
        }
        try {
            await addDoc(collection(db, 'supportTickets'), {
                userId: user.uid,
                userEmail: user.email,
                subject: subject,
                status: 'open',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                messages: [{
                    text: message,
                    sender: 'user',
                    senderName: userData?.displayName || user.email,
                    timestamp: new Date()
                }]
            });
            setSubject('');
            setMessage('');
            setView('list');
        } catch (error) {
            console.error("Error creating ticket: ", error);
        }
    };

    const handleSelectTicket = (ticket) => {
        setSelectedTicket(ticket);
        setView('ticket');
    };
    
    const handleSendReply = async () => {
        if (!selectedTicket || !replyText.trim()) return;
    
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
    
        try {
            await updateDoc(ticketRef, {
                messages: arrayUnion({
                    text: replyText,
                    sender: 'user',
                    senderName: userData?.displayName || user.email,
                    timestamp: new Date()
                }),
                status: 'open', // Re-open the ticket
                updatedAt: serverTimestamp()
            });
            setReplyText('');
        } catch (error) {
            console.error("Error sending reply:", error);
        }
    };

    const handleMarkResolved = async () => {
        if (!selectedTicket) return;
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
        try {
            await updateDoc(ticketRef, {
                status: 'resolved',
                updatedAt: serverTimestamp()
            });
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

    const renderListView = () => (
        <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">My Support Tickets</h2>
                <button onClick={() => setView('new')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Create New Ticket</button>
            </div>
            {loading ? <p>Loading your tickets...</p> : (
                <div className="space-y-4">
                    {tickets.length === 0 ? <p className="text-gray-400 text-center py-4">You have not created any support tickets yet.</p> :
                        tickets.map(ticket => (
                            <div key={ticket.id} onClick={() => handleSelectTicket(ticket)} className="bg-gray-700/50 p-4 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-white">{ticket.subject}</p>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mt-2">Last updated: {new Date(ticket.updatedAt?.toDate()).toLocaleString()}</p>
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    );

    const renderNewTicketForm = () => (
        <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Create a New Support Ticket</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300">Subject</label>
                    <input type="text" id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300">Message</label>
                    <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows="6" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" required></textarea>
                </div>
                <div className="flex justify-end space-x-4">
                    <button type="button" onClick={() => setView('list')} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">Submit Ticket</button>
                </div>
            </form>
        </div>
    );
    
    const renderTicketView = () => (
        <div className="bg-gray-800 rounded-lg p-6">
            <button onClick={() => setView('list')} className="text-blue-400 hover:text-blue-300 mb-4">&larr; Back to all tickets</button>
            <h2 className="text-2xl font-bold text-white mb-1">{selectedTicket.subject}</h2>
            <p className="text-sm text-gray-400 mb-6">Status: <span className={`font-semibold p-1 rounded ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></p>

            <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                {selectedTicket.messages.map((msg, index) => (
                    <div key={index} className={`p-3 rounded-lg max-w-xl ${msg.sender === 'user' ? 'bg-blue-900 ml-auto text-right' : 'bg-gray-700 mr-auto'}`}>
                        <p className="font-bold text-sm mb-1">{msg.senderName}</p>
                        <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                        <p className="text-xs text-gray-400 mt-2">{new Date(msg.timestamp?.toDate ? msg.timestamp.toDate() : msg.timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-700 pt-6">
                {selectedTicket.status !== 'resolved' ? (
                    <>
                        <textarea
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           placeholder="Type your reply..."
                           className="w-full p-2 rounded-md bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           rows="4"
                       />
                       <div className="flex items-center space-x-2 mt-2">
                           <button
                               onClick={handleSendReply}
                               className="flex-grow bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                           >
                               Send Reply (Re-opens ticket)
                           </button>
                           <button
                               onClick={handleMarkResolved}
                               className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center space-x-2"
                           >
                               <FaCheckCircle />
                               <span>Mark Resolved</span>
                           </button>
                       </div>
                    </>
                ) : (
                    <div className="text-center p-4 bg-green-900/50 rounded-lg">
                        <p className="font-semibold text-green-200">This ticket is marked as resolved.</p>
                        <p className="text-sm text-green-300 mt-2">If you have a follow-up question, please submit a new reply. This will automatically re-open the ticket.</p>
                        <textarea
                           value={replyText}
                           onChange={(e) => setReplyText(e.target.value)}
                           placeholder="Type a follow-up question to re-open..."
                           className="w-full p-2 mt-4 rounded-md bg-gray-900 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                           rows="4"
                       />
                       <button
                           onClick={handleSendReply}
                           disabled={!replyText.trim()}
                           className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-md transition-colors disabled:bg-gray-500"
                       >
                           Submit Reply and Re-open Ticket
                       </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Support Center</h1>
                <button onClick={() => navigate('home')} className="bg-gray-800 text-white px-4 md:px-6 py-2 rounded-md font-semibold hover:bg-gray-700 shadow transition-all">&larr; Back to Dashboard</button>
            </div>
            {view === 'list' && renderListView()}
            {view === 'new' && renderNewTicketForm()}
            {view === 'ticket' && selectedTicket && renderTicketView()}
        </div>
    );
};

export default SupportPage;