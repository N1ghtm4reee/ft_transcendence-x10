import speakeasy from "speakeasy";
import QRCode from "qrcode";

class TwoFactorService {
  /**
   * Generate a new 2FA secret for a user
   * @param {string} userEmail - User's email
   * @param {string} userName - User's name
   * @returns {Object} Secret and QR code data
   */
  static generateSecret(userEmail, userName) {
    const secret = speakeasy.generateSecret({
      name: `Auth DanDan (${userEmail})`,
      issuer: "Auth DanDan",
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl: secret.otpauth_url,
    };
  }

  /**
   * Generate QR code as base64 image
   * @param {string} otpauthUrl - The otpauth URL
   * @returns {Promise<string>} Base64 QR code image
   */
  static async generateQRCode(otpauthUrl) {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
      return qrCodeDataUrl;
    } catch (error) {
      throw new Error("Failed to generate QR code");
    }
  }

  /**
   * Verify a TOTP token
   * @param {string} token - The 6-digit token from authenticator app
   * @param {string} secret - The user's secret key
   * @param {number} window - Time window for validation (default: 1)
   * @returns {boolean} Whether the token is valid
   */
  static verifyToken(token, secret, window = 1) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: token,
      window: window,
    });
  }

  /**
   * Generate a backup token for emergency access
   * @returns {string} 8-character backup code
   */
  static generateBackupCode() {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }

  /**
   * Generate multiple backup codes
   * @param {number} count - Number of backup codes to generate
   * @returns {string[]} Array of backup codes
   */
  static generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateBackupCode());
    }
    return codes;
  }
}

export default TwoFactorService;
