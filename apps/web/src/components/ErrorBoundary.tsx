'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { useTranslation } from '@/lib/i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

function DefaultFallback({ onReset }: { onReset: () => void }) {
  const t = useTranslation();
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-4" role="alert">
      <div className="text-center">
        <h2 className="text-xl font-bold text-stone-100">{t.errors.somethingWentWrong}</h2>
        <p className="mt-2 text-sm text-stone-400">{t.errors.unexpectedError}</p>
        <button
          onClick={onReset}
          className="mt-4 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-400"
          aria-label={t.errors.tryAgain}
        >
          {t.errors.tryAgain}
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return <DefaultFallback onReset={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}
