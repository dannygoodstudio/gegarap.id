import MidtransClient from 'midtrans-client';

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
const serverKey = process.env.MIDTRANS_SERVER_KEY;
const clientKey =
  process.env.MIDTRANS_CLIENT_KEY ?? process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';

/** Whether real Midtrans credentials are present. */
export const isMidtransConfigured = Boolean(serverKey);

function snapClient() {
  return new MidtransClient.Snap({ isProduction, serverKey: serverKey!, clientKey });
}

function coreClient() {
  return new MidtransClient.CoreApi({ isProduction, serverKey: serverKey!, clientKey });
}

export interface SnapResult {
  token: string;
  redirectUrl: string;
  /** True when this is a local dev stand-in, not a real Midtrans transaction. */
  mock: boolean;
}

/** Create a Snap token for a DP payment. */
export async function createSnapToken(params: {
  orderId: string;
  amount: number;
  customerName: string;
  customerPhone: string;
  description: string;
}): Promise<SnapResult> {
  // Dev fallback: without server keys we return a mock token so the booking
  // flow is fully testable locally. The UI treats `mock-` tokens as instant
  // success (no Snap popup). In production, missing keys is a hard error.
  if (!isMidtransConfigured) {
    if (!isProduction) {
      return { token: `mock-${params.orderId}`, redirectUrl: '#', mock: true };
    }
    throw new Error('Midtrans belum dikonfigurasi (MIDTRANS_SERVER_KEY kosong).');
  }

  const transaction = await snapClient().createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.customerName,
      phone: params.customerPhone,
    },
    item_details: [
      {
        id: 'DP_BOOKING',
        price: params.amount,
        quantity: 1,
        name: params.description.slice(0, 50),
      },
    ],
    callbacks: {
      finish: `${process.env.NEXTAUTH_URL ?? ''}/dashboard`,
    },
  });

  return { token: transaction.token, redirectUrl: transaction.redirect_url, mock: false };
}

/** Fetch a transaction's status from Midtrans (used to reconcile webhooks). */
export async function getTransactionStatus(orderId: string) {
  return coreClient().transaction.status(orderId);
}
