// Global typing for the Midtrans Snap script injected in the root layout.
interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

interface SnapInstance {
  pay: (token: string, callbacks?: SnapCallbacks) => void;
}

interface Window {
  snap?: SnapInstance;
}
