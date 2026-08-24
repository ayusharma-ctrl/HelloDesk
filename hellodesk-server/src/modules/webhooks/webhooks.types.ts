export interface ResendInboundPayload {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
    headers?: {
        'message-id'?: string;
        'in-reply-to'?: string;
        references?: string;
        [key: string]: string | undefined;
    };
}
