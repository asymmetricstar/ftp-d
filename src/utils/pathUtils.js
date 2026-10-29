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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aFV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3BhdGhVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFZLElBQUksaUNBQWE7QUFDN0IsTUFBWSxFQUFFLCtCQUFXO0FBTXpCLDBCQUFpQyxPQUFlO0lBQzlDLElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDNUMsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBR0QsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFHN0MsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLDhCQUE4QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1FBRXZGLE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFHRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNoQyxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuQyxDQUFDO0lBR0QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7UUFDcEUsVUFBVSxHQUFHLEdBQUcsR0FBRyxVQUFVLENBQUM7SUFDaEMsQ0FBQztJQUVELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFNRCw2QkFBb0MsT0FBZTtJQUNqRCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQzVDLE9BQU8sRUFBRSxDQUFDO0lBQ1osQ0FBQztJQUdELElBQUksVUFBVSxHQUFH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LE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7UUFDeEUsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBQ0QsT0FBTyxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcclxuXHJcbi8qKlxyXG4gKiBEaXppbiB5b2x1bnUgbm9ybWFsaXplIGV0XHJcbiAqIFdpbmRvd3MgYWJzb2x1dGUgcGF0aCdsZXJpIG11dGxhayBvbGFyYWsga2Fsc8SxbiwgLi8gcHJlZml4J2kga2FsZMSxciwgcm9vdCd0YW4gYmHFn2xhdFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vcm1hbGl6ZURpclBhdGgoZGlyUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIWRpclBhdGggfHwgdHlwZW9mIGRpclBhdGggIT09ICdzdHJpbmcnKSB7XHJcbiAgICByZXR1cm4gJyc7XHJcbiAgfVxyXG5cclxuICAvLyAxLiBXaW5kb3dzIGFic29sdXRlIHBhdGgnbGVyaSBub3JtYWxpemUgZXQgKEM6XFwuLi4gLT4gQzovLi4uKVxyXG4gIGxldCBub3JtYWxpemVkID0gZGlyUGF0aC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XHJcblxyXG4gIC8vIDIuIFdpbmRvd3MgZHJpdmUgbGV0dGVyIHBhdGgga29udHJvbMO8IChDOi8uLi4gdmV5YSBDOi4uLilcclxuICBpZiAoL15bYS16QS1aXTpcXC8vLnRlc3Qobm9ybWFsaXplZCkgfHwgL14oW2EtekEtWl06XFwuKXwoW2EtekEtWl06XFwvKS8udGVzdChub3JtYWxpemVkKSkge1xyXG4gICAgLy8gV2luZG93cyBhYnNvbHV0ZSBwYXRoLCBtdXRsYWsgb2xhcmFrIGthbHPEsW46IEM6L1VzZXJzLy4uLi9maWxlcy9hZG1pblxyXG4gICAgcmV0dXJuIG5vcm1hbGl6ZWQ7XHJcbiAgfVxyXG5cclxuICAvLyAzLiAuLyBwcmVmaXgnaSBrYWxkxLFyXHJcbiAgaWYgKG5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnLi8nKSkge1xyXG4gICAgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZWQuc2xpY2UoMik7XHJcbiAgfVxyXG5cclxuICAvLyA0LiBFxJ9lciBhYnNvbHV0ZSBkZcSfaWxzZSwgcm9vdCdkYW4gYmHFn2xhdFxyXG4gIGlmICghbm9ybWFsaXplZC5zdGFydHNXaXRoKCcvJykgJiYgIS9eW2EtekEtWl06XFwvLy50ZXN0KG5vcm1hbGl6ZWQpKSB7XHJcbiAgICBub3JtYWxpemVkID0gJy8nICsgbm9ybWFsaXplZDtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIG5vcm1hbGl6ZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMaW51eCB2ZSBXaW5kb3dzIHBhdGgnbGVyaW5pIGfDvMOnbMO8IMWfZWtpbGRlIG5vcm1hbGl6ZSBldFxyXG4gKiBCYWNrc2xhc2ggLT4gZm9yd2FyZCBzbGFzaCwgLi8gdmUgLi4vIMOnw7Z6LCByZWxhdGl2ZSBwYXRoIHlhcCAoUE9TSVggLyB5ZXJpbmUgV2luZG93cyB1eXVtbHUpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcm9idXN0UGF0aE5vcm1hbGl6ZShkaXJQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghZGlyUGF0aCB8fCB0eXBlb2YgZGlyUGF0aCAhPT0gJ3N0cmluZycpIHtcclxuICAgIHJldHVybiAnJztcclxuICB9XHJcblxyXG4gIC8vIDEuIEJhY2tzbGFzaCdsZXJpIGZvcndhcmQgc2xhc2gnZSDDp2V2aXJcclxuICBsZXQgbm9ybWFsaXplZCA9IGRpclBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xyXG5cclxuICAvLyAyLiAuLyB2ZSAuLi8gc2VnbWVudCdsZXJpbmkgw6fDtnpcclxuICAvLyByZXBlYXRlZCAvIC0+IHNpbmdsZSAvXHJcbiAgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZWQucmVwbGFjZSgvXFwvKy9nLCAnLycpO1xyXG4gIC8vIC4vIHNlZ21lbnQnbGVyaW5pIGthbGTEsXJcclxuICBub3JtYWxpemVkID0gbm9ybWFsaXplZC5yZXBsYWNlKC9cXC9cXC5cXC8vZywgJy8nKS5yZXBsYWNlKC9cXC5cXC8vZywgJycpO1xyXG4gIC8vIC4uLyBzZWdtZW50J2xlcmluaSBpxZ9sZSAoYmFzaXTDp2UsIHBhdGgucmVzb2x2ZSBoYWxsZWRlY2VrKVxyXG4gIC8vIE5vdGU6IC4vZmlsZXMvYWRtaW4gLT4gZmlsZXMvYWRtaW4sIHRoZW4gd2UnbGwgY29udmVydCB0byBhYnNvbHV0ZSBiZWxvd1xyXG5cclxuICAvLyAzLiAuL2ZpbGVzL2FkbWluIGdpYmkgcmVsYXRpdmUgeW9sIHZhcnNhLCBtdXRsYWsgaGFsZSDDp2V2aXJcclxuICBpZiAobm9ybWFsaXplZCA9PT0gJ2ZpbGVzL2FkbWluJyB8fCBub3JtYWxpemVkID09PSAnZmlsZXMvZ3Vlc3QnKSB7XHJcbiAgICAvLyAuL2ZpbGVzL2FkbWluIG5vcm1hbGl6ZSBlZGlsaW5jZSBmaWxlcy9hZG1pbiBvbGR1LCBidW51IG11dGxhayBoYWxlIMOnZXZpclxyXG4gICAgbm9ybWFsaXplZCA9ICcvZmlsZXMvYWRtaW4nO1xyXG4gIH0gZWxzZSBpZiAobm9ybWFsaXplZCA9PT0gJ2ZpbGVzJyB8fCBub3JtYWxpemVkID09PSAnYWRtaW4nIHx8IG5vcm1hbGl6ZWQgPT09ICdndWVzdCcpIHtcclxuICAgIC8vIGZpbGVzIG5vcm1hbGl6ZSBlZGlsaW5jZSwgL2ZpbGVzIG9sYXJhayDDp2V2aXJcclxuICAgIG5vcm1hbGl6ZWQgPSAnL2ZpbGVzJztcclxuICB9IGVsc2UgaWYgKG5vcm1hbGl6ZWQgPT09ICcnKSB7XHJcbiAgICAvLyBlbXB0eSAtPiAvXHJcbiAgICBub3JtYWxpemVkID0gJy8nO1xyXG4gIH1cclxuXHJcbiAgLy8gNC4gUE9TSVggYWJzb2x1dGUgcGF0aCBrb250cm9sw7wgKC9maWxlcy9hZG1pbiBnaWJpKVxyXG4gIGlmIChub3JtYWxpemVkLnN0YXJ0c1dpdGgoJy8nKSkge1xyXG4gICAgLy8gUE9TSVggbXV0bGFrIHlvbCBvbGFyYWsga2Fsc8SxbjogL2ZpbGVzL2FkbWluXHJcbiAgICByZXR1cm4gbm9ybWFsaXplZDtcclxuICB9XHJcblxyXG4gIC8vIDUuIFdpbmRvd3MgYWJzb2x1dGUgcGF0aCBrb250cm9sw7wgKEM6L2ZpbGVzL2FkbWluIGdpYmkpXHJcbiAgaWYgKC9eW2EtekEtWl06XFwvXFwvLy50ZXN0KG5vcm1hbGl6ZWQpIHx8IC9eW2EtekEtWl06XFwvXFwuLy50ZXN0KG5vcm1hbGl6ZWQpKSB7XHJcbiAgICAvLyBXaW5kb3dzIG11dGxhayB5b2wgb2xhcmFrIGthbHPEsW46IEM6L2ZpbGVzL2FkbWluXHJcbiAgICByZXR1cm4gbm9ybWFsaXplZDtcclxuICB9XHJcblxyXG4gIC8vIDYuIFJlbGF0aXZlIHBhdGggaXNlIC4vIGlsZSBiYcWfbGF0IChXaW5kb3dzIHV5dW1sdSlcclxuICBpZiAoIW5vcm1hbGl6ZWQuc3RhcnRzV2l0aCgnLicpICYmICFub3JtYWxpemVkLnN0YXJ0c1dpdGgoJy8nKSkge1xyXG4gICAgbm9ybWFsaXplZCA9ICcuLycgKyBub3JtYWxpemVkO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG5vcm1hbGl6ZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHw5xWRU5MxLBLOiBQYXRoJ2luIGhvbWVEaXIgacOnaW5kZSBvbHVwIG9sbWFkxLHEn8SxbsSxIGtvbnRyb2wgZXRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1BhdGhXaXRoaW5Ib21lKHRhcmdldFBhdGg6IHN0cmluZywgaG9tZURpcjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgLy8gTm9ybWFsaXplIGJvdGggcGF0aHMgdG8gZm9yd2FyZCBzbGFzaGVzIGZvciBjcm9zcy1wbGF0Zm9ybSBjb21wYXJpc29uXHJcbiAgY29uc3QgdGFyZ2V0Tm9ybWFsaXplZCA9IHRhcmdldFBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xyXG4gIGNvbnN0IGhvbWVOb3JtYWxpemVkID0gKGhvbWVEaXIgfHwgJy4nKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XHJcblxyXG4gIC8vIFN0cmlwIHRyYWlsaW5nIHNsYXNoZXNcclxuICBjb25zdCB0YXJnZXRDbGVhbiA9IHRhcmdldE5vcm1hbGl6ZWQucmVwbGFjZSgvXFwvKyQvLCAnJyk7XHJcbiAgY29uc3QgaG9tZUNsZWFuID0gaG9tZU5vcm1hbGl6ZWQucmVwbGFjZSgvXFwvKyQvLCAnJyk7XHJcblxyXG4gIC8vIElmIHBhdGhzIGFyZSBlcXVhbCwgdGFyZ2V0IGlzIHdpdGhpbiBob21lXHJcbiAgaWYgKHRhcmdldENsZWFuID09PSBob21lQ2xlYW4pIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gQ2hlY2sgaWYgdGFyZ2V0IHN0YXJ0cyB3aXRoIGhvbWUgKyAnLycgKGkuZS4sIHRhcmdldCBpcyBpbnNpZGUgaG9tZSlcclxuICBpZiAoaG9tZUNsZWFuICE9PSAnJyAmJiB0YXJnZXRDbGVhbi5zdGFydHNXaXRoKGhvbWVDbGVhbiArICcvJykpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogRGl6aW4gdmFybMSxxJ/EsW5kYW4gZW1pbiBvbFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGVuc3VyZURpcmVjdG9yeUV4aXN0cyhkaXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIoZGlyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIC8vIFphdGVuIHZhcnNhIGhhdGEgdmVybWV6XHJcbiAgICBpZiAoKGVycm9yIGFzIE5vZGVKUy5FcnJub0V4Y2VwdGlvbikuY29kZSAhPT0gJ0VFWElTVCcpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVGFtIHlvbCBvbHXFn3R1clxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEZ1bGxQYXRoKGJhc2VEaXI6IHN0cmluZywgZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKCFiYXNlRGlyIHx8ICFmaWxlUGF0aCkge1xyXG4gICAgcmV0dXJuICcnO1xyXG4gIH1cclxuICByZXR1cm4gcGF0aC5yZXNvbHZlKGJhc2VEaXIsIGZpbGVQYXRoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZUUCBpc3RlbWNpc2luaW4gZ8O2bmRlcmRpxJ9pIHlvbHUgZG9zeWEgc2lzdGVtaSBtdXRsYWsgeW9sdW5hIMOnZXZpci5cclxuICpcclxuICogLSBNdXRsYWsgV2luZG93cyB5b2x1IChDOi8uLi4gdmV5YSBDOlxcXFwuLi4pIGhlciB6YW1hbiBkb3N5YSBzaXN0ZW1pIHlvbHVkdXIuXHJcbiAqIC0gTXV0bGFrIFBPU0lYIHlvbHUgKC9hbHQvZGl6aW4pIMO2bmNlIGRvc3lhIHNpc3RlbWkgeW9sdSBvbGFyYWsgZGVuZW5pcjtcclxuICogICBrdWxsYW7EsWPEsW7EsW4gaG9tZURpcidpIGnDp2luZGUgZGXEn2lsc2Ugc2FuYWwga8O2ayAoaG9tZURpcikgw7x6ZXJpbmRlbiDDp8O2esO8bMO8ci5cclxuICogLSBHw7ZyZWxpIHlvbCBoZXIgemFtYW4gY3VycmVudERpciDDvHplcmluZGVuIMOnw7Z6w7xsw7xyLlxyXG4gKlxyXG4gKiBEw7ZuZW4gZGXEn2VyIG11dGxhayBkb3N5YSBzaXN0ZW1pIHlvbHVkdXI7IGhvbWVEaXIgacOnaW5kZSBvbHVwIG9sbWFkxLHEn8SxbsSxXHJcbiAqIMOnYcSfxLFyYW4ga29udHJvbCBlZGVyIChpc1BhdGhXaXRoaW5Ib21lKS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlRnRwUGF0aCh0YXJnZXRQYXRoOiBzdHJpbmcsIGN1cnJlbnREaXI6IHN0cmluZywgaG9tZURpcjogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBob21lID0gcGF0aC5yZXNvbHZlKGhvbWVEaXIgfHwgJy4nKTtcclxuICBjb25zdCBjdXJyZW50ID0gcGF0aC5yZXNvbHZlKGN1cnJlbnREaXIgfHwgaG9tZSk7XHJcblxyXG4gIC8vIEJhY2tzbGFzaCAtPiBzbGFzaCwgdGVrcmFyIGVkZW4gc2xhc2ggLT4gdGVrIHNsYXNoXHJcbiAgY29uc3QgcmF3ID0gKHRhcmdldFBhdGggfHwgJycpLnRyaW0oKS5yZXBsYWNlKC9cXFxcL2csICcvJykucmVwbGFjZSgvXFwvezIsfS9nLCAnLycpO1xyXG4gIGlmICghcmF3IHx8IHJhdyA9PT0gJy4nKSB7XHJcbiAgICByZXR1cm4gY3VycmVudDtcclxuICB9XHJcblxyXG4gIC8vIFPDvHLDvGPDvCBoYXJmaSAoQzovLi4uKSBkb3N5YSBzaXN0ZW1pIHlvbHVkdXJcclxuICBpZiAoL15bYS16QS1aXTpcXC8vLnRlc3QocmF3KSkge1xyXG4gICAgcmV0dXJuIHBhdGgucmVzb2x2ZShyYXcpO1xyXG4gIH1cclxuXHJcbiAgLy8gUE9TSVggbXV0bGFrIHlvbFxyXG4gIGlmIChyYXcuc3RhcnRzV2l0aCgnLycpKSB7XHJcbiAgICBjb25zdCBhc0ZpbGVTeXN0ZW1QYXRoID0gcGF0aC5yZXNvbHZlKHJhdyk7XHJcbiAgICAvLyBob21lRGlyIGnDp2luZGV5c2UgZ2Vyw6dlayBkb3N5YSBzaXN0ZW1pIHlvbHUgb2xhcmFrIGt1bGxhblxyXG4gICAgaWYgKGlzUGF0aFdpdGhpbkhvbWUoYXNGaWxlU3lzdGVtUGF0aCwgaG9tZSkpIHtcclxuICAgICAgcmV0dXJuIGFzRmlsZVN5c3RlbVBhdGg7XHJcbiAgICB9XHJcbiAgICAvLyBEZcSfaWxzZSBzYW5hbCBrw7ZrID0ga3VsbGFuxLFjxLFuxLFuIGhvbWVEaXInaVxyXG4gICAgcmV0dXJuIHBhdGgucmVzb2x2ZShob21lLCByYXcucmVwbGFjZSgvXlxcLysvLCAnJykpO1xyXG4gIH1cclxuXHJcbiAgLy8gR8O2cmVsaSB5b2w6IGJ1bHVuZHXEn3UgZGl6aW5kZW4gw6fDtnrDvG1sZVxyXG4gIHJldHVybiBwYXRoLnJlc29sdmUoY3VycmVudCwgcmF3KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIERvc3lhIHNpc3RlbWkgeW9sdW51IGlzdGVtY2luaW4gZ8O2cmVjZcSfaSBzYW5hbCAoLyBrw7ZrbMO8KSB5b2xhIMOnZXZpci5cclxuICogaG9tZURpciBrw7ZrIGRpemluIG9sZHXEn3UgacOnaW4gZMSxxZ9hcsSxZGEga2FsYW4geW9sbGFyIFwiL1wiIGTDtm5lci5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0b1ZpcnR1YWxQYXRoKGZzUGF0aDogc3RyaW5nLCBob21lRGlyOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGhvbWUgPSBwYXRoLnJlc29sdmUoaG9tZURpciB8fCAnLicpO1xyXG4gIGNvbnN0IHRhcmdldCA9IHBhdGgucmVzb2x2ZShmc1BhdGggfHwgaG9tZSk7XHJcbiAgY29uc3QgcmVsYXRpdmUgPSBwYXRoLnJlbGF0aXZlKGhvbWUsIHRhcmdldCk7XHJcbiAgaWYgKCFyZWxhdGl2ZSB8fCByZWxhdGl2ZS5zdGFydHNXaXRoKCcuLicpIHx8IHBhdGguaXNBYnNvbHV0ZShyZWxhdGl2ZSkpIHtcclxuICAgIHJldHVybiAnLyc7XHJcbiAgfVxyXG4gIHJldHVybiAnLycgKyByZWxhdGl2ZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XHJcbn1cclxuIl19