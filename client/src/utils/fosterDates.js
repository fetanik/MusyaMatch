/** Normalize API/DB date values for `<input type="date">` (YYYY-MM-DD). */
export const toDateInputValue = (value) => {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoDate = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
};

/** Read foster period from cat payload (camelCase or snake_case). */
export const getCatFosterPeriod = (cat) => {
  if (!cat) {
    return { startDate: '', endDate: '', city: '', comment: '' };
  }
  return {
    startDate: toDateInputValue(
      cat.fosterStartDate ?? cat.foster_start_date ?? cat.fosterStart ?? null,
    ),
    endDate: toDateInputValue(cat.fosterEndDate ?? cat.foster_end_date ?? cat.fosterEnd ?? null),
    city: (cat.fosterCity ?? cat.foster_city ?? '').trim(),
    comment: (cat.fosterComment ?? cat.foster_comment ?? '').trim(),
  };
};

export const formatFosterDisplayDate = (isoDate, localeTag = 'en-US') => {
  const normalized = toDateInputValue(isoDate);
  if (!normalized) return '';
  const date = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(date.getTime())) return normalized;
  return date.toLocaleDateString(localeTag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Requested period must lie within the owner's availability (inclusive). */
export const isFosterPeriodWithinOwnerRange = (
  requestStart,
  requestEnd,
  ownerStart,
  ownerEnd,
) => {
  const reqStart = toDateInputValue(requestStart);
  const reqEnd = toDateInputValue(requestEnd);
  const availStart = toDateInputValue(ownerStart);
  const availEnd = toDateInputValue(ownerEnd);

  if (!reqStart || !reqEnd || !availStart || !availEnd) return true;
  if (reqEnd < reqStart) return false;
  return reqStart >= availStart && reqEnd <= availEnd;
};
