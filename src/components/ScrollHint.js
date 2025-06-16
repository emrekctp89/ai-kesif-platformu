"use client";

import { useState, useEffect } from "react";
import { ArrowDown } from "lucide-react";

export function ScrollHint() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Component yüklendikten 1 saniye sonra görünür yap
    const showTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    // 5 saniye sonra gizle
    const hideTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    // Component kaldırıldığında zamanlayıcıları temizle
    return () => {
      clearTimeout(showTimeout);
      clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-in-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
      }`}
    >
      <div className="bg-secondary text-secondary-foreground rounded-full p-2 px-4 shadow-lg flex items-center gap-2">
        <p className="text-sm font-medium">Daha fazlası için aşağı kaydırın</p>
        <ArrowDown className="h-4 w-4 animate-bounce" />
      </div>
    </div>
  );
}
