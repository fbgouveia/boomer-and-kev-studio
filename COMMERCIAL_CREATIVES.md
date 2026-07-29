# COMMERCIAL CREATIVES — Boomer & Kev

> A arquitetura de receita, ofertas, direitos, escala e roadmap está em
> [`COMMERCIAL_STRATEGY.md`](COMMERCIAL_STRATEGY.md). Este documento continua
> sendo a constituição criativa e produtiva da divisão.

## Natureza

**Commercial Creatives é uma linha de produção do Boomer & Kev Studio, não uma nova subsidiária.**

Na arquitetura FGSS, Boomer & Kev é um ativo operacional. Commercial Creatives é uma capacidade desse ativo: transformar produtos, ofertas e campanhas em entretenimento comercial protagonizado por Boomer e Kev.

O nome público da divisão é:

> **BOOMER & KEV — COMMERCIAL CREATIVES**

## Princípio central

> **O produto não interrompe o episódio; ele provoca o episódio.**

A marca deve entrar como causa do conflito cômico. Boomer cria desejo, exagero e energia. Kev cria resistência, objeção e credibilidade. A demonstração do produto resolve ou agrava o conflito, e o CTA nasce do payoff.

## Relação com a vitrine FGSS

A divisão materializa, dentro de um produto real, as capacidades audiovisuais demonstradas na vitrine FGSS:

- edição orientada por ritmo;
- motion design e transições paramétricas;
- trilha, atmosfera e efeitos sincronizados;
- variações de formato para mídia paga;
- produção assistida por IA com revisão humana;
- narrativa comercial mensurável, não apenas estética.

Na taxonomia da vitrine, os trabalhos desta divisão pertencem ao canal **motion/audiovisual**. A natureza de cada peça deve permanecer explícita:

- **cliente** — campanha comercial real;
- **estudo** — demonstração com marca fictícia, sempre identificada como conceito;
- **subsidiária** — materiais institucionais do próprio Boomer & Kev.

## Formatos

- anúncio curto de performance;
- sketch patrocinado;
- demonstração cômica de produto;
- integração de marca no cenário;
- social cutdown e variações 9:16 / 16:9;
- abertura, bumper, sting e CTA animado;
- criativo A/B com mudança controlada de hook, oferta ou payoff.

## Catálogo de peças estáticas

### Campanha-mãe

- key visual;
- banner hero 16:9;
- pôster principal;
- manifesto visual da campanha.

### Mídia paga e social

- feed 1:1 e 4:5;
- story/reel/TikTok 9:16;
- display 16:9;
- thumbnail;
- carrossel;
- variações A/B de hook, benefício, oferta e CTA.

### Mockups e aplicação

- embalagem e shipping box;
- camiseta, boné e merchandising;
- copo, caneca e objetos de cena;
- outdoor e mídia exterior;
- telas de celular, tablet e desktop;
- integração do patrocinador no estúdio Boomer & Kev.

## Starter kit

O primeiro sistema visual está em `public/assets/commercial-creatives/starter-kit/`:

- `campaign-banner-16x9.png`;
- `social-ad-9x16.png`;
- `brand-mockup-board.png`.

O arquivo público `public/assets/commercial-creatives/manifest.json` é a fonte de listagem para a futura galeria da aba Commercial. As peças estão marcadas como **conceito interno**, não trabalho de cliente.

## Schema mínimo do briefing

Nenhum criativo começa sem este contrato:

```ts
type CommercialCreativeBrief = {
  brand: string;
  product: string;
  audience: string;
  objective: 'awareness' | 'consideration' | 'conversion';
  offer?: string;
  proof: string[];
  objections: string[];
  mandatoryClaims: string[];
  prohibitedClaims: string[];
  callToAction: string;
  platform: 'tiktok' | 'instagram' | 'youtube' | 'multi';
  aspect: '9:16' | '16:9';
  durationSeconds: number;
  disclosure?: string;
};
```

## Regras invioláveis

1. Nenhuma promessa, resultado ou métrica pode ser inventada.
2. Marca fictícia deve ser identificada como demonstração.
3. Boomer e Kev não podem perder suas personalidades para repetir copy corporativa.
4. O benefício precisa aparecer por ação, conflito ou prova — não apenas por fala.
5. O produto não recebe aprovação final sem revisão humana de marca, claims e CTA.
6. Toda campanha paga exige autorização explícita antes de renderizações com custo.

## Critério de aprovação

Um criativo está aprovado quando:

- funciona como entretenimento mesmo sem o CTA;
- comunica produto, benefício e oferta sem ambiguidade;
- mantém o contraste Boomer × Kev;
- contém prova verificável ou demonstração honesta;
- respeita formato, duração, plataforma e disclosure;
- possui áudio, legibilidade e safe areas adequados;
- registra qual variável diferencia cada versão A/B.

## Identidade

- Paleta: preto, branco e Signal Orange `#FF5F1F`.
- Linguagem: broadcast australiano, brutalista, cinemática e direta.
- Proibido: roxo/violeta, estética genérica de agência e símbolos de “IA mágica”.
- Logo: lockup próprio da divisão, subordinado visualmente à marca Boomer & Kev.
