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
exports.normalizeDirPath = normalizeDirPath;
exports.robustPathNormalize = robustPathNormalize;
exports.isPathWithinHome = isPathWithinHome;
exports.ensureDirectoryExists = ensureDirectoryExists;
exports.getFullPath = getFullPath;
exports.resolveFtpPath = resolveFtpPath;
exports.toVirtualPath = toVirtualPath;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function normalizeDirPath(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
        return '';
    }
    let normalized = dirPath.replace(/\\/g, '/');
    if (/^[a-zA-Z]:\//.test(normalized) || /^([a-zA-Z]:\.)|([a-zA-Z]:\/)/.test(normalized)) {
        return normalized;
    }
    if (normalized.startsWith('./')) {
        normalized = normalized.slice(2);
    }
    if (!normalized.startsWith('/') && !/^[a-zA-Z]:\//.test(normalized)) {
        normalized = '/' + normalized;
    }
    return normalized;
}
function robustPathNormalize(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
        return '';
    }
    let normalized = dirPath.replace(/\\/g, '/');
    normalized = normalized.replace(/\/+/g, '/');
    normalized = normalized.replace(/\/\.\//g, '/').replace(/\.\//g, '');
    if (normalized === 'files/admin' || normalized === 'files/guest') {
        normalized = '/files/admin';
    }
    else if (normalized === 'files' || normalized === 'admin' || normalized === 'guest') {
        normalized = '/files';
    }
    else if (normalized === '') {
        normalized = '/';
    }
    if (normalized.startsWith('/')) {
        return normalized;
    }
    if (/^[a-zA-Z]:\/\//.test(normalized) || /^[a-zA-Z]:\/\./.test(normalized)) {
        return normalized;
    }
    if (!normalized.startsWith('.') && !normalized.startsWith('/')) {
        normalized = './' + normalized;
    }
    return normalized;
}
function isPathWithinHome(targetPath, homeDir) {
    const targetNormalized = targetPath.replace(/\\/g, '/');
    const homeNormalized = (homeDir || '.').replace(/\\/g, '/');
    const targetClean = targetNormalized.replace(/\/+$/, '');
    const homeClean = homeNormalized.replace(/\/+$/, '');
    if (targetClean === homeClean) {
        return true;
    }
    if (homeClean !== '' && targetClean.startsWith(homeClean + '/')) {
        return true;
    }
    return false;
}
async function ensureDirectoryExists(dirPath) {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}
function getFullPath(baseDir, filePath) {
    if (!baseDir || !filePath) {
        return '';
    }
    return path.resolve(baseDir, filePath);
}
function resolveFtpPath(targetPath, currentDir, homeDir) {
    const home = path.resolve(homeDir || '.');
    const current = path.resolve(currentDir || home);
    const raw = (targetPath || '').trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
    if (!raw || raw === '.') {
        return current;
    }
    if (/^[a-zA-Z]:\//.test(raw)) {
        return path.resolve(raw);
    }
    if (raw.startsWith('/')) {
        const asFileSystemPath = path.resolve(raw);
        if (isPathWithinHome(asFileSystemPath, home)) {
            return asFileSystemPath;
        }
        return path.resolve(home, raw.replace(/^\/+/, ''));
    }
    return path.resolve(current, raw);
}
function toVirtualPath(fsPath, homeDir) {
    const home = path.resolve(homeDir || '.');
    const target = path.resolve(fsPath || home);
    const relative = path.relative(home, target);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
        return '/';
    }
    return '/' + relative.replace(/\\/g, '/');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3BhdGhVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFZLElBQUksaUNBQWE7QUFDN0IsTUFBWSxFQUFFLCtCQUFXO0FBTXpCLDBCQUFpQyxPQUFlO0lBQzlDLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDNUMsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBR0QsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFHN0MsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBRXZGLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFHRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNoQyxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBR0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDcEUsVUFBVSxHQUFHLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDaEMsQ0FBQztJQUVELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFNRCw2QkFBb0MsT0FBZTtJQUNqRCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUdELElBQUksVUFBVSxHQUFH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LE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDeEUsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5cbi8qKlxuICogRGl6aW4geW9sdW51IG5vcm1hbGl6ZSBldFxuICogV2luZG93cyBhYnNvbHV0ZSBwYXRoJ2xlcmkgbXV0bGFrIG9sYXJhayBrYWxzxLFuLCAuLyBwcmVmaXgnaSBrYWxkxLFyLCByb290J3RhbiBiYcWfbGF0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVEaXJQYXRoKGRpclBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghZGlyUGF0aCB8fCB0eXBlb2YgZGlyUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICAvLyAxLiBXaW5kb3dzIGFic29sdXRlIHBhdGgnbGVyaSBub3JtYWxpemUgZXQgKEM6XFwuLi4gLT4gQzovLi4uKVxuICBsZXQgbm9ybWFsaXplZCA9IGRpclBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIC8vIDIuIFdpbmRvd3MgZHJpdmUgbGV0dGVyIHBhdGgga29udHJvbMO8IChDOi8uLi4gdmV5YSBDOi4uLilcbiAgaWYgKC9eW2EtekEtWl06XFwvLy50ZXN0KG5vcm1hbGl6ZWQpIHx8IC9eKFthLXpBLVpdOlxcLil8KFthLXpBLVpdOlxcLykvLnRlc3Qobm9ybWFsaXplZCkpIHtcbiAgICAvLyBXaW5kb3dzIGFic29sdXRlIHBhdGgsIG11dGxhayBvbGFyYWsga2Fsc8SxbjogQzovVXNlcnMvLi4uL2ZpbGVzL2FkbWluXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQ7XG4gIH1cblxuICAvLyAzLiAuLyBwcmVmaXgnaSBrYWxkxLFyXG4gIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5zbGljZSgyKTtcbiAgfVxuXG4gIC8vIDQuIEXEn2VyIGFic29sdXRlIGRlxJ9pbHNlLCByb290J2RhbiBiYcWfbGF0XG4gIGlmICghbm9ybWFsaXplZC5zdGFydHNXaXRoKCcvJykgJiYgIS9eW2EtekEtWl06XFwvLy50ZXN0KG5vcm1hbGl6ZWQpKSB7XG4gICAgbm9ybWFsaXplZCA9ICcvJyArIG5vcm1hbGl6ZWQ7XG4gIH1cbiAgXG4gIHJldHVybiBub3JtYWxpemVkO1xufVxuXG4vKipcbiAqIExpbnV4IHZlIFdpbmRvd3MgcGF0aCdsZXJpbmkgZ8O8w6dsw7wgxZ9la2lsZGUgbm9ybWFsaXplIGV0XG4gKiBCYWNrc2xhc2ggLT4gZm9yd2FyZCBzbGFzaCwgLi8gdmUgLi4vIMOnw7Z6LCByZWxhdGl2ZSBwYXRoIHlhcCAoUE9TSVggLyB5ZXJpbmUgV2luZG93cyB1eXVtbHUpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb2J1c3RQYXRoTm9ybWFsaXplKGRpclBhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gIGlmICghZGlyUGF0aCB8fCB0eXBlb2YgZGlyUGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gJyc7XG4gIH1cblxuICAvLyAxLiBCYWNrc2xhc2gnbGVyaSBmb3J3YXJkIHNsYXNoJ2Ugw6dldmlyXG4gIGxldCBub3JtYWxpemVkID0gZGlyUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLy8gMi4gLi8gdmUgLi4vIHNlZ21lbnQnbGVyaW5pIMOnw7Z6XG4gIC8vIHJlcGVhdGVkIC8gLT4gc2luZ2xlIC9cbiAgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZWQucmVwbGFjZSgvXFwvKy9nLCAnLycpO1xuICAvLyAuLyBzZWdtZW50J2xlcmluaSBrYWxkxLFyXG4gIG5vcm1hbGl6ZWQgPSBub3JtYWxpemVkLnJlcGxhY2UoL1xcL1xcLlxcLy9nLCAnLycpLnJlcGxhY2UoL1xcLlxcLy9nLCAnJyk7XG4gIC8vIC4uLyBzZWdtZW50J2xlcmluaSBpxZ9sZSAoYmFzaXTDp2UsIHBhdGgucmVzb2x2ZSBoYWxsZWRlY2VrKVxuICAvLyBOb3RlOiAuL2ZpbGVzL2FkbWluIC0+IGZpbGVzL2FkbWluLCB0aGVuIHdlJ2xsIGNvbnZlcnQgdG8gYWJzb2x1dGUgYmVsb3dcblxuICAvLyAzLiAuL2ZpbGVzL2FkbWluIGdpYmkgcmVsYXRpdmUgeW9sIHZhcnNhLCBtdXRsYWsgaGFsZSDDp2V2aXJcbiAgaWYgKG5vcm1hbGl6ZWQgPT09ICdmaWxlcy9hZG1pbicgfHwgbm9ybWFsaXplZCA9PT0gJ2ZpbGVzL2d1ZXN0Jykge1xuICAgIC8vIC4vZmlsZXMvYWRtaW4gbm9ybWFsaXplIGVkaWxpbmNlIGZpbGVzL2FkbWluIG9sZHUsIGJ1bnUgbXV0bGFrIGhhbGUgw6dldmlyXG4gICAgbm9ybWFsaXplZCA9ICcvZmlsZXMvYWRtaW4nO1xuICB9IGVsc2UgaWYgKG5vcm1hbGl6ZWQgPT09ICdmaWxlcycgfHwgbm9ybWFsaXplZCA9PT0gJ2FkbWluJyB8fCBub3JtYWxpemVkID09PSAnZ3Vlc3QnKSB7XG4gICAgLy8gZmlsZXMgbm9ybWFsaXplIGVkaWxpbmNlLCAvZmlsZXMgb2xhcmFrIMOnZXZpclxuICAgIG5vcm1hbGl6ZWQgPSAnL2ZpbGVzJztcbiAgfSBlbHNlIGlmIChub3JtYWxpemVkID09PSAnJykge1xuICAgIC8vIGVtcHR5IC0+IC9cbiAgICBub3JtYWxpemVkID0gJy8nO1xuICB9XG5cbiAgLy8gNC4gUE9TSVggYWJzb2x1dGUgcGF0aCBrb250cm9sw7wgKC9maWxlcy9hZG1pbiBnaWJpKVxuICBpZiAobm9ybWFsaXplZC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICAvLyBQT1NJWCBtdXRsYWsgeW9sIG9sYXJhayBrYWxzxLFuOiAvZmlsZXMvYWRtaW5cbiAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgfVxuXG4gIC8vIDUuIFdpbmRvd3MgYWJzb2x1dGUgcGF0aCBrb250cm9sw7wgKEM6L2ZpbGVzL2FkbWluIGdpYmkpXG4gIGlmICgvXlthLXpBLVpdOlxcL1xcLy8udGVzdChub3JtYWxpemVkKSB8fCAvXlthLXpBLVpdOlxcL1xcLi8udGVzdChub3JtYWxpemVkKSkge1xuICAgIC8vIFdpbmRvd3MgbXV0bGFrIHlvbCBvbGFyYWsga2Fsc8SxbjogQzovZmlsZXMvYWRtaW5cbiAgICByZXR1cm4gbm9ybWFsaXplZDtcbiAgfVxuXG4gIC8vIDYuIFJlbGF0aXZlIHBhdGggaXNlIC4vIGlsZSBiYcWfbGF0IChXaW5kb3dzIHV5dW1sdSlcbiAgaWYgKCFub3JtYWxpemVkLnN0YXJ0c1dpdGgoJy4nKSAmJiAhbm9ybWFsaXplZC5zdGFydHNXaXRoKCcvJykpIHtcbiAgICBub3JtYWxpemVkID0gJy4vJyArIG5vcm1hbGl6ZWQ7XG4gIH1cblxuICByZXR1cm4gbm9ybWFsaXplZDtcbn1cblxuLyoqXG4gKiBHw5xWRU5MxLBLOiBQYXRoJ2luIGhvbWVEaXIgacOnaW5kZSBvbHVwIG9sbWFkxLHEn8SxbsSxIGtvbnRyb2wgZXRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUGF0aFdpdGhpbkhvbWUodGFyZ2V0UGF0aDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgLy8gTm9ybWFsaXplIGJvdGggcGF0aHMgdG8gZm9yd2FyZCBzbGFzaGVzIGZvciBjcm9zcy1wbGF0Zm9ybSBjb21wYXJpc29uXG4gIGNvbnN0IHRhcmdldE5vcm1hbGl6ZWQgPSB0YXJnZXRQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgY29uc3QgaG9tZU5vcm1hbGl6ZWQgPSAoaG9tZURpciB8fCAnLicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBTdHJpcCB0cmFpbGluZyBzbGFzaGVzXG4gIGNvbnN0IHRhcmdldENsZWFuID0gdGFyZ2V0Tm9ybWFsaXplZC5yZXBsYWNlKC9cXC8rJC8sICcnKTtcbiAgY29uc3QgaG9tZUNsZWFuID0gaG9tZU5vcm1hbGl6ZWQucmVwbGFjZSgvXFwvKyQvLCAnJyk7XG5cbiAgLy8gSWYgcGF0aHMgYXJlIGVxdWFsLCB0YXJnZXQgaXMgd2l0aGluIGhvbWVcbiAgaWYgKHRhcmdldENsZWFuID09PSBob21lQ2xlYW4pIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIC8vIENoZWNrIGlmIHRhcmdldCBzdGFydHMgd2l0aCBob21lICsgJy8nIChpLmUuLCB0YXJnZXQgaXMgaW5zaWRlIGhvbWUpXG4gIGlmIChob21lQ2xlYW4gIT09ICcnICYmIHRhcmdldENsZWFuLnN0YXJ0c1dpdGgoaG9tZUNsZWFuICsgJy8nKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vKipcbiAqIERpemluIHZhcmzEscSfxLFuZGFuIGVtaW4gb2xcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURpcmVjdG9yeUV4aXN0cyhkaXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgdHJ5IHtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2RpcihkaXJQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAvLyBaYXRlbiB2YXJzYSBoYXRhIHZlcm1lelxuICAgIGlmICgoZXJyb3IgYXMgTm9kZUpTLkVycm5vRXhjZXB0aW9uKS5jb2RlICE9PSAnRUVYSVNUJykge1xuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVGFtIHlvbCBvbHXFn3R1clxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RnVsbFBhdGgoYmFzZURpcjogc3RyaW5nLCBmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcbiAgaWYgKCFiYXNlRGlyIHx8ICFmaWxlUGF0aCkge1xuICAgIHJldHVybiAnJztcbiAgfVxuICByZXR1cm4gcGF0aC5yZXNvbHZlKGJhc2VEaXIsIGZpbGVQYXRoKTtcbn1cblxuLyoqXG4gKiBGVFAgaXN0ZW1jaXNpbmluIGfDtm5kZXJkacSfaSB5b2x1IGRvc3lhIHNpc3RlbWkgbXV0bGFrIHlvbHVuYSDDp2V2aXIuXG4gKlxuICogLSBNdXRsYWsgV2luZG93cyB5b2x1IChDOi8uLi4gdmV5YSBDOlxcXFwuLi4pIGhlciB6YW1hbiBkb3N5YSBzaXN0ZW1pIHlvbHVkdXIuXG4gKiAtIE11dGxhayBQT1NJWCB5b2x1ICgvYWx0L2RpemluKSDDtm5jZSBkb3N5YSBzaXN0ZW1pIHlvbHUgb2xhcmFrIGRlbmVuaXI7XG4gKiAgIGt1bGxhbsSxY8SxbsSxbiBob21lRGlyJ2kgacOnaW5kZSBkZcSfaWxzZSBzYW5hbCBrw7ZrIChob21lRGlyKSDDvHplcmluZGVuIMOnw7Z6w7xsw7xyLlxuICogLSBHw7ZyZWxpIHlvbCBoZXIgemFtYW4gY3VycmVudERpciDDvHplcmluZGVuIMOnw7Z6w7xsw7xyLlxuICpcbiAqIETDtm5lbiBkZcSfZXIgbXV0bGFrIGRvc3lhIHNpc3RlbWkgeW9sdWR1cjsgaG9tZURpciBpw6dpbmRlIG9sdXAgb2xtYWTEscSfxLFuxLFcbiAqIMOnYcSfxLFyYW4ga29udHJvbCBlZGVyIChpc1BhdGhXaXRoaW5Ib21lKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVGdHBQYXRoKHRhcmdldFBhdGg6IHN0cmluZywgY3VycmVudERpcjogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gcGF0aC5yZXNvbHZlKGhvbWVEaXIgfHwgJy4nKTtcbiAgY29uc3QgY3VycmVudCA9IHBhdGgucmVzb2x2ZShjdXJyZW50RGlyIHx8IGhvbWUpO1xuXG4gIC8vIEJhY2tzbGFzaCAtPiBzbGFzaCwgdGVrcmFyIGVkZW4gc2xhc2ggLT4gdGVrIHNsYXNoXG4gIGNvbnN0IHJhdyA9ICh0YXJnZXRQYXRoIHx8ICcnKS50cmltKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLnJlcGxhY2UoL1xcL3syLH0vZywgJy8nKTtcbiAgaWYgKCFyYXcgfHwgcmF3ID09PSAnLicpIHtcbiAgICByZXR1cm4gY3VycmVudDtcbiAgfVxuXG4gIC8vIFPDvHLDvGPDvCBoYXJmaSAoQzovLi4uKSBkb3N5YSBzaXN0ZW1pIHlvbHVkdXJcbiAgaWYgKC9eW2EtekEtWl06XFwvLy50ZXN0KHJhdykpIHtcbiAgICByZXR1cm4gcGF0aC5yZXNvbHZlKHJhdyk7XG4gIH1cblxuICAvLyBQT1NJWCBtdXRsYWsgeW9sXG4gIGlmIChyYXcuc3RhcnRzV2l0aCgnLycpKSB7XG4gICAgY29uc3QgYXNGaWxlU3lzdGVtUGF0aCA9IHBhdGgucmVzb2x2ZShyYXcpO1xuICAgIC8vIGhvbWVEaXIgacOnaW5kZXlzZSBnZXLDp2VrIGRvc3lhIHNpc3RlbWkgeW9sdSBvbGFyYWsga3VsbGFuXG4gICAgaWYgKGlzUGF0aFdpdGhpbkhvbWUoYXNGaWxlU3lzdGVtUGF0aCwgaG9tZSkpIHtcbiAgICAgIHJldHVybiBhc0ZpbGVTeXN0ZW1QYXRoO1xuICAgIH1cbiAgICAvLyBEZcSfaWxzZSBzYW5hbCBrw7ZrID0ga3VsbGFuxLFjxLFuxLFuIGhvbWVEaXInaVxuICAgIHJldHVybiBwYXRoLnJlc29sdmUoaG9tZSwgcmF3LnJlcGxhY2UoL15cXC8rLywgJycpKTtcbiAgfVxuXG4gIC8vIEfDtnJlbGkgeW9sOiBidWx1bmR1xJ91IGRpemluZGVuIMOnw7Z6w7xtbGVcbiAgcmV0dXJuIHBhdGgucmVzb2x2ZShjdXJyZW50LCByYXcpO1xufVxuXG4vKipcbiAqIERvc3lhIHNpc3RlbWkgeW9sdW51IGlzdGVtY2luaW4gZ8O2cmVjZcSfaSBzYW5hbCAoLyBrw7ZrbMO8KSB5b2xhIMOnZXZpci5cbiAqIGhvbWVEaXIga8O2ayBkaXppbiBvbGR1xJ91IGnDp2luIGTEscWfYXLEsWRhIGthbGFuIHlvbGxhciBcIi9cIiBkw7ZuZXIuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB0b1ZpcnR1YWxQYXRoKGZzUGF0aDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBob21lID0gcGF0aC5yZXNvbHZlKGhvbWVEaXIgfHwgJy4nKTtcbiAgY29uc3QgdGFyZ2V0ID0gcGF0aC5yZXNvbHZlKGZzUGF0aCB8fCBob21lKTtcbiAgY29uc3QgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKGhvbWUsIHRhcmdldCk7XG4gIGlmICghcmVsYXRpdmUgfHwgcmVsYXRpdmUuc3RhcnRzV2l0aCgnLi4nKSB8fCBwYXRoLmlzQWJzb2x1dGUocmVsYXRpdmUpKSB7XG4gICAgcmV0dXJuICcvJztcbiAgfVxuICByZXR1cm4gJy8nICsgcmVsYXRpdmUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xufVxuIl19