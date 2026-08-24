import { Injectable } from '@nestjs/common';

export interface PiiMaskResult {
    maskedText: string;
    hasPii: boolean;
    maskedCount: number;
    replacements: Map<string, string>;
}

@Injectable()
export class PiiMaskerService {
    private readonly PATTERNS = [
        // Credit Card Numbers (13-19 digits with optional hyphens/spaces)
        { name: 'CREDIT_CARD', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{15,16}\b/g },
        // US SSN
        { name: 'SSN', regex: /\b\d{3}-\d{2}-\d{4}\b/g },
        // API Keys & Secrets (OpenAI, Gemini, Resend, JWT, generic tokens)
        { name: 'API_KEY', regex: /\b(?:sk-[a-zA-Z0-9]{20,}|AIzaSy[a-zA-Z0-9_-]{33}|re_[a-zA-Z0-9]{20,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/g },
        // Passwords in text (e.g., password: abc1234)
        { name: 'PASSWORD', regex: /(?:password|passwd|pwd)\s*[:=]\s*([^\s,]+)/gi }
    ];

    mask(text: string): PiiMaskResult {
        if (!text) {
            return { maskedText: '', hasPii: false, maskedCount: 0, replacements: new Map() };
        }

        let masked = text;
        let count = 0;
        const replacements = new Map<string, string>();

        for (const pattern of this.PATTERNS) {
            masked = masked.replace(pattern.regex, (match) => {
                count++;
                const token = `[REDACTED_${pattern.name}_${count}]`;
                replacements.set(token, match);
                return token;
            });
        }

        return {
            maskedText: masked,
            hasPii: count > 0,
            maskedCount: count,
            replacements
        };
    }

    unmask(text: string, replacements: Map<string, string>): string {
        let unmasked = text;
        for (const [token, original] of replacements.entries()) {
            unmasked = unmasked.replace(token, original);
        }
        return unmasked;
    }
}
