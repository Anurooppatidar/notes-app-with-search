/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Edit2,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import debounce from 'lodash.debounce';

interface Note {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [dbStatus, setDbStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  const cardColors = useMemo(
    () => [
      'bg-orange-300',
      'bg-amber-300',
      'bg-rose-300',
      'bg-violet-300',
      'bg-lime-300',
      'bg-cyan-300',
    ],
    [],
  );

  const [dashboardPopActive, setDashboardPopActive] = useState(false);
  const dashboardPopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check DB status
  const checkStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      setDbStatus(data.status);
      return data.status === 'connected';
    } catch (err) {
      setDbStatus('disconnected');
      return false;
    }
  };

  // Fetch notes from API
  const fetchNotes = async (query = '') => {
    setLoading(true);
    try {
      const isConnected = await checkStatus();
      if (!isConnected) {
        setLoading(false);
        return;
      }

      const url = query ? `/api/notes?search=${encodeURIComponent(query)}` : '/api/notes';
      const response = await fetch(url);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch notes');
      }
      const data = await response.json();
      setNotes(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not connect to the server.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((query: string) => fetchNotes(query), 300),
    []
  );

  useEffect(() => {
    fetchNotes();
    return () => debouncedSearch.cancel();
  }, []);

  useEffect(() => {
    return () => {
      if (dashboardPopTimer.current) clearTimeout(dashboardPopTimer.current);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const clearSearch = () => {
    if (!search) return;
    setSearch('');
    debouncedSearch.cancel();
    fetchNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      const url = editingNote ? `/api/notes/${editingNote._id}` : '/api/notes';
      const method = editingNote ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save note');
      
      setFormData({ title: '', content: '' });
      setEditingNote(null);
      setShowForm(false);
      fetchNotes(search);
    } catch (err) {
      setError('Failed to save note. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete note');
      fetchNotes(search);
    } catch (err) {
      setError('Failed to delete note.');
    }
  };

  const startEdit = (note: Note) => {
    setEditingNote(note);
    setFormData({ title: note.title, content: note.content });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setFormData({ title: '', content: '' });
    setShowForm(false);
  };

  const handleDashboardClick = () => {
    if (dashboardPopTimer.current) clearTimeout(dashboardPopTimer.current);
    setDashboardPopActive(true);

    // Re-open the same page content (refresh notes with current search).
    fetchNotes(search);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    dashboardPopTimer.current = setTimeout(() => {
      setDashboardPopActive(false);
    }, 650);
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 font-sans selection:bg-emerald-200">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col gap-6">
          <div className="flex items-center">
            <div className="flex w-full items-center gap-3 rounded-full bg-stone-50 px-4 py-2 shadow-sm ring-1 ring-stone-200/70 focus-within:ring-2 focus-within:ring-stone-400 transition">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder={dbStatus === 'connected' ? 'Search notes…' : 'Connect MongoDB to search…'}
                value={search}
                onChange={handleSearchChange}
                disabled={dbStatus !== 'connected'}
                className="flex-1 bg-transparent outline-none placeholder:text-stone-300 disabled:opacity-50 text-sm"
              />
              {search ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-xs text-stone-400 hover:text-stone-800 font-medium"
                >
                  Clear
                </button>
              ) : (
                <span className="hidden sm:inline text-[11px] text-stone-300 pr-1">
                  Type to filter notes
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="notes-heading text-4xl sm:text-5xl font-semibold tracking-tight text-stone-900">
              Notes
            </h1>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditingNote(null);
                setFormData({ title: '', content: '' });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={dbStatus !== 'connected'}
              className="hidden sm:inline-flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-stone-950 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              New note
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Dashboard-style full-height sidebar */}
          <aside className="w-60 shrink-0">
            <div className="h-full rounded-3xl border border-stone-200 bg-white shadow-sm flex flex-col">
              <div className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-stone-100">
                <div className="h-9 w-9 rounded-full bg-yellow-300 border border-yellow-400 flex items-center justify-center text-xs font-semibold text-stone-800">
                  AZ
                </div>
                <div className="flex flex-col">
                  <span className="notes-heading text-lg font-semibold text-stone-900">
                    Organizo
                  </span>
                  <span className="text-[11px] text-stone-400">
                    Simple task & notes hub
                  </span>
                </div>
              </div>
              <nav className="mt-1 text-sm text-stone-700">
                <motion.button
                  type="button"
                  onClick={handleDashboardClick}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex w-full items-center gap-3 px-5 py-2.5 bg-yellow-50 border-l-4 border-yellow-400 text-stone-900 font-medium"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-yellow-300 text-[11px]">
                    ☐
                  </span>
                  <span>Dashboard</span>
                </motion.button>
              </nav>
            </div>
          </aside>

          <motion.section
            className="flex-1"
            initial={false}
            animate={{
              y: dashboardPopActive ? -6 : 0,
              scale: dashboardPopActive ? 1.01 : 1,
            }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {/* MongoDB Setup Guide */}
            {dbStatus === 'disconnected' && (
          <motion.div 
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-10 p-8 bg-white/80 rounded-3xl border border-stone-200/70 shadow-sm backdrop-blur"
          >
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 mb-4">MongoDB Connection Required</h2>
            <p className="text-stone-600 mb-8 max-w-md mx-auto">
              To save and search notes, you need to connect a MongoDB database.
            </p>
            
            <div className="text-left bg-stone-50/70 border border-stone-200/60 p-6 rounded-2xl mb-8 inline-block w-full max-w-lg">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-stone-800 text-white rounded-full flex items-center justify-center text-xs">1</span>
                Setup Instructions
              </h3>
              <ol className="space-y-4 text-sm text-stone-600">
                <li className="flex gap-3">
                  <span className="font-bold text-stone-400">A.</span>
                  <span>Get a connection string from <a href="https://www.mongodb.com/cloud/atlas" target="_blank" rel="noreferrer" className="text-emerald-600 underline">MongoDB Atlas</a> (Free Tier works great).</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-stone-400">B.</span>
                  <span>Open <b>Settings</b> (⚙️ gear icon, top-right) → <b>Secrets</b>.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-stone-400">C.</span>
                  <span>Add <code>MONGODB_URI</code> as the name and paste your connection string as the value.</span>
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-stone-400">D.</span>
                  <span>The app will rebuild automatically.</span>
                </li>
              </ol>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fetchNotes(search)}
              className="px-8 py-3 bg-stone-900 text-white font-bold rounded-2xl hover:bg-stone-950 transition-all shadow-sm"
            >
              Retry Connection
            </motion.button>
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Add Note Button / Form Toggle */}
        {!showForm && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            disabled={dbStatus !== 'connected'}
            className="w-full mb-8 py-4 border border-dashed border-stone-300/70 rounded-3xl flex items-center justify-center gap-2 text-stone-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-white/60 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="font-medium">Create a new note</span>
          </motion.button>
        )}

        {/* Note Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-12 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="bg-white/85 p-6 rounded-3xl shadow-sm border border-stone-200/70 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-stone-800">
                    {editingNote ? 'Edit Note' : 'New Note'}
                  </h2>
                  <button 
                    type="button" 
                    onClick={cancelEdit}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-400" />
                  </button>
                </div>
                
                <input
                  type="text"
                  placeholder="Note Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full mb-4 px-0 py-2 text-xl font-bold border-none focus:ring-0 outline-none placeholder:text-stone-300 bg-transparent"
                  autoFocus
                />
                
                <textarea
                  placeholder="Start writing..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full min-h-[160px] mb-6 px-0 py-2 border-none focus:ring-0 outline-none resize-none placeholder:text-stone-300 text-stone-700 leading-relaxed bg-transparent"
                />
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-6 py-2 text-stone-600 font-semibold hover:bg-stone-100/70 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.title.trim() || !formData.content.trim()}
                    className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded-2xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-200/70 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes List */}
        <div className="space-y-4">
          {loading && notes.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.25, ease: 'easeOut' }}
                  className="bg-white/70 border border-stone-200/70 rounded-3xl p-5 shadow-sm backdrop-blur"
                >
                  <div className="h-5 w-2/3 rounded-lg bg-stone-200/70 animate-pulse mb-4" />
                  <div className="space-y-2 mb-6">
                    <div className="h-3 w-full rounded-lg bg-stone-200/60 animate-pulse" />
                    <div className="h-3 w-11/12 rounded-lg bg-stone-200/60 animate-pulse" />
                    <div className="h-3 w-9/12 rounded-lg bg-stone-200/60 animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 rounded-lg bg-stone-200/60 animate-pulse" />
                    <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : notes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              <AnimatePresence mode="popLayout">
                {notes.map((note, index) => (
                  <motion.div
                    key={note._id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ delay: 0.03 * index, duration: 0.25, ease: 'easeOut' }}
                    className={[
                      'group relative flex flex-col rounded-3xl px-5 pt-5 pb-4 text-stone-900 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all',
                      cardColors[index % cardColors.length],
                    ].join(' ')}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-stone-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {note.title}
                      </h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(note)}
                          className="p-2 hover:bg-stone-100/70 rounded-2xl text-stone-500 hover:text-emerald-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(note._id)}
                          className="p-2 hover:bg-stone-100/70 rounded-2xl text-stone-500 hover:text-red-700 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-stone-600 text-sm line-clamp-3 mb-4 flex-grow leading-relaxed">
                      {note.content}
                    </p>
                    
                    <div className="mt-auto pt-3 border-t border-stone-100/70 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-stone-400">
                        {new Date(note.createdAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-[10px] font-semibold text-stone-400">
                        {note.updatedAt !== note.createdAt ? 'Edited' : 'New'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="text-center py-20 bg-white/80 rounded-3xl border border-stone-200/70 shadow-sm backdrop-blur">
              <div className="w-16 h-16 bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl border border-stone-200/60 flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-stone-400" />
              </div>
              <h3 className="text-stone-800 font-semibold mb-1">No notes found</h3>
              <p className="text-stone-400 text-sm">
                {search ? `No results for "${search}"` : "You haven't created any notes yet."}
              </p>
              {!search && dbStatus === 'connected' ? (
                <div className="mt-6 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200/70"
                  >
                    <Plus className="w-4 h-4" />
                    Create your first note
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
