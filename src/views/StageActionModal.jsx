import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { DriveFileUpload } from '../components/DriveFileUpload';
import { api } from '../api/client';
import { CheckCircle2, AlertTriangle, DollarSign, Send, ShieldCheck, Clock, Paperclip } from 'lucide-react';

const PAYMENT_FORMS = {
  pmmpl: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScn8tHEUldlOM_8DKpHUfHHiRImDVjkpkhhfduaZUIxpxlJrA/viewform',
    fields: { indent: 'entry.1200639812', requester: 'entry.1091308719', amount: 'entry.1486176123', remarks: 'entry.2102057582' },
  },
  refrasynth: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdHF5shP_liUbm1tsyOS3nrEmNUY9Y5zl4y2odXK0weaDjcpA/viewform',
    fields: { indent: 'entry.1200639812', requester: 'entry.1091308719', amount: 'entry.1486176123', remarks: 'entry.2102057582' },
  },
  refratech: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScTunRezHE3TKtNpXjISVWjnywDwUcT6F62DYtkLlgXL6MMaQ/viewform',
    fields: { indent: 'entry.1488969069', requester: 'entry.217854775', amount: 'entry.1555425422', remarks: 'entry.1005715757' },
  },
  purab: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdLWKfGPNXK62Orndb137GPKadFiRQZS8W_MM0c11HvdR4KkA/viewform',
    fields: { indent: 'entry.1200639812', requester: 'entry.1091308719', amount: 'entry.1486176123', remarks: 'entry.2102057582' },
  },
  rkl: {
    url: 'https://docs.google.com/forms/d/e/1FAIpQLScJJFvh6zchRosSzX0mU-u7-oeMaQW6iv1osE70hRDoE-uVrg/viewform',
    fields: { indent: 'entry.1200639812', requester: 'entry.1091308719', amount: 'entry.1486176123', remarks: 'entry.2102057582' },
  },
};

export function getPaymentFormUrl(requisition) {
  const paymentForm = PAYMENT_FORMS[(requisition?.firmName || '').trim().toLowerCase()];
  if (!paymentForm) return '';
  return `${paymentForm.url}?usp=pp_url&${new URLSearchParams({
    [paymentForm.fields.indent]: requisition.rsIndentNo || '',
    [paymentForm.fields.requester]: requisition.requesterName || '',
    [paymentForm.fields.amount]: String(requisition.approvedAmount || requisition.amount || ''),
    [paymentForm.fields.remarks]: requisition.reason || '',
  }).toString()}`;
}

export function StageActionModal({ isOpen, onClose, requisition, stageType, onSuccess, user }) {
  const [formData, setFormData] = useState({
    approvedAmount: '',
    exceedReason: '',
    paidField: 'Yes',
    paymentDecision: 'Yes',
    voucherRef: '',
    paymentProof: '',
    remarks: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && requisition) {
      setError('');
      setFormData({
        approvedAmount: requisition.approvedAmount || requisition.amount || '',
        exceedReason: '',
        paidField: requisition.paidField || 'Yes',
        paymentDecision: requisition.paymentDecision || 'Yes',
        voucherRef: '',
        paymentProof: requisition.paymentProof || '',
        remarks: requisition.remarks || '',
      });
    }
  }, [isOpen, requisition]);

  if (!requisition) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Pre-validation
    if (stageType === 'APPROVAL') {
      const approvedAmt = parseFloat(formData.approvedAmount);
      if (isNaN(approvedAmt) || approvedAmt <= 0) {
        setError('Please enter a valid approved amount.');
        return;
      }
      if (approvedAmt > requisition.amount && !formData.exceedReason.trim()) {
        setError('Approved amount exceeds requested amount. A formal justification reason is required.');
        return;
      }
      if (['Hold', 'Rejected'].includes(formData.paidField) && !formData.remarks.trim()) {
        setError(`Please enter a remark for the ${formData.paidField.toLowerCase()} decision.`);
        return;
      }
    }
    if (stageType === 'PAYMENT' && !formData.remarks.trim()) {
      setError('Please enter a payment remark.');
      return;
    }

    setLoading(true);
    try {
      const updated = await api.updateStageAction(
        requisition.rsIndentNo,
        stageType,
        formData,
        requisition.version
      );
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Stage transition failed.');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (stageType) {
      case 'APPROVAL':
        return `Management Approval — ${requisition.rsIndentNo}`;
      case 'POSTING':
        return `Confirm Posting — ${requisition.rsIndentNo}`;
      case 'PAYMENT':
        return `Record Payment Completion — ${requisition.rsIndentNo}`;
      case 'AUDIT':
        return `Audit Verification — ${requisition.rsIndentNo}`;
      default:
        return 'Stage Action';
    }
  };

  const exceedsRequested =
    stageType === 'APPROVAL' && parseFloat(formData.approvedAmount) > (requisition.amount || 0);
  const requiresDecisionRemark =
    stageType === 'APPROVAL' && ['Hold', 'Rejected'].includes(formData.paidField);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} maxWidth="580px">
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
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Record Overview Summary Card */}
        <div
          style={{
            padding: '14px',
            backgroundColor: 'var(--surface-subtle)',
            borderRadius: '12px',
            border: '1px solid var(--border-light)',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            fontSize: '0.84rem',
          }}
        >
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Requester:</span>{' '}
            <strong>{requisition.requesterName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Firm:</span>{' '}
            <strong>{requisition.firmName || '—'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Requested Amount:</span>{' '}
            <strong className="num-financial" style={{ color: 'var(--accent-sage-dark)' }}>
              ₹{Number(requisition.amount || 0).toLocaleString('en-IN')}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Payment Mode:</span>{' '}
            <strong>{requisition.mode}</strong>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <span style={{ color: 'var(--text-muted)' }}>Reason:</span> {requisition.reason}
          </div>
          {requisition.attachments && (
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Attachment:</span>
              <a
                href={requisition.attachments}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  borderRadius: '6px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <Paperclip size={12} />
                <span>Open File in Drive ↗</span>
              </a>
            </div>
          )}
        </div>

        {/* ================= STAGE 1: APPROVAL ================= */}
        {stageType === 'APPROVAL' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Approved Amount   <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.approvedAmount}
                onChange={(e) => setFormData({ ...formData, approvedAmount: e.target.value })}
                className="num-financial"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: exceedsRequested ? '1.5px solid #d9534f' : '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
            </div>

            {exceedsRequested && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#fff7ed',
                  border: '1px solid #fed7aa',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontSize: '0.82rem', fontWeight: 700 }}>
                  <AlertTriangle size={15} />
                  <span>Approved Amount Exceeds Requested Amount</span>
                </div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9a3412' }}>
                  Please state mandatory justification reason: <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.exceedReason}
                  onChange={(e) => setFormData({ ...formData, exceedReason: e.target.value })}
                  placeholder="Specify why higher amount was approved..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fdba74',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Paid Field Decision
              </label>
              <select
                value={formData.paidField}
                onChange={(e) => setFormData({ ...formData, paidField: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                <option value="Yes">Yes (Approved for payment processing)</option>
                <option value="Rejected">Rejected</option>
              </select>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>

              </span>
            </div>

            {requiresDecisionRemark && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {formData.paidField} Remark <span style={{ color: '#c0392b' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder={`Please provide a reason for ${formData.paidField.toLowerCase()}...`}
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
            )}
          </>
        )}

        {/* ================= STAGE 2: POSTING ================= */}
        {stageType === 'POSTING' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Voucher / Accounting Reference Number
              </label>
              <input
                type="text"
                value={formData.voucherRef}
                onChange={(e) => setFormData({ ...formData, voucherRef: e.target.value })}
                placeholder="e.g. VCH-2026-8891"
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
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>

            </p>
          </>
        )}

        {/* ================= STAGE 3: PAYMENT ================= */}
        {stageType === 'PAYMENT' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Payment Decision
              </label>
              <select
                value={formData.paymentDecision}
                onChange={(e) => setFormData({ ...formData, paymentDecision: e.target.value })}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff', fontSize: '0.9rem', outline: 'none' }}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Payment Remark <span style={{ color: '#c0392b' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Enter payment remark..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border-light)', backgroundColor: '#ffffff', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
              />
            </div>
            <DriveFileUpload
              value={formData.paymentProof}
              onChange={(val) => setFormData({ ...formData, paymentProof: val })}
              label="Payment Attachment (PDF / Image)"
              hint=""
            />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>

              Payment decision and remark will be recorded.
            </p>
          </>
        )}

        {/* ================= STAGE 4: AUDIT ================= */}
        {stageType === 'AUDIT' && (
          <>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Audit Verification Remarks
              </label>
              <textarea
                rows={3}
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Verify invoice, payment receipt, and tax compliance..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>

            </p>
          </>
        )}

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
              backgroundColor: 'var(--accent-sage-dark)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(42, 71, 47, 0.3)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{loading ? 'Confirming Stage Action...' : 'Confirm Stage Action'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
