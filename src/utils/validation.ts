
/**
 * 用户输入验证工具
 */

/**
 * 验证用户名
 * @param username - 用户名
 * @returns 错误信息，如果验证通过则返回 null
 */
export const validateUsername = (username: string): string | null => {
  if (!username || username.trim().length === 0) {
    return '用户名不能为空';
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return '用户名至少需要3个字符';
  }
  if (trimmed.length > 20) {
    return '用户名不能超过20个字符';
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return '用户名只能包含字母、数字、下划线和连字符';
  }
  return null;
};

/**
 * 验证密码
 * @param password - 密码
 * @returns 错误信息，如果验证通过则返回 null
 */
export const validatePassword = (password: string): string | null => {
  if (!password || password.length === 0) {
    return '密码不能为空';
  }
  if (password.length < 6) {
    return '密码至少需要6个字符';
  }
  return null;
};

/**
 * 验证邮箱（可选）
 * @param email - 邮箱地址
 * @returns 错误信息，如果验证通过则返回 null
 */
export const validateEmail = (email?: string): string | null => {
  if (!email || email.trim().length === 0) {
    return null; // 邮箱是可选的
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '请输入有效的邮箱地址';
  }
  return null;
};

/**
 * 验证材料标题
 * @param title - 材料标题
 * @returns 错误信息，如果验证通过则返回 null
 */
export const validateMaterialTitle = (title: string): string | null => {
  if (!title || title.trim().length === 0) {
    return '标题不能为空';
  }
  if (title.length > 100) {
    return '标题不能超过100个字符';
  }
  return null;
};

/**
 * 验证音频片段时间
 * @param startTime - 开始时间
 * @param endTime - 结束时间
 * @param duration - 音频总时长
 * @returns 错误信息，如果验证通过则返回 null
 */
export const validateSegmentTime = (
  startTime: number,
  endTime: number,
  duration: number
): string | null => {
  if (startTime < 0) {
    return '开始时间不能为负数';
  }
  if (endTime > duration) {
    return '结束时间不能超过音频总时长';
  }
  if (startTime >= endTime) {
    return '结束时间必须大于开始时间';
  }
  if (endTime - startTime < 0.1) {
    return '片段时长至少需要0.1秒';
  }
  return null;
};

