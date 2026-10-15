'use client';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { useMoments } from '@/lib/hooks/use-moments';
import { MomentRow } from './_components/moment-row';

/**
 * The seven moments of a day. Stacks anchor their segments on these; members set their own time
 * for each in Your day, and the default time here applies until they do.
 */
export default function MomentsPage() {
  const query = useMoments();
  const unconfigured = (query.data ?? []).filter((moment) => !moment.updatedAt).length;
  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Moments"
        description="The seven moments a stack can anchor on. A member's own time in Your day replaces the default time; until then the default applies."
      />
      {unconfigured > 0 && (
        <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {unconfigured} of 7 moments have no Dutch label, daypart or default time yet. The app only
          reads a moment once all of its values are saved.
        </p>
      )}
      {query.isLoading ? (
        <LoadingState rows={7} />
      ) : query.isError ? (
        <ErrorState message={query.error.message} retry={() => query.refetch()} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50/80">
              <tr>
                {['#', 'Key', 'Name EN', 'Name NL', 'Daypart', 'Default time', ''].map((item) => (
                  <th
                    key={item}
                    className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((moment) => (
                <MomentRow key={moment.key} moment={moment} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
