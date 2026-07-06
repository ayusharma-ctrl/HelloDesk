export interface DashboardOverview {
    conversations: {
        open: number;
        pending: number;
        snoozed: number;
        resolved: number;
    };
    agents: {
        total: number;
        active: number;
    };
}
