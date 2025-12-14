/**
 * 日期工具类
 */
export class DateUtils {
  /**
   * 将 Date 对象格式化为 yyyy-MM-dd 格式
   * @param date 要格式化的日期对象，默认为当前时间
   * @returns 格式化后的日期字符串
   */
  static formatDate(dateStr: string): string {
    // 匹配 yyyy/m/d 或 yyyy-mm-dd 格式
    return dateStr.replace(/\b(\d{1,2})\b/g, (match) => {
        return match.padStart(2, '0');
    });
  }

  /**
   * 获取当前日期，格式为 yyyy-MM-dd
   * @returns 当前日期的字符串表示
   */
  static getLocalDate(): string {
    return this.formatDate(new Date().toLocaleDateString());
  }
}