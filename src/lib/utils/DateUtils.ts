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
      return match.padStart(2, "0");
    });
  }

  /**
   * 格式化日期为 中国时区(Asia/Shanghai) 的 YYYY/MM/DD 格式
   * 最标准方案：直接指定时区，不手动加减8小时
   */
  static formatToChinaDate(date: Date | string | number): string {
    // 统一转为 Date 对象
    const dateObj = new Date(date);

    // 中国时区格式化，直接返回 YYYY/MM/DD
    return dateObj.toLocaleDateString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '/'); // 确保是 / 分隔
  }

  /**
   * 格式化日期为 中国时区 的 YYYY/MM/DD HH:mm:ss 格式
   * 示例输出：2026/05/26 02:12:06
   */
  static formatToChinaDateTime(date: Date | string | number): string {
    const d = new Date(date);

    return d
      .toLocaleString("en-CA", {
        timeZone: "Asia/Shanghai", // 强制中国时区
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false, // 24小时制
      })
      .replace(/-/g, "/").replace(',', ''); // 把 - 换成 /
  }

  /**
   * 获取当前日期，格式为 yyyy-MM-dd
   * @returns 当前日期的字符串表示
   */
  static getLocalDate(): string {
    return this.formatDate(new Date().toLocaleDateString());
  }
}
