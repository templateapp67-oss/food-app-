export type RegistrationWorkspace='customer'|'restaurant'|'rider'|'admin';
export type WorkspaceContext={workspace:RegistrationWorkspace;ready:boolean;application_submitted:boolean;path:string};
export const workspaceOptions=[['customer','Customer'],['restaurant','Restaurant Partner'],['rider','Delivery Rider'],['admin','Super Admin']]as const;
export function workspacePath(context:WorkspaceContext){return {customer:'/',restaurant:'/restaurant',rider:'/rider',admin:'/admin'}[context.workspace]||'/'}
