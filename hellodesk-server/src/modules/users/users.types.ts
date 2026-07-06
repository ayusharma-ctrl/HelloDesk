export interface UserDto {
    id: string;
    email: string;
    name: string;
    role: { name: string };
    isActive: boolean;
    workspaceId: string;
    createdAt: Date;
}
