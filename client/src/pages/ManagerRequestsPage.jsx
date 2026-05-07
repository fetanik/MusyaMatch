import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiRotateCcw, FiImage } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import '../styles/ManagerRequestsPage.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const parsed = Number(user.userId || user.id);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  } catch {
    // fallback to storage key
  }

  const fallback = Number(localStorage.getItem('userId'));
  return Number.isInteger(fallback) && fallback > 0 ? fallback : null;
};

const ManagerRequestsPage = () => {
  const navigate = useNavigate();
  const { notify } = useMessages();
  const currentUserId = getCurrentUserId();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadRequests = async () => {
    if (!currentUserId) {
      setLoading(false);
      setPageError('Manager account was not found. Please log in again.');
      return;
    }

    try {
      setLoading(true);
      setPageError('');
      const response = await fetch(`${API_BASE}/api/shelter/requests/${currentUserId}`);
      const payload = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to load requests');
      }
      setRequests(Array.isArray(payload) ? payload : []);
    } catch (error) {
      console.error(error);
      setPageError('Failed to load requests.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const updateRequestStatus = async (requestId, status) => {
    try {
      setUpdatingId(requestId);
      const response = await fetch(`${API_BASE}/api/shelter/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, userId: currentUserId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update request status.');
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === requestId
            ? {
                ...item,
                status,
                statusLabel:
                  status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending',
                updatedAt: payload?.updatedAt || item.updatedAt,
              }
            : item
        )
      );

      if (status === 'approved') {
        await notify('Request approved successfully.', { type: 'success', title: 'Success' });
      } else if (status === 'rejected') {
        await notify('Request rejected successfully.', { type: 'success', title: 'Success' });
      } else {
        await notify('Request set to pending successfully.', { type: 'success', title: 'Success' });
      }
    } catch (error) {
      console.error(error);
      await notify('Failed to update request status.', { type: 'error', title: 'Error' });
    } finally {
      setUpdatingId(null);
    }
  };

  const normalizedRequests = useMemo(
    () =>
      requests.filter(
        (item) =>
          Boolean(item?.catName?.trim()) &&
          ['pending', 'approved', 'rejected'].includes(String(item?.status || '').toLowerCase())
      ),
    [requests]
  );
  const visibleRequests = useMemo(
    () =>
      normalizedRequests.filter((item) => {
        const statusOk = statusFilter === 'all' ? true : item.status === statusFilter;
        const typeOk = typeFilter === 'all' ? true : item.type === typeFilter;
        return statusOk && typeOk;
      }),
    [normalizedRequests, statusFilter, typeFilter]
  );
  const totalPending = useMemo(
    () => normalizedRequests.filter((item) => item.status === 'pending').length,
    [normalizedRequests]
  );
  const formatCatAge = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return '';
    return `${parsed} year${parsed === 1 ? '' : 's'}`;
  };

  return (
    <div className="manager-requests-page">
      <header className="requests-hero">
        <div className="requests-header-row">
          <button
            type="button"
            className="requests-back-btn"
            onClick={() => navigate('/manager/profile')}
            aria-label="Back to manager profile"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="requests-title-wrap">
            <h1>Adoption & Foster Requests</h1>
            <p>Review applications for your shelter cats</p>
          </div>
        </div>
      </header>

      <main className="requests-content">
        <section className="requests-summary-card">
          <div>
            <h2>Pending requests</h2>
            <p>{totalPending} waiting for your decision</p>
          </div>
          <div className="requests-filters">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All types</option>
              <option value="adoption">Adoption</option>
              <option value="foster">Foster Care</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="requests-empty">Loading requests...</div>
        ) : pageError ? (
          <div className="requests-empty">{pageError}</div>
        ) : visibleRequests.length === 0 ? (
          <div className="requests-empty">No requests yet.</div>
        ) : (
          <div className="requests-grid">
            {visibleRequests.map((request) => (
              <article
                className="request-card clickable"
                key={request.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRequest(request)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedRequest(request);
                  }
                }}
              >
                <div className="request-cat">
                  {request.catPhoto ? (
                    <img src={request.catPhoto} alt={request.catName} />
                  ) : (
                    <div className="request-placeholder" aria-hidden="true">
                      <FiImage size={18} />
                    </div>
                  )}
                  <div>
                    <h3>{request.catName}</h3>
                    <p>{request.typeLabel || (request.type === 'foster' ? 'Foster Care' : 'Adoption')}</p>
                  </div>
                </div>

                <div className="request-details">
                  <p>
                    <strong>Applicant:</strong>{' '}
                    {request.applicantName || request.applicantEmail || 'Account user'}
                  </p>
                  {request.applicantEmail ? (
                    <p><strong>Email:</strong> {request.applicantEmail}</p>
                  ) : null}
                  {request.applicantPhone ? <p><strong>Phone:</strong> {request.applicantPhone}</p> : null}
                  {request.comment ? <p><strong>Comment:</strong> {request.comment}</p> : null}
                  <p><strong>Status:</strong> {request.statusLabel || 'Pending'}</p>
                  <p>
                    <strong>Created:</strong>{' '}
                    {request.createdAt ? new Date(request.createdAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>

                <div className="request-actions">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        className="approve-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateRequestStatus(request.id, 'approved');
                        }}
                        disabled={updatingId === request.id}
                      >
                        <FiCheck size={15} />
                        Approve
                      </button>
                      <button
                        type="button"
                        className="reject-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateRequestStatus(request.id, 'rejected');
                        }}
                        disabled={updatingId === request.id}
                      >
                        <FiX size={15} />
                        Reject
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="pending-btn"
                      onClick={(event) => {
                        event.stopPropagation();
                        updateRequestStatus(request.id, 'pending');
                      }}
                      disabled={updatingId === request.id}
                    >
                      <FiRotateCcw size={15} />
                      Set as Pending
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      {selectedRequest ? (
        <div
          className="request-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedRequest(null)}
        >
          <article
            className="request-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Request details"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="request-modal-close"
              onClick={() => setSelectedRequest(null)}
              aria-label="Close modal"
            >
              ×
            </button>

            {selectedRequest.catPhoto ? (
              <img
                className="request-modal-image"
                src={selectedRequest.catPhoto}
                alt={selectedRequest.catName}
              />
            ) : (
              <div className="request-modal-image request-modal-image-placeholder">
                <FiImage size={24} />
              </div>
            )}

            <div className="request-modal-content">
              <h3>{selectedRequest.catName}</h3>
              <p className="request-modal-meta">
                {selectedRequest.typeLabel || (selectedRequest.type === 'foster' ? 'Foster Care' : 'Adoption')}
                {selectedRequest.catBreed ? ` • ${selectedRequest.catBreed}` : ''}
                {formatCatAge(selectedRequest.catAge) ? ` • ${formatCatAge(selectedRequest.catAge)}` : ''}
              </p>
              {selectedRequest.catDescription ? (
                <p className="request-modal-description">{selectedRequest.catDescription}</p>
              ) : null}
              <div className="request-modal-chips">
                {selectedRequest.catSex ? <span className="request-chip">Sex: {selectedRequest.catSex}</span> : null}
                {selectedRequest.catPersonality ? (
                  <span className="request-chip">Personality: {selectedRequest.catPersonality}</span>
                ) : null}
                <span className="request-chip">Status: {selectedRequest.statusLabel}</span>
              </div>

              <div className="request-modal-applicant">
                <h4>Applicant details</h4>
                <p><strong>Name:</strong> {selectedRequest.applicantName || 'Account user'}</p>
                {selectedRequest.applicantEmail ? (
                  <p><strong>Email:</strong> {selectedRequest.applicantEmail}</p>
                ) : null}
                {selectedRequest.applicantPhone ? (
                  <p><strong>Phone:</strong> {selectedRequest.applicantPhone}</p>
                ) : null}
                {selectedRequest.comment ? (
                  <p><strong>Comment:</strong> {selectedRequest.comment}</p>
                ) : null}
                <p>
                  <strong>Created:</strong>{' '}
                  {selectedRequest.createdAt
                    ? new Date(selectedRequest.createdAt).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </article>
        </div>
      ) : null}
      <BottomNav active="requests" />
    </div>
  );
};

export default ManagerRequestsPage;
