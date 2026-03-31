"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered: ", registration.scope);

          // 更新チェック
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "activated" &&
                  navigator.serviceWorker.controller
                ) {
                  // 新しいバージョンが利用可能
                  console.log("New version available. Refresh to update.");
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("SW registration failed: ", error);
        });
    }
  }, []);

  return null;
}
