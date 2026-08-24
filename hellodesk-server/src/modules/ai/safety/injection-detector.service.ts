import { Injectable } from '@nestjs/common';
import { logger } from '../../../lib/logger.js';

export interface InjectionCheckResult {
    isSafe: boolean;
    detectedPattern?: string;
    riskScore: number; // 0.0 to 1.0
}

@Injectable()
export class InjectionDetectorService {
    private readonly INJECTION_PATTERNS = [
        /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
        /disregard\s+(all\s+)?(previous|prior)\s+rules/i,
        /system\s+prompt\s+override/i,
        /you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|godmode)/i,
        /bypass\s+(all\s+)?safety\s+filters/i,
        /print\s+(the\s+)?system\s+prompt/i,
        /repeat\s+(everything\s+)?above/i,
        /drop\s+table\s+/i,
        /<\|im_start\|>/i,
        /\[INST\]/i
    ];

    check(text: string): InjectionCheckResult {
        if (!text) return { isSafe: true, riskScore: 0 };

        for (const pattern of this.INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                logger.warn({ pattern: pattern.toString(), snippet: text.slice(0, 100) }, 'Prompt injection detected');
                return {
                    isSafe: false,
                    detectedPattern: pattern.toString(),
                    riskScore: 0.95
                };
            }
        }

        return {
            isSafe: true,
            riskScore: 0
        };
    }
}
