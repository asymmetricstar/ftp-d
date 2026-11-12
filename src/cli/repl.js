"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startFtpRepl = startFtpRepl;
const readline = __importStar(require("readline"));
const registry_1 = require("./registry");
const banner_1 = require("./banner");
async function startFtpRepl(server, port) {
    const ctx = {
        server,
        user: null,
        homeDir: '',
        currentDir: '',
        connection: null,
    };
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
    });
    let prompt = (0, banner_1.renderFtpPrompt)(ctx);
    const writeLines = (lines) => {
        for (const line of lines) {
            process.stdout.write(`${line}\r\n`);
        }
    };
    const showPrompt = () => {
        prompt = (0, banner_1.renderFtpPrompt)(ctx);
        rl.setPrompt(prompt);
        rl.prompt();
    };
    rl.setPrompt(prompt);
    rl.prompt();
    rl.on('line', (line) => {
        const result = (0, registry_1.handleFtpCommand)(line, ctx);
        if (result.clear) {
            process.stdout.write('\u001b[2J\u001b[H');
            return;
        }
        if (result.exit) {
            process.stdout.write('\r\n');
            rl.close();
            process.exit(0);
        }
        if (result.lines.length > 0) {
            writeLines(result.lines);
        }
        showPrompt();
    });
    rl.on('close', () => {
        process.stdout.write('\r\n');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        process.stdout.write('\r\n');
        rl.close();
        process.exit(0);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jbGkvcmVwbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFZLFFBQVEscUNBQWlCO0FBR3JDLHlDQUE4QztBQUM5QyxxQ0FBMkM7QUFLcEMsS0FBSyx1QkFBdUIsTUFBaUIsRUFBRSxJQUFZO0lBQ2hFLE1BQU0sR0FBRyxHQUFrQjtRQUN6QixNQUFNO1FBQ04sSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsRUFBRTtRQUNYLFVBQVUsRUFBRSxFQUFFO1FBQ2QsVUFBVSxFQUFFLElBQUk7S0FDakIsQ0FBQztJQUVGLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUM7UUFDbEMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1FBQ3BCLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtRQUN0QixRQUFRLEVBQUUsSUFBSTtLQUNmLENBQUMsQ0FBQztJQUVILElBQUksTUFBTSxHQUFHLElBQUEsd0JBQWUsRUFBQyxHQUFHLENBQUMsQ0FBQztJQUVsQyxNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWUsRUFBUSxFQUFFO1FBQzNDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDO1FBQ3RDLENBQUM7SUFDSCxDQUFDLENBQUM7SUFFRixNQUFNLFVBQVUsR0FBRyxHQUFTLEVBQUU7UUFDNUIsTUFBTSxHQUFHLElBQUEsd0JBQWUsRUFBQyxHQUFHLENBQUMsQ0FBQztRQUM5QixFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNkLENBQUMsQ0FBQztJQUVGLEVBQUUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckIsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBRVosRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFZLEVBQUUsRUFBRTtRQUM3QixNQUFNLE1BQU0sR0FBRyxJQUFBLDJCQUFnQixFQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzQyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1lBQzFDLE9BQU87UUFDVCxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDN0IsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQixDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM1QixVQUFVLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNCLENBQUM7UUFDRCxVQUFVLEVBQUUsQ0FBQztJQUNmLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO1FBQ2xCLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFHSCxPQUFPLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7UUFDeEIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0IsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNsQixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyByZWFkbGluZSBmcm9tICdyZWFkbGluZSc7XG5pbXBvcnQgeyBGdHBTZXJ2ZXIgfSBmcm9tICcuLi9jb3JlL0Z0cFNlcnZlcic7XG5pbXBvcnQgeyBGdHBDbGlDb250ZXh0IH0gZnJvbSAnLi9jb250ZXh0JztcbmltcG9ydCB7IGhhbmRsZUZ0cENvbW1hbmQgfSBmcm9tICcuL3JlZ2lzdHJ5JztcbmltcG9ydCB7IHJlbmRlckZ0cFByb21wdCB9IGZyb20gJy4vYmFubmVyJztcblxuLyoqXG4gKiBGVFAgaW50ZXJha3RpZiB0ZXJtaW5hbCAoQ0xJIFJFUEwpIGJhxZ9sYXRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN0YXJ0RnRwUmVwbChzZXJ2ZXI6IEZ0cFNlcnZlciwgcG9ydDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIGNvbnN0IGN0eDogRnRwQ2xpQ29udGV4dCA9IHtcbiAgICBzZXJ2ZXIsXG4gICAgdXNlcjogbnVsbCxcbiAgICBob21lRGlyOiAnJyxcbiAgICBjdXJyZW50RGlyOiAnJyxcbiAgICBjb25uZWN0aW9uOiBudWxsLFxuICB9O1xuXG4gIGNvbnN0IHJsID0gcmVhZGxpbmUuY3JlYXRlSW50ZXJmYWNlKHtcbiAgICBpbnB1dDogcHJvY2Vzcy5zdGRpbixcbiAgICBvdXRwdXQ6IHByb2Nlc3Muc3Rkb3V0LFxuICAgIHRlcm1pbmFsOiB0cnVlLFxuICB9KTtcblxuICBsZXQgcHJvbXB0ID0gcmVuZGVyRnRwUHJvbXB0KGN0eCk7XG5cbiAgY29uc3Qgd3JpdGVMaW5lcyA9IChsaW5lczogc3RyaW5nW10pOiB2b2lkID0+IHtcbiAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKGAke2xpbmV9XFxyXFxuYCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHNob3dQcm9tcHQgPSAoKTogdm9pZCA9PiB7XG4gICAgcHJvbXB0ID0gcmVuZGVyRnRwUHJvbXB0KGN0eCk7XG4gICAgcmwuc2V0UHJvbXB0KHByb21wdCk7XG4gICAgcmwucHJvbXB0KCk7XG4gIH07XG5cbiAgcmwuc2V0UHJvbXB0KHByb21wdCk7XG4gIHJsLnByb21wdCgpO1xuXG4gIHJsLm9uKCdsaW5lJywgKGxpbmU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IGhhbmRsZUZ0cENvbW1hbmQobGluZSwgY3R4KTtcbiAgICBpZiAocmVzdWx0LmNsZWFyKSB7XG4gICAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnXFx1MDAxYlsySlxcdTAwMWJbSCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocmVzdWx0LmV4aXQpIHtcbiAgICAgIHByb2Nlc3Muc3Rkb3V0LndyaXRlKCdcXHJcXG4nKTtcbiAgICAgIHJsLmNsb3NlKCk7XG4gICAgICBwcm9jZXNzLmV4aXQoMCk7XG4gICAgfVxuICAgIGlmIChyZXN1bHQubGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgd3JpdGVMaW5lcyhyZXN1bHQubGluZXMpO1xuICAgIH1cbiAgICBzaG93UHJvbXB0KCk7XG4gIH0pO1xuXG4gIHJsLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICBwcm9jZXNzLnN0ZG91dC53cml0ZSgnXFxyXFxuJyk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9KTtcblxuICAvLyBHcmFjZWZ1bCBzaHV0ZG93blxuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiB7XG4gICAgcHJvY2Vzcy5zdGRvdXQud3JpdGUoJ1xcclxcbicpO1xuICAgIHJsLmNsb3NlKCk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9KTtcbn1cbiJdfQ==