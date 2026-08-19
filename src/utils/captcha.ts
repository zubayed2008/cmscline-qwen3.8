/**
 * CAPTCHA verification utility for Google reCAPTCHA v3.
 * Verifies tokens server-side before processing form submissions.
 */

export interface CaptchaVerificationResult {
  success: boolean;
  score?: number;
  error?: string;
}

/**
 * Minimum score threshold for reCAPTCHA v3.
 * Scores range from 0.0 (likely bot) to 1.0 (likely human).
 * 0.5 is a reasonable threshold for most use cases.
 */
const MIN_SCORE_THRESHOLD = 0.5;

/**
 * Verifies a Google reCAPTCHA v3 token.
 * @param token - The reCAPTCHA token from the client
 * @returns Verification result with success status and score
 */
export async function verifyCaptcha(token: string): Promise<CaptchaVerificationResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  // If CAPTCHA is not configured, allow the request (for development)
  if (!secretKey) {
    console.warn('RECAPTCHA_SECRET_KEY not configured. CAPTCHA verification skipped.');
    return { success: true, score: 1.0 };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      return { success: false, error: 'CAPTCHA verification service unavailable' };
    }

    const data = await response.json();

    if (!data.success) {
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    // Check score threshold for reCAPTCHA v3
    const score = data.score ?? 0;
    if (score < MIN_SCORE_THRESHOLD) {
      return { success: false, score, error: 'CAPTCHA score too low' };
    }

    return { success: true, score };
  } catch {
    return { success: false, error: 'CAPTCHA verification failed' };
  }
}
