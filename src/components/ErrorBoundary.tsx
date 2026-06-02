import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Critical crash captured in ${this.props.componentName || "Component"}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2.5xl flex flex-col items-center justify-center text-center space-y-3 shadow-lg my-4">
          <AlertCircle className="w-8 h-8 text-red-500 animate-pulse" />
          <h5 className="font-display font-extrabold text-sm text-white">Module Isolated Safeguard &middot; Mentora AI</h5>
          <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
            The sub-module [{this.props.componentName || "System View"}] recovered dynamically from a parsing or UI rendering check mismatch:
          </p>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 w-full max-w-md">
            <code className="text-[10px] text-red-400 font-mono break-all leading-normal whitespace-pre-wrap block">
              {this.state.error?.message || "Unknown schema processing warning."}
            </code>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition shadow-md"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Workspace Layer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
