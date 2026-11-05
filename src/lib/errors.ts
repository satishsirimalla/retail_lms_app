export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
    requestResourceData?: any;
};

function formatSecurityRuleContext(context: SecurityRuleContext): string {
    const { path, operation, requestResourceData } = context;
    const details = {
        operation,
        path,
        requestData: requestResourceData,
    };
    return JSON.stringify(details, null, 2);
}

export class FirestorePermissionError extends Error {
    constructor(context: SecurityRuleContext) {
        const message = `
Firestore Security Rules Denied Request:
${formatSecurityRuleContext(context)}
`;
        super(message);
        this.name = 'FirestorePermissionError';
    }
}
