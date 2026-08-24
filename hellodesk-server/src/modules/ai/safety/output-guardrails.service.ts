import { Injectable } from '@nestjs/common';
import { logger } from '../../../lib/logger.js';

export interface GuardrailCheckResult {
    passed: boolean;
    violationType?: 'financial_commitment' | 'unverified_promise' | 'harmful_content';
    reason?: string;
    sanitizedMessage?: string;
}

@Injectable()
export class OutputGuardrailsService {
    private readonly FINANCIAL_PROMISES = [
        /i\s+(have|will)\s+refund(ed)?\s+(\$|\d+)/i,
        /i\s+have\s+credited\s+your\s+account/i,
        /your\s+refund\s+of\s+(\$|\d+)\s+is\s+processed/i,
        /i\s+will\s+give\s+you\s+a\s+(\d+%\s+discount|\$\d+)/i
    ];

    validateOutput(
        text: string,
        verifiedToolsExecuted: string[] = []
    ): GuardrailCheckResult {
        if (!text) return { passed: true };

        // 1. Check for unauthorized financial promises unless an authorized refund tool succeeded
        for (const pattern of this.FINANCIAL_PROMISES) {
            if (pattern.test(text)) {
                logger.warn({ pattern: pattern.toString() }, 'Blocked unauthorized financial commitment in LLM response');
                return {
                    passed: false,
                    violationType: 'financial_commitment',
                    reason: 'AI generated unauthorized financial refund/credit promise without human approval',
                    sanitizedMessage: 'I understand you are requesting a refund. I have routed your request to our billing team for review.'
                };
            }
        }

        return { passed: true };
    }
}
