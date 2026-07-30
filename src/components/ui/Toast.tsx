'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

type Kind = 'error' | 'success';
type Item = { id: number; kind: Kind; message: string };

// ponytail: store de 10 linhas em vez de sonner/react-hot-toast — só precisamos de push + subscribe.
let items: Item[] = [];
let notify: (i: Item[]) => void = () => {};
let seq = 0;

function push(kind: Kind, message: string) {
  const item = { id: ++seq, kind, message };
  items = [...items, item];
  notify(items);
  setTimeout(() => dismiss(item.id), 5000);
}

function dismiss(id: number) {
  items = items.filter((i) => i.id !== id);
  notify(items);
}

/** Substitui `alert()`. Chamável de qualquer lugar, inclusive fora de componente. */
export const toast = {
  error: (message: string) => push('error', message),
  success: (message: string) => push('success', message),
};

export function Toaster() {
  const [list, setList] = useState<Item[]>(items);
  useEffect(() => {
    notify = setList;
    return () => { notify = () => {}; };
  }, []);

  return (
    // aria-live polite: anunciado pelo leitor de tela sem roubar o foco do usuário.
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[1000] flex flex-col gap-3 w-[min(24rem,calc(100vw-3rem))]"
    >
      {list.map((i) => {
        const Icon = i.kind === 'error' ? AlertTriangle : CheckCircle2;
        return (
          <div
            key={i.id}
            role={i.kind === 'error' ? 'alert' : undefined}
            className={`flex items-start gap-3 border-l-4 bg-[#111111] p-4 shadow-xl ${
              i.kind === 'error' ? 'border-[#EF4444]' : 'border-[#FF5F1F]'
            }`}
          >
            {/* ícone + cor: nunca comunicar estado só por cor (WCAG) */}
            <Icon
              size={18}
              className={i.kind === 'error' ? 'text-[#EF4444] shrink-0' : 'text-[#FF5F1F] shrink-0'}
            />
            <p className="flex-1 text-sm font-medium text-white/90 leading-snug">{i.message}</p>
            <button
              onClick={() => dismiss(i.id)}
              aria-label="Dismiss notification"
              className="shrink-0 p-1 text-white/50 hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
