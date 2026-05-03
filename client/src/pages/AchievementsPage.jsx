import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, Circle } from 'lucide-react';
import '../styles/AchievementsPage.css';
import BottomNav from '../components/BottomNav';

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
        setPageError('Failed to load achievements.');
        setSummary(null);
        setCats([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [userId]);

  useEffect(() => {
    // Recompute statuses after day changes (midnight).
    const tick = () => setNow(new Date());
    const current = new Date();
    const nextMidnight = new Date(current);
    nextMidnight.setHours(24, 0, 2, 0);
    const ms = Math.max(1000, nextMidnight.getTime() - current.getTime());
    const t = setTimeout(tick, ms);
    return () => clearTimeout(t);
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
      alert(e?.message || 'Failed to claim achievement');
    } finally {
      setClaiming('');
    }
  };

  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString();
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

  return (
    <div className="achievements-wrapper">
      <header className="achievements-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={24} />
        </button>
        <h1>Achievements</h1>
      </header>

      <main className="achievements-content">
        {loading ? (
          <div className="achievement-card">
            <div className="achievement-info">
              <h3>Loading…</h3>
              <p>Please wait.</p>
            </div>
          </div>
        ) : pageError ? (
          <div className="achievement-card">
            <div className="achievement-info">
              <h3>Could not load</h3>
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
                <h3>Total points</h3>
                <p>Your current score</p>
              </div>
              <div className="achievement-status">{totalPoints} pts</div>
            </div>

            <div className="achievement-list">
              {items.map((it) => {
                const done = it.repeat === 'daily' || it.repeat === 'weekly' || it.repeat === 'monthly'
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
                        {it.title}{' '}
                        <span style={{ fontWeight: 700, color: '#b45309' }}>
                          +{it.points}
                        </span>
                      </h3>
                      <p>
                        {it.repeat === 'daily'
                          ? 'Daily'
                          : it.repeat === 'weekly'
                          ? 'Weekly'
                          : it.repeat === 'monthly'
                          ? 'Monthly'
                          : it.repeat === 'once_per_cat'
                          ? 'Once per cat'
                          : it.repeat === 'once'
                          ? 'Once'
                          : 'Repeatable'}
                        {it.repeat === 'daily'
                          ? doneToday
                            ? ` • Done today (${lastLabel})`
                            : lastLabel
                            ? ` • Last: ${lastLabel}`
                            : ' • Not done today'
                          : it.repeat === 'weekly' || it.repeat === 'monthly'
                          ? lastLabel
                            ? ` • Last: ${lastLabel}`
                            : ' • Not done yet'
                          : it.doneCount
                          ? ` • Done: ${it.doneCount}${lastLabel ? ` • Last: ${lastLabel}` : ''}`
                          : lastLabel
                          ? ` • Last: ${lastLabel}`
                          : ''}
                      </p>
                    </div>
                    <div className="achievement-status">
                      {canClaimManually ? (
                        <button
                          type="button"
                          className="achievement-claim-btn"
                          onClick={() => claim(it.type)}
                          disabled={disabled}
                          title={needsCat && !firstCatId ? 'Add a cat first' : 'Claim'}
                        >
                          {claiming === it.type
                            ? '...'
                            : it.eligibleNow
                            ? 'Claim'
                            : 'Done'}
                        </button>
                      ) : done ? (
                        `Completed${lastLabel ? ` (${lastLabel})` : ''}`
                      ) : (
                        `Not completed${lastLabel ? ` • Last: ${lastLabel}` : ''}`
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

