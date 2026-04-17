"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type SupportSettings } from '@/lib/data';
import { cn } from '@/lib/utils';

// Real WhatsApp Icon SVG
const WhatsAppIcon = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.433-9.89-9.89-9.89-5.458 0-9.887 4.434-9.889 9.89-.001 2.265.655 4.398 1.876 6.204l-1.244 4.549 4.62-1.211z" />
    </svg>
);


export function WhatsappWidget() {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/v1/support-settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch WhatsApp widget settings:", error);
      }
    };
    fetchSettings();
  }, []);

  if (!settings || !settings.widgetEnabled || !settings.whatsappNumber) {
    return null;
  }
  
  // Placeholder for real user/company data
  const companyName = "Aleph IT";
  const userIdentifier = "Usuário";
  const text = encodeURIComponent(`Olá! Sou ${userIdentifier} da empresa ${companyName} e preciso de ajuda.`);
  const number = settings.whatsappNumber.replace(/\D/g, "");
  const link = `https://wa.me/${number}?text=${text}`;

  return (
    <Link
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-100",
      )}
      aria-label="Fale conosco no WhatsApp"
    >
      <WhatsAppIcon />
    </Link>
  );
}
