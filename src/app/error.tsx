"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
            }}>
              <span style={{ fontSize: "24px", color: "white" }}>⚠️</span>
            </div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#1e293b", marginBottom: "8px" }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "20px",
              overflow: "auto",
              maxHeight: "200px",
            }}>
              <p style={{ fontSize: "12px", color: "#991b1b", fontFamily: "monospace", wordBreak: "break-word" }}>
                {this.state.error?.message || "Unknown error"}
              </p>
              {this.state.error?.stack && (
                <pre style={{
                  fontSize: "11px",
                  color: "#b91c1c",
                  marginTop: "8px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {this.state.error.stack}
                </pre>
              )}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: "linear-gradient(135deg, #f97316, #d97706)",
                color: "white",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}