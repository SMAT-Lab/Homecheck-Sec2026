import { FileReports } from './Defects';
import { CheckEntry } from '../Index';
export interface Message {
    sendResult(checkEntry: CheckEntry, fileReports: FileReports[], reportDir?: string): void;
    messageNotify(messageLevel: MessageType, msg: string): void;
    progressNotify(progress: number, msg: string): void;
}
export declare class DefaultMessage implements Message {
    /**
     * 发送消息
     *
     * @param msg 要发送的消息内容
     */
    sendResult(checkEntry: CheckEntry, fileReports: FileReports[], reportDir?: string | undefined): Promise<void>;
    /**
     * 消息通知函数
     *
     * @param messageLevel 消息类型，类型为MessageType枚举
     * @param msg 消息内容，类型为字符串
     */
    messageNotify(messageLevel: MessageType, msg: string): void;
    /**
     * 通知进度更新
     *
     * @param progress 进度值，取值范围为 0 到 1 之间
     * @param msg 与进度相关的消息
     */
    progressNotify(progress: number, msg: string): void;
}
/**
 * 告警消息类型
 */
export declare enum MessageType {
    BASE_ERROR = 0,
    CHECK_ERROR = -1,
    CHECK_WARN = -2,
    CHECK_INFO = -3
}
