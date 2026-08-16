export interface WorkspaceDto {
    id: string;
    name: string;
    shortName?: string | null;
    logoUrl?: string | null;
    theme?: any;
}

export interface AuthUserDto {
    id: string;
    email: string;
    name: string;
    role: string;
    workspace: WorkspaceDto;
}

export interface AuthResponse {
    token: string;
    user: AuthUserDto;
    permissions: string[];
}
