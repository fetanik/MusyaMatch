import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Circle } from 'lucide-react';
import '../styles/AchievementsPage.css';
import BottomNav from '../components/BottomNav';
import { useI18n } from '../i18n/I18nContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const getCurrentUserId = () => {
  const raw =
    localStorage.getItem('userId') ||
    localStorage.getItem('basicUserId') ||
    localStorage.getItem('currentUserId');

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const AchievementsPage = () => {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const dateLocale = locale === 'uk' ? 'uk-UA' : 'en-US';
  const userId = getCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [summary, setSummary] = useState(null);
  const [cats, setCats] = useState([]);
  const [claiming, setClaiming] = useState('');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const run = async () => {
      if (!userId) {
        setSummary(null);
        setCats([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPageError('');

        const [summaryRes, catsRes] = await Promise.all([
          fetch(`${API_BASE}/api/achievements/${userId}/summary`),
          fetch(`${API_BASE}/api/cats`),
        ]);

        const summaryData = await summaryRes.json().catch(() => null);
        const catsData = await catsRes.json().catch(() => []);

        if (!summaryRes.ok) {
          throw new Error(summaryData?.message || 'Failed to load achievements');
        }

        setSummary(summaryData);

        const allCats = Array.isArray(catsData) ? catsData : [];
        setCats(allCats.filter((c) => Number(c.userId) === userId));
      } catch {
        setPageError(t('ach.loadFailBody'));
        setSummary(null);
        setCats([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [userId, t]);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const current = new Date();
    const nextMidnight = new Date(current);
    nextMidnight.setHours(24, 0, 2, 0);
    const ms = Math.max(1000, nextMidnight.getTime() - current.getTime());
    const timer = setTimeout(tick, ms);
    return () => clearTimeout(timer);
  }, [now]);

  const completedByType = summary?.completedByType || {};
  const totalPoints = summary?.points ?? 0;
  const statusByType = summary?.statusByType || {};

  const items = useMemo(() => {
    const defs = Array.isArray(summary?.definitions) ? summary.definitions : [];
    return defs.map((d) => ({
      ...d,
      doneCount: Number(completedByType[d.type] || 0),
      lastAt: statusByType?.[d.type]?.lastAt || null,
      isDoneNow: Boolean(statusByType?.[d.type]?.isDone),
      eligibleNow: Boolean(statusByType?.[d.type]?.eligibleNow),
    }));
  }, [summary, completedByType, statusByType]);

  const firstCatId = cats?.[0]?.id || null;

  const claim = async (type) => {
    if (!userId) return;

    try {
      setClaiming(type);
      const needsCat =
        type === 'CAT_PROFILE_COMPLETED' || type === 'CAT_PROFILE_CREATED' || type === 'VACCINATION_FIRST';

      const res = await fetch(`${API_BASE}/api/achievements/${userId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          catId: needsCat ? firstCatId : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Not eligible yet');
      }

      const summaryRes = await fetch(`${API_BASE}/api/achievements/${userId}/summary`);
      const summaryData = await summaryRes.json().catch(() => null);
      if (summaryRes.ok) setSummary(summaryData);
    } catch (e) {
      alert(e?.message || t('ach.claimFail'));
    } finally {
      setClaiming('');
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const achievementTitle = (type, fallback) => {
    const key = `ach.type.${type}`;
    const localized = t(key);
    return localized === key ? fallback : localized;
  };

  const sep = t('ach.sep');

  return (
    <div className="achievements-wrapper">
      <header className="achievements-header">
        <button type="button" className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>{t('ach.pageTitle')}</h1>
      </header>

      <main className="achievements-content">
        {loading ? (
          <div className="achievement-card">
            <div className="achievement-info">
              <h3>{t('ach.loadingTitle')}</h3>
              <p>{t('ach.loadingHint')}</p>
            </div>
          </div>
        ) : pageError ? (
          <div className="achievement-card">
            <div className="achievement-info">
              <h3>{t('ach.loadFailTitle')}</h3>
              <p>{pageError}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="achievement-card done" style={{ marginBottom: 12 }}>
              <div className="achievement-icon">
                <CheckCircle2 size={22} color="#2E7D32" />
              </div>
              <div className="achievement-info">
                <h3>{t('ach.totalTitle')}</h3>
                <p>{t('ach.totalHint')}</p>
              </div>
              <div className="achievement-status">
                {totalPoints} {t('ach.pts')}
              </div>
            </div>

            <div className="achievement-list">
              {items.map((it) => {
                const done =
                  it.repeat === 'daily' || it.repeat === 'weekly' || it.repeat === 'monthly'
                    ? it.isDoneNow
                    : it.doneCount > 0;

                const canClaimManually = [
                  'AI_CHAT_FIRST',
                  'FEEDING_DAILY',
                  'SHARE_STORY',
                  'REFERRAL_REGISTERED',
                  'WEIGHT_MONTHLY',
                  'GAMES_DAILY',
                  'GROOMING_WEEKLY',
                ].includes(it.type);

                const needsCat = it.repeat === 'once_per_cat';
                const disabled =
                  (needsCat && !firstCatId) ||
                  claiming === it.type ||
                  (canClaimManually && !it.eligibleNow);

                const lastLabel = it.lastAt ? formatDate(it.lastAt) : '';
                const doneToday = it.repeat === 'daily' ? isSameDay(it.lastAt, now) : false;

                const repeatLabel =
                  it.repeat === 'daily'
                    ? t('ach.daily')
                    : it.repeat === 'weekly'
                      ? t('ach.weekly')
                      : it.repeat === 'monthly'
                        ? t('ach.monthly')
                        : it.repeat === 'once_per_cat'
                          ? t('ach.oncePerCat')
                          : it.repeat === 'once'
                            ? t('ach.once')
                            : t('ach.repeatable');

                let detail = '';
                if (it.repeat === 'daily') {
                  if (doneToday) {
                    detail = `${sep}${t('ach.doneToday', { date: lastLabel })}`;
                  } else if (lastLabel) {
                    detail = `${sep}${t('ach.last', { date: lastLabel })}`;
                  } else {
                    detail = `${sep}${t('ach.notDoneToday')}`;
                  }
                } else if (it.repeat === 'weekly' || it.repeat === 'monthly') {
                  detail = lastLabel ? `${sep}${t('ach.last', { date: lastLabel })}` : `${sep}${t('ach.notDoneYet')}`;
                } else if (it.doneCount) {
                  detail = `${sep}${t('ach.doneCount', { count: it.doneCount })}${
                    lastLabel ? `${sep}${t('ach.last', { date: lastLabel })}` : ''
                  }`;
                } else if (lastLabel) {
                  detail = `${sep}${t('ach.last', { date: lastLabel })}`;
                }

                return (
                  <div key={it.type} className={`achievement-card ${done ? 'done' : ''}`}>
                    <div className="achievement-icon">
                      {done ? (
                        <CheckCircle2 size={22} color="#2E7D32" />
                      ) : (
                        <Circle size={22} color="#FFB347" />
                      )}
                    </div>
                    <div className="achievement-info">
                      <h3>
                        {achievementTitle(it.type, it.title)}{' '}
                        <span style={{ fontWeight: 700, color: '#b45309' }}>+{it.points}</span>
                      </h3>
                      <p>
                        {repeatLabel}
                        {detail}
                      </p>
                    </div>
                    <div className="achievement-status">
                      {canClaimManually ? (
                        <button
                          type="button"
                          className="achievement-claim-btn"
                          onClick={() => claim(it.type)}
                          disabled={disabled}
                          title={needsCat && !firstCatId ? t('ach.addCatFirst') : t('ach.claimTitle')}
                        >
                          {claiming === it.type
                            ? '...'
                            : it.eligibleNow
                              ? t('ach.claim')
                              : t('ach.doneShort')}
                        </button>
                      ) : done ? (
                        `${t('ach.completed')}${lastLabel ? ` (${lastLabel})` : ''}`
                      ) : (
                        `${t('ach.notCompleted')}${lastLabel ? `${sep}${t('ach.last', { date: lastLabel })}` : ''}`
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav active="" />
    </div>
  );
};

export default AchievementsPage;
