import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiX, FiRotateCcw, FiImage } from 'react-icons/fi';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import '../styles/ManagerRequestsPage.css';
import { useI18n } from '../i18n/I18nContext';

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
  const { t } = useI18n();
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
      setPageError(t('mgrReq.errAccount'));
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
      setPageError(t('mgrReq.errLoad'));
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
                  status === 'approved'
                    ? t('mgrReq.statusApproved')
                    : status === 'rejected'
                      ? t('mgrReq.statusRejected')
                      : t('mgrReq.statusPending'),
                updatedAt: payload?.updatedAt || item.updatedAt,
              }
            : item
        )
      );

      if (status === 'approved') {
        await notify(t('mgrReq.approved'), { type: 'success', title: t('common.success') });
      } else if (status === 'rejected') {
        await notify(t('mgrReq.rejected'), { type: 'success', title: t('common.success') });
      } else {
        await notify(t('mgrReq.pending'), { type: 'success', title: t('common.success') });
      }
    } catch (error) {
      console.error(error);
      await notify(t('mgrReq.errUpdate'), { type: 'error', title: t('common.error') });
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
    return t('chat.years', { n: parsed });
  };

  return (
    <div className="manager-requests-page">
      <header className="requests-hero">
        <div className="requests-header-row">
          <button
            type="button"
            className="requests-back-btn"
            onClick={() => navigate('/manager/profile')}
            aria-label={t('mgrReq.backAria')}
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="requests-title-wrap">
            <h1>{t('mgrReq.pageTitle')}</h1>
            <p>{t('mgrReq.pageSub')}</p>
          </div>
        </div>
      </header>

      <main className="requests-content">
        <section className="requests-summary-card">
          <div>
            <h2>{t('mgrReq.pendingTitle')}</h2>
            <p>{t('mgrReq.pendingSub', { n: totalPending })}</p>
          </div>
          <div className="requests-filters">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">{t('mgrReq.fAll')}</option>
              <option value="pending">{t('mgrReq.fPending')}</option>
              <option value="approved">{t('mgrReq.fApproved')}</option>
              <option value="rejected">{t('mgrReq.fRejected')}</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">{t('mgrReq.tAll')}</option>
              <option value="adoption">{t('mgrReq.tAdopt')}</option>
              <option value="foster">{t('mgrReq.tFoster')}</option>
            </select>
          </div>
        </section>

        {loading ? (
          <div className="requests-empty">{t('mgrReq.loading')}</div>
        ) : pageError ? (
          <div className="requests-empty">{pageError}</div>
        ) : visibleRequests.length === 0 ? (
          <div className="requests-empty">{t('mgrReq.empty')}</div>
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
                    <p>
                      {request.typeLabel ||
                        (request.type === 'foster' ? t('mgrReq.fosterCare') : t('mgrReq.adoption'))}
                    </p>
                  </div>
                </div>

                <div className="request-details">
                  <p>
                    <strong>{t('mgrReq.applicant')}:</strong>{' '}
                    {request.applicantName || request.applicantEmail || t('mgrReq.accountUser')}
                  </p>
                  {request.applicantEmail ? (
                    <p>
                      <strong>{t('db.email')}:</strong> {request.applicantEmail}
                    </p>
                  ) : null}
                  {request.applicantPhone ? (
                    <p>
                      <strong>{t('db.phone')}:</strong> {request.applicantPhone}
                    </p>
                  ) : null}
                  {request.comment ? (
                    <p>
                      <strong>{t('db.comment')}:</strong> {request.comment}
                    </p>
                  ) : null}
                  <p>
                    <strong>{t('db.status')}:</strong>{' '}
                    {request.statusLabel || t('mgrReq.statusPending')}
                  </p>
                  <p>
                    <strong>{t('db.created')}:</strong>{' '}
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString()
                      : t('mgrReq.unknown')}
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
                        {t('mgrReq.approveBtn')}
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
                        {t('mgrReq.rejectBtn')}
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
                      {t('mgrReq.setPending')}
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
            aria-label={t('mgrReq.modalAria')}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="request-modal-close"
              onClick={() => setSelectedRequest(null)}
              aria-label={t('mgrReq.closeModal')}
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
                {selectedRequest.typeLabel ||
                  (selectedRequest.type === 'foster' ? t('mgrReq.fosterCare') : t('mgrReq.adoption'))}
                {selectedRequest.catBreed ? ` • ${selectedRequest.catBreed}` : ''}
                {formatCatAge(selectedRequest.catAge) ? ` • ${formatCatAge(selectedRequest.catAge)}` : ''}
              </p>
              {selectedRequest.catDescription ? (
                <p className="request-modal-description">{selectedRequest.catDescription}</p>
              ) : null}
              <div className="request-modal-chips">
                {selectedRequest.catSex ? (
                  <span className="request-chip">
                    {t('gal.lblSex')}: {selectedRequest.catSex}
                  </span>
                ) : null}
                {selectedRequest.catPersonality ? (
                  <span className="request-chip">
                    {t('gal.lblPersonality')}: {selectedRequest.catPersonality}
                  </span>
                ) : null}
                <span className="request-chip">
                  {t('db.status')}: {selectedRequest.statusLabel}
                </span>
              </div>

              <div className="request-modal-applicant">
                <h4>{t('mgrReq.applicant')}</h4>
                <p>
                  <strong>{t('profUser.fullName')}:</strong>{' '}
                  {selectedRequest.applicantName || t('mgrReq.accountUser')}
                </p>
                {selectedRequest.applicantEmail ? (
                  <p>
                    <strong>{t('db.email')}:</strong> {selectedRequest.applicantEmail}
                  </p>
                ) : null}
                {selectedRequest.applicantPhone ? (
                  <p>
                    <strong>{t('db.phone')}:</strong> {selectedRequest.applicantPhone}
                  </p>
                ) : null}
                {selectedRequest.comment ? (
                  <p>
                    <strong>{t('db.comment')}:</strong> {selectedRequest.comment}
                  </p>
                ) : null}
                <p>
                  <strong>{t('db.created')}:</strong>{' '}
                  {selectedRequest.createdAt
                    ? new Date(selectedRequest.createdAt).toLocaleString()
                    : t('mgrReq.unknown')}
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
