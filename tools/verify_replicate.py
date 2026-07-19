#!/usr/bin/env python3
# /// script
# dependencies = [
#   "httpx",
# ]
# ///
import asyncio
import json
import sys
from pathlib import Path
import httpx

def load_env():
    env_path = Path(__file__).parent.parent / ".env.local"
    if not env_path.exists():
        print("[ERR] .env.local nao encontrado")
        sys.exit(1)
    env = {}
    for line in env_path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "replicate-python/1.0.0",
}

async def api_get(client, url, token):
    h = {**HEADERS, "Authorization": f"Token {token}"}
    resp = await client.get(url, headers=h, timeout=15.0)
    return resp.json(), resp.status_code

async def verify_replicate():
    print("=" * 50)
    print("[LINK] V.L.A.E.G. -- Replicate API (Async HTTPX)")
    print("=" * 50)

    env = load_env()
    token = env.get("REPLICATE_API_TOKEN")
    if not token:
        print("[ERR] REPLICATE_API_TOKEN ausente")
        sys.exit(1)

    print(f"[OK ] Token: {token[:8]}...{token[-4:]}")
    results = {}

    async with httpx.AsyncClient() as client:
        # 1. Verificar modelo Kling v2.6 (modelo real do projeto)
        print("\n[...] Verificando kwaivgi/kling-v2.6 (modelo do projeto)...")
        try:
            data, status = await api_get(client, "https://api.replicate.com/v1/models/kwaivgi/kling-v2.6", token)
            if status == 200:
                ver = data.get("latest_version", {}).get("id", "N/A")
                print(f"[OK ] kwaivgi/kling-v2.6 encontrado")
                print(f"      Latest version: {ver[:16] if ver != 'N/A' else 'N/A'}...")
                results["kling_v2_6"] = {"status": "ok", "version": ver[:16]}
                results["auth"] = "ok"
            elif status == 401:
                print("[TIP] Token invalido")
                sys.exit(1)
            elif status == 403:
                print("[WARN] Token sem permissao para listar modelos (scope limitado)")
                print("[INFO] Token valido para criar predicoes")
                results["kling_v2_6"] = {"status": "restricted_scope"}
                results["auth"] = "restricted"
            elif status == 404:
                print("[WARN] Modelo nao encontrado via /models -- pode estar em /deployments")
                results["kling_v2_6"] = {"status": "not_found_via_models"}
                results["auth"] = "ok"
            else:
                print(f"[ERR] Status {status}: {data}")
                results["auth"] = "error"
        except Exception as e:
            print(f"[ERR] {e}")
            results["auth"] = "error"

        # 2. Verificar conta (GET /account)
        print("\n[...] Verificando conta Replicate...")
        try:
            data, status = await api_get(client, "https://api.replicate.com/v1/account", token)
            if status == 200:
                username = data.get("username", "N/A")
                plan = data.get("type", "N/A")
                print(f"[OK ] Conta: @{username} (tipo: {plan})")
                results["account"] = {"username": username, "type": plan}
                if results.get("auth") != "restricted":
                    results["auth"] = "ok"
            elif status == 401:
                print("[TIP] Token invalido ou expirado")
                results["auth"] = "invalid"
                sys.exit(1)
        except Exception as e:
            print(f"[ERR] /account: {e}")

    # 3. Resumo
    tmp = Path(__file__).parent.parent / ".tmp"
    tmp.mkdir(exist_ok=True)
    (tmp / "verify_replicate.json").write_text(json.dumps(results, indent=2), encoding='utf-8')

    print("\n" + "=" * 50)
    ok = results.get("auth") in ("ok", "restricted")
    print(f"[{'GREEN' if ok else 'RED'}] REPLICATE LINK: {'OK' if ok else 'FALHOU'}")
    if results.get("auth") == "restricted":
        print("[INFO] Token com scope limitado -- funcional para criar predicoes")
    print("[SAVE] .tmp/verify_replicate.json")
    return ok

if __name__ == "__main__":
    asyncio.run(verify_replicate())
