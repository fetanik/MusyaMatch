import Layout from '../components/Layout';
import { useEffect, useMemo, useState } from 'react';
import '../styles/Gallery.css';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n/I18nContext';
import { useMessages } from '../components/MessagesContext';
import { resolveUploadedImageUrl } from '../utils/mediaUrl';
import { apiUrl } from '../utils/apiUrl';
import {
  formatFosterDisplayDate,
  getCatFosterPeriod,
  isFosterPeriodWithinOwnerRange,
} from '../utils/fosterDates';

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const fromUserObject = Number(user.userId || user.id);
    if (Number.isFinite(fromUserObject) && fromUserObject > 0) {
      return fromUserObject;
    }
  } catch {
    // fallback below
  }

  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user?.name || '').trim() || localStorage.getItem('userName') || '';
  } catch {
    return localStorage.getItem('userName') || '';
  }
};

const getStoredUserPhone = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return (user?.phone || '').trim();
  } catch {
    return '';
  }
};

const emptyFosterForm = {
  experienceLevel: 'beginner',
  startDate: '',
  endDate: '',
  comment: '',
  phone: '',
};

const isPrivateFosterListing = (cat) => {
  if (!cat) return false;
  const source = (cat.source || '').toLowerCase();
  const listingType = (cat.listingType || '').toLowerCase();
  const listingStatus = (cat.listingStatus || '').toLowerCase();
  return source === 'private' && (listingType === 'foster' || listingStatus === 'pending');
};

const isCatVisibleInGallery = (cat) => {
  const source = (cat.source || 'shelter').toLowerCase();
  const listingType = (cat.listingType || '').toLowerCase();
  const listingStatus = (cat.listingStatus || '').toLowerCase();

  if (['adopted', 'placed', 'hidden'].includes(listingStatus)) {
    return false;
  }

  if (source === 'shelter') {
    return true;
  }

  if (source === 'private' && (listingType === 'foster' || listingStatus === 'pending')) {
    return true;
  }

  return false;
};

const getGalleryBadgeLabel = (cat) => {
  const listingType = (cat.listingType || '').toLowerCase();
  const listingStatus = (cat.listingStatus || '').toLowerCase();

  if (listingType === 'foster' || listingStatus === 'pending') {
    return 'fostered';
  }

  return (cat.source || 'shelter').toLowerCase();
};

const getValidImageUrl = (cat) => {
  const url = (cat?.image_url || '').trim();
  if (!url || url === 'null' || url === 'undefined') return '';
  return resolveUploadedImageUrl(url);
};

/** API / DB use `gender` (enum); some flows also set `sex` — gallery filters must use both. */
const getCatSexValue = (cat) => {
  const raw = (cat?.sex ?? cat?.gender ?? '').toString().trim().toLowerCase();
  if (raw === 'm' || raw === 'boy') return 'male';
  if (raw === 'f' || raw === 'girl') return 'female';
  if (raw === 'male' || raw === 'female') return raw;
  return raw;
};

const getCatAgeLabel = (cat) => {
  if (Number.isFinite(cat?.age)) {
    const numericAge = Number(cat.age);
    if (numericAge < 1) {
      const months = Math.max(1, Math.round(numericAge * 12));
      return `${months} month${months === 1 ? '' : 's'}`;
    }
    return `${numericAge} year${numericAge === 1 ? '' : 's'}`;
  }

  if (!cat?.birthDate) return '';
  const birth = new Date(cat.birthDate);
  if (Number.isNaN(birth.getTime())) return '';

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  const dayDiff = now.getDate() - birth.getDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years -= 1;
  }
  if (years < 0) return '';

  if (years === 0) {
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + monthDiff;
    if (dayDiff < 0) {
      months -= 1;
    }
    months = Math.max(1, months);
    return `${months} month${months === 1 ? '' : 's'}`;
  }

  return `${years} year${years === 1 ? '' : 's'}`;
};

const badgeLabelKey = (slug) => {
  const s = String(slug || '').toLowerCase();
  if (s === 'fostered') return 'gal.badgeFostered';
  if (s === 'shelter') return 'gal.badgeShelter';
  if (s === 'private') return 'gal.badgePrivate';
  return null;
};

const Gallery = () => {
  const { t, locale } = useI18n();
  const { notify } = useMessages();
  const dateLocale = locale === 'uk' ? 'uk-UA' : 'en-US';
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCat, setSelectedCat] = useState(null);
  const [fosterSubmitting, setFosterSubmitting] = useState(false);
  const [fosterError, setFosterError] = useState('');
  const [requestType, setRequestType] = useState('adoption');
  const [fosterForm, setFosterForm] = useState(() => ({ ...emptyFosterForm }));
  const currentUserId = getCurrentUserId();
  const [filters, setFilters] = useState({
    source: 'all',
    sex: '',
    urgency: '',
    breed: '',
  });

  const translateBadge = (slug) => {
    const key = badgeLabelKey(slug);
    return key ? t(key) : String(slug || '');
  };

  const translateUrgency = (u) => {
    const k = String(u || '').toLowerCase();
    if (k === 'low' || k === 'medium' || k === 'immediate') return t(`gal.${k}`);
    return u || '';
  };

  const translateSex = (s) => {
    const k = String(s || '').toLowerCase();
    if (k === 'male') return t('gal.male');
    if (k === 'female') return t('gal.female');
    return s || '';
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch(apiUrl('/api/cats'));
        if (!response.ok) {
          throw new Error(t('gal.failLoad'));
        }
        const data = await response.json();
        setCats(Array.isArray(data) ? data : []);
      } catch (fetchError) {
        setError(fetchError.message || t('gal.failLoad'));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [t]);

  useEffect(() => {
    if (!selectedCat) {
      return undefined;
    }

    const onEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedCat(null);
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
    };
  }, [selectedCat]);

  useEffect(() => {
    setFosterError('');

    if (!selectedCat) {
      return undefined;
    }

    const privateFoster = isPrivateFosterListing(selectedCat);
    setRequestType(
      privateFoster || String(selectedCat?.listingType || '').toLowerCase() === 'foster'
        ? 'foster'
        : 'adoption',
    );

    const ownerPeriod = getCatFosterPeriod(selectedCat);
    setFosterForm({
      ...emptyFosterForm,
      startDate: ownerPeriod.startDate,
      endDate: ownerPeriod.endDate,
      phone: getStoredUserPhone(),
    });

    let cancelled = false;
    if (!currentUserId) {
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const response = await fetch(apiUrl(`/api/users/profile/${currentUserId}`));
        if (!response.ok || cancelled) return;
        const data = await response.json();
        const fromApi = (data?.phone || '').trim();
        if (!cancelled && fromApi) {
          setFosterForm((prev) => ({ ...prev, phone: fromApi }));
        }
      } catch {
        /* profile optional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCat, currentUserId]);

  const filteredCats = useMemo(
    () =>
      cats.filter((cat) => {
        const source = (cat.source || 'shelter').toLowerCase();
        const listingType = (cat.listingType || '').toLowerCase();
        const listingStatus = (cat.listingStatus || '').toLowerCase();

        const visibleInGallery = isCatVisibleInGallery(cat);

        const sourceMatch =
          filters.source === 'all'
            ? true
            : filters.source === 'private'
              ? source === 'private' && (listingType === 'foster' || listingStatus === 'pending')
              : source === filters.source;

        const sexMatch = !filters.sex || getCatSexValue(cat) === filters.sex;
        const urgencyMatch = !filters.urgency || (cat.urgency || '') === filters.urgency;
        const breedMatch =
          !filters.breed || (cat.breed || '').toLowerCase().includes(filters.breed.toLowerCase());

        return visibleInGallery && sourceMatch && sexMatch && urgencyMatch && breedMatch;
      }),
    [cats, filters],
  );

  const onFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onFosterFormChange = (key, value) => {
    setFosterForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFosterRequest = async () => {
    if (!selectedCat?.id || fosterSubmitting) {
      return;
    }
    if (!currentUserId) {
      setFosterError(t('gal.loginFirst'));
      return;
    }

    const fosterMode = isPrivateFosterListing(selectedCat) || requestType === 'foster';

    const phoneTrim = fosterForm.phone.trim();
    if (phoneTrim.length < 5 || phoneTrim.length > 50) {
      setFosterError(t('gal.fosterPhoneInvalid'));
      return;
    }

    if (fosterMode) {
      const ownerPeriod = getCatFosterPeriod(selectedCat);
      const startDate = fosterForm.startDate;
      const endDate = fosterForm.endDate;

      if (!startDate || !endDate) {
        setFosterError(
          ownerPeriod.startDate && ownerPeriod.endDate
            ? t('gal.fosterPeriodRequired')
            : t('gal.fosterPeriodOwnerMissing'),
        );
        return;
      }
      if (endDate < startDate) {
        setFosterError(t('gal.fosterEndBeforeStart'));
        return;
      }
      if (
        ownerPeriod.startDate &&
        ownerPeriod.endDate &&
        !isFosterPeriodWithinOwnerRange(
          startDate,
          endDate,
          ownerPeriod.startDate,
          ownerPeriod.endDate,
        )
      ) {
        setFosterError(t('gal.fosterPeriodOutsideOwner'));
        return;
      }
    }

    try {
      setFosterSubmitting(true);
      setFosterError('');

      if (fosterMode) {
        const body = JSON.stringify({
          userId: currentUserId,
          type: 'foster',
          experienceLevel: fosterForm.experienceLevel,
          startDate: fosterForm.startDate,
          endDate: fosterForm.endDate,
          comment: fosterForm.comment.trim(),
          phone: phoneTrim,
        });

        let response = await fetch(apiUrl(`/api/cats/${selectedCat.id}/foster-request`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });

        if (response.status === 404) {
          response = await fetch(apiUrl(`/api/cats/${selectedCat.id}/request`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
          });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || t('gal.failSend'));
        }

        void notify(payload.message || t('gal.reqSent'), {
          type: 'success',
          title: t('msg.successTitle'),
        });

        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.phone = phoneTrim;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        } catch {
          /* ignore */
        }
      } else {
        const requestBody = JSON.stringify({
          userId: currentUserId,
          type: 'adoption',
          experienceLevel: fosterForm.experienceLevel,
          comment: fosterForm.comment.trim(),
          phone: phoneTrim,
        });

        let response = await fetch(apiUrl(`/api/cats/${selectedCat.id}/request`), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

        if (response.status === 404) {
          response = await fetch(apiUrl(`/api/cats/${selectedCat.id}/foster-request`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          });
        }

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.message || t('gal.failSend'));
        }

        void notify(payload.message || t('gal.reqSent'), {
          type: 'success',
          title: t('msg.successTitle'),
        });

        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.phone = phoneTrim;
            localStorage.setItem('user', JSON.stringify(parsed));
          }
        } catch {
          /* ignore */
        }
      }
    } catch (requestError) {
      setFosterError(requestError.message);
    } finally {
      setFosterSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="gallery-page">
        <div className="gallery-intro">
          <h2 className="gallery-title">{t('gal.title')}</h2>
        </div>
        <div className="gallery-body">
          <aside className="filters-panel" aria-label={t('gal.filtersAria')}>
            <h3 className="filters-panel-title">{t('gal.filtersTitle')}</h3>

            <div className="filter-group">
              <label htmlFor="filter-source">{t('gal.category')}</label>
              <select
                id="filter-source"
                value={filters.source}
                onChange={(event) => onFilterChange('source', event.target.value)}
              >
                <option value="all">{t('gal.allCats')}</option>
                <option value="shelter">{t('gal.shelterOnly')}</option>
                <option value="private">{t('gal.privateFoster')}</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-sex">{t('gal.sex')}</label>
              <select
                id="filter-sex"
                value={filters.sex}
                onChange={(event) => onFilterChange('sex', event.target.value)}
              >
                <option value="">{t('gal.any')}</option>
                <option value="male">{t('gal.male')}</option>
                <option value="female">{t('gal.female')}</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-urgency">{t('gal.urgency')}</label>
              <select
                id="filter-urgency"
                value={filters.urgency}
                onChange={(event) => onFilterChange('urgency', event.target.value)}
              >
                <option value="">{t('gal.any')}</option>
                <option value="low">{t('gal.low')}</option>
                <option value="medium">{t('gal.medium')}</option>
                <option value="immediate">{t('gal.immediate')}</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filter-breed">{t('gal.breed')}</label>
              <input
                id="filter-breed"
                type="text"
                placeholder={t('gal.phBreed')}
                value={filters.breed}
                onChange={(event) => onFilterChange('breed', event.target.value)}
              />
            </div>
          </aside>

          <main className="gallery-main" aria-label={t('gal.listAria')}>
            {loading && <p className="status-message">{t('gal.loading')}</p>}
            {error && <p className="form-error">{error}</p>}
            {!loading && !error && (
              <div className="cat-grid">
                {filteredCats.map((cat) => (
                  <div
                    className="cat-card"
                    key={cat.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedCat(cat)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedCat(cat);
                      }
                    }}
                  >
                    <div className="image-wrapper">
                      {getValidImageUrl(cat) ? (
                        <img src={getValidImageUrl(cat)} alt={cat.name} />
                      ) : (
                        <div className="cat-modal-image" style={{ display: 'grid', placeItems: 'center', color: '#9aa3b2' }}>
                          {t('gal.noPhoto')}
                        </div>
                      )}
                      <span className={`badge ${getGalleryBadgeLabel(cat)}`}>
                       {translateBadge(getGalleryBadgeLabel(cat))}
                      </span>
                    </div>

                    <div className="cat-info">
                      <div className="card-header">
                        <h3>{cat.name}</h3>
                        {cat.personality && <span className="ai-tag">✨ {cat.personality}</span>}
                      </div>

                      <p className="specs">
                        {cat.breed || t('gal.unknownBreed')}
                        {getCatAgeLabel(cat) ? ` • ${getCatAgeLabel(cat)}` : ''}
                      </p>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
      {selectedCat && (
        <div
          className="cat-modal-backdrop"
          role="presentation"
          onClick={() => setSelectedCat(null)}
        >
          <article
            className="cat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('gal.modalAria', { name: selectedCat.name })}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="cat-modal-close"
              onClick={() => setSelectedCat(null)}
              aria-label={t('gal.closeModal')}
            >
              x
            </button>

            {getValidImageUrl(selectedCat) ? (
              <img
                className="cat-modal-image"
                src={getValidImageUrl(selectedCat)}
                alt={selectedCat.name}
              />
            ) : (
              <div className="cat-modal-image" style={{ display: 'grid', placeItems: 'center', color: '#9aa3b2' }}>
                {t('gal.noPhoto')}
              </div>
            )}

            <div className="cat-modal-content">
              <h3>{selectedCat.name}</h3>
              <p className="cat-modal-meta">
                {selectedCat.breed || t('gal.unknownBreed')}
                {getCatAgeLabel(selectedCat) ? ` • ${getCatAgeLabel(selectedCat)}` : ''}
              </p>
              <p className="cat-modal-description">
                {selectedCat.description || t('gal.noDescription')}
              </p>
              <div className="cat-modal-chips">
                {selectedCat.source && (
                  <span className="cat-chip">
                    {t('gal.lblStatus')}: {translateBadge(getGalleryBadgeLabel(selectedCat))}
                  </span>
                )}
                {(selectedCat.sex || selectedCat.gender) && (
                  <span className="cat-chip">
                    {t('gal.lblSex')}: {translateSex(selectedCat.sex || selectedCat.gender)}
                  </span>
                )}
                {selectedCat.urgency && (
                  <span className="cat-chip">
                    {t('gal.lblUrgency')}: {translateUrgency(selectedCat.urgency)}
                  </span>
                )}
                {selectedCat.personality && (
                  <span className="cat-chip">
                    {t('gal.lblPersonality')}: {selectedCat.personality}
                  </span>
                )}
              </div>
              {(() => {
                const ownerPeriod = getCatFosterPeriod(selectedCat);
                const showOwnerPeriod =
                  (isPrivateFosterListing(selectedCat) || requestType === 'foster') &&
                  ownerPeriod.startDate &&
                  ownerPeriod.endDate;
                if (!showOwnerPeriod) return null;
                return (
                  <p className="cat-modal-foster-period">
                    {t('gal.availableFosterPeriod', {
                      start: formatFosterDisplayDate(ownerPeriod.startDate, dateLocale),
                      end: formatFosterDisplayDate(ownerPeriod.endDate, dateLocale),
                    })}
                  </p>
                );
              })()}
              {(() => {
                const ownerPeriod = getCatFosterPeriod(selectedCat);
                if (!ownerPeriod.city && !ownerPeriod.comment) return null;
                return (
                  <div className="cat-modal-foster-notes">
                    {ownerPeriod.city ? (
                      <p className="cat-modal-description">
                        <strong>{t('gal.fosterOwnerCity')}:</strong> {ownerPeriod.city}
                      </p>
                    ) : null}
                    {ownerPeriod.comment ? (
                      <p className="cat-modal-description">
                        <strong>{t('gal.fosterOwnerNote')}:</strong> {ownerPeriod.comment}
                      </p>
                    ) : null}
                  </div>
                );
              })()}
              <div className="cat-modal-actions">
                <div className="request-form-panel">
                  {!isPrivateFosterListing(selectedCat) && (
                    <div className="request-form-field">
                      <label htmlFor="request-type">{t('gal.reqType')}</label>
                      <select
                        id="request-type"
                        value={requestType}
                        onChange={(event) => setRequestType(event.target.value)}
                      >
                        <option value="adoption">{t('gal.optAdoption')}</option>
                        <option value="foster">{t('gal.optFoster')}</option>
                      </select>
                    </div>
                  )}

                  {(isPrivateFosterListing(selectedCat) ||
                    requestType === 'foster' ||
                    requestType === 'adoption') && (
                    <>
                      <div className="request-form-field">
                        <label htmlFor="foster-user-readonly">{t('gal.fosterUser')}</label>
                        <input
                          id="foster-user-readonly"
                          type="text"
                          readOnly
                          value={getCurrentUserName() || t('gal.fosterUserPlaceholder')}
                        />
                      </div>
                      <div className="request-form-field">
                        <label htmlFor="foster-phone">{t('gal.fosterPhone')}</label>
                        <input
                          id="foster-phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder={t('gal.fosterPhonePh')}
                          value={fosterForm.phone}
                          onChange={(event) => onFosterFormChange('phone', event.target.value)}
                        />
                      </div>
                      <div className="request-form-field">
                        <label htmlFor="foster-experience">{t('gal.fosterExperience')}</label>
                        <select
                          id="foster-experience"
                          value={fosterForm.experienceLevel}
                          onChange={(event) =>
                            onFosterFormChange('experienceLevel', event.target.value)
                          }
                        >
                          <option value="beginner">{t('gal.expBeginner')}</option>
                          <option value="intermediate">{t('gal.expIntermediate')}</option>
                          <option value="experienced">{t('gal.expExperienced')}</option>
                        </select>
                      </div>
                    </>
                  )}

                  {(isPrivateFosterListing(selectedCat) || requestType === 'foster') &&
                    (() => {
                      const ownerPeriod = getCatFosterPeriod(selectedCat);
                      const hasOwnerPeriod = Boolean(
                        ownerPeriod.startDate && ownerPeriod.endDate,
                      );

                      return (
                        <div className="foster-form-dates">
                          <p className="foster-period-owner-label">
                            {hasOwnerPeriod
                              ? t('gal.fosterPeriodAdjustHint')
                              : t('gal.fosterPeriodPickHint')}
                          </p>
                          <div className="foster-period-readonly-grid">
                            <div className="request-form-field">
                              <label htmlFor="foster-start">{t('gal.fosterStart')}</label>
                              <input
                                id="foster-start"
                                type="date"
                                min={hasOwnerPeriod ? ownerPeriod.startDate : undefined}
                                max={
                                  hasOwnerPeriod
                                    ? fosterForm.endDate || ownerPeriod.endDate
                                    : undefined
                                }
                                value={fosterForm.startDate}
                                onChange={(event) =>
                                  onFosterFormChange('startDate', event.target.value)
                                }
                              />
                            </div>
                            <div className="request-form-field">
                              <label htmlFor="foster-end">{t('gal.fosterEnd')}</label>
                              <input
                                id="foster-end"
                                type="date"
                                min={
                                  hasOwnerPeriod
                                    ? fosterForm.startDate || ownerPeriod.startDate
                                    : undefined
                                }
                                max={hasOwnerPeriod ? ownerPeriod.endDate : undefined}
                                value={fosterForm.endDate}
                                onChange={(event) =>
                                  onFosterFormChange('endDate', event.target.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                  {(isPrivateFosterListing(selectedCat) ||
                    requestType === 'foster' ||
                    requestType === 'adoption') && (
                    <div className="request-form-field">
                      <label htmlFor="request-comment-shared">{t('gal.fosterComment')}</label>
                      <textarea
                        id="request-comment-shared"
                        rows={3}
                        placeholder={
                          requestType === 'adoption' && !isPrivateFosterListing(selectedCat)
                            ? t('gal.adoptCommentPh')
                            : t('gal.fosterCommentPh')
                        }
                        value={fosterForm.comment}
                        onChange={(event) => onFosterFormChange('comment', event.target.value)}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    className="btn-foster-request"
                    onClick={handleFosterRequest}
                    disabled={fosterSubmitting}
                  >
                    {fosterSubmitting
                      ? t('gal.sending')
                      : isPrivateFosterListing(selectedCat) || requestType === 'foster'
                        ? t('gal.requestFosterCare')
                        : t('gal.requestAdoption')}
                  </button>
                  {fosterError && <p className="form-error">{fosterError}</p>}
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
      <BottomNav active="gallery" />
    </Layout>
  );
};
export default Gallery;