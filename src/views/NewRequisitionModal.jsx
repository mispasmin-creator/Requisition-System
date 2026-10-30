import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { DriveFileUpload } from '../components/DriveFileUpload';
import { api } from '../api/client';
import { PlusCircle, Paperclip, AlertCircle } from 'lucide-react';

export function NewRequisitionModal({ isOpen, onClose, onSuccess, user }) {
  const [formData, setFormData] = useState({
    requesterName: '',
    firmName: '',
    amount: '',
    mode: '',
    paymentLocation: '',
    reason: '',
    attachments: '',
  });

  const [dropdowns, setDropdowns] = useState({
    requesters: [],
    firmNames: [],
    paymentLocations: [],
    modes: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Load dropdown options from Master tab
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(uuidv4());
      setError('');
      api.getMasterDropdowns().then((data) => {
        if (data) {
          setDropdowns(data);
          // Set default requester if current user is requester
          setFormData((prev) => ({
            ...prev,
            requesterName: user?.requesterName || prev.requesterName || (data.requesters?.[0] || ''),
            firmName: prev.firmName || (data.firmNames?.[0] || ''),
            mode: prev.mode || (data.modes?.[0] || ''),
            paymentLocation: prev.paymentLocation || (data.paymentLocations?.[0] || ''),
          }));
        }
      }).catch((err) => {
        console.warn('Master fetch error:', err);
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }
    if (!formData.reason.trim()) {
      setError('Please provide a business reason for the requisition.');
      return;
    }

    setLoading(true);
    try {
      const created = await api.submitRequisition(formData, idempotencyKey);
      onSuccess(created);
      onClose();
      // Reset form
      setFormData({
        requesterName: '',
        firmName: '',
        amount: '',
        mode: '',
        paymentLocation: '',
        reason: '',
        attachments: '',
      });
    } catch (err) {
      setError(err.message || 'Failed to submit requisition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Requisition" maxWidth="620px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--status-overdue-bg)',
              color: 'var(--status-overdue-text)',
              border: '1px solid var(--status-overdue-border)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Name Of The Requester */}
        <SearchableSelect
          label="Name Of The Requester    "
          required
          options={dropdowns.requesters}
          value={formData.requesterName}
          onChange={(val) => setFormData({ ...formData, requesterName: val })}
          placeholder="Select Requester..."
          disabled={user?.role === 'requester'} // If logged in as requester, locked to their verified identity
        />

        {/* Firm Name */}
        <SearchableSelect
          label="Firm Name    "
          required
          options={dropdowns.firmNames}
          value={formData.firmName}
          onChange={(val) => setFormData({ ...formData, firmName: val })}
          placeholder="Select Firm Name..."
        />

        {/* Amount & Mode in grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Amount   <span style={{ color: '#c0392b' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="e.g. 25000"
              className="num-financial"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-light)',
                backgroundColor: '#ffffff',
                fontSize: '0.92rem',
                outline: 'none',
              }}
            />
          </div>

          <SearchableSelect
            label="Payment Mode    "
            required
            options={dropdowns.modes}
            value={formData.mode}
            onChange={(val) => setFormData({ ...formData, mode: val })}
            placeholder="Select Mode..."
          />
        </div>

        {/* Payment Location */}
        <SearchableSelect
          label="Payment Location    "
          required
          options={dropdowns.paymentLocations}
          value={formData.paymentLocation}
          onChange={(val) => setFormData({ ...formData, paymentLocation: val })}
          placeholder="Select Location (e.g. Party / Personal Account)..."
        />

        {/* Reason */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Reason / Justification <span style={{ color: '#c0392b' }}>*</span>
          </label>
          <textarea
            required
            rows={3}
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Describe the requisition purpose, vendor details, or project code..."
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid var(--border-light)',
              backgroundColor: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Any Attachments (Image/PDF directly synced to Google Drive & Column I) */}
        <DriveFileUpload
          value={formData.attachments}
          onChange={(val) => setFormData({ ...formData, attachments: val })}
          label="Bill / Invoice / Quotation Attachment"
          hint=" "
        />

        {/* Submit Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--surface-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: 'var(--radius-pill)',
              border: 'none',
              backgroundColor: 'var(--accent-sage)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(136, 163, 131, 0.35)',
            }}
          >
            <PlusCircle size={16} />
            <span>{loading ? 'Submitting to Sheet...' : 'Submit Requisition'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
