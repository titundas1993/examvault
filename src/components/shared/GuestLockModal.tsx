"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function GuestLockModal() {
  const { showGuestModal, setShowGuestModal, setView, language } = useAppStore();

  return (
    <Dialog open={showGuestModal} onOpenChange={setShowGuestModal}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <AnimatePresence>
          {showGuestModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative rounded-2xl overflow-hidden"
            >
              {/* Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-ev-navy via-ev-dark to-blue-900 opacity-95" />
              <div className="absolute inset-0 bg-gradient-to-t from-ev-orange/20 via-transparent to-ev-gold/10" />

              {/* Decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-ev-orange/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-ev-gold/10 rounded-full blur-2xl" />

              {/* Close button */}
              <button
                onClick={() => setShowGuestModal(false)}
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>

              {/* Content */}
              <div className="relative z-10 p-6 pb-8 flex flex-col items-center text-center">
                {/* Lock Icon */}
                <motion.div
                  initial={{ y: -10 }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.1, type: "spring", damping: 15 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-ev-orange to-ev-gold flex items-center justify-center mb-5 shadow-lg shadow-ev-orange/30"
                >
                  <Lock className="w-7 h-7 text-white" />
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-white mb-2"
                >
                  {t("loginRequired", language) || "Login Required"}
                </motion.h3>

                {/* Message */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-white/70 text-sm mb-6 leading-relaxed"
                >
                  {t("loginRequiredMsg", language) || "Please login to access this feature and unlock the full experience."}
                </motion.p>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="w-full space-y-3"
                >
                  <button
                    onClick={() => {
                      setShowGuestModal(false);
                      setView("login");
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-ev-orange to-ev-gold text-white font-semibold text-sm shadow-lg shadow-ev-orange/30 hover:shadow-ev-orange/50 transition-all active:scale-[0.98]"
                  >
                    {t("loginNow", language) || "Login Now"}
                  </button>

                  <button
                    onClick={() => setShowGuestModal(false)}
                    className="w-full py-3 rounded-xl bg-white/10 text-white/80 font-medium text-sm hover:bg-white/15 transition-all active:scale-[0.98]"
                  >
                    {t("maybeLater", language) || "Maybe Later"}
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
