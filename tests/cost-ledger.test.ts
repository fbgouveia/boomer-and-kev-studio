import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
    budgetCapMicrosFromEnv,
    chargeCost,
    LedgerLockError,
    readBudgetSummary,
    releaseCost,
    reserveCost,
} from '@/lib/cost-ledger';
import { formatUsd, MICRO_PER_USD, parseUsdToMicros } from '@/lib/money';

const PAYLOAD_A = 'a'.repeat(64);
const PAYLOAD_B = 'b'.repeat(64);

describe('cost-ledger — teto global durável', () => {
    let ledgerDir = '';
    const now = Date.parse('2026-11-08T12:00:00.000Z');
    const CAP = 30 * MICRO_PER_USD;

    beforeEach(async () => {
        ledgerDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-ledger-'));
    });

    afterEach(async () => {
        await rm(ledgerDir, { recursive: true, force: true });
    });

    it('reserva dentro do teto e o resumo reflete a verba comprometida', () => {
        const outcome = reserveCost({
            ledgerDir,
            operationKey: 'hf:job:scene1:a1',
            amountMicros: 714_000,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        });
        assert.equal(outcome.kind, 'reserved');
        const summary = readBudgetSummary(ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000);
        assert.equal(summary.remainingMicros, CAP - 714_000);
    });

    it('mesma chave + mesmo payload NUNCA reserva duas vezes', () => {
        const input = {
            ledgerDir,
            operationKey: 'hf:job:scene1:a1',
            amountMicros: 714_000,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        };
        assert.equal(reserveCost(input).kind, 'reserved');
        const again = reserveCost(input);
        assert.equal(again.kind, 'existing');
        const summary = readBudgetSummary(ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 714_000); // uma única verba
    });

    it('mesma chave com payload diferente é CONFLITO', () => {
        const base = {
            ledgerDir,
            operationKey: 'hf:job:scene2:a1',
            amountMicros: 500_000,
            capMicros: CAP,
            now,
        };
        assert.equal(reserveCost({ ...base, payloadHash: PAYLOAD_A }).kind, 'reserved');
        const conflict = reserveCost({ ...base, payloadHash: PAYLOAD_B });
        assert.deepEqual(conflict, { kind: 'conflict', reason: 'PAYLOAD_MISMATCH' });
    });

    it('teto é respeitado e a reserva excedente é desfeita (rollback sem resíduo)', async () => {
        const first = reserveCost({
            ledgerDir,
            operationKey: 'hf:job:s1:a1',
            amountMicros: 29 * MICRO_PER_USD,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        });
        assert.equal(first.kind, 'reserved');

        const second = reserveCost({
            ledgerDir,
            operationKey: 'hf:job:s2:a1',
            amountMicros: 2 * MICRO_PER_USD,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        });
        assert.deepEqual(second, {
            kind: 'budget_exceeded',
            requestedMicros: 2 * MICRO_PER_USD,
            // Admissão verifica ANTES de criar: comprometido = só o já admitido.
            committedMicros: 29 * MICRO_PER_USD,
            capMicros: CAP,
        });

        // Nenhum resíduo da reserva abortada: só o comprometimento válido resta.
        const files = (await readdir(ledgerDir)).filter((n) => n.startsWith('budget_') && n.endsWith('.json'));
        assert.equal(files.length, 1);
        assert.equal(readBudgetSummary(ledgerDir, CAP).reservedMicros, 29 * MICRO_PER_USD);
    });

    it('cobrança confirmada permanece no teto e não pode ser liberada', () => {
        const key = 'hf:job:s3:a1';
        reserveCost({ ledgerDir, operationKey: key, amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        assert.equal(chargeCost({ ledgerDir, operationKey: key, now }).kind, 'charged');
        // Cobrar de novo é idempotente (não soma duas vezes).
        assert.equal(chargeCost({ ledgerDir, operationKey: key, now }).kind, 'already_charged');
        const summary = readBudgetSummary(ledgerDir, CAP);
        assert.equal(summary.chargedMicros, 714_000);
        assert.equal(summary.reservedMicros, 0);
        assert.equal(releaseCost({ ledgerDir, operationKey: key, reason: 'provider_terminal_no_charge', now }).kind, 'charged_cannot_release');
    });

    it('liberação só com motivo documentado; depois dela a chave NÃO é reutilizável', () => {
        const key = 'hf:job:s4:a1';
        reserveCost({ ledgerDir, operationKey: key, amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        assert.equal(releaseCost({ ledgerDir, operationKey: key, reason: 'provider_terminal_no_charge', now }).kind, 'released');
        // Idempotente em liberação repetida…
        assert.equal(releaseCost({ ledgerDir, operationKey: key, reason: 'provider_terminal_no_charge', now }).kind, 'already_released');
        // …mas a mesma chave não pode reservar de novo: rerun exige NOVA tentativa.
        const reused = reserveCost({ ledgerDir, operationKey: key, amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        assert.deepEqual(reused, { kind: 'conflict', reason: 'KEY_RELEASED_USE_NEW_ATTEMPT' });
        // Motivo fora da lista documentada é rejeitado.
        assert.throws(() => releaseCost({
            ledgerDir,
            operationKey: 'hf:job:s5:a1',
            reason: 'achamos_que_libera' as never,
            now,
        }));
    });

    it('chave desconhecida não infla nem libera nada', () => {
        assert.equal(chargeCost({ ledgerDir, operationKey: 'inexistente', now }).kind, 'unknown_key');
        assert.equal(releaseCost({ ledgerDir, operationKey: 'inexistente', reason: 'provider_terminal_no_charge', now }).kind, 'unknown_key');
    });

    it('sobrevive ao reinício: novo acesso ao mesmo diretório vê a reserva', () => {
        reserveCost({ ledgerDir, operationKey: 'hf:job:s6:a1', amountMicros: 1_500_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        // "Novo processo": chamadas novas sobre o MESMO diretório em disco.
        const summary = readBudgetSummary(ledgerDir, CAP);
        assert.equal(summary.reservedMicros, 1_500_000);
        const outcome = reserveCost({
            ledgerDir,
            operationKey: 'hf:job:s6:a1',
            amountMicros: 1_500_000,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        });
        assert.equal(outcome.kind, 'existing'); // retomada não reserva duas vezes
    });

    it('registro ilegível BLOQUEIA novas reservas (conservador, nunca ignora verba)', async () => {
        await writeFile(path.join(ledgerDir, 'budget_corrompido.json'), '{ quebrado', 'utf8');
        const outcome = reserveCost({
            ledgerDir,
            operationKey: 'hf:job:s7:a1',
            amountMicros: 714_000,
            payloadHash: PAYLOAD_A,
            capMicros: CAP,
            now,
        });
        assert.equal(outcome.kind, 'ledger_corrupt');
        assert.equal((await readdir(ledgerDir)).filter((n) => n.endsWith('.json')).length, 1);
    });

    it('liberações antigas NUNCA são apagadas (memória de idempotência da chave)', async () => {
        const old = now - 30 * 24 * 60 * 60_000;
        reserveCost({ ledgerDir, operationKey: 'hf:job:antiga:a1', amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now: old });
        releaseCost({ ledgerDir, operationKey: 'hf:job:antiga:a1', reason: 'provider_terminal_no_charge', now: old });
        reserveCost({ ledgerDir, operationKey: 'hf:job:nova:a1', amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        const names = (await readdir(ledgerDir)).filter((n) => n.startsWith('budget_') && n.endsWith('.json'));
        assert.equal(names.length, 2);
        const reuse = reserveCost({ ledgerDir, operationKey: 'hf:job:antiga:a1', amountMicros: 714_000, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        assert.deepEqual(reuse, { kind: 'conflict', reason: 'KEY_RELEASED_USE_NEW_ATTEMPT' });
    });

    it('budgetCapMicrosFromEnv: padrão US$30; inválido é erro explícito', () => {
        assert.equal(budgetCapMicrosFromEnv({}), 30 * MICRO_PER_USD);
        assert.equal(budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: ' 30 ' }), 30 * MICRO_PER_USD);
        // P0-5: o ambiente só REDUZ o teto autorizado; acima de US$30 é erro.
        assert.equal(budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: '25.00' }), 25 * MICRO_PER_USD);
        assert.throws(() => budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: '30.50' }), /só é permitido reduzir/);
        assert.throws(() => budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: '30.0000001' }));
        assert.throws(() => reserveCost({ ledgerDir, operationKey: 'k', amountMicros: 1, payloadHash: PAYLOAD_A, capMicros: 31 * MICRO_PER_USD, now }));
        assert.throws(() => budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: 'abc' }));
        assert.throws(() => budgetCapMicrosFromEnv({ HIGGSFIELD_INITIAL_TEST_CAP_USD: '-5' }));
    });
});

describe('formatUsd', () => {
    it('formata micros com 3 ou 6 casas conforme o resto', () => {
        assert.equal(formatUsd(714_000), '$0.714');
        assert.equal(formatUsd(30 * MICRO_PER_USD), '$30.000');
        assert.equal(formatUsd(29_286_000), '$29.286');
        assert.equal(formatUsd(713_999), '$0.713999');
    });
});

describe('cost-ledger — corrida entre processos reais (fork)', () => {
    it('cinco processos reservando US$8 com teto US$30 jamais ultrapassam o teto', async () => {
        const ledgerDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-ledger-race-'));
        const fixturePath = fileURLToPath(new URL('./fixtures/ledger-worker.mjs', import.meta.url));
        const worktreeRoot = fileURLToPath(new URL('..', import.meta.url));
        const cap = 30 * MICRO_PER_USD;
        const amount = 8 * MICRO_PER_USD;

        const children = [0, 1, 2, 3, 4].map((index) => new Promise<string[]>((resolve, reject) => {
            const child = spawn(
                process.execPath,
                ['--import', 'tsx', fixturePath, ledgerDir, `hf:race:p${index}:a1`, String(amount), String(cap)],
                { cwd: worktreeRoot },
            );
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk) => (stdout += chunk));
            child.stderr.on('data', (chunk) => (stderr += chunk));
            child.on('error', reject);
            child.on('close', (code) => {
                if (code !== 0 && !stdout.trim()) {
                    reject(new Error(`worker ${index} saiu com código ${code}: ${stderr.slice(0, 400)}`));
                    return;
                }
                resolve(stdout.trim().split('\n').filter(Boolean));
            });
        }));

        const lines = (await Promise.all(children)).flat();
        const results = lines.map((line) => JSON.parse(line) as { kind: string; amount: number });
        const granted = results.filter((r) => r.kind === 'granted');

        // Nunca acima do teto…
        const totalGranted = granted.reduce((sum, r) => sum + r.amount, 0);
        assert.ok(totalGranted <= cap, `reservado ${totalGranted} > teto ${cap}`);
        // …com o teto realmente impedindo pedidos que somariam US$40…
        // Com admissão serializada, exatamente 3 × US$8 cabem em US$30.
        assert.equal(granted.length, 3, JSON.stringify(results));
        // …e o disco confirma exatamente o concedido.
        const summary = readBudgetSummary(ledgerDir, cap);
        assert.equal(summary.reservedMicros, totalGranted);

        await rm(ledgerDir, { recursive: true, force: true });
    });
});

// ── P0 (revisão 08/11): casos que reproduziam as falhas do candidato bloqueado ──

describe('cost-ledger — P0 revisão 08/11', () => {
    let ledgerDir = '';
    const now = Date.parse('2026-11-24T12:00:00.000Z');
    const CAP = 30 * MICRO_PER_USD;
    const fileFor = (key: string) => path.join(ledgerDir, `budget_${createHash('sha256').update(key).digest('hex')}.json`);
    const validRecord = (key: string, over: Record<string, unknown> = {}) => ({
        key, amountMicros: 2 * MICRO_PER_USD, payloadHash: PAYLOAD_A, state: 'RESERVED',
        createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(), ...over,
    });

    beforeEach(async () => { ledgerDir = await mkdtemp(path.join(os.tmpdir(), 'boomer-kev-ledger-p0-')); });
    afterEach(async () => { await rm(ledgerDir, { recursive: true, force: true }); });

    it('P0-2 admissão: US$29 + US$2 nunca soma US$31, nem na retomada da mesma chave', () => {
        assert.equal(reserveCost({ ledgerDir, operationKey: 'hf:j:s1:a1', amountMicros: 29 * MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now }).kind, 'reserved');
        const second = { ledgerDir, operationKey: 'hf:j:s2:a1', amountMicros: 2 * MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now };
        assert.equal(reserveCost(second).kind, 'budget_exceeded');
        // Antes: o registro recusado ficava no disco e a 2ª chamada o adotava como 'existing'.
        assert.equal(reserveCost(second).kind, 'budget_exceeded');
        assert.equal(readBudgetSummary(ledgerDir, CAP).reservedMicros, 29 * MICRO_PER_USD);
    });

    it('P0-3 lock abandonado: bloqueia reserva/cobrança/liberação sem mexer em verba', async () => {
        reserveCost({ ledgerDir, operationKey: 'hf:j:s1:a1', amountMicros: MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now });
        await mkdir(path.join(ledgerDir, 'budget.lock'));
        await writeFile(path.join(ledgerDir, 'budget.lock', 'owner'), '999999');
        const t0 = Date.now();
        assert.throws(() => reserveCost({ ledgerDir, operationKey: 'hf:j:s2:a1', amountMicros: MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now }), LedgerLockError);
        assert.throws(() => releaseCost({ ledgerDir, operationKey: 'hf:j:s1:a1', reason: 'provider_terminal_no_charge' }), /abandonado/);
        assert.throws(() => chargeCost({ ledgerDir, operationKey: 'hf:j:s1:a1' }), LedgerLockError);
        assert.ok(Date.now() - t0 >= 3 * 5_000 - 100);
        const summary = readBudgetSummary(ledgerDir, CAP);
        assert.equal(summary.reservedMicros, MICRO_PER_USD); // nada liberado por suposição
        assert.equal((await readdir(ledgerDir)).filter((n) => n.endsWith('.json')).length, 1);
    });

    it('P0-3 charge × release concorrentes entre processos: um vence, o outro nunca sobrescreve', async () => {
        const fixturePath = fileURLToPath(new URL('./fixtures/ledger-transition-worker.mjs', import.meta.url));
        const worktreeRoot = fileURLToPath(new URL('..', import.meta.url));
        for (let round = 0; round < 4; round++) {
            const key = `hf:race:r${round}:a1`;
            reserveCost({ ledgerDir, operationKey: key, amountMicros: MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now });
            const ops = round % 2 ? ['release', 'charge'] : ['charge', 'release'];
            const results = await Promise.all(ops.map((op) => new Promise<{ op: string; kind: string }>((resolve, reject) => {
                const child = spawn(process.execPath, ['--import', 'tsx', fixturePath, ledgerDir, key, op], { cwd: worktreeRoot });
                let out = '';
                child.stdout.on('data', (c) => (out += c));
                child.on('error', reject);
                child.on('close', () => resolve(JSON.parse(out.trim())));
            })));
            const charge = results.find((r) => r.op === 'charge')!;
            const release = results.find((r) => r.op === 'release')!;
            const raw = JSON.parse(await readFile(fileFor(key), 'utf8'));
            if (charge.kind === 'charged') {
                assert.equal(release.kind, 'charged_cannot_release');
                assert.equal(raw.state, 'CHARGED');
            } else {
                assert.equal(release.kind, 'released');
                assert.equal(charge.kind, 'conflict');
                assert.equal(raw.state, 'RELEASED');
            }
        }
    });

    for (const [label, over] of [
        ['quantia negativa', { amountMicros: -5 * MICRO_PER_USD }],
        ['quantia fracionária', { amountMicros: 1.5 }],
        ['quantia zero', { amountMicros: 0 }],
        ['estado desconhecido', { state: 'PENDING' }],
        ['hash inválido', { payloadHash: 'xyz' }],
        ['RELEASED sem motivo', { state: 'RELEASED' }],
        ['data inválida', { updatedAt: 'ontem' }],
    ] as const) {
        it(`P0-4 corrupção semântica (${label}) BLOQUEIA novas reservas e zera o saldo livre`, async () => {
            await writeFile(fileFor('hf:j:bad:a1'), JSON.stringify(validRecord('hf:j:bad:a1', over)));
            const outcome = reserveCost({ ledgerDir, operationKey: 'hf:j:new:a1', amountMicros: MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now });
            assert.equal(outcome.kind, 'ledger_corrupt');
            const summary = readBudgetSummary(ledgerDir, CAP);
            assert.equal(summary.remainingMicros, 0);
            assert.equal(summary.corruptEntries.length, 1);
        });
    }

    it('P0-4 registro gravado no arquivo de outra chave é corrupção', async () => {
        await writeFile(path.join(ledgerDir, 'budget_trocado.json'), JSON.stringify(validRecord('hf:j:x:a1')));
        assert.equal(reserveCost({ ledgerDir, operationKey: 'hf:j:new:a1', amountMicros: MICRO_PER_USD, payloadHash: PAYLOAD_A, capMicros: CAP, now }).kind, 'ledger_corrupt');
    });

    it('P0-7 quantia fracionária na reserva é erro; preço sub-micro arredonda PARA CIMA', () => {
        assert.throws(() => reserveCost({ ledgerDir, operationKey: 'k', amountMicros: 714_000.4, payloadHash: PAYLOAD_A, capMicros: CAP, now }));
        assert.equal(parseUsdToMicros('0.714'), 714_000);
        assert.equal(parseUsdToMicros('0.7140001'), 714_001);
        assert.equal(parseUsdToMicros('0.00000001'), 1);
        assert.equal(parseUsdToMicros('0.7140000'), 714_000);
        assert.equal(parseUsdToMicros('-1'), null);
        assert.equal(parseUsdToMicros('1e3'), null);
        // Número JSON também arredonda PARA CIMA (antes: toFixed(6) arredondava ao mais próximo).
        assert.equal(parseUsdToMicros(1.0000004), 1_000_001);
        assert.equal(parseUsdToMicros(0.714), 714_000);
        assert.equal(parseUsdToMicros(1e-7), null);
    });
});
