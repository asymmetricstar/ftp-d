"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleQuit = handleQuit;
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
function handleQuit(connId, conn, closeConnection) {
    try {
        const socket = conn?.socket;
        logger_1.Logger.info(`[FtpServer] QUIT: ${conn.user || 'anonymous'} (${connId})`);
        conn.lastReply = types_1.ReplyCode.QUIT_OK;
        conn.lastMessage = `Goodbye`;
        socket?.write(`${conn.lastReply} ${conn.lastMessage}\r\n`);
        closeConnection(connId);
        return { code: conn.lastReply, message: conn.lastMessage };
    }
    catch (error) {
        logger_1.Logger.error(`[FtpServer] QUIT command error`);
        closeConnection(connId);
        return { code: types_1.ReplyCode.QUIT_OK, message: 'Goodbye' };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpdENvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29tbWFuZHMvUXVpdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBQXlDO0FBQ3pDLG9DQUFtRTtBQUtuRSxvQkFBMkIsTUFBYyxFQUFFLElBQW1CLEVBQUUsZUFBMEQ7SUFDeEgsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLE1BQU0sQ0FBQztRQUM1QixlQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixJQUFJLENBQUMsSUFBSSxJQUFJLFdBQVcsS0FBSyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxTQUFTLEdBQUcsaUJBQVMsQ0FBQyxPQUFPLENBQUM7UUFDbkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDN0IsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxDQUFDLENBQUM7UUFDM0QsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzdELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsZUFBTSxDQUFDLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQy9DLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4QixPQUFPLEVBQUUsSUFBSSxFQUFFLGlCQUFTLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQztJQUN6RCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IExvZ2dlciB9IGZyb20gJy4uL3V0aWxzL2xvZ2dlcic7XG5pbXBvcnQgeyBSZXBseUNvZGUsIEZ0cENvbm5lY3Rpb24sIENvbW1hbmRSZXN1bHQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogUVVJVCBrb211dHVudSBpxZ9sZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaGFuZGxlUXVpdChjb25uSWQ6IHN0cmluZywgY29ubjogRnRwQ29ubmVjdGlvbiwgY2xvc2VDb25uZWN0aW9uOiAoY29ubklkOiBzdHJpbmcsIHJlYXNvbj86IHN0cmluZykgPT4gdm9pZCk6IENvbW1hbmRSZXN1bHQge1xuICB0cnkge1xuICAgIGNvbnN0IHNvY2tldCA9IGNvbm4/LnNvY2tldDtcbiAgICBMb2dnZXIuaW5mbyhgW0Z0cFNlcnZlcl0gUVVJVDogJHtjb25uLnVzZXIgfHwgJ2Fub255bW91cyd9ICgke2Nvbm5JZH0pYCk7XG4gICAgY29ubi5sYXN0UmVwbHkgPSBSZXBseUNvZGUuUVVJVF9PSztcbiAgICBjb25uLmxhc3RNZXNzYWdlID0gYEdvb2RieWVgO1xuICAgIHNvY2tldD8ud3JpdGUoYCR7Y29ubi5sYXN0UmVwbHl9ICR7Y29ubi5sYXN0TWVzc2FnZX1cXHJcXG5gKTtcbiAgICBjbG9zZUNvbm5lY3Rpb24oY29ubklkKTtcbiAgICByZXR1cm4geyBjb2RlOiBjb25uLmxhc3RSZXBseSwgbWVzc2FnZTogY29ubi5sYXN0TWVzc2FnZSB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIExvZ2dlci5lcnJvcihgW0Z0cFNlcnZlcl0gUVVJVCBjb21tYW5kIGVycm9yYCk7XG4gICAgY2xvc2VDb25uZWN0aW9uKGNvbm5JZCk7XG4gICAgcmV0dXJuIHsgY29kZTogUmVwbHlDb2RlLlFVSVRfT0ssIG1lc3NhZ2U6ICdHb29kYnllJyB9O1xuICB9XG59XG4iXX0=