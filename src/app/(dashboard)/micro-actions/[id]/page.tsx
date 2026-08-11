'use client';
import { useParams } from 'next/navigation';
import { useMicroAction } from '@/lib/hooks/use-micro-actions';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { MicroActionEditor } from '../_components/micro-action-editor';
export default function MicroActionPage() {
  const { id } = useParams<{ id: string }>();
  const query = useMicroAction(id);
  if (query.isLoading) return <LoadingState rows={7} />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message={query.error?.message ?? 'Micro-action not found.'}
        retry={() => query.refetch()}
      />
    );
  return <MicroActionEditor action={query.data} />;
}
