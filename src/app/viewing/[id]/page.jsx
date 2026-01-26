"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/app/Config/firebaseConfig';
import { FaCalendarAlt, FaClock, FaUserTie, FaMapMarkerAlt, FaPhone, FaCheckCircle } from 'react-icons/fa';

const ViewingDetailsPage = () => {
  const params = useParams();
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchViewing = async () => {
      try {
        // For now, we'll use the ID from the URL to find the viewing
        // In a real implementation, you might want to use a secure token instead
        const viewingsRef = collection(db, "viewings");
        const viewingsSnapshot = await getDocs(viewingsRef);
        const viewingData = viewingsSnapshot.docs.find(doc => doc.id === params.id);

        if (viewingData) {
          setViewing({ id: viewingData.id, ...viewingData.data() });
        } else {
          setError("Viewing not found");
        }
      } catch (err) {
        console.error("Error fetching viewing:", err);
        setError("Failed to load viewing details");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchViewing();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading viewing details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaCheckCircle className="text-red-500 text-6xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Viewing Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!viewing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Property Viewing</h1>
          <p className="text-gray-600">Here are the details of your scheduled viewing</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Status Banner */}
          <div className={`px-6 py-4 ${viewing.status === 'Completed' ? 'bg-green-600' : viewing.status === 'Confirmed' ? 'bg-blue-600' : 'bg-yellow-500'} text-white`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Status: {viewing.status}</span>
              <FaCheckCircle className="text-xl" />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Property Details */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-blue-600" />
                Property Details
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900">{viewing.unit}</h3>
                <p className="text-gray-600 mt-1">Property viewing appointment</p>
              </div>
            </div>

            {/* Viewing Details */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaCalendarAlt className="mr-2 text-blue-600" />
                Viewing Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-600 mb-1">
                    <FaCalendarAlt className="mr-2" />
                    <span className="text-sm font-medium">Date</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{viewing.date}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-600 mb-1">
                    <FaClock className="mr-2" />
                    <span className="text-sm font-medium">Time</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{viewing.time}</p>
                </div>
              </div>
            </div>

            {/* Agent Details */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaUserTie className="mr-2 text-blue-600" />
                Your Agent
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900">{viewing.agent}</h3>
                <p className="text-gray-600">Property Consultant</p>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <FaPhone className="mr-2 text-blue-600" />
                Contact Information
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Your Phone</p>
                    <p className="text-lg font-semibold text-gray-900">{viewing.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Agent</p>
                    <p className="text-lg font-semibold text-gray-900">{viewing.agent}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Notes */}
            {viewing.note && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">Additional Notes</h3>
                <p className="text-yellow-700">{viewing.note}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Please arrive 5-10 minutes early for your viewing. If you need to reschedule, contact your agent directly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewingDetailsPage;