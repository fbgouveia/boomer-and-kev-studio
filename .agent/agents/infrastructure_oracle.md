# Infraestrutura Oracle Cloud — Lorena & Clara
**Decisão arquitetural registrada em:** 2026-03-14
**Arquiteto:** Claude Sonnet 4.6

---

## Decisão de Região
```
Região escolhida : sa-saopaulo-1 (Brazil East — São Paulo)
Alternativa      : sa-vinhedo-1  (Brazil Southeast — Vinhedo) ← descartada
Motivo           : São Paulo tem maior maturidade de serviços,
                   mais opções no free tier, e menor latência
                   para a maioria do território brasileiro.
```

## Arquitetura de Backup — 3 Camadas
```
CAMADA 1 — Local (ativo)
  D:/Lorena/   ← trabalho ativo, edição, interação local
  D:/Clara/    ← trabalho ativo, edição, interação local

CAMADA 2 — Frio (Seagate 2TB — F:)  ✅ IMPLEMENTADO
  F:/backup_soberano/Lorena_20260314_191503/
  F:/backup_soberano/Clara_20260314_191515/

CAMADA 3 — Quente (Oracle Cloud)  ⏳ EM CRIAÇÃO
  VM: ARM A1 Ampere — 4 OCPUs, 24GB RAM (free tier)
  Lorena + Clara rodam aqui 24/7
  Dados chegam CRIPTOGRAFADOS — Oracle nunca lê o conteúdo
```

## Segurança — Soberania Total
```
Protocolo     : GPG 4096-bit (RSA)
Chave ID      : fbgou@soberano.local
Chave pública : F:/backup_soberano/chave_publica_fbgou.asc
Chave privada : F:/backup_soberano/chave_PRIVADA_fbgou_NUNCA_COMPARTILHE.asc
                ⚠️ NUNCA subir para nuvem. Nunca compartilhar.

Fluxo de upload:
  D:/Lorena/ → gpg --encrypt → arquivo.gpg → Oracle VM
  Oracle vê: bytes cifrados (inúteis sem a chave privada)
  Apenas fbgou pode decifrar.
```

## Conexão Segura — WireGuard (pendente)
```
Protocolo : WireGuard VPN ponto-a-ponto
Topologia : fbgou (Windows 11) ↔ Oracle VM (Ubuntu)
Motivo    : tráfego entre máquinas nunca exposto à internet pública
Status    : aguardando criação da VM
```

## VM Target — Especificações
```
Shape     : VM.Standard.A1.Flex (ARM Ampere)
OCPUs     : 4 (máximo free tier)
RAM       : 24 GB (máximo free tier)
Storage   : 200 GB boot volume (free tier)
OS        : Ubuntu 22.04 LTS ARM64
Uso       : Ollama + Lorena + Clara + WireGuard
```

## Ordem de Execução
1. ✅ Backup Seagate
2. ✅ Chave GPG 4096-bit
3. ⏳ Criar conta Oracle (em andamento por fbgou)
4. ⬜ Criar VM ARM A1 em sa-saopaulo-1
5. ⬜ Configurar WireGuard
6. ⬜ Instalar Ollama na VM
7. ⬜ Criptografar e subir Lorena + Clara
8. ⬜ Google Drive sync (dados/memória — camada adicional)

---
*Documento vivo — atualizar a cada etapa concluída*
