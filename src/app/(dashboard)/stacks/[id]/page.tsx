'use client';
import { useParams } from 'next/navigation';
import { useStack } from '@/lib/hooks/use-stacks';
import { LoadingState } from '@/components/data/loading-state';
import { ErrorState } from '@/components/data/error-state';
import { StackEditor } from '../_components/stack-editor';
export default function StackPage() {
  const { id } = useParams<{ id: string }>();
  const stack = useStack(id);
  if (stack.isLoading) return <LoadingState rows={7} />;
  if (stack.isError || !stack.data)
    return (
      <ErrorState
        message={stack.error?.message ?? 'Stack not found.'}
        retry={() => stack.refetch()}
      />
    );
  return <StackEditor stack={stack.data} />;
}
