import React, { useState, useEffect } from 'react';
import { MessageSquare, Filter, Download, Trash2, Star } from 'lucide-react';
import { getToken } from '../services/auth';

interface Feedback {
  id: string;
  business_id: string;
  businessName: string;
  subject: string;
  message: string;
  rating: number;
  status: 'unread' | 'read' | 'resolved';
  createdAt: string;
}

const SuperAdminFeedbacks = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('unread');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-admin/feedbacks', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
        filterFeedbacks(data.feedbacks || [], 'unread');
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterFeedbacks = (items: Feedback[], status: string) => {
    if (status === 'all') {
      setFilteredFeedbacks(items);
    } else {
      setFilteredFeedbacks(items.filter(f => f.status === status));
    }
  };

  const handleFilterChange = (status: string) => {
    setFilter(status);
    filterFeedbacks(feedbacks, status);
  };

  const updateFeedbackStatus = async (feedbackId: string, status: 'read' | 'resolved') => {
    try {
      const response = await fetch(`/api/super-admin/feedbacks/${feedbackId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        fetchFeedbacks();
      }
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (confirm('Delete this feedback?')) {
      try {
        const response = await fetch(`/api/super-admin/feedbacks/${feedbackId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (response.ok) {
          fetchFeedbacks();
        }
      } catch (error) {
        console.error('Failed to delete feedback:', error);
      }
    }
  };

return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Customer Feedbacks</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <Download className="w-5 h-5" />
          Export
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 border-b border-slate-200">
        {['unread', 'read', 'resolved', 'all'].map(status => (
          <button
            key={status}
            onClick={() => handleFilterChange(status)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            <span className="ml-2 text-sm">({feedbacks.filter(f => status === 'all' || f.status === status).length})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Feedbacks List */}
        <div className="col-span-2 bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading feedbacks...</div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No feedbacks found</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredFeedbacks.map(feedback => (
                <div
                  key={feedback.id}
                  onClick={() => setSelectedFeedback(feedback)}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                    selectedFeedback?.id === feedback.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">{feedback.subject}</h3>
                        <div className="flex">
                          {[...Array(feedback.rating)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-1">{feedback.businessName}</p>
                      <p className="text-sm text-slate-500">{feedback.message.substring(0, 100)}...</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${
                      feedback.status === 'unread' ? 'bg-blue-100 text-blue-700' :
                      feedback.status === 'read' ? 'bg-gray-100 text-gray-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {feedback.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Details */}
        <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-8">
          {selectedFeedback ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-slate-900">{selectedFeedback.subject}</h3>
              <div>
                <p className="text-sm text-slate-600 mb-1">From:</p>
                <p className="font-medium text-slate-900">{selectedFeedback.businessName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Rating:</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < selectedFeedback.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-600 mb-1">Message:</p>
                <p className="text-slate-700">{selectedFeedback.message}</p>
              </div>
              <div className="pt-4 space-y-2 border-t border-slate-200">
                <button
                  onClick={() => updateFeedbackStatus(selectedFeedback.id, 'read')}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                >
                  Mark as Read
                </button>
                <button
                  onClick={() => updateFeedbackStatus(selectedFeedback.id, 'resolved')}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                >
                  Resolve
                </button>
                <button
                  onClick={() => deleteFeedback(selectedFeedback.id)}
                  className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Select a feedback to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminFeedbacks;
