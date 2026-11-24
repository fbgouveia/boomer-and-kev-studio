// Worker de reserva usado pelo teste de corrida entre processos do cost-ledger.
// Roda via `node --import tsx` (loader tsx do projeto) e devolve JSON no stdout.
import crypto from 'node:crypto';
import { reserveCost } from '../../src/lib/cost-ledger.ts';

const [ledgerDir, operationKey, amountMicros, capMicros] = process.argv.slice(2);
const payloadHash = crypto.createHash('sha256').update(`payload-${operationKey}`).digest('hex');

try {
    const outcome = reserveCost({
        ledgerDir,
        operationKey,
        amountMicros: Number(amountMicros),
        payloadHash,
        capMicros: Number(capMicros),
        jobId: 'race-test',
        sceneId: operationKey,
    });
    const kind = outcome.kind === 'reserved' || outcome.kind === 'existing' ? 'granted' : outcome.kind;
    console.log(JSON.stringify({ kind, amount: Number(amountMicros) }));
} catch (error) {
    console.log(JSON.stringify({ kind: 'thrown', message: String(error?.message ?? error) }));
}
