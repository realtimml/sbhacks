import { useState, useEffect, useCallback } from 'react';
import { RiNotionLine, RiSearchLine, RiCheckLine, RiLoader4Line } from 'react-icons/ri';
import { getNotionDatabases, searchNotionDatabases, saveNotionSettings, getNotionSettings } from '../lib/api';
import type { NotionDatabase, NotionSettings } from '../lib/types';

interface NotionDatabasePickerProps {
  isConnected: boolean;
}

export default function NotionDatabasePicker({ isConnected }: NotionDatabasePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDatabase, setSelectedDatabase] = useState<NotionSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved settings on mount
  useEffect(() => {
    if (isConnected) {
      loadSettings();
    }
  }, [isConnected]);

  const loadSettings = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotionDatabasePicker.tsx:27',message:'loadSettings called',data:{isConnected},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      const settings = await getNotionSettings();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotionDatabasePicker.tsx:30',message:'loadSettings result',data:{settings},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setSelectedDatabase(settings);
    } catch (err) {
      console.error('Failed to load Notion settings:', err);
    }
  };

  const loadDatabases = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dbs = await getNotionDatabases();
      setDatabases(dbs);
    } catch (err) {
      setError('Failed to load databases');
      console.error('Failed to load Notion databases:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadDatabases();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const dbs = await searchNotionDatabases(query);
      setDatabases(dbs);
    } catch (err) {
      setError('Search failed');
      console.error('Failed to search Notion databases:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadDatabases]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        handleSearch(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, handleSearch]);

  const handleOpen = () => {
    setIsOpen(true);
    loadDatabases();
  };

  const handleSelect = async (db: NotionDatabase) => {
    setIsSaving(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotionDatabasePicker.tsx:84',message:'handleSelect saving',data:{dbId:db.id,dbTitle:db.title},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      await saveNotionSettings(db.id, db.title);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotionDatabasePicker.tsx:88',message:'handleSelect saved successfully',data:{dbId:db.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setSelectedDatabase({ database_id: db.id, database_name: db.title });
      setIsOpen(false);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/722b834e-d098-4c85-ae9d-3e22007db12f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotionDatabasePicker.tsx:93',message:'handleSelect error',data:{error:String(err)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setError('Failed to save selection');
      console.error('Failed to save Notion settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="mt-4">
      {/* Current selection / Open button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#3A3A38]">
          <RiNotionLine className="w-4 h-4" />
          <span className="font-medium">Target Database:</span>
        </div>
        {selectedDatabase ? (
          <button
            onClick={handleOpen}
            className="text-sm px-3 py-1 bg-[#D5CDBD] hover:bg-[#C5BDAD] rounded-full transition-colors flex items-center gap-2"
          >
            <span className="truncate max-w-[150px]">{selectedDatabase.database_name}</span>
            <span className="text-xs text-[#666]">Change</span>
          </button>
        ) : (
          <button
            onClick={handleOpen}
            className="text-sm px-3 py-1.5 bg-[#3A3A38] text-white hover:bg-[#2A2A28] rounded-full transition-colors"
          >
            Select Database
          </button>
        )}
      </div>

      {/* Picker Modal */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-50"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div 
              className="bg-[#E8E4DC] rounded-2xl w-full max-w-md max-h-[70vh] overflow-hidden shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4">
                <h3 className="font-serif text-2xl text-[#3A3A38]">Select Notion Database</h3>
                <p className="text-sm text-[#666] mt-1">
                  Choose where to save approved tasks
                </p>
              </div>

              {/* Search */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Search databases..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border-2 border-[#C5BDAD] rounded-full bg-white focus:outline-none focus:border-[#3A3A38] transition-colors"
                  />
                </div>
              </div>

              {/* Database list */}
              <div className="px-6 pb-6 max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RiLoader4Line className="w-6 h-6 animate-spin text-[#666]" />
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-600">
                    {error}
                  </div>
                ) : databases.length === 0 ? (
                  <div className="text-center py-8 text-[#666]">
                    No databases found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {databases.map((db) => (
                      <button
                        key={db.id}
                        onClick={() => handleSelect(db)}
                        disabled={isSaving}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#D5CDBD] transition-colors text-left ${
                          selectedDatabase?.database_id === db.id ? 'bg-[#D5CDBD]' : ''
                        }`}
                      >
                        {/* Icon */}
                        <span className="text-xl w-6 text-center">
                          {db.icon || '📄'}
                        </span>
                        
                        {/* Title */}
                        <span className="flex-1 text-[#3A3A38] truncate">
                          {db.title}
                        </span>
                        
                        {/* Selected indicator */}
                        {selectedDatabase?.database_id === db.id && (
                          <RiCheckLine className="w-5 h-5 text-[#8EB879]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-[#C5BDAD] flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[#3A3A38] hover:bg-[#D5CDBD] rounded-full transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

