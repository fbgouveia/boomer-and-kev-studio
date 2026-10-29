"""QC de fala por cena (POP: architecture/qc-supervisor.md, checagem 1).

Transcreve o clipe localmente (faster-whisper, US$0) e compara com a fala do roteiro.
Saída: JSON em stdout com status PASS | FLAG | FAIL, transcrição, palavras com tempo
(alimentam legendas sincronizadas) e diferenças.

Uso: python3 tools/qc_speech.py <clipe.mp4> "<fala esperada>"
Autoteste: python3 tools/qc_speech.py --selftest
"""
import difflib
import json
import re
import sys

# ponytail: lista curta e explícita; palavra sensível = FLAG (humano ouve), nunca censura automática.
SENSITIVE = {"pricks", "prick", "fuck", "fucking", "shit", "cunt", "bastard", "bitch", "dick", "cock", "wanker"}
# Cobertura mínima da fala esperada para não considerar a fala cortada/faltando.
MIN_COVERAGE = 0.8


def words_of(text: str) -> list[str]:
    # Grafia australiana (optimise) e americana (optimize) do transcritor = mesma palavra.
    words = re.findall(r"[a-z0-9']+", text.lower().replace("’", "'"))
    return [re.sub(r"is(e|es|ed|ing)$", r"iz\1", w) for w in words]


def compare(expected: str, heard: str) -> dict:
    exp, got = words_of(expected), words_of(heard)
    matcher = difflib.SequenceMatcher(a=exp, b=got, autojunk=False)
    ops = [op for op in matcher.get_opcodes() if op[0] != "equal"]
    # Cobertura mede fala FALTANDO (cortada). Palavra trocada conta como falada: vira FLAG.
    missing = sum(max(0, (i2 - i1) - (j2 - j1)) for _, i1, i2, j1, j2 in ops)
    coverage = 1 - missing / len(exp) if exp else 1.0
    diffs = [f"{' '.join(exp[i1:i2]) or '∅'} → {' '.join(got[j1:j2]) or '∅'}" for _, i1, i2, j1, j2 in ops]
    sensitive = sorted({w for w in got if w in SENSITIVE} - set(exp))
    status = "FAIL" if coverage < MIN_COVERAGE else ("FLAG" if diffs or sensitive else "PASS")
    return {"status": status, "coverage": round(coverage, 3), "diffs": diffs, "sensitive": sensitive}


def transcribe(clip: str) -> tuple[str, list[dict]]:
    from faster_whisper import WhisperModel  # import tardio: o autoteste não precisa do modelo
    model = WhisperModel("small", device="cpu", compute_type="int8")
    segments, _ = model.transcribe(clip, language="en", word_timestamps=True)
    words = [{"w": w.word.strip(), "start": round(w.start, 2), "end": round(w.end, 2)}
             for s in segments for w in s.words]
    return " ".join(w["w"] for w in words), words


def selftest() -> None:
    ok = compare("Fair dinkum, it's a full-time job!", "Fair dinkum! It's a full-time job!")
    assert ok["status"] == "PASS", ok
    swapped = compare("tracking their petrol prices", "tracking their pectoral prices")
    assert swapped["status"] == "FLAG" and swapped["diffs"] == ["petrol → pectoral"], swapped
    rude = compare("like winning a mini Grand Prix", "like winning a mini grand pricks")
    assert rude["status"] == "FLAG" and rude["sensitive"] == ["pricks"], rude
    spelling = compare("optimising your route", "optimizing your route")
    assert spelling["status"] == "PASS", spelling
    cut = compare("So they drive further to save pennies on fuel burning more fuel", "So they drive")
    assert cut["status"] == "FAIL", cut
    print("selftest OK")


if __name__ == "__main__":
    if sys.argv[1:] == ["--selftest"]:
        selftest()
        sys.exit(0)
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    transcript, words = transcribe(sys.argv[1])
    print(json.dumps({"transcript": transcript, "words": words, **compare(sys.argv[2], transcript)}, ensure_ascii=False))
