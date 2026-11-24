// Worker de transição (charge|release) para o teste de corrida do cost-ledger.
import { chargeCost, releaseCost } from '../../src/lib/cost-ledger.ts';

const [ledgerDir, operationKey, op] = process.argv.slice(2);
try {
    const outcome = op === 'charge'
        ? chargeCost({ ledgerDir, operationKey })
        : releaseCost({ ledgerDir, operationKey, reason: 'provider_terminal_no_charge' });
    console.log(JSON.stringify({ op, kind: outcome.kind }));
} catch (error) {
    console.log(JSON.stringify({ op, kind: 'thrown', message: String(error?.message ?? error) }));
}
