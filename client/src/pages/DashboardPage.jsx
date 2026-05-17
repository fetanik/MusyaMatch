import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/DashboardPage.css';

import {
  Bell,
  Award,
  Star,
  Heart,
  Cpu,
  MessageSquare,
  Users,
  MapPin,
  TrendingUp,
  Cat,
  PlusCircle,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useMessages } from '../components/MessagesContext';
import { useI18n } from '../i18n/I18nContext';
import { resolveUploadedImageUrl } from '../utils/mediaUrl';
import { apiUrl } from '../utils/apiUrl';

const CATS_API = apiUrl('/api/cats');
const USERS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/users`;
const ACHIEVEMENTS_API = `${import.meta.env.VITE_API_BASE_URL || ''}/api/achievements`;
const NEEDS_API_BASE_URL = apiUrl('/api/needs');

const emptyForm = {
  name: '',
  breed: '',
  gender: '',
  birthDate: '',
  personality: '',
  description: '',
  vaccinations: [],
  imageFile: null,
  imagePreview: '',
};

const emptyFosterForm = {
  startDate: '',
  endDate: '',
  comment: '',
  location: '',
  urgency: '',
};

const normalizeVaccinations = (vaccinations) => {
  if (Array.isArray(vaccinations)) {
    return vaccinations
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }

  return [];
};

const getCurrentUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const fromUserObject = Number(user.userId || user.id);
    if (Number.isFinite(fromUserObject) && fromUserObject > 0) {
      return fromUserObject;
    }
  } catch {
    // fallback to legacy storage keys below
  }

  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getStatusMeta = (cat, t) => {
  if (cat.listingType === 'foster' || cat.listingStatus === 'pending') {
    return { label: t('db.statusFostered'), className: 'fostered' };
  }

  const catOrigin = String(cat.sourceType || cat.source || '').toLowerCase();
  const isShelterOrigin = catOrigin === 'shelter';
  if ((cat.listingStatus === 'placed' || cat.listingStatus === 'adopted') && isShelterOrigin) {
    return { label: t('db.statusAdopted'), className: 'adopted' };
  }

  return { label: t('db.statusPrivate'), className: 'available' };
};

const formatBirthDate = (birthDate, t) => {
  if (!birthDate) return t('db.notSpecified');
  return birthDate;
};

const formatShortDate = (value, localeTag = 'en-US') => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatRequestDateTime = (value, localeTag, t) => {
  if (!value) return t('db.notSpecified');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRequestType = (type, t) => {
  if (type === 'foster') return t('db.foster');
  if (type === 'adoption') return t('db.adoption');
  return type || '—';
};

const formatRequestStatus = (status, t) => {
  if (status === 'approved') return t('db.statusApproved');
  if (status === 'rejected') return t('db.statusRejected');
  return t('db.statusPending');
};

const getCatOwnerId = (cat) => {
  const ownerId = Number(
    cat?.userId ??
      cat?.user_id ??
      cat?.basicUserId ??
      cat?.basic_user_id ??
      cat?.ownerId ??
      null
  );
  return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
};

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getCurrentUserContext = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      userId:
        toPositiveInt(user.userId) ??
        toPositiveInt(user.id) ??
        toPositiveInt(localStorage.getItem('userId')) ??
        toPositiveInt(localStorage.getItem('basicUserId')) ??
        toPositiveInt(localStorage.getItem('currentUserId')),
      shelterId:
        toPositiveInt(user.shelterId) ??
        toPositiveInt(user.shelter_id) ??
        toPositiveInt(localStorage.getItem('shelterId')) ??
        toPositiveInt(localStorage.getItem('currentShelterId')),
    };
  } catch {
    return {
      userId:
        toPositiveInt(localStorage.getItem('userId')) ??
        toPositiveInt(localStorage.getItem('basicUserId')) ??
        toPositiveInt(localStorage.getItem('currentUserId')),
      shelterId:
        toPositiveInt(localStorage.getItem('shelterId')) ??
        toPositiveInt(localStorage.getItem('currentShelterId')),
    };
  }
};

const getNeedShelterInfo = (need, t) => {
  if (need?.shelter?.name || need?.shelter?.address) {
    return need.shelter;
  }

  const nameFromNeed =
    need?.shelterName ||
    need?.shelter_name ||
    need?.organizationName ||
    need?.organization_name;
  const addressFromNeed =
    need?.shelterAddress ||
    need?.shelter_address ||
    need?.address ||
    need?.location;
  if (nameFromNeed || addressFromNeed) {
    return {
      name: nameFromNeed || t('sNeeds.shelterFallback'),
      address: addressFromNeed || '',
    };
  }
  return null;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { notify, confirm } = useMessages();
  const { locale, t } = useI18n();
  const dateLocale = locale === 'uk' ? 'uk-UA' : 'en-US';

  const userId = getCurrentUserId();
  const userName = localStorage.getItem('userName') || 'Alex Johnson';

  const [cats, setCats] = useState([]);
  const [catVaccinations, setCatVaccinations] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [achievementsSummary, setAchievementsSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [fosterLoadingId, setFosterLoadingId] = useState(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [openCalendarAfterSave, setOpenCalendarAfterSave] = useState(false);

  const [isFosterModalOpen, setIsFosterModalOpen] = useState(false);
  const [selectedFosterCat, setSelectedFosterCat] = useState(null);
  const [fosterForm, setFosterForm] = useState(emptyFosterForm);

  const [sentRequests, setSentRequests] = useState([]);
  const [sentRequestsLoading, setSentRequestsLoading] = useState(false);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [receivedRequestsLoading, setReceivedRequestsLoading] = useState(false);
  const [requestActionLoadingId, setRequestActionLoadingId] = useState(null);
  const [sentRequestDeletingId, setSentRequestDeletingId] = useState(null);
  const [receivedRequestDeletingId, setReceivedRequestDeletingId] = useState(null);

  const [needs, setNeeds] = useState([]);
  const carouselRef = useRef(null);
  const [showCarouselLeft, setShowCarouselLeft] = useState(false);
  const [showCarouselRight, setShowCarouselRight] = useState(false);

  const SCROLL_EDGE_EPS = 3;

  const updateCarouselArrows = useCallback(() => {
    const el = carouselRef.current;
    if (!el) {
      setShowCarouselLeft(false);
      setShowCarouselRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = Math.max(0, scrollWidth - clientWidth);
    const overflow = maxScroll > SCROLL_EDGE_EPS;
    if (!overflow) {
      setShowCarouselLeft(false);
      setShowCarouselRight(false);
      return;
    }
    setShowCarouselLeft(scrollLeft > SCROLL_EDGE_EPS);
    setShowCarouselRight(scrollLeft < maxScroll - SCROLL_EDGE_EPS);
  }, []);

  const fetchCatVaccinations = useCallback(async (catList) => {
    const records = {};

    await Promise.all(
      catList.map(async (cat) => {
        try {
          const response = await fetch(`${CATS_API}/${cat.id}/vaccinations`);
          if (!response.ok) {
            records[cat.id] = [];
            return;
          }

          const data = await response.json();
          records[cat.id] = Array.isArray(data) ? data : [];
        } catch (error) {
          console.error('Failed to load vaccinations for cat', cat.id, error);
          records[cat.id] = [];
        }
      })
    );

    setCatVaccinations(records);
  }, []);

  const fetchMyCats = useCallback(async () => {
    try {
      setLoading(true);
      setPageError('');
      setCatVaccinations({});

      const response = await fetch(CATS_API);
      if (!response.ok) {
        throw new Error('Failed to load cats');
      }

      const data = await response.json();
      const allCats = Array.isArray(data) ? data : [];

      const myCats = allCats.filter((cat) => getCatOwnerId(cat) === userId);
      setCats(myCats);

      if (myCats.length > 0) {
        await fetchCatVaccinations(myCats);
      }
    } catch (error) {
      console.error(error);
      setPageError(error.message || t('gal.failLoad'));
    } finally {
      setLoading(false);
    }
  }, [userId, fetchCatVaccinations, t]);

  const fetchSentRequests = useCallback(async () => {
    if (!userId) return;
    try {
      setSentRequestsLoading(true);
      const response = await fetch(`${CATS_API}/foster-requests/sent/${userId}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load sent requests');
      }
      setSentRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load sent requests:', error);
    } finally {
      setSentRequestsLoading(false);
    }
  }, [userId]);

  const fetchReceivedRequests = useCallback(async () => {
    if (!userId) return;
    try {
      setReceivedRequestsLoading(true);
      const response = await fetch(`${CATS_API}/foster-requests/received/${userId}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to load foster requests');
      }
      setReceivedRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load foster requests:', error);
    } finally {
      setReceivedRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchSentRequests();
    fetchReceivedRequests();
  }, [userId, cats.length, fetchSentRequests, fetchReceivedRequests]);

  useEffect(() => {
    const fetchShelterByUserId = async (targetUserId) => {
      const parsedUserId = toPositiveInt(targetUserId);
      if (!parsedUserId) return null;
      const response = await fetch(apiUrl(`/api/shelter/profile/${parsedUserId}`));
      if (!response.ok) return null;
      const profile = await response.json().catch(() => null);
      if (!profile) return null;
      return {
        id: profile.shelterId || null,
        name: profile.name || profile.shelterName || '',
        address: profile.address || '',
        phone: profile.phone || '',
      };
    };

    const enrichNeedsWithShelter = async (items) => {
      const cache = new Map();
      return Promise.all(
        items.map(async (need) => {
          if (need?.shelter?.name || need?.shelter?.address) return need;
          const ownerUserId = toPositiveInt(need?.userId ?? need?.user_id);
          if (!ownerUserId) return need;
          if (!cache.has(ownerUserId)) {
            cache.set(ownerUserId, fetchShelterByUserId(ownerUserId));
          }
          const shelter = await cache.get(ownerUserId);
          return shelter ? { ...need, shelter } : need;
        })
      );
    };

    const loadNeedsForCarousel = async () => {
      try {
        const response = await fetch(NEEDS_API_BASE_URL);
        if (!response.ok) {
          throw new Error('Failed to load shelter needs');
        }

        const data = await response.json();
        let realNeeds = (Array.isArray(data) ? data : [])
          .filter((need) => String(need?.status || 'open').toLowerCase() === 'open')
          .map((need) => ({ ...need, _carouselKey: `real-${need.id}` }));

        realNeeds = await enrichNeedsWithShelter(realNeeds);
        setNeeds(realNeeds);
      } catch (error) {
        console.error('Failed to load needs for carousel:', error);
        setNeeds([]);
      }
    };

    if (!userId) {
      setLoading(false);
      setPageError(t('db.pageErrUserId'));
      loadNeedsForCarousel();
      return;
    }

    fetchMyCats();
    loadNeedsForCarousel();
  }, [fetchMyCats, userId, t]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`${USERS_API}/profile/${userId}`);
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || 'Failed to load user profile');
        }

        setUserProfile(data);
      } catch (error) {
        console.error('Failed to load user profile:', error);
      }
    };

    const fetchAchievementsSummary = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`${ACHIEVEMENTS_API}/${userId}/summary`);
        const data = await response.json().catch(() => null);
        if (response.ok) {
          setAchievementsSummary(data);
        }
      } catch (error) {
        console.error('Failed to load achievements summary:', error);
      }
    };

    fetchUserProfile();
    fetchAchievementsSummary();
  }, [userId]);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 300;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  useLayoutEffect(() => {
    updateCarouselArrows();
  }, [needs, updateCarouselArrows]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return undefined;
    updateCarouselArrows();
    el.addEventListener('scroll', updateCarouselArrows, { passive: true });
    el.addEventListener('scrollend', updateCarouselArrows);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateCarouselArrows) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateCarouselArrows);
    return () => {
      el.removeEventListener('scroll', updateCarouselArrows);
      el.removeEventListener('scrollend', updateCarouselArrows);
      ro?.disconnect();
      window.removeEventListener('resize', updateCarouselArrows);
    };
  }, [needs, updateCarouselArrows]);

  const fosterCount = useMemo(
    () =>
      cats.filter(
        (cat) => cat.listingType === 'foster' || cat.listingStatus === 'pending'
      ).length,
    [cats]
  );

  const achievementsCount = useMemo(() => {
    const definitions = Array.isArray(achievementsSummary?.definitions)
      ? achievementsSummary.definitions
      : [];
    const completedByType = achievementsSummary?.completedByType || {};

    return definitions.filter((def) => Number(completedByType[def.type] || 0) > 0).length;
  }, [achievementsSummary]);

  const balancePoints = Number(achievementsSummary?.points ?? 0);
  const lifetimePoints = Number(
    achievementsSummary?.pointsLifetime ?? achievementsSummary?.points_lifetime ?? balancePoints,
  );
  const maxLevels = 10;
  const pointsPerLevel = 250;
  const currentLevel = Math.min(
    maxLevels,
    Math.max(1, Math.floor(lifetimePoints / pointsPerLevel) + 1),
  );
  const pointsIntoLevel = Math.max(0, lifetimePoints - (currentLevel - 1) * pointsPerLevel);
  const progressPercent =
    currentLevel === maxLevels
      ? 100
      : Math.min(100, Math.max(0, (pointsIntoLevel / pointsPerLevel) * 100));
  const pointsToNext =
    currentLevel === maxLevels ? 0 : pointsPerLevel - pointsIntoLevel;
  const nextLevelText =
    currentLevel === maxLevels
      ? t('db.maxLevel')
      : t('db.ptsToNext', { n: pointsToNext, next: currentLevel + 1 });

  const levelShortLabel = useMemo(() => {
    const lvl = String(currentLevel);
    const full = t('db.levelParent', { level: currentLevel });
    const pos = full.indexOf(lvl);
    if (pos === -1) return full;
    return full.slice(0, pos + lvl.length).replace(/:+\s*$/, '').trim();
  }, [t, currentLevel]);

  const openAddCatModal = () => {
    setEditingCat(null);
    setForm({ ...emptyForm });
    setOpenCalendarAfterSave(false);
    setIsCatModalOpen(true);
  };

  const openEditCatModal = (cat) => {
    setEditingCat(cat);
    setForm({
      name: cat.name || '',
      breed: cat.breed || '',
      gender: cat.gender || '',
      birthDate: cat.birthDate || '',
      personality: cat.personality || '',
      description: cat.description || '',
      vaccinations: normalizeVaccinations(cat.vaccinations),
      imageFile: null,
      imagePreview: cat.image_url || '',
    });
    setIsCatModalOpen(true);
  };

  const closeCatModal = () => {
    setIsCatModalOpen(false);
    setEditingCat(null);
    setForm({ ...emptyForm });
    setOpenCalendarAfterSave(false);
  };

  const openFosterModal = (cat) => {
    setSelectedFosterCat(cat);
    const existingStart = cat.fosterStartDate || cat.foster_start_date || '';
    const existingEnd = cat.fosterEndDate || cat.foster_end_date || '';
    setFosterForm({
      startDate: existingStart ? String(existingStart).slice(0, 10) : '',
      endDate: existingEnd ? String(existingEnd).slice(0, 10) : '',
      comment: cat.fosterComment || cat.foster_comment || '',
      location:
        cat.fosterCity ||
        cat.foster_city ||
        userProfile?.address ||
        localStorage.getItem('userAddress') ||
        '',
      urgency: cat.urgency || '',
    });
    setIsFosterModalOpen(true);
  };

  const closeFosterModal = () => {
    setIsFosterModalOpen(false);
    setSelectedFosterCat(null);
    setFosterForm({ ...emptyFosterForm });
  };

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFosterFormChange = (field, value) => {
    setFosterForm((prev) => ({ ...prev, [field]: value }));
  };


  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;

    if (!file) {
      setForm((prev) => ({
        ...prev,
        imageFile: null,
        imagePreview: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: URL.createObjectURL(file),
    }));
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();

    if (!userId) {
      await notify(t('db.notifyUserId'), { type: 'error', title: t('common.error') });
      return;
    }

    if (!form.name.trim()) {
      await notify(t('db.notifyCatName'), { type: 'error', title: t('common.error') });
      return;
    }

    try {
      setSaveLoading(true);

      const formData = new FormData();
      formData.append('userId', String(userId));

      if (editingCat?.shelterId) {
        formData.append('shelterId', String(editingCat.shelterId));
      }

      formData.append('name', form.name.trim());
      formData.append('breed', form.breed.trim());
      formData.append('gender', form.gender);
      formData.append('birthDate', form.birthDate || '');
      formData.append('personality', form.personality || '');
      formData.append('description', form.description.trim());
      formData.append('vaccinations', JSON.stringify(form.vaccinations || []));
      formData.append('source', 'private');
      formData.append('sourceType', 'private');
      formData.append('listingType', editingCat?.listingType || 'adoption');
      formData.append('listingStatus', editingCat?.listingStatus || 'active');

      if (form.imageFile) {
        formData.append('image', form.imageFile);
      }

      const response = await fetch(
        editingCat ? `${CATS_API}/${editingCat.id}` : CATS_API,
        {
          method: editingCat ? 'PUT' : 'POST',
          body: formData,
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to save cat');
      }

      const shouldOpenCalendar = openCalendarAfterSave;
      closeCatModal();
      await fetchMyCats();

      const savedCatId = Number(data?.id);
      if (shouldOpenCalendar && Number.isInteger(savedCatId) && savedCatId > 0) {
        navigate(`/cats/${savedCatId}/vaccinations`, { state: { cat: data } });
      }
    } catch (error) {
      console.error(error);
      await notify(error.message || t('db.notifySaveFail'), { type: 'error', title: t('common.error') });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteCat = async (cat) => {
    const confirmed = await confirm(t('db.deleteConfirm', { name: cat.name }), {
      type: 'confirm',
      title: t('db.deleteTitle'),
      confirmText: t('db.deleteYes'),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      setDeleteLoadingId(cat.id);

      const response = await fetch(`${CATS_API}/${cat.id}`, {
        method: 'DELETE',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete cat');
      }

      await fetchMyCats();
    } catch (error) {
      console.error(error);
      await notify(error.message || t('db.notifyDeleteFail'), { type: 'error', title: t('common.error') });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleFosterCat = async (e) => {
    e.preventDefault();

    if (!selectedFosterCat) return;

    if (!fosterForm.startDate || !fosterForm.endDate) {
      await notify(t('db.notifyFosterPeriod'), { type: 'error', title: t('common.error') });
      return;
    }

    if (fosterForm.endDate < fosterForm.startDate) {
      await notify(t('db.notifyFosterDates'), { type: 'error', title: t('common.error') });
      return;
    }

    if (!fosterForm.urgency) {
      await notify(t('db.notifyFosterUrgent'), { type: 'error', title: t('common.error') });
      return;
    }

    try {
      setFosterLoadingId(selectedFosterCat.id);

      const updateResponse = await fetch(`${CATS_API}/${selectedFosterCat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingType: 'foster',
          listingStatus: 'pending',
          previousListingType:
            selectedFosterCat.previousListingType ||
            selectedFosterCat.listingType ||
            'adoption',
          previousListingStatus:
            selectedFosterCat.previousListingStatus ||
            selectedFosterCat.listingStatus ||
            'active',
          sourceType: selectedFosterCat.sourceType || 'private',
          source: selectedFosterCat.source || 'private',
          urgency: fosterForm.urgency,
          fosterStartDate: fosterForm.startDate,
          fosterEndDate: fosterForm.endDate,
          fosterCity: fosterForm.location || null,
          fosterComment: fosterForm.comment || null,
        }),
      });

      const updateData = await updateResponse.json().catch(() => ({}));

      if (!updateResponse.ok) {
        throw new Error(updateData?.message || 'Failed to update foster status');
      }

      await fetchMyCats();
      await fetchReceivedRequests();
      closeFosterModal();
      await notify(t('db.notifyFosterOk', { name: selectedFosterCat.name }), {
        type: 'success',
        title: t('common.success'),
      });
    } catch (error) {
      console.error(error);
      await notify(error.message || t('db.notifyFosterFail'), {
        type: 'error',
        title: t('common.error'),
      });
    } finally {
      setFosterLoadingId(null);
    }
  };

  const handleWithdrawFoster = async (cat) => {
    const confirmed = await confirm(t('db.withdrawConfirm', { name: cat.name }), {
      type: 'confirm',
      title: t('db.withdrawTitle'),
      confirmText: t('db.withdrawYes'),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      setFosterLoadingId(cat.id);

      const response = await fetch(`${CATS_API}/${cat.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingType: cat.previousListingType || 'adoption',
          listingStatus: cat.previousListingStatus || 'active',
          previousListingType: null,
          previousListingStatus: null,
          sourceType: cat.sourceType || 'private',
          source: cat.source || 'private',
          urgency: null,
          fosterStartDate: null,
          fosterEndDate: null,
          fosterCity: null,
          fosterComment: null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to withdraw foster');
      }

      await fetchMyCats();
      await fetchReceivedRequests();
      await notify(t('db.notifyWithdrawOk', { name: cat.name }), {
        type: 'success',
        title: t('common.success'),
      });
    } catch (error) {
      console.error(error);
      await notify(t('db.notifyWithdrawFail'), { type: 'error', title: t('common.error') });
    } finally {
      setFosterLoadingId(null);
    }
  };

  const removeFosterRequest = async (request, { scope, setDeletingId, onSuccess, failKey, restartKey, okKey }) => {
    if (!userId || !request?.id) return;

    const confirmKey = scope === 'received' ? 'db.recvRemoveConfirm' : 'db.sentRemoveConfirm';
    const titleKey = scope === 'received' ? 'db.recvRemoveTitle' : 'db.sentRemoveTitle';
    const yesKey = scope === 'received' ? 'db.recvRemoveYes' : 'db.sentRemoveYes';
    const catName = request.cat?.name || t('common.unknown');

    const confirmed = await confirm(t(confirmKey, { name: catName }), {
      type: 'confirm',
      title: t(titleKey),
      confirmText: t(yesKey),
      cancelText: t('common.cancel'),
    });
    if (!confirmed) return;

    try {
      setDeletingId(request.id);
      const removeUrl = `${CATS_API}/foster-requests/${request.id}?userId=${encodeURIComponent(String(userId))}`;
      const response = await fetch(removeUrl, { method: 'DELETE' });
      const rawText = await response.text();
      let data = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }
      if (!response.ok) {
        if (response.status === 404 && /Cannot DELETE/i.test(rawText)) {
          throw new Error(t(restartKey));
        }
        throw new Error(data?.message || t(failKey));
      }
      onSuccess(request.id);
      await notify(t(okKey), { type: 'success', title: t('msg.successTitle') });
    } catch (error) {
      console.error(error);
      await notify(error.message || t(failKey), {
        type: 'error',
        title: t('common.error'),
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSentRequest = (request) =>
    removeFosterRequest(request, {
      scope: 'sent',
      setDeletingId: setSentRequestDeletingId,
      onSuccess: (id) => setSentRequests((prev) => prev.filter((item) => item.id !== id)),
      failKey: 'db.sentRemoveFail',
      restartKey: 'db.sentRemoveRestart',
      okKey: 'db.sentRemoveOk',
    });

  const handleDeleteReceivedRequest = (request) =>
    removeFosterRequest(request, {
      scope: 'received',
      setDeletingId: setReceivedRequestDeletingId,
      onSuccess: (id) => setReceivedRequests((prev) => prev.filter((item) => item.id !== id)),
      failKey: 'db.recvRemoveFail',
      restartKey: 'db.sentRemoveRestart',
      okKey: 'db.recvRemoveOk',
    });

  const handleRequestDecision = async (requestId, status) => {
    try {
      setRequestActionLoadingId(requestId);
      const response = await fetch(`${CATS_API}/foster-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || `Failed to ${status} request`);
      }
      await fetchReceivedRequests();
      await fetchMyCats();
      await notify(
        status === 'approved' ? t('db.notifyDecisionOkA') : t('db.notifyDecisionOkR'),
        { type: 'success', title: t('db.updatedTitle') }
      );
    } catch (error) {
      console.error(error);
      await notify(error.message, { type: 'error', title: t('common.error') });
    } finally {
      setRequestActionLoadingId(null);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header-bg">
        <header className="profile-header">
          <div className="user-info">
            <div className="avatar">
              <Cat color="#FFB347" size={24} />
            </div>
            <div className="text-info">
              <h1>{t('db.hello', { name: userName })}</h1>
              <p>{t('db.levelParent', { level: currentLevel })}</p>
            </div>
          </div>
          <button className="notification-btn" type="button">
            <Bell />
          </button>
        </header>

        <div className="purr-points-card">
          <div className="points-header">
            <p className="points-label">{t('db.purrPoints')}</p>
            <div className="points-icon-badge">
              <Award color="white" />
            </div>
          </div>

          <div className="points-value">
            <h2>{balancePoints}</h2>
            <span>{t('db.pts')}</span>
          </div>

          <div className="level-info">
            <span className="current-level">{levelShortLabel}</span>
            <span className="points-to-next">{nextLevelText}</span>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
          </div>

          <div className="achievements-row">
            <div
              className="achievement-badge clickable"
              role="button"
              tabIndex={0}
              onClick={() => navigate('/achievements')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate('/achievements');
              }}
              title={t('db.achievementsOpen')}
            >
              <Star /> {t('db.achievementsCount', { n: achievementsCount })}
            </div>
            <div className="achievement-badge foster-badge">
              <Heart fill="currentColor" /> {t('db.fostersCount', { n: fosterCount })}
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="ai-banner">
          <div className="ai-icon-wrapper">
            <Cpu />
          </div>
          <div className="ai-text">
            <h3>{t('db.aiTitle')}</h3>
            <p>{t('db.aiSub')}</p>
          </div>
          <button className="ai-action-btn" type="button" onClick={() => navigate('/chat')}>
            <MessageSquare />
          </button>
        </div>

        <div className="my-cats-header" style={{ marginTop: '28px' }}>
          <div>
            <h2>{t('db.sentTitle')}</h2>
            <p>{t('db.sentSub')}</p>
          </div>
        </div>

        {sentRequestsLoading ? (
          <div className="empty-card">
            <p>{t('db.sentLoading')}</p>
          </div>
        ) : sentRequests.length === 0 ? (
          <div className="empty-card">
            <p>{t('db.sentEmpty')}</p>
          </div>
        ) : (
          <div className="requests-list">
            {sentRequests.map((request) => (
              <article key={`sent-${request.id}`} className="request-card request-card--sent">
                <button
                  type="button"
                  className="request-card-dismiss"
                  onClick={() => handleDeleteSentRequest(request)}
                  disabled={sentRequestDeletingId === request.id}
                  aria-label={t('db.sentRemoveAria')}
                  title={t('db.sentRemove')}
                >
                  <X size={18} />
                </button>
                <div className="request-card-top">
                  {request.cat?.image_url ? (
                    <img
                      src={resolveUploadedImageUrl(request.cat.image_url)}
                      alt={request.cat?.name || t('common.unknown')}
                      className="request-card-image"
                    />
                  ) : (
                    <div className="request-card-image request-card-image-placeholder" aria-hidden />
                  )}
                  <div className="request-card-main">
                    <h3>{request.cat?.name || t('common.unknown')}</h3>
                    <p className="request-card-type">{formatRequestType(request.type, t)}</p>
                  </div>
                </div>
                <div className="request-card-details">
                  <p>
                    <strong>{t('db.owner')}:</strong>{' '}
                    {request.owner?.firstName || t('db.unknownUser')}
                  </p>
                  <p>
                    <strong>{t('db.status')}:</strong> {formatRequestStatus(request.status, t)}
                  </p>
                  <p>
                    <strong>{t('db.experience')}:</strong> {request.experienceLevel || '—'}
                  </p>
                  {request.type === 'foster' ? (
                    <p>
                      <strong>{t('db.period')}:</strong>{' '}
                      {formatShortDate(request.startDate, dateLocale)} –{' '}
                      {formatShortDate(request.endDate, dateLocale)}
                    </p>
                  ) : null}
                  <p>
                    <strong>{t('db.created')}:</strong>{' '}
                    {formatRequestDateTime(request.createdAt ?? request.created_at, dateLocale, t)}
                  </p>
                  {request.comment ? (
                    <p>
                      <strong>{t('db.comment')}:</strong> {request.comment}
                    </p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="my-cats-header" style={{ marginTop: '28px' }}>
          <div>
            <h2>{t('db.reqTitle')}</h2>
            <p>{t('db.reqSub')}</p>
          </div>
        </div>

        {receivedRequestsLoading ? (
          <div className="empty-card">
            <p>{t('db.reqLoading')}</p>
          </div>
        ) : receivedRequests.length === 0 ? (
          <div className="empty-card">
            <p>{t('db.reqEmpty')}</p>
          </div>
        ) : (
          <div className="requests-list">
            {receivedRequests.map((request) => (
              <article key={request.id} className="request-card request-card--sent">
                <button
                  type="button"
                  className="request-card-dismiss"
                  onClick={() => handleDeleteReceivedRequest(request)}
                  disabled={receivedRequestDeletingId === request.id}
                  aria-label={t('db.recvRemoveAria')}
                  title={t('db.recvRemove')}
                >
                  <X size={18} />
                </button>
                <div className="request-card-top">
                  {request.cat?.image_url ? (
                    <img
                      src={resolveUploadedImageUrl(request.cat.image_url)}
                      alt={request.cat?.name || t('common.unknown')}
                      className="request-card-image"
                    />
                  ) : (
                    <div className="request-card-image request-card-image-placeholder" aria-hidden />
                  )}

                  <div className="request-card-main">
                    <h3>{request.cat?.name || t('common.unknown')}</h3>
                    <p className="request-card-type">{formatRequestType(request.type, t)}</p>
                  </div>
                </div>

                <div className="request-card-details">
                  <p>
                    <strong>{t('db.applicant')}:</strong>{' '}
                    {request.requester?.firstName || t('db.unknownUser')}
                  </p>
                  <p>
                    <strong>{t('db.email')}:</strong> {request.requester?.email || '—'}
                  </p>
                  <p>
                    <strong>{t('db.phone')}:</strong> {request.requester?.phone || '—'}
                  </p>
                  <p>
                    <strong>{t('db.status')}:</strong> {formatRequestStatus(request.status, t)}
                  </p>
                  <p>
                    <strong>{t('db.experience')}:</strong> {request.experienceLevel || '—'}
                  </p>
                  <p>
                    <strong>{t('db.period')}:</strong> {formatShortDate(request.startDate, dateLocale)} –{' '}
                    {formatShortDate(request.endDate, dateLocale)}
                  </p>
                  <p>
                    <strong>{t('db.created')}:</strong>{' '}
                    {formatRequestDateTime(request.createdAt ?? request.created_at, dateLocale, t)}
                  </p>
                  {request.comment ? (
                    <p>
                      <strong>{t('db.comment')}:</strong> {request.comment}
                    </p>
                  ) : null}
                  {request.status === 'pending' ? (
                    <div className="request-card-actions">
                      <button
                        type="button"
                        className="request-approve-btn"
                        onClick={() => handleRequestDecision(request.id, 'approved')}
                        disabled={requestActionLoadingId === request.id}
                      >
                        {requestActionLoadingId === request.id ? t('db.updating') : t('db.approve')}
                      </button>
                      <button
                        type="button"
                        className="request-reject-btn"
                        onClick={() => handleRequestDecision(request.id, 'rejected')}
                        disabled={requestActionLoadingId === request.id}
                      >
                        {requestActionLoadingId === request.id ? t('db.updating') : t('db.reject')}
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="section-header">
          <h2>{t('db.quickTitle')}</h2>
        </div>

        <div className="quick-actions-grid">
          <div className="action-card" onClick={openAddCatModal}>
            <div className="action-icon">
              <PlusCircle />
            </div>
            <h4>{t('db.addCat')}</h4>
            <p>{t('db.addCatSub')}</p>
          </div>

          <div className="action-card" onClick={() => navigate('/events')}>
            <div className="action-icon">
              <Users />
            </div>
            <h4>{t('db.community')}</h4>
            <p>{t('db.communitySub')}</p>
          </div>

          <div className="action-card" onClick={() => navigate('/pharmacies')}>
            <div className="action-icon">
              <MapPin />
            </div>
            <h4>{t('db.findVet')}</h4>
            <p>{t('db.findVetSub')}</p>
          </div>

          <div className="action-card" onClick={() => navigate('/achievements')}>
            <div className="action-icon"><TrendingUp /></div>
            <h4>{t('db.progress')}</h4>
            <p>{t('db.progressSub')}</p>
          </div>
        </div>

        <div className="my-cats-header">
          <div>
            <h2>{t('db.myCatsTitle')}</h2>
            <p>{t('db.myCatsSub')}</p>
          </div>

          <button type="button" className="add-cat-btn" onClick={openAddCatModal}>
            <PlusCircle size={18} />
            <span>{t('db.addCatBtn')}</span>
          </button>
        </div>

        {loading ? (
          <div className="empty-card">
            <p>{t('db.loadingCats')}</p>
          </div>
        ) : pageError ? (
          <div className="empty-card">
            <p>{pageError}</p>
          </div>
        ) : cats.length === 0 ? (
          <div className="empty-card">
            <p>{t('db.noCats')}</p>
          </div>
        ) : (
          <div className="cats-grid">
            {cats.map((cat) => {
              const savedVaccinations = Array.isArray(catVaccinations[cat.id])
                ? catVaccinations[cat.id]
                : normalizeVaccinations(cat.vaccinations).map((name) => ({
                    name,
                    status: 'completed',
                  }));
              const completedVaccinations = savedVaccinations.filter(
                (item) => String(item.status).toLowerCase() === 'completed'
              );
              const completedCount = completedVaccinations.length;
              const completedNames = completedVaccinations
                .map((item) => item.name)
                .filter(Boolean);
              const statusMeta = getStatusMeta(cat, t);
              const isOnFoster =
                cat.listingType === 'foster' || cat.listingStatus === 'pending';

              return (
                <article key={cat.id} className="cat-card">
                  {cat.image_url ? (
                    <img
                      src={resolveUploadedImageUrl(cat.image_url)}
                      alt={cat.name}
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        marginBottom: '14px',
                      }}
                    />
                  ) : null}

                  <div className="cat-card-head">
                    <div>
                      <h3>{cat.name}</h3>
                      <p>{cat.breed || t('db.breedUnknown')}</p>
                    </div>

                    <span className={`status-badge ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  <div className="cat-meta">
                    <span>
                      <strong>{t('db.birthDate')}:</strong> {formatBirthDate(cat.birthDate, t)}
                    </span>
                    <span>
                      <strong>{t('db.vaccinations')}:</strong>{' '}
                      {completedCount > 0
                        ? t('db.vaxCompleted', { n: completedCount })
                        : t('db.vaxNone')}
                    </span>
                  </div>

                  <div className="cat-expanded-content">
                    <p className="cat-description">
                      {cat.description || t('db.noDesc')}
                    </p>

                    <h4>{t('db.vaxCompletedTitle')}</h4>
                    <p className="cat-vaccinations-text">
                      {completedNames.length > 0
                        ? completedNames.join(', ')
                        : t('db.vaxNoneCompleted')}
                    </p>

                    <div className="cat-card-actions">
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => navigate(`/cats/${cat.id}/vaccinations`, { state: { cat } })}
                      >
                        {t('db.btnVax')}
                      </button>

                      <button
                        type="button"
                        className="cat-edit-btn"
                        onClick={() => openEditCatModal(cat)}
                      >
                        <Pencil size={16} />
                        {t('db.btnEdit')}
                      </button>

                      <button
                        type="button"
                        className="cat-delete-btn"
                        onClick={() => handleDeleteCat(cat)}
                        disabled={deleteLoadingId === cat.id}
                      >
                        <Trash2 size={16} />
                        {deleteLoadingId === cat.id ? t('db.deleting') : t('db.btnDelete')}
                      </button>

                     <button
                        type="button"
                        className={isOnFoster ? 'cat-withdraw-btn' : 'cat-foster-btn'}
                        onClick={() => {
                        if (isOnFoster) {
                        handleWithdrawFoster(cat);
                        } else {
                        openFosterModal(cat);
                        }
                        }}
                        disabled={fosterLoadingId === cat.id}
>
                       {fosterLoadingId === cat.id
                       ? (isOnFoster ? t('db.updating') : t('db.sending'))
                       : (isOnFoster ? t('db.withdrawFoster') : t('db.putFoster'))}
                     </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {isCatModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{editingCat ? t('db.modalEditCat') : t('db.modalAddCat')}</h3>
              <button type="button" className="modal-close" onClick={closeCatModal}>
                <X size={18} />
              </button>
            </div>

            <form className="cat-form" onSubmit={handleSaveCat}>
              <div className="form-group">
                <label>{t('db.labelName')}</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder={t('db.phCatName')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelBreed')}</label>
                <input
                  type="text"
                  value={form.breed}
                  onChange={(e) => handleFormChange('breed', e.target.value)}
                  placeholder={t('db.phBreed')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelGender')}</label>
                <select
                  value={form.gender}
                  onChange={(e) => handleFormChange('gender', e.target.value)}
                >
                  <option value="">{t('db.genderSelect')}</option>
                  <option value="male">{t('gal.male')}</option>
                  <option value="female">{t('gal.female')}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{t('db.labelBirth')}</label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleFormChange('birthDate', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelPersonality')}</label>
                <input
                  type="text"
                  value={form.personality}
                  onChange={(e) => handleFormChange('personality', e.target.value)}
                  placeholder={t('db.phPersonality')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelDesc')}</label>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder={t('db.phDesc')}
                />
              </div>

              {editingCat?.id ? (
                <div className="form-group">
                  <label>{t('db.vaccinations')}</label>
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      closeCatModal();
                      navigate(`/cats/${editingCat.id}/vaccinations`, {
                        state: { cat: editingCat },
                      });
                    }}
                    style={{ width: '100%' }}
                  >
                    {t('db.openCal')}
                  </button>
                </div>
              ) : (
                <div className="form-group">
                  <label>{t('db.vaccinations')}</label>
                  <button
                    type="submit"
                    className="secondary-btn"
                    onClick={() => setOpenCalendarAfterSave(true)}
                    style={{ width: '100%' }}
                    title={t('db.saveOpenCalTitle')}
                  >
                    {t('db.saveOpenCal')}
                  </button>
                </div>
              )}

              <div className="form-group">
                <label>{t('db.labelPhoto')}</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />

                {form.imagePreview && (
                  <div style={{ marginTop: '12px' }}>
                    <img
                      src={form.imagePreview}
                      alt={t('db.catPreview')}
                      style={{
                        width: '160px',
                        height: '160px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        border: '1px solid #f3d3ae',
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeCatModal}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saveLoading}
                  onClick={() => setOpenCalendarAfterSave(false)}
                >
                  {saveLoading ? t('db.saving') : t('db.saveCat')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {isFosterModalOpen && selectedFosterCat && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-head">
              <h3>{t('db.fosterModalTitle')}</h3>
              <button type="button" className="modal-close" onClick={closeFosterModal}>
                <X size={18} />
              </button>
            </div>

            <form className="cat-form" onSubmit={handleFosterCat}>
              <div className="foster-preview">
                {selectedFosterCat.image_url ? (
                  <img
                    src={resolveUploadedImageUrl(selectedFosterCat.image_url)}
                    alt={selectedFosterCat.name}
                    className="foster-preview-image"
                  />
                ) : (
                  <div className="foster-preview-placeholder">
                    <Cat size={36} />
                  </div>
                )}

                <div className="foster-preview-info">
                  <h4>{selectedFosterCat.name}</h4>
                  <p>
                    <strong>{t('db.labelBreed')}:</strong>{' '}
                    {selectedFosterCat.breed || t('db.notSpecified')}
                  </p>
                  <p>
                    <strong>{t('db.labelDesc')}:</strong>{' '}
                    {selectedFosterCat.description || t('db.noDesc')}
                  </p>
                  <p>
                    <strong>{t('db.labelPersonality')}:</strong>{' '}
                    {selectedFosterCat.personality || t('db.notSpecified')}
                  </p>
                </div>
              </div>

              <div className="form-group">
                <label>{t('db.labelCity')}</label>
                <input
                  type="text"
                  value={fosterForm.location}
                  onChange={(e) => handleFosterFormChange('location', e.target.value)}
                  placeholder={t('db.phCity')}
                />
              </div>

              <div className="form-group">
                <label>{t('db.labelUrgency')}</label>
                <select
                  value={fosterForm.urgency}
                  onChange={(e) => handleFosterFormChange('urgency', e.target.value)}
                >
                  <option value="">{t('db.urgencySelect')}</option>
                  <option value="low">{t('gal.low')}</option>
                  <option value="medium">{t('gal.medium')}</option>
                  <option value="immediate">{t('gal.immediate')}</option>
                </select>
              </div>

              <div className="foster-period-grid">
                <div className="form-group">
                  <label>{t('db.startDate')}</label>
                  <input
                    type="date"
                    value={fosterForm.startDate}
                    onChange={(e) => handleFosterFormChange('startDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t('db.endDate')}</label>
                  <input
                    type="date"
                    value={fosterForm.endDate}
                    onChange={(e) => handleFosterFormChange('endDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>{t('db.labelComment')}</label>
                <textarea
                  rows="4"
                  value={fosterForm.comment}
                  onChange={(e) => handleFosterFormChange('comment', e.target.value)}
                  placeholder={t('db.phFosterComment')}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeFosterModal}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={fosterLoadingId === selectedFosterCat.id}
                >
                  {fosterLoadingId === selectedFosterCat.id ? t('db.sending') : t('db.sendRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shelter Needs Carousel */}
      {needs.length > 0 && (
        <section className="dashboard-needs-carousel-section">
          <div className="carousel-header">
            <h3>{t('db.carouselTitle')}</h3>
            <Link to="/shelter-needs" className="view-all-link">
              {t('db.viewAll')}
            </Link>
          </div>

          <div className="carousel-shell">
            <div className="carousel-container">
            {showCarouselLeft && (
            <button
              type="button"
              className="carousel-btn carousel-btn-left"
              onClick={() => scrollCarousel('left')}
              aria-label={t('db.scrollLeft')}
            >
              ‹
            </button>
            )}

            <div className="carousel-track" ref={carouselRef}>
              {needs.map((need) => {
                const shelterInfo = getNeedShelterInfo(need, t);
                return (
                <div key={need._carouselKey || need.id} className="carousel-card">
                  <div className="card-priority" aria-hidden>
                    {String(need.priority || '').toLowerCase() === 'high' && '🔴'}
                    {String(need.priority || '').toLowerCase() === 'medium' && '🟡'}
                    {String(need.priority || '').toLowerCase() === 'low' && '🟢'}
                  </div>
                  <h4>{need.title}</h4>
                  {need.description && (
                    <p className="card-description">{need.description}</p>
                  )}
                  {shelterInfo && (
                    <div className="card-shelter">
                      <div className="shelter-name">{shelterInfo.name}</div>
                      {shelterInfo.address && (
                        <div className="shelter-location">
                          <MapPin size={12} />
                          {shelterInfo.address}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )})}
            </div>

            {showCarouselRight && (
            <button
              type="button"
              className="carousel-btn carousel-btn-right"
              onClick={() => scrollCarousel('right')}
              aria-label={t('db.scrollLeft')}
            >
              ›
            </button>
            )}
            </div>
          </div>
        </section>
      )}

      <BottomNav active="home" />
    </div>
  );
};

export default DashboardPage;