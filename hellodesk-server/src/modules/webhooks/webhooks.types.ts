export interface ResendInboundPayload {
    from?: string;
    subject?: string;
    text?: string;
    html?: string;
    headers?: {
        'message-id'?: string;
        'in-reply-to'?: string;
        references?: string;
    };
}
