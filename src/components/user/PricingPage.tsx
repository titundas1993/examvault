"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/lib/store";
import { getPlans, checkSubscriptionStatus } from "@/lib/services/firestore";
import { PlanData } from "@/lib/services/firestore";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Crown,
  Zap,
  Star,
  Shield,
  Clock,
  BookOpen,
  Target,
  TrendingUp,
  Calendar,
  RefreshCw,
} from "lucide-react";

export default function PricingPage() {
  const { goBack, setView, user, firebaseUser, setShowPaymentModal, setPaymentModalData } =
    useAppStore();
  const lang = useAppStore((s) => s.language);
  const subscription = useAppStore((s) => s.subscription);
  const setSubscription = useAppStore((s) => s.setSubscription);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingSub, setRefreshingSub] = useState(false);

  // Refresh subscription status when page loads
  useEffect(() => {
    if (firebaseUser?.uid) {
      checkSubscriptionStatus(firebaseUser.uid).then((status) => {
        if (status.isPremium) {
          setSubscription({
            isPremium: true,
            premiumExpiry: status.premiumExpiry,
            planName: status.planName,
            purchasedItemIds: status.purchasedItems?.map((p: any) => p.itemId) || [],
          });
        }
      }).catch(console.error);
    }
  }, [firebaseUser?.uid]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await getPlans();
        if (data && data.length > 0) {
          setPlans(data);
        }
        // No default plans - only show plans added from admin panel
      } catch (e) {
        console.error("Plans fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const handleSubscribe = (plan: PlanData) => {
    if (!user || !firebaseUser) {
      useAppStore.getState().setShowGuestModal(true);
      return;
    }
    setPaymentModalData({
      planId: plan.id || "",
      planName: plan.name,
      amount: plan.price,
      type: plan.type,
    });
    setShowPaymentModal(true);
  };

  const handleRefreshSubscription = async () => {
    if (!firebaseUser?.uid) return;
    setRefreshingSub(true);
    try {
      const status = await checkSubscriptionStatus(firebaseUser.uid);
      setSubscription({
        isPremium: status.isPremium,
        premiumExpiry: status.premiumExpiry,
        planName: status.planName,
        purchasedItemIds: status.purchasedItems?.map((p: any) => p.itemId) || [],
      });
    } catch (e) {
      console.error("Refresh subscription error:", e);
    } finally {
      setRefreshingSub(false);
    }
  };

  const getDurationLabel = (days: number) => {
    if (days === 7) return lang === "bn" ? "৭ দিন" : "7 Days";
    if (days === 30) return lang === "bn" ? "১ মাস" : "1 Month";
    if (days === 90) return lang === "bn" ? "৩ মাস" : "3 Months";
    if (days === 180) return lang === "bn" ? "৬ মাস" : "6 Months";
    if (days === 365) return lang === "bn" ? "১ বছর" : "1 Year";
    return `${days} ${lang === "bn" ? "দিন" : "Days"}`;
  };

  const getDiscount = (plan: PlanData) => {
    if (!plan.originalPrice || plan.originalPrice <= plan.price) return 0;
    return Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === "bn" ? "bn-IN" : "en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-3 border-ev-orange border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-ev-navy to-blue-800 pb-32 relative">
        <div className="flex items-center gap-3 px-4 pt-4 pb-4">
          <button
            onClick={goBack}
            className="p-2 rounded-xl bg-white/10"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-bold text-lg">
            {lang === "bn" ? "প্রিমিয়াম প্ল্যান" : lang === "hi" ? "प्रीमियम प्लान" : "Premium Plans"}
          </h2>
          <button
            onClick={handleRefreshSubscription}
            disabled={refreshingSub}
            className="ml-auto p-2 rounded-xl bg-white/10"
            title="Refresh subscription"
          >
            <RefreshCw className={`w-4 h-4 text-white ${refreshingSub ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="text-center px-6 pb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring" }}
            className="w-16 h-16 rounded-2xl bg-ev-gold/20 flex items-center justify-center mx-auto mb-3"
          >
            <Crown className="w-8 h-8 text-ev-gold" />
          </motion.div>
          <h3 className="text-2xl font-black text-white mb-1">
            {lang === "bn" ? "ExamVault প্রিমিয়াম" : lang === "hi" ? "ExamVault प्रीमियम" : "ExamVault Premium"}
          </h3>
          <p className="text-white/60 text-sm">
            {lang === "bn"
              ? "সব প্রিমিয়াম টেস্ট ও ফিচার আনলক করুন"
              : lang === "hi"
              ? "सभी प्रीमियम टेस्ट और फीचर अनलॉक करें"
              : "Unlock all premium tests & features"}
          </p>
        </div>
      </div>

      {/* Active Subscription Card - overlapping header */}
      <div className="px-4 -mt-24 pb-2">
        {subscription.isPremium ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-ev-green to-emerald-600 rounded-2xl p-5 shadow-xl shadow-ev-green/20 mb-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/80 text-xs font-medium">
                  {lang === "bn" ? "সক্রিয় সাবস্ক্রিপশন" : "Active Subscription"}
                </p>
                <p className="text-white font-bold text-base">
                  {subscription.planName || "Premium"}
                </p>
              </div>
              <div className="ml-auto bg-white/20 px-3 py-1 rounded-lg">
                <span className="text-white text-xs font-bold">PRO</span>
              </div>
            </div>
            {subscription.premiumExpiry && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-white/70" />
                <span className="text-white/80 text-xs">
                  {lang === "bn" ? "মেয়াদ: " : "Valid until: "}
                  {formatDate(subscription.premiumExpiry)}
                </span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ev-gold-light flex items-center justify-center">
                <Zap className="w-5 h-5 text-ev-gold" />
              </div>
              <div>
                <p className="text-ev-navy font-bold text-sm">
                  {lang === "bn" ? "প্রিমিয়াম আনলক করুন" : "Unlock Premium"}
                </p>
                <p className="text-gray-500 text-xs">
                  {lang === "bn"
                    ? "সব টেস্ট ও ফিচার অ্যাক্সেস করুন"
                    : "Access all tests & features"}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Plan Cards */}
        <div className="space-y-4">
          {plans.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-gray-300" />
              </div>
              <h4 className="text-lg font-bold text-gray-400 mb-2">
                {lang === "bn" ? "কোনো প্ল্যান নেই" : "No Plans Available"}
              </h4>
              <p className="text-sm text-gray-400">
                {lang === "bn"
                  ? "এখনো কোনো প্রিমিয়াম প্ল্যান যোগ করা হয়নি।"
                  : "No premium plans have been added yet."}
              </p>
            </div>
          ) : null}
          {plans.map((plan, i) => {
            const discount = getDiscount(plan);
            const isPopular = plan.isPopular;
            const isCurrentPlan = subscription.planName === plan.name;
            return (
              <motion.div
                key={plan.id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-white rounded-2xl p-5 border-2 shadow-lg ${
                  isCurrentPlan
                    ? "border-ev-green shadow-ev-green/10"
                    : isPopular
                    ? "border-ev-orange shadow-ev-orange/20"
                    : "border-gray-100"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-ev-orange to-ev-gold text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <Star className="w-3 h-3 fill-white" />
                      MOST POPULAR
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-ev-green text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {lang === "bn" ? "বর্তমান প্ল্যান" : "CURRENT PLAN"}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-ev-navy text-lg">
                      {plan.name}
                    </h4>
                    <p className="text-gray-500 text-sm">{plan.description}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {(plan as any).subject && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{(plan as any).subject}</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.price === 0 ? "bg-green-100 text-green-700" : "bg-ev-orange/10 text-ev-orange"}`}>
                        {plan.price === 0 ? (lang === "bn" ? "বিনামূল্যে" : "FREE") : (lang === "bn" ? "প্রিমিয়াম" : "PREMIUM")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-ev-gold">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">
                      {getDurationLabel(plan.durationDays)}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-4xl font-black text-ev-navy">
                    ₹{plan.price}
                  </span>
                  {plan.originalPrice && plan.originalPrice > plan.price && (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        ₹{plan.originalPrice}
                      </span>
                      <span className="text-sm font-bold text-ev-green bg-green-50 px-2 py-0.5 rounded-lg">
                        {discount}% OFF
                      </span>
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2 mb-5">
                  {plan.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check className="w-4 h-4 text-ev-green flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-ev-green/10 text-ev-green font-bold text-sm cursor-default flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {lang === "bn" ? "বর্তমান প্ল্যান" : "Current Plan"}
                  </button>
                ) : subscription.isPremium && plan.type === "subscription" ? (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    className="w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] bg-ev-navy text-white shadow-ev-navy/20"
                  >
                    {lang === "bn" ? "আপগ্রেড করুন" : "Upgrade Plan"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan)}
                    className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] ${
                      isPopular
                        ? "bg-gradient-to-r from-ev-orange to-ev-gold text-white shadow-ev-orange/20"
                        : "bg-ev-navy text-white shadow-ev-navy/20"
                    }`}
                  >
                    {plan.type === "subscription"
                      ? lang === "bn"
                        ? "সাবস্ক্রাইব করুন"
                        : "Subscribe Now"
                      : lang === "bn"
                      ? "কিনুন"
                      : "Buy Now"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="mt-8 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h4 className="font-bold text-ev-navy mb-4 text-center">
            {lang === "bn" ? "কেন প্রিমিয়াম?" : "Why Premium?"}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <BookOpen className="w-6 h-6 text-ev-navy mx-auto mb-1" />
              <p className="text-xs font-semibold text-ev-navy">
                {lang === "bn" ? "আনলিমিটেড টেস্ট" : "Unlimited Tests"}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <Target className="w-6 h-6 text-ev-green mx-auto mb-1" />
              <p className="text-xs font-semibold text-ev-green">
                {lang === "bn" ? "বিস্তারিত সমাধান" : "Detailed Solutions"}
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-purple-600">
                {lang === "bn" ? "পারফরম্যান্স অ্যানালিটিক্স" : "Analytics"}
              </p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <Shield className="w-6 h-6 text-amber-600 mx-auto mb-1" />
              <p className="text-xs font-semibold text-amber-600">
                {lang === "bn" ? "নিরাপদ পেমেন্ট" : "Secure Payment"}
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-4 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h4 className="font-bold text-ev-navy mb-3 text-center">
            {lang === "bn" ? "সাধারণ প্রশ্ন" : "FAQ"}
          </h4>
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-sm text-ev-navy">
                {lang === "bn" ? "পেমেন্ট কি নিরাপদ?" : "Is payment secure?"}
              </p>
              <p className="text-xs text-gray-500">
                {lang === "bn"
                  ? "হ্যাঁ, সব পেমেন্ট Razorpay এর মাধ্যমে সম্পূর্ণ নিরাপদে প্রসেস হয়।"
                  : "Yes, all payments are securely processed via Razorpay with SSL encryption."}
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm text-ev-navy">
                {lang === "bn"
                  ? "সাবস্ক্রিপশন ক্যান্সেল করতে পারব?"
                  : "Can I cancel my subscription?"}
              </p>
              <p className="text-xs text-gray-500">
                {lang === "bn"
                  ? "হ্যাঁ, যেকোনো সময় ক্যান্সেল করতে পারবেন। বাকি সময়ের অ্যাক্সেস থাকবে।"
                  : "Yes, you can cancel anytime. You'll retain access for the remaining period."}
              </p>
            </div>
            <div>
              <p className="font-semibold text-sm text-ev-navy">
                {lang === "bn"
                  ? "রিফান্ড পাবো কি?"
                  : "Will I get a refund?"}
              </p>
              <p className="text-xs text-gray-500">
                {lang === "bn"
                  ? "পেমেন্টের ৭ দিনের মধ্যে রিফান্ড অনুরোধ করতে পারবেন।"
                  : "You can request a refund within 7 days of payment."}
              </p>
            </div>
          </div>
        </div>

        {/* Powered by */}
        <p className="text-center text-xs text-gray-400 mt-6 mb-8 flex items-center justify-center gap-1">
          <Shield className="w-3 h-3" />
          Payments secured by Razorpay
        </p>
      </div>
    </div>
  );
}
