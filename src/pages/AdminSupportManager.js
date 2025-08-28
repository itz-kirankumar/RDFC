import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, arrayUnion, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { PaperAirplaneIcon, CheckCircleIcon, ArrowLeftIcon, TicketIcon, InboxIcon, UserCircleIcon } from '@heroicons/react/24/solid';

// --- Reusable UI Sub-Components ---

const Spinner = () => (
    <div className="flex h-full items-center justify-center p-8 text-gray-500">
        <svg className="h-8 w-8 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const EmptyState = ({ icon, title, message }) => (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
        {icon}
        <h3 className="mt-4 text-lg font-semibold text-slate-300">{title}</h3>
        <p className="mt-1 text-sm">{message}</p>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        open: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        replied: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        resolved: 'bg-green-500/10 text-green-400 border-green-500/20',
    };
    return (
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${styles[status] || 'bg-slate-500/10 text-slate-400'}`}>
            {status}
        </span>
    );
};

// --- Main Display Components ---

const TicketListItem = ({ ticket, isSelected, onSelect }) => {
    const userName = ticket.userName || ticket.userEmail;
    return (
        <div
            onClick={() => onSelect(ticket)}
            className={`mb-2 cursor-pointer rounded-lg border-l-4 p-3 transition-all duration-200 ${isSelected ? 'border-blue-500 bg-slate-700/50' : 'border-transparent bg-slate-800/50 hover:bg-slate-700/50'}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="truncate pr-2 font-bold text-white">{ticket.subject}</p>
                <StatusBadge status={ticket.status} />
            </div>
            <div className="mt-2 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-600 text-xs font-bold text-slate-300">
                    {userName?.charAt(0).toUpperCase()}
                </div>
                <p className="truncate text-sm text-slate-400">{userName}</p>
            </div>
            <p className="mt-2 text-xs text-slate-500">
                Last Update: {ticket.updatedAt ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(ticket.updatedAt.toDate()) : 'N/A'}
            </p>
        </div>
    );
};

const TicketDetail = ({ ticket, onClose, onReply, onResolve }) => {
    const [replyText, setReplyText] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]); // Reruns whenever messages array changes

    const handleReply = () => {
        onReply(replyText);
        setReplyText('');
    };

    if (!ticket) {
        return <div className="flex h-full w-full flex-col rounded-lg border border-slate-700 bg-slate-800"><EmptyState icon={<TicketIcon className="h-16 w-16" />} title="No Ticket Selected" message="Choose a ticket from the list to see its details." /></div>;
    }

    return (
        <div className="flex h-full w-full flex-col rounded-lg border border-slate-700 bg-slate-800">
            <div className="flex shrink-0 items-center gap-4 border-b border-slate-700 p-4">
                <button onClick={onClose} className="-ml-2 rounded-full p-2 transition-colors hover:bg-slate-700 md:hidden">
                    <ArrowLeftIcon className="h-6 w-6 text-white" />
                </button>
                <UserCircleIcon className="hidden h-10 w-10 shrink-0 text-slate-500 sm:block" />
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-white">{ticket.subject}</h3>
                    <p className="text-sm text-slate-400">From: {ticket.userName || ticket.userEmail}</p>
                </div>
                <StatusBadge status={ticket.status} />
            </div>
            <div className="flex-grow overflow-y-auto p-4">
                {ticket.messages.map((msg, index) => (
                    <div key={index} className={`mb-4 flex max-w-lg flex-col lg:max-w-xl ${msg.sender === 'admin' ? 'items-start' : 'items-end ml-auto'}`}>
                        <div className={`rounded-lg p-3 ${msg.sender === 'admin' ? 'rounded-tl-none bg-blue-600/30' : 'rounded-br-none bg-slate-700'}`}>
                            <p className="mb-1 text-sm font-bold text-cyan-300">{msg.senderName}</p>
                            <p className="whitespace-pre-wrap text-white">{msg.text}</p>
                        </div>
                        <p className="mt-1 px-1 text-xs text-slate-500">{msg.timestamp ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(msg.timestamp.toDate()) : 'Sending...'}</p>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="shrink-0 border-t border-slate-700 bg-slate-900/50 p-4">
                <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full rounded-md border border-slate-600 bg-slate-700 p-2 text-white transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                />
                <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row">
                    <button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className="flex w-full flex-grow items-center justify-center gap-2 rounded-md bg-blue-600 py-2 px-4 font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <PaperAirplaneIcon className="h-5 w-5" />
                        <span>Send Reply</span>
                    </button>
                    {ticket.status !== 'resolved' && (
                         <button
                            onClick={onResolve}
                            className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 py-2 px-4 font-bold text-white transition-colors hover:bg-green-700 sm:w-auto"
                        >
                            <CheckCircleIcon className="h-5 w-5" />
                            <span>Mark as Resolved</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const TicketList = ({ displayTickets, allTickets, filter, setFilter, selectedTicket, onSelectTicket }) => {
    const tabs = ['all', 'open', 'replied', 'resolved'];
    const getCount = (tab) => (tab === 'all' ? allTickets.length : allTickets.filter(t => t.status === tab).length);

    return (
        <div className="flex h-full w-full flex-col rounded-lg border border-slate-700 bg-slate-800 p-4">
            <h2 className="shrink-0 text-xl font-bold text-cyan-300">Tickets</h2>
            <div className="my-2 flex shrink-0 items-center border-b border-slate-700">
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${filter === tab ? 'border-b-2 border-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {tab} ({getCount(tab)})
                    </button>
                ))}
            </div>
            <div className="flex-grow overflow-y-auto pr-1">
                {displayTickets.length > 0 ? (
                    displayTickets.map(ticket => (
                        <TicketListItem key={ticket.id} ticket={ticket} isSelected={selectedTicket?.id === ticket.id} onSelect={onSelectTicket} />
                    ))
                ) : (
                    <EmptyState icon={<InboxIcon className="h-16 w-16" />} title="No Tickets Found" message="There are no tickets matching this filter." />
                )}
            </div>
        </div>
    );
};

// --- Main Admin Manager Component ---

const AdminSupportManager = ({ navigate }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [filter, setFilter] = useState('open');
    const { userData } = useAuth();
    const isInitialLoad = useRef(true); // Use a ref to track the initial data load

    useEffect(() => {
        const q = query(collection(db, 'supportTickets'), orderBy('updatedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(fetchedTickets);

            // Use the functional update form to avoid stale state in the listener's closure
            setSelectedTicket(currentSelectedTicket => {
                // On the very first data fetch, if no ticket is selected yet, select the first open one
                if (isInitialLoad.current && fetchedTickets.length > 0) {
                    isInitialLoad.current = false; // Mark initial load as complete
                    const firstOpen = fetchedTickets.find(t => t.status === 'open');
                    return firstOpen || fetchedTickets[0]; // Return the found ticket or the first one
                }

                // On subsequent updates, find the latest version of the currently selected ticket
                if (currentSelectedTicket) {
                    // If the selected ticket is deleted, this will return undefined, effectively deselecting it
                    return fetchedTickets.find(t => t.id === currentSelectedTicket.id) || null;
                }

                // If no ticket was selected, remain so.
                return null;
            });
            
            setLoading(false);
        }, (error) => {
            console.error("Firebase snapshot error:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []); // Empty dependency array ensures this effect runs only once

    const filteredTickets = useMemo(() => {
        if (filter === 'all') return tickets;
        return tickets.filter(ticket => ticket.status === filter);
    }, [tickets, filter]);

    const handleReply = async (replyText) => {
        if (!selectedTicket || !replyText.trim() || !userData) return;
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
        await updateDoc(ticketRef, {
            messages: arrayUnion({ text: replyText, sender: 'admin', senderName: userData.name || 'Admin', timestamp: new Date() }),
            status: 'replied',
            updatedAt: serverTimestamp()
        });
    };

    const handleResolveTicket = async () => {
        if (!selectedTicket) return;
        const ticketRef = doc(db, 'supportTickets', selectedTicket.id);
        await updateDoc(ticketRef, { status: 'resolved', updatedAt: serverTimestamp() });
    };

    return (
        <div className="flex h-screen flex-col bg-slate-900 text-white">
            <header className="flex-shrink-0 p-4 sm:p-6">
                <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <h1 className="text-3xl font-bold text-white">Support Management</h1>
                    <button onClick={() => navigate('home')} className="rounded-md bg-slate-700 px-4 py-2 font-semibold text-white transition-colors hover:bg-slate-600">&larr; Back to Dashboard</button>
                </div>
            </header>
            
            <main className="mx-auto flex w-full max-w-7xl flex-grow flex-col gap-6 overflow-hidden px-4 pb-4 sm:px-6 md:flex-row">
                <div className={`h-full w-full shrink-0 md:w-1/3 lg:w-1/4 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
                    {loading ? <Spinner /> : <TicketList 
                                                displayTickets={filteredTickets} 
                                                allTickets={tickets} 
                                                filter={filter} 
                                                setFilter={setFilter} 
                                                selectedTicket={selectedTicket} 
                                                onSelectTicket={setSelectedTicket} 
                                             />}
                </div>
                <div className={`h-full w-full ${selectedTicket ? 'flex' : 'hidden md:flex'}`}>
                    <TicketDetail ticket={selectedTicket} onClose={() => setSelectedTicket(null)} onReply={handleReply} onResolve={handleResolveTicket} />
                </div>
            </main>
        </div>
    );
};

export default AdminSupportManager;
