import { AppLoadingSpinner } from '@/components/ui/loading-states';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <AppLoadingSpinner />
    </div>
  );
}
