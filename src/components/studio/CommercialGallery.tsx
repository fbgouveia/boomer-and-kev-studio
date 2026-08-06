"use client";

import React, { useState, useEffect } from 'react';
import { Briefcase, AlertTriangle, ImageOff, Loader2 } from 'lucide-react';

// O manifest vive em public/ (é servido junto com os assets, e é a fonte da verdade de quem
// publica). Por isso fetch em runtime em vez de import estático como o radar.json.
const MANIFEST_URL = '/assets/commercial-creatives/manifest.json';

interface CommercialAsset {
  id: string;
  type: string;
  format: string;
  file: string;
  use: string[];
}

interface Manifest {
  collection: string;
  version: number;
  status: string;
  disclosure: string;
  assets: CommercialAsset[];
}

// A caixa de preview tem proporção FIXA para todos os cards. Usar o aspect nativo de cada asset
// (16:9, 9:16, 1:1) fazia o card vertical virar uma coluna gigante e o grid sair desalinhado.
// Fixa também reserva a altura antes da imagem carregar, então continua sem layout shift.
const PREVIEW_RATIO = '4 / 3';

export function CommercialGallery() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_URL)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(m => { if (!cancelled) setManifest(m); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-12 py-12 bg-[#050505] text-white">
      {/* HEADER */}
      <div className="mb-12 border-b border-white/10 pb-6 flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <span className="text-sm font-black text-[#FF5F1F] tracking-[0.4em] block uppercase italic mb-1">Commercial Creatives</span>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tighter uppercase italic">Galeria Comercial</h2>
          <p className="text-white/60 text-xs font-mono mt-2 max-w-xl">
            Linha de produção interna do Studio. Estes assets são públicos por intenção — o painel
            operacional continua privado.
          </p>
        </div>
        {manifest && (
          <div className="flex items-center gap-2 px-4 py-1.5 border border-[#FF5F1F]/30 bg-[#FF5F1F]/5 text-[#FF5F1F] text-xs font-black tracking-widest uppercase">
            <Briefcase size={12} /> {manifest.assets.length} ASSETS · V{manifest.version}
          </div>
        )}
      </div>

      {/* DISCLOSURE — status 'concept' significa demonstração interna, não trabalho de cliente.
          Fica em destaque de propósito: honestidade é regra do projeto, não rodapé. */}
      {manifest && (
        <div className="mb-10 flex items-start gap-3 border border-yellow-500/30 bg-yellow-500/5 px-5 py-4">
          <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs font-mono text-yellow-200/90 leading-relaxed">
            <span className="font-black uppercase tracking-widest text-yellow-500">
              Status: {manifest.status}
            </span>
            <span className="block mt-1">{manifest.disclosure}</span>
          </p>
        </div>
      )}

      {/* ESTADOS */}
      {!manifest && !error && (
        <div className="flex items-center gap-3 text-white/60 font-mono text-xs uppercase tracking-widest">
          <Loader2 size={14} className="animate-spin text-[#FF5F1F]" aria-hidden="true" />
          Carregando manifest…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/5 px-5 py-4">
          <ImageOff size={16} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs font-mono text-red-200/90 leading-relaxed">
            <span className="font-black uppercase tracking-widest text-red-400">Manifest não carregou</span>
            <span className="block mt-1">{error} — confira {MANIFEST_URL}.</span>
          </p>
        </div>
      )}

      {manifest && manifest.assets.length === 0 && (
        <p className="text-white/60 font-mono text-xs uppercase tracking-widest">
          Nenhum asset publicado ainda.
        </p>
      )}

      {/* GRID */}
      {manifest && manifest.assets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {manifest.assets.map(asset => (
            <figure key={asset.id} className="border border-white/10 bg-[#0d0d0d] group">
              <div
                className="w-full overflow-hidden bg-black/40 border-b border-white/10 p-3"
                style={{ aspectRatio: PREVIEW_RATIO }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- asset estático servido
                    de public/, sem otimização remota; next/image aqui só somaria configuração. */}
                <img
                  src={asset.file}
                  alt={`${asset.type} em formato ${asset.format} da coleção Commercial Creatives`}
                  loading="lazy"
                  // object-contain e não cover: cortar peça criativa a apresenta errado — um
                  // banner cortado não é o banner. O formato real fica declarado no rodapé do card.
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
              <figcaption className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <span className="text-xs font-black uppercase tracking-widest text-[#FF5F1F]">
                    {asset.type}
                  </span>
                  <span className="text-xs font-mono text-white/60 tabular-nums">{asset.format}</span>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {asset.use.map(u => (
                    <li
                      key={u}
                      className="text-[10px] font-mono uppercase tracking-wider text-white/70 border border-white/15 px-2 py-1"
                    >
                      {u}
                    </li>
                  ))}
                </ul>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
