/**
 * Minimal ambient types for `midtrans-client` (the package ships no types).
 * Only the surface we actually use is declared.
 */
declare module 'midtrans-client' {
  interface ClientOptions {
    isProduction: boolean;
    serverKey: string;
    clientKey?: string;
  }

  interface TransactionResult {
    token: string;
    redirect_url: string;
  }

  class Snap {
    constructor(options: ClientOptions);
    createTransaction(payload: Record<string, unknown>): Promise<TransactionResult>;
  }

  class CoreApi {
    constructor(options: ClientOptions);
    transaction: {
      status(orderId: string): Promise<Record<string, unknown>>;
    };
  }

  const MidtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export { Snap, CoreApi };
  export default MidtransClient;
}
