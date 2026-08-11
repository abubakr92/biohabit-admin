export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(
        new Date(value),
      )
    : '—';
export const relativeDays = (value: string | null) =>
  value ? Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000) : Infinity;
