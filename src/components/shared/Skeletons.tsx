"use client";
import React from "react";

// ==================== SKELETON COMPONENTS ====================
// Professional skeleton loading screens — shimmer effect like Testbook/Adda247

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// Category grid skeleton (for Home/MockTests tabs)
export function CategoryGridSkeleton() {
  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <SkeletonBlock className="h-5 w-32 mx-auto bg-white/20" />
        <SkeletonBlock className="h-3 w-48 mx-auto mt-2 bg-white/10" />
      </div>
      <div className="px-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
              <SkeletonBlock className="w-12 h-12 rounded-xl mb-2" />
              <SkeletonBlock className="h-4 w-20 mb-1.5" />
              <SkeletonBlock className="h-2.5 w-28" />
              <SkeletonBlock className="h-2.5 w-16 mt-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Test list skeleton (for CategoryDetail screen)
export function TestListSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl bg-white/20" />
          <div>
            <SkeletonBlock className="h-5 w-32 bg-white/20" />
            <SkeletonBlock className="h-3 w-24 mt-1.5 bg-white/10" />
          </div>
        </div>
      </div>
      <div className="px-4 pt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm mb-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-14 h-14 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <SkeletonBlock className="h-4 w-40 mb-2" />
                <SkeletonBlock className="h-3 w-28 mb-1.5" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-2.5 w-12" />
                  <SkeletonBlock className="h-2.5 w-12" />
                  <SkeletonBlock className="h-2.5 w-12" />
                </div>
              </div>
              <SkeletonBlock className="w-12 h-6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Paper/Note list skeleton
export function PaperListSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-6">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl bg-white/20" />
          <div>
            <SkeletonBlock className="h-5 w-32 bg-white/20" />
            <SkeletonBlock className="h-3 w-24 mt-1.5 bg-white/10" />
          </div>
        </div>
      </div>
      <div className="px-4 pt-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="w-14 h-14 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <SkeletonBlock className="h-4 w-44 mb-2" />
                <SkeletonBlock className="h-3 w-32 mb-2" />
                <div className="flex gap-2">
                  <SkeletonBlock className="h-2.5 w-14" />
                  <SkeletonBlock className="h-2.5 w-14" />
                  <SkeletonBlock className="h-2.5 w-14" />
                </div>
              </div>
              <SkeletonBlock className="w-12 h-6 rounded-lg" />
            </div>
            <SkeletonBlock className="h-8 w-full rounded-xl mt-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic full-screen skeleton (for simple loading states)
export function FullScreenSkeleton() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="w-9 h-9 rounded-xl bg-white/20" />
          <SkeletonBlock className="h-5 w-40 bg-white/20" />
        </div>
      </div>
      <div className="px-4 pt-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1">
                <SkeletonBlock className="h-4 w-3/4 mb-2" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Leaderboard skeleton
export function LeaderboardSkeleton() {
  return (
    <div className="pb-6 bg-[#F8FAFC] min-h-screen">
      <div className="bg-gradient-to-r from-[#0B1437] to-[#1E2A5E] px-4 pt-5 pb-5">
        <SkeletonBlock className="h-5 w-40 mx-auto bg-white/20" />
        <SkeletonBlock className="h-3 w-32 mx-auto mt-2 bg-white/10" />
      </div>
      <div className="px-4 pt-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm mb-2 flex items-center gap-3">
            <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <SkeletonBlock className="h-4 w-32 mb-1.5" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== HAPTIC FEEDBACK ====================
// Professional apps give tactile feedback on button presses

export function hapticFeedback(intensity: "light" | "medium" | "heavy" = "light") {
  if (typeof window === "undefined") return;
  try {
    // Android WebView haptic
    if ((window as any).AndroidBridge?.vibrate) {
      const duration = intensity === "heavy" ? 30 : intensity === "medium" ? 20 : 10;
      (window as any).AndroidBridge.vibrate(duration);
      return;
    }
    // Web Vibration API (Chrome/Android)
    if ("vibrate" in navigator) {
      const pattern = intensity === "heavy" ? 30 : intensity === "medium" ? 20 : 10;
      navigator.vibrate(pattern);
    }
  } catch (e) { /* no-op */ }
}
