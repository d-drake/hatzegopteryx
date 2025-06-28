'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

interface RegistrationRequest {
  id: number;
  email: string;
  username: string;
  created_at: string;
  expires_at: string;
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const response = await axios.get('/api/users/pending-registrations');
      setRegistrations(response.data);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRegistration = async (registrationId: number) => {
    setProcessingId(registrationId);
    try {
      await axios.post(`/api/users/approve-registration/${registrationId}`);
      // Remove from list after approval
      setRegistrations(registrations.filter(r => r.id !== registrationId));
    } catch (error) {
      console.error('Error approving registration:', error);
      alert('Failed to approve registration');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectRegistration = async (registrationId: number) => {
    setProcessingId(registrationId);
    try {
      await axios.post(`/api/users/reject-registration/${registrationId}`);
      // Remove from list after rejection
      setRegistrations(registrations.filter(r => r.id !== registrationId));
    } catch (error) {
      console.error('Error rejecting registration:', error);
      alert('Failed to reject registration');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Registration Requests</h1>
        <span className="text-sm text-gray-600">{registrations.length} pending</span>
      </div>

      {registrations.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">No pending registration requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {registrations.map((registration) => (
            <div key={registration.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{registration.username}</h3>
                  <p className="text-sm text-gray-600">{registration.email}</p>
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Requested {formatDistanceToNow(new Date(registration.created_at))} ago</p>
                    <p>Expires {formatDistanceToNow(new Date(registration.expires_at), { addSuffix: true })}</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => approveRegistration(registration.id)}
                    disabled={processingId === registration.id}
                    className={`px-4 py-2 rounded-md text-white transition-colors ${
                      processingId === registration.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {processingId === registration.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => rejectRegistration(registration.id)}
                    disabled={processingId === registration.id}
                    className={`px-4 py-2 rounded-md text-white transition-colors ${
                      processingId === registration.id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processingId === registration.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}