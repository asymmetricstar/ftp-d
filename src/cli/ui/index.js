"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.accentGreen = exports.box = exports.visibleWidth = exports.cyan = exports.yellow = exports.green = exports.red = exports.bold = exports.dim = exports.faint = void 0;
exports.ok = ok;
exports.info = info;
exports.warn = warn;
exports.fail = fail;
exports.printJson = printJson;
exports.usePromptHandlers = usePromptHandlers;
exports.ask = ask;
exports.askSecret = askSecret;
exports.confirm = confirm;
exports.table = table;
exports.formatDate = formatDate;
const node_readline_1 = __importDefault(require("node:readline"));
const palette_js_1 = require("../theme/palette.js");
Object.defineProperty(exports, "faint", { enumerable: true, get: function () { return palette_js_1.faint; } });
Object.defineProperty(exports, "dim", { enumerable: true, get: function () { return palette_js_1.dim; } });
Object.defineProperty(exports, "bold", { enumerable: true, get: function () { return palette_js_1.bold; } });
Object.defineProperty(exports, "red", { enumerable: true, get: function () { return palette_js_1.red; } });
Object.defineProperty(exports, "green", { enumerable: true, get: function () { return palette_js_1.green; } });
Object.defineProperty(exports, "yellow", { enumerable: true, get: function () { return palette_js_1.yellow; } });
Object.defineProperty(exports, "cyan", { enumerable: true, get: function () { return palette_js_1.cyan; } });
Object.defineProperty(exports, "visibleWidth", { enumerable: true, get: function () { return palette_js_1.visibleWidth; } });
Object.defineProperty(exports, "box", { enumerable: true, get: function () { return palette_js_1.box; } });
Object.defineProperty(exports, "accentGreen", { enumerable: true, get: function () { return palette_js_1.accentGreen; } });
function ok(message) {
    console.log(`${(0, palette_js_1.green)('✓')} ${message}`);
}
function info(message) {
    console.log(`${(0, palette_js_1.cyan)('→')} ${message}`);
}
function warn(message) {
    console.error(`${(0, palette_js_1.yellow)('!')} ${message}`);
}
function fail(message) {
    throw new Error(message);
}
function printJson(value) {
    console.log(JSON.stringify(value, null, 2));
}
let promptHandlers = null;
function usePromptHandlers(handlers) {
    promptHandlers = handlers;
}
async function ask(question) {
    if (promptHandlers)
        return (await promptHandlers.ask(question)).trim();
    const rl = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = await new Promise((resolve) => {
            rl.question(question, resolve);
            rl.once('close', () => resolve(''));
        });
        return answer.trim();
    }
    finally {
        rl.close();
        await new Promise((resolve) => setImmediate(resolve));
    }
}
async function askSecret(question) {
    if (promptHandlers)
        return (await promptHandlers.askSecret(question)).trim();
    if (!process.stdin.isTTY)
        return ask(question);
    const rl = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    return new Promise((resolve) => {
        process.stdout.write(`${question} `);
        rl.question('', (answer) => {
            process.stdout.write('\n');
            rl.close();
            setImmediate(() => resolve(answer));
        });
    });
}
async function confirm(question, fallback = false) {
    if (!promptHandlers && !process.stdin.isTTY)
        return fallback;
    const answer = (await ask(`${question} ${fallback ? '[Y/n]' : '[y/N]'} `)).toLowerCase();
    if (answer === '')
        return fallback;
    return answer === 'y' || answer === 'yes';
}
function table(headers, rows) {
    const widths = headers.map((header, index) => Math.max(header.length, ...rows.map((row) => (row[index] ?? '').length)));
    const pad = (cells) => cells.map((cell, index) => cell.padEnd(widths[index] ?? 0));
    const line = (cells) => pad(cells).join('  ').trimEnd();
    return [
        pad(headers)
            .map((cell) => (0, palette_js_1.bold)(cell))
            .join('  ')
            .trimEnd(),
        widths.map((width) => (0, palette_js_1.faint)('─'.repeat(width))).join('  '),
        ...rows.map(line),
    ].join('\n');
}
function formatDate(iso) {
    if (!iso)
        return '-';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvY2xpL3VpL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0VBQXFDO0FBRXJDLG9EQUFpSDtzRkFBeEcsa0JBQUs7b0ZBQUUsZ0JBQUc7cUZBQUUsaUJBQUk7b0ZBQUUsZ0JBQUc7c0ZBQUUsa0JBQUs7dUZBQUUsbUJBQU07cUZBQUUsaUJBQUk7NkZBQUUseUJBQVk7b0ZBQUUsZ0JBQUc7NEZBQUUsd0JBQVc7QUFLbkYsWUFBbUIsT0FBZTtJQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBQSxrQkFBSyxFQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUdELGNBQXFCLE9BQWU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUEsaUJBQUksRUFBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ3pDLENBQUM7QUFHRCxjQUFxQixPQUFlO0lBQ2xDLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFBLG1CQUFNLEVBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBR0QsY0FBcUIsT0FBZTtJQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxtQkFBMEIsS0FBYztJQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUM7QUFRRCxJQUFJLGNBQWMsR0FBMEIsSUFBSSxDQUFDO0FBR2pELDJCQUFrQyxRQUErQjtJQUMvRCxjQUFjLEdBQUcsUUFBUSxDQUFDO0FBQzVCLENBQUM7QUFHTSxLQUFLLGNBQWMsUUFBZ0I7SUFFeEMs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QUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7QUFDcEUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCByZWFkbGluZSBmcm9tICdub2RlOnJlYWRsaW5lJztcblxuaW1wb3J0IHsgZmFpbnQsIGRpbSwgYm9sZCwgcmVkLCBncmVlbiwgeWVsbG93LCBjeWFuLCB2aXNpYmxlV2lkdGgsIGJveCwgYWNjZW50R3JlZW4gfSBmcm9tICcuLi90aGVtZS9wYWxldHRlLmpzJztcblxuZXhwb3J0IHsgZmFpbnQsIGRpbSwgYm9sZCwgcmVkLCBncmVlbiwgeWVsbG93LCBjeWFuLCB2aXNpYmxlV2lkdGgsIGJveCwgYWNjZW50R3JlZW4gfTtcblxuLyoqIEEgc3VjY2Vzc2Z1bCBzdGVwLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9rKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICBjb25zb2xlLmxvZyhgJHtncmVlbign4pyTJyl9ICR7bWVzc2FnZX1gKTtcbn1cblxuLyoqIEEgbmV1dHJhbCBuZXh0IHN0ZXAgb3IgcGllY2Ugb2YgaW5mb3JtYXRpb24uICovXG5leHBvcnQgZnVuY3Rpb24gaW5mbyhtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc29sZS5sb2coYCR7Y3lhbign4oaSJyl9ICR7bWVzc2FnZX1gKTtcbn1cblxuLyoqIEEgd2FybmluZyB0aGF0IGRvZXMgbm90IHN0b3AgdGhlIGNvbW1hbmQuICovXG5leHBvcnQgZnVuY3Rpb24gd2FybihtZXNzYWdlOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc29sZS5lcnJvcihgJHt5ZWxsb3coJyEnKX0gJHttZXNzYWdlfWApO1xufVxuXG4vKiogU3RvcCB0aGUgY29tbWFuZCB3aXRoIGEgcmVhZGFibGUgZXJyb3IuICovXG5leHBvcnQgZnVuY3Rpb24gZmFpbChtZXNzYWdlOiBzdHJpbmcpOiBuZXZlciB7XG4gIHRocm93IG5ldyBFcnJvcihtZXNzYWdlKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByaW50SnNvbih2YWx1ZTogdW5rbm93bik6IHZvaWQge1xuICBjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeSh2YWx1ZSwgbnVsbCwgMikpO1xufVxuXG4vKiogVGhlIGludGVyYWN0aXZlIHNoZWxsIG93bnMgdGhlIHRlcm1pbmFsLCBzbyBjb21tYW5kcyBhc2sgdGhlaXIgcXVlc3Rpb25zIHRocm91Z2ggaXQuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb21wdEhhbmRsZXJzIHtcbiAgYXNrKHF1ZXN0aW9uOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz47XG4gIGFza1NlY3JldChxdWVzdGlvbjogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG5sZXQgcHJvbXB0SGFuZGxlcnM6IFByb21wdEhhbmRsZXJzIHwgbnVsbCA9IG51bGw7XG5cbi8qKiBJbnN0YWxsIG9yIHJlbW92ZSB0aGUgcHJvbXB0IGhhbmRsZXJzIHVzZWQgYnkgYGFza2AvYGFza1NlY3JldGAuICovXG5leHBvcnQgZnVuY3Rpb24gdXNlUHJvbXB0SGFuZGxlcnMoaGFuZGxlcnM6IFByb21wdEhhbmRsZXJzIHwgbnVsbCk6IHZvaWQge1xuICBwcm9tcHRIYW5kbGVycyA9IGhhbmRsZXJzO1xufVxuXG4vKiogUmVhZCBvbmUgbGluZSBmcm9tIHRoZSB0ZXJtaW5hbCwgdHJpbW1lZC4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBhc2socXVlc3Rpb246IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XG4gIC8vIFNoZWxsIGFrdGlma2VuIHRlayByZWFkbGluZSBrdWxsYW7EsWzEsXI7IGlraW5jaSBiaXIgYXJhecO8eiBzYXTEsXJsYXLEsSBpa2l5ZSBrYXRsYXJkxLEuXG4gIGlmIChwcm9tcHRIYW5kbGVycykgcmV0dXJuIChhd2FpdCBwcm9tcHRIYW5kbGVycy5hc2socXVlc3Rpb24pKS50cmltKCk7XG5cbiAgY29uc3QgcmwgPSByZWFkbGluZS5jcmVhdGVJbnRlcmZhY2UoeyBpbnB1dDogcHJvY2Vzcy5zdGRpbiwgb3V0cHV0OiBwcm9jZXNzLnN0ZG91dCB9KTtcbiAgdHJ5IHtcbiAgICBjb25zdCBhbnN3ZXIgPSBhd2FpdCBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlKSA9PiB7XG4gICAgICBybC5xdWVzdGlvbihxdWVzdGlvbiwgcmVzb2x2ZSk7XG4gICAgICBybC5vbmNlKCdjbG9zZScsICgpID0+IHJlc29sdmUoJycpKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYW5zd2VyLnRyaW0oKTtcbiAgfSBmaW5hbGx5IHtcbiAgICBybC5jbG9zZSgpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRJbW1lZGlhdGUocmVzb2x2ZSkpO1xuICB9XG59XG5cbi8qKiBSZWFkIGEgcGFzc3dvcmQgd2l0aG91dCBlY2hvaW5nIGl0OyBmYWxscyBiYWNrIHRvIGEgbm9ybWFsIGxpbmUgb2ZmIGEgVFRZLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGFza1NlY3JldChxdWVzdGlvbjogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgaWYgKHByb21wdEhhbmRsZXJzKSByZXR1cm4gKGF3YWl0IHByb21wdEhhbmRsZXJzLmFza1NlY3JldChxdWVzdGlvbikpLnRyaW0oKTtcbiAgaWYgKCFwcm9jZXNzLnN0ZGluLmlzVFRZKSByZXR1cm4gYXNrKHF1ZXN0aW9uKTtcbiAgY29uc3QgcmwgPSByZWFkbGluZS5jcmVhdGVJbnRlcmZhY2UoeyBpbnB1dDogcHJvY2Vzcy5zdGRpbiwgb3V0cHV0OiBwcm9jZXNzLnN0ZG91dCwgdGVybWluYWw6IHRydWUgfSk7XG4gIHJldHVybiBuZXcgUHJvbWlzZTxzdHJpbmc+KChyZXNvbHZlKSA9PiB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoYCR7cXVlc3Rpb259IGApO1xuICAgIHJsLnF1ZXN0aW9uKCcnLCAoYW5zd2VyKSA9PiB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnXFxuJyk7XG4gICAgICBybC5jbG9zZSgpO1xuICAgICAgc2V0SW1tZWRpYXRlKCgpID0+IHJlc29sdmUoYW5zd2VyKSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKiogQXNrIGEgeWVzL25vIHF1ZXN0aW9uOyBub24taW50ZXJhY3RpdmUgcnVucyB1c2UgdGhlIGZhbGxiYWNrLiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbmZpcm0ocXVlc3Rpb246IHN0cmluZywgZmFsbGJhY2sgPSBmYWxzZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICBpZiAoIXByb21wdEhhbmRsZXJzICYmICFwcm9jZXNzLnN0ZGluLmlzVFRZKSByZXR1cm4gZmFsbGJhY2s7XG4gIGNvbnN0IGFuc3dlciA9IChhd2FpdCBhc2soYCR7cXVlc3Rpb259ICR7ZmFsbGJhY2sgPyAnW1kvbl0nIDogJ1t5L05dJ30gYCkpLnRvTG93ZXJDYXNlKCk7XG4gIGlmIChhbnN3ZXIgPT09ICcnKSByZXR1cm4gZmFsbGJhY2s7XG4gIHJldHVybiBhbnN3ZXIgPT09ICd5JyB8fCBhbnN3ZXIgPT09ICd5ZXMnO1xufVxuXG4vKiogQSBzbWFsbCBhbGlnbmVkIHRhYmxlIHdpdGggYSBkYXNoZWQgaGVhZGVyIHVuZGVybGluZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0YWJsZShoZWFkZXJzOiBzdHJpbmdbXSwgcm93czogc3RyaW5nW11bXSk6IHN0cmluZyB7XG4gIGNvbnN0IHdpZHRocyA9IGhlYWRlcnMubWFwKChoZWFkZXIsIGluZGV4KSA9PlxuICAgIE1hdGgubWF4KGhlYWRlci5sZW5ndGgsIC4uLnJvd3MubWFwKChyb3cpID0+IChyb3dbaW5kZXhdID8/ICcnKS5sZW5ndGgpKSxcbiAgKTtcbiAgY29uc3QgcGFkID0gKGNlbGxzOiBzdHJpbmdbXSk6IHN0cmluZ1tdID0+XG4gICAgY2VsbHMubWFwKChjZWxsLCBpbmRleCkgPT4gY2VsbC5wYWRFbmQod2lkdGhzW2luZGV4XSA/PyAwKSk7XG4gIGNvbnN0IGxpbmUgPSAoY2VsbHM6IHN0cmluZ1tdKTogc3RyaW5nID0+IHBhZChjZWxscykuam9pbignICAnKS50cmltRW5kKCk7XG4gIHJldHVybiBbXG4gICAgcGFkKGhlYWRlcnMpXG4gICAgICAubWFwKChjZWxsKSA9PiBib2xkKGNlbGwpKVxuICAgICAgLmpvaW4oJyAgJylcbiAgICAgIC50cmltRW5kKCksXG4gICAgd2lkdGhzLm1hcCgod2lkdGgpID0+IGZhaW50KCfilIAnLnJlcGVhdCh3aWR0aCkpKS5qb2luKCcgICcpLFxuICAgIC4uLnJvd3MubWFwKGxpbmUpLFxuICBdLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGF0ZShpc286IHN0cmluZyB8IHVuZGVmaW5lZCk6IHN0cmluZyB7XG4gIGlmICghaXNvKSByZXR1cm4gJy0nO1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoaXNvKTtcbiAgcmV0dXJuIE51bWJlci5pc05hTihkYXRlLmdldFRpbWUoKSkgPyBpc28gOiBkYXRlLnRvTG9jYWxlU3RyaW5nKCk7XG59XG4iXX0=