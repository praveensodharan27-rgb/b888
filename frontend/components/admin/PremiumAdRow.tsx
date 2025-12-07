'use client';

import { useState } from 'react';
import { FiAlertCircle, FiEdit2, FiRefreshCw, FiClock } from 'react-icons/fi';
import { format, formatDistanceToNow } from 'date-fns';
import ImageWithFallback from '../ImageWithFallback';

interface PremiumAdRowProps {
  ad: any;
  activeSection: string;
  onAssignPremium: (data: { adId: string; type: string; duration?: number }) => void;
  onRemovePremium: (adId: string) => void;
  onToggleUrgent: (adId: string) => void;
  onBumpAd: (adId: string) => void;
  settings: any;
}

export default function PremiumAdRow({
  ad,
  activeSection,
  onAssignPremium,
  onRemovePremium,
  onToggleUrgent,
  onBumpAd,
  settings
}: PremiumAdRowProps) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedType, setSelectedType] = useState<string>(ad.premiumType || 'TOP');
  const [customDuration, setCustomDuration] = useState<number>(settings.durations[ad.premiumType] || 7);

  const handleAssign = () => {
    onAssignPremium({
      adId: ad.id,
      type: selectedType,
      duration: customDuration
    });
    setShowAssignModal(false);
  };

  return (
    <>
      <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-4">
          {/* Ad Image */}
          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
            {ad.images && ad.images.length > 0 ? (
              <ImageWithFallback
                src={ad.images[0]}
                alt={ad.title}
                className="w-full h-full object-cover"
                fallbackSrc="/favicon.ico"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                No Image
              </div>
            )}
          </div>

          {/* Ad Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{ad.title}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ad.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>₹{ad.price.toLocaleString('en-IN')}</span>
                  <span>•</span>
                  <span>{ad.category.name}</span>
                  <span>•</span>
                  <span>{ad.location?.name || 'N/A'}</span>
                </div>
              </div>

              {/* Premium Badge */}
              {ad.isPremium && (
                <div className="flex flex-col items-end gap-2">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
                    {ad.premiumType || 'PREMIUM'}
                  </span>
                  {ad.isUrgent && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
                      <FiAlertCircle className="w-3 h-3" />
                      URGENT
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Premium Info */}
            {ad.isPremium && ad.premiumExpiresAt && (
              <div className="mt-3 flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-gray-600">
                  <FiClock className="w-4 h-4" />
                  Expires: {format(new Date(ad.premiumExpiresAt), 'MMM dd, yyyy')}
                </span>
                <span className="text-gray-400">
                  ({formatDistanceToNow(new Date(ad.premiumExpiresAt), { addSuffix: true })})
                </span>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {activeSection === 'top' && (
                <>
                  {ad.premiumType !== 'TOP' && (
                    <button
                      onClick={() => onAssignPremium({ adId: ad.id, type: 'TOP' })}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                    >
                      Make TOP
                    </button>
                  )}
                  {ad.premiumType === 'TOP' && (
                    <button
                      onClick={() => onRemovePremium(ad.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Remove TOP
                    </button>
                  )}
                </>
              )}

              {activeSection === 'featured' && (
                <>
                  {ad.premiumType !== 'FEATURED' && (
                    <button
                      onClick={() => onAssignPremium({ adId: ad.id, type: 'FEATURED' })}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Make Featured
                    </button>
                  )}
                  {ad.premiumType === 'FEATURED' && (
                    <button
                      onClick={() => onRemovePremium(ad.id)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                    >
                      Remove Featured
                    </button>
                  )}
                </>
              )}

              {activeSection === 'bump' && (
                <button
                  onClick={() => onBumpAd(ad.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Bump Ad
                </button>
              )}

              {activeSection === 'urgent' && (
                <button
                  onClick={() => onToggleUrgent(ad.id)}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                    ad.isUrgent
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <FiAlertCircle className="w-4 h-4" />
                  {ad.isUrgent ? 'Remove Urgent' : 'Mark Urgent'}
                </button>
              )}

              {/* Edit Premium */}
              {ad.isPremium && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <FiEdit2 className="w-4 h-4" />
                  Edit Premium
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Premium Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Assign Premium</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Premium Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCustomDuration(settings.durations[e.target.value] || 7);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="TOP">TOP</option>
                  <option value="FEATURED">FEATURED</option>
                  <option value="BUMP_UP">BUMP UP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (Days)</label>
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) || 1)}
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Default: {settings.durations[selectedType]} days
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAssign}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Assign
                </button>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

